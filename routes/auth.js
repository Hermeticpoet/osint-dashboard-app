// routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// POST /login – stubbed credential check with role assignment
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  // Stubbed users
  let role = null;
  if (username === 'admin' && password === 'secret') {
    role = 'admin';
  } else if (username === 'user' && password === 'secret') {
    role = 'read-only';
  }

  if (!role) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res
      .status(500)
      .json({ error: 'Server misconfigured: missing JWT_SECRET' });
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  const token = jwt.sign({ username, role }, secret, { expiresIn });

  return res.json({ token });
});

export default router;
