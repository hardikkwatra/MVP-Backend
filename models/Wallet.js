const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    required: true
  },
  chainId: {
    type: String,
    default: null
  },
  balance: {
    type: Number,
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Create a compound index for userId and address to ensure uniqueness
WalletSchema.index({ userId: 1, address: 1 }, { unique: true });

module.exports = mongoose.model("Wallet", WalletSchema); 