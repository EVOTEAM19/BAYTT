# ✅ Setup Completo del Sistema de Ensamblaje

## 📋 Checklist de Configuración

### 1. ✅ Servidor de Ensamblaje Creado
- [x] `assembly-server/` creado con todos los archivos
- [x] Dockerfile configurado
- [x] Package.json con dependencias
- [x] README con documentación completa

### 2. ⏳ Desplegar Servidor de Ensamblaje

#### Opción A: Railway (Recomendado)

```bash
1. Ve a https://railway.app
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project" → "Deploy from GitHub repo"
4. Conecta tu repositorio de GitHub
5. Selecciona el directorio: assembly-server/
6. Railway detectará el Dockerfile automáticamente
7. Configura las variables de entorno (ver abajo)
8. Espera a que se despliegue
9. Copia la URL que te da Railway (ej: https://baytt-assembly.up.railway.app)
```

**Variables de entorno en Railway:**
```
PORT=3001
ASSEMBLY_API_KEY=<genera-una-key-larga-y-secreta>
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu-access-key-id
R2_SECRET_ACCESS_KEY=tu-secret-access-key
R2_BUCKET_NAME=baytt-movies
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

#### Opción B: Render

```bash
1. Ve a https://render.com
2. Crea una cuenta
3. New → Web Service
4. Conecta tu repositorio de GitHub
5. Configuración:
   - Build Command: cd assembly-server && npm install
   - Start Command: cd assembly-server && node index.js
   - Environment: Docker
6. Configura las mismas variables de entorno
7. Despliega y copia la URL
```

### 3. ⏳ Configurar Cloudflare R2

1. **Ve a Cloudflare Dashboard** → R2
2. **Crea un bucket** llamado `baytt-movies`
3. **Configura como público** (para URLs públicas):
   - Settings → Public Access → Enable
4. **Crea API Token**:
   - Manage R2 API Tokens → Create API Token
   - Permisos: Object Read & Write
   - Copia `Access Key ID` y `Secret Access Key`
5. **Obtén el Endpoint**:
   - Settings → S3 API → Endpoint
   - Copia la URL completa (ej: `https://xxx.r2.cloudflarestorage.com`)
6. **Configura dominio público** (opcional pero recomendado):
   - Settings → Custom Domains
   - Añade un dominio como `media.baytt.com`
   - Configura DNS según las instrucciones

### 4. ⏳ Configurar Variables en BAYTT

En tu proyecto BAYTT (Vercel, Railway, etc.):

**Variables de entorno necesarias:**

```bash
# URL del servidor de ensamblaje (obtenida en el paso 2)
ASSEMBLY_SERVER_URL=https://baytt-assembly.up.railway.app

# API Key (LA MISMA que configuraste en el servidor de ensamblaje)
ASSEMBLY_API_KEY=<la-misma-key-que-en-el-servidor>

# Ya deberías tener estas de otras configuraciones:
# Supabase, Runway, FAL.AI, etc.
```

### 5. ✅ Verificar Instalación

#### A. Verificar Servidor de Ensamblaje

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

#### B. Verificar Variables en BAYTT

```bash
# En los logs de BAYTT al iniciar, deberías ver:
# [ASSEMBLER] Assembly server configured: https://...
```

#### C. Probar Ensamblaje Completo

1. **Genera una película nueva** desde el dashboard
2. **Observa los logs**:
   ```
   [ASSEMBLER] Calling assembly server: https://...
   [ASSEMBLER] ✅ REAL ASSEMBLY SUCCESSFUL!
   [ASSEMBLER]   - URL: https://r2.baytt.com/movies/xxx/final.mp4
   [ASSEMBLER]   - Duration: 45s
   ```
3. **Verifica en la base de datos**:
   ```sql
   SELECT id, title, video_url, duration_seconds, status 
   FROM movies 
   WHERE id = 'tu-movie-id';
   ```
4. **Verifica en R2**:
   - Ve a Cloudflare R2 → baytt-movies
   - Debería haber: `movies/{movie_id}/final.mp4`
