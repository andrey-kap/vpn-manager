/**
 * Database initialization and prepared statements for better-sqlite3
 * Creates tables if they don't exist and exports parameterized queries
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get DB path from environment
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/vpn.db');

// Ensure directory exists
import fs from 'fs';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      shared_secret TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    
    CREATE TABLE IF NOT EXISTS traffic_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      bytes_in INTEGER NOT NULL,
      bytes_out INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_traffic_user_time ON traffic_stats(user_id, timestamp);
  `);
}

// ==================== Prepared Statements ====================

// User statements
export const stmtInsertUser = db.prepare(`
  INSERT INTO users (username, shared_secret, password_hash)
  VALUES (?, ?, ?)
`);

export const stmtSelectAllUsers = db.prepare(`
  SELECT id, username, shared_secret, is_active, created_at
  FROM users
  ORDER BY created_at DESC
`);

export const stmtSelectUserById = db.prepare(`
  SELECT id, username, shared_secret, is_active, created_at
  FROM users
  WHERE id = ?
`);

export const stmtSelectUserByUsername = db.prepare(`
  SELECT id, username, shared_secret, password_hash, is_active, created_at
  FROM users
  WHERE username = ?
`);

export const stmtUpdateUserActive = db.prepare(`
  UPDATE users SET is_active = ? WHERE id = ?
`);

export const stmtDeleteUser = db.prepare(`
  DELETE FROM users WHERE id = ?
`);

// Traffic statements
export const stmtInsertTrafficRecord = db.prepare(`
  INSERT INTO traffic_stats (user_id, timestamp, bytes_in, bytes_out)
  VALUES (?, ?, ?, ?)
`);

export const stmtSelectTrafficByUserId = db.prepare(`
  SELECT id, user_id, timestamp, bytes_in, bytes_out
  FROM traffic_stats
  WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
  ORDER BY timestamp DESC
  LIMIT ?
`);

export const stmtSelectTrafficStats = db.prepare(`
  SELECT 
    SUM(bytes_in) as total_bytes_in,
    SUM(bytes_out) as total_bytes_out
  FROM traffic_stats
  WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
`);

// ==================== Database Close ====================

export function closeDatabase(): void {
  db.close();
}

export { db };
