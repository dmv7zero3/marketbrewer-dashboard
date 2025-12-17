# LLM Review Prompt: Phase 2 Completion & Production Strategy

Copy this entire prompt and paste it into your LLM of choice for strategic review and next steps.

---

## Session Context

**Date:** December 16, 2024  
**Repository:** https://github.com/dmv7zero3/marketbrewer-seo-platform  
**Branch:** main  
**Latest Commit:** `9da5a07` - "Update seeding with actual Nash & Smashed locations and production strategy"

---

## What Was Accomplished

### 1. Ollama Integration Sprint (Phase 2) ✅

**Completed in this session:**

- **P0 Fixes Implemented:**

  - Named parameters in batch insert (prevents 19-parameter ordering bugs)
  - Atomic claim with `UPDATE...RETURNING` (prevents race conditions)
  - Ollama health check at startup (fail fast if misconfigured)

- **Real Content Generation:**

  - Replaced placeholder `generateContent()` with actual Ollama client
  - Integrated llama3.2:latest model (2GB, running locally)
  - Hardcoded prompt template with variable injection
  - JSON parsing with fallback for non-JSON responses
  - Comprehensive error handling for LLM failures

- **End-to-End Testing:**
  - Created job: `de4b2502-5d8a-4535-8b72-fbdeff15a572`
  - Generated 1 complete page: `/best-food-near-me/fairfax-county-va`
  - Verified working flow: API → Worker → Ollama → Database

**Git Commits:**

- `41b6f4e` - "Ollama Integration Sprint: P0 fixes + content generation"
- `9da5a07` - "Update seeding with actual Nash & Smashed locations and production strategy"

---

### 2. Database Seeded with Real Nash & Smashed Data ✅

**Current database (`data/seo-platform.db`):**

- **Business:** Nash & Smashed (Fast Food Restaurant)
- **Locations:** 26 unique cities across 5 states
  - Virginia: 14 cities (Manassas, Dumfries, Hampton, Norfolk, etc.)
  - Maryland: 8 cities (Silver Spring, Baltimore, Ellicott City, etc.)
  - Washington DC: 1 city
  - South Carolina: 1 city (Rock Hill)
  - New York: 2 cities (Albany, Ronkonkoma)
- **Keywords:** 50 SEO-optimized terms

  - Examples: best-fried-chicken, nashville-hot-chicken, smash-burger, halal-food, best-food-near-me, family-friendly-restaurant, etc.

- **Total Pages Ready:** 1,300 (26 locations × 50 keywords)
- **Generated:** 1 page (1,299 remaining)

**Status Breakdown:**

- Active locations: 13
- Coming-soon locations: 13
- All locations verified against actual Nash & Smashed store list

---

### 3. Production Strategy Document Created ✅

**New file:** `docs/PRODUCTION-STRATEGY.md`

**Key sections:**

- Contract overview (3,000 page deliverable, $1,250/month)
- Phased rollout strategy
- Quality testing checklist
- Scaling options to reach 3,000 pages
- EC2 deployment plan
- Success metrics and risk mitigation

**Contract Requirements (from NashSmashed_Agreement_v6_December2025.html):**

- Up to 3,000 location-specific landing pages
- Up to 50 target keywords
- Monthly fee: $1,250 ($1,000 maintenance + $250 AI tech fee)

**Gap Analysis:**

- Current: 1,300 pages
- Target: 3,000 pages
- Gap: 1,700 pages needed

**Scaling Options:**

- Option A: Add 34 more locations (60 total × 50 keywords = 3,000)
- Option B: Add 65 keywords (26 locations × 115 keywords = 2,990)
- Option C (Recommended): Hybrid approach (41 locations × 73 keywords = 2,993)

---

### 4. Documentation Fully Updated ✅

**Updated files:**

- `.github/copilot-instructions.md` - Added current status and contract context
- `README.md` - Production goals and testing strategy
- `docs/PLANS.md` - Marked Phase 2 complete, outlined Phase 3-4
- `docs/TODO.md` - Updated with quality testing and EC2 scaling tasks
- `docs/QUESTIONS.md` - Resolved questions, added new ones
- `docs/ENVIRONMENT.md` - Added current dev values, fixed token naming
- `docs/README.md` - Added production strategy to index
- `docs/PRODUCTION-STRATEGY.md` - Complete rollout plan (NEW)

---

### 5. Sample Generated Content ✅

**Generated page:** `/best-food-near-me/fairfax-county-va`

