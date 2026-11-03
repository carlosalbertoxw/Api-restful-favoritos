# syntax=docker/dockerfile:1

# --- Dependencias de producción ---
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: ninguna dependencia de producción necesita scripts de
# instalación (solo @scarf/scarf, que envía telemetría).
RUN npm ci --omit=dev --ignore-scripts

# --- Imagen final ---
FROM node:26-alpine
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# La imagen oficial trae el usuario sin privilegios "node".
USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health', { signal: AbortSignal.timeout(4000) }).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Se ejecuta node directamente (sin npm) para que reciba SIGTERM y el
# servidor se cierre de forma ordenada con "docker stop".
CMD ["node", "src/server.js"]
