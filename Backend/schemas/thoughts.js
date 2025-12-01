const mongoose = require('mongoose');

const { Schema } = mongoose;

const userThoughts = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'People',
      required: true,
      unique: true,
    },

    thought: {
      type: String,
      required: true,
      minLength: 10,
      maxLength: 200,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'People',
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
  },

  {
    timestamps: true,
  }
);

const thoughts = mongoose.model(userThoughts, 'thought');

export default thoughts;
