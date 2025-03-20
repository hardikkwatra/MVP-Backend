# Backend Test Report

**Test ID:** backend-test-1742471626995  
**Date:** 3/20/2025, 5:23:46 PM  
**Duration:** 2.10 seconds  

## Summary

- **Total Tests:** 13
- **Successful:** 7
- **Errors:** 4
- **Warnings:** 1
- **Success Rate:** 53.85%

## Database Schema

- **Collections:** users, scores, wallets
- **Email Index:** Issues detected

## Test Results

| Test | Status | Details |
|------|--------|--------|
| MongoDB Connection | ✅ | Connected to MongoDB |
| User Email Index | ⚠️ | Proper email index with partial filter expression not found |
| Score Collection | ✅ | Score collection exists with indexes |
| Database Schema | ✅ | Found 3 collections |
| Start Server | ❌ | Failed to start server |
| Create Test Users | ✅ | Created 3 test users |
| Wallet Connect API | ❌ | Server not running or API endpoint not available |
| Verify Wallet Status | ❌ | Verified wallet connection for 0 users |
| Check Score Records | ✅ | Verified score records for 3 users |
| Email Uniqueness | ✅ | Duplicate email correctly rejected |
| Null Email Handling | ❌ | Error testing null email handling |
| Cleanup | ✅ | Deleted 3 users and 3 score records |
| Stop Server | ⚠️ | Server was not started by this script, skipping stop |

## Errors

### Start Server

- **Message:** Failed to start server
- **Error:** Command failed: Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -PassThru
'Start-Process' is not recognized as an internal or external command,
operable program or batch file.

- **Timestamp:** 3/20/2025, 5:23:48 PM

### Wallet Connect API

- **Message:** Server not running or API endpoint not available
- **Timestamp:** 3/20/2025, 5:23:48 PM

### Verify Wallet Status

- **Message:** Verified wallet connection for 0 users
- **Timestamp:** 3/20/2025, 5:23:48 PM

### Null Email Handling

- **Message:** Error testing null email handling
- **Error:** E11000 duplicate key error collection: test.users index: email_1 dup key: { email: null }
- **Timestamp:** 3/20/2025, 5:23:49 PM


## Recommendations

- Verify the server.js file location and ensure all dependencies are installed.
