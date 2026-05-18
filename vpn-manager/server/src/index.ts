/**
 * VPN Manager Server Entry Point
 * Initializes Fastify with CORS, rate limiting, and routes
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { validateBackendEnv } from '@shared/env.schema';
import { initializeDatabase, closeDatabase } from './db.js';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';

// Load environment variables
dotenv.config();

// Validate environment
const env = validateBackendEnv(process.env);

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: env.LOG_LEVEL || 'info',
  },
});

// Register CORS plugin
async function setupCors(): Promise<void> {
  const frontendUrl = process.env.VITE_API_URL;
  
  await fastify.register(cors, {
    origin: frontendUrl ? [frontendUrl] : true, // Allow all in dev if not specified
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  
  fastify.log.info({ origin: frontendUrl || 'all' }, 'CORS configured');
}

// Register rate limiting plugin
async function setupRateLimit(): Promise<void> {
  await fastify.register(rateLimit, {
    max: 100, // Default limit for most routes
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1'], // Whitelist localhost
    errorResponseBuilder: (request, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Please try again after ${context.after}`,
        },
      };
    },
  });
  
  fastify.log.info('Rate limiting configured');
}

// Register routes
async function setupRoutes(): Promise<void> {
  await fastify.register(authRoutes);
  fastify.log.info('Auth routes registered');
  
  await fastify.register(userRoutes);
  fastify.log.info('User routes registered');
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  fastify.log.info({ signal }, 'Received shutdown signal');
  
  try {
    // Close Fastify server
    await fastify.close();
    fastify.log.info('Fastify server closed');
    
    // Close database connection
    closeDatabase();
    fastify.log.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    fastify.log.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// Main startup function
async function start(): Promise<void> {
  try {
    // Initialize database
    initializeDatabase();
    fastify.log.info('Database initialized');
    
    // Setup plugins
    await setupCors();
    await setupRateLimit();
    
    // Setup routes
    await setupRoutes();
    
    // Add health check endpoint
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });
    
    // Start server
    const port = env.PORT;
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info({ port, host }, 'Server started successfully');
    
    // Register signal handlers for graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    fastify.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();
