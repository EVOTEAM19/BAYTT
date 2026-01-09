# ✅ Pasos Finales: Completar Configuración del Servidor de Ensamblaje

## 🎯 Resumen de lo que ya tienes:

✅ Cloudflare R2 configurado:
- Bucket: `baytt-storage`
- Endpoint: `https://bbe12a0259a64824ec97d4203ff5065.2.cloudflarestorage.com`
- Access Key ID: `980b40cb5ab978c7b51657a6cb027cb7`
- Secret Access Key: `b54c569604df03dde9116072032442e6e7027ecf3a5b50c3e7c023167fe72ef4`
- Public URL: `https://pub-a95bf11c2a5b4482bab51e97f8ad2d2c.r2.dev`

✅ Variables configuradas en Railway:
- R2_ENDPOINT
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME = `baytt-storage`
- R2_PUBLIC_URL = `https://pub-a95bf11c2a5b4482bab51e97f8ad2d2c.r2.dev`
- ASSEMBLY_API_KEY = `3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1`
- PORT = `3001`

✅ Root Directory configurado: `assembly-server`

---

## 🔍 Paso 1: Obtener la URL del Servidor de Railway

1. Ve a Railway → Tu proyecto "zesty-generosity"
2. Haz clic en el servicio "BAYTT"
3. Ve a la pestaña **"Settings"** o busca **"Domains"**
4. Busca **"Generate Domain"** o la URL que ya está generada
5. **Copia la URL** completa (ejemplo: `https://baytt-production.up.railway.app`)

Esta URL es tu **`ASSEMBLY_SERVER_URL`**.

---

## ✅ Paso 2: Verificar que el Servidor Esté Corriendo

1. En Railway, ve a la pestaña **"Deployments"** o **"Logs"**
2. Verifica que veas:
   - Estado: **"Active"** o **"Running"**
   - En los logs deberías ver: `[ASSEMBLY SERVER] Running on port 3001`
3. Si hay errores, compártelos

---

## 🧪 Paso 3: Probar el Endpoint de Health

1. Una vez tengas la URL del servidor (ej: `https://baytt-production.up.railway.app`)
2. Abre en el navegador: `https://tu-url-railway.up.railway.app/health`
3. Deberías ver: `{"status":"ok","ffmpeg":true}`

Si funciona, ¡el servidor está listo! ✅

---

## 📝 Paso 4: Configurar ASSEMBLY_SERVER_URL en BAYTT Local

### Opción A: Si usas `.env.local` (Recomendado)

1. En tu proyecto BAYTT local, crea o edita el archivo `.env.local`
2. Añade estas líneas:

```bash
# URL del servidor de ensamblaje (la URL que obtuviste de Railway)
ASSEMBLY_SERVER_URL=https://tu-url-railway.up.railway.app

# API Key (la MISMA que configuraste en Railway)
ASSEMBLY_API_KEY=3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1
```

3. **Reemplaza** `https://tu-url-railway.up.railway.app` con la URL real que obtuviste en el Paso 1

### Opción B: Si despliegas BAYTT en Vercel/Railway

1. Ve a tu proyecto BAYTT en Vercel/Railway
2. Settings → Environment Variables
3. Añade:
   - `ASSEMBLY_SERVER_URL` = `https://tu-url-railway.up.railway.app`
   - `ASSEMBLY_API_KEY` = `3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1`
4. Guarda y redeploya

---

## ✅ Paso 5: Verificar Todo Funciona

### A. Verificar Servidor de Ensamblaje:

```bash
# Prueba el endpoint de health
curl https://tu-url-railway.up.railway.app/health

# Debería responder:
# {"status":"ok","ffmpeg":true}
```

### B. Crear una Película de Prueba en BAYTT:

1. Ve a tu aplicación BAYTT
2. Crea una película nueva (puede ser corta, 2-3 escenas)
3. Observa los logs del pipeline:
   - Debería mostrar: `[ASSEMBLER] Calling assembly server: https://...`
   - Debería mostrar: `[ASSEMBLER] ✅ REAL ASSEMBLY SUCCESSFUL!`
   - Debería mostrar: `[ASSEMBLER] Video URL: https://pub-a95bf11c2a5b4482bab51e97f8ad2d2c.r2.dev/movies/...`

### C. Verificar que el Video se Subió a R2:

1. Ve a Cloudflare → R2 → `baytt-storage`
2. Busca la carpeta `movies/`
3. Deberías ver: `movies/{movie-id}/final.mp4`

### D. Verificar en la Base de Datos:

```sql
SELECT id, title, video_url, duration_seconds, file_size_bytes
FROM movies
WHERE id = 'tu-movie-id'
ORDER BY created_at DESC
LIMIT 1;
```

El campo `video_url` debería tener una URL tipo:
```
https://pub-a95bf11c2a5b4482bab51e97f8ad2d2c.r2.dev/movies/{movie-id}/final.mp4
```

---

## 🐛 Troubleshooting

### Error: "Assembly server not configured"
- ✅ Verifica que `ASSEMBLY_SERVER_URL` esté configurada en `.env.local` o variables de entorno
- ✅ Reinicia el servidor de desarrollo: `npm run dev`

### Error: "Invalid API key" o "401 Unauthorized"
- ✅ Verifica que `ASSEMBLY_API_KEY` sea **EXACTAMENTE** la misma en Railway y en BAYTT
- ✅ No debe tener espacios ni saltos de línea
- ✅ Debe ser: `3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1`

### Error: "Connection refused" o "ECONNREFUSED"
- ✅ Verifica que el servidor en Railway esté corriendo (ve a Logs)
- ✅ Verifica que la URL no tenga trailing slash: `https://...up.railway.app` (sin `/` al final)
- ✅ Prueba el endpoint `/health` en el navegador

### Error: "Timeout" al ensamblar
- ⚠️ El ensamblaje puede tardar varios minutos (2-10 minutos dependiendo del número de escenas)
- ⚠️ Vercel tiene un límite de 60 segundos para Serverless Functions
- ✅ Considera usar Background Jobs o Edge Functions para el pipeline

### Error: "R2 configuration missing" en Railway
- ✅ Verifica que todas las variables de R2 estén configuradas correctamente en Railway
- ✅ Verifica que `R2_BUCKET_NAME` sea exactamente `baytt-storage`

---

## 🎉 ¡Listo!

Una vez completados estos pasos, el sistema de ensamblaje real debería funcionar:

1. ✅ Pipeline genera videos de escenas
2. ✅ Pipeline llama al servidor FFmpeg en Railway
3. ✅ Servidor descarga videos, los une con FFmpeg, y sube a R2
4. ✅ URL final guardada en `movies.video_url`
5. ✅ Reproducción desde la pantalla de película completa

---

**¿Necesitas ayuda? Comparte:**
- La URL del servidor que obtuviste de Railway
- Cualquier error que veas en los logs
- Screenshot de la configuración si algo no funciona