**Content structure:**

```json
{
  "title": "Best Burgers Near Me in Fairfax County, VA | Nash Smashed",
  "meta_description": "Experience the juiciest burgers and freshest ingredients near you in Fairfax County, Virginia. Discover why Nash Smashed is the go-to spot for best food near me.",
  "h1": "Smash Your Hunger with Our Signature Burgers",
  "body": "Are you looking for the best food near me? Look no further than Nash Smashed in Fairfax County, VA...",
  "sections": [
    {
      "heading": "About Best Food Near Me in Fairfax",
      "content": "Fairfax County residents know that finding the best food near them can be a challenge..."
    },
    {
      "heading": "Why Choose Nash Smashed",
      "content": "At Nash Smashed, we're passionate about serving the best food near you..."
    },
    {
      "heading": "Contact Us Today",
      "content": "Ready to taste the difference for yourself? Get in touch with us today..."
    }
  ],
  "cta": {
    "text": "Get Started",
    "url": "/contact"
  }
}
```

**Quality observations:**

- ✅ SEO-optimized title with keyword + location + brand
- ✅ Meta description under 160 characters
- ✅ Structured content with H1, sections, CTA
- ⚠️ Content mentions "burgers" more than "chicken" (Nash & Smashed specializes in chicken)
- ⚠️ Needs review for brand voice accuracy

---

## Current State

### Infrastructure

**Local Development:**

- ✅ API Server running on :3001
- ✅ Worker with Ollama (llama3.2:latest)
- ✅ SQLite database (WAL mode)
- ✅ Environment variables configured

**Production (EC2):**

- ❌ Not yet deployed
- 📋 Plan documented in PRODUCTION-STRATEGY.md

### Test Results

**Working:**

- Server health check endpoint
- Job creation via API (`POST /api/businesses/nash-and-smashed/generate`)
- Worker claiming pages
- Ollama content generation
- JSON content parsing and storage
- Database transactions

**Performance:**

- Generation time: ~30-60 seconds per page (CPU-based Ollama)
- Estimated full job time: ~650-1,300 minutes (10-21 hours) for 1,300 pages on single worker
- For 3,000 pages: ~25-50 hours on single worker

**Issues Identified:**

- Dashboard webpack config broken (non-blocking)
- Worker tests use mocked Ollama (need integration tests)
- Server test coverage low (37.73%)

---

## Questions for Review

### Strategic Questions

1. **Quality First Approach:**

   - Should we proceed with generating 20-100 test pages locally before scaling?
   - What quality metrics should we establish as pass/fail criteria?
   - How should we present samples to the client for approval?

2. **Scaling Strategy:**

   - Which approach is best for reaching 3,000 pages?
     - More locations (realistic given franchise expansion)?
     - More keywords (better SEO coverage)?
     - Hybrid approach?
   - Should we coordinate with client before adding locations/keywords?

3. **Timeline Planning:**

   - What's a realistic timeline for:
     - Local testing phase (20-100 pages)
     - Client approval cycle
     - EC2 deployment
     - Full 3,000 page generation
   - Should we do incremental deliveries (500, 1000, 2000, 3000)?

4. **Content Quality:**

   - The sample page mentioned "burgers" heavily - is this acceptable for a chicken-focused brand?
   - Should the prompt template be more prescriptive about menu items?
   - How do we ensure consistent brand voice across 3,000 pages?

5. **Technical Decisions:**
   - Should we deploy to EC2 now or continue local testing?
   - Is single worker sufficient or do we need multi-worker from the start?
   - Should we use GPU instances (g4dn.xlarge) or CPU (c6i.2xlarge)?

### Operational Questions

6. **Client Communication:**

   - What's the approval process for the 3,000 page plan?
   - How often should we provide progress updates during generation?
   - What deliverables does the client expect beyond the pages themselves?

7. **Risk Management:**

   - What's our rollback plan if client doesn't approve quality?
   - How do we handle coming-soon locations (15 of 26 are not yet open)?
   - What if Ollama fails mid-generation on EC2?

8. **Cost Optimization:**
   - Should we use EC2 spot instances for workers?
   - Auto-shutdown script after job completion?
   - Cost estimate for full 3,000 page generation?

---

## Review Request

Please review the work completed in this session and provide:

### 1. Quality Assessment

- **Code Quality:** Evaluate the Ollama integration, P0 fixes, and architecture decisions
- **Documentation:** Assess completeness and clarity of production strategy
- **Testing Approach:** Is the phased rollout (local → EC2) sound?
- **Generated Content:** Review the sample page quality and suggest improvements

