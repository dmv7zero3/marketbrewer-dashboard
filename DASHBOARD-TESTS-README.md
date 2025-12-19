# Dashboard Integration Tests

Comprehensive integration tests for the MarketBrewer SEO Platform dashboard, validating the business selection flow and related functionality.

## Overview

These tests validate critical dashboard functionality after fixing the nested `BusinessProvider` context isolation bug. They ensure:

1. **Business Selection Flow** - Selecting a business loads locations correctly
2. **Context Integration** - Single provider architecture works as expected
3. **Error Handling** - Error boundaries catch and display errors gracefully
4. **Location Mutations** - CRUD operations trigger proper refresh

## Test Files

```
dashboard-tests/
├── setup/
│   ├── setupTests.ts        # Jest setup with mocks
│   ├── test-utils.tsx       # Custom render utilities & mock data
│   └── __mocks__/
│       └── fileMock.js      # Asset import mock
├── integration/
│   ├── business-selection.test.tsx   # 8 tests
│   ├── business-context.test.tsx     # 10 tests
│   ├── error-handling.test.tsx       # 12 tests
│   └── location-mutations.test.tsx   # 10 tests
├── jest.config.js
└── README.md
```

## Test Coverage Summary

| Test File                     | Tests  | Description                             |
| ----------------------------- | ------ | --------------------------------------- |
| `business-selection.test.tsx` | 8      | Business dropdown → location loading    |
| `business-context.test.tsx`   | 10     | Context state management & propagation  |
| `error-handling.test.tsx`     | 12     | Error boundaries & graceful degradation |
| `location-mutations.test.tsx` | 10     | Add/edit/delete with refresh            |
| **Total**                     | **40** |                                         |

## Key Test Scenarios

### Business Selection Flow

- ✅ Loads locations when business is selected
- ✅ Clears locations when no business is selected
- ✅ Handles rapid selection without stale data (AbortController)
- ✅ Persists selection to localStorage
- ✅ Handles API errors gracefully
- ✅ Handles network timeouts
- ✅ Loads 32 locations with correct stats
- ✅ Switches between businesses correctly

### BusinessContext Integration

- ✅ Initializes with businesses from API
- ✅ Updates selectedBusiness when setSelectedBusiness is called
- ✅ Restores selection from localStorage on mount
- ✅ Clears invalid localStorage selection
- ✅ Single provider prevents context isolation
- ✅ Handles API errors during initialization
- ✅ addBusiness updates the list
- ✅ refreshBusinesses reloads the list
- ✅ Throws error when used outside provider
- ✅ Maintains stable function references

### Error Handling

- ✅ Catches component errors and shows fallback
- ✅ Logs errors in development mode
- ✅ Allows user to reset after error
- ✅ Dashboard survives section errors
- ✅ Custom fallback rendering
- ✅ onError callback invocation
- ✅ onReset callback invocation
- ✅ Catches user interaction errors
- ✅ Catches async errors
- ✅ Normal rendering when no errors
- ✅ Nested boundaries isolate failures
- ✅ Multiple boundaries work independently

### Location Mutations

- ✅ Add location and refresh list
- ✅ Edit location and refresh list
- ✅ Delete location and refresh list
- ✅ Handle add mutation errors gracefully
- ✅ Handle delete mutation errors gracefully
- ✅ Cancel delete on user decline
- ✅ Cancel add modal without saving
- ✅ Handle concurrent operations

## Installation

Copy these test files to your dashboard package:

```bash
# From project root
cp -r dashboard-tests/setup packages/dashboard/src/__tests__/
cp -r dashboard-tests/integration packages/dashboard/src/__tests__/
```

Update `packages/dashboard/jest.config.js`:

```javascript
module.exports = {
  displayName: "dashboard",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx}",
    "**/integration/**/*.test.{ts,tsx}",
  ],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup/setupTests.ts"],
  // ... rest of config
};
```

## Running Tests

```bash
# Run all dashboard tests
cd packages/dashboard
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- business-selection.test.tsx

# Run in watch mode
npm test -- --watch
```

## Expected Output

```
PASS  src/__tests__/integration/business-selection.test.tsx
PASS  src/__tests__/integration/business-context.test.tsx
PASS  src/__tests__/integration/error-handling.test.tsx
PASS  src/__tests__/integration/location-mutations.test.tsx

Test Suites: 4 passed, 4 total
Tests:       40 passed, 40 total
Snapshots:   0 total
Time:        8.xxx s
```

## Mock Data

The test utilities provide realistic mock data:

- **3 businesses**: Nash & Smashed, Street Lawyer Magic, MarketBrewer
- **3 locations** (small set for quick tests)
- **32 locations** (realistic production dataset)
- **Location stats**: total, active, upcoming, byState

## Key Testing Patterns

### AbortController for Race Conditions

```typescript
test("handles rapid business selection", async () => {
  const businessAPromise = createControllablePromise();
  const businessBPromise = createControllablePromise();

  // Select A, then immediately B
  await user.selectOptions(dropdown, "business-a");
  await user.selectOptions(dropdown, "business-b");

  // Resolve B first, then A
  businessBPromise.resolve({ locations: bLocations });
  businessAPromise.resolve({ locations: aLocations });

  // Only B's data should be displayed
  expect(screen.getByText("Business B Location")).toBeInTheDocument();
  expect(screen.queryByText("Business A Location")).not.toBeInTheDocument();
});
```

### Error Boundary Testing

```typescript
test("catches errors without crashing", () => {
  render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  );

  expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
  expect(screen.queryByTestId("throwing-component")).not.toBeInTheDocument();
});
```

### Context Propagation

```typescript
test("single provider prevents isolation", async () => {
  render(
    <BusinessProvider>
      <Sidebar /> {/* Updates context */}
      <Locations /> {/* Reads context */}
    </BusinessProvider>
  );

  // Select in Sidebar
  await user.selectOptions(dropdown, "nash-and-smashed");

  // Locations immediately receives update
  expect(screen.getByTestId("selected-display")).toHaveTextContent(
    "nash-and-smashed"
  );
});
```

## Relationship to Bug Fix

These tests directly validate the fix documented in `FIX-NESTED-BUSINESS-PROVIDER.md`:

| Bug                                | Test                                                               |
| ---------------------------------- | ------------------------------------------------------------------ |
| Nested provider isolation          | `business-context.test.tsx` - "does not create context isolation"  |
| Stale data on rapid selection      | `business-selection.test.tsx` - "handles rapid business selection" |
| Dashboard crash on component error | `error-handling.test.tsx` - "does not crash dashboard"             |
| Mutations not refreshing           | `location-mutations.test.tsx` - all refresh tests                  |

## CI/CD Integration

Add to `.github/workflows/main.yml`:

```yaml
- name: Run Dashboard Integration Tests
  run: |
    cd packages/dashboard
    npm test -- --coverage --ci
```

## Success Criteria

- ✅ All 40 tests passing
- ✅ Test coverage >80%
- ✅ Tests complete in <10 seconds
- ✅ No console errors during execution
- ✅ CI/CD pipeline passes

## Implementation Guide

For step-by-step instructions on implementing these tests, see [PROMPT-INTEGRATION-TESTS.md](PROMPT-INTEGRATION-TESTS.md).
