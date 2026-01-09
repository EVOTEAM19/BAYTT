# 🚀 Guía de Despliegue del Servidor de Ensamblaje

## 📋 Resumen

El servidor de ensamblaje (`assembly-server`) es un servicio separado que descarga, une y sube videos usando FFmpeg. Debe ejecutarse en un servidor con FFmpeg instalado.

## 🎯 Opciones de Despliegue

### Opción 1: Railway (Recomendado - Más Fácil)

1. **Crear cuenta en Railway**: https://railway.app
2. **Conectar repositorio**:
   - Haz click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio
   - Selecciona el directorio `assembly-server`

3. **Configurar variables de entorno**:
   ```
   PORT=3001
   ASSEMBLY_API_KEY=tu-api-key-super-secreta-aqui-genera-una-larga-y-aleatoria
   R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=tu-access-key-id-de-r2
   R2_SECRET_ACCESS_KEY=tu-secret-access-key-de-r2
   R2_BUCKET_NAME=baytt-movies
   R2_PUBLIC_URL=https://pub-xxx.r2.dev
   TEMP_DIR=/tmp/baytt-assembly
   ```

4. **Railway detectará el Dockerfile automáticamente** y construirá la imagen con FFmpeg incluido

5. **Obtener URL del servicio**:
   - Una vez desplegado, Railway te dará una URL como: `https://baytt-assembly.up.railway.app`
   - Copia esta URL

6. **Configurar en BAYTT**:
   Añade estas variables de entorno en tu proyecto BAYTT (Vercel o donde esté):
   ```
   ASSEMBLY_SERVER_URL=https://baytt-assembly.up.railway.app
   ASSEMBLY_API_KEY=la-misma-key-que-configuraste-en-railway
   ```

### Opción 2: Render

1. **Crear cuenta en Render**: https://render.com
2. **Nuevo Web Service** desde repositorio GitHub
3. **Configuración**:
   - **Build Command**: `cd assembly-server && npm install`
   - **Start Command**: `cd assembly-server && node index.js`
   - **Environment**: Docker (Render usará el Dockerfile)

4. **Variables de entorno**: Mismas que Railway

5. **Obtener URL** y configurar en BAYTT

### Opción 3: Fly.io

1. **Instalar flyctl**: https://fly.io/docs/hands-on/install-flyctl/
2. **Login**: `fly auth login`
3. **Crear app**: `fly launch` (en el directorio `assembly-server`)
4. **Configurar secrets**:
   ```bash
   fly secrets set ASSEMBLY_API_KEY=tu-key
   fly secrets set R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
   fly secrets set R2_ACCESS_KEY_ID=xxx
   fly secrets set R2_SECRET_ACCESS_KEY=xxx
   fly secrets set R2_BUCKET_NAME=baytt-movies
   fly secrets set R2_PUBLIC_URL=https://pub-xxx.r2.dev
   ```
5. **Desplegar**: `fly deploy`

### Opción 4: VPS propio (DigitalOcean, AWS EC2, etc.)

1. **Crear servidor** con Ubuntu 22.04
2. **Instalar Node.js 18+**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Instalar FFmpeg**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y ffmpeg
   ```
4. **Clonar repositorio**:
   ```bash
   git clone tu-repo
   cd baytt/assembly-server
   npm install
   ```
5. **Instalar PM2** (gestor de procesos):
   ```bash
   sudo npm install -g pm2
   ```
6. **Crear archivo `.env`** con las variables de entorno
7. **Iniciar con PM2**:
   ```bash
   pm2 start index.js --name baytt-assembly
   pm2 save
   pm2 startup
   ```
8. **Configurar Nginx** como reverse proxy (opcional pero recomendado):
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔐 Generar API Key Segura

```bash
# Opción 1: Usando OpenSSL
openssl rand -hex 32

