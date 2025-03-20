const mongoose = require('mongoose');

// MongoDB connection URI
const uri = "mongodb+srv://rishiballabgarh23:123@mvp.z2uo0.mongodb.net/?retryWrites=true&w=majority&appName=MVP";

async function updateEmailIndex() {
  console.log('=== Email Index Update Utility ===');
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check existing indexes
    console.log('\nChecking existing indexes...');
    const existingIndexes = await usersCollection.indexes();
    console.log(`Found ${existingIndexes.length} indexes:`);
    
    // Look for any existing email indexes
    const emailIndexes = existingIndexes.filter(idx => idx.key && idx.key.email !== undefined);
    console.log(`Found ${emailIndexes.length} email-related indexes`);
    
    if (emailIndexes.length > 0) {
      console.log('\nDropping existing email indexes...');
      for (const idx of emailIndexes) {
        try {
          await usersCollection.dropIndex(idx.name);
          console.log(`✅ Successfully dropped index: ${idx.name}`);
        } catch (error) {
          console.error(`❌ Failed to drop index ${idx.name}:`, error.message);
        }
      }
    }
    
    // Create new email index with proper partial filter expression
    console.log('\nCreating new email index with partial filter expression...');
    try {
      await usersCollection.createIndex(
        { email: 1 },
        {
          unique: true,
          background: true,
          name: "email_unique_" + Date.now(),
          partialFilterExpression: { email: { $type: "string" } }
        }
      );
      console.log('✅ Successfully created new email index');
    } catch (error) {
      console.error('❌ Failed to create new index:', error.message);
    }
    
    // Check indexes after update
    console.log('\nVerifying indexes after update...');
    const updatedIndexes = await usersCollection.indexes();
    
    const newEmailIndex = updatedIndexes.find(idx => 
      idx.key && idx.key.email === 1 && 
      idx.partialFilterExpression && 
      idx.partialFilterExpression.email && 
      idx.partialFilterExpression.email.$type === 'string'
    );
    
    if (newEmailIndex) {
      console.log('✅ Email index successfully configured with:');
      console.log(`  - Name: ${newEmailIndex.name}`);
      console.log(`  - Unique: ${!!newEmailIndex.unique}`);
      console.log(`  - Partial Filter Expression: ${JSON.stringify(newEmailIndex.partialFilterExpression)}`);
    } else {
      console.error('❌ Failed to find new email index after update');
    }
    
    // Count users by email status
    const nullEmailCount = await usersCollection.countDocuments({ 
      $or: [
        { email: null },
        { email: { $exists: false } }
      ]
    });
    const stringEmailCount = await usersCollection.countDocuments({ 
      email: { $type: "string" }
    });
    const totalUserCount = await usersCollection.countDocuments();
    
    console.log('\nUser email statistics:');
    console.log(`- Total users: ${totalUserCount}`);
    console.log(`- Users with null/undefined email: ${nullEmailCount}`);
    console.log(`- Users with string email: ${stringEmailCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

updateEmailIndex(); 