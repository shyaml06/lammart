// -------------------------------------------------
// JWT + Role-based auth middleware
// Roles: Admin_Owner, Billing_Counter, Godown_Manager
// -------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; username: string; role: string; displayName: string };
    }
  }
}

/**
 * Verify JWT and attach user to request.
 * Any authenticated user is allowed through.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  // Development convenience: auto-grant owner role if no token or demo-token provided
  if (!header?.startsWith('Bearer ') || header === 'Bearer demo-token') {
    if (config.nodeEnv !== 'production') {
      req.user = { id: 'admin-dev', username: 'admin', role: 'Admin_Owner', displayName: 'Owner' };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(header.split(' ')[1], config.jwtSecret) as any;
    req.user = payload;
    next();
  } catch {
    // If token expired/invalid in dev, fall back gracefully
    if (config.nodeEnv !== 'production') {
      req.user = { id: 'admin-dev', username: 'admin', role: 'Admin_Owner', displayName: 'Owner' };
      return next();
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restrict access to specific roles.
 * Usage:  router.use(requireRole('Admin_Owner'))
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
