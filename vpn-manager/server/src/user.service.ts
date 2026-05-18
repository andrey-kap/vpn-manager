/**
 * User Service - Business logic for user management
 * All database queries are parameterized to prevent SQL injection
 */

import bcrypt from 'bcrypt';
import {
  stmtInsertUser,
  stmtSelectAllUsers,
  stmtSelectUserById,
  stmtSelectUserByUsername,
  stmtUpdateUserActive,
  stmtDeleteUser,
} from './db.js';
import type { User } from '@shared/types';

export interface CreateUserInput {
  username: string;
  shared_secret: string;
  password: string;
}

export interface DbUser {
  id: number;
  username: string;
  shared_secret: string;
  is_active: number;
  created_at: string;
}

export interface DbUserWithPassword extends DbUser {
  password_hash: string;
}

/**
 * Convert database user row to User interface
 */
function mapDbUserToUser(row: DbUser): User {
  return {
    id: String(row.id),
    username: row.username,
    shared_secret: row.shared_secret,
    is_active: row.is_active === 1,
    created_at: new Date(row.created_at),
  };
}

/**
 * Create a new user with hashed password
 * @param input - User creation data
 * @returns Created user
 * @throws Error if user already exists or database error occurs
 */
export function createUser(input: CreateUserInput): User {
  try {
    // Check if user already exists
    const existing = stmtSelectUserByUsername.get(input.username) as DbUser | undefined;
    if (existing) {
      throw new Error(`User with username "${input.username}" already exists`);
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = bcrypt.hashSync(input.password, 12);

    // Insert user
    const result = stmtInsertUser.run(input.username, input.shared_secret, passwordHash);

    // Fetch and return created user
    const user = stmtSelectUserById.get(result.lastInsertRowid) as DbUser;
    if (!user) {
      throw new Error('Failed to retrieve created user');
    }

    return mapDbUserToUser(user);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all users
 * @returns Array of all users
 */
export function getAllUsers(): User[] {
  try {
    const rows = stmtSelectAllUsers.all() as DbUser[];
    return rows.map(mapDbUserToUser);
  } catch (error) {
    throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user by ID
 * @param id - User ID
 * @returns User or null if not found
 */
export function getUserById(id: string): User | null {
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return null;
    }

    const row = stmtSelectUserById.get(numericId) as DbUser | undefined;
    if (!row) {
      return null;
    }

    return mapDbUserToUser(row);
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user by username (includes password hash for authentication)
 * @param username - Username
 * @returns User with password hash or null if not found
 */
export function getUserByUsernameWithPassword(username: string): DbUserWithPassword | null {
  try {
    const row = stmtSelectUserByUsername.get(username) as DbUserWithPassword | undefined;
    return row || null;
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Toggle user active status
 * @param id - User ID
 * @returns Updated user or null if not found
 */
export function toggleUserActive(id: string): User | null {
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return null;
    }

    // Get current status
    const user = stmtSelectUserById.get(numericId) as DbUser | undefined;
    if (!user) {
      return null;
    }

    // Toggle active status
    const newActive = user.is_active === 1 ? 0 : 1;
    stmtUpdateUserActive.run(newActive, numericId);

    // Fetch and return updated user
    const updated = stmtSelectUserById.get(numericId) as DbUser;
    return mapDbUserToUser(updated);
  } catch (error) {
    throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete user by ID
 * @param id - User ID
 * @returns true if deleted, false if not found
 */
export function deleteUser(id: string): boolean {
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return false;
    }

    const result = stmtDeleteUser.run(numericId);
    return result.changes > 0;
  } catch (error) {
    throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify user password
 * @param passwordHash - Stored password hash
 * @param password - Plain text password to verify
 * @returns true if password matches
 */
export function verifyPassword(passwordHash: string, password: string): boolean {
  return bcrypt.compareSync(password, passwordHash);
}
