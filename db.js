const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // Extract domain from connection string for secure logging
        const connectionString = process.env.MONGODB_URI;
        const domainMatch = connectionString ? connectionString.match(/@([^/]+)/) : null;
        const dbDomain = domainMatch ? domainMatch[1] : 'unknown';
        
        console.log(`Connecting to MongoDB at ${dbDomain}...`);
        
        await mongoose.connect(process.env.MONGODB_URI, {
            // Connection options here if needed
        });
        
        console.log("✅ MongoDB Successfully Connected");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        
        // Provide more helpful error information
        if (error.name === 'MongoParseError') {
            console.error("💡 Check your MONGODB_URI in the .env file. It should start with mongodb:// or mongodb+srv://");
        } else if (error.name === 'MongoServerSelectionError') {
            console.error("💡 Cannot reach MongoDB server. Check your network connection and make sure the MongoDB server is running.");
        }
        
        // Don't exit process to allow tests to continue
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
    }
};

module.exports = connectDB;
