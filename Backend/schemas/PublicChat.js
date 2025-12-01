// In your PublicChat schema file:
const mongoose = require("mongoose");

const publicMessageSchema = new mongoose.Schema({
  SenderTag: { type: String, required: true, index: true },
  SenderName: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  profilePic: String,
  replyTo: Object,
});

// CRITICAL INDEXES
publicMessageSchema.index({ timestamp: -1 }); // For sorting by time
publicMessageSchema.index({ SenderTag: 1, timestamp: -1 }); // For user message history

module.exports = mongoose.model("PublicMessage", publicMessageSchema);
