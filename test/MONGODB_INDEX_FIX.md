# MongoDB Duplicate Index Fix

## Problem

The MongoDB User model had an issue with the `email` field's unique index. When multiple users with `null` or missing email values were inserted, MongoDB would throw an `E11000 duplicate key error collection` error. This was because:

1. The standard MongoDB unique index treats `null` values as equal for uniqueness purposes
2. Multiple indexes were being defined on the same field
3. The schema lacked proper configuration for handling `null` and missing values

## Solution

We implemented several fixes to address this issue:

1. Removed inline `unique` and `sparse` options from the email field definition
2. Cleared any pre-existing email indexes to prevent duplicates
3. Defined a single proper unique index with a partial filter expression: 
   ```javascript
   UserSchema.index(
     { email: 1 }, 
     { 
       unique: true, 
       sparse: true, 
       partialFilterExpression: { email: { $type: "string" } },
       background: true,
       name: 'email_unique'
     }
   );
   ```

The key improvement is the `partialFilterExpression: { email: { $type: "string" } }` configuration, which ensures that:
- Only string-type email values are considered for uniqueness constraints
- `null`, `undefined`, or missing email fields are excluded from uniqueness checks
- Empty string values (`""`) are still treated as strings and must be unique

## Testing

We created a comprehensive test script (`test-schema-integrity.js`) that verifies:
- Email duplicacy prevention for string values
- Proper handling of null and undefined values
- Ability to create multiple users with null email values
- Proper error handling for duplicate email insertion attempts

The tests confirmed that our fix successfully resolved the issue while maintaining data integrity.

## Benefits

1. **Improved Robustness**: The system now properly handles all types of email values
2. **Reduced Errors**: No more duplicate key errors for null or missing email values
3. **Data Integrity**: Unique constraint is still enforced for actual email strings
4. **Better Performance**: Single well-defined index instead of multiple overlapping ones
5. **Maintainability**: Clear, documented approach to index management

## Usage Notes

When creating new User documents:
- For users with valid emails, the uniqueness constraint will be enforced
- For users without emails (null or undefined), multiple users can exist without conflicts
- Empty string emails (`""`) are treated as strings and must be unique

## Related MongoDB Documentation

- [MongoDB Unique Indexes](https://www.mongodb.com/docs/manual/core/index-unique/)
- [MongoDB Partial Indexes](https://www.mongodb.com/docs/manual/core/index-partial/)
- [MongoDB $type Operator](https://www.mongodb.com/docs/manual/reference/operator/query/type/) 