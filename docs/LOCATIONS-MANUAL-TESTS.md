# Location Business Profile Update - Test Cases

**Component:** LocationsManagement + LocationFormModal  
**Feature:** Edit Location Business Profile  
**Test Date:** December 18, 2025

---

## Manual Testing Checklist

### Prerequisites

- [ ] Server running on http://localhost:3001
- [ ] Dashboard running on http://localhost:3002
- [ ] At least one location exists in database
- [ ] Business selected in dropdown

---

## Test Case 1: Open Edit Modal

**Steps:**

1. Navigate to Locations page
2. Find any location in the list
3. Click the "Edit" button on a location row

**Expected Results:**

- [ ] Modal opens with title "Edit Location"
- [ ] All form fields are pre-filled with current location data
- [ ] Required fields show the existing values
- [ ] Optional fields show existing values or are empty
- [ ] Modal has "Cancel" and "Save Changes" buttons

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 2: Update Required Fields

**Steps:**

1. Open edit modal for a location
2. Change the "Location Name" field
3. Change the "City" field
4. Click "Save Changes"

**Expected Results:**

- [ ] Modal closes
- [ ] Success toast appears: "Location updated successfully"
- [ ] Location list refreshes
- [ ] Updated values visible in location row
- [ ] Other fields remain unchanged

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 3: Update Optional Fields

**Steps:**

1. Open edit modal for a location
2. Update phone number
3. Update email address
4. Update Google Maps URL
5. Click "Save Changes"

**Expected Results:**

- [ ] All optional fields accept new values
- [ ] Modal closes on save
- [ ] Success toast appears
- [ ] Updated contact info visible in UI
- [ ] Links work correctly (clickable)

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 4: Change Location Status

**Steps:**

1. Open edit modal for an "Active" location
2. Change Status dropdown to "Upcoming"
3. Save changes
4. Open edit modal for an "Upcoming" location
5. Change Status dropdown to "Active"
6. Save changes

**Expected Results:**

- [ ] Status badge updates from "Active" to "Coming Soon"
- [ ] Status badge updates from "Coming Soon" to "Active"
- [ ] Location statistics update correctly
- [ ] Service area created/updated for new active location

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 5: Toggle Headquarters Flag

**Steps:**

1. Open edit modal for a non-HQ location
2. Check the "Mark as headquarters" checkbox
3. Save changes
4. Verify "HQ" badge appears
5. Open edit modal for HQ location
6. Uncheck "Mark as headquarters"
7. Save changes

**Expected Results:**

- [ ] Purple "HQ" badge appears when flag set to true
- [ ] HQ badge disappears when flag set to false
- [ ] Only one location should have HQ badge (optional verification)

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 6: Update Address Components

**Steps:**

1. Open edit modal
2. Update Street Address
3. Update City
4. Update State
5. Update ZIP Code
6. Leave "Full Address" empty (to test auto-generation)
7. Save changes

**Expected Results:**

- [ ] Full address auto-generated from components
- [ ] Full address format: "Street, City, State ZIP"
- [ ] Location row shows updated address

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 7: Update Priority

**Steps:**

1. Note current order of locations in list
2. Open edit modal for a location
3. Change priority to a higher number (e.g., 100)
4. Save changes
5. Verify location moves to top of its group

**Expected Results:**

- [ ] Priority value accepts numbers
- [ ] Location with higher priority appears first
- [ ] List re-sorts after update
- [ ] HQ locations still appear first regardless of priority

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 8: Update Links

**Steps:**

1. Open edit modal
2. Add/update Google Maps URL
3. Add/update Order Link
4. Save changes
5. Click "Map" link on location row
6. Click "Order" link on location row

**Expected Results:**

- [ ] Map link opens in new tab
- [ ] Order link opens in new tab
- [ ] Links use correct URLs
- [ ] Links only appear if URLs provided

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 9: Add Notes

**Steps:**

1. Open edit modal
2. Add text to "Notes" field (multiple lines)
3. Save changes
4. Re-open edit modal
5. Verify notes are preserved

**Expected Results:**

- [ ] Notes field accepts multi-line text
- [ ] Notes are saved correctly
- [ ] Notes persist between edit sessions
- [ ] Notes field can be cleared

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 10: Cancel Without Saving

**Steps:**

1. Open edit modal
2. Make several changes to fields
3. Click "Cancel" button
4. Re-open same location's edit modal

**Expected Results:**

- [ ] Modal closes without saving
- [ ] No success toast appears
- [ ] Location data unchanged
- [ ] Re-opening shows original values
- [ ] No API call made to server

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 11: Close Modal by Clicking Overlay

**Steps:**

1. Open edit modal
2. Make changes to fields
3. Click on dark overlay outside modal
4. Re-open modal

