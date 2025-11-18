##############################################
# STAGE 1 — BUILD
##############################################
FROM node:18 AS builder

WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código completo
COPY . .

# Compilar TypeScript
RUN npm run build


##############################################
# STAGE 2 — PRODUCTION IMAGE
##############################################
FROM node:18-slim AS production

WORKDIR /app

# Copiar solo dependencias necesarias
COPY package*.json ./
RUN npm install --omit=dev

# Copiar la carpeta compilada
COPY --from=builder /app/dist ./dist

# Puerto expuesto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/server.js"]
