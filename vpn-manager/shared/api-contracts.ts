/**
 * API Contracts - Zod schemas for request/response validation
 * Types are inferred from schemas using z.infer<>
 */

import { z } from 'zod';

// ==================== User Schemas ====================

export const CreateUserRequestSchema = z.object({
  username: z.string().min(3).max(50),
  shared_secret: z.string().min(8),
});

export const UpdateUserRequestSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  shared_secret: z.string().min(8).optional(),
  is_active: z.boolean().optional(),
});

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  shared_secret: z.string(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
});

export const UsersListResponseSchema = z.array(UserResponseSchema);

// ==================== Auth Schemas ====================

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const AuthTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});

// ==================== Docker Schemas ====================

export const DockerStatusResponseSchema = z.object({
  status: z.enum(['running', 'stopped', 'paused', 'restarting', 'removing', 'exited', 'dead']),
  uptime: z.number().int().nonnegative().nullable(),
  containerId: z.string(),
  image: z.string(),
});

export const DockerStartRequestSchema = z.object({}).strict();

export const DockerStopRequestSchema = z.object({}).strict();

export const DockerRestartRequestSchema = z.object({
  timeout: z.number().int().positive().optional(),
});

// ==================== Traffic Schemas ====================

export const TrafficRecordResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  bytes_in: z.number().int().nonnegative(),
  bytes_out: z.number().int().nonnegative(),
});

export const TrafficStatsRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const TrafficStatsResponseSchema = z.object({
  totalBytesIn: z.number().int().nonnegative(),
  totalBytesOut: z.number().int().nonnegative(),
  records: z.array(TrafficRecordResponseSchema),
});

// ==================== Pagination Schemas ====================

export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  });

// ==================== Generic Error Schema ====================

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

// ==================== Generic Success Response Schema ====================

export const ApiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

// ==================== Inferred Types ====================

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type AuthTokensResponse = z.infer<typeof AuthTokensResponseSchema>;

export type DockerStatusResponse = z.infer<typeof DockerStatusResponseSchema>;
export type DockerStartRequest = z.infer<typeof DockerStartRequestSchema>;
export type DockerStopRequest = z.infer<typeof DockerStopRequestSchema>;
export type DockerRestartRequest = z.infer<typeof DockerRestartRequestSchema>;

export type TrafficRecordResponse = z.infer<typeof TrafficRecordResponseSchema>;
export type TrafficStatsRequest = z.infer<typeof TrafficStatsRequestSchema>;
export type TrafficStatsResponse = z.infer<typeof TrafficStatsResponseSchema>;

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
