// Simple MongoDB connection test
const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://rishiballabgarh23:123@mvp.z2uo0.mongodb.net/?retryWrites=true&w=majority&appName=MVP";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    console.log(`Found ${collections.length} collections`);
    collections.forEach(coll => console.log(`- ${coll.name}`));
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  }); 