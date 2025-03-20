const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const MONGODB_URI = 'mongodb://localhost:27017/cluster';
const API_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:5173';

// Test data
const testUser = {
  did: 'test-did-alignment',
  email: 'test-alignment@example.com'
};

// Test results
const results = {
  tests: [],
  startTime: new Date().toISOString(),
  endTime: null,
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Helper function to add test result
function addTestResult(name, status, details = '') {
  const result = {
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  };
  
  results.tests.push(result);
  results.summary.total++;
  
  if (status === 'passed') {
    results.summary.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.summary.failed++;
    console.log(`❌ ${name}: ${details}`);
  }
  
  return status === 'passed';
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    return addTestResult('Database Connection', 'passed');
  } catch (error) {
    return addTestResult('Database Connection', 'failed', error.message);
  }
}

// Check API Health
async function checkApiHealth() {
  try {
    const response = await axios.get(`${API_URL}/debug/health`);
    if (response.status === 200) {
      return addTestResult('API Health Check', 'passed');
    } else {
      return addTestResult('API Health Check', 'failed', `Status code: ${response.status}`);
    }
  } catch (error) {
    return addTestResult('API Health Check', 'failed', error.message);
  }
}

// Create test user
async function createTestUser() {
  try {
    const response = await axios.post(`${API_URL}/debug/users`, testUser);
    if (response.data && response.data.success) {
      return addTestResult('User Creation', 'passed');
    } else {
      return addTestResult('User Creation', 'failed', 'User creation failed');
    }
  } catch (error) {
    return addTestResult('User Creation', 'failed', error.message);
  }
}

// Add scores for test user
async function addScores() {
  try {
    const scores = [100, 200, 300];
    let success = true;
    
    for (const score of scores) {
      const response = await axios.post(`${API_URL}/score/calculate`, {
        did: testUser.did,
        score
      });
      
      if (!response.data || !response.data.success) {
        success = false;
        break;
      }
    }
    
    if (success) {
      return addTestResult('Score Calculation', 'passed');
    } else {
      return addTestResult('Score Calculation', 'failed', 'Failed to add scores');
    }
  } catch (error) {
    return addTestResult('Score Calculation', 'failed', error.message);
  }
}

// Check leaderboard data
async function checkLeaderboard() {
  try {
    const response = await axios.get(`${API_URL}/leaderboard`);
    if (response.data && Array.isArray(response.data)) {
      const foundUser = response.data.find(item => item.did === testUser.did);
      if (foundUser) {
        return addTestResult('Leaderboard Data', 'passed');
      } else {
        return addTestResult('Leaderboard Data', 'failed', 'Test user not found in leaderboard');
      }
    } else {
      return addTestResult('Leaderboard Data', 'failed', 'Invalid leaderboard data');
    }
  } catch (error) {
    return addTestResult('Leaderboard Data', 'failed', error.message);
  }
}

// Check frontend API calls
async function checkFrontendApiCalls() {
  try {
    // This is a simulated test since we can't directly check frontend API calls
    // In a real environment, you might use Selenium or Puppeteer to verify this
    
    // Instead, we'll verify our API endpoints match what the frontend expects
    const requiredEndpoints = [
      { method: 'GET', url: '/api/debug/users' },
      { method: 'POST', url: '/api/debug/users' },
      { method: 'GET', url: '/api/debug/scores' },
      { method: 'POST', url: '/api/score/calculate' },
      { method: 'GET', url: '/api/wallet/connect' },
      { method: 'GET', url: '/api/leaderboard' }
    ];
    
    let success = true;
    const failedEndpoints = [];
    
    for (const endpoint of requiredEndpoints) {
      try {
        if (endpoint.method === 'GET') {
          await axios.get(`${API_URL}${endpoint.url.replace('/api', '')}`);
        } else {
          await axios.post(`${API_URL}${endpoint.url.replace('/api', '')}`, {});
        }
      } catch (error) {
        if (error.response && error.response.status !== 404) {
          // Some error other than 404 (Not Found) is acceptable
          continue;
        }
        success = false;
        failedEndpoints.push(endpoint.url);
      }
    }
    
    if (success) {
      return addTestResult('Frontend API Compatibility', 'passed');
    } else {
      return addTestResult('Frontend API Compatibility', 'failed', `Missing endpoints: ${failedEndpoints.join(', ')}`);
    }
  } catch (error) {
    return addTestResult('Frontend API Compatibility', 'failed', error.message);
  }
}

// Check data integrity
async function checkDataIntegrity() {
  try {
    // Verify user exists in database
    const User = mongoose.model('User');
    const user = await User.findOne({ did: testUser.did });
    
    if (!user) {
      return addTestResult('Data Integrity', 'failed', 'User not found in database');
    }
    
    // Verify scores exist
    const Score = mongoose.model('Score');
    const scores = await Score.find({ did: testUser.did });
    
    if (!scores || scores.length === 0) {
      return addTestResult('Data Integrity', 'failed', 'Scores not found in database');
    }
    
    return addTestResult('Data Integrity', 'passed');
  } catch (error) {
    return addTestResult('Data Integrity', 'failed', error.message);
  }
}

// Clean up test data
async function cleanup() {
  try {
    // Remove test user
    const User = mongoose.model('User');
    await User.deleteOne({ did: testUser.did });
    
    // Remove test scores
    const Score = mongoose.model('Score');
    await Score.deleteMany({ did: testUser.did });
    
    return addTestResult('Cleanup', 'passed');
  } catch (error) {
    return addTestResult('Cleanup', 'failed', error.message);
  }
}

// Generate and save report
function generateReport() {
  results.endTime = new Date().toISOString();
  results.summary.successRate = (results.summary.passed / results.summary.total * 100).toFixed(2) + '%';
  
  const reportFilename = `alignment-test-report-${Date.now()}.json`;
  fs.writeFileSync(path.join(__dirname, reportFilename), JSON.stringify(results, null, 2));
  
  console.log('\n====== TEST RESULTS ======');
  console.log(`Total tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success rate: ${results.summary.successRate}`);
  console.log(`Report saved to: ${reportFilename}`);
}

// Main test function
async function runTests() {
  console.log('Starting Frontend-Backend Alignment Tests...');
  
  try {
    // Step 1: Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    // Step 2: Check API health
    const apiHealthy = await checkApiHealth();
    if (!apiHealthy) {
      throw new Error('API health check failed');
    }
    
    // Step 3: Create test user
    await createTestUser();
    
    // Step 4: Add scores
    await addScores();
    
    // Step 5: Check leaderboard
    await checkLeaderboard();
    
    // Step 6: Check frontend API compatibility
    await checkFrontendApiCalls();
    
    // Step 7: Check data integrity
    await checkDataIntegrity();
    
    // Step 8: Clean up
    await cleanup();
  } catch (error) {
    console.error('Test suite error:', error.message);
  } finally {
    // Disconnect from database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    
    // Generate report
    generateReport();
  }
}

// Run tests
runTests(); 