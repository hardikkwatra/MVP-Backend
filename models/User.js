const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  privyId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  username: { 
    type: String, 
    default: null 
  },
  email: { 
    type: String,
  },
  twitterConnected: {
    type: Boolean,
    default: false
  },
  twitterUsername: String,
  twitterVerified: { 
    type: Boolean, 
    default: false 
  },
  walletConnected: {
    type: Boolean,
    default: false
  },
  walletAddress: {
    type: String,
    default: null
  },
  veridaConnected: { 
    type: Boolean, 
    default: false 
  },
  veridaUserId: String,
  totalScore: {
    type: Number,
    default: 0
  },
  scoreDetails: {
    twitterScore: {
      type: Number,
      default: 0
    },
    walletScore: {
      type: Number,
      default: 0
    },
    veridaScore: {
      type: Number,
      default: 0
    },
    twitterDetails: {
      type: Object,
      default: {}
    },
    walletDetails: {
      type: Object,
      default: {}
    },
    veridaDetails: {
      type: Object,
      default: {}
    }
  },
  lastScoreUpdate: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedTask: {
    type: Object
  }
}, {
  timestamps: true,
  versionKey: false,
  minimize: false // Ensure empty objects are stored
});

// Update the updatedAt field on each save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Clear any pre-existing email indexes to avoid duplicates
UserSchema.indexes().forEach(index => {
  if (index[0].email !== undefined) {
    UserSchema.index(index[0], { ...index[1], background: true, name: 'email_old_' + Date.now() });
  }
});

// Define a single email uniqueness index with proper partial filter expression
// This ensures only non-null string emails are considered for uniqueness
UserSchema.index(
  { email: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { email: { $type: "string" } },
    background: true,
    name: 'email_unique'
  }
);

module.exports = mongoose.model("User", UserSchema); 