### 2. Risk Analysis

- **Technical Risks:** What could go wrong during scaling?
- **Business Risks:** Client satisfaction, scope management, timeline
- **Operational Risks:** EC2 costs, content quality at scale, maintenance burden

### 3. Prompt Engineering

- **Current Prompt:** Review the hardcoded template in `packages/worker/src/worker.ts`
- **Improvements:** Suggest refinements for better brand voice, accuracy, SEO
- **Variables:** Are we injecting the right business data into the prompt?

### 4. Next Steps Prioritization

Provide a clear, ordered list of next steps with:

- **Priority:** P0 (critical), P1 (important), P2 (nice-to-have)
- **Estimated Effort:** Hours or days
- **Dependencies:** What needs to happen first
- **Owner:** Technical vs. business decision

Example format:

```
1. [P0] Generate 20-50 test pages locally (2-4 hours)
   - Depends on: None
   - Owner: Technical
   - Deliverable: Sample pages for client review

2. [P0] Client approval on content quality (1-2 days)
   - Depends on: #1
   - Owner: Business
   - Deliverable: Written approval or feedback

3. [P1] Refine prompt template based on feedback (2-4 hours)
   - Depends on: #2
   - Owner: Technical
   - Deliverable: Updated prompt, 5-10 re-generated samples
```

### 5. Production Readiness Checklist

Create a go/no-go checklist for EC2 deployment:

- [ ] Quality criteria met
- [ ] Client approval obtained
- [ ] Performance benchmarked
- [ ] Error handling tested
- [ ] Cost estimate approved
- [ ] Monitoring configured
- [ ] Rollback plan documented

### 6. Long-Term Considerations

- How do we maintain 3,000 pages as locations change?
- What's the update process when menu items change?
- How do we handle new location openings (contract requires 4-day notification)?
- Should we build a dashboard for the client to trigger updates?

---

## Specific Code Review Requests

### 1. Worker Content Generation

**File:** `packages/worker/src/worker.ts` (lines ~150-250)

Review the `generateContent()` and `buildPrompt()` methods:

- Is the prompt template effective for SEO?
- Are we injecting the right variables?
- Should we add more business context (menu items, USPs, etc.)?

### 2. Database Schema for Scale

**File:** `packages/server/migrations/001_initial_schema.sql`

Evaluate for 3,000 pages:

- Are indexes optimized for claim queries?
- Will SQLite handle 3,000 rows efficiently?
- Should we add indexes for common search patterns?

### 3. Error Handling

Review error handling across:

- Worker retry logic
- Ollama timeout handling
- Database transaction failures
- JSON parsing errors

Are we resilient enough for unattended 50-hour generation runs?

---

## Success Criteria

A successful review will:

✅ Validate or challenge the phased testing approach  
✅ Identify critical blockers before EC2 deployment  
✅ Provide actionable prompt refinements  
✅ Prioritize next steps with clear dependencies  
✅ Highlight risks we haven't considered  
✅ Give confidence to proceed with scaling (or reasons to pause)

---

## Context Files

**For full context, review these files in the repository:**

- `docs/PRODUCTION-STRATEGY.md` - Complete rollout plan
- `docs/PLANS.md` - Phase breakdown
- `docs/TODO.md` - Task list
- `packages/worker/src/worker.ts` - Content generation logic
- `packages/server/src/routes/jobs.ts` - Job creation with batch insert
- `scripts/seed-nash-smashed.ts` - Database seeding script
- `NashSmashed_Agreement_v6_December2025.html` - Contract terms

---

## Output Format

Please structure your response as:

### Executive Summary (3-5 sentences)

- Overall assessment
- Biggest risks
- Recommended next priority

### Detailed Review

1. **Quality Assessment** - Code, docs, strategy
2. **Prompt Engineering** - Specific improvements to template
3. **Risk Analysis** - Technical, business, operational
4. **Next Steps** - Prioritized action plan with estimates

### Go/No-Go Recommendation

- ✅ **GO:** Proceed with local testing phase
- 🟡 **GO WITH CAUTION:** Address these concerns first
- ⛔ **NO-GO:** Critical issues to resolve before proceeding

---

**Ready to paste into Claude, ChatGPT, or your LLM of choice!**

---

_Session completed: December 16, 2024_  
_Repository: dmv7zero3/marketbrewer-seo-platform_  
_Commit: 9da5a07_
