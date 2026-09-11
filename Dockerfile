# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:20-slim AS builder
WORKDIR /app

# Instalar herramientas para compilar módulos nativos (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json tsconfig*.json ./
RUN npm ci

COPY . .

# Compila el cliente SPA a dist/client y el servidor Node a dist/server
RUN npm run build

# Poda dependencias de desarrollo conservando únicamente las de producción
RUN npm prune --omit=dev

# ==========================================
# Stage 2: Runner de Producción
# ==========================================
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar manifiestos y dependencias de producción ya podadas
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copiar artefactos de compilación (dist/client y dist/server)
COPY --from=builder /app/dist ./dist

# CRÍTICO: Copiar archivos de migraciones SQL para ejecución automática en arranque
COPY --from=builder /app/drizzle ./drizzle

# Crear directorio de persistencia SQLite y asignar permisos al usuario no root node
RUN mkdir -p /app/data && chown -R node:node /app/data

# Ejecutar como usuario no privilegiado
USER node

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "dist/server/node-entry.js"]
