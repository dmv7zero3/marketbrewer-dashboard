# How to Use the LLM Review Prompt

## Quick Start

Copy the prompt from [LLM-REVIEW-PROMPT.md](LLM-REVIEW-PROMPT.md) and paste it into your favorite LLM (Claude, GPT-4, etc.)

## What This Prompt Covers

### 1. **Code Quality Analysis** (9 questions)
   - Type safety, error handling, edge cases
   - Readability, maintainability, complexity
   - Identifies issues in critical functions

### 2. **Architectural Review** (4 sections)
   - State management patterns
   - Data flow and dependencies
   - Component separation concerns
   - API integration points

### 3. **Performance Optimization** (4 focus areas)
   - Runtime complexity analysis
   - Memory management review
   - Network optimization opportunities
   - Bundle size implications

### 4. **Testing Recommendations** (4 categories)
   - Unit test coverage strategy
   - Integration test scenarios
   - E2E test cases
   - Performance benchmarks

### 5. **Code-Level Suggestions** (5 specific items)
   - Points out areas needing refinement
   - Provides code examples
   - Asks for justification of design decisions

### 6. **Best Practices Alignment** (4 standards)
   - React patterns
   - TypeScript conventions
   - Error handling standards
   - Documentation guidelines

### 7. **Security Review** (3 areas)
   - Input validation gaps
   - Data handling risks
   - API security concerns

### 8. **Future Enhancements** (4 vectors)
   - Extensibility strategies
   - Scalability planning
   - UX improvements
   - Monitoring needs

### 9. **Quality Assessment** (3 dimensions)
   - Documentation completeness
   - Testing readiness
   - Production readiness

### 10. **Final Recommendations** (5 critical outputs)
   - Overall quality grade
   - Top 3 strengths
   - Top 3 weaknesses
   - Quick wins (1-2 hour improvements)
   - Next sprint priorities

---

## Expected Output

The LLM should provide:

| Section | Expected Content |
|---------|-----------------|
| Executive Summary | 2-3 paragraphs with grade and key findings |
| Critical Issues | 0-3 blocking issues (ideally none) |
| Major Improvements | 5-10 high-impact recommendations |
| Minor Suggestions | 10-20 quality improvement ideas |
| Test Plan | Specific test cases with coverage targets |
| Performance Analysis | Complexity analysis + optimization suggestions |
| Architecture Review | Structural improvements or concerns |
| Security Review | Vulnerability assessment |
| Optimization Opportunities | Code refactoring suggestions |
| Final Grade | A-F grade + deployment recommendation |

---

## Key Files to Reference

When sharing the prompt with an LLM, include links to:

1. **SOURCE CODE:**
   - packages/dashboard/src/components/dashboard/QuestionnaireForm.tsx
   - packages/dashboard/src/components/dashboard/BusinessProfile.tsx
   - packages/dashboard/src/lib/safe-deep-merge.ts
   - packages/dashboard/src/lib/deep-equal.ts
   - packages/dashboard/src/contexts/ToastContext.tsx

2. **DOCUMENTATION:**
   - CODE-REVIEW-DFF24BD.md (Initial review findings)
   - IMPLEMENTATION-COMPLETE.md (What was accomplished)

3. **COMMITS:**
   - dff24bd (Critical & major fixes)
   - 48a8dec (Quality improvements)
   - bc9e7b4 (Implementation summary)

---

## Recommended LLMs

### Claude (Recommended)
- Best at understanding complex code
- Excellent architectural recommendations
- Good at identifying edge cases
- Command: Use in Claude.ai or API with extended context

### GPT-4
- Strong code analysis
- Good performance suggestions
- Practical recommendations

### Gemini 2.0
- Fast processing
- Good for quick checks
- Less comprehensive than Claude

---

## Usage Patterns

### Pattern 1: Full Review (Recommended for this sprint)
**Time:** 20-30 minutes  
**Command:** Paste entire prompt as-is  
**Output:** Complete analysis across all 10 sections

### Pattern 2: Targeted Review
**Time:** 5-10 minutes  
**Command:** Use specific sections (e.g., "SECTION 3: PERFORMANCE OPTIMIZATION")  
**Output:** Focused recommendations

### Pattern 3: Iterative Review
**Time:** Multiple sessions  
**Command:** Ask follow-up questions based on LLM response  
**Output:** Deeper analysis of specific concerns

---

## Questions to Ask After Initial Review

Based on the LLM's response, follow up with:

1. **"Which of your recommendations would have the biggest impact on production readiness?"**

2. **"Are there any security vulnerabilities I should be concerned about?"**

3. **"What percentage of code paths are covered by the suggested tests?"**

4. **"Should I use lodash/immer instead of custom deepEqual and safeDeepMerge utilities?"**

5. **"What would you grade this code as: A, B+, B, C+, or lower?"**

6. **"Is this safe to deploy to production, or what must be fixed first?"**

7. **"What should be the focus of the next sprint?"**

8. **"Are there any performance bottlenecks that could cause issues at scale?"**

---

## Using Results

### If Grade is A or A+
- ✅ Proceed with production deployment
- 📊 Prioritize monitoring setup
- 🔄 Next: Testing suite, monitoring, new features

### If Grade is B+ or B
- ⚠️ Fix critical issues before deployment
- 📋 Implement major improvements before merge
- 🔄 Next: Stability improvements, then features

### If Grade is C+ or lower
- 🛑 Do not deploy
- 🔧 Implement all critical issues
- 🔄 Next: Architectural review meeting needed

---

## Sample Follow-up Analysis

After receiving the LLM review, consider asking for:

1. **Performance Benchmarks**
   - deepEqual() speed on 1000-item arrays
   - safeDeepMerge() memory usage
   - Render cycle impact

2. **Test Coverage Plan**
   - Critical path (must have) tests
   - Nice-to-have tests
   - Performance test infrastructure

3. **Refactoring Roadmap**
   - Phase 1 (critical, before deploy)
   - Phase 2 (important, within 1 week)
   - Phase 3 (nice-to-have, future)

4. **Monitoring & Alerting**
   - What should we monitor in production?
   - What error rates are acceptable?
   - What performance metrics matter most?

---

## Document Storage

All review documents are stored in the repo root:

```
/
├── LLM-REVIEW-PROMPT.md           ← Use this for comprehensive review
├── CODE-REVIEW-DFF24BD.md         ← Initial detailed review findings
├── IMPLEMENTATION-COMPLETE.md     ← What was implemented
└── LLM-REVIEW-RECOMMENDATIONS.md  ← LLM output (generated after review)
```

---

**Ready to get a comprehensive review? Copy the prompt and share with your favorite LLM!**
