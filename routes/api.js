const express = require('express');
const router = express.Router();
const veridaService = require('../Services/veridaService.js');

// Calculate FOMOscore based on Telegram data
router.post('/score', async (req, res) => {
  try {
    const { did, authToken } = req.body;
    
    if (!authToken) {
      return res.status(400).json({ error: 'Auth token is required' });
    }

    let userDid = did;
    // If no DID provided, try to fetch it using the auth token
    if (!did || did === 'unknown') {
      try {
        userDid = await veridaService.getUserDID(authToken);
        console.log('Retrieved DID from auth token:', userDid);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Invalid DID', 
          message: 'Could not retrieve your Verida DID. Please try reconnecting with Verida.' 
        });
      }
    }

    console.log('Received score request for DID:', userDid);
    
    // Get Telegram data from Verida vault
    try {
      const telegramData = await veridaService.getTelegramData(userDid, authToken);
      
      // Calculate FOMOscore
      const fomoScore = calculateFOMOscore(telegramData);
      console.log('Calculated FOMO score:', fomoScore);
      
      return res.json({ 
        score: fomoScore,
        did: userDid,
        data: {
          groups: telegramData.groups,
          messages: telegramData.messages,
          keywordMatches: telegramData.keywordMatches
        }
      });
    } catch (veridaError) {
      console.error('Error getting Telegram data:', veridaError);
      return res.status(500).json({
        error: 'Failed to fetch Telegram data',
        message: veridaError.message || 'Could not retrieve your Telegram data from Verida'
      });
    }
  } catch (error) {
    console.error('Error calculating FOMOscore:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate FOMOscore', 
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function to calculate FOMOscore (scaled 1-10)
function calculateFOMOscore(data) {
  const { groups, messages, keywordMatches } = data;
  
  // Add engage bonus from keywords
  const keywordBonus = keywordMatches ? keywordMatches.totalCount * 0.5 : 0;
  
  // Base calculation - raw activity score
  const rawScore = groups + messages * 0.1 + keywordBonus;
  
  // Scale to 1-10 range using logarithmic scale
  // This handles wide ranges of activity more gracefully
  const scaledScore = 1 + 9 * Math.min(1, Math.log10(rawScore + 1) / Math.log10(101));
  
  // Log the calculation for debugging
  console.log(`Score calculation: groups=${groups}, messages=${messages}, keywordBonus=${keywordBonus}, rawScore=${rawScore}, scaledScore=${scaledScore}`);
  
  // Round to 1 decimal place
  return Math.max(1, Math.min(10, Math.round(scaledScore * 10) / 10));
}

module.exports = router;