**Expected Results:**

- [ ] Modal closes when clicking overlay
- [ ] Changes are not saved
- [ ] Original values preserved

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 12: Validation - Required Fields

**Steps:**

1. Open edit modal
2. Clear the "Location Name" field
3. Try to save
4. Clear the "City" field
5. Try to save

**Expected Results:**

- [ ] Browser validation prevents submission
- [ ] "Please fill out this field" message appears
- [ ] Modal stays open
- [ ] No API call made

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 13: Update Multiple Locations

**Steps:**

1. Edit Location A, update name, save
2. Edit Location B, update name, save
3. Edit Location C, update name, save
4. Verify all three locations updated

**Expected Results:**

- [ ] All locations update correctly
- [ ] No cross-contamination of data
- [ ] Each edit is independent
- [ ] Statistics update after each change

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 14: Update Store ID

**Steps:**

1. Open edit modal
2. Add/update Store ID field
3. Save changes
4. Verify Store ID is saved (may not be visible in UI, check via edit modal)

**Expected Results:**

- [ ] Store ID accepts alphanumeric values
- [ ] Store ID persists correctly
- [ ] Store ID can be updated or cleared

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 15: Performance - Rapid Updates

**Steps:**

1. Open edit modal
2. Update a field and save
3. Immediately open edit modal again
4. Update another field and save
5. Repeat 3-5 times quickly

**Expected Results:**

- [ ] All updates process correctly
- [ ] No race conditions
- [ ] Latest changes always saved
- [ ] UI remains responsive
- [ ] No duplicate toasts or errors

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 16: Error Handling - Server Down

**Steps:**

1. Stop the API server
2. Open edit modal
3. Make changes and try to save

**Expected Results:**

- [ ] Error toast appears: "Failed to update location"
- [ ] Modal stays open (user can retry)
- [ ] Error logged in browser console
- [ ] No crash or hang

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 17: Update Display Name Override

**Steps:**

1. Open edit modal
2. Leave "Display Name" empty
3. Save (should auto-generate)
4. Re-open edit modal
5. Enter custom "Display Name"
6. Save
7. Verify custom name appears

**Expected Results:**

- [ ] Empty display name auto-generates
- [ ] Custom display name overrides auto-generation
- [ ] Display name shows in location list

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 18: Network Latency Simulation

**Steps:**

1. Open browser DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Open edit modal
4. Make changes and save
5. Observe behavior

**Expected Results:**

- [ ] "Saving..." button text appears
- [ ] Save button is disabled during save
- [ ] Modal stays open until save completes
- [ ] Success toast after save finishes
- [ ] No duplicate submissions

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 19: Update Headquarters Location

**Steps:**

1. Find location with "HQ" badge
2. Open edit modal
3. Update various fields
4. Save changes
5. Verify HQ badge persists

**Expected Results:**

- [ ] HQ locations can be edited normally
- [ ] HQ badge remains visible after update
- [ ] HQ location stays at top of list

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Test Case 20: Browser Console Verification

**Steps:**

1. Open browser console
2. Open edit modal
3. Make changes and save
4. Check console for logs

**Expected Results:**

- [ ] See: `[API Request] PUT http://localhost:3001/api/businesses/seo/{id}/locations/{locationId}`
- [ ] See: `[API Response] 200 /api/businesses/seo/{id}/locations/{locationId}`
- [ ] No error messages in console
- [ ] Request/response logged in development mode

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Notes:
```

---

## Integration Test Results

Run automated integration tests:

```bash
# Start server
NODE_ENV=development npm run dev:server

# In another terminal
npm run test:server -- routes/__tests__/locations.integration.test.ts
```

**Expected:** All tests pass

**Actual Results:**

```
Status: [ ] Pass / [ ] Fail
Test Count: ___ / ___
Notes:
```

---

## Summary

| Category             | Tests  | Passed | Failed | Notes |
| -------------------- | ------ | ------ | ------ | ----- |
| Modal Functionality  | 2      |        |        |       |
| Field Updates        | 8      |        |        |       |
| Validation           | 1      |        |        |       |
| Error Handling       | 2      |        |        |       |
| Performance          | 2      |        |        |       |
| Integration          | 1      |        |        |       |
| Browser Verification | 1      |        |        |       |
| **TOTAL**            | **20** |        |        |       |

---

## Issues Found

| Issue # | Severity | Description | Status |
| ------- | -------- | ----------- | ------ |
|         |          |             |        |

---

## Sign-off

**Tester:** ********\_\_\_********  
**Date:** ********\_\_\_********  
**Overall Status:** [ ] Pass / [ ] Fail / [ ] Blocked

**Notes:**
