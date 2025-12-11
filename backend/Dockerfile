# Backend Dockerfile for AI Data Assistant

# 1. Base stage for installing dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package-lock.json* ./backend/
COPY shared/package.json shared/package-lock.json* ./shared/

# Install workspace dependencies (backend + shared)
RUN npm install --workspaces --include-workspace-root


# 2. Builder stage for building the application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY --from=deps /app/shared/package.json ./shared/package.json

# Copy source code for shared and backend
COPY shared/tsconfig.json ./shared/tsconfig.json
COPY shared/src ./shared/src
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src

# Build shared first
RUN cd shared && npm run build

# Build backend inside its workspace folder
RUN cd backend && npm run build


# 3. Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy built application and production node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/package.json ./package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start application
CMD [ "node", "dist/index.js" ]
