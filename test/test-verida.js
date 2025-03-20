#!/usr/bin/env node

/**
 * Test script for the Verida integration
 * This script tests the essential functions of the Verida service and API
 */

const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');
const mongoose = require('mongoose');
const User = require('./models/User');
const veridaService = require('./Services/veridaService');
const scoreService = require('./Services/scoreService');

// Load environment variables
dotenv.config();

// Configure readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Set up colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

// Test configuration
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  mongoUri: process.env.MONGODB_URI || 'mongodb+srv://atinmishra11:6L5O2QssIfCD7vwE@cluster0.aj1mx.mongodb.net',
  testUserId: 'test-verida-user-' + Date.now(),
  testPrivyId: 'test-privy-' + Date.now(),
  mockAuthToken: 'mock-auth-token-' + Date.now()
};

// Mock data
const mockGroups = [
  { id: 1, name: 'Test Group 1', lastMessageDate: new Date() },
  { id: 2, name: 'Test Group 2', lastMessageDate: new Date() }
];

const mockMessages = [
  { id: 1, content: 'Test message 1', isPinned: true, date: new Date() },
  { id: 2, content: 'Test message 2', isPinned: false, date: new Date(Date.now() - 3600000) }
];

// Helper functions
async function connectToDatabase() {
  try {
    console.log(`${colors.cyan}Connecting to MongoDB at ${config.mongoUri}...${colors.reset}`);
    await mongoose.connect(config.mongoUri);
    console.log(`${colors.green}Connected to MongoDB${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Failed to connect to MongoDB:${colors.reset}`, error.message);
    return false;
  }
}

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createTestUser() {
  try {
    console.log(`${colors.cyan}Creating test user...${colors.reset}`);
    
    // Check if test user already exists
    let user = await User.findOne({ privyId: config.testPrivyId });
    
    if (user) {
      console.log(`${colors.yellow}Test user already exists. Updating...${colors.reset}`);
      user.veridaConnected = false;
      user.veridaUserId = null;
      user.scoreDetails = { twitterScore: 10, walletScore: 20 };
    } else {
      console.log(`${colors.green}Creating new test user...${colors.reset}`);
      user = new User({
        privyId: config.testPrivyId,
        twitterConnected: true,
        twitterUsername: 'test_twitter_user',
        walletConnected: true,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        scoreDetails: {
          twitterScore: 10,
          walletScore: 20
        }
      });
    }
    
    await user.save();
    console.log(`${colors.green}Test user created/updated:${colors.reset}`, user);
    return user;
  } catch (error) {
    console.error(`${colors.red}Failed to create test user:${colors.reset}`, error.message);
    return null;
  }
}

