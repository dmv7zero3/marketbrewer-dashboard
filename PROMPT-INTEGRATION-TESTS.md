# Prompt: Implement Integration Tests for Business Selection Flow

## Context

The MarketBrewer SEO Platform dashboard recently fixed critical bugs:

1. ✅ Removed nested `BusinessProvider` causing context isolation
2. ✅ Added error boundaries to prevent dashboard crashes
3. ✅ Fixed race condition with AbortController in business selection

**Current Status:** Core functionality working, but lacking automated tests.

**Goal:** Add comprehensive integration tests to prevent regressions and validate the business selection → location loading flow.

---

## Your Mission

Implement integration tests for the business selection flow in the dashboard package using React Testing Library and Jest.

**Priority:** Medium (before production deployment)  
**Time Estimate:** 2-3 hours  
**Testing Framework:** Jest + React Testing Library (already configured)

---

## Test Coverage Required

### 1. Business Selection Flow (Priority 1)

**File:** `packages/dashboard/src/__tests__/integration/business-selection.test.tsx`

Test that selecting a business from the dropdown correctly loads locations and stats.

**Scenarios:**

```typescript
describe("Business Selection Flow", () => {
  test("loads locations when business is selected", async () => {
    // 1. Mock API responses for businesses list
    // 2. Mock API responses for locations and stats
    // 3. Render the dashboard with BusinessProvider
    // 4. Wait for business dropdown to appear
    // 5. Select "marketbrewer" from dropdown
    // 6. Verify API calls were made to correct endpoints
    // 7. Verify locations appear in the UI (32 locations)
    // 8. Verify stats are displayed correctly
  });

  test("clears locations when no business is selected", async () => {
    // 1. Start with a business selected
    // 2. Clear selection (select "-- Select Business --")
    // 3. Verify locations are cleared from UI
    // 4. Verify no API calls are made
  });

  test("handles rapid business selection without stale data", async () => {
    // Test the AbortController fix
    // 1. Mock slow API responses (use delay)
    // 2. Select Business A
    // 3. Immediately select Business B (before A loads)
    // 4. Verify only Business B data is displayed
    // 5. Verify Business A data is NOT displayed (request was aborted)
  });

  test("persists selection to localStorage", async () => {
    // 1. Select a business
    // 2. Verify localStorage.setItem was called with correct key/value
    // 3. Unmount component
    // 4. Remount component
    // 5. Verify business is restored from localStorage
    // 6. Verify locations are loaded for restored business
  });

  test("handles business selection errors gracefully", async () => {
    // 1. Mock API to return 404 or 500 error
    // 2. Select a business
    // 3. Verify error toast is displayed
    // 4. Verify locations list shows empty state, not crash
    // 5. Verify error is logged to console
  });

  test("handles network timeout", async () => {
    // 1. Mock API to timeout (> 30s configured timeout)
    // 2. Select a business
    // 3. Verify timeout error is handled
    // 4. Verify user sees error message
    // 5. Verify component doesn't crash
  });
});
```

### 2. Context Provider Tests (Priority 1)

**File:** `packages/dashboard/src/__tests__/integration/business-context.test.tsx`

Test that BusinessContext properly manages state and propagates to consumers.

**Scenarios:**

```typescript
describe("BusinessContext Integration", () => {
  test("initializes with businesses from API", async () => {
    // 1. Mock API response with business list
    // 2. Render component wrapped in BusinessProvider
    // 3. Verify businesses are loaded
    // 4. Verify selectedBusiness is null initially (unless localStorage)
  });

  test("updates selectedBusiness when setSelectedBusiness is called", async () => {
    // 1. Render provider with consumer component
    // 2. Call setSelectedBusiness('marketbrewer')
    // 3. Verify context value updates
    // 4. Verify localStorage is updated
    // 5. Verify all consumers receive new value
  });

  test("restores selection from localStorage on mount", async () => {
    // 1. Set localStorage.setItem('selectedBusiness', 'marketbrewer')
    // 2. Render provider
    // 3. Verify context initializes with correct business
    // 4. Verify API is called to validate business still exists
  });

  test("clears invalid localStorage selection", async () => {
    // 1. Set localStorage to non-existent business ID
    // 2. Mock API to return business list without that ID
    // 3. Render provider
    // 4. Verify invalid selection is cleared
    // 5. Verify selectedBusiness is null
  });

  test("does not create context isolation with single provider", async () => {
    // 1. Render component tree with single BusinessProvider at root
    // 2. Verify Sidebar and LocationsManagement read same context
    // 3. Update business in Sidebar
    // 4. Verify LocationsManagement receives update immediately
  });
});
```

