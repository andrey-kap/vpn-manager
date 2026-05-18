# Multi-stage Dockerfile for VPN Manager Server
# Node 18 Alpine with production optimizations

# ==================== Build Stage ====================
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/package*.json ./shared/ 2>/dev/null || true

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig.json ./

# Build the server
WORKDIR /app/server
RUN npm run build

# ==================== Production Stage ====================
FROM node:18-alpine AS production

# Install curl for healthcheck and runtime dependencies
RUN apk add --no-cache curl sqlite-libs

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared ./shared

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "server/dist/index.js"]
