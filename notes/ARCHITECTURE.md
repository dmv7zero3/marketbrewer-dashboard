# MarketBrewer SEO Platform — System Architecture Plan

**Version:** 1.1  
**Created:** December 2025  
**Author:** Jorge Giraldez, MarketBrewer LLC  
**Status:** Redesign Planning (V1 Local-First)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [V1 Redesign Summary (Local-First)](#v1-redesign-summary-local-first)
3. [Business Context](#business-context)
4. [System Overview](#system-overview)
5. [Architecture Diagrams](#architecture-diagrams)
6. [Component Details](#component-details)
7. [Data Models](#data-models)
8. [API Specification](#api-specification)
9. [Content Generation Pipeline](#content-generation-pipeline)
10. [Two-Laptop Workflow](#two-laptop-workflow)
11. [Questionnaire System](#questionnaire-system)
12. [Security & Authentication](#security--authentication)
13. [Cost Analysis](#cost-analysis)
14. [Implementation Phases](#implementation-phases)
15. [Risk Mitigation](#risk-mitigation)

---

## Executive Summary

MarketBrewer SEO Platform is a local SEO content generation system designed to produce thousands of location-targeted landing pages for local businesses.

This document originally described an AWS serverless architecture. The **V1 redesign** is intentionally **local-first** (to move faster during the dashboard rebuild), while preserving a clear path to AWS in a later phase.

### Key Design Principles

| Principle          | V1 Implementation                                           |
| ------------------ | ----------------------------------------------------------- |
| **Accuracy-First** | Questionnaire-driven generation + strict variable injection |
| **Local-First**    | Local API + SQLite queue + local filesystem outputs         |
| **Multi-Tenant**   | Strict `business_id` isolation on every entity              |
| **Scalable (V1)**  | Two-laptop workers over LAN/VPN pulling from the same queue |
| **Cost-Conscious** | Ollama-only (no cloud LLM costs in V1)                      |

### Target Metrics

- **Page Generation:** 3,000 - 10,000 pages per client
- **Generation Speed:** 30-50 pages/hour (local), 300+ pages/hour (cloud)
- **Content Accuracy:** 95%+ factual accuracy via questionnaire system
- **Monthly Cost:** < $50 AWS costs for typical usage

Note: V1 local-first operation targets **$0** cloud dependency during development.

---

## V1 Redesign Summary (Local-First)

### V1 Scope (Explicit)

- **Page Types (only):** `service-location`, `keyword-location`
- **LLM:** Ollama only
- **Workers:** at least two laptops
- **Queue/State:** SQLite (single DB owned by a “primary” laptop)
- **Build:** Webpack 5 (dashboard + client site ingestion)

### V1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD                                       │
│  React 18 + TypeScript + Tailwind + Webpack                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL API (PRIMARY LAPTOP)                           │
│  TypeScript (Node.js 20) + REST + SQLite                                     │
│  - Business/Profile/Keywords/Areas/Prompts                                   │
│  - Job queue + atomic claim                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                ▼                                       ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ WORKER #1 (Laptop A)            │       │ WORKER #2 (Laptop B)            │
│ - Poll/claim job via API        │       │ - Poll/claim job via API        │
│ - Call local Ollama             │       │ - Call local Ollama             │
│ - Write JSON output             │       │ - Write JSON output             │
└─────────────────────────────────┘       └─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OUTPUT STORAGE                                    │
│  JSON files + manifest for Webpack ingestion                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Two-Laptop Connectivity (Security)

Recommended options, from simplest to most secure:

- **Tailscale (recommended):** encrypted transport, stable addressing.
- **LAN + firewall allowlist:** API listens on LAN, macOS firewall restricts to known IPs.
- **LAN + HTTPS:** terminate TLS locally (more setup).

---

---

## Business Context

### Launch Clients

#### 1. Nash & Smashed

```yaml
Industry: Fast Food Restaurant
Business Type: Nashville Hot Chicken & Smash Burgers
Unique Attributes:
  - Halal-certified
  - Multi-location franchise model
Locations: 25 (8 operational + 17 planned)
Service Areas: VA, MD, DC, SC, NY
Keywords: 21-25 food-related terms
Languages: English only
Target Pages: ~625
Website: https://nashandsmashed.com
```

#### 2. Street Lawyer Magic

```yaml
Industry: Legal Services
Business Type: Criminal Defense Law Firm
Attorney: Lonny Bramzon, Esq.
Unique Attributes:
  - 4,000+ cases since 2005
  - Stanford/Columbia Law education
  - Cannabis defense specialty
Locations: 45 cities across DC/MD
Service Areas: Washington DC, Montgomery County, Prince George's County
Keywords: 45 English + 20 Spanish terms
Languages: English (Spanish via Phase 2 translation)
Target Pages: ~2,925
Website: https://streetlawyermagic.com
Phone: 240-478-2189
```

#### 3. MarketBrewer LLC

```yaml
Industry: Digital Marketing Agency
Business Type: Web Development & SEO Services
Owner: Jorge Giraldez
Unique Attributes:
  - AWS/React/TypeScript expertise
  - Provider AND client
Service Areas: DMV Metro Area
Keywords: TBD
Languages: English
Target Pages: ~200
Website: https://marketbrewer.com
Phone: 703-463-6323
Email: j@marketbrewer.com
```

### Page Type Taxonomy

| Page Type              | URL Pattern                    | Example                                | Use Case              |
| ---------------------- | ------------------------------ | -------------------------------------- | --------------------- |
| **Service + Location** | `/{service-slug}/{city-state}` | `/criminal-defense/washington-dc`      | Core service pages    |
| **Keyword + Location** | `/{keyword-slug}/{city-state}` | `/best-halal-burgers/silver-spring-md` | SEO keyword targeting |

Deferred until later:

- **Near Me** (`/{service}-near-me/{city-state}`)
- **Blog + Location** (`/blog/{topic-slug}/{city-state}`)

**URL Rules:**

- Keyword/service always first (better SEO)
- City-state format: `{city}-{state}` lowercase, hyphenated
- One canonical URL per page (no duplicates)

---

## System Overview

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  React 18 + TypeScript + TailwindCSS + Tremor                               │
│  (Dashboard for business management, content generation, job monitoring)     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  AWS API Gateway (REST) + TypeScript Lambda Functions (Node.js 20)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│     DynamoDB        │ │     AWS SQS     │ │  Parameter Store    │
│  (Business Data,    │ │  (Job Queue)    │ │  (API Keys)         │
│   Prompts, Jobs)    │ │                 │ │                     │
└─────────────────────┘ └─────────────────┘ └─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL PROCESSORS                                     │
│  MacBook Pro #1 (Ollama)  ←─── SQS ───→  Laptop #2 (Ollama)                │
│  - Job Consumer                          - Job Consumer                      │
│  - Content Generator                     - Content Generator                 │
│  - Local JSON Output                     - Local JSON Output                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTPUT STORAGE                                       │
│  Local Filesystem (JSON files per business/page)                            │
│  → Export to client websites (nash-and-smashed, street-lawyer-magic, etc.)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component         | Technology                | Purpose                          |
| ----------------- | ------------------------- | -------------------------------- |
| Dashboard         | React 18 + Tremor         | Business management, job control |
| API               | API Gateway + Lambda (TS) | REST endpoints                   |
| Database          | DynamoDB (single-table)   | Business profiles, prompts, jobs |
| Queue             | SQS                       | Job distribution to workers      |
| Secrets           | Parameter Store           | API keys storage                 |
| LLM (Primary)     | Ollama (local)            | Content generation               |
| LLM (Alternative) | Claude/OpenAI             | Optional cloud generation        |
| Output            | Local JSON files          | Generated content storage        |

---

## Architecture Diagrams

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                USER (Jorge)                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            DASHBOARD (React)                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │ Businesses │ │  Keywords  │ │   Areas    │ │  Prompts   │ │ Generation │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTPS
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AWS API GATEWAY                                       │
│                    api.marketbrewer.com/seo-platform/v1                      │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│    Lambda     │           │    Lambda     │           │    Lambda     │
│  businesses   │           │   generate    │           │     jobs      │
│   handler     │           │   handler     │           │   handler     │
└───────────────┘           └───────────────┘           └───────────────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              AWS SERVICES                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │    DynamoDB     │    │      SQS        │    │ Parameter Store │          │
│  │ (Single Table)  │    │ (Job Queue)     │    │  (API Keys)     │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ SQS Polling
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL PROCESSING NODES                                │
│                                                                               │
│  ┌────────────────────────────┐      ┌────────────────────────────┐         │
│  │     MacBook Pro #1         │      │       Laptop #2            │         │
│  │  ┌──────────────────────┐  │      │  ┌──────────────────────┐  │         │
│  │  │   Ollama Server      │  │      │  │   Ollama Server      │  │         │
│  │  │   llama3.2:latest    │  │      │  │   llama3.2:latest    │  │         │
│  │  └──────────────────────┘  │      │  └──────────────────────┘  │         │
│  │  ┌──────────────────────┐  │      │  ┌──────────────────────┐  │         │
│  │  │   Job Processor      │  │      │  │   Job Processor      │  │         │
│  │  │   (TypeScript)       │  │      │  │   (TypeScript)       │  │         │
│  │  └──────────────────────┘  │      │  └──────────────────────┘  │         │
│  │  ┌──────────────────────┐  │      │  ┌──────────────────────┐  │         │
│  │  │   Local Output       │  │      │  │   Local Output       │  │         │
│  │  │   /output/{business} │  │      │  │   /output/{business} │  │         │
│  │  └──────────────────────┘  │      │  └──────────────────────┘  │         │
│  └────────────────────────────┘      └────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            MERGE & EXPORT                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │  Merge Tool     │───▶│  Combined JSON  │───▶│  Client Repos   │          │
│  │                 │    │                 │    │ (N&S, SLM, MB)  │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Content Generation Flow

```
┌─────────────────┐
│  User triggers  │
│  generation     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dashboard      │
│  POST /generate │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Lambda checks  │────▶│  Questionnaire  │
│  completeness   │     │  Score < 40%?   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ Score ≥ 40%           │ Reject
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Generate URL   │     │  Return error:  │
│  combinations   │     │  "Complete the  │
│  (KW × Areas)   │     │  questionnaire" │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Create job     │
│  records in     │
│  DynamoDB       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Queue messages │
│  to SQS         │
│  (1 per page)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           SQS QUEUE                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Job 1│ │Job 2│ │Job 3│ │...  │       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
└────────────────────┬────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Worker #1      │     │  Worker #2      │
│  (MacBook)      │     │  (Laptop 2)     │
│                 │     │                 │
│  1. Poll SQS    │     │  1. Poll SQS    │
│  2. Fetch biz   │     │  2. Fetch biz   │
│     context     │     │     context     │
│  3. Build prompt│     │  3. Build prompt│
│  4. Call Ollama │     │  4. Call Ollama │
│  5. Save JSON   │     │  5. Save JSON   │
│  6. Update job  │     │  6. Update job  │
│  7. Delete msg  │     │  7. Delete msg  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  /output/       │     │  /output/       │
│  nash-smashed/  │     │  nash-smashed/  │
│  page-001.json  │     │  page-002.json  │
└─────────────────┘     └─────────────────┘
```

### DynamoDB Access Patterns

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SINGLE TABLE DESIGN                                   │
│                     Table: marketbrewer-seo-platform                          │
└──────────────────────────────────────────────────────────────────────────────┘

Access Pattern                    │ PK                    │ SK
─────────────────────────────────┼───────────────────────┼──────────────────────
Get business profile              │ BUS#{business_id}     │ PROFILE
List business locations           │ BUS#{business_id}     │ LOC#*
Get specific location             │ BUS#{business_id}     │ LOC#{location_id}
List service areas                │ BUS#{business_id}     │ AREA#*
Get area by city/state            │ BUS#{business_id}     │ AREA#{city}#{state}
List keywords                     │ BUS#{business_id}     │ KW#*
Get keyword by slug               │ BUS#{business_id}     │ KW#{keyword_slug}
List SEO websites                 │ BUS#{business_id}     │ SITE#*
List prompt templates             │ BUS#{business_id}     │ PROMPT#*
Get prompt by type/version        │ BUS#{business_id}     │ PROMPT#{type}#V{ver}
Get questionnaire                 │ BUS#{business_id}     │ QUESTIONNAIRE
Get usage by month                │ BUS#{business_id}     │ USAGE#{year}#{month}
─────────────────────────────────┼───────────────────────┼──────────────────────
Get job by ID                     │ JOB#{job_id}          │ META
List job pages                    │ JOB#{job_id}          │ PAGE#*
Get specific page status          │ JOB#{job_id}          │ PAGE#{page_id}
─────────────────────────────────┼───────────────────────┼──────────────────────
List all businesses               │ INDEX#BUSINESS        │ BUS#{business_id}
List jobs by business             │ INDEX#BUS#{biz_id}    │ JOB#{job_id}

Note: INDEX# patterns are for listing. Each business/job also writes a record
with this pattern to enable listing without GSIs.
```

---

## Component Details

### Frontend (Dashboard)

**Framework:** React 18 + TypeScript  
**UI Library:** Tremor (dashboard-focused, built on Radix + Recharts + Tailwind)  
**Build Tool:** Webpack 5  
**State:** React Context API + Custom Hooks

#### Dashboard Pages

| Page            | Route                           | Purpose                            |
| --------------- | ------------------------------- | ---------------------------------- |
| Dashboard Home  | `/`                             | Overview, recent jobs, quick stats |
| Businesses      | `/businesses`                   | List all businesses                |
| Business Detail | `/businesses/:id`               | Single business management         |
| Questionnaire   | `/businesses/:id/questionnaire` | Business questionnaire wizard      |
| Keywords        | `/businesses/:id/keywords`      | Keyword management                 |
| Service Areas   | `/businesses/:id/areas`         | Service area management            |
| Prompts         | `/businesses/:id/prompts`       | Prompt template editor             |
| Generate        | `/businesses/:id/generate`      | Content generation control         |
| Jobs            | `/businesses/:id/jobs`          | Job history and status             |
| Job Detail      | `/businesses/:id/jobs/:jobId`   | Single job progress                |
| Usage           | `/businesses/:id/usage`         | Billing and usage stats            |

#### Key Tremor Components

```typescript
// Dashboard cards and metrics
import { Card, Metric, Text, ProgressBar } from "@tremor/react";

// Data tables
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";

// Charts
import { AreaChart, BarChart, DonutChart } from "@tremor/react";

// Forms and inputs
import { TextInput, Select, SelectItem, Button } from "@tremor/react";

// Status indicators
import { Badge, Callout } from "@tremor/react";
```

### Backend (Lambda Functions)

**Runtime:** Node.js 20 with TypeScript  
**Deployment:** AWS SAM or Serverless Framework

#### Lambda Functions

| Function                | Trigger     | Purpose                    |
| ----------------------- | ----------- | -------------------------- |
| `businesses-handler`    | API Gateway | Business CRUD operations   |
| `keywords-handler`      | API Gateway | Keywords management        |
| `areas-handler`         | API Gateway | Service areas management   |
| `prompts-handler`       | API Gateway | Prompt template management |
| `websites-handler`      | API Gateway | SEO websites management    |
| `questionnaire-handler` | API Gateway | Questionnaire CRUD         |
| `generate-handler`      | API Gateway | Queue generation jobs      |
| `jobs-handler`          | API Gateway | Job status and history     |
| `usage-handler`         | API Gateway | Usage and billing data     |

#### Lambda Configuration

```yaml
# Example SAM template snippet
BusinessesFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: dist/handlers/businesses.handler
    Runtime: nodejs20.x
    MemorySize: 256
    Timeout: 30
    Environment:
      Variables:
        TABLE_NAME: !Ref DynamoDBTable
        PARAMETER_PREFIX: /marketbrewer-seo
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref DynamoDBTable
      - SSMParameterReadPolicy:
          ParameterName: /marketbrewer-seo/*
```

### Local Processor

**Language:** TypeScript (Node.js 20)  
**LLM:** Ollama (`llama3.2:latest`)  
**Queue Consumer:** AWS SDK v3 for SQS

#### Worker Architecture

```typescript
// local-processor/src/worker.ts

interface WorkerConfig {
  sqsQueueUrl: string;
  ollamaUrl: string; // default: http://localhost:11434
  outputDir: string; // default: ./output
  workerId: string; // e.g., 'macbook-pro-1'
  concurrency: number; // default: 1 (sequential)
  pollInterval: number; // default: 5000ms
}

class ContentGenerationWorker {
  // Poll SQS for messages
  async pollQueue(): Promise<void>;

  // Process a single generation job
  async processJob(job: GenerationJob): Promise<void>;

  // Fetch business context from DynamoDB
  async fetchBusinessContext(businessId: string): Promise<BusinessContext>;

  // Build prompt from template + context
  buildPrompt(
    template: PromptTemplate,
    context: BusinessContext,
    variables: PageVariables
  ): string;

  // Call Ollama for generation
  async generateContent(prompt: string): Promise<string>;

  // Save output to local filesystem
  async saveOutput(
    businessId: string,
    pageId: string,
    content: GeneratedContent
  ): Promise<void>;

  // Update job status in DynamoDB
  async updateJobStatus(
    jobId: string,
    pageId: string,
    status: PageStatus
  ): Promise<void>;
}
```

---

## Data Models

### Business Profile

```typescript
interface BusinessProfile {
  // Keys
  PK: `BUS#${string}`; // e.g., "BUS#nash-and-smashed"
  SK: "PROFILE";

  // Identity
  businessId: string; // URL-safe slug
  name: string; // "Nash & Smashed"
  legalName?: string; // "Nash & Smashed LLC"
  industry: string; // "restaurant" | "legal" | "marketing"
  website: string; // "https://nashandsmashed.com"

  // Contact
  phone: string; // Primary phone
  email: string; // Primary email

  // Metadata
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  createdBy: string; // "jorge"
  isActive: boolean;

  // Quick stats (denormalized)
  keywordCount: number;
  areaCount: number;
  promptCount: number;
  totalPagesGenerated: number;
}
```

### Questionnaire

```typescript
interface Questionnaire {
  // Keys
  PK: `BUS#${string}`;
  SK: "QUESTIONNAIRE";

  // Section 1: Business Identity
  identity: {
    legalName: string;
    dbaName?: string;
    industry: string;
    subIndustry?: string;
    tagline?: string;
    yearEstablished?: number;
    ownerName?: string;
    keyPersonnel?: Array<{ name: string; title: string }>;
    brandVoice:
      | "professional"
      | "casual"
      | "authoritative"
      | "friendly"
      | "luxury";
  };

  // Section 2: Location & Service Areas
  location: {
    primaryAddress: Address;
    additionalLocations?: Address[];
    serviceAreaType: "radius" | "cities" | "counties" | "states";
    serviceAreaRadius?: number; // miles
    serviceAreaCities?: string[];
    servesOnSite: boolean; // Customers come to business
    servesAtCustomerLocation: boolean; // Business goes to customer
    locationSpecificDetails?: Record<string, LocationDetail>;
  };

  // Section 3: Products & Services
  offerings: {
    services: Array<{
      name: string;
      description: string;
      isPrimary: boolean;
    }>;
    products?: Array<{
      name: string;
      description: string;
      category?: string;
    }>;
    pricingModel: "fixed" | "hourly" | "project" | "subscription" | "varies";
    priceRange?: { min: number; max: number; unit: string };
    uniqueDifferentiators: string[];
    certifications?: string[];
    credentials?: string[];
  };

  // Section 4: Target Audience
  audience: {
    description: string; // Free-form description
    demographics?: {
      ageRange?: { min: number; max: number };
      income?: string;
      familyStatus?: string[];
      occupation?: string[];
    };
    painPoints: string[]; // Problems they solve
    commonObjections?: string[]; // Why people hesitate
    languagesServed: string[]; // e.g., ['English', 'Spanish']
  };

  // Section 5: Competitive Positioning
  positioning: {
    competitors?: string[]; // Main competitor names
    competitiveAdvantages: string[]; // Why choose us
    awards?: string[];
    pressFeatures?: string[];
    yearsExperience?: number;
    experienceMetrics?: {
      // e.g., "4,000+ cases"
      count: number;
      unit: string; // "cases", "projects", "customers"
      qualifier?: string; // "since 2005"
    };
    professionalMemberships?: string[];
  };

  // Section 6: Trust Signals
  trust: {
    testimonials?: Array<{
      quote: string;
      author: string;
      title?: string;
      rating?: number;
    }>;
    reviewPlatforms?: Array<{
      platform: string; // "Google", "Yelp", "Avvo"
      rating: number;
      reviewCount: number;
      url?: string;
    }>;
    notableClients?: string[];
    guarantees?: string[];
    insuranceLicenses?: string[];
  };

  // Section 7: Content Preferences
  content: {
    alwaysUse: string[]; // Required phrases/words
    neverUse: string[]; // Forbidden phrases/words
    toneNotes?: string; // Additional tone guidance
    preferredCTAs: string[]; // e.g., "Call Now", "Schedule Consultation"
    legalDisclaimers?: string[]; // Required disclaimers
  };

  // Section 8: SEO Goals
  seoGoals: {
    primaryKeywords: string[];
    secondaryKeywords?: string[];
    competitorKeywords?: string[];
    geographicPriorities: string[]; // Most important cities/areas
    contentGoals: Array<
      "leads" | "calls" | "traffic" | "awareness" | "appointments"
    >;
  };

  // Industry-Specific Modules
  restaurantModule?: RestaurantModule;
  legalModule?: LegalModule;
  marketingAgencyModule?: MarketingAgencyModule;

  // Scoring
  completenessScore: number; // 0-100
  lastUpdated: string;
  updatedBy: string;
}

interface RestaurantModule {
  cuisineType: string[];
  dietaryOptions: string[]; // "Halal", "Vegan", "Gluten-Free"
  diningOptions: string[]; // "Dine-in", "Takeout", "Delivery"
  deliveryPartners?: string[]; // "DoorDash", "UberEats"
  menuHighlights: string[];
  chefBackground?: string;
  operatingHours: Record<string, string>;
  reservationRequired: boolean;
}

interface LegalModule {
  practiceAreas: string[];
  barAdmissions: string[]; // "DC Bar", "Maryland Bar"
  jurisdictions: string[];
  caseTypes: string[];
  consultationType: "free" | "paid";
  consultationDuration?: number; // minutes
  caseResults?: Array<{
    type: string;
    outcome: string;
    anonymous: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year?: number;
  }>;
}

interface MarketingAgencyModule {
  specializations: string[]; // "SEO", "PPC", "Web Dev"
  industriesServed: string[];
  techStack: string[]; // "React", "AWS", "WordPress"
  teamSize?: number;
  certifications: string[]; // "Google Partner", "HubSpot"
  portfolioUrl?: string;
}
```

### Keyword

```typescript
interface Keyword {
  // Keys
  PK: `BUS#${string}`;
  SK: `KW#${string}`; // e.g., "KW#best-halal-burgers"

  // Data
  keyword: string; // "best halal burgers"
  slug: string; // "best-halal-burgers"
  category: "primary" | "secondary" | "long-tail";
  searchVolume?: number;
  difficulty?: number;
  intent: "informational" | "transactional" | "navigational" | "local";

  // Generation settings
  wordCountTarget: number; // 500, 750, 1000
  pageType: PageType;
  isActive: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

type PageType =
  | "service-location"
  | "keyword-location"
  | "near-me"
  | "blog-location";
```

### Service Area

```typescript
interface ServiceArea {
  // Keys
  PK: `BUS#${string}`;
  SK: `AREA#${string}#${string}`; // e.g., "AREA#washington#dc"

  // Data
  city: string; // "Washington"
  state: string; // "DC"
  stateFullName: string; // "District of Columbia"
  slug: string; // "washington-dc"

  // Geographic data
  county?: string;
  zipCodes?: string[];
  population?: number;

  // Business-specific
  isPrimary: boolean; // Primary service area
  hasPhysicalLocation: boolean; // Business has office here
  localPhone?: string; // Local phone if different
  localAddress?: string;

  // SEO
  localLandmarks?: string[]; // For content
  neighborhoodNames?: string[];

  // Status
  isActive: boolean;
  createdAt: string;
}
```

### Prompt Template

```typescript
interface PromptTemplate {
  // Keys
  PK: `BUS#${string}`;
  SK: `PROMPT#${PageType}#V${number}`; // e.g., "PROMPT#service-location#V3"

  // Identity
  templateId: string;
  pageType: PageType;
  version: number;
  title: string; // "Service Page Template v3"

  // Template
  promptTemplate: string; // The actual prompt with {{variables}}
  systemPrompt?: string; // Optional system prompt

  // Variables
  requiredVariables: string[]; // Must be present
  optionalVariables: string[]; // Enhance if available

  // Output settings
  wordCountTarget: number;
  outputFormat: "markdown" | "html" | "json";
  sections?: string[]; // Expected sections in output

  // Tone and style
  toneOverride?: string; // Override business default

  // Status
  isActive: boolean;
  isDefault: boolean; // Default for this page type

  // Metrics
  usageCount: number;
  avgQualityScore?: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
}
```

### Generation Job

```typescript
interface GenerationJob {
  // Keys
  PK: `JOB#${string}`;
  SK: "META";

  // Identity
  jobId: string; // UUID
  businessId: string;

  // Configuration
  pageType: PageType;
  keywords: string[]; // Keywords to generate
  areas: string[]; // Areas to generate
  promptTemplateVersion: number;

  // Progress
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  totalPages: number;
  completedPages: number;
  failedPages: number;

  // Timing
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;

  // Processing
  processingNodes: string[]; // Worker IDs that processed
  llmProvider: "ollama" | "claude" | "openai";

  // Output
  outputDirectory: string; // Local path to outputs

  // Error tracking
  errors?: Array<{
    pageId: string;
    error: string;
    timestamp: string;
  }>;

  // Usage
  totalTokensUsed?: number;
  estimatedCost?: number;
}

interface JobPage {
  // Keys
  PK: `JOB#${string}`;
  SK: `PAGE#${string}`; // e.g., "PAGE#criminal-defense-washington-dc"

  // Identity
  pageId: string;
  keyword: string;
  area: string;
  urlSlug: string; // "criminal-defense/washington-dc"

  // Status
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;

  // Processing
  workerId?: string;
  startedAt?: string;
  completedAt?: string;

  // Output
  outputFile?: string; // Relative path to JSON file
  wordCount?: number;
  tokensUsed?: number;

  // Error
  lastError?: string;
}
```

---

## API Specification

### Base URL

```
Production: https://api.marketbrewer.com/seo-platform/v1
Development: https://api-dev.marketbrewer.com/seo-platform/v1
```

### Authentication

API Key authentication via `x-api-key` header (V1).

```typescript
// All requests require:
headers: {
  'x-api-key': 'your-api-key',
  'Content-Type': 'application/json'
}
```

### Endpoints

#### Businesses

```yaml
# List all businesses
GET /businesses
Response: { businesses: Business[], count: number }

# Create business
POST /businesses
Body: { name, industry, website, phone, email }
Response: { business: Business }

# Get business
GET /businesses/{businessId}
Response: { business: Business }

# Update business
PUT /businesses/{businessId}
Body: { name?, industry?, website?, phone?, email?, isActive? }
Response: { business: Business }

# Delete business
DELETE /businesses/{businessId}
Response: { success: true }
```

#### Questionnaire

```yaml
# Get questionnaire
GET /businesses/{businessId}/questionnaire
Response: { questionnaire: Questionnaire, completenessScore: number }

# Update questionnaire (partial update)
PUT /businesses/{businessId}/questionnaire
Body: { identity?, location?, offerings?, audience?, ... }
Response: { questionnaire: Questionnaire, completenessScore: number }

# Get completeness score only
GET /businesses/{businessId}/questionnaire/score
Response: { score: number, missingRequired: string[], suggestions: string[] }
```

#### Keywords

```yaml
# List keywords
GET /businesses/{businessId}/keywords
Query: ?category=primary&isActive=true
Response: { keywords: Keyword[], count: number }

# Add keywords (bulk)
POST /businesses/{businessId}/keywords
Body: { keywords: [{ keyword, category, searchVolume?, wordCountTarget?, pageType }] }
Response: { keywords: Keyword[], added: number }

# Update keyword
PUT /businesses/{businessId}/keywords/{slug}
Body: { category?, searchVolume?, wordCountTarget?, pageType?, isActive? }
Response: { keyword: Keyword }

# Delete keyword
DELETE /businesses/{businessId}/keywords/{slug}
Response: { success: true }
```

#### Service Areas

```yaml
# List service areas
GET /businesses/{businessId}/service-areas
Query: ?isPrimary=true&isActive=true
Response: { areas: ServiceArea[], count: number }

# Add service areas (bulk)
POST /businesses/{businessId}/service-areas
Body: { areas: [{ city, state, isPrimary?, hasPhysicalLocation? }] }
Response: { areas: ServiceArea[], added: number }

# Update service area
PUT /businesses/{businessId}/service-areas/{slug}
Body: { isPrimary?, hasPhysicalLocation?, localPhone?, isActive? }
Response: { area: ServiceArea }

# Delete service area
DELETE /businesses/{businessId}/service-areas/{slug}
Response: { success: true }

# Bulk update (replace all)
PUT /businesses/{businessId}/service-areas/bulk
Body: { areas: [{ city, state, ... }], replaceAll: true }
Response: { areas: ServiceArea[], count: number }
```

#### Prompt Templates

```yaml
# List prompts
GET /businesses/{businessId}/prompts
Query: ?pageType=service-location&isActive=true
Response: { prompts: PromptTemplate[], count: number }

# Create prompt
POST /businesses/{businessId}/prompts
Body: { pageType, title, promptTemplate, requiredVariables, ... }
Response: { prompt: PromptTemplate }

# Get prompt (latest active version)
GET /businesses/{businessId}/prompts/{pageType}
Response: { prompt: PromptTemplate }

# Get specific version
GET /businesses/{businessId}/prompts/{pageType}/versions/{version}
Response: { prompt: PromptTemplate }

# Update prompt (creates new version)
PUT /businesses/{businessId}/prompts/{pageType}
Body: { promptTemplate?, wordCountTarget?, ... }
Response: { prompt: PromptTemplate, previousVersion: number }

# Delete prompt version
DELETE /businesses/{businessId}/prompts/{pageType}/versions/{version}
Response: { success: true }
```

#### Content Generation

```yaml
# Preview URLs to generate
GET /businesses/{businessId}/preview-urls
Query: ?pageType=service-location&keywords=kw1,kw2&areas=area1,area2
Response: {
  urls: [{ slug, keyword, area, pageType }],
  count: number,
  estimatedTime: string
}

# Start generation job
POST /businesses/{businessId}/generate
Body: {
  pageType: 'service-location' | 'keyword-location' | 'near-me' | 'blog-location',
  keywords?: string[],           // If empty, use all active keywords
  areas?: string[],              // If empty, use all active areas
  promptVersion?: number,        // If empty, use latest active
  llmProvider?: 'ollama' | 'claude' | 'openai'   // Default: 'ollama'
}
Response: {
  job: GenerationJob,
  pagesQueued: number,
  estimatedCompletion: string
}

# Cancel generation job
POST /businesses/{businessId}/jobs/{jobId}/cancel
Response: { job: GenerationJob }
```

#### Jobs

```yaml
# List jobs
GET /businesses/{businessId}/jobs
Query: ?status=processing&limit=10&offset=0
Response: { jobs: GenerationJob[], count: number, hasMore: boolean }

# Get job details
GET /businesses/{businessId}/jobs/{jobId}
Response: { job: GenerationJob, pages: JobPage[] }

# Get job progress
GET /businesses/{businessId}/jobs/{jobId}/progress
Response: {
  totalPages: number,
  completedPages: number,
  failedPages: number,
  percentComplete: number,
  estimatedRemaining: string
}
```

#### Usage & Billing

```yaml
# Get usage summary
GET /businesses/{businessId}/usage
Query: ?year=2025
Response: {
  totalPagesGenerated: number,
  totalTokensUsed: number,
  estimatedCost: number,
  byMonth: [{ month, pages, tokens, cost }]
}

# Get monthly detail
GET /businesses/{businessId}/usage/{year}/{month}
Response: {
  pagesGenerated: number,
  tokensUsed: number,
  cost: number,
  byProvider: { ollama: number, claude: number, openai: number },
  byPageType: { ... },
  jobs: [{ jobId, pages, tokens, cost }]
}
```

### Error Responses

```typescript
interface ApiError {
  error: string; // Human-readable message
  code: string; // Machine-readable code
  details?: unknown; // Additional context
}

// Error codes
("VALIDATION_ERROR"); // Invalid input
("NOT_FOUND"); // Resource doesn't exist
("UNAUTHORIZED"); // Invalid API key
("INSUFFICIENT_DATA"); // Questionnaire incomplete (score < 40%)
("GENERATION_FAILED"); // LLM error
("RATE_LIMITED"); // Too many requests
("INTERNAL_ERROR"); // Server error
```

---

## Content Generation Pipeline

### Prompt Template Variables

#### Available Variables (From Questionnaire)

```typescript
// Business Identity
{
  {
    business_name;
  }
} // "Nash & Smashed"
{
  {
    legal_name;
  }
} // "Nash & Smashed LLC"
{
  {
    tagline;
  }
} // "Halal Nashville Hot Chicken"
{
  {
    year_established;
  }
} // "2023"
{
  {
    owner_name;
  }
} // "John Smith"
{
  {
    brand_voice;
  }
} // "friendly"

// Location (per-page)
{
  {
    city;
  }
} // "Washington"
{
  {
    state;
  }
} // "DC"
{
  {
    state_full;
  }
} // "District of Columbia"
{
  {
    city_state;
  }
} // "Washington, DC"
{
  {
    city_state_slug;
  }
} // "washington-dc"

// Contact
{
  {
    phone;
  }
} // "240-478-2189"
{
  {
    email;
  }
} // "info@example.com"
{
  {
    website;
  }
} // "https://example.com"
{
  {
    address;
  }
} // "123 Main St, City, ST 12345"

// Services
{
  {
    primary_service;
  }
} // "Criminal Defense"
{
  {
    all_services;
  }
} // "Criminal Defense, DUI Defense, ..."
{
  {
    service_description;
  }
} // Description of primary service

// Differentiators
{
  {
    differentiators;
  }
} // "Halal-certified, Family-owned"
{
  {
    years_experience;
  }
} // "20"
{
  {
    experience_metric;
  }
} // "4,000+ cases handled"
{
  {
    awards;
  }
} // "Best of DC 2024"
{
  {
    certifications;
  }
} // "Board Certified"

// Audience
{
  {
    target_audience;
  }
} // Description
{
  {
    pain_points;
  }
} // "Facing criminal charges, Need fast help"

// Trust
{
  {
    testimonial_quote;
  }
} // "Best lawyer ever!"
{
  {
    testimonial_author;
  }
} // "John D."
{
  {
    google_rating;
  }
} // "4.9"
{
  {
    review_count;
  }
} // "127"

// Content Rules
{
  {
    always_use;
  }
} // Required phrases
{
  {
    never_use;
  }
} // Forbidden phrases
{
  {
    cta_primary;
  }
} // "Call Now for Free Consultation"
{
  {
    legal_disclaimer;
  }
} // Required disclaimer text

// Page-Specific
{
  {
    primary_keyword;
  }
} // "criminal defense attorney"
{
  {
    secondary_keywords;
  }
} // "lawyer, legal help, defense"
{
  {
    page_type;
  }
} // "service-location"
{
  {
    word_count_target;
  }
} // "750"

// Industry-Specific (Restaurant)
{
  {
    cuisine_type;
  }
} // "Nashville Hot Chicken"
{
  {
    dietary_options;
  }
} // "Halal, Gluten-Free options"
{
  {
    menu_highlights;
  }
} // "Signature Hot Chicken Sandwich"
{
  {
    delivery_partners;
  }
} // "DoorDash, UberEats"

// Industry-Specific (Legal)
{
  {
    practice_areas;
  }
} // "Criminal Defense, DUI, Drug Charges"
{
  {
    bar_admissions;
  }
} // "DC Bar, Maryland Bar"
{
  {
    jurisdictions;
  }
} // "Washington DC, Montgomery County MD"
{
  {
    consultation_type;
  }
} // "Free 30-minute consultation"
```

### Example Prompt Template

```markdown
# Service + Location Page Template

## System Prompt

You are an expert local SEO copywriter specializing in {{industry}} businesses.
Write compelling, accurate content that ranks well and converts visitors to customers.

## User Prompt

Write a {{word_count_target}}-word landing page for {{business_name}} targeting
the keyword "{{primary_keyword}}" in {{city}}, {{state_full}}.

### BUSINESS CONTEXT

- **Business:** {{business_name}}
- **Tagline:** {{tagline}}
- **Established:** {{year_established}}
- **Phone:** {{phone}}
- **Address:** {{address}}

### SERVICES

{{primary_service}}

{{service_description}}

### WHY CHOOSE US

{{differentiators}}

{{experience_metric}}

### TRUST SIGNALS

- Google Rating: {{google_rating}} ({{review_count}} reviews)
- {{awards}}
- {{certifications}}

### TESTIMONIAL

"{{testimonial_quote}}" — {{testimonial_author}}

### TARGET AUDIENCE

{{target_audience}}

Their pain points: {{pain_points}}

### CONTENT REQUIREMENTS

1. Write in a {{brand_voice}} tone
2. Include the keyword "{{primary_keyword}}" 3-5 times naturally
3. Mention {{city}} and surrounding areas
4. Include a clear call-to-action: {{cta_primary}}
5. ALWAYS use these phrases: {{always_use}}
6. NEVER use these phrases: {{never_use}}

### OUTPUT FORMAT

Provide the content in Markdown format with:

- H1: Main headline (include keyword and city)
- H2: 3-4 section headings
- Paragraphs: 2-4 sentences each
- Bullet points: Where appropriate
- CTA: At end of page

{{#if legal_disclaimer}}

### REQUIRED DISCLAIMER

Include at the bottom: {{legal_disclaimer}}
{{/if}}
```

### Variable Injection Process

```typescript
// content-generator.ts

interface PageVariables {
  keyword: string;
  area: ServiceArea;
  pageType: PageType;
}

async function generateContent(
  businessId: string,
  template: PromptTemplate,
  pageVars: PageVariables
): Promise<GeneratedContent> {
  // 1. Fetch business questionnaire
  const questionnaire = await fetchQuestionnaire(businessId);

  // 2. Check completeness
  if (questionnaire.completenessScore < 40) {
    throw new Error("INSUFFICIENT_DATA: Complete questionnaire first");
  }

  // 3. Build variable map
  const variables = buildVariableMap(questionnaire, pageVars);

  // 4. Validate required variables
  for (const required of template.requiredVariables) {
    if (!variables[required]) {
      throw new Error(`Missing required variable: ${required}`);
    }
  }

  // 5. Inject variables into template
  const prompt = injectVariables(template.promptTemplate, variables);

  // 6. Call LLM
  const content = await callLLM(prompt, template.systemPrompt);

  // 7. Post-process
  const processed = postProcessContent(content, template.outputFormat);

  return {
    pageId: `${pageVars.keyword.slug}-${pageVars.area.slug}`,
    urlSlug: `${pageVars.keyword.slug}/${pageVars.area.slug}`,
    content: processed,
    wordCount: countWords(processed),
    generatedAt: new Date().toISOString(),
  };
}

function injectVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] || match;
  });
}
```

---

## Two-Laptop Workflow

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS CLOUD                                       │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │    DynamoDB     │    │      SQS        │    │ Parameter Store │         │
│  │                 │    │                 │    │                 │         │
│  │ - Business data │    │ - Job messages  │    │ - API keys      │         │
│  │ - Prompts       │    │ - Visibility    │    │ - Config        │         │
│  │ - Job status    │    │   timeout: 5min │    │                 │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
└───────────┼──────────────────────┼──────────────────────┼───────────────────┘
            │                      │                      │
            │         ┌────────────┴────────────┐        │
            │         │                         │        │
            ▼         ▼                         ▼        ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐
│     MacBook Pro #1          │     │       Laptop #2             │
│     (Primary)               │     │       (Secondary)           │
│                             │     │                             │
│  ┌───────────────────────┐  │     │  ┌───────────────────────┐  │
│  │  Worker Process       │  │     │  │  Worker Process       │  │
│  │  - Poll SQS           │  │     │  │  - Poll SQS           │  │
│  │  - Process jobs       │  │     │  │  - Process jobs       │  │
│  │  - Update DynamoDB    │  │     │  │  - Update DynamoDB    │  │
│  └───────────────────────┘  │     │  └───────────────────────┘  │
│                             │     │                             │
│  ┌───────────────────────┐  │     │  ┌───────────────────────┐  │
│  │  Ollama Server        │  │     │  │  Ollama Server        │  │
│  │  localhost:11434      │  │     │  │  localhost:11434      │  │
│  │  llama3.2:latest      │  │     │  │  llama3.2:latest      │  │
│  └───────────────────────┘  │     │  └───────────────────────┘  │
│                             │     │                             │
│  ┌───────────────────────┐  │     │  ┌───────────────────────┐  │
│  │  Local Output         │  │     │  │  Local Output         │  │
│  │  ./output/            │  │     │  │  ./output/            │  │
│  │  ├── nash-smashed/    │  │     │  │  ├── nash-smashed/    │  │
│  │  │   ├── page-001.json│  │     │  │  │   ├── page-002.json│  │
│  │  │   └── page-003.json│  │     │  │  │   └── page-004.json│  │
│  │  └── ...              │  │     │  │  └── ...              │  │
│  └───────────────────────┘  │     │  └───────────────────────┘  │
│                             │     │                             │
└─────────────────────────────┘     └─────────────────────────────┘
            │                                   │
            │                                   │
            └─────────────┬─────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │       Merge Process         │
            │                             │
            │  1. Collect from both       │
            │  2. Deduplicate             │
            │  3. Validate completeness   │
            │  4. Export to client repos  │
            └─────────────────────────────┘
```

### SQS Message Format

```typescript
interface GenerationMessage {
  jobId: string;
  businessId: string;
  pageId: string;

  // Page details
  keyword: string;
  keywordSlug: string;
  area: {
    city: string;
    state: string;
    slug: string;
  };
  pageType: PageType;
  urlSlug: string;

  // Template
  promptTemplateVersion: number;

  // Metadata
  queuedAt: string;
  attempt: number;
}
```

### Worker Process

```typescript
// local-processor/src/worker.ts

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

class ContentGenerationWorker {
  private sqsClient: SQSClient;
  private dynamoClient: DynamoDBClient;
  private ollamaUrl: string;
  private workerId: string;
  private isRunning: boolean = false;

  constructor(config: WorkerConfig) {
    this.sqsClient = new SQSClient({ region: "us-east-1" });
    this.dynamoClient = new DynamoDBClient({ region: "us-east-1" });
    this.ollamaUrl = config.ollamaUrl || "http://localhost:11434";
    this.workerId = config.workerId;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log(`[${this.workerId}] Worker started`);

    while (this.isRunning) {
      try {
        await this.pollAndProcess();
      } catch (error) {
        console.error(`[${this.workerId}] Error:`, error);
        await this.sleep(5000); // Wait before retry
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`[${this.workerId}] Worker stopping...`);
  }

  private async pollAndProcess(): Promise<void> {
    // 1. Poll SQS
    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: 300, // 5 minutes to process
      })
    );

    if (!response.Messages || response.Messages.length === 0) {
      return; // No messages, poll again
    }

    const message = response.Messages[0];
    const job: GenerationMessage = JSON.parse(message.Body!);

    console.log(`[${this.workerId}] Processing: ${job.pageId}`);

    try {
      // 2. Update status to processing
      await this.updatePageStatus(job.jobId, job.pageId, "processing");

      // 3. Fetch business context
      const context = await this.fetchBusinessContext(job.businessId);

      // 4. Fetch prompt template
      const template = await this.fetchPromptTemplate(
        job.businessId,
        job.pageType,
        job.promptTemplateVersion
      );

      // 5. Build prompt
      const prompt = this.buildPrompt(template, context, job);

      // 6. Call Ollama
      const content = await this.generateWithOllama(prompt);

      // 7. Save output
      const outputFile = await this.saveOutput(job, content);

      // 8. Update status to completed
      await this.updatePageStatus(job.jobId, job.pageId, "completed", {
        outputFile,
        wordCount: this.countWords(content),
        workerId: this.workerId,
      });

      // 9. Delete message from queue
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: process.env.SQS_QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle,
        })
      );

      console.log(`[${this.workerId}] Completed: ${job.pageId}`);
    } catch (error) {
      console.error(`[${this.workerId}] Failed: ${job.pageId}`, error);

      await this.updatePageStatus(job.jobId, job.pageId, "failed", {
        lastError: error.message,
        workerId: this.workerId,
      });

      // Message will become visible again after visibility timeout
      // and can be retried
    }
  }

  private async generateWithOllama(prompt: string): Promise<string> {
    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:latest",
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 2000,
        },
      }),
    });

    const result = await response.json();
    return result.response;
  }

  private async saveOutput(
    job: GenerationMessage,
    content: string
  ): Promise<string> {
    const outputDir = `./output/${job.businessId}`;
    const fileName = `${job.pageId}.json`;
    const filePath = `${outputDir}/${fileName}`;

    await fs.mkdir(outputDir, { recursive: true });

    const output = {
      pageId: job.pageId,
      urlSlug: job.urlSlug,
      keyword: job.keyword,
      city: job.area.city,
      state: job.area.state,
      pageType: job.pageType,
      content,
      metadata: {
        generatedAt: new Date().toISOString(),
        workerId: this.workerId,
        jobId: job.jobId,
        promptVersion: job.promptTemplateVersion,
        wordCount: this.countWords(content),
      },
    };

    await fs.writeFile(filePath, JSON.stringify(output, null, 2));

    return filePath;
  }
}
```

### Merge Tool

```typescript
// local-processor/src/merge-tool.ts

interface MergeConfig {
  sourceDirs: string[]; // Directories to merge from
  outputDir: string; // Final output directory
  businessId: string;
}

async function mergeOutputs(config: MergeConfig): Promise<MergeResult> {
  const allFiles = new Map<string, OutputFile>();
  const duplicates: string[] = [];

  // Collect all files from source directories
  for (const sourceDir of config.sourceDirs) {
    const businessDir = `${sourceDir}/${config.businessId}`;

    if (!(await exists(businessDir))) {
      continue;
    }

    const files = await fs.readdir(businessDir);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const content = await fs.readFile(`${businessDir}/${file}`, "utf-8");
      const data = JSON.parse(content) as OutputFile;

      if (allFiles.has(data.pageId)) {
        // Duplicate - keep the newer one
        const existing = allFiles.get(data.pageId)!;
        if (data.metadata.generatedAt > existing.metadata.generatedAt) {
          allFiles.set(data.pageId, data);
        }
        duplicates.push(data.pageId);
      } else {
        allFiles.set(data.pageId, data);
      }
    }
  }

  // Write merged output
  const finalDir = `${config.outputDir}/${config.businessId}`;
  await fs.mkdir(finalDir, { recursive: true });

  for (const [pageId, data] of allFiles) {
    await fs.writeFile(
      `${finalDir}/${pageId}.json`,
      JSON.stringify(data, null, 2)
    );
  }

  // Generate manifest
  const manifest = {
    businessId: config.businessId,
    mergedAt: new Date().toISOString(),
    totalPages: allFiles.size,
    duplicatesResolved: duplicates.length,
    pages: Array.from(allFiles.keys()).sort(),
  };

  await fs.writeFile(
    `${finalDir}/manifest.json`,
    JSON.stringify(manifest, null, 2)
  );

  return {
    totalPages: allFiles.size,
    duplicatesResolved: duplicates.length,
    outputDir: finalDir,
  };
}
```

---

## Questionnaire System

### Completeness Scoring Algorithm

```typescript
interface CompletenessConfig {
  // Required fields (40 points total)
  required: {
    field: string;
    points: number;
  }[];

  // Important fields (35 points total)
  important: {
    field: string;
    points: number;
  }[];

  // Nice-to-have fields (25 points total)
  optional: {
    field: string;
    points: number;
  }[];
}

const scoringConfig: CompletenessConfig = {
  required: [
    { field: "identity.legalName", points: 8 },
    { field: "identity.industry", points: 5 },
    { field: "identity.brandVoice", points: 5 },
    { field: "location.primaryAddress", points: 7 },
    { field: "offerings.services", points: 8 }, // At least 1
    { field: "audience.description", points: 7 },
  ],
  important: [
    { field: "identity.tagline", points: 5 },
    { field: "identity.yearEstablished", points: 3 },
    { field: "offerings.uniqueDifferentiators", points: 7 },
    { field: "positioning.competitiveAdvantages", points: 7 },
    { field: "trust.reviewPlatforms", points: 5 },
    { field: "content.preferredCTAs", points: 5 },
    { field: "seoGoals.primaryKeywords", points: 3 },
  ],
  optional: [
    { field: "identity.keyPersonnel", points: 3 },
    { field: "positioning.awards", points: 4 },
    { field: "positioning.experienceMetrics", points: 5 },
    { field: "trust.testimonials", points: 5 },
    { field: "content.alwaysUse", points: 4 },
    { field: "content.neverUse", points: 4 },
  ],
};

function calculateCompletenessScore(questionnaire: Questionnaire): ScoreResult {
  let score = 0;
  const missingRequired: string[] = [];
  const missingSuggestions: string[] = [];

  // Check required fields
  for (const { field, points } of scoringConfig.required) {
    if (hasValue(questionnaire, field)) {
      score += points;
    } else {
      missingRequired.push(field);
    }
  }

  // Check important fields
  for (const { field, points } of scoringConfig.important) {
    if (hasValue(questionnaire, field)) {
      score += points;
    } else {
      missingSuggestions.push(field);
    }
  }

  // Check optional fields
  for (const { field, points } of scoringConfig.optional) {
    if (hasValue(questionnaire, field)) {
      score += points;
    }
  }

  return {
    score,
    tier: getScoreTier(score),
    missingRequired,
    suggestions: missingSuggestions.slice(0, 5), // Top 5 suggestions
    canGenerate: score >= 40,
  };
}

function getScoreTier(score: number): ScoreTier {
  if (score >= 91) return "premium";
  if (score >= 71) return "good";
  if (score >= 41) return "basic";
  return "blocked";
}
```

### Score Tiers

| Tier        | Score   | Status             | Content Quality                           |
| ----------- | ------- | ------------------ | ----------------------------------------- |
| **Blocked** | 0-40%   | ❌ Cannot generate | N/A                                       |
| **Basic**   | 41-70%  | ⚠️ Minimal content | Generic, may have placeholder gaps        |
| **Good**    | 71-90%  | ✅ Quality content | Strong but missing some differentiators   |
| **Premium** | 91-100% | 🏆 Optimal         | Fully personalized, all context available |

### Dashboard Questionnaire UI

```typescript
// Frontend component structure

interface QuestionnaireWizardProps {
  businessId: string;
  questionnaire?: Questionnaire;
  onSave: (data: Partial<Questionnaire>) => Promise<void>;
}

const sections = [
  { id: "identity", title: "Business Identity", icon: Building },
  { id: "location", title: "Location & Service Areas", icon: MapPin },
  { id: "offerings", title: "Products & Services", icon: Package },
  { id: "audience", title: "Target Audience", icon: Users },
  { id: "positioning", title: "Competitive Positioning", icon: Trophy },
  { id: "trust", title: "Trust Signals", icon: Shield },
  { id: "content", title: "Content Preferences", icon: FileText },
  { id: "seoGoals", title: "SEO Goals", icon: Target },
];

// Progress indicator showing completion per section
// Auto-save on field blur
// Score updates in real-time
// Industry-specific modules shown conditionally
```

---

## Security & Authentication

### API Authentication (V1)

```yaml
Method: API Key
Header: x-api-key
Storage: AWS Parameter Store

Keys:
  - /marketbrewer-seo/api-key-primary
  - /marketbrewer-seo/api-key-secondary (backup)

Rotation: Manual, quarterly recommended
```

### Secrets Management

```yaml
Parameter Store Keys:
  /marketbrewer-seo/anthropic-api-key    # Claude API
  /marketbrewer-seo/openai-api-key       # OpenAI API
  /marketbrewer-seo/api-key-primary      # Dashboard API access
  /marketbrewer-seo/ollama-url           # Default: http://localhost:11434
```

### Data Protection

| Layer     | Protection                                |
| --------- | ----------------------------------------- |
| Transport | HTTPS only (API Gateway enforced)         |
| Database  | DynamoDB encryption at rest (AWS managed) |
| Secrets   | Parameter Store with SecureString         |
| Logs      | No PII in CloudWatch logs                 |

### Future: Cognito Integration (V2)

```yaml
# Planned for multi-user support
User Pool: marketbrewer-seo-users
App Client: dashboard-client
Features:
  - Email/password auth
  - MFA optional
  - User groups (admin, editor, viewer)
  - Per-business access control
```

---

## Cost Analysis

### Monthly Cost Estimate (Typical Usage)

| Service             | Usage                  | Unit Cost          | Monthly Cost    |
| ------------------- | ---------------------- | ------------------ | --------------- |
| **DynamoDB**        | 10K reads, 5K writes   | On-demand          | ~$1.50          |
| **Lambda**          | 50K invocations, 256MB | Free tier          | $0              |
| **API Gateway**     | 50K requests           | Free tier first 1M | $0              |
| **SQS**             | 100K messages          | Free tier first 1M | $0              |
| **Parameter Store** | 10 parameters          | Free (standard)    | $0              |
| **CloudWatch**      | 5GB logs               | First 5GB free     | $0              |
| **S3**              | Dashboard hosting      | ~1GB               | ~$0.03          |
|                     |                        | **Total AWS**      | **~$2-5/month** |

### LLM Cost Comparison

| Provider   | Model       | Cost per 1K pages | Notes                |
| ---------- | ----------- | ----------------- | -------------------- |
| **Ollama** | llama3.2    | $0                | Local, ~1-2 min/page |
| **Claude** | Haiku       | ~$3-5             | Fast, ~5-10 sec/page |
| **Claude** | Sonnet      | ~$15-25           | Higher quality       |
| **OpenAI** | GPT-4o-mini | ~$2-4             | Fast, good quality   |

### Cost Optimization Strategies

1. **Ollama-first:** 99% of generation local = near-zero LLM costs
2. **No DynamoDB GSIs:** Saves ~$0.25/million reads
3. **Parameter Store:** Free vs $0.40/secret for Secrets Manager
4. **Free tier usage:** Stay within Lambda, API Gateway, SQS free tiers
5. **Local content storage:** JSON files, not DynamoDB

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

```yaml
Goals:
  - Project setup and infrastructure
  - Basic CRUD for businesses

Tasks:
  - [ ] Initialize repository with TypeScript config
  - [ ] Create DynamoDB table with single-table design
  - [ ] Set up API Gateway
  - [ ] Implement business CRUD Lambda
  - [ ] Basic React dashboard scaffold
  - [ ] Parameter Store setup
```

### Phase 2: Questionnaire System (Week 3-4)

```yaml
Goals:
  - Complete questionnaire implementation
  - Completeness scoring

Tasks:
  - [ ] Design questionnaire schema
  - [ ] Implement questionnaire API endpoints
  - [ ] Build questionnaire wizard UI (Tremor)
  - [ ] Implement completeness scoring
  - [ ] Add industry-specific modules (restaurant, legal, marketing)
  - [ ] Seed data for Nash & Smashed
```

### Phase 3: Content Generation (Week 5-6)

```yaml
Goals:
  - Prompt template system
  - Local Ollama integration

Tasks:
  - [ ] Implement prompt template CRUD
  - [ ] Build variable injection system
  - [ ] Create local processor worker
  - [ ] Integrate Ollama client
  - [ ] Implement job queue with SQS
  - [ ] Build output file system
```

### Phase 4: Dashboard Features (Week 7-8)

```yaml
Goals:
  - Complete dashboard UI
  - Job monitoring

Tasks:
  - [ ] Keywords management page
  - [ ] Service areas management page
  - [ ] Prompt editor with preview
  - [ ] Generation control panel
  - [ ] Job progress monitoring
  - [ ] URL preview generator
```

### Phase 5: Two-Laptop & Polish (Week 9-10)

```yaml
Goals:
  - Multi-machine workflow
  - Production readiness

Tasks:
  - [ ] Test two-laptop SQS workflow
  - [ ] Build merge tool
  - [ ] Add usage/billing tracking
  - [ ] Error handling improvements
  - [ ] Documentation
  - [ ] Deploy to production
```

### Phase 6: Launch Clients (Week 11-12)

```yaml
Goals:
  - Generate content for all 3 clients
  - Export to client websites

Tasks:
  - [ ] Complete Nash & Smashed questionnaire
  - [ ] Generate N&S pages (625)
  - [ ] Complete Street Lawyer Magic questionnaire
  - [ ] Generate SLM pages (2,925)
  - [ ] Complete MarketBrewer questionnaire
  - [ ] Generate MB pages (200)
  - [ ] Export to respective repos
```

---

## Risk Mitigation

### Technical Risks

| Risk                      | Likelihood | Impact | Mitigation                                    |
| ------------------------- | ---------- | ------ | --------------------------------------------- |
| Ollama performance issues | Medium     | High   | Cloud fallback available                      |
| DynamoDB throttling       | Low        | Medium | On-demand scaling                             |
| SQS message loss          | Very Low   | High   | DLQ + retry logic                             |
| Content quality issues    | Medium     | High   | Questionnaire completeness, prompt versioning |

### Operational Risks

| Risk               | Likelihood | Impact   | Mitigation                          |
| ------------------ | ---------- | -------- | ----------------------------------- |
| Laptop unavailable | Low        | Medium   | Second laptop, cloud option         |
| Network outage     | Low        | Medium   | Local generation continues          |
| Data loss          | Very Low   | Critical | DynamoDB backups, local JSON copies |

### Business Risks

| Risk                   | Likelihood | Impact | Mitigation                                  |
| ---------------------- | ---------- | ------ | ------------------------------------------- |
| Inaccurate content     | Medium     | High   | Questionnaire-driven, review before publish |
| SEO penalties          | Low        | High   | Unique content per page, canonical URLs     |
| Client dissatisfaction | Low        | Medium | Preview before generation, revision process |

---

## Appendix

### A. Environment Variables

```bash
# Lambda environment
TABLE_NAME=marketbrewer-seo-platform
PARAMETER_PREFIX=/marketbrewer-seo
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/marketbrewer-seo-jobs

# Local processor environment
AWS_REGION=us-east-1
AWS_PROFILE=marketbrewer
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/marketbrewer-seo-jobs
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest
OUTPUT_DIR=./output
WORKER_ID=macbook-pro-1
```

### B. Useful Commands

```bash
# Start Ollama
ollama serve

# Run local processor
cd local-processor && npm run start

# Deploy backend
cd backend && npm run deploy

# Run dashboard locally
cd frontend && npm run dev

# Merge outputs from both machines
npm run merge -- --business nash-and-smashed --sources ./output,/Volumes/Laptop2/output
```

### C. Related Repositories

| Repo                          | Purpose                        |
| ----------------------------- | ------------------------------ |
| `marketbrewer-seo-platform`   | This project                   |
| `nash-and-smashed-website`    | N&S client website             |
| `street-lawyer-magic-website` | SLM client website             |
| `website-generator`           | Legacy system (being replaced) |

---

_Document Version: 1.0_  
_Last Updated: December 2025_  
_Author: Jorge Giraldez, MarketBrewer LLC_
