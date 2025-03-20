/**
 * Backend to Database Data Flow Test
 * 
 * Tests the complete lifecycle of data from API to database and back.
 * Run with: node test-data-flow.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
const dotenv = require('dotenv');
const User = require('./models/User');
const Score = require('./models/Score');

// Configuration
dotenv.config();
const BASE_URL = 'http://localhost:5000/api';
const TEST_ID = `test-data-flow-${Date.now()}`;
const TEST_WALLET = `0xTest${Date.now()}`;
const ADDITIONAL_WALLETS = [
  `0xTest${Date.now()}-wallet2`,
  `0xTest${Date.now()}-wallet3`
];

// Test report
const report = {
  testId: TEST_ID,
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Test tracking
function recordTest(name, status, data = null, error = null) {
  const test = {
    name,
    status,
    timestamp: new Date().toISOString(),
    data: data ? (typeof data === 'object' ? JSON.stringify(data) : data) : null,
    error: error ? error.toString() : null
  };
  report.tests.push(test);
  report.summary.total++;
  if (status === 'PASS') {
    report.summary.passed++;
    console.log(`✅ PASSED: ${name}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  } else {
    report.summary.failed++;
    console.log(`❌ FAILED: ${name}`);
    if (error) console.error(error);
  }
  console.log('---------------------------------------------------');
}

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    recordTest('Database Connection', 'PASS');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    recordTest('Database Connection', 'FAIL', null, error);
    return false;
  }
}

// Check API health
async function checkAPIHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    recordTest('API Health Check', 'PASS', response.data);
    return true;
  } catch (error) {
    recordTest('API Health Check', 'FAIL', null, error);
    return false;
  }
}

// Create user directly in database
async function createUserDirectly() {
  try {
    // Check if user already exists
    let user = await User.findOne({ privyId: TEST_ID });
    
    if (user) {
      await User.deleteOne({ privyId: TEST_ID });
      console.log('Deleted existing user record');
    }
    
    // Create new user
    user = new User({
      privyId: TEST_ID,
      walletConnected: false,
      totalScore: 0
    });
    
    await user.save();
    recordTest('Direct User Creation', 'PASS', user);
    return user;
  } catch (error) {
    recordTest('Direct User Creation', 'FAIL', null, error);
    return null;
  }
}

// Connect wallet via API
async function connectWalletAPI() {
  try {
    const response = await axios.post(`${BASE_URL}/wallet/connect`, {
      privyId: TEST_ID,
      walletAddress: TEST_WALLET,
      walletAddresses: [TEST_WALLET, ...ADDITIONAL_WALLETS]
    });
    
    recordTest('Wallet Connect API', 'PASS', response.data);
    return response.data;
  } catch (error) {
    recordTest('Wallet Connect API', 'FAIL', null, error);
    return null;
  }
}

// Check wallet status via API
async function checkWalletStatusAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/wallet/status/${TEST_ID}`);
    recordTest('Wallet Status API', 'PASS', response.data);
    return response.data;
  } catch (error) {
    recordTest('Wallet Status API', 'FAIL', null, error);
    return null;
  }
}

// Verify user in database after API operations
async function verifyUserInDB() {
  try {
    const user = await User.findOne({ privyId: TEST_ID });
    
    if (!user) {
      throw new Error('User not found in database');
    }
    
    if (!user.walletConnected || user.walletAddress !== TEST_WALLET) {
      throw new Error(`User wallet mismatch: connected=${user.walletConnected}, address=${user.walletAddress}`);
    }
    
    recordTest('Database User Verification', 'PASS', user);
    return user;
  } catch (error) {
    recordTest('Database User Verification', 'FAIL', null, error);
    return null;
  }
}

// Verify score in database
async function verifyScoreInDB() {
  try {
    const score = await Score.findOne({ privyId: TEST_ID });
    
    if (!score) {
      throw new Error('Score not found in database');
    }
    
    // Verify wallets
    const walletAddresses = [TEST_WALLET, ...ADDITIONAL_WALLETS];
    const dbWalletAddresses = score.wallets.map(w => w.walletAddress);
    
    const missingWallets = walletAddresses.filter(addr => !dbWalletAddresses.includes(addr));
    if (missingWallets.length > 0) {
      throw new Error(`Missing wallets in database: ${missingWallets.join(', ')}`);
    }
    
    recordTest('Database Score Verification', 'PASS', score);
    return score;
  } catch (error) {
    recordTest('Database Score Verification', 'FAIL', null, error);
    return null;
  }
}

// Generate and request score calculation
async function calculateScore() {
  try {
    const response = await axios.post(`${BASE_URL}/score/get-score`, {
      privyId: TEST_ID,
      walletAddress: TEST_WALLET,
      walletAddresses: [TEST_WALLET, ...ADDITIONAL_WALLETS]
    });
    
    recordTest('Score Calculation', 'PASS', response.data);
    return response.data;
  } catch (error) {
    recordTest('Score Calculation', 'FAIL', null, error);
    return null;
  }
}

// Get total score
async function getTotalScore() {
  try {
    const response = await axios.get(`${BASE_URL}/score/total-score/${TEST_ID}`);
    recordTest('Get Total Score', 'PASS', response.data);
    return response.data;
  } catch (error) {
    recordTest('Get Total Score', 'FAIL', null, error);
    return null;
  }
}

// Validate score consistency between API and database
async function validateScoreConsistency(apiScore, dbScore) {
  try {
    if (!apiScore || !dbScore) {
      throw new Error('Missing API score or DB score for comparison');
    }
    
    // Convert totalScore to number for proper comparison
    const apiTotalScore = typeof apiScore.totalScore === 'number' ? 
      apiScore.totalScore : 
      (apiScore.scores && typeof apiScore.scores.totalScore === 'number' ? 
        apiScore.scores.totalScore : 0);
        
    const dbTotalScore = typeof dbScore.totalScore === 'number' ? dbScore.totalScore : 0;
    
    // Compare total scores
    if (apiTotalScore !== dbTotalScore) {
      throw new Error(`Total score mismatch: API=${apiTotalScore}, DB=${dbTotalScore}`);
    }
    
    recordTest('Score Consistency', 'PASS', { 
      apiScore: apiTotalScore, 
      dbScore: dbTotalScore 
    });
    return true;
  } catch (error) {
    recordTest('Score Consistency', 'FAIL', null, error);
    return false;
  }
}

// Check data flow consistency
async function checkDataFlowConsistency() {
  try {
    // Get data from different sources
    const user = await User.findOne({ privyId: TEST_ID });
    const score = await Score.findOne({ privyId: TEST_ID });
    const apiStatus = await axios.get(`${BASE_URL}/wallet/status/${TEST_ID}`);
    const apiScore = await axios.get(`${BASE_URL}/score/total-score/${TEST_ID}`);
    
    // Compare wallet connection status
    if (user.walletConnected !== apiStatus.data.walletConnected) {
      throw new Error(`Wallet connection status mismatch: DB=${user.walletConnected}, API=${apiStatus.data.walletConnected}`);
    }
    
    // Compare wallet address
    if (user.walletAddress !== apiStatus.data.walletAddress) {
      throw new Error(`Wallet address mismatch: DB=${user.walletAddress}, API=${apiStatus.data.walletAddress}`);
    }
    
    // Compare wallet counts
    const dbWalletCount = score.wallets.length;
    const apiWalletCount = apiStatus.data.wallets.length;
    
    if (dbWalletCount !== apiWalletCount) {
      throw new Error(`Wallet count mismatch: DB=${dbWalletCount}, API=${apiWalletCount}`);
    }
    
    recordTest('Data Flow Consistency', 'PASS', {
      walletStatus: apiStatus.data.walletConnected,
      walletAddress: apiStatus.data.walletAddress,
      walletCount: apiWalletCount,
      totalScore: apiScore.data.totalScore
    });
    return true;
  } catch (error) {
    recordTest('Data Flow Consistency', 'FAIL', null, error);
    return false;
  }
}

// Clean up test data
async function cleanupTestData() {
  try {
    const userResult = await User.deleteOne({ privyId: TEST_ID });
    const scoreResult = await Score.deleteOne({ privyId: TEST_ID });
    
    recordTest('Test Data Cleanup', 'PASS', {
      deletedUsers: userResult.deletedCount,
      deletedScores: scoreResult.deletedCount
    });
  } catch (error) {
    recordTest('Test Data Cleanup', 'FAIL', null, error);
  }
}

// Generate test report
function generateReport() {
  const totalTime = new Date() - new Date(report.timestamp);
  
  report.summary.executionTimeMs = totalTime;
  report.summary.executionTimeSec = (totalTime / 1000).toFixed(2);
  
  console.log('\n========== TEST REPORT ==========');
  console.log(`Test ID: ${report.testId}`);
  console.log(`Started: ${report.timestamp}`);
  console.log(`Execution Time: ${report.summary.executionTimeSec}s`);
  console.log(`Tests: ${report.summary.total}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(2)}%`);
  
  // Save raw report to JSON file
  const fs = require('fs');
  const reportPath = `./data-flow-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nJSON Report saved to: ${reportPath}`);
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport();
  const mdReportPath = `./data-flow-report-${Date.now()}.md`;
  fs.writeFileSync(mdReportPath, markdownReport);
  console.log(`\nMarkdown Report saved to: ${mdReportPath}`);
  
  return report;
}

// Generate markdown report from the test results
function generateMarkdownReport() {
  const successRate = ((report.summary.passed / report.summary.total) * 100).toFixed(2);
  
  // Generate test results table rows
  const testResults = report.tests.map(test => {
    let details = '';
    if (test.data) {
      try {
        const data = JSON.parse(test.data);
        if (typeof data === 'object' && data !== null) {
          details = Object.keys(data).length > 0 ? 'Data retrieved' : 'Empty data';
        } else {
          details = data.toString().substring(0, 30);
        }
      } catch (e) {
        details = test.data.substring(0, 30);
      }
    }
    if (test.error) {
      details = test.error.substring(0, 30);
    }
    return `| ${test.name} | ${test.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${details} |`;
  }).join('\n');
  
  // Calculate database operation counts
  const dbOps = {
    read: report.tests.filter(t => t.name.includes('Verification') || t.name.includes('Get')).length,
    write: report.tests.filter(t => t.name.includes('Creation')).length,
    update: report.tests.filter(t => t.name.includes('Connect')).length,
    delete: report.tests.filter(t => t.name.includes('Cleanup')).length
  };
  
  // Calculate API endpoint performance
  const endpointTests = report.tests.filter(t => 
    t.name.includes('API') || 
    t.name.includes('Score Calculation') || 
    t.name.includes('Get Total Score'));
  
  const endpointPerformance = endpointTests.map(test => {
    const startTime = new Date(test.timestamp);
    const nextTestIndex = report.tests.indexOf(test) + 1;
    const endTime = nextTestIndex < report.tests.length ? 
      new Date(report.tests[nextTestIndex].timestamp) : 
      startTime; // Fallback if it's the last test
    
    const responseTime = endTime - startTime;
    
    let endpoint = 'Unknown';
    if (test.name.includes('Health')) endpoint = '/api/health';
    if (test.name.includes('Wallet Connect')) endpoint = '/api/wallet/connect';
    if (test.name.includes('Wallet Status')) endpoint = '/api/wallet/status/:privyId';
    if (test.name.includes('Score Calculation')) endpoint = '/api/score/get-score';
    if (test.name.includes('Get Total Score')) endpoint = '/api/score/total-score/:privyId';
    
    return `| ${endpoint} | ${test.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${responseTime} |`;
  }).join('\n');
  
  // Identify issues
  const issues = report.tests
    .filter(test => test.status === 'FAIL')
    .map(test => `- **${test.name}**: ${test.error || 'Failed without specific error'}`)
    .join('\n');
  
  // Generate recommendations based on issues
  let recommendations = '';
  if (report.summary.failed === 0) {
    recommendations = '- All tests passed successfully. No specific recommendations at this time.';
  } else {
    recommendations = '- Fix the identified issues in the "Issues Found" section.\n';
    
    if (report.tests.some(t => t.name.includes('Database') && t.status === 'FAIL')) {
      recommendations += '- Verify database connection and schema configuration.\n';
    }
    
    if (report.tests.some(t => t.name.includes('API') && t.status === 'FAIL')) {
      recommendations += '- Check API routes and endpoints functionality.\n';
    }
    
    if (report.tests.some(t => t.name.includes('Consistency') && t.status === 'FAIL')) {
      recommendations += '- Review data flow between API and database to ensure consistency.\n';
    }
  }
  
  // Get consistency status
  const userConsistency = report.tests.find(t => t.name === 'Database User Verification')?.status === 'PASS' ? 
    '✅ Consistent' : '❌ Inconsistent';
  
  const scoreConsistency = report.tests.find(t => t.name === 'Database Score Verification')?.status === 'PASS' ? 
    '✅ Consistent' : '❌ Inconsistent';
  
  const apiDbConsistency = report.tests.find(t => t.name === 'Data Flow Consistency')?.status === 'PASS' ? 
    '✅ Consistent' : '❌ Inconsistent';
  
  // Generate the markdown report
  return `# Backend Data Flow Report

**Test ID:** ${report.testId}
**Date:** ${report.timestamp}
**Duration:** ${report.summary.executionTimeSec} seconds

## Summary
- **Total Tests:** ${report.summary.total}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}
- **Success Rate:** ${successRate}%

## Data Flow Test Results

| Test | Status | Details |
|------|--------|---------|
${testResults}

## Data Consistency

- **User Record Consistency:** ${userConsistency}
- **Score Record Consistency:** ${scoreConsistency}
- **API-to-DB Consistency:** ${apiDbConsistency}

## Database Operations

- **Read Operations:** ${dbOps.read}
- **Write Operations:** ${dbOps.write}
- **Update Operations:** ${dbOps.update}
- **Delete Operations:** ${dbOps.delete}

## API Endpoints Performance

| Endpoint | Status | Response Time (ms) |
|----------|--------|-------------------|
${endpointPerformance}

## Issues Found

${issues || 'No issues found. All tests passed successfully.'}

## Recommendations

${recommendations}`;
}

// Main test function
async function runTests() {
  console.log(`\n========== BACKEND DATA FLOW TEST ==========`);
  console.log(`Test ID: ${TEST_ID}`);
  console.log(`Starting: ${new Date().toISOString()}`);
  console.log(`================================================\n`);
  
  // Connect to database
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('Cannot continue without database connection');
    generateReport();
    return;
  }
  
  // Check API health
  const apiHealthy = await checkAPIHealth();
  if (!apiHealthy) {
    console.error('Cannot continue without API connection');
    generateReport();
    mongoose.disconnect();
    return;
  }
  
  // Create test user directly in database
  const user = await createUserDirectly();
  
  // Connect wallet via API
  const walletResult = await connectWalletAPI();
  
  // Check wallet status via API
  const walletStatus = await checkWalletStatusAPI();
  
  // Verify user in database
  const dbUser = await verifyUserInDB();
  
  // Verify score in database
  const dbScore = await verifyScoreInDB();
  
  // Calculate score
  const calculatedScore = await calculateScore();
  
  // Get total score
  const totalScore = await getTotalScore();
  
  // Validate score consistency
  if (calculatedScore && dbScore) {
    await validateScoreConsistency(calculatedScore, dbScore);
  }
  
  // Check data flow consistency
  await checkDataFlowConsistency();
  
  // Clean up test data
  await cleanupTestData();
  
  // Generate report
  generateReport();
  
  // Disconnect from database
  mongoose.disconnect();
}

// Run tests
runTests().catch(error => {
  console.error('Unhandled error in test execution:', error);
  mongoose.disconnect();
}); 