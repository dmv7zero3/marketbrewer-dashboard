# Pre-v1.0 Testing Roadmap

**Status:** Planning  
**Current Phase:** Pre-EC2 Enhancement  
**Target:** Smooth v1.0 testing on t3.large EC2  
**Timeline:** Before EC2 creation & deployment

---

## Overview

Rather than immediately deploying to EC2, we'll execute **5-7 high-value pre-deployment tasks** that make the v1.0 testing cycle smoother and faster.

---

## Pre-v1.0 Checklist (Recommended Order)

### Phase 1: Automation & Infrastructure (1-2 hours)

#### ✅ 1. Create CloudFormation Template (Infrastructure as Code)

**Purpose:** Automate EC2 + all setup (no manual clicking)  
**Deliverable:** `infrastructure/cloudformation.yaml`  
**What it does:**

```yaml
Resources:
  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c55b159cbfafe1f0
      InstanceType: t3.large
      IamInstanceProfile: marketbrewer-role
      UserData: |
        #!/bin/bash
        # Auto-install Node.js, Ollama, deploy app
```

**Benefit:** One-click deployment (30 seconds vs 30 minutes manual)  
**Who needs it:** Anyone deploying (you, team members, clients)

---

#### ✅ 2. Create GitHub Actions CI/CD Pipeline

**Purpose:** Automated testing on every push  
**Deliverable:** `.github/workflows/main.yml`  
**What it runs:**

```yaml
- TypeScript compilation (npm run typecheck)
- All unit tests (npm run test:ci)
- Lint checks (npm run lint)
- Build verification (npm run build:all)
- Report coverage
```

**Benefit:** Catch bugs before EC2 (faster feedback)  
**Who needs it:** Dev team for confidence before testing

---

#### ✅ 3. Finalize npm Scripts for v1.0

**Purpose:** Add missing production scripts  
**Current scripts:** build, test, seed, smoke tests  
**Add these:**

```bash
npm run build:prod       # Optimized production build
npm run verify:all       # Full pre-deployment check
npm run deploy:local     # Local Ollama test
npm run deploy:staging   # Staging environment test
npm run health:check     # System health verification
```

**Benefit:** Consistent deployment process across all environments

---

### Phase 2: Testing & Validation (2-3 hours)

#### ✅ 4. Create Integration Test Suite

**Purpose:** End-to-end testing (local before EC2)  
**Deliverable:** `packages/server/__tests__/e2e.test.ts`  
**What it tests:**

```
✓ API health check
✓ Create business → full workflow
✓ Generate job → verify Ollama response
✓ Database transactions (backup/restore)
✓ Error handling & recovery
✓ CORS validation
```

**Benefit:** Verify system works BEFORE EC2 (catch integration bugs early)

---

#### ✅ 5. Create Performance Baseline

**Purpose:** Establish performance targets for v1.0  
**Deliverable:** `performance-baseline.json`

```json
{
  "page_generation_time_ms": 15000-30000,
  "api_response_time_ms": 100-500,
  "database_query_time_ms": 50-200,
  "memory_usage_mb": 2000-3000,
  "cpu_utilization_percent": 40-70
}
```

**Benefit:** Know if EC2 is performing as expected (early warning if issues)

---

#### ✅ 6. Create Monitoring & Alerting Setup

**Purpose:** Understand system health in production  
**Deliverable:** `infrastructure/monitoring-setup.sh`  
**Includes:**

```bash
# CloudWatch setup
# EC2 metrics collection
# Application logging
# Auto-alerts for failures
# Cost monitoring ($35 budget)
```

**Benefit:** You'll SEE what's happening on EC2 (not flying blind)

---

### Phase 3: Documentation (1-2 hours)

#### ✅ 7. Create Operational Runbook

**Purpose:** Step-by-step for common operational tasks  
**Deliverable:** `docs/OPERATIONS.md`  
**Covers:**

```
- Starting/stopping instance
- Monitoring logs in real-time
- Diagnosing slow page generation
- Database backup/restore
- Emergency recovery procedures
- Cost control daily/weekly checks
```

**Benefit:** You + team members can operate EC2 confidently

---

## Execution Timeline

