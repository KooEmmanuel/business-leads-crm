# Stage 1: Build
FROM node:24-slim AS builder

# Enable corepack and prepare the pnpm version specified in package.json
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

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

# Enable corepack for runtime dependencies
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

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
CMD ["sh", "-c", "pnpm drizzle-kit migrate && pnpm start"]
