import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requiresRole } from '../middleware/rbac.js';

const router = Router();

router.use(authMiddleware);

const rowToRecord = (row: any[], cols: string[]) => {
  const obj: Record<string, any> = {};
  cols.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
};

// POST /api/attendance/checkin
router.post('/checkin', requiresRole('admin', 'employee'), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const db = await getDb();

  const today = new Date().toISOString().split('T')[0];
  const existing = db.exec(
    `SELECT id FROM attendance WHERE user_id = ${userId} AND type = 'checkin' AND date(timestamp) = date('${today}') ORDER BY timestamp DESC LIMIT 1`
  );

  if (existing.length > 0 && existing[0].values.length > 0) {
    res.status(409).json({ error: 'Already checked in today' });
    return;
  }

  db.run(`INSERT INTO attendance (user_id, type) VALUES (${userId}, 'checkin')`);
  const result = db.exec('SELECT last_insert_rowid() as id');

  res.status(201).json({
    id: result[0].values[0][0],
    user_id: userId,
    type: 'checkin',
    message: 'Checked in successfully',
  });
});

// POST /api/attendance/checkout
router.post('/checkout', requiresRole('admin', 'employee'), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const db = await getDb();

  const today = new Date().toISOString().split('T')[0];
  const checkedIn = db.exec(
    `SELECT id FROM attendance WHERE user_id = ${userId} AND type = 'checkin' AND date(timestamp) = date('${today}') LIMIT 1`
  );

  if (!checkedIn.length || !checkedIn[0].values.length) {
    res.status(409).json({ error: 'No active check-in found for today' });
    return;
  }

  db.run(`INSERT INTO attendance (user_id, type) VALUES (${userId}, 'checkout')`);
  const result = db.exec('SELECT last_insert_rowid() as id');

  res.status(201).json({
    id: result[0].values[0][0],
    user_id: userId,
    type: 'checkout',
    message: 'Checked out successfully',
  });
});

// GET /api/attendance/me
router.get('/me', requiresRole('admin', 'employee'), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const db = await getDb();

  const result = db.exec(
    `SELECT a.id, a.user_id, a.type, a.timestamp, u.name as user_name
     FROM attendance a JOIN users u ON a.user_id = u.id
     WHERE a.user_id = ${userId}
     ORDER BY a.timestamp DESC LIMIT 100`
  );

  const records = result.length > 0
    ? result[0].values.map(row => rowToRecord(row, result[0].columns))
    : [];

  res.json(records);
});

// GET /api/attendance/all — admin only
router.get('/all', requiresRole('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();

  const result = db.exec(
    `SELECT a.id, a.user_id, a.type, a.timestamp, u.name as user_name, u.email as user_email
     FROM attendance a JOIN users u ON a.user_id = u.id
     ORDER BY a.timestamp DESC LIMIT 200`
  );

  const records = result.length > 0
    ? result[0].values.map(row => rowToRecord(row, result[0].columns))
    : [];

  res.json(records);
});

export default router;