```
Today (Dec 17):
├── Task 1: CloudFormation template (30 min)
├── Task 2: GitHub Actions pipeline (45 min)
└── Task 3: npm script cleanup (30 min)

Tomorrow (Dec 18):
├── Task 4: Integration tests (60 min)
├── Task 5: Performance baseline (45 min)
└── Task 6: Monitoring setup (60 min)

Day 3 (Dec 19):
├── Task 7: Operations runbook (90 min)
├── Test everything locally
└── ✅ Ready for EC2 deployment

EC2 Deployment (Dec 19-20):
├── Deploy to t3.large
├── Run smoke tests
├── Run integration tests
├── Monitor for 24 hours
└── ✅ v1.0 Testing begins
```

---

## Why Do This Before EC2?

| Task                  | When Done Before EC2       | When Done After EC2         |
| --------------------- | -------------------------- | --------------------------- |
| **CloudFormation**    | 1-click redeploy if issues | Manual re-setup (hours)     |
| **CI/CD**             | Catch bugs before cloud    | Debug on live instance      |
| **Integration tests** | Local testing (free)       | Cloud testing (costs $$$)   |
| **Monitoring setup**  | Know what you're measuring | Blind until configured      |
| **Operations docs**   | Ready for go-live          | Creating while firefighting |

**Bottom line:** 3-4 hours now = save 8-10 hours during v1.0 testing

---

## What NOT to Do Yet

❌ **Create EC2 instance** — Wait until all pre-v1.0 tasks done  
❌ **Deploy to production** — Test on EC2 first  
❌ **Optimize performance** — Establish baseline first  
❌ **Configure load balancer** — Not needed for v1.0 (Phase 2)  
❌ **Set up RDS database** — SQLite is fine for v1.0

---

## Success Criteria

After completing all 7 tasks, you should be able to:

- [ ] Deploy entire stack with one command (`terraform apply`)
- [ ] Run full CI/CD pipeline on every code push
- [ ] Test business workflow end-to-end locally
- [ ] Know system performance characteristics
- [ ] Monitor what's happening on EC2 in real-time
- [ ] Operate EC2 without Slack messages asking "how do I...?"
- [ ] Handle issues (restart, backup, etc.) independently

---

## Estimated Effort

| Task                    | Time                   | Difficulty  |
| ----------------------- | ---------------------- | ----------- |
| 1. CloudFormation       | 30 min                 | Easy        |
| 2. GitHub Actions       | 45 min                 | Easy-Medium |
| 3. npm scripts          | 30 min                 | Easy        |
| 4. Integration tests    | 60 min                 | Medium      |
| 5. Performance baseline | 45 min                 | Easy        |
| 6. Monitoring setup     | 60 min                 | Medium      |
| 7. Operations docs      | 90 min                 | Easy        |
| **TOTAL**               | **~360 min (6 hours)** | **Mix**     |

---

## Output Artifacts

After completing these tasks, you'll have:

```
marketbrewer-seo-platform/
├── infrastructure/
│   ├── cloudformation.yaml        ✨ NEW
│   ├── monitoring-setup.sh        ✨ NEW
│   └── auto-stop.sh               (already have)
├── .github/
│   └── workflows/
│       └── main.yml               ✨ NEW (CI/CD)
├── packages/server/__tests__/
│   └── e2e.test.ts               ✨ NEW
├── docs/
│   ├── OPERATIONS.md             ✨ NEW
│   ├── EC2-SETUP.md              (already have)
│   ├── COST-OPTIMIZATION.md       (already have)
│   └── DEPLOYMENT.md             (already have)
├── performance-baseline.json      ✨ NEW
└── package.json                   (npm scripts updated)
```

---

## Next Steps

**Option A: Start with Task 1 now**

```bash
# Begin CloudFormation template
# (15 min to start, 30 min to complete)
```

**Option B: Full execution plan**

```
Today → Start tasks 1-3 (2 hours)
Tomorrow → Tasks 4-6 (2.5 hours)
Day 3 → Task 7 + local verification (2 hours)
Day 4 → EC2 deployment confident ✅
```

**Which would you prefer?**

1. Start Task 1 (CloudFormation) now?
2. Jump to a different task?
3. Want the full timeline mapped out with code first?

---

## Notes

- These tasks are **independent** — can be done in any order
- Each has clear deliverables (files created)
- All work stays in git for team reference
- No AWS charges until EC2 deployment
- Everything can be tested locally first

**Total effort to production-ready:** 6 hours + 30-min EC2 deployment
