FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

# Compilar
RUN npm run build

# EXPOSICION DE PUERTO
EXPOSE 3000

# DIAGNÓSTICO FINAL: Mostrar qué se generó realmente
RUN echo "--- ESTRUCTURA DE DIST ---" && find dist -name "*.js" && echo "--------------------------"

# COMANDO INTELIGENTE:
# Usamos 'sh' para buscar dónde demonios quedó el server.js y ejecutarlo.
# Si está en dist/server.js o dist/src/server.js, esto lo encontrará.
CMD ["sh", "-c", "SCRIPT=$(find dist -name 'server.js' | head -n 1); if [ -z \"$SCRIPT\" ]; then SCRIPT=$(find dist -name 'Server.js' | head -n 1); fi; echo \"Ejecutando: $SCRIPT\"; node $SCRIPT"]