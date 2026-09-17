# syntax=docker/dockerfile:1

# --- Dependencias de producción ---
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: ninguna dependencia de producción necesita scripts de
# instalación (solo @scarf/scarf, que envía telemetría).
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# --- Imagen final ---
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# La imagen oficial trae el usuario sin privilegios "node".
USER node
EXPOSE 5000

# Liveness con node:http (la imagen alpine no trae curl). Se usa exitCode en
# lugar de process.exit() para dejar que el proceso cierre sus sockets.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('node:http').get('http://127.0.0.1:' + process.env.PORT + '/health', (r) => { process.exitCode = r.statusCode === 200 ? 0 : 1; r.resume(); }).on('error', () => { process.exitCode = 1; }).setTimeout(4000, function () { this.destroy(new Error('timeout')); })"

# Se ejecuta node directamente (sin npm) para que reciba SIGTERM y el
# servidor se cierre de forma ordenada con "docker stop".
CMD ["node", "src/server.js"]
