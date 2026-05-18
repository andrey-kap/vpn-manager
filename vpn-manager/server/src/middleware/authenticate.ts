/**
 * Authentication Middleware
 * Verifies JWT access tokens and adds user info to request context
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

// Extend FastifyRequest type to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
    };
  }
}

export interface JwtPayload {
  id: string;
  username: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Authentication middleware for protecting routes
 * Verifies Bearer token in Authorization header
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    });
    return;
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    });
    return;
  }

  const token = parts[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & JwtPayload;

    // Attach user info to request
    request.user = {
      id: String(decoded.id),
      username: decoded.username,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Unauthorized',
        },
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Unauthorized',
        },
      });
    } else {
      reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      });
    }
    return;
  }
}

/**
 * Generate access and refresh tokens
 * @param payload - User data to include in token
 * @returns Object with accessToken, refreshToken, and expiresIn
 */
export function generateTokens(payload: { id: string; username: string }): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  const accessTokenExpiresIn = 15 * 60; // 15 minutes in seconds
  const refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  const accessToken = jwt.sign(payload, JWT_SECRET!, {
    expiresIn: accessTokenExpiresIn,
  });

  const refreshToken = jwt.sign(payload, JWT_SECRET!, {
    expiresIn: refreshTokenExpiresIn,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenExpiresIn,
  };
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Valid refresh token
 * @returns New tokens object or null if invalid
 */
export function refreshAccessToken(refreshToken: string): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET!) as jwt.JwtPayload & JwtPayload;

    // Generate new tokens
    return generateTokens({
      id: decoded.id,
      username: decoded.username,
    });
  } catch {
    return null;
  }
}
