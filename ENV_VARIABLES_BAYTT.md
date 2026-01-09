# 🔐 Variables de Entorno para BAYTT

## Variables Necesarias para el Ensamblaje Real

Añade estas variables a tu proyecto BAYTT (Vercel, Railway, etc.):

```bash
# URL del servidor de ensamblaje FFmpeg
ASSEMBLY_SERVER_URL=https://baytt-assembly.up.railway.app

# API Key para autenticar con el servidor (debe ser la misma que en el servidor)
ASSEMBLY_API_KEY=tu-api-key-super-secreta-aqui-genera-una-larga-y-aleatoria
```

## Cómo Obtener estos Valores

1. **ASSEMBLY_SERVER_URL**: 
   - Despliega el servidor de ensamblaje (ver `DEPLOY_ASSEMBLY_SERVER.md`)
   - Copia la URL que te da Railway/Render/Fly.io
   - Ejemplo: `https://baytt-assembly.up.railway.app`

2. **ASSEMBLY_API_KEY**:
   - Genera una key segura:
     ```bash
     openssl rand -hex 32
     # O
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Usa la MISMA key en:
     - El servidor de ensamblaje (`assembly-server/.env`)
     - Tu proyecto BAYTT (esta variable de entorno)

## Verificar que Funciona

Una vez configuradas las variables:

1. Verifica que el servidor responde:
   ```bash
   curl https://tu-servidor.com/health
   ```

2. Genera una película nueva en BAYTT
3. Verifica los logs del pipeline:
   - Debería mostrar: `[ASSEMBLER] Calling assembly server: ...`
   - Debería mostrar: `[ASSEMBLER] ✅ REAL ASSEMBLY SUCCESSFUL!`

4. Verifica que el video se subió a R2:
   - Revisa el bucket `baytt-movies` en Cloudflare R2
   - Debería haber un archivo: `movies/{movie_id}/final.mp4`

5. Verifica que `movies.video_url` tiene la URL correcta:
   ```sql
   SELECT id, title, video_url, duration_seconds 
   FROM movies 
   WHERE id = 'tu-movie-id';
   ```

## Troubleshooting

### Error: "Assembly server not configured"
- Verifica que `ASSEMBLY_SERVER_URL` esté configurada
- Verifica que `ASSEMBLY_API_KEY` esté configurada
- Reinicia el servidor después de añadir variables

### Error: "Invalid API key"
- Verifica que `ASSEMBLY_API_KEY` sea la MISMA en ambos lugares
- No debe tener espacios ni saltos de línea
- Debe ser exactamente la misma string

### Error: "Connection refused" o "ECONNREFUSED"
- Verifica que el servidor de ensamblaje esté corriendo
- Verifica que la URL sea correcta (no tenga trailing slash)
- Verifica que el firewall permita conexiones salientes

### Error: "Timeout"
- El ensamblaje puede tardar varios minutos para videos largos
- Considera aumentar el timeout de tu plataforma (Vercel: 60s máximo, usa Edge Functions o Background Jobs)