### 3. Error Boundary Tests (Priority 2)

**File:** `packages/dashboard/src/__tests__/integration/error-handling.test.tsx`

Test that error boundaries catch errors and display fallback UI.

**Scenarios:**

```typescript
describe("Error Boundary Integration", () => {
  test("catches component errors and shows fallback", () => {
    // 1. Create component that throws error on render
    // 2. Wrap in ErrorBoundary
    // 3. Render component
    // 4. Verify error is caught (no crash)
    // 5. Verify fallback UI is displayed
  });

  test("logs errors in development mode", () => {
    // 1. Mock console.error
    // 2. Trigger error in boundary
    // 3. Verify console.error was called with error details
  });

  test("allows user to reset after error", async () => {
    // 1. Trigger error
    // 2. Verify fallback UI appears
    // 3. Click "Try Again" button
    // 4. Verify component resets and attempts to render
  });

  test("does not crash dashboard when LocationsManagement errors", async () => {
    // 1. Mock API to throw unexpected error
    // 2. Select business
    // 3. Verify error boundary catches it
    // 4. Verify rest of dashboard still works (Sidebar, etc.)
  });
});
```

### 4. Mutation Tests (Priority 2)

**File:** `packages/dashboard/src/__tests__/integration/location-mutations.test.tsx`

Test that add/edit/delete operations trigger proper refresh.

**Scenarios:**

```typescript
describe("Location Mutations", () => {
  test("adds location and refreshes list", async () => {
    // 1. Load business with locations
    // 2. Click "Add Location" button
    // 3. Fill form and submit
    // 4. Mock successful API response
    // 5. Verify modal closes
    // 6. Verify API is called to refresh locations
    // 7. Verify new location appears in list
    // 8. Verify success toast is shown
  });

  test("edits location and refreshes list", async () => {
    // Similar to above but for edit
  });

  test("deletes location and refreshes list", async () => {
    // Similar to above but for delete
  });

  test("bulk imports locations and refreshes list", async () => {
    // Test bulk import flow
  });

  test("handles mutation errors gracefully", async () => {
    // 1. Mock API to return 400/500 error
    // 2. Attempt mutation
    // 3. Verify error toast is shown
    // 4. Verify modal doesn't close (user can correct)
    // 5. Verify locations list unchanged
  });
});
```

---

## Testing Setup

### Required Dependencies

All already installed in `packages/dashboard/package.json`:

```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.1.5",
  "@testing-library/user-event": "^14.5.1",
  "jest": "^29.7.0",
  "jest-environment-jsdom": "^29.7.0"
}
```

### Mock Setup

**Create:** `packages/dashboard/src/__tests__/setup/test-utils.tsx`

```typescript
import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { BusinessProvider } from "../../contexts/BusinessContext";
import { ToastProvider } from "../../contexts/ToastContext";

// Custom render that includes all providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BusinessProvider>
        <ToastProvider>{children}</ToastProvider>
      </BusinessProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Mock API client
export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Mock business data
export const mockBusinesses = [
  {
    business_id: "marketbrewer",
    name: "MarketBrewer",
    website: "https://marketbrewer.com",
  },
  {
    business_id: "other-business",
    name: "Other Business",
    website: "https://example.com",
  },
];

// Mock locations data
export const mockLocations = [
  {
    location_id: "loc-1",
    business_id: "marketbrewer",
    name: "Arlington Location",
    address: "123 Main St",
    city: "Arlington",
    state: "VA",
    zip: "22201",
    country: "US",
    status: "active",
  },
  // ... add 31 more for full test
];

// Mock stats data
export const mockStats = {
  total: 32,
  active: 30,
  upcoming: 2,
  byState: { VA: 15, MD: 10, DC: 5, SC: 1, NY: 1 },
};

// Re-export everything from testing library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
```

