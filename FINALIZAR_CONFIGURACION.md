# 🚀 Finalizar Configuración del Servidor de Ensamblaje

## ✅ Lo que ya tienes:

- **URL del servidor**: `https://baytt-production.up.railway.app`
- **Variables configuradas en Railway**: ✅
- **Root Directory**: `assembly-server` ✅

---

## 🔧 Paso 1: Desplegar los Cambios Pendientes

En Railway, veo que hay **"8 Changes"** pendientes. Necesitas desplegarlos:

1. En Railway, en la parte superior donde dice **"Apply 8 changes"**
2. Haz clic en **"Deploy"** o **"Deploy +Enter"**
3. Espera a que el deploy termine (puede tardar 2-5 minutos)

---

## 🔍 Paso 2: Verificar el Puerto

1. En Railway → Settings → Busca **"Port"** o **"Expose Port"**
2. Verifica que el puerto sea **`3001`**
3. Si no está configurado, añade una variable de entorno:
   - Variable: `PORT`
   - Valor: `3001`

**O verifica en "Networking":**
- En la sección "Public Networking"
- Debería decir "Port: 3001" o "Expose Port: 3001"

---

## 📋 Paso 3: Verificar Logs

1. Ve a la pestaña **"Logs"** en Railway
2. Busca mensajes como:
   - `[ASSEMBLY SERVER] Running on port 3001`
   - `[ASSEMBLY SERVER] R2 Endpoint: https://...`
3. Si ves errores, compártelos

---

## ✅ Paso 4: Probar el Endpoint /health

Después del deploy, prueba:

```bash
curl https://baytt-production.up.railway.app/health
```

O abre en el navegador:
```
https://baytt-production.up.railway.app/health
```

**Debería responder:**
```json
{"status":"ok","ffmpeg":true}
```

---

## 📝 Paso 5: Configurar ASSEMBLY_SERVER_URL en BAYTT Local

Una vez que el servidor esté corriendo:

### Opción A: Archivo .env.local (Si trabajas localmente)

1. En tu proyecto BAYTT, crea/edita `.env.local`
2. Añade:

```bash
ASSEMBLY_SERVER_URL=https://baytt-production.up.railway.app
ASSEMBLY_API_KEY=3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1
```

3. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Opción B: Si despliegas BAYTT en Vercel/Railway

1. Ve a tu proyecto BAYTT en Vercel/Railway
2. Settings → Environment Variables
3. Añade:
   - `ASSEMBLY_SERVER_URL` = `https://baytt-production.up.railway.app`
   - `ASSEMBLY_API_KEY` = `3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1`
4. Guarda y redeploya

---

## 🎯 Paso 6: Verificar Todo Funciona

### A. Test del Servidor de Ensamblaje:

```bash
# Probar health endpoint
curl https://baytt-production.up.railway.app/health

# Debería responder:
# {"status":"ok","ffmpeg":true}
```

### B. Crear Película de Prueba:

1. Ve a tu aplicación BAYTT
2. Crea una película nueva (2-3 escenas cortas)
3. Observa los logs:
   - Debería mostrar: `[ASSEMBLER] Calling assembly server: https://baytt-production.up.railway.app`
   - Debería mostrar: `[ASSEMBLER] ✅ REAL ASSEMBLY SUCCESSFUL!`

### C. Verificar Video en R2:

1. Ve a Cloudflare → R2 → `baytt-storage`
2. Busca: `movies/{movie-id}/final.mp4`
3. Debería existir el archivo

---

## 🐛 Troubleshooting

### Error: "Application not found" (404)
- ✅ Haz deploy de los cambios pendientes en Railway
- ✅ Verifica que el servicio esté "Active" o "Running"
- ✅ Espera 2-3 minutos después del deploy

### Error: "Connection refused"
- ✅ Verifica que el puerto sea `3001` en Railway Settings
- ✅ Verifica los logs de Railway para ver si hay errores de inicio

### Error: "Invalid API key"
- ✅ Verifica que `ASSEMBLY_API_KEY` sea EXACTAMENTE la misma en Railway y BAYTT
- ✅ Debe ser: `3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1`

---

## 📊 Resumen de URLs y Keys

| Variable | Valor |
|----------|-------|
| `ASSEMBLY_SERVER_URL` | `https://baytt-production.up.railway.app` |
| `ASSEMBLY_API_KEY` | `3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1` |
| Health Endpoint | `https://baytt-production.up.railway.app/health` |
| Assemble Endpoint | `https://baytt-production.up.railway.app/assemble` |

---

**¡Listo! Sigue estos pasos y debería funcionar.** 🎉
