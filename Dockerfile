FROM node:18-alpine

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
# Copiar configuración de TS
COPY tsconfig.json ./

RUN npm install

# Copiar todo el código fuente
COPY . .

# Compilar
RUN npm run build

EXPOSE 3000

# DIAGNÓSTICO: Listar archivos para ver si se generó server.js o Server.js
RUN echo "--- CONTENIDO DE DIST ---" && ls -R dist && echo "-----------------------"

# Iniciar servidor
CMD ["node", "dist/server.js"]