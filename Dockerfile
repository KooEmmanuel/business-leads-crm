# Stage 1: Build
FROM node:24-slim AS builder

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy package files AND the patches directory
# This is required because pnpm needs the patches to install dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the code
COPY . .

# Build frontend and backend
RUN pnpm build

# Stage 2: Runtime
FROM node:24-slim

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy built assets and necessary files for migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/patches ./patches

# Install all dependencies (vite and other build tools are needed at runtime)
RUN pnpm install --frozen-lockfile
 
# Expose the app port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "pnpm drizzle-kit migrate && pnpm start"]
