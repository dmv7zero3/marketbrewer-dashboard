import React from "react";
import { DashboardLayout } from "./DashboardLayout";

const DIAGRAM = `
┌──────────────────────────────┐
│        CloudFront CDN         │
│  admin.marketbrewer.com       │
│  E11Y4KYRSGLH4T                │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        S3 Static Site         │
│   s3://marketbrewer-local-seo │
└──────────────────────────────┘

┌──────────────────────────────┐
│      API Gateway (HTTP)       │
│ api.marketbrewer.com           │
│  (sno9m87ab4)                   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   Lambda API (TypeScript)     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ marketbrewer-dashboard        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   SQS: page-generation        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Lambda Worker (TypeScript)    │
│ Claude API generation         │
└──────────────────────────────┘
`;

export const AwsInfrastructure: React.FC = () => {
  return (
    <DashboardLayout title="AWS Infrastructure">
      <div className="space-y-6">
        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                Current Production Architecture
              </h2>
              <p className="text-sm text-dark-400">
                Serverless stack in us-east-1 using S3 + CloudFront, API Gateway,
                Lambda, DynamoDB, and SQS for generation jobs.
              </p>
            </div>
            <div className="flex gap-2 text-xs text-dark-400">
              <span className="px-2.5 py-1 rounded-full bg-dark-800">
                Region: us-east-1
              </span>
              <span className="px-2.5 py-1 rounded-full bg-dark-800">
                Updated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
          <pre className="bg-dark-950 border border-dark-700 rounded-lg p-4 text-xs text-dark-200 overflow-auto">
            {DIAGRAM}
          </pre>
        </section>

        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-3">
            Key Resources
          </h2>
          <div className="bg-dark-950 border border-dark-700 rounded-lg p-4 mb-4 text-sm text-dark-300">
            <p className="font-medium text-dark-100 mb-2">Detected</p>
            <p>
              GitHub:{" "}
              <a
                href="https://github.com/dmv7zero3/marketbrewer-dashboard"
                className="text-metro-orange hover:text-metro-orange-400 transition-colors"
                target="_blank"
                rel="noreferrer"
              >
                dmv7zero3/marketbrewer-dashboard
              </a>
            </p>
            <p>CloudFront: E11Y4KYRSGLH4T (dh4sm87m0k188.cloudfront.net)</p>
            <p>S3 Bucket: marketbrewer-local-seo</p>
            <p>API Gateway: sno9m87ab4 (https://sno9m87ab4.execute-api.us-east-1.amazonaws.com)</p>
            <p>Custom Domain: api.marketbrewer.com</p>
            <p>SQS: marketbrewer-page-generation (+ DLQ)</p>
            <p>DynamoDB: marketbrewer-dashboard</p>
            <p>Lambdas: marketbrewer-dashboard-api, marketbrewer-dashboard-worker</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Hosting</p>
              <p className="text-dark-400">S3 Bucket: marketbrewer-local-seo</p>
              <p className="text-dark-400">CloudFront: admin.marketbrewer.com</p>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">API</p>
              <p className="text-dark-400">API Gateway: api.marketbrewer.com</p>
              <p className="text-dark-400">Lambda API + Worker (TypeScript)</p>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Data</p>
              <p className="text-dark-400">
                DynamoDB: marketbrewer-dashboard
              </p>
              <p className="text-dark-400">Single-table, no GSIs</p>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Jobs</p>
              <p className="text-dark-400">SQS: marketbrewer-page-generation</p>
              <p className="text-dark-400">Claude API for generation</p>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Security</p>
              <p className="text-dark-400">OAC-enabled CloudFront</p>
              <p className="text-dark-400">Bearer auth + Google login</p>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Observability</p>
              <p className="text-dark-400">CloudWatch logs for Lambda</p>
              <p className="text-dark-400">Immutable cost ledger in DynamoDB</p>
            </div>
          </div>
        </section>

        <section className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-dark-100 mb-3">
            DynamoDB Table
          </h2>
          <div className="bg-dark-950 border border-dark-700 rounded-lg p-4 text-sm text-dark-300 space-y-3">
            <div>
              <p className="text-dark-200 font-medium">Table Name</p>
              <p className="text-dark-400">marketbrewer-dashboard</p>
            </div>
            <div>
              <p className="text-dark-200 font-medium">Key Model</p>
              <p className="text-dark-400">Single-table with PK + SK (no GSIs)</p>
            </div>
            <div>
              <p className="text-dark-200 font-medium">Write Paths</p>
              <p className="text-dark-400">
                Lambda API writes business, questionnaire, locations, keywords,
                prompts, jobs, and pages directly into DynamoDB. Lambda Worker
                updates job pages and records immutable cost entries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 text-sm">
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Business + Profile</p>
              <pre className="text-xs text-dark-300 whitespace-pre-wrap">
{`{ PK: "BUSINESS", SK: "BUSINESS#<businessId>", type: "business", ... }
{ PK: "BUSINESS#<businessId>", SK: "QUESTIONNAIRE", type: "questionnaire", ... }
{ PK: "BUSINESS#<businessId>", SK: "PROFILE_LOCATION#<locationId>", type: "profile_location", ... }
{ PK: "BUSINESS#<businessId>", SK: "SOCIAL#<platform>", type: "social", ... }`}
              </pre>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Jobs + Pages</p>
              <pre className="text-xs text-dark-300 whitespace-pre-wrap">
{`{ PK: "BUSINESS#<businessId>", SK: "JOB#<jobId>", type: "job", ... }
{ PK: "JOB#<jobId>", SK: "PAGE#<pageId>", type: "page", status: "queued", ... }
{ PK: "JOB#<jobId>", SK: "COST#<timestamp>#<uuid>", type: "cost", ... }`}
              </pre>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Operations</p>
              <pre className="text-xs text-dark-300 whitespace-pre-wrap">
{`{ PK: "BUSINESS#<businessId>", SK: "KEYWORD#<keywordId>", type: "keyword", ... }
{ PK: "BUSINESS#<businessId>", SK: "SERVICE_AREA#<areaId>", type: "service_area", ... }
{ PK: "BUSINESS#<businessId>", SK: "PROMPT#<promptId>", type: "prompt", ... }`}
              </pre>
            </div>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <p className="text-dark-200 font-medium mb-2">Webhooks</p>
              <pre className="text-xs text-dark-300 whitespace-pre-wrap">
{`{ PK: "WEBHOOK", SK: "WEBHOOK#<webhookId>", type: "webhook", events: [...], ... }`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AwsInfrastructure;
