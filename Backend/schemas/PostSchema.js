const mongoose = require('mongoose');

const PostData = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'People',
      required: true,
    },

    content: {
      type: String,
      required: true,
    },
    mediaUrl: {
      type: String,
      default: null,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'People',
      },
    ],

    isPublished: {
      type: Boolean,
      default: true,
    },

    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('nafsa', PostData);
