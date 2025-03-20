const mongoose = require('mongoose');

// Connection URI
const uri = "mongodb+srv://rishiballabgarh23:123@mvp.z2uo0.mongodb.net/?retryWrites=true&w=majority&appName=MVP";

async function checkIndexes() {
  console.log('=== Detailed MongoDB Indexes Check ===');
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
    
    // Get the User model collection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:`);
    
    for (const collection of collections) {
      console.log(`- ${collection.name}`);
    }
    
    // Check indexes on the users collection
    console.log('\n=== Indexes on users collection ===');
    const userIndexes = await db.collection('users').indexes();
    
    userIndexes.forEach(index => {
      console.log(`\nIndex: ${JSON.stringify(index.key)}`);
      console.log(`Name: ${index.name}`);
      console.log(`Unique: ${index.unique || false}`);
      console.log(`Sparse: ${index.sparse || false}`);
      
      if (index.partialFilterExpression) {
        console.log(`Partial Filter Expression: ${JSON.stringify(index.partialFilterExpression)}`);
      } else {
        console.log('Partial Filter Expression: None');
      }
      
      console.log(`Background: ${index.background || false}`);
    });
    
    // Check if any users with null/undefined emails exist
    const nullEmailUsers = await db.collection('users').countDocuments({ 
      $or: [
        { email: null },
        { email: { $exists: false } }
      ]
    });
    
    console.log(`\nUsers with null/undefined emails: ${nullEmailUsers}`);
    
    // Get sample of users to check email field
    const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
    console.log('\nSample users (first 3):');
    sampleUsers.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email || 'null/undefined'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

checkIndexes(); 