# Opción 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 3: Usando Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Usa la misma key en:
- `ASSEMBLY_API_KEY` del servidor de ensamblaje
- `ASSEMBLY_API_KEY` de tu proyecto BAYTT

## ✅ Verificar Instalación

Una vez desplegado, verifica que funciona:

```bash
# Health check
curl https://tu-servidor.com/health

# Debería responder:
# {
#   "status": "ok",
#   "ffmpeg": true,
#   "encoders": 150,
#   "temp_dir": "/tmp/baytt-assembly",
#   "r2_configured": true
# }
```

## 🔧 Configurar Cloudflare R2

1. **Crear bucket en Cloudflare R2**:
   - Ve a Cloudflare Dashboard → R2
   - Crea un bucket llamado `baytt-movies`
   - Configura como público si necesitas URLs públicas

2. **Crear API Token**:
   - R2 → Manage R2 API Tokens
   - Create API Token
   - Permisos: Object Read & Write
   - Copia `Access Key ID` y `Secret Access Key`

3. **Configurar dominio público** (opcional):
   - Si quieres URLs públicas como `https://media.baytt.com/movies/xxx/final.mp4`
   - Configura un Custom Domain en R2

4. **Variables necesarias**:
   ```
   R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=tu-access-key-id
   R2_SECRET_ACCESS_KEY=tu-secret-access-key
   R2_BUCKET_NAME=baytt-movies
   R2_PUBLIC_URL=https://pub-xxx.r2.dev  # O tu dominio personalizado
   ```

## 🧪 Probar el Ensamblaje

Puedes probar manualmente el servidor:

```bash
curl -X POST https://tu-servidor.com/assemble \
  -H "Content-Type: application/json" \
  -d '{
    "movie_id": "test-movie-id",
    "api_key": "tu-api-key",
    "videos": [
      {
        "scene_number": 1,
        "video_url": "https://ejemplo.com/video1.mp4",
        "is_continuation": false
      },
      {
        "scene_number": 2,
        "video_url": "https://ejemplo.com/video2.mp4",
        "is_continuation": true
      }
    ]
  }'
```

## 📊 Monitoreo

- **Railway**: Dashboard incluye logs y métricas
- **Render**: Dashboard con logs
- **Fly.io**: `fly logs`
- **VPS**: `pm2 logs baytt-assembly` o `journalctl -u baytt-assembly`

## 🐛 Troubleshooting

### Error: "FFmpeg not found"
- Verifica que FFmpeg esté instalado: `ffmpeg -version`
- En Docker, asegúrate de que el Dockerfile instale FFmpeg

### Error: "R2 upload failed"
- Verifica que las credenciales de R2 sean correctas
- Verifica que el bucket exista y tenga permisos correctos
- Verifica que `R2_PUBLIC_URL` sea correcta

### Error: "Download failed"
- Algunos servidores bloquean descargas automáticas
- Verifica que las URLs de video sean accesibles públicamente
- Revisa logs para ver el error HTTP específico

### Timeout
- Aumenta el timeout del servicio (Railway/Render permiten configurarlo)
- Videos muy grandes pueden tardar mucho tiempo

## 🎯 Próximos Pasos

Una vez desplegado y configurado:

1. ✅ El servidor está corriendo y respondiendo en `/health`
2. ✅ Las variables de entorno están configuradas en BAYTT
3. ✅ Genera una película nueva en BAYTT
4. ✅ Verifica que el pipeline llame al servidor de ensamblaje
5. ✅ Verifica que el video final se suba a R2
6. ✅ Verifica que `movies.video_url` tenga la URL correcta
7. ✅ Prueba reproducir la película desde la página de inicio

## 📝 Notas Importantes

- El servidor necesita **al menos 2GB de RAM** para videos grandes
- Los videos temporales pueden ocupar espacio, el servidor los limpia automáticamente
- Considera configurar alertas si el servidor falla frecuentemente
- Para producción, considera usar un load balancer si tienes mucho tráfico
