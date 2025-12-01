const mongoose = require('mongoose');

const userProfileInfo = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'People',
      required: true,
      unique: true,
    },
    url: { type: String },
    ProfilePic: {
      type: String,
      enum: ['jpg', 'webp', 'png', 'jpeg'],
      required: false,
    },

    displayName: {
      type: String,
      required: false,
    },

    mood: { type: String, required: false },
    LastOnline: {
      type: Date,
    },
    bio: { type: String },

    updatedAt: { type: Date, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ProfileInfo', userProfileInfo);
