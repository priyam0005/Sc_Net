const express = require('express');
const bcrypt = require('bcryptjs');
const Person = require('../schemas/userData');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const UserExist = await Person.findOne({ email });

    if (UserExist) {
      return res.status(400).json({ message: 'user already exist' });
    }

    //hash password

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new Person({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'user registered succesfully ' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
