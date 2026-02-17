import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  
  // eslint-disable-next-line no-console
  console.log('[requireAuth] Path:', req.path, 'Method:', req.method, 'Has token:', !!token);
  
  if (!token) {
    // eslint-disable-next-line no-console
    console.log('[requireAuth] Missing Authorization header');
    return next(new HttpError(401, 'Missing Authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    // eslint-disable-next-line no-console
    console.log('[requireAuth] Token verified, user:', payload.email);
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[requireAuth] Token verification failed:', err.message);
    return next(new HttpError(401, 'Invalid or expired token'));
  }
}

