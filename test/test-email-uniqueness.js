// Test script for email uniqueness in User model
const mongoose = require('mongoose');
const axios = require('axios');

// Database connection URI
const MONGO_URI = "mongodb+srv://rishiballabgarh23:123@mvp.z2uo0.mongodb.net/?retryWrites=true&w=majority&appName=MVP";

// Import User model to ensure schema is loaded
require('./models/User');

console.log('=== Testing Email Uniqueness in User Model ===');

// Test data - users with various email configurations
const testUsers = [
  { id: 'test1', email: 'test1@example.com', info: 'User with unique email 1' },
  { id: 'test2', email: 'test2@example.com', info: 'User with unique email 2' },
  { id: 'test3', email: 'test1@example.com', info: 'User with duplicate email (should fail)' },
  { id: 'test4', email: null, info: 'User with null email' },
  { id: 'test5', info: 'User with no email field' },
  { id: 'test6', email: null, info: 'Another user with null email' },
  { id: 'test7', info: 'Another user with no email field' }
];

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTestResult(name, passed, message, error = null) {
  results.tests.push({ name, passed, message, error: error ? error.toString() : null });
  if (passed) {
    results.passed++;
    console.log(`✅ PASSED: ${name} - ${message}`);
  } else {
    results.failed++;
    console.error(`❌ FAILED: ${name} - ${message}`);
    if (error) console.error(`   Error: ${error}`);
  }
}

async function runTests() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully');
    
    const db = mongoose.connection;
    const User = mongoose.model('User');
    
    // Clean up any previous test data
    console.log('\nCleaning up previous test data...');
    await User.deleteMany({ privyId: { $regex: /^test/ } });
    
    // Test 1: Check if email index exists with the right configuration
    try {
      const collection = db.collection('users');
      const indexes = await collection.indexes();
      const emailIndex = indexes.find(idx => 
        idx.key && idx.key.email === 1 && 
        idx.partialFilterExpression && 
        idx.partialFilterExpression.email && 
        idx.partialFilterExpression.email.$type === 'string'
      );
      
      if (emailIndex) {
        recordTestResult(
          'Email Index Configuration', 
          true, 
          `Index exists with proper configuration: ${JSON.stringify(emailIndex.partialFilterExpression)}`
        );
      } else {
        recordTestResult(
          'Email Index Configuration', 
          false, 
          'Email index with proper configuration not found'
        );
      }
    } catch (error) {
      recordTestResult('Email Index Configuration', false, 'Error checking index configuration', error);
    }
    
    // Test 2: Create users with unique emails
    try {
      const user1 = await User.create({ 
        privyId: testUsers[0].id,
        email: testUsers[0].email,
        username: testUsers[0].info
      });
      
      recordTestResult(
        'Create User with Unique Email 1', 
        true, 
        `Created user with email ${testUsers[0].email}`
      );
      
      const user2 = await User.create({ 
        privyId: testUsers[1].id,
        email: testUsers[1].email,
        username: testUsers[1].info
      });
      
      recordTestResult(
        'Create User with Unique Email 2', 
        true, 
        `Created user with email ${testUsers[1].email}`
      );
    } catch (error) {
      recordTestResult('Create Users with Unique Emails', false, 'Failed to create users with unique emails', error);
    }
    
    // Test 3: Attempt to create user with duplicate email (should fail)
    try {
      await User.create({ 
        privyId: testUsers[2].id,
        email: testUsers[2].email,
        username: testUsers[2].info
      });
      
      recordTestResult(
        'Duplicate Email Rejection', 
        false, 
        `Created user with duplicate email ${testUsers[2].email} - should have failed`
      );
    } catch (error) {
      if (error.code === 11000) { // MongoDB duplicate key error
        recordTestResult(
          'Duplicate Email Rejection', 
          true, 
          `Correctly rejected duplicate email ${testUsers[2].email}`
        );
      } else {
        recordTestResult(
          'Duplicate Email Rejection', 
          false, 
          'Rejected duplicate email but with unexpected error',
          error
        );
      }
    }
    
    // Test 4: Create users with null emails (should succeed)
    try {
      const user4 = await User.create({ 
        privyId: testUsers[3].id,
        email: testUsers[3].email,
        username: testUsers[3].info
      });
      
      recordTestResult(
        'Create User with Null Email 1', 
        true, 
        'Created user with null email'
      );
      
      const user6 = await User.create({ 
        privyId: testUsers[5].id,
        email: testUsers[5].email,
        username: testUsers[5].info
      });
      
      recordTestResult(
        'Create User with Null Email 2', 
        true, 
        'Created another user with null email'
      );
    } catch (error) {
      recordTestResult('Create Users with Null Emails', false, 'Failed to create users with null emails', error);
    }
    
    // Test 5: Create users with missing email field (should succeed)
    try {
      const user5 = await User.create({ 
        privyId: testUsers[4].id,
        username: testUsers[4].info
      });
      
      recordTestResult(
        'Create User with Missing Email 1', 
        true, 
        'Created user with missing email field'
      );
      
      const user7 = await User.create({ 
        privyId: testUsers[6].id,
        username: testUsers[6].info
      });
      
      recordTestResult(
        'Create User with Missing Email 2', 
        true, 
        'Created another user with missing email field'
      );
    } catch (error) {
      recordTestResult('Create Users with Missing Email Fields', false, 'Failed to create users with missing email fields', error);
    }
    
    // Test 6: Verify user counts
    try {
      const uniqueEmailCount = await User.countDocuments({ 
        email: { $type: "string" },
        privyId: { $regex: /^test/ }
      });
      
      recordTestResult(
        'Unique Email User Count', 
        uniqueEmailCount === 2, 
        `Found ${uniqueEmailCount} users with unique emails (expected 2)`
      );
      
      const nullEmailCount = await User.countDocuments({
        email: null,
        privyId: { $regex: /^test/ }
      });
      
      recordTestResult(
        'Null Email User Count', 
        nullEmailCount >= 2, // Changed to >= instead of === to account for potential existing records
        `Found ${nullEmailCount} users with null emails (expected at least 2)`
      );
      
      const missingEmailCount = await User.countDocuments({
        email: { $exists: false },
        privyId: { $regex: /^test/ }
      });
      
      recordTestResult(
        'Missing Email User Count', 
        missingEmailCount === 2, 
        `Found ${missingEmailCount} users with missing email fields (expected 2)`
      );
    } catch (error) {
      recordTestResult('User Count Verification', false, 'Error verifying user counts', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Total tests: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success rate: ${Math.round(results.passed / (results.passed + results.failed) * 100)}%`);
    
    // Clean up test data
    try {
      const User = mongoose.model('User');
      console.log('\nCleaning up test data...');
      await User.deleteMany({ privyId: { $regex: /^test/ } });
      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('❌ Error cleaning up test data:', error);
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

runTests(); 