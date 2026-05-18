/**
 * User Routes
 * Handles user CRUD operations (protected routes)
 */

import { FastifyInstance } from 'fastify';
import { CreateUserRequestSchema, UpdateUserRequestSchema } from '@shared/api-contracts';
import {
  createUser,
  getAllUsers,
  getUserById,
  toggleUserActive,
  deleteUser,
} from '../user.service.js';
import { authenticate } from '../middleware/authenticate.js';

interface CreateUserData {
  username: string;
  shared_secret: string;
  password: string;
}

interface UpdateUserData {
  username?: string;
  shared_secret?: string;
  is_active?: boolean;
}

/**
 * Register user routes
 */
export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // All user routes are protected
  fastify.addHook('preHandler', authenticate);

  // GET /api/users - Get all users
  fastify.get('/api/users', async (request, reply) => {
    try {
      const users = getAllUsers();
      return reply.status(200).send({
        success: true,
        data: users.map((user: import('../user.service.js').User) => ({
          ...user,
          created_at: user.created_at.toISOString(),
        })),
      });
    } catch (error) {
      fastify.log.error({ error }, 'Get users error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // GET /api/users/:id - Get user by ID
  fastify.get<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    try {
      const user = getUserById(request.params.id);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          ...user,
          created_at: user.created_at.toISOString(),
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Get user error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // POST /api/users - Create new user
  fastify.post<{ Body: CreateUserData }>(
    '/api/users',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'shared_secret', 'password'],
          properties: {
            username: { type: 'string', minLength: 3 },
            shared_secret: { type: 'string', minLength: 8 },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Validate request body using Zod
        const validationResult = CreateUserRequestSchema.safeParse(request.body);
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

        // Note: password is in request.body but not in schema, we need to handle it separately
        const userData = validationResult.data;
        const password = (request.body as CreateUserData).password;

        if (!password || password.length < 1) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Password is required',
            },
          });
        }

        const user = createUser({
          username: userData.username,
          shared_secret: userData.shared_secret,
          password,
        });

        return reply.status(201).send({
          success: true,
          data: {
            ...user,
            created_at: user.created_at.toISOString(),
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Create user error');
        if (error instanceof Error && error.message.includes('already exists')) {
          return reply.status(409).send({
            success: false,
            error: {
              code: 'CONFLICT',
              message: error.message,
            },
          });
        }
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

  // PATCH /api/users/:id/toggle-active - Toggle user active status
  fastify.patch<{ Params: { id: string } }>('/api/users/:id/toggle-active', async (request, reply) => {
    try {
      const user = toggleUserActive(request.params.id);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          ...user,
          created_at: user.created_at.toISOString(),
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Toggle user active error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });

  // DELETE /api/users/:id - Delete user
  fastify.delete<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    try {
      const deleted = deleteUser(request.params.id);
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: null,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Delete user error');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    }
  });
}
