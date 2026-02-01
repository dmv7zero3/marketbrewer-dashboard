# DynamoDB Restore Validation

Documented restore procedure to validate PITR recovery in production.

## Scope
- Table: `${PROJECT_PREFIX}-dashboard`
- Feature: point-in-time recovery (PITR)
- Goal: validate restore works and data is readable

## Preconditions
- PITR enabled on the table
- AWS credentials with DynamoDB restore permissions
- A known good record to validate (job, business, or webhook)

## Procedure (Quarterly or after major release)
1) **Select a restore timestamp**
   - Use a time when you know data exists and is correct
2) **Restore table to a new name**
   - Example: `${PROJECT_PREFIX}-dashboard-restore-YYYYMMDD`
3) **Verify record integrity**
   - Query a known record by PK/SK and compare expected fields
4) **Run a minimal read path**
   - Use a lightweight script or DynamoDB console query
5) **Log results**
   - Record date/time, restore table name, records validated
6) **Cleanup**
   - Delete the restore table after validation

## Validation checklist
- [ ] Restore completed successfully
- [ ] Known record exists and matches expected fields
- [ ] Table can be queried with standard PK/SK patterns
- [ ] Restore table deleted after verification

## Notes
- This procedure verifies restore capability, not full system recovery.
- Keep validation lightweight to avoid unnecessary costs.
