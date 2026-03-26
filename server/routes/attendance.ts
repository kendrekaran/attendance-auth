import { Router, Response } from 'express';
import db from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requiresRole } from '../middleware/rbac.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/attendance/checkin
router.post('/checkin', requiresRole('admin', 'employee'), (req: AuthRequest, res: Response): void => {
  const userId = req.user!.userId;

  // Check if already checked in today (no checkout yet)
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare(`
    SELECT id FROM attendance
    WHERE user_id = ? AND type = 'checkin'
    AND date(timestamp) = date(?)
    ORDER BY timestamp DESC LIMIT 1
  `).get(userId, today) as any;

  if (existing) {
    res.status(409).json({ error: 'Already checked in today' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO attendance (user_id, type) VALUES (?, ?)'
  ).run(userId, 'checkin');

  res.status(201).json({
    id: result.lastInsertRowid,
    user_id: userId,
    type: 'checkin',
    message: 'Checked in successfully',
  });
});

// POST /api/attendance/checkout
router.post('/checkout', requiresRole('admin', 'employee'), (req: AuthRequest, res: Response): void => {
  const userId = req.user!.userId;

  // Check if checked in today without checkout
  const today = new Date().toISOString().split('T')[0];
  const checkedIn = db.prepare(`
    SELECT id FROM attendance
    WHERE user_id = ? AND type = 'checkin'
    AND date(timestamp) = date(?)
    AND id NOT IN (
      SELECT attendance_id FROM attendance a2
      WHERE a2.user_id = ? AND a2.type = 'checkout'
      AND date(a2.timestamp) = date(?)
    )
  `).get(userId, today, userId, today);

  if (!checkedIn) {
    res.status(409).json({ error: 'No active check-in found for today' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO attendance (user_id, type) VALUES (?, ?)'
  ).run(userId, 'checkout');

  res.status(201).json({
    id: result.lastInsertRowid,
    user_id: userId,
    type: 'checkout',
    message: 'Checked out successfully',
  });
});

// GET /api/attendance/me — own attendance
router.get('/me', requiresRole('admin', 'employee'), (req: AuthRequest, res: Response): void => {
  const userId = req.user!.userId;

  const records = db.prepare(`
    SELECT a.*, u.name as user_name
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.user_id = ?
    ORDER BY a.timestamp DESC
    LIMIT 100
  `).all(userId);

  res.json(records);
});

// GET /api/attendance/all — admin only
router.get('/all', requiresRole('admin'), (req: AuthRequest, res: Response): void => {
  const records = db.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.timestamp DESC
    LIMIT 200
  `).all();

  res.json(records);
});

export default router;
