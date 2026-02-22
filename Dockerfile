# Multi-stage Dockerfile for Optimistic AI Oracle

# ============================================
# Stage 1: Build Smart Contracts
# ============================================
FROM node:18-alpine AS contracts-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy contract files
COPY contracts/ ./contracts/
COPY hardhat.config.js ./
COPY scripts/ ./scripts/

# Compile contracts
RUN npm run compile

# ============================================
# Stage 2: Build Frontend
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY absf-frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY absf-frontend/ ./

# Build frontend
RUN npm run build

# ============================================
# Stage 3: Production Image
# ============================================
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled contracts from builder
COPY --from=contracts-builder /app/artifacts ./artifacts
COPY --from=contracts-builder /app/contracts ./contracts

# Copy frontend build
COPY --from=frontend-builder /app/build ./frontend/build

# Copy necessary files
COPY hardhat.config.js ./
COPY scripts/ ./scripts/

# Expose ports
EXPOSE 3000 8545

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command
CMD ["npm", "run", "node"]