5. **Prueba reproducción**:
   - Ve a la página de la película
   - Haz clic en "Reproducir Película Completa"
   - Debería reproducir el video completo ensamblado

## 🔧 Troubleshooting

### ❌ Error: "Assembly server not configured"

**Solución:**
- Verifica que `ASSEMBLY_SERVER_URL` esté configurada
- Verifica que `ASSEMBLY_API_KEY` esté configurada
- Reinicia el servidor después de añadir variables

### ❌ Error: "Invalid API key"

**Solución:**
- Verifica que la misma key esté en:
  1. Servidor de ensamblaje (`ASSEMBLY_API_KEY`)
  2. Proyecto BAYTT (`ASSEMBLY_API_KEY`)
- No debe tener espacios ni saltos de línea
- Debe ser exactamente la misma string

### ❌ Error: "Connection refused" o "ECONNREFUSED"

**Solución:**
- Verifica que el servidor de ensamblaje esté corriendo
- Verifica que la URL sea correcta (sin trailing slash)
- Verifica que el firewall permita conexiones salientes
- Prueba `curl https://tu-servidor.com/health`

### ❌ Error: "R2 upload failed"

**Solución:**
- Verifica credenciales de R2 en el servidor de ensamblaje
- Verifica que el bucket `baytt-movies` exista
- Verifica permisos del API token (Object Read & Write)
- Verifica que `R2_PUBLIC_URL` sea correcta

### ❌ Error: "FFmpeg not found"

**Solución:**
- En Railway/Render: El Dockerfile instala FFmpeg automáticamente
- Si usas VPS: `sudo apt-get install ffmpeg`
- Verifica: `ffmpeg -version`

### ❌ Error: "Download failed" al descargar videos de Runway

**Solución:**
- Verifica que las URLs de video sean accesibles
- Algunos servidores bloquean descargas automáticas
- Revisa logs del servidor para ver el error HTTP específico
- Verifica que las URLs no hayan expirado

### ❌ Error: "Timeout" en el ensamblaje

**Solución:**
- El ensamblaje puede tardar varios minutos
- Aumenta el timeout del servicio (Railway permite configurarlo)
- Para videos muy largos, considera aumentar recursos del servidor
- Revisa logs del servidor para ver dónde se queda bloqueado

### ❌ Video no se reproduce en el frontend

**Solución:**
1. Verifica que `movies.video_url` tenga una URL válida
2. Verifica que la URL sea accesible públicamente
3. Verifica CORS en R2 (debe estar habilitado)
4. Revisa la consola del navegador para ver errores
5. Prueba la URL directamente en el navegador

## 📊 Monitoreo

### Logs del Servidor de Ensamblaje

**Railway:**
- Dashboard → Logs (tiempo real)
- Métricas de CPU/RAM

**Render:**
- Dashboard → Logs
- Métricas disponibles

**VPS con PM2:**
```bash
pm2 logs baytt-assembly
pm2 monit
```

### Logs de BAYTT

En Vercel:
- Dashboard → Deployments → View Function Logs
- Busca logs con `[ASSEMBLER]` o `[PIPELINE]`

## ✅ Estado Final Esperado

Cuando todo esté configurado correctamente:

1. ✅ Servidor de ensamblaje corriendo y respondiendo en `/health`
2. ✅ Variables de entorno configuradas en ambos proyectos
3. ✅ R2 configurado con bucket y credenciales
4. ✅ Al generar una película:
   - Las escenas se generan individualmente
   - El pipeline llama al servidor de ensamblaje
   - El servidor descarga, une y sube el video
   - `movies.video_url` tiene la URL del video completo
   - La película se reproduce completa desde la página de inicio
5. ✅ No más errores de CORS (video está en R2)
6. ✅ No más reproducción secuencial (video está ensamblado)

## 🎉 ¡Todo Listo!

Una vez completado el setup, el sistema funcionará automáticamente:
- Genera escenas → Ensambla con FFmpeg → Sube a R2 → Reproduce completo
