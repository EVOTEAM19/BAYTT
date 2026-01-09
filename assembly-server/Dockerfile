FROM node:18-alpine

# Instalar FFmpeg y dependencias necesarias
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    python3 \
    make \
    g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY . .

# Crear directorio temporal
RUN mkdir -p /tmp/baytt-assembly

# Exponer puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "index.js"]
