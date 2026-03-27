import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// PUT /api/users/profile — update own name
router.put('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const userId = req.user!.userId;
    const db = await getDb();
    db.run(`UPDATE users SET name = ? WHERE id = ${userId}`, [name.trim()]);

    const result = db.exec(`SELECT id, email, name, role FROM users WHERE id = ${userId}`);
    if (!result.length || !result[0].values.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const updated: Record<string, any> = {};
    cols.forEach((col, i) => { updated[col] = row[i]; });

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/change-password — change own password
router.post('/change-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    const userId = req.user!.userId;
    const db = await getDb();

    const result = db.exec(`SELECT password FROM users WHERE id = ${userId}`);
    if (!result.length || !result[0].values.length) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const storedHash = result[0].values[0][0] as string;
    const valid = await bcrypt.compare(currentPassword, storedHash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    db.run(`UPDATE users SET password = ? WHERE id = ${userId}`, [newHash]);

    // Invalidate all refresh tokens for this user
    db.run(`DELETE FROM refresh_tokens WHERE user_id = ${userId}`);

    res.json({ message: 'Password updated. Please log in again.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
