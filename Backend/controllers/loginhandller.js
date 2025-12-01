const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Person = require('../schemas/userData');
const auth = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Person.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ message: 'user not find, sign up instead' });
    }

    const ismatch = await bcrypt.compare(password, user.password);

    if (!ismatch) {
      return res.status(400).json({ message: 'invalid credentials ' });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },

      process.env.JWT_SECRET_TOKEN,

      {
        expiresIn: '7h',
      }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