// Test functions
async function testVeridaService() {
  console.log(`\n${colors.bright}${colors.cyan}=== Testing Verida Service ===${colors.reset}\n`);
  
  try {
    // Store mock auth token
    console.log(`${colors.cyan}Storing mock auth token...${colors.reset}`);
    veridaService.storeAuthToken(config.testUserId, config.mockAuthToken);
    console.log(`${colors.green}Auth token stored${colors.reset}`);
    
    // Mock the axios.post calls to return our mock data
    const originalPost = axios.post;
    axios.post = async (url, data, config) => {
      if (url.includes('/ds/query/')) {
        if (data.query.sourceApplication === 'https://telegram.com') {
          // If requesting groups
          if (url.includes('group')) {
            return { data: { items: mockGroups } };
          }
          // If requesting messages
          if (url.includes('message')) {
            return { data: { items: mockMessages } };
          }
        }
      }
      return originalPost(url, data, config);
    };
    
    // Test getTelegramGroups
    console.log(`${colors.cyan}Testing getTelegramGroups...${colors.reset}`);
    const groups = await veridaService.getTelegramGroups(config.testUserId);
    console.log(`${colors.green}Retrieved ${groups.length} groups${colors.reset}`);
    
    // Test getTelegramMessages
    console.log(`${colors.cyan}Testing getTelegramMessages...${colors.reset}`);
    const messages = await veridaService.getTelegramMessages(config.testUserId);
    console.log(`${colors.green}Retrieved ${messages.length} messages${colors.reset}`);
    
    // Test calculateVeridaScore
    console.log(`${colors.cyan}Testing calculateVeridaScore...${colors.reset}`);
    const scoreResult = await veridaService.calculateVeridaScore(config.testUserId);
    console.log(`${colors.green}Score calculated:${colors.reset}`, scoreResult.score);
    console.log(`${colors.green}Score details:${colors.reset}`, JSON.stringify(scoreResult.details, null, 2));
    
    // Restore original axios.post
    axios.post = originalPost;
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Verida service test failed:${colors.reset}`, error.message);
    return false;
  }
}

async function testScoreService() {
  console.log(`\n${colors.bright}${colors.cyan}=== Testing Score Service ===${colors.reset}\n`);
  
  try {
    // Create test user if not already created
    const user = await createTestUser();
    if (!user) {
      return false;
    }
    
    // Test updateVeridaStatus
    console.log(`${colors.cyan}Testing updateVeridaStatus...${colors.reset}`);
    const updateResult = await scoreService.updateVeridaStatus({
      privyId: config.testPrivyId,
      veridaConnected: true,
      veridaUserId: config.testUserId
    });
    
    if (updateResult.success) {
      console.log(`${colors.green}Verida status updated successfully${colors.reset}`);
    } else {
      console.error(`${colors.red}Failed to update Verida status:${colors.reset}`, updateResult.error);
      return false;
    }
    
    // Mock veridaService.calculateVeridaScore
    const originalCalculateVeridaScore = veridaService.calculateVeridaScore;
    veridaService.calculateVeridaScore = async () => {
      return {
        success: true,
        score: 15,
        details: {
          groupCount: 2,
          messageCount: 2,
          pinnedMessageCount: 1,
          activeGroups: 2,
          messageFrequency: 0.85,
          rawScore: 15,
          cappedScore: 15
        }
      };
    };
    
    // Test calculateVeridaScore
    console.log(`${colors.cyan}Testing calculateVeridaScore...${colors.reset}`);
    const veridaScoreResult = await scoreService.calculateVeridaScore(config.testPrivyId);
    
    if (veridaScoreResult.success) {
      console.log(`${colors.green}Verida score calculated successfully:${colors.reset}`, veridaScoreResult.score);
    } else {
      console.error(`${colors.red}Failed to calculate Verida score:${colors.reset}`, veridaScoreResult.error);
      veridaService.calculateVeridaScore = originalCalculateVeridaScore;
      return false;
    }
    
    // Test calculateScore
    console.log(`${colors.cyan}Testing calculateScore...${colors.reset}`);
    const scoreResult = await scoreService.calculateScore(config.testPrivyId);
    
    if (scoreResult.success) {
      console.log(`${colors.green}Total score calculated successfully:${colors.reset}`, scoreResult.score);
      console.log(`${colors.green}Score details:${colors.reset}`, JSON.stringify(scoreResult.details, null, 2));
    } else {
      console.error(`${colors.red}Failed to calculate total score:${colors.reset}`, scoreResult.error);
      veridaService.calculateVeridaScore = originalCalculateVeridaScore;
      return false;
    }
    
    // Restore original function
    veridaService.calculateVeridaScore = originalCalculateVeridaScore;
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Score service test failed:${colors.reset}`, error.message);
    return false;
  }
}

