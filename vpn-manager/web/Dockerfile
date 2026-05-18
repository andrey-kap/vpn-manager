# Multi-stage Dockerfile for VPN Manager Web Frontend
# Build with Node, serve with Nginx

# ==================== Build Stage ====================
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./
COPY web/package*.json ./web/
COPY shared/package*.json ./shared/ 2>/dev/null || true

# Install all dependencies
RUN npm ci

# Copy source code
COPY web/ ./web/
COPY shared/ ./shared/
COPY tsconfig.json ./

# Build the frontend
WORKDIR /app/web
RUN npm run build

# ==================== Production Stage (Nginx) ====================
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder /app/web/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ==================== Alternative: Serve via Backend ====================
# If you prefer to serve static files through @fastify/static on the backend:
# 1. Comment out or remove the 'web' service in docker-compose.yml
# 2. Uncomment the 'web-via-api' service in docker-compose.yml
# 3. Add @fastify/static to server dependencies:
#    npm install @fastify/static
# 4. In server/src/index.ts, add:
#    ```typescript
#    import fastifyStatic from '@fastify/static';
#    import path from 'path';
#    import { fileURLToPath } from 'url';
#    
#    const __dirname = path.dirname(fileURLToPath(import.meta.url));
#    
#    // Register static file serving
#    await fastify.register(fastifyStatic, {
#      root: path.join(__dirname, '../../web/dist'),
#      prefix: '/',
#      wildcard: false, // Don't serve files for API routes
#    });
#    
#    // Serve index.html for all non-API routes (SPA routing)
#    fastify.setNotFoundHandler((request, reply) => {
#      if (!request.url.startsWith('/api')) {
#        reply.sendFile('index.html');
#      } else {
#        reply.code(404).send({ error: 'Not Found' });
#      }
#    });
#    ```
# 5. Update vite.config.ts base path if needed:
#    ```typescript
#    export default defineConfig({
#      base: '/',
#      // ... rest of config
#    });
#    ```
