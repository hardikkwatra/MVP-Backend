// Simple MongoDB connection and schema test
const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://rishiballabgarh23:123@mvp.z2uo0.mongodb.net/?retryWrites=true&w=majority&appName=MVP";

console.log('=== Simple MongoDB Connection Test ===');
console.log(`Connecting to MongoDB at ${MONGO_URI}...`);

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected successfully');
    
    try {
      // List collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`\nFound ${collections.length} collections:`);
      collections.forEach(coll => console.log(`- ${coll.name}`));
      
      // Check User collection indexes
      if (collections.some(c => c.name === 'users')) {
        console.log('\nUser collection indexes:');
        const indexes = await mongoose.connection.db.collection('users').indexes();
        
        indexes.forEach(idx => {
          console.log(`- ${JSON.stringify(idx.key)} (${idx.name})`);
          if (idx.key && idx.key.email === 1) {
            console.log(`  Unique: ${!!idx.unique}`);
            console.log(`  Partial Filter: ${JSON.stringify(idx.partialFilterExpression || {})}`);
          }
        });
        
        // Check for proper email index
        const emailIndex = indexes.find(idx => idx.key && idx.key.email === 1);
        if (emailIndex && emailIndex.unique && 
            emailIndex.partialFilterExpression && 
            emailIndex.partialFilterExpression.email && 
            emailIndex.partialFilterExpression.email.$type === 'string') {
          console.log('\n✅ Email index has proper partial filter expression');
        } else {
          console.log('\n⚠️ Email index DOES NOT have proper partial filter expression');
        }
      }
      
      // Count documents
      if (collections.some(c => c.name === 'users')) {
        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log(`\nUser collection has ${userCount} documents`);
      }
      
      if (collections.some(c => c.name === 'scores')) {
        const scoreCount = await mongoose.connection.db.collection('scores').countDocuments();
        console.log(`Score collection has ${scoreCount} documents`);
      }
    } catch (err) {
      console.error('Error checking collections:', err);
    } finally {
      // Close connection
      await mongoose.connection.close();
      console.log('\nDatabase connection closed');
    }
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });

console.log('Test script is running...'); 