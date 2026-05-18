/**
 * Environment Schema Validation
 * Provides Zod schemas for backend and frontend environment variables
 * with clear error messages on validation failure
 */

import { z } from 'zod';

// ==================== Backend Environment Schema ====================

export const backendEnvSchema = z.object({
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for security')
    .regex(
      /^[a-zA-Z0-9\-_]+$/,
      'JWT_SECRET must contain only alphanumeric characters, hyphens, and underscores'
    ),
  DB_PATH: z
    .string()
    .min(1, 'DB_PATH is required')
    .refine(
      (val) => val.endsWith('.db') || val.endsWith('.sqlite'),
      "DB_PATH should point to a .db or .sqlite file (e.g., './data/vpn.db')"
    ),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int('PORT must be an integer')
        .positive('PORT must be positive')
        .max(65535, 'PORT must be less than 65536')
    ),
  DOCKER_SOCKET_PATH: z
    .string()
    .min(1, 'DOCKER_SOCKET_PATH is required')
    .default('/var/run/docker.sock'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;

// ==================== Frontend Environment Schema ====================

export const frontendEnvSchema = z.object({
  VITE_API_URL: z
    .string()
    .url('VITE_API_URL must be a valid URL (e.g., http://localhost:3000)')
    .refine(
      (val) => val.startsWith('http://') || val.startsWith('https://'),
      'VITE_API_URL must start with http:// or https://'
    ),
  VITE_APP_NAME: z.string().optional().default('VPN Manager'),
  VITE_REFRESH_INTERVAL: z
    .string()
    .optional()
    .default('30000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});

export type FrontendEnv = z.infer<typeof frontendEnvSchema>;

// ==================== Validation Function ====================

/**
 * Validates environment variables against a Zod schema
 * @param schema - The Zod schema to validate against
 * @param env - The environment variables object (typically process.env)
 * @param context - Context name for error messages (e.g., 'Backend' or 'Frontend')
 * @returns The validated and parsed environment object
 * @throws Error with detailed validation messages if validation fails
 */
export function validateEnv<T extends z.ZodType>(
  schema: T,
  env: Record<string, unknown>,
  context: 'Backend' | 'Frontend' = 'Backend'
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.');
      const message = err.message;
      return `  - ${path ? `${path}: ` : ''}${message}`;
    });

    const errorMessage = [
      `${context} environment validation failed:`,
      '',
      ...errors,
      '',
      `Please check your .env file and ensure all required variables are set correctly.`,
    ].join('\n');

    throw new Error(errorMessage);
  }

  return result.data as z.infer<T>;
}

/**
 * Convenience function to validate backend environment
 * @param env - The environment variables (process.env)
 * @returns Validated backend environment object
 */
export function validateBackendEnv(env: Record<string, unknown>): BackendEnv {
  return validateEnv(backendEnvSchema, env, 'Backend');
}

/**
 * Convenience function to validate frontend environment
 * @param env - The environment variables (import.meta.env for Vite)
 * @returns Validated frontend environment object
 */
export function validateFrontendEnv(env: Record<string, unknown>): FrontendEnv {
  return validateEnv(frontendEnvSchema, env, 'Frontend');
}
