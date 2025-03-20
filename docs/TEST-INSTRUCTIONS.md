# Backend Testing Instructions

This document provides detailed instructions for testing your backend using the scripts we've created.

## Prerequisites

1. Make sure Node.js is installed on your system
2. Make sure MongoDB connection is configured properly

## MongoDB Connection Testing

To test your MongoDB connection:

1. Open a PowerShell window or Command Prompt
2. Navigate to your Backend directory:
   ```
   cd C:\Users\SL177Y\Pictures\cluster-main-main\Backend
   ```
3. Run the simple connection test script:
   ```
   node test-mongodb.js
   ```
4. You should see a success message and a list of available collections

## Running the Comprehensive Backend Test

The comprehensive test script checks multiple aspects of your backend:

1. Database connection and schema integrity
2. Email uniqueness constraint
3. Null email handling
4. User creation and wallet connection
5. Score record management

To run the full test:

1. Open a PowerShell window or Command Prompt
2. Navigate to the Backend directory:
   ```
   cd C:\Users\SL177Y\Pictures\cluster-main-main\Backend
   ```
3. Run the comprehensive test script:
   ```
   node comprehensive-backend-test.js
   ```
4. The script will generate a detailed report in both JSON and Markdown formats

## Troubleshooting

If you encounter issues:

1. **MongoDB Connection Error**: Verify that your MongoDB URI is correct in the script configuration
   - Current URI: `mongodb+srv://rishiballabgarh23:123@mvp.z2uo0.mongodb.net/?retryWrites=true&w=majority&appName=MVP`
   - Make sure your MongoDB Atlas instance is running and accessible

2. **Module Not Found**: Ensure all required npm packages are installed
   ```
   npm install mongoose axios
   ```

3. **Server Start Issues**: The script attempts to start your backend server. If this fails, you can:
   - Start the server manually in a separate terminal: `node server.js`
   - Modify the script to use an already-running server

## Interpreting Test Results

The test generates two report files:
- `backend-test-report-[timestamp].json`: Raw test data
- `backend-test-report-[timestamp].md`: Human-readable markdown report

These reports include:
- Overall success rate
- Test results for each component
- Error details if any tests failed
- Recommendations for fixing issues

## Manual Database Verification

To manually verify your database after the test:

1. Connect to MongoDB Atlas through the web interface
2. Check the following in your database:
   - User collection email indexes
   - User documents with test data
   - Score collection documents
   - Wallet connection statuses

## Email Uniqueness Testing

The test verifies that your database properly:
- Rejects duplicate email addresses
- Allows multiple documents with null emails
- Handles undefined email fields correctly 