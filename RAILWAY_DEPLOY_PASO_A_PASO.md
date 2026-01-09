# 🚂 Despliegue en Railway - Paso a Paso

## Paso 1: Crear Nuevo Proyecto para el Servidor de Ensamblaje

1. **En Railway Dashboard**, haz clic en el botón **"+ New"** (morado, arriba a la derecha)
2. Selecciona **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. **Autoriza Railway** si es la primera vez (permite acceso a tu repositorio)
5. **Selecciona tu repositorio** de BAYTT
6. Railway te preguntará qué desplegar. **NO despliegues todavía**.

## Paso 2: Configurar el Directorio Correcto

1. Railway mostrará una pantalla de configuración
2. En **"Root Directory"** o **"Source"**, selecciona o escribe: `assembly-server`
3. Esto le dice a Railway que solo despliegue la carpeta `assembly-server/`

## Paso 3: Configurar Variables de Entorno

Antes de desplegar, configura las variables:

1. En la configuración del proyecto, busca la sección **"Variables"** o **"Environment Variables"**
2. Haz clic en **"+ New Variable"** o **"Raw Editor"**
3. Añade estas variables:

```bash
PORT=3001

ASSEMBLY_API_KEY=b93a1f2c-edab-4cd7-9e97-30b08d595ae4

R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu-access-key-id-de-r2
R2_SECRET_ACCESS_KEY=tu-secret-access-key-de-r2
R2_BUCKET_NAME=baytt-movies
R2_PUBLIC_URL=https://pub-xxx.r2.dev

TEMP_DIR=/tmp/baytt-assembly
```

### 📝 Notas Importantes:

- **ASSEMBLY_API_KEY**: Usa el token que acabas de generar: `b93a1f2c-edab-4cd7-9e97-30b08d595ae4`
- **R2_* variables**: Aún no las tienes, pero puedes configurarlas después
  - Primero necesitas configurar Cloudflare R2 (ver abajo)
  - O puedes desplegar ahora y configurar R2 después

## Paso 4: Configurar Cloudflare R2 (Si aún no lo tienes)

### A. Crear Bucket en Cloudflare R2:

1. Ve a **Cloudflare Dashboard** → **R2**
2. Si no tienes R2 habilitado, actívalo
3. Haz clic en **"Create bucket"**
4. Nombre: `baytt-movies`
5. Configura como **público** (Settings → Public Access → Enable)

### B. Crear API Token:

1. En R2, ve a **"Manage R2 API Tokens"**
2. Haz clic en **"Create API Token"**
3. Configura:
   - **Permissions**: Object Read & Write
   - **TTL**: Sin límite (o el que prefieras)
4. **Guarda** el `Access Key ID` y `Secret Access Key` (solo se muestran una vez)

### C. Obtener Endpoint:

1. En R2, ve a **Settings**
2. Busca **"S3 API"**
3. Copia el **Endpoint** (ej: `https://abc123.r2.cloudflarestorage.com`)

### D. Obtener URL Pública:

1. En R2 → Settings → **Custom Domains** (opcional, pero recomendado)
   - Si tienes dominio: `media.baytt.com`
   - Si no: usa el formato: `https://pub-xxx.r2.dev` (reemplaza xxx con tu account ID)

## Paso 5: Añadir Variables de R2 a Railway

Una vez tengas las credenciales de R2:

1. Ve a tu proyecto en Railway
2. **Settings** → **Variables**
3. Añade las variables de R2 que faltaban:
   - `R2_ENDPOINT`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`

## Paso 6: Desplegar

1. En Railway, haz clic en **"Deploy"** o **"Save"**
2. Railway detectará el `Dockerfile` automáticamente
3. Espera a que termine el despliegue (puede tardar 2-5 minutos)
4. Una vez desplegado, Railway te dará una **URL** (ej: `https://baytt-assembly.up.railway.app`)

## Paso 7: Verificar que Funciona

1. **Copia la URL** del servicio (ej: `https://baytt-assembly-xxxxx.up.railway.app`)
2. **Prueba el health check**:
   ```bash
   curl https://tu-url-railway.com/health
   ```
   O simplemente abre la URL en el navegador y añade `/health` al final

3. **Deberías ver**:
   ```json
   {
     "status": "ok",
     "ffmpeg": true,
     "encoders": 150,
     "temp_dir": "/tmp/baytt-assembly",
     "r2_configured": true
   }
   ```

## Paso 8: Configurar en BAYTT

Ahora que tienes el servidor desplegado, configura BAYTT:

### Si BAYTT está en Vercel:

1. Ve a **Vercel Dashboard** → Tu proyecto BAYTT
2. **Settings** → **Environment Variables**
3. Añade:
   ```bash
   ASSEMBLY_SERVER_URL=https://tu-url-railway.com
   ASSEMBLY_API_KEY=b93a1f2c-edab-4cd7-9e97-30b08d595ae4
   ```
4. **IMPORTANTE**: Selecciona todos los entornos (Production, Preview, Development)
5. **Redeploy** el proyecto para que tome las nuevas variables

### Si BAYTT está en Railway también:

1. Ve al proyecto BAYTT en Railway
2. **Variables** → Añade las mismas variables
3. El proyecto se redeployará automáticamente

## ✅ Verificación Final

1. **Genera una película nueva** en BAYTT
2. **Observa los logs**:
   - En Railway (servidor de ensamblaje): Deberías ver logs de descarga y ensamblaje
   - En BAYTT: Deberías ver `[ASSEMBLER] ✅ REAL ASSEMBLY SUCCESSFUL!`
3. **Verifica en la BD**:
   ```sql
   SELECT video_url, duration_seconds 
   FROM movies 
   WHERE id = 'tu-movie-id';
   ```
   El `video_url` debería ser una URL de R2 (ej: `https://pub-xxx.r2.dev/movies/.../final.mp4`)

## 🐛 Troubleshooting

### Error: "Assembly server not configured"
- Verifica que `ASSEMBLY_SERVER_URL` esté en BAYTT
- Verifica que la URL sea correcta (sin trailing slash)
- Reinicia BAYTT después de añadir variables

### Error: "Invalid API key"
- Verifica que `ASSEMBLY_API_KEY` sea exactamente la misma en:
  - Railway (servidor de ensamblaje)
  - BAYTT (tu proyecto principal)
- No debe tener espacios ni saltos de línea

### Error: "R2 upload failed"
- Verifica que todas las variables de R2 estén configuradas en Railway
- Verifica que el bucket `baytt-movies` exista
- Verifica permisos del API token

### El servidor no responde en `/health`
- Verifica que el despliegue terminó correctamente
- Revisa los logs de Railway para ver errores
- Verifica que el puerto sea 3001

## 📋 Checklist Final

- [ ] Proyecto creado en Railway
- [ ] Directorio `assembly-server` configurado
- [ ] Variables de entorno configuradas
- [ ] Cloudflare R2 configurado (bucket + tokens)
- [ ] Servidor desplegado y respondiendo en `/health`
- [ ] Variables configuradas en BAYTT
- [ ] BAYTT redeployado
- [ ] Probado generando una película

---

**¡Listo! Una vez completados estos pasos, el ensamblaje funcionará automáticamente.**