### Jest Configuration

Already configured in `packages/dashboard/jest.config.js`. Verify it includes:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup/setupTests.ts"],
  moduleNameMapper: {
    "^@marketbrewer/shared$": "<rootDir>/../shared/src",
  },
};
```

**Create:** `packages/dashboard/src/__tests__/setup/setupTests.ts`

```typescript
import "@testing-library/jest-dom";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.matchMedia (for responsive components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
```

---

## Implementation Guidelines

### 1. Mocking API Calls

Use `jest.mock()` to mock the API client:

```typescript
import * as locationsApi from "../../api/locations";

jest.mock("../../api/locations");

beforeEach(() => {
  (locationsApi.getLocations as jest.Mock).mockResolvedValue({
    locations: mockLocations,
  });

  (locationsApi.getLocationStats as jest.Mock).mockResolvedValue({
    stats: mockStats,
  });
});
```

### 2. Simulating User Interactions

Use `@testing-library/user-event` for realistic interactions:

```typescript
import userEvent from "@testing-library/user-event";

test("user selects business", async () => {
  const user = userEvent.setup();
  const { getByRole } = renderWithProviders(<LocationsManagement />);

  const dropdown = getByRole("combobox", { name: /business/i });
  await user.selectOptions(dropdown, "marketbrewer");

  // Assertions...
});
```

### 3. Waiting for Async Updates

Use `waitFor` for async state updates:

```typescript
import { waitFor, screen } from "@testing-library/react";

await waitFor(() => {
  expect(screen.getByText("32 locations")).toBeInTheDocument();
});
```

### 4. Testing AbortController (Race Condition)

Mock delayed responses to test abort behavior:

```typescript
test("aborts stale requests", async () => {
  let businessAResolve: any;
  let businessBResolve: any;

  (locationsApi.getLocations as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          businessAResolve = resolve;
        })
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          businessBResolve = resolve;
        })
    );

  const user = userEvent.setup();
  const { getByRole } = renderWithProviders(<LocationsManagement />);

  const dropdown = getByRole("combobox");

  // Select Business A
  await user.selectOptions(dropdown, "business-a");

  // Immediately select Business B (before A resolves)
  await user.selectOptions(dropdown, "business-b");

  // Resolve Business A (should be ignored/aborted)
  businessAResolve({ locations: businessALocations });

  // Resolve Business B
  businessBResolve({ locations: businessBLocations });

  // Verify only Business B data is displayed
  await waitFor(() => {
    expect(screen.queryByText("Business A Location")).not.toBeInTheDocument();
    expect(screen.getByText("Business B Location")).toBeInTheDocument();
  });
});
```

---

## Success Criteria

**Before considering tests complete:**

1. ✅ All test files created in `packages/dashboard/src/__tests__/integration/`
2. ✅ All 15+ test scenarios passing
3. ✅ Test coverage for business selection flow: >90%
4. ✅ Test coverage for context integration: >90%
5. ✅ Test coverage for error boundaries: >80%
6. ✅ Test coverage for mutations: >80%
7. ✅ Tests run successfully with `npm test` in dashboard package
8. ✅ Tests run successfully in CI/CD pipeline
9. ✅ No console errors during test execution
10. ✅ Tests complete in <10 seconds

**Run tests:**

```bash
cd packages/dashboard
npm test -- --coverage
```

**Expected output:**

```
Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
Coverage:
  Statements: >85%
  Branches: >80%
  Functions: >85%
  Lines: >85%
```

---

## File Structure After Implementation

```
packages/dashboard/src/__tests__/
├── setup/
│   ├── setupTests.ts          # Jest setup with mocks
│   └── test-utils.tsx         # Custom render utilities
├── integration/
│   ├── business-selection.test.tsx   # 6 tests
│   ├── business-context.test.tsx     # 5 tests
│   ├── error-handling.test.tsx       # 4 tests
│   └── location-mutations.test.tsx   # 5 tests
└── ...
```

---

## Example: Complete Test Implementation

```typescript
// packages/dashboard/src/__tests__/integration/business-selection.test.tsx

