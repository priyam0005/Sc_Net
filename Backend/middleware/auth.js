const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  // Get the Authorization header
  const authHeader = req.headers['authorization']; // or req.get('authorization')
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  // Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res
      .status(401)
      .json({ message: 'Invalid authorization header format' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_TOKEN);
    req.user = decoded;
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }

  next();
}

module.exports = auth;
