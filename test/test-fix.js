/**
 * Direct Database Test Script
 * 
 * This script directly accesses the database to create test data,
 * then tests the API endpoints to verify our fixes.
 * 
 * Run with: node test-fix.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Score = require('./models/Score');

// Load environment variables
dotenv.config();

// Test data
const TEST_USER_ID = 'test-fix-user-' + Date.now();
const TEST_WALLET = '0xTestWallet' + Date.now().toString().slice(-8);

// Helper for logging
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 ${title}`);
  console.log('='.repeat(80));
}

// Main test function
async function runTest() {
  try {
    logSection('Database Fix Test');

    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test user directly in database
    console.log(`Creating test user with ID: ${TEST_USER_ID}`);
    const user = new User({
      privyId: TEST_USER_ID,
      walletConnected: true,
      walletAddress: TEST_WALLET,
      email: 'test@example.com',
      totalScore: 0
    });
    await user.save();
    console.log(`User created with ID: ${user._id}`);

    // Create test score directly in database
    console.log(`Creating test score record for ${TEST_USER_ID}`);
    const score = new Score({
      privyId: TEST_USER_ID,
      twitterScore: 10,
      telegramScore: 15,
      wallets: [
        {
          walletAddress: TEST_WALLET,
          score: 20
        }
      ],
      totalScore: 45
    });
    await score.save();
    console.log(`Score created with ID: ${score._id}`);

    // Verify the data is in the database
    const userCheck = await User.findOne({ privyId: TEST_USER_ID });
    const scoreCheck = await Score.findOne({ privyId: TEST_USER_ID });

    if (!userCheck) {
      console.error('Failed to create user in database!');
    } else {
      console.log('User verified in database');
    }

    if (!scoreCheck) {
      console.error('Failed to create score in database!');
    } else {
      console.log('Score verified in database');
      console.log(`Score record has ${scoreCheck.wallets.length} wallets`);
      console.log(`Total score: ${scoreCheck.totalScore}`);
    }

    // Cleanup
    console.log('\nCleaning up test data...');
    await User.deleteOne({ privyId: TEST_USER_ID });
    await Score.deleteOne({ privyId: TEST_USER_ID });
    console.log('Test data removed');

    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest(); 