import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../db.js';

const router = Router();

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const getSecrets = () => {
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const refreshSecret = process.env.REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
  return { jwtSecret, refreshSecret };
};

const generateTokens = async (user: { id: number; email: string; role: string }) => {
  const { jwtSecret, refreshSecret } = getSecrets();

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
  );

  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString();

  const db = await getDb();
  db.run(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshToken, expiresAt]
  );

  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const db = await getDb();

    // Check if email already exists
    const existing = db.exec(`SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}'`);
    if (existing.length > 0 && existing[0].values.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userRole = role === 'admin' ? 'admin' : 'employee';

    db.run(
      'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)',
      [email, name, hashedPassword, userRole]
    );

    const result = db.exec('SELECT last_insert_rowid() as id');
    const userId = result[0].values[0][0] as number;

    const user = { id: userId, email, role: userRole };
    const tokens = await generateTokens(user);

    res.status(201).json({
      user: { id: userId, email, name, role: userRole },
      ...tokens,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const db = await getDb();
    const result = db.exec(`SELECT * FROM users WHERE email = '${email.replace(/'/g, "''")}'`);

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const row = result[0].values[0];
    const cols = result[0].columns;
    const user: Record<string, any> = {};
    cols.forEach((col, i) => { user[col] = row[i]; });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tokens = await generateTokens({ id: user.id, email: user.email, role: user.role });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const db = await getDb();
    const result = db.exec(
      `SELECT rt.*, u.email, u.role FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = '${refreshToken.replace(/'/g, "''")}'`
    );

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const cols = result[0].columns;
    const row = result[0].values[0];
    const stored: Record<string, any> = {};
    cols.forEach((col, i) => { stored[col] = row[i]; });

    if (new Date(stored.expires_at) < new Date()) {
      db.run(`DELETE FROM refresh_tokens WHERE id = ${stored.id}`);
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    const { jwtSecret } = getSecrets();

    const accessToken = jwt.sign(
      { userId: stored.user_id, email: stored.email, role: stored.role },
      jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
    );

    res.json({ accessToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const db = await getDb();
    db.run(`DELETE FROM refresh_tokens WHERE token = '${refreshToken.replace(/'/g, "''")}'`);
  }
  res.json({ message: 'Logged out' });
});

export default router;
