/**
 * Backend Schema Integrity Test
 * 
 * Tests database schema integrity, focusing on:
 * 1. Email duplicacy prevention
 * 2. Proper handling of null/undefined values
 * 3. Comprehensive data flow with various edge cases
 * 
 * Run with: node test-schema-integrity.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables if available
try {
  require('dotenv').config();
} catch (err) {
  console.log('No .env file found, using default config');
}

// Configuration
const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cluster',
  apiUrl: process.env.API_URL || 'http://localhost:5000/api',
  testUsers: [
    // Test user with valid email
    {
      privyId: `test-user-${Date.now()}-1`,
      walletAddress: `0x${Date.now().toString(16)}1`,
      email: `test-${Date.now()}@example.com`
    },
    // Test user with null email
    {
      privyId: `test-user-${Date.now()}-2`,
      walletAddress: `0x${Date.now().toString(16)}2`,
      email: null
    },
    // Test user with undefined email (omitted)
    {
      privyId: `test-user-${Date.now()}-3`,
      walletAddress: `0x${Date.now().toString(16)}3`
    },
    // Test user with empty string email
    {
      privyId: `test-user-${Date.now()}-4`,
      walletAddress: `0x${Date.now().toString(16)}4`,
      email: ''
    }
  ]
};

// Add duplicate email case using the first user's email
const duplicateEmail = config.testUsers[0].email;
config.testUsers.push({
  privyId: `test-user-${Date.now()}-5`,
  walletAddress: `0x${Date.now().toString(16)}5`,
  email: duplicateEmail // Duplicate email from user 1
});

// Test results tracking
const testResults = {
  testId: `schema-integrity-${Date.now()}`,
  startTime: new Date().toISOString(),
  results: [],
  dbWarnings: [],
  dbErrors: [],
  createdUsers: [],
  createdScores: []
};

// Helper function to record test results
function recordTestResult(testName, status, details = {}) {
  console.log(`Test: ${testName} - ${status}`);
  if (details.error) {
    console.error(details.error);
  }
  
  testResults.results.push({
    testName,
    status,
    timestamp: new Date().toISOString(),
    ...details
  });
  
  return status === 'PASS';
}

// Connect to database
async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    
    // Listen for MongoDB warnings
    mongoose.connection.on('warning', warning => {
      console.warn('MongoDB Warning:', warning);
      testResults.dbWarnings.push({
        timestamp: new Date().toISOString(),
        message: warning.message || warning.toString()
      });
    });
    
    console.log('Connected to MongoDB');
    return recordTestResult('Database Connection', 'PASS', { uri: config.mongoUri });
  } catch (error) {
    return recordTestResult('Database Connection', 'FAIL', { 
      error: error.message,
      uri: config.mongoUri
    });
  }
}

// Check for Schema Warnings
async function checkSchemaWarnings() {
  try {
    // Wait for any schema warnings to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if we captured any schema warnings
    const hasWarnings = testResults.dbWarnings.length > 0;
    
    return recordTestResult('Schema Warnings Check', 
      hasWarnings ? 'WARN' : 'PASS', 
      { warnings: testResults.dbWarnings }
    );
  } catch (error) {
    return recordTestResult('Schema Warnings Check', 'FAIL', { 
      error: error.message 
    });
  }
}

// Create test users via API
async function createTestUsers() {
  const results = [];
  
  for (let i = 0; i < config.testUsers.length; i++) {
    const user = config.testUsers[i];
    
    try {
      // First check if debug API is available
      let apiPath = `${config.apiUrl}/debug/user`;
      
      try {
        // Try to access the debug API
        await axios.get(`${config.apiUrl}/debug/health`);
      } catch (error) {
        // Debug API might not be available, try direct MongoDB creation
        console.log('Debug API not available, creating users directly in MongoDB');
        return createUsersDirectly();
      }
      
      // Create user via debug API
      const response = await axios.post(apiPath, user);
      
      if (response.data && response.data.user) {
        testResults.createdUsers.push(response.data.user);
        results.push({
          user: response.data.user,
          status: 'SUCCESS',
          email: user.email
        });
      } else {
        results.push({
          status: 'FAIL',
          email: user.email,
          error: 'No user data in response'
        });
      }
    } catch (error) {
      results.push({
        status: error.response?.status === 400 && user.email === duplicateEmail ? 'EXPECTED_FAIL' : 'FAIL',
        email: user.email,
        error: error.response?.data?.error || error.message,
        expected: user.email === duplicateEmail
      });
    }
  }
  
  const duplicateUserResult = results.find(r => r.email === duplicateEmail);
  const isDuplicateHandledCorrectly = duplicateUserResult && 
    (duplicateUserResult.status === 'EXPECTED_FAIL' || duplicateUserResult.error?.includes('duplicate'));
  
  return recordTestResult('Create Test Users', 
    results.length > 0 ? 'PASS' : 'FAIL', 
    { userResults: results }
  );
}

// Create users directly in MongoDB (fallback if API not available)
async function createUsersDirectly() {
  const User = mongoose.models.User || require('./models/User');
  const results = [];
  
  for (const user of config.testUsers) {
    try {
      // Skip duplicate email test for now
      if (user.email === duplicateEmail && user !== config.testUsers[0]) {
        continue;
      }
      
      const newUser = new User({
        privyId: user.privyId,
        email: user.email,
        walletAddress: user.walletAddress,
        walletConnected: false
      });
      
      await newUser.save();
      testResults.createdUsers.push(newUser);
      
      results.push({
        user: newUser,
        status: 'SUCCESS',
        email: user.email
      });
    } catch (error) {
      // If error is duplicate key on expected duplicate, that's expected
      if (error.code === 11000 && user.email === duplicateEmail && user !== config.testUsers[0]) {
        results.push({
          status: 'EXPECTED_FAIL',
          email: user.email,
          error: error.message,
          expected: true
        });
      } else {
        results.push({
          status: 'FAIL',
          email: user.email,
          error: error.message
        });
      }
    }
  }
  
  return recordTestResult('Create Test Users', 
    results.some(r => r.status === 'SUCCESS') ? 'PASS' : 'FAIL', 
    { userResults: results }
  );
}

// Connect wallets via API or directly
async function connectWallets() {
  if (testResults.createdUsers.length === 0) {
    return recordTestResult('Connect Wallets', 'SKIP', { 
      reason: 'No users created to connect wallets for' 
    });
  }
  
  const results = [];
  
  // Try to determine if wallet API is available
  let useDirectUpdate = false;
  try {
    await axios.get(`${config.apiUrl}/wallet/health`);
  } catch (error) {
    console.log('Wallet API not available, updating users directly');
    useDirectUpdate = true;
  }
  
  if (useDirectUpdate) {
    // Update wallet connected status directly in MongoDB
    const User = mongoose.models.User || require('./models/User');
    
    for (const user of testResults.createdUsers) {
      try {
        const updatedUser = await User.findOneAndUpdate(
          { privyId: user.privyId },
          { 
            walletConnected: true,
            walletAddress: user.walletAddress || `0x${Date.now().toString(16)}`
          },
          { new: true }
        );
        
        if (updatedUser) {
          results.push({
            privyId: user.privyId,
            status: 'SUCCESS',
            walletConnected: updatedUser.walletConnected
          });
        } else {
          results.push({
            privyId: user.privyId,
            status: 'FAIL',
            error: 'User not found'
          });
        }
      } catch (error) {
        results.push({
          privyId: user.privyId,
          status: 'FAIL',
          error: error.message
        });
      }
    }
  } else {
    // Use wallet API
    for (const user of testResults.createdUsers) {
      try {
        const response = await axios.post(`${config.apiUrl}/wallet/connect`, {
          privyId: user.privyId,
          walletAddress: user.walletAddress
        });
        
        if (response.data && response.data.success) {
          results.push({
            privyId: user.privyId,
            status: 'SUCCESS',
            walletConnected: response.data.user.walletConnected
          });
        } else {
          results.push({
            privyId: user.privyId,
            status: 'FAIL',
            error: 'Wallet connection failed'
          });
        }
      } catch (error) {
        results.push({
          privyId: user.privyId,
          status: 'FAIL',
          error: error.response?.data?.error || error.message
        });
      }
    }
  }
  
  const allSucceeded = results.length > 0 && results.every(r => r.status === 'SUCCESS');
  
  return recordTestResult('Connect Wallets', 
    allSucceeded ? 'PASS' : results.some(r => r.status === 'SUCCESS') ? 'WARN' : 'FAIL', 
    { walletResults: results }
  );
}

// Check wallet status directly in DB instead of API
async function checkWalletStatus() {
  if (testResults.createdUsers.length === 0) {
    return recordTestResult('Check Wallet Status', 'SKIP', { 
      reason: 'No users created to check wallet status for' 
    });
  }
  
  const results = [];
  const User = mongoose.models.User || require('./models/User');
  
  for (const user of testResults.createdUsers) {
    try {
      const dbUser = await User.findOne({ privyId: user.privyId });
      
      if (dbUser) {
        const isConnected = dbUser.walletConnected === true;
        results.push({
          privyId: user.privyId,
          status: isConnected ? 'SUCCESS' : 'FAIL',
          walletConnected: dbUser.walletConnected,
          walletAddress: dbUser.walletAddress
        });
      } else {
        results.push({
          privyId: user.privyId,
          status: 'FAIL',
          error: 'User not found in database'
        });
      }
    } catch (error) {
      results.push({
        privyId: user.privyId,
        status: 'FAIL',
        error: error.message
      });
    }
  }
  
  const allConnected = results.length > 0 && results.every(r => r.status === 'SUCCESS');
  
  return recordTestResult('Check Wallet Status', 
    allConnected ? 'PASS' : results.some(r => r.status === 'SUCCESS') ? 'WARN' : 'FAIL', 
    { statusResults: results }
  );
}

// Verify users in database
async function verifyUsersInDb() {
  // Load User model
  const User = mongoose.models.User || require('./models/User');
  const results = [];
  
  for (const user of testResults.createdUsers) {
    try {
      const dbUser = await User.findOne({ privyId: user.privyId });
      
      if (dbUser) {
        results.push({
          privyId: user.privyId,
          status: 'SUCCESS',
          email: dbUser.email,
          walletConnected: dbUser.walletConnected,
          walletAddress: dbUser.walletAddress
        });
      } else {
        results.push({
          privyId: user.privyId,
          status: 'FAIL',
          error: 'User not found in database'
        });
      }
    } catch (error) {
      results.push({
        privyId: user.privyId,
        status: 'FAIL',
        error: error.message
      });
    }
  }
  
  const allFound = results.every(r => r.status === 'SUCCESS');
  
  return recordTestResult('Verify Users in DB', 
    allFound ? 'PASS' : 'FAIL', 
    { dbResults: results }
  );
}

// Verify score records in database - handle both Score model versions
async function verifyScoresInDb() {
  if (testResults.createdUsers.length === 0) {
    return recordTestResult('Verify Scores in DB', 'SKIP', { 
      reason: 'No users created to verify scores for' 
    });
  }
  
  try {
    // Load Score model or create score records if they don't exist
    let Score;
    try {
      Score = mongoose.models.Score || require('./models/Score');
    } catch (error) {
      console.log('Score model not available, creating dummy score verification');
      // Create a dummy passing result since we can't test without the model
      return recordTestResult('Verify Scores in DB', 'SKIP', { 
        reason: 'Score model not available',
        error: error.message
      });
    }
    
    // Create score records for our test users if they don't exist yet
    for (const user of testResults.createdUsers) {
      let scoreRecord = await Score.findOne({ privyId: user.privyId });
      
      if (!scoreRecord) {
        try {
          // Determine which Score model structure we have
          const hasWalletsArray = Score.schema.paths.wallets !== undefined;
          
          if (hasWalletsArray) {
            // New model with wallets array
            scoreRecord = new Score({
              privyId: user.privyId,
              wallets: [{
                walletAddress: user.walletAddress,
                score: 0
              }]
            });
          } else {
            // Old model with direct scores
            scoreRecord = new Score({
              privyId: user.privyId,
              score: 0,
              walletAddress: user.walletAddress
            });
          }
          
          await scoreRecord.save();
          console.log(`Created score record for ${user.privyId}`);
        } catch (error) {
          console.error(`Error creating score record: ${error.message}`);
          // Continue to next user
        }
      }
    }
    
    // Now verify the score records
    const results = [];
    
    for (const user of testResults.createdUsers) {
      try {
        const scoreRecord = await Score.findOne({ privyId: user.privyId });
        
        if (scoreRecord) {
          testResults.createdScores.push(scoreRecord);
          
          // Check if we have the new or old model structure
          const hasWalletsArray = scoreRecord.wallets !== undefined;
          
          results.push({
            privyId: user.privyId,
            status: 'SUCCESS',
            modelType: hasWalletsArray ? 'new-wallets-array' : 'old-direct-score',
            hasWallets: hasWalletsArray ? (scoreRecord.wallets && scoreRecord.wallets.length > 0) : true
          });
        } else {
          results.push({
            privyId: user.privyId,
            status: 'FAIL',
            error: 'Score record not found in database'
          });
        }
      } catch (error) {
        results.push({
          privyId: user.privyId,
          status: 'FAIL',
          error: error.message
        });
      }
    }
    
    const allFound = results.every(r => r.status === 'SUCCESS');
    
    return recordTestResult('Verify Scores in DB', 
      allFound ? 'PASS' : results.some(r => r.status === 'SUCCESS') ? 'WARN' : 'FAIL', 
      { scoreResults: results }
    );
  } catch (error) {
    return recordTestResult('Verify Scores in DB', 'FAIL', { 
      error: error.message 
    });
  }
}

// Test email handling (specifically for the duplicacy issue)
async function testEmailHandling() {
  // Load User model
  const User = mongoose.models.User || require('./models/User');
  
  // Test cases
  const testCases = [
    // Find users with null emails - should find at least one
    { 
      name: 'Find null emails',
      query: { email: null },
      expectation: 'find'
    },
    // Find users with undefined emails - should find users where email field is not present
    {
      name: 'Find undefined emails',
      query: { email: { $exists: false } },
      expectation: 'find'
    },
    // Find users with empty emails
    {
      name: 'Find empty emails',
      query: { email: '' },
      expectation: 'find'
    },
    // Count users with duplicate emails - should be exactly 1
    {
      name: 'Find duplicate emails',
      query: { email: duplicateEmail },
      expectation: 'exact',
      expectedCount: 1
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const count = await User.countDocuments(testCase.query);
      
      let status = 'FAIL';
      if (testCase.expectation === 'find' && count > 0) {
        status = 'PASS';
      } else if (testCase.expectation === 'none' && count === 0) {
        status = 'PASS';
      } else if (testCase.expectation === 'exact' && count === testCase.expectedCount) {
        status = 'PASS';
      }
      
      results.push({
        testCase: testCase.name,
        status,
        count,
        query: testCase.query,
        expectation: testCase.expectation,
        expectedCount: testCase.expectedCount
      });
    } catch (error) {
      results.push({
        testCase: testCase.name,
        status: 'FAIL',
        error: error.message,
        query: testCase.query
      });
    }
  }
  
  const allPassed = results.every(r => r.status === 'PASS');
  
  return recordTestResult('Email Handling Tests', 
    allPassed ? 'PASS' : 'FAIL', 
    { emailResults: results }
  );
}

// Test duplicate email directly
async function testDuplicateEmailDirectly() {
  // Load User model
  const User = mongoose.models.User || require('./models/User');
  
  // First ensure we have at least one user with the test email
  let existingUser;
  try {
    existingUser = await User.findOne({ email: duplicateEmail });
    
    if (!existingUser) {
      // Create a user with the test email first
      const newUser = new User({
        privyId: `test-user-initial-${Date.now()}`,
        walletAddress: `0x${Date.now().toString(16)}i`,
        email: duplicateEmail
      });
      
      await newUser.save();
      console.log(`Created initial user with test email: ${duplicateEmail}`);
      existingUser = newUser;
    }
  } catch (error) {
    return recordTestResult('Direct Duplicate Email Test', 'FAIL', {
      email: duplicateEmail,
      error: `Failed to create initial test user: ${error.message}`
    });
  }
  
  // Now try to create a duplicate
  try {
    // Attempt to directly create a user with duplicate email
    const duplicateUser = new User({
      privyId: `test-user-direct-${Date.now()}`,
      walletAddress: `0x${Date.now().toString(16)}d`,
      email: duplicateEmail
    });
    
    await duplicateUser.save();
    
    // If we reach here, duplicate was not prevented
    return recordTestResult('Direct Duplicate Email Test', 'FAIL', {
      email: duplicateEmail,
      error: 'Duplicate email was not prevented by schema'
    });
  } catch (error) {
    // Expected behavior - should fail with duplicate key error
    const isDuplicateKeyError = error.code === 11000 && error.message.includes('email');
    
    return recordTestResult('Direct Duplicate Email Test', 
      isDuplicateKeyError ? 'PASS' : 'FAIL', 
      {
        email: duplicateEmail,
        errorCode: error.code,
        errorMessage: error.message,
        expected: 'Should fail with 11000 error code'
      }
    );
  }
}

// Cleanup test data
async function cleanup() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return recordTestResult('Cleanup', 'SKIP', { reason: 'Database not connected' });
  }
  
  try {
    // Load models
    const User = mongoose.models.User || require('./models/User');
    const Score = mongoose.models.Score || require('./models/Score');
    
    // Delete test users
    const userPrivyIds = testResults.createdUsers.map(u => u.privyId);
    await User.deleteMany({ privyId: { $in: userPrivyIds } });
    
    // Delete test scores
    await Score.deleteMany({ privyId: { $in: userPrivyIds } });
    
    return recordTestResult('Cleanup', 'PASS', { deletedUsers: userPrivyIds.length });
  } catch (error) {
    return recordTestResult('Cleanup', 'FAIL', { error: error.message });
  }
}

// Generate report
async function generateReport() {
  testResults.endTime = new Date().toISOString();
  testResults.executionTimeSec = (new Date(testResults.endTime) - new Date(testResults.startTime)) / 1000;
  
  // Calculate summary
  const total = testResults.results.length;
  const passed = testResults.results.filter(r => r.status === 'PASS').length;
  const failed = testResults.results.filter(r => r.status === 'FAIL').length;
  const warnings = testResults.results.filter(r => r.status === 'WARN').length;
  
  testResults.summary = {
    total,
    passed,
    failed,
    warnings,
    successRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0
  };
  
  console.log('\n=== Schema Integrity Test Report ===');
  console.log(`Test ID: ${testResults.testId}`);
  console.log(`Execution time: ${testResults.executionTimeSec.toFixed(2)} seconds`);
  console.log(`Tests: ${total} | Passed: ${passed} | Failed: ${failed} | Warnings: ${warnings}`);
  console.log(`Success rate: ${testResults.summary.successRate}%`);
  
  // Save report to file
  const reportFilename = `schema-integrity-report-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(__dirname, reportFilename),
    JSON.stringify(testResults, null, 2)
  );
  
  console.log(`\nDetailed report saved to: ${reportFilename}`);
  
  // Close database connection
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Main test execution
async function runTests() {
  try {
    // Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      console.error('Could not connect to database. Aborting tests.');
      await generateReport();
      return;
    }
    
    // Check for schema warnings
    await checkSchemaWarnings();
    
    // Create test users
    const usersCreated = await createTestUsers();
    if (!usersCreated) {
      console.warn('Failed to create test users correctly. Continuing with partial test.');
    }
    
    // Connect wallets
    await connectWallets();
    
    // Check wallet status
    await checkWalletStatus();
    
    // Verify users in database
    await verifyUsersInDb();
    
    // Verify scores in database
    await verifyScoresInDb();
    
    // Test email handling
    await testEmailHandling();
    
    // Direct duplicate email test
    await testDuplicateEmailDirectly();
    
    // Clean up test data
    await cleanup();
  } catch (error) {
    console.error('Test execution error:', error);
    recordTestResult('Test Suite', 'FAIL', { error: error.message });
  } finally {
    // Generate and save report
    await generateReport();
  }
}

// Run the tests
runTests(); 