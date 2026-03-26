import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requiresRole } from '../middleware/rbac.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', (req: AuthRequest, res: Response): void => {
  const user = db.prepare(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
  ).get(req.user!.userId) as any;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

// PUT /api/users/me
router.put('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, password } = req.body;

  try {
    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user!.userId);
    }

    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      const hashed = await bcrypt.hash(password, 12);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user!.userId);
    }

    const user = db.prepare(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
    ).get(req.user!.userId);

    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/all — admin only
router.get('/all', requiresRole('admin'), (req: AuthRequest, res: Response): void => {
  const users = db.prepare(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
  ).all();

  res.json(users);
});

export default router;