async function testAPIEndpoints() {
  console.log(`\n${colors.bright}${colors.cyan}=== Testing API Endpoints ===${colors.reset}\n`);
  
  try {
    // Test auth URL endpoint
    console.log(`${colors.cyan}Testing /api/verida/auth/url endpoint...${colors.reset}`);
    
    // Log the full URL being tested to help debug
    const authUrlFullPath = `${config.apiBaseUrl}/api/verida/auth/url`;
    console.log(`Requesting: ${authUrlFullPath}`);
    
    try {
      // Set a longer timeout for the request
      const authUrlResponse = await axios.get(authUrlFullPath, { timeout: 10000 });
      
      if (authUrlResponse.data.success) {
        console.log(`${colors.green}Auth URL generated:${colors.reset}`, authUrlResponse.data.authUrl);
      } else {
        console.error(`${colors.red}Failed to generate auth URL:${colors.reset}`, authUrlResponse.data.error || 'Unknown error');
        console.log(`${colors.yellow}Continuing with remaining tests...${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.red}Error (GET /api/verida/auth/url):${colors.reset}`, error.message);
      console.log(`${colors.yellow}This is often because the endpoint is not implemented yet or the server is not running.${colors.reset}`);
      console.log(`${colors.yellow}Continuing with remaining tests...${colors.reset}`);
    }
    
    // Create a test user for API tests
    const user = await createTestUser();
    if (!user) {
      return false;
    }
    
    // Test update-status endpoint
    console.log(`${colors.cyan}Testing /api/verida/update-status endpoint...${colors.reset}`);
    const updateStatusResponse = await axios.post(`${config.apiBaseUrl}/api/verida/update-status`, {
      privyId: config.testPrivyId,
      veridaUserId: config.testUserId
    });
    
    if (updateStatusResponse.data.success) {
      console.log(`${colors.green}Verida status updated via API${colors.reset}`);
    } else {
      console.error(`${colors.red}Failed to update Verida status via API:${colors.reset}`, updateStatusResponse.data.error);
      return false;
    }
    
    // Test calculate-score endpoint
    console.log(`${colors.cyan}Testing /api/verida/calculate-score endpoint...${colors.reset}`);
    const calculateScoreResponse = await axios.post(`${config.apiBaseUrl}/api/verida/calculate-score`, {
      privyId: config.testPrivyId
    });
    
    if (calculateScoreResponse.data.success) {
      console.log(`${colors.green}Score calculated via API:${colors.reset}`, calculateScoreResponse.data.score);
    } else {
      console.error(`${colors.red}Failed to calculate score via API:${colors.reset}`, calculateScoreResponse.data.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}API endpoint test failed:${colors.reset}`, error.message);
    console.error('Error details:', error.response?.data || error.message);
    return false;
  }
}

// Test server health and connection
async function checkServerHealth() {
  try {
    console.log(`${colors.cyan}Checking server health at ${config.apiBaseUrl}/api/health...${colors.reset}`);
    
    try {
      const response = await axios.get(`${config.apiBaseUrl}/api/health`, { timeout: 5000 });
      console.log(`${colors.green}Server health check successful:${colors.reset}`, response.data);
      return true;
    } catch (error) {
      console.error(`${colors.red}Warning: Server health check failed. Make sure the server is running at ${config.apiBaseUrl}${colors.reset}`);
      console.error(`Error details: ${error.message}`);
      
      // Check if MongoDB is accessible directly even if the server is down
      const dbConnection = await connectToDatabase();
      
      if (dbConnection) {
        console.log(`${colors.yellow}Note: MongoDB is accessible, but the API server is not responding.${colors.reset}`);
        console.log(`${colors.yellow}Please make sure the server is running with:${colors.reset}`);
        console.log(`${colors.bright}${colors.yellow}  cd Backend && npm run dev${colors.reset}`);
      }
      
      // Ask if we should continue despite server not being available
      const answer = await prompt(`${colors.yellow}Do you want to continue with the tests anyway? (y/n)${colors.reset} `);
      return answer.toLowerCase() === 'y';
    }
  } catch (error) {
    console.error(`${colors.red}Error checking server health:${colors.reset}`, error.message);
    return false;
  }
}

// Main function to run the tests
async function runTests() {
  try {
    console.log(`${colors.bright}${colors.blue}===============================`);
    console.log(` VERIDA INTEGRATION TEST`);
    console.log(`===============================${colors.reset}\n`);
    
    // Check server health first
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
      const forceContinue = await prompt(`${colors.yellow}Server check failed. Force continue anyway? (y/n)${colors.reset} `);
      if (forceContinue.toLowerCase() !== 'y') {
        console.log(`${colors.red}Tests aborted due to server health check failure.${colors.reset}`);
        rl.close();
        return;
      }
    }

    // Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      console.error(`${colors.red}Cannot proceed with tests due to database connection error${colors.reset}`);
      process.exit(1);
    }
    
    // Check if server is running
    try {
      await axios.get(`${config.apiBaseUrl}/api/health`);
    } catch (error) {
      console.log(`${colors.yellow}Warning: Server health check failed. Make sure the server is running at ${config.apiBaseUrl}${colors.reset}`);
      const continueAnyway = await prompt(`${colors.yellow}Do you want to continue anyway? (y/n) ${colors.reset}`);
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log(`${colors.red}Exiting tests${colors.reset}`);
        rl.close();
        await mongoose.connection.close();
        process.exit(0);
      }
    }
    
    console.log(`${colors.bright}${colors.blue}Running tests with configuration:${colors.reset}`);
    console.log(`API Base URL: ${config.apiBaseUrl}`);
    console.log(`MongoDB URI: ${config.mongoUri}`);
    console.log(`Test User ID: ${config.testUserId}`);
    console.log(`Test Privy ID: ${config.testPrivyId}\n`);
    
    // Run tests
    const veridaServiceTestResult = await testVeridaService();
    const scoreServiceTestResult = await testScoreService();
    const apiEndpointTestResult = await testAPIEndpoints();
    
    // Print test summary
    console.log(`\n${colors.bright}${colors.blue}===============================`);
    console.log(`   TEST SUMMARY`);
    console.log(`===============================${colors.reset}\n`);

    // Extract database domain from MongoDB URI for secure logging
    const mongoUriString = config.mongoUri || '';
    const dbDomainMatch = mongoUriString.match(/@([^/]+)/);
    const dbDomain = dbDomainMatch ? dbDomainMatch[1] : 'unknown';

    console.log(`🔍 ${colors.cyan}Configuration:${colors.reset}`);
    console.log(`   • API URL: ${config.apiBaseUrl}`);
    console.log(`   • Database: ${dbDomain}`);
    console.log(`   • Test User: ${config.testPrivyId}`);
    console.log();

    console.log(`📊 ${colors.cyan}Test Results:${colors.reset}`);
    console.log(`   • Verida Service: ${veridaServiceTestResult ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`   • Score Service: ${scoreServiceTestResult ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`   • API Endpoints: ${apiEndpointTestResult ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);

    const overallResult = veridaServiceTestResult && scoreServiceTestResult && apiEndpointTestResult;
    console.log(`\n📋 ${colors.bright}${colors.cyan}Overall Result: ${overallResult ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);

    if (!overallResult) {
      console.log(`\n${colors.yellow}💡 Troubleshooting:${colors.reset}`);
      
      if (!veridaServiceTestResult) {
        console.log(`   • Check Verida service implementation and auth token handling`);
      }
      
      if (!scoreServiceTestResult) {
        console.log(`   • Check score calculation logic and User model schema`);
      }
      
      if (!apiEndpointTestResult) {
        console.log(`   • Ensure server is running on ${config.apiBaseUrl}`);
        console.log(`   • Verify route handlers are correctly implemented`);
      }
    }
    
    // Clean up
    const cleanDb = await prompt(`\n${colors.yellow}Do you want to clean up the test user? (y/n) ${colors.reset}`);
    if (cleanDb.toLowerCase() === 'y') {
      try {
        await User.deleteOne({ privyId: config.testPrivyId });
        console.log(`${colors.green}Test user removed${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Error removing test user:${colors.reset}`, error.message);
      }
    }
    
    // Close connections
    rl.close();
    await mongoose.connection.close();
    console.log(`${colors.green}Database connection closed${colors.reset}`);
    
    // Exit with appropriate code
    process.exit(overallResult ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}Error running tests:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 