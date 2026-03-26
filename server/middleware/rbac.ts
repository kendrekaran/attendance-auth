import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export const requiresRole = (...roles: Array<'admin' | 'employee'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
