# Backend Data Flow Report

**Test ID:** test-data-flow-1742470177159
**Date:** 2025-03-20T11:29:37.159Z
**Duration:** 2.62 seconds

## Summary
- **Total Tests:** 12
- **Passed:** 12
- **Failed:** 0
- **Success Rate:** 100.00%

## Data Flow Test Results

| Test | Status | Details |
|------|--------|---------|
| Database Connection | ✅ PASS |  |
| API Health Check | ✅ PASS | Data retrieved |
| Direct User Creation | ✅ PASS | Data retrieved |
| Wallet Connect API | ✅ PASS | Data retrieved |
| Wallet Status API | ✅ PASS | Data retrieved |
| Database User Verification | ✅ PASS | Data retrieved |
| Database Score Verification | ✅ PASS | Data retrieved |
| Score Calculation | ✅ PASS | Data retrieved |
| Get Total Score | ✅ PASS | Data retrieved |
| Score Consistency | ✅ PASS | Data retrieved |
| Data Flow Consistency | ✅ PASS | Data retrieved |
| Test Data Cleanup | ✅ PASS | Data retrieved |

## Data Consistency

- **User Record Consistency:** ✅ Consistent
- **Score Record Consistency:** ✅ Consistent
- **API-to-DB Consistency:** ✅ Consistent

## Database Operations

- **Read Operations:** 3
- **Write Operations:** 1
- **Update Operations:** 2
- **Delete Operations:** 1

## API Endpoints Performance

| Endpoint | Status | Response Time (ms) |
|----------|--------|-------------------|
| /api/health | ✅ PASS | 229 |
| /api/wallet/connect | ✅ PASS | 66 |
| /api/wallet/status/:privyId | ✅ PASS | 32 |
| /api/score/get-score | ✅ PASS | 35 |
| /api/score/total-score/:privyId | ✅ PASS | 1 |

## Issues Found

No issues found. All tests passed successfully.

## Recommendations

- All tests passed successfully. No specific recommendations at this time.