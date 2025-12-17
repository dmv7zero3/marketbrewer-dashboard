# Production Strategy: Nash & Smashed

Strategic plan for delivering 3,000 pages per contract requirements.

---

## Contract Overview

**Client:** N&S Franchising Corp (Nash & Smashed)  
**Agreement:** v6.0 — Website Maintenance & Enterprise Local SEO Services  
**Contract File:** `NashSmashed_Agreement_v6_December2025.html`

### Deliverables

| Deliverable         | Contracted  | Current | Gap         |
| ------------------- | ----------- | ------- | ----------- |
| **Location Pages**  | Up to 3,000 | 1,300   | +1,700      |
| **Target Keywords** | Up to 50    | 50      | ✅ Complete |
| **Monthly Fee**     | $1,250      | —       | Active      |

**Breakdown:**

- $1,000/month — Website maintenance
- $250/month — AI technology fee (SEO page generation)

---

## Current Status (Dec 16, 2024)

### Test Database

- **Locations:** 26 unique cities across 5 states

  - Virginia: 14 cities
  - Maryland: 8 cities
  - Washington DC: 1 city
  - South Carolina: 1 city
  - New York: 2 cities

- **Keywords:** 50 SEO-optimized terms

  - Examples: best-fried-chicken, nashville-hot-chicken, smash-burger, halal-food, etc.

- **Current Pages:** 1,300 (26 locations × 50 keywords)

- **Generated:** 1 test page successfully created
  - URL: `/best-food-near-me/fairfax-county-va`
  - Quality: Pending review
  - Model: llama3.2:latest (local Ollama)

### Infrastructure

- **Local:**

  - API Server on :3001 ✅
  - Worker with Ollama ✅
  - SQLite database ✅
  - llama3.2:latest model ✅

- **EC2:** Not yet deployed

---

## Phased Rollout Strategy

### Phase 1: Local Quality Testing (Current)

**Goal:** Validate content quality with 20-100 pages before scaling.

**Steps:**

1. **Generate Test Batch** (20-100 pages)

   - Select diverse sample:
     - Mix of locations (VA, MD, DC, SC, NY)
     - Mix of keywords (food types, halal, location-based)
     - Active and coming-soon locations
   - Run worker locally with Ollama
   - Target: 1-2 hours generation time

2. **Quality Review Checklist**

   - [ ] SEO optimization
     - Title tags include keyword + city + brand
     - Meta descriptions under 160 characters
     - H1 tags properly formatted
     - Schema markup present
   - [ ] Local relevance
     - City/state mentioned naturally
     - Nearby landmarks referenced (if applicable)
     - Local context appropriate
   - [ ] Brand voice
     - Nash & Smashed brand guidelines followed
     - Halal certification mentioned where relevant
     - Southern hospitality tone maintained
   - [ ] Accuracy
     - No hallucinated facts
     - Locations are real Nash & Smashed stores
     - Contact info correct
   - [ ] Readability
     - Natural language flow
     - No awkward phrasing
     - Proper grammar

3. **Client Approval**

   - Export 10-20 representative pages
   - Present to Nash & Smashed for review
   - Document feedback
   - Iterate on prompt template if needed

4. **Performance Benchmarking**
   - Measure: pages generated per hour
   - Monitor: Ollama CPU/memory usage
   - Track: error rate and retry frequency
   - Estimate: time needed for full 3,000 pages

**Exit Criteria:**

- ✅ Client approves page quality
- ✅ Less than 5% error rate
- ✅ Clear path to 3,000 pages identified

---

### Phase 2: Scaling Strategy

**Goal:** Determine how to reach 3,000 pages from current 1,300.

**Gap Analysis:** Need 1,700 more pages

**Option A: Add More Locations**

- Current: 26 locations
- Needed: ~60 locations (60 × 50 keywords = 3,000 pages)
- Approach: Add 34 more cities in Nash & Smashed service areas
  - Virginia suburbs and metros
  - Maryland regions
  - DC neighborhoods
  - North Carolina (possible expansion)
  - More NY metro areas

**Option B: Add More Keywords**

- Current: 50 keywords
- Needed: ~60 keywords (26 locations × 60 keywords = 1,560... not enough)
- Requires ~115 keywords for 3,000 pages
- Approach: Expand keyword list with:
  - Long-tail variations
  - Menu-specific terms
  - Occasion-based searches (catering, late night, etc.)
  - Dietary terms (halal, gluten-free, etc.)

**Option C: Hybrid Approach (RECOMMENDED)**

- Add 15 locations → 41 total
- Add 23 keywords → 73 total
- Total: 41 × 73 = 2,993 pages ✅

**Client Decision Required:** Coordinate with Nash & Smashed on:

- Which new locations to target
- Which additional keywords to optimize for
- Priority regions for expansion

---

### Phase 3: EC2 Deployment

**Goal:** Deploy production infrastructure for 3,000 page generation.

**EC2 Requirements:**

