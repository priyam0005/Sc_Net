const mongoose = require('mongoose');

const userData = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    require: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'nafsa',
    },
  ],
});

module.exports = mongoose.model('People', userData);
