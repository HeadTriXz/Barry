FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app

# Prune the source code
FROM base AS sourcer
RUN npm install --global turbo
COPY . .
RUN turbo prune --scope=barry --docker

# Install the dependencies
FROM base AS installer
COPY --from=sourcer /app/out/json/ /app/out/package-lock.json /app/tsconfig.json /app/tsup.config.ts ./
RUN npm ci --include=dev

# Build the project
FROM base AS builder
COPY --from=installer /app/ .
COPY --from=sourcer /app/out/full/ .
RUN npx turbo run build --filter=barry...

# Start the application
FROM base AS runner
RUN addgroup --system --gid 1001 headtrixz \
    && adduser --system --uid 1001 headtrixz
USER headtrixz

COPY --from=builder /app/ .
CMD npm start
