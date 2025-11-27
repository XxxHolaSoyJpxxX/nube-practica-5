# Actividad 1 y 4: Dockerfile
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Compilar TypeScript (Asumiendo que tienes un script "build" en package.json)
# Si no usas TS compilado, puedes omitir este paso y usar ts-node o node directo si es JS
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Definir comando de inicio
CMD ["node", "dist/server.js"]