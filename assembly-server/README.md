# 🎬 BAYTT Assembly Server

Servidor de ensamblaje de videos con FFmpeg para BAYTT.

## 🚀 Funcionalidades

- ✅ Descarga videos de múltiples fuentes (Runway, etc.)
- ✅ Concatena videos con FFmpeg
- ✅ Sube videos finales a Cloudflare R2
- ✅ Health checks y logging detallado

## 📋 Requisitos

- Node.js 18+
- FFmpeg instalado
- Cuenta de Cloudflare R2 configurada

## 🔧 Instalación Local

```bash
# Instalar dependencias
npm install

# Instalar FFmpeg
# macOS:
brew install ffmpeg

# Ubuntu/Debian:
sudo apt-get install ffmpeg

# Windows:
# Descargar de https://ffmpeg.org/download.html
```

## ⚙️ Configuración

Crear archivo `.env`:

```env
PORT=3001
ASSEMBLY_API_KEY=tu-api-key-super-secreta-aqui
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu-access-key-id
R2_SECRET_ACCESS_KEY=tu-secret-access-key
R2_BUCKET_NAME=baytt-movies
R2_PUBLIC_URL=https://pub-xxx.r2.dev
TEMP_DIR=/tmp/baytt-assembly
```

## 🏃 Ejecución

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🐳 Docker

```bash
# Construir imagen
docker build -t baytt-assembly-server .

# Ejecutar contenedor
docker run -p 3001:3001 \
  -e ASSEMBLY_API_KEY=tu-key \
  -e R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com \
  -e R2_ACCESS_KEY_ID=xxx \
  -e R2_SECRET_ACCESS_KEY=xxx \
  -e R2_BUCKET_NAME=baytt-movies \
  -e R2_PUBLIC_URL=https://pub-xxx.r2.dev \
  baytt-assembly-server
```

## 🚂 Desplegar en Railway

1. Conecta tu repositorio de GitHub a Railway
2. Selecciona el directorio `assembly-server`
3. Configura las variables de entorno
4. Railway detectará el Dockerfile automáticamente
5. Obtén la URL del despliegue (ej: `https://baytt-assembly.up.railway.app`)

## 📡 API

### POST /assemble

Ensambla múltiples videos en uno solo.

**Request:**
```json
{
  "movie_id": "uuid-del-movie",
  "api_key": "tu-api-key",
  "videos": [
    {
      "scene_number": 1,
      "video_url": "https://runway.com/video1.mp4",
      "is_continuation": false
    },
    {
      "scene_number": 2,
      "video_url": "https://runway.com/video2.mp4",
      "is_continuation": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "video_url": "https://r2.baytt.com/movies/uuid/final.mp4",
  "duration_seconds": 45,
  "file_size_bytes": 15728640,
  "scenes_count": 2,
  "elapsed_seconds": 12.5
}
```

### GET /health

Health check del servidor.

**Response:**
```json
{
  "status": "ok",
  "ffmpeg": true,
  "encoders": 150,
  "temp_dir": "/tmp/baytt-assembly",
  "r2_configured": true
}
```

### GET /version

Versión de FFmpeg y Node.

**Response:**
```json
{
  "ffmpeg_available": true,
  "codecs_count": 200,
  "node_version": "v18.17.0"
}
```

## 🔒 Seguridad

- Usa una API key fuerte (mínimo 32 caracteres aleatorios)
- No expongas el servidor públicamente sin autenticación
- Usa HTTPS en producción
- Limita el tamaño de los archivos descargados

## 🐛 Troubleshooting

### FFmpeg no encontrado
```bash
# Verificar instalación
ffmpeg -version

# Instalar si falta
# macOS:
brew install ffmpeg

# Ubuntu:
sudo apt-get install ffmpeg
```

### Error de memoria
Aumenta el límite de memoria de Node:
```bash
node --max-old-space-size=4096 index.js
```

### Error de descarga
- Verifica que las URLs de video sean accesibles
- Revisa logs para ver errores HTTP específicos
- Algunos servidores bloquean descargas automáticas

## 📝 Logs

El servidor genera logs detallados:
- `[ASSEMBLY SERVER]`: Información del servidor
- `[ASSEMBLY]`: Proceso de ensamblaje
- `[DOWNLOAD]`: Descarga de videos
- `[ASSEMBLY] ✅`: Éxito
- `[ASSEMBLY] ❌`: Error

## 🎯 Próximas Mejoras

- [ ] Soporte para transiciones personalizadas
- [ ] Encoding en múltiples calidades (720p, 1080p, 4K)
- [ ] Soporte para audio de fondo
- [ ] Mejora de color grading
- [ ] Webhooks para notificar cuando termine
