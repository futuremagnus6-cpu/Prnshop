FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production deps and source
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create uploads and logs directories
RUN mkdir -p uploads logs && chown -R appuser:appgroup uploads logs

USER appuser

EXPOSE 5000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
