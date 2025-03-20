# Verida Integration

This document describes the Verida integration in the Cluster application.

## Overview

The Verida integration allows users to connect to their Verida account, access their Telegram data, and calculate a score based on their Telegram activity. This score is then combined with other scores (Twitter, wallet, etc.) to create a total score.

## Architecture

The integration consists of the following components:

1. **Backend Services**
   - `veridaService.js`: Handles interaction with the Verida API
   - `scoreService.js`: Calculates scores based on user data

2. **Backend Routes**
   - `verida.js`: Exposes API endpoints for Verida integration

3. **Frontend Components**
   - `Verida.jsx`: User interface for connecting to Verida

## Authentication Flow

1. User clicks "Connect with Verida" button in the frontend
2. Frontend requests an auth URL from the backend
3. User is redirected to Verida for authentication
4. After successful authentication, Verida redirects back to our application with a token
5. The token is stored and associated with the user
6. The user's Verida connection status is updated in the database

## Score Calculation

The Verida score is calculated based on the following factors:

1. **Group Count** (30% weight): Number of Telegram groups the user is part of
2. **Message Count** (20% weight): Total number of messages sent by the user
3. **Pinned Messages** (15% weight): Number of messages pinned by the user
4. **Active Groups** (20% weight): Number of groups with recent activity
5. **Message Frequency** (15% weight): How often the user sends messages

The total score is capped at 15 points.

## Environment Variables

The following environment variables are used for the Verida integration:

```
VERIDA_AUTH_URL=https://app.verida.io/auth
VERIDA_CLIENT_ID=your-client-id
VERIDA_REDIRECT_URI=http://localhost:3000/verida-callback
VERIDA_API_BASE_URL=https://api.verida.ai
```

## API Endpoints

### GET /api/verida/auth/url
Returns a URL for authenticating with Verida.

### GET /api/verida/auth/callback
Callback endpoint for Verida authentication.

### GET /api/verida/telegram/groups/:userId
Returns the user's Telegram groups.

### GET /api/verida/telegram/messages/:userId
Returns the user's Telegram messages.

### POST /api/verida/update-status
Updates the user's Verida connection status.

### POST /api/verida/calculate-score
Calculates the user's Verida score.

## Testing

A comprehensive test script is available in `test-verida.js`. This script tests the Verida service, score service, and API endpoints.

To run the tests:

```bash
node test-verida.js
```

## Troubleshooting

Common issues:

1. **Authentication Errors**: Check that the environment variables are correctly set.
2. **API Errors**: Check that the Verida API is accessible and that the user has granted the necessary permissions.
3. **Score Calculation Errors**: Ensure that the user has Telegram data in their Verida account.

## Future Improvements

Potential improvements to the Verida integration:

1. Add support for more data sources from Verida
2. Implement caching to reduce API calls
3. Add more detailed analytics on user data
4. Implement webhook support for real-time updates 