import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders,
  mockBusinesses,
  mockLocations,
  mockStats,
} from "../setup/test-utils";
import { LocationsManagement } from "../../components/dashboard/LocationsManagement";
import * as locationsApi from "../../api/locations";
import * as businessesApi from "../../api/businesses";

jest.mock("../../api/locations");
jest.mock("../../api/businesses");

describe("Business Selection Flow", () => {
  beforeEach(() => {
    // Mock businesses list
    (businessesApi.getBusinesses as jest.Mock).mockResolvedValue({
      businesses: mockBusinesses,
    });

    // Mock locations and stats
    (locationsApi.getLocations as jest.Mock).mockResolvedValue({
      locations: mockLocations,
    });

    (locationsApi.getLocationStats as jest.Mock).mockResolvedValue({
      stats: mockStats,
    });

    // Clear localStorage
    localStorage.clear();
  });

  test("loads locations when business is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocationsManagement />);

    // Wait for business dropdown to load
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const dropdown = screen.getByRole("combobox");

    // Select business
    await user.selectOptions(dropdown, "marketbrewer");

    // Verify API calls
    await waitFor(() => {
      expect(locationsApi.getLocations).toHaveBeenCalledWith(
        "marketbrewer",
        undefined,
        expect.any(Object)
      );
      expect(locationsApi.getLocationStats).toHaveBeenCalledWith(
        "marketbrewer",
        expect.any(Object)
      );
    });

    // Verify locations appear
    await waitFor(() => {
      expect(screen.getByText(/32 locations/i)).toBeInTheDocument();
    });

    // Verify stats
    expect(screen.getByText(/30 active/i)).toBeInTheDocument();
  });

  test("handles rapid business selection without stale data", async () => {
    const user = userEvent.setup();

    // Mock delayed responses
    let businessAResolve: any;
    let businessBResolve: any;

    (locationsApi.getLocations as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            businessAResolve = () => resolve({ locations: [] });
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            businessBResolve = () => resolve({ locations: mockLocations });
          })
      );

    (locationsApi.getLocationStats as jest.Mock).mockResolvedValue({
      stats: mockStats,
    });

    renderWithProviders(<LocationsManagement />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const dropdown = screen.getByRole("combobox");

    // Select Business A
    await user.selectOptions(dropdown, "business-a");

    // Immediately select Business B
    await user.selectOptions(dropdown, "marketbrewer");

    // Resolve Business B first
    businessBResolve();

    // Verify Business B data loads
    await waitFor(() => {
      expect(screen.getByText(/32 locations/i)).toBeInTheDocument();
    });

    // Now resolve stale Business A request
    businessAResolve();

    // Verify Business B data is still displayed (not overwritten)
    await waitFor(() => {
      expect(screen.getByText(/32 locations/i)).toBeInTheDocument();
    });
  });

  // Add remaining 4 tests...
});
```

---

## Notes for Implementation

1. **Use realistic data:** Mock 32 locations for marketbrewer to match production
2. **Test error scenarios:** Don't just test happy path
3. **Test cleanup:** Verify AbortController abort() is called on unmount
4. **Test localStorage sync:** Verify selection persists across remounts
5. **Test concurrent requests:** Verify no race conditions
6. **Performance:** Tests should run fast (<10s total)

---

## What to Do After Tests Pass

1. ✅ Run `npm test -- --coverage` and verify >85% coverage
2. ✅ Commit tests with message: "test: add integration tests for business selection flow"
3. ✅ Update NEXT-ACTIONS.md to mark integration tests as complete
4. ✅ Update production readiness score in documentation
5. ✅ Push to GitHub and verify CI/CD passes
6. ✅ Proceed with staging deployment

---

**This comprehensive test suite will prevent regressions and provide confidence for production deployment.**
