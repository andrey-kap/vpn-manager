/**
 * Authentication Routes
 * Handles login and token refresh endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LoginRequestSchema, RefreshTokenRequestSchema } from '@shared/api-contracts';
import { getUserByUsernameWithPassword, verifyPassword } from '../user.service.js';
import { generateTokens, refreshAccessToken } from '../middleware/authenticate.js';
import type { AuthTokensResponse } from '@shared/api-contracts';

interface LoginBody {
  username: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

/**
 * Register authentication routes
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/auth/login - User login
  fastify.post<{ Body: LoginBody }>(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      try {
        // Validate request body using Zod
        const validationResult = LoginRequestSchema.safeParse(request.body);
        if (!validationResult.success) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request body',
              details: {
                errors: validationResult.error.errors.map((err) => ({
                  field: err.path.join('.'),
                  message: err.message,
                })),
              },
            },
          });
        }

        const { username, password } = validationResult.data;

        // Find user by username
        const user = getUserByUsernameWithPassword(username);
        if (!user) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid credentials',
            },
          });
        }

        // Check if user is active
        if (user.is_active !== 1) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'USER_INACTIVE',
              message: 'User account is inactive',
            },
          });
        }

        // Verify password
        const isValidPassword = verifyPassword(user.password_hash, password);
        if (!isValidPassword) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid credentials',
            },
          });
        }

        // Generate tokens
        const tokens = generateTokens({
          id: String(user.id),
          username: user.username,
        });

        // Return success response
        const response: AuthTokensResponse = tokens;
        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Login error');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        });
      }
    }
  );

  // POST /api/auth/refresh - Refresh access token
  fastify.post<{ Body: RefreshBody }>(
    '/api/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Validate request body using Zod
        const validationResult = RefreshTokenRequestSchema.safeParse(request.body);
        if (!validationResult.success) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request body',
              details: {
                errors: validationResult.error.errors.map((err) => ({
                  field: err.path.join('.'),
                  message: err.message,
                })),
              },
            },
          });
        }

        const { refreshToken } = validationResult.data;

        // Refresh tokens
        const tokens = refreshAccessToken(refreshToken);
        if (!tokens) {
          return reply.status(401).send({
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired refresh token',
            },
          });
        }

        // Return success response
        const response: AuthTokensResponse = tokens;
        return reply.status(200).send({
          success: true,
          data: response,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Token refresh error');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
        });
      }
    }
  );
}
