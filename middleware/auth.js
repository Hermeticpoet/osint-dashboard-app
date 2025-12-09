// middleware/auth.js
import jwt from 'jsonwebtoken';

/**
 * Authenticate incoming requests using JWT in the Authorization header.
 * Attaches { username, role } to req.user when valid.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ error: 'Server misconfigured: missing JWT_SECRET' });
    }

    const payload = jwt.verify(token, secret);
    // Expect payload to contain username and role
    req.user = { username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authorize a user based on required role(s).
 * Accepts a single role string or an array of allowed roles.
 */
export function authorizeRole(requiredRole) {
  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ error: 'Token required' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    return next();
  };
}
