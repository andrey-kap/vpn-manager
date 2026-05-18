#!/usr/bin/env node
/**
 * Script to create admin user
 * Usage: node scripts/create-admin.js <username> <password> <shared_secret>
 * 
 * Or with environment variables:
 * ADMIN_USERNAME=admin ADMIN_PASSWORD=changeme ADMIN_SHARED_SECRET=mysecret node scripts/create-admin.js
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Get DB path from environment
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/sqlite.db');

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
function initializeDatabase() {
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
  console.log('Database initialized');
}

// Create admin user
async function createAdminUser(username: string, password: string, sharedSecret: string): Promise<void> {
  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  
  if (existing) {
    console.error(`Error: User "${username}" already exists`);
    process.exit(1);
  }
  
  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // Insert user
  const stmt = db.prepare(`
    INSERT INTO users (username, shared_secret, password_hash, is_active)
    VALUES (?, ?, ?, 1)
  `);
  
  const result = stmt.run(username, sharedSecret, passwordHash);
  
  console.log(`✅ Admin user created successfully!`);
  console.log(`   Username: ${username}`);
  console.log(`   ID: ${result.lastInsertRowid}`);
  console.log(`   Created: ${new Date().toISOString()}`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  let username = process.env.ADMIN_USERNAME || args[0];
  let password = process.env.ADMIN_PASSWORD || args[1];
  let sharedSecret = process.env.ADMIN_SHARED_SECRET || args[2];
  
  if (!username || !password || !sharedSecret) {
    console.log(`
Usage:
  node scripts/create-admin.js <username> <password> <shared_secret>

Or with environment variables:
  ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> ADMIN_SHARED_SECRET=<secret> node scripts/create-admin.js

Example:
  node scripts/create-admin.js admin SecurePass123! MySharedSecret
  
Environment variables take precedence over command-line arguments.
    `);
    process.exit(1);
  }
  
  try {
    initializeDatabase();
    await createAdminUser(username, password, sharedSecret);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
