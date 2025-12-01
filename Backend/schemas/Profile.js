const mongoose = require('mongoose');
const { Schema } = mongoose;

const profileSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'People',
      required: true,
      unique: true,
    },

    displayName: {
      type: String,
      required: false,
      trim: true,
      default: '',
      maxlength: 50,
    },
    profilePic: {
      type: String, // store file path or URL
      default: 'https://giffiles.alphacoders.com/222/222774.gif',
    },
    mood: {
      type: String,
      default: '',
      maxlength: 50,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 200,
    },

    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: 'People',
      },
    ],
    // An array to hold the ObjectIds of users you have sent requests to
    sentRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'People',
      },
    ],
    // An array to hold the ObjectIds of users who have sent you requests
    receivedRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'People',
      },
    ],
  },
  {
    timestamps: true, // automatically handles createdAt/updatedAt
  }
);

module.exports = mongoose.model('Profile', profileSchema);
