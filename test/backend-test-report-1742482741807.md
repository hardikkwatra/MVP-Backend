# Backend Test Report

**Test ID:** backend-test-1742482739594  
**Date:** 3/20/2025, 8:28:59 PM  
**Duration:** 2.19 seconds  

## Summary

- **Total Tests:** 13
- **Successful:** 4
- **Errors:** 8
- **Warnings:** 0
- **Success Rate:** 30.77%

## Database Schema

- **Collections:** users, scores, wallets
- **Email Index:** Properly configured

## Test Results

| Test | Status | Details |
|------|--------|--------|
| MongoDB Connection | ✅ | Connected to MongoDB |
| User Email Index | ✅ | Found proper email index with partial filter expression |
| Score Collection | ✅ | Score collection exists with indexes |
| Database Schema | ✅ | Found 3 collections |
| Start Server | ❌ | Failed to start server |
| Create Test Users | ❌ | Failed to create test users |
| Wallet Connect | ❌ | No test users available for wallet connect test |
| Verify Wallet Status | ❌ | Failed to verify wallet status |
| Check Score Records | ❌ | Failed to check score records |
| Email Uniqueness | ❌ | Failed to test email uniqueness |
| Null Email Handling | ❌ | Error testing null email handling |
| Cleanup | ❌ | Failed to clean up test data |
| Stop Server | ⚠️ | Server was not started by this script, skipping stop |

## Errors

### Start Server

- **Message:** Failed to start server
- **Error:** node:internal/modules/cjs/loader:1247
  throw err;
  ^

Error: Cannot find module 'C:\Users\SL177Y\Pictures\cluster-main-main\Backend\test\server.js'
    at Function._resolveFilename (node:internal/modules/cjs/loader:1244:15)
    at Function._load (node:internal/modules/cjs/loader:1070:27)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:217:24)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:170:5)
    at node:internal/main/run_main_module:36:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}

Node.js v22.13.0

- **Timestamp:** 3/20/2025, 8:29:01 PM

### Create Test Users

- **Message:** Failed to create test users
- **Error:** Cannot find module './models/User'
Require stack:
- C:\Users\SL177Y\Pictures\cluster-main-main\Backend\test\comprehensive-backend-test.js
- **Timestamp:** 3/20/2025, 8:29:01 PM

### Wallet Connect

- **Message:** No test users available for wallet connect test
- **Timestamp:** 3/20/2025, 8:29:01 PM

### Verify Wallet Status

- **Message:** Failed to verify wallet status
- **Error:** Cannot find module './models/User'
Require stack:
- C:\Users\SL177Y\Pictures\cluster-main-main\Backend\test\comprehensive-backend-test.js
- **Timestamp:** 3/20/2025, 8:29:01 PM

### Check Score Records

- **Message:** Failed to check score records
- **Error:** Cannot find module './models/Score'
Require stack:
- C:\Users\SL177Y\Pictures\cluster-main-main\Backend\test\comprehensive-backend-test.js
- **Timestamp:** 3/20/2025, 8:29:01 PM

### Email Uniqueness

- **Message:** Failed to test email uniqueness
- **Error:** Cannot find module './models/User'
Require stack:
- C:\Users\SL177Y\Pictures\cluster-main-main\Backend\test\comprehensive-backend-test.js
- **Timestamp:** 3/20/2025, 8:29:01 PM

### Null Email Handling

- **Message:** Error testing null email handling
- **Error:** Cannot find module './models/User'
Require stack:
- C:\Users\SL177Y\Pictures\cluster-main-main\Backend\test\comprehensive-backend-test.js
- **Timestamp:** 3/20/2025, 8:29:01 PM

### Cleanup

- **Message:** Failed to clean up test data
- **Error:** Cannot find module './models/User'
Require stack:
- C:\Users\SL177Y\Pictures\cluster-main-main\Backend\test\comprehensive-backend-test.js
- **Timestamp:** 3/20/2025, 8:29:01 PM


## Recommendations

- Verify the email uniqueness constraint in the User model.
- Ensure partial filter expression is properly configured for the email field.
- Check the wallet connect route implementation.
- Verify error handling for duplicate key errors.
- Verify the server.js file location and ensure all dependencies are installed.
