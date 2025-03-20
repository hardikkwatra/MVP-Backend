const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const Moralis = require("moralis").default;
const scoreRoutes = require('./routes/scoreRoutes.js')
const blockchainRoutes = require("./routes/blockchainRoutes");
const twitterRoutes = require("./routes/twitterRoutes");
const apiRoutes = require('./routes/api.js')
const connectDB = require('./db.js')
const veridaService = require('./Services/veridaService.js');
const veridaRoutes = require('./routes/verida.js');
const walletRoutes = require('./routes/wallet');
const debugRoutes = require('./routes/debug');

// Import for algorithm testing
const { evaluateUser, CollectData } = require("./controllers/NewScoreController");

dotenv.config(); // Load .env variables

const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
console.log(`✅ CORS configured for origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

app.use(express.json());

// API Routes
app.use("/api/twitter", twitterRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/verida", veridaRoutes);
app.use("/api/debug", debugRoutes);

// Load blockchain routes
app.use("/api/blockchain", blockchainRoutes);

app.use('/api', apiRoutes);

app.get('/auth/callback', async (req, res) => {
  try {
    console.log('Auth callback received with data:', req.query);
    console.log('Auth callback full URL:', req.originalUrl);
    
    // Initialize variables
    let tokenData = null;
    let did = null;
    let authToken = null;
    
    // Check if we have a token parameter
    if (req.query.token) {
      try {
        // Try parsing the token as JSON
        tokenData = typeof req.query.token === 'string' 
          ? JSON.parse(req.query.token) 
          : req.query.token;
          
        console.log('Parsed token data:', tokenData);
        
        // Extract DID and auth token from the token structure
        if (tokenData.token) {
          did = tokenData.token.did;
          authToken = tokenData.token._id || tokenData.token;
          console.log('Extracted from token object - DID:', did, 'Auth Token:', authToken);
        } else if (tokenData.did && tokenData._id) {
          // Alternative format
          did = tokenData.did;
          authToken = tokenData._id;
          console.log('Extracted from alternative format - DID:', did, 'Auth Token:', authToken);
        }
      } catch (error) {
        console.error('Error parsing token data:', error.message);
        // The token might be the actual auth token
        authToken = req.query.token;
        console.log('Using token directly as auth token:', authToken);
      }
    }
    
    // If we don't have an auth token yet, look for auth_token parameter
    if (!authToken && req.query.auth_token) {
      authToken = req.query.auth_token;
      console.log('Using auth_token directly:', authToken);
      
      // Try to decode the token if needed
      if (authToken.includes('-')) {
        // This appears to be a UUID-style token, which is likely correct format
        console.log('Token appears to be in UUID format');
      } else {
        // Try to see if it's base64 encoded or needs other processing
        try {
          const decoded = Buffer.from(authToken, 'base64').toString();
          if (decoded !== authToken) {
            console.log('Decoded token from base64:', decoded.substring(0, 10) + '...');
            authToken = decoded;
          }
        } catch (e) {
          // Not base64, keep original
        }
      }
    }
    
    // If we still don't have an auth token, check request body
    if (!authToken) {
      authToken = req.body.auth_token || req.body.token;
      console.log('Using auth_token from request body:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
    }
    
    // If we still don't have an auth token, redirect to Verida's authentication
    if (!authToken) {
      // If no token, redirect to Verida's token generator with our frontend as the callback
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174/home/leaderboard';
      const returnUrl = `${frontendUrl}`;
      
      console.log('No token found, redirecting to Verida token generator with return URL:', returnUrl);
      
      const tokenGeneratorUrl = `https://app.verida.ai/auth?scopes=api%3Ads-query&scopes=api%3Asearch-universal&scopes=ds%3Asocial-email&scopes=api%3Asearch-ds&scopes=api%3Asearch-chat-threads&scopes=ds%3Ar%3Asocial-chat-group&scopes=ds%3Ar%3Asocial-chat-message&redirectUrl=${encodeURIComponent(returnUrl)}&appDID=did%3Avda%3Amainnet%3A0x87AE6A302aBf187298FC1Fa02A48cFD9EAd2818D`;
      
      return res.redirect(tokenGeneratorUrl);
    }
    
    // If we have an auth token but no DID, try to fetch it
    if (authToken && !did) {
      try {
        console.log('Attempting to fetch DID using auth token');
        did = await veridaService.getUserDID(authToken);
        console.log('Successfully retrieved DID:', did);
      } catch (didError) {
        console.error('Error fetching DID:', didError.message);
        // If we can't get the DID, still proceed with unknown DID
        // The frontend will handle this case
        did = process.env.DEFAULT_DID || 'unknown';
        console.log('Using default or unknown DID:', did);
      }
    }
    
    console.log('Final values - DID:', did, 'Auth Token:', authToken ? `${authToken.substring(0, 10)}...` : 'none');
    
    // Redirect to frontend with the token information
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173/home/leaderboard';
    const redirectUrl = `${frontendUrl}?did=${encodeURIComponent(did || 'unknown')}&authToken=${encodeURIComponent(authToken)}`;
    
    console.log('Redirecting to frontend with token data:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in auth callback:', error);
    
    // Redirect to frontend with error information
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173/home/leaderboard';
    res.redirect(`${frontendUrl}?error=auth_error&message=${encodeURIComponent(error.message || 'Unknown error')}`);
  }
});

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running fine." });
});

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Use routes
app.use('/api/score', scoreRoutes);

// Test route for algorithm
app.get("/api/test-algorithm", async (req, res) => {
  try {
    console.log("Testing algorithm with full controller flow...");
    
    // Create mock request with test data
    const mockReq = {
      method: "POST",
      body: {
        privyId: "test-user-" + Date.now(),
        twitterUsername: "testuser",
        walletAddress: "0xTestWalletAddress",
        userDid: "did:test:123",
        authToken: "test-token"
      }
    };
    
    // Create a mock response to capture the output
    const mockRes = {
      status: (code) => ({ 
        json: (data) => {
          console.log(`Test returned status ${code} with data:`, data);
          return res.status(code).json(data);
        }
      }),
      json: (data) => {
        console.log("Test completed successfully");
        return res.json({
          success: true,
          result: data
        });
      }
    };
    
    // Call the full controller function
    await CollectData(mockReq, mockRes);
  } catch (error) {
    console.error("Error testing algorithm:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n======================================`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`======================================\n`);
});

const startServer = async () => {
  try {
    await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });
    console.log(`✅ Moralis initialized successfully`);
  } catch (error) {
    console.error("❌ Error starting Moralis:", error);
  }
};

startServer();