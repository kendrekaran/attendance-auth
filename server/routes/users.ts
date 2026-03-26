import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requiresRole } from '../middleware/rbac.js';

const router = Router();

router.use(authMiddleware);

const rowToUser = (row: any[], cols: string[]) => {
  const user: Record<string, any> = {};
  cols.forEach((col, i) => { user[col] = row[i]; });
  return user;
};

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const result = db.exec(`SELECT id, email, name, role, created_at FROM users WHERE id = ${req.user!.userId}`);

  if (result.length === 0 || result[0].values.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(rowToUser(result[0].values[0], result[0].columns));
});

// PUT /api/users/me
router.put('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, password } = req.body;
  const db = await getDb();

  try {
    if (name) {
      db.run(`UPDATE users SET name = '${name.replace(/'/g, "''")}' WHERE id = ${req.user!.userId}`);
    }

    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      const hashed = await bcrypt.hash(password, 12);
      db.run(`UPDATE users SET password = '${hashed}' WHERE id = ${req.user!.userId}`);
    }

    const result = db.exec(`SELECT id, email, name, role, created_at FROM users WHERE id = ${req.user!.userId}`);
    res.json(rowToUser(result[0].values[0], result[0].columns));
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/all — admin only
router.get('/all', requiresRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const result = db.exec('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC');

  const users = result.length > 0
    ? result[0].values.map(row => rowToUser(row, result[0].columns))
    : [];

  res.json(users);
});

export default router;
