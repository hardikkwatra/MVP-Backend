#!/usr/bin/env node

const axios = require('axios');

async function testVeridaAuthUrl() {
  try {
    console.log('Testing Verida auth URL endpoint...');
    const response = await axios.get('http://localhost:5000/api/verida/auth/url');
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.authUrl) {
      console.log('\nGenerated URL:', response.data.authUrl);
      
      // Check if the URL has the right format
      if (response.data.authUrl.includes('scopes=')) {
        console.log('\n✅ URL format is correct (using scopes)');
      } else {
        console.log('\n❌ URL format is wrong (not using scopes)');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testVeridaAuthUrl(); 