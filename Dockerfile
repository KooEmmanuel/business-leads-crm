# Stage 1: Build
FROM node:24-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the code
COPY . .

# Build frontend and backend
RUN pnpm build

# Stage 2: Runtime
FROM node:24-slim

# Install pnpm for any runtime needs
RUN npm install -g pnpm

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Expose the app port
EXPOSE 3000

# Run migrations and start the application
CMD pnpm drizzle-kit migrate && pnpm start