1. **Instance Sizing**

   - Recommended: g4dn.xlarge (GPU) or c6i.2xlarge (CPU)
   - Ollama performs well on GPU for faster generation
   - Fallback: CPU instance with higher core count
   - See: `docs/reference/EC2-GPU.md`

2. **Multi-Worker Setup**

   - Deploy 2-3 worker instances
   - Each claims pages independently
   - Parallel processing: 40-60 pages/hour (estimated)
   - Full 3,000 pages: 50-75 hours (2-3 days continuous)

3. **Infrastructure Components**

   - API Server (single instance)
   - Workers (2-3 instances)
   - SQLite database (single file, shared via EFS or migrate to RDS)
   - Ollama on each worker
   - Monitoring via CloudWatch
   - Systemd service files for auto-restart

4. **Deployment Steps**
   - [ ] Provision EC2 instances
   - [ ] Install Ollama and pull llama3.2:latest
   - [ ] Deploy API server
   - [ ] Deploy worker code
   - [ ] Configure environment variables
   - [ ] Set up systemd services
   - [ ] Configure auto-shutdown (cost optimization)
   - [ ] Test with 10-page sample job
   - [ ] Run full 3,000 page job
   - [ ] Monitor and handle errors
   - [ ] Export generated pages to JSON
   - [ ] Deploy to static site (S3 + CloudFront)

**Timeline Estimate:**

- EC2 setup: 4-6 hours
- Test run: 2 hours
- Full generation: 50-75 hours
- Export & deploy: 2-4 hours
- **Total: 3-4 days**

---

### Phase 4: Static Site Deployment

**Goal:** Publish 3,000 generated pages to production website.

**Approach:**

1. **JSON Export**

   - Export all completed pages from database
   - Format: `output/nash-and-smashed/pages.json`
   - Include: content, metadata, schema markup

2. **Static Site Generation**

   - Integrate with existing React website
   - Generate HTML for each SEO page
   - Create sitemap with all 3,000 URLs
   - Configure routing for SEO-friendly URLs

3. **Deployment**

   - Build static assets
   - Upload to S3 bucket
   - CloudFront distribution
   - Update DNS/routing

4. **Verification**
   - Test sample pages in production
   - Verify Google indexing
   - Check Search Console for errors
   - Monitor analytics for traffic

---

## Success Metrics

### Technical Metrics

- ✅ 3,000 pages generated successfully
- ✅ Less than 2% error rate
- ✅ Average generation time < 60 seconds/page
- ✅ All pages pass SEO validation
- ✅ Schema markup on 100% of pages

### Business Metrics

- Client approval of content quality
- Pages indexed by Google within 30 days
- Organic traffic increase to SEO pages
- Conversion tracking on SEO pages
- Client retention at monthly review

---

## Risk Mitigation

### Technical Risks

| Risk                                 | Mitigation                                       |
| ------------------------------------ | ------------------------------------------------ |
| Ollama crashes during generation     | Systemd auto-restart, worker retry logic         |
| SQLite locking with multiple workers | WAL mode enabled, connection pooling             |
| EC2 cost overruns                    | Auto-shutdown after job complete, spot instances |
| Content quality inconsistency        | Rigorous prompt testing, client approval phase   |
| Generation too slow                  | Multiple workers, GPU instances if needed        |

### Business Risks

| Risk                           | Mitigation                                       |
| ------------------------------ | ------------------------------------------------ |
| Client doesn't approve quality | Iterative review at 20, 100, 500 page milestones |
| Scope creep beyond 3,000 pages | Contract clearly states "up to 3,000"            |
| Keyword list disagreement      | Collaborative keyword selection process          |
| Location list expansion needed | Clear process for adding new locations           |

---

## Next Steps

### Immediate (This Week)

1. [ ] Generate and review 20-100 test pages locally
2. [ ] Document quality issues and patterns
3. [ ] Refine prompt template
4. [ ] Get client approval on samples
5. [ ] Determine scaling strategy (locations vs keywords)

### Near-Term (Next Week)

6. [ ] Coordinate with client on expansion to 3,000
7. [ ] Update database with new locations/keywords
8. [ ] Set up EC2 infrastructure
9. [ ] Deploy and test on EC2
10. [ ] Run full 3,000 page generation

### Follow-Up (Ongoing)

11. [ ] Monitor organic traffic and rankings
12. [ ] Monthly reporting to client
13. [ ] Update pages as locations change
14. [ ] Expand to additional clients (Street Lawyer Magic, MarketBrewer)

---

## Contact & Coordination

**Client Contact:**  
N&S Franchising Corp  
Attn: M N Abbasi (Zayan), President & Founder

**Provider Contact:**  
Jorge Giraldez, MarketBrewer LLC  
j@marketbrewer.com | 703-463-6323

**Review Cadence:**

- Quality review: Before scaling
- Progress check: Daily during generation
- Monthly reporting: Per contract

---

_Document Version: 1.0_  
_Last Updated: December 16, 2024_  
_Next Review: After Phase 1 completion_
