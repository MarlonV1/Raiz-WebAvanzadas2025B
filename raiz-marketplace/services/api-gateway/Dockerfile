FROM node:20-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --omit=dev

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 8000

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Comando de inicio
CMD ["node", "src/index.js"]
