const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://rishiballabgarh23:123@mvp.z2uo0.mongodb.net/?retryWrites=true&w=majority&appName=MVP";

async function testConnection() {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully!');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Get user count
    if (collections.some(c => c.name === 'users')) {
      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      console.log(`\nUser collection has ${userCount} documents`);
    }
    
    // Check email index on users
    if (collections.some(c => c.name === 'users')) {
      const userIndexes = await mongoose.connection.db.collection('users').indexes();
      console.log('\nUser collection indexes:');
      userIndexes.forEach(index => {
        console.log(`- ${JSON.stringify(index.key)} (${index.name})`);
        if (index.key.email) {
          console.log(`  Unique: ${index.unique || false}`);
          console.log(`  Partial Filter: ${JSON.stringify(index.partialFilterExpression || {})}`);
        }
      });
    }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
  } finally {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\nDatabase connection closed');
    }
  }
}

testConnection(); 