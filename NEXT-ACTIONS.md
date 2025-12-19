# Next Actions: MarketBrewer SEO Platform

**Created:** December 18, 2024  
**Status:** Ready to implement  
**Estimated Time:** 3-4 hours

---

## Immediate Actions (Before Staging Deployment)

### 1. Add Error Boundaries to Dashboard (Priority 1 - High)

**Time:** 2 hours  
**Files:** Create `ErrorBoundary.tsx`, update `DashboardLayout.tsx`

**Why:** Runtime errors currently crash entire dashboard. Production needs graceful error handling.

**Implementation:**

- Create `packages/dashboard/src/components/common/ErrorBoundary.tsx`
- Wrap `LocationsManagement` and other dashboard sections
- Add error logging and user-friendly fallback UI

---

### 2. Fix Race Condition in LocationsManagement (Priority 1 - High)

**Time:** 1 hour  
**File:** `packages/dashboard/src/components/dashboard/LocationsManagement.tsx`

**Why:** Rapid business selection can show stale data from previous request.

**Implementation:**

- Add `AbortController` to useEffect
- Cancel in-flight requests on cleanup
- Update Promise.allSettled to use signal

**Code:**

```typescript
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    const [locationsResult, statsResult] = await Promise.allSettled([
      getLocations(selectedBusiness, { signal: controller.signal }),
      getLocationStats(selectedBusiness, { signal: controller.signal }),
    ]);
    // ... rest
  };

  fetchData();
  return () => controller.abort();
}, [selectedBusiness, refreshToken, addToast]);
```

---

### 3. Verify addToast Memoization (Priority 1 - Medium)

**Time:** 30 minutes  
**File:** `packages/dashboard/src/contexts/ToastContext.tsx`

**Why:** If `addToast` isn't memoized, it triggers unnecessary re-fetches in LocationsManagement.

**Implementation:**

- Open ToastContext.tsx
- Verify `addToast` is wrapped in `useCallback`
- If not, add memoization with empty dependency array

---

### 4. Add Integration Tests (Priority 2)

**Time:** 2 hours  
**Files:** `packages/dashboard/src/__tests__/integration/`

**Why:** No automated testing for business selection flow.

**Implementation:**

- Create test file for business selection → location loading
- Test rapid selection changes
- Test error scenarios
- Test localStorage persistence

---

## Execution Order

1. ✅ Create ErrorBoundary component
2. ✅ Update DashboardLayout to use ErrorBoundary
3. ✅ Fix race condition with AbortController
4. ✅ Verify/fix addToast memoization
5. ✅ Add integration tests
6. ✅ Test all changes locally
7. ✅ Commit and push
8. ✅ Deploy to staging

---

## Success Criteria

- [ ] Dashboard doesn't crash on runtime errors
- [ ] No stale data on rapid business selection
- [ ] Integration tests pass
- [ ] All TypeScript compiles without errors
- [ ] Manual QA: Business selection works smoothly
- [ ] Ready for staging deployment

---

## After Completion

Update production readiness score:

- Current: 36/50 (72%)
- Target: 42/50 (84%) after these fixes

Then proceed with staging deployment per DEPLOYMENT.md.
