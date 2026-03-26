import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: SqlJsDatabase | null = null;

async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  // Locate the wasm file — check multiple paths for dev vs prod
  const wasmPaths = [
    path.join(__dirname, '..', 'public', 'sql-wasm.wasm'),
    path.join(process.cwd(), 'public', 'sql-wasm.wasm'),
    path.join(__dirname, '..', '..', 'public', 'sql-wasm.wasm'),
  ];

  let wasmBinary: Buffer | undefined;
  for (const p of wasmPaths) {
    if (fs.existsSync(p)) {
      wasmBinary = fs.readFileSync(p);
      break;
    }
  }

  const SQL = await initSqlJs({
    wasmBinary,
  });

  db = new SQL.Database();

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL
    )
  `);

  // Seed test users if table is empty
  const countResult = db.exec("SELECT COUNT(*) FROM users");
  const count = countResult[0]?.values[0]?.[0] as number || 0;

  if (count === 0) {
    const adminHash = bcrypt.hashSync('adminpass123', 12);
    const empHash = bcrypt.hashSync('emppass123', 12);
    db.run("INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)",
      ['admin@test.com', 'Admin User', adminHash, 'admin']);
    db.run("INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)",
      ['emp@test.com', 'Employee User', empHash, 'employee']);
  }

  return db;
}

export { getDb };
