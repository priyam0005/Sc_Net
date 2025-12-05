// thoughts.model.js (Updated)
const mongoose = require("mongoose");
const thoughtSchema = new mongoose.Schema(
  {
    // Author info
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "People",
      required: true,
      index: true,
    },
    username: String,
    userAvatar: String,

    // Content (Simplified - no background)
    content: {
      type: String,
      required: true,
      maxlength: 280,
    },

    // Engagement metrics (Unchanged)
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "People",
      default: [],
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    viewedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "People",
      default: [],
    },

    // Ranking score
    rankingScore: {
      type: Number,
      default: 0,
      index: true,
    },

    // Metadata (Unchanged)
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: Date,
    isPublic: {
      type: Boolean,
      default: true,
    },
    lastEngagementAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes (Unchanged)
thoughtSchema.index({ rankingScore: -1, createdAt: -1 });
thoughtSchema.index({ userId: 1, createdAt: -1 });
thoughtSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Thought", thoughtSchema);
