# 🔐 Guía Completa: Obtener Credenciales de Cloudflare R2

## 📋 ¿Qué es Cloudflare R2?

Cloudflare R2 es un almacenamiento de objetos (similar a AWS S3) donde se guardarán los videos ensamblados. Es necesario configurarlo para que el servidor de ensamblaje pueda subir los videos finales.

---

## 🚀 Paso 1: Acceder a Cloudflare Dashboard

1. Ve a: **https://dash.cloudflare.com**
2. Inicia sesión con tu cuenta de Cloudflare
   - Si no tienes cuenta, créala gratis en: https://dash.cloudflare.com/sign-up

---

## 🪣 Paso 2: Crear un Bucket R2

1. En el dashboard de Cloudflare, busca **"R2"** en el menú lateral izquierdo
2. Si es tu primera vez, haz clic en **"Get started"** o **"Create bucket"**
3. Haz clic en **"Create bucket"**
4. **Nombre del bucket**: `baytt-movies`
5. **Location**: Selecciona la región más cercana (ej: "Auto" o "Western North America")
6. Haz clic en **"Create bucket"**

✅ **Ya tienes el bucket creado**

---

## 🔑 Paso 3: Crear API Token (Access Keys)

Para que el servidor pueda subir archivos, necesitas crear un "API Token" o "Access Key".

### Opción A: Desde el Dashboard de R2 (MÁS FÁCIL)

1. Ve a **R2** → Tu bucket `baytt-movies`
2. Haz clic en **"Manage R2 API Tokens"** o busca **"API Tokens"** en el menú
3. Haz clic en **"Create API token"**
4. **Configuración:**
   - **Token name**: `baytt-assembly-server`
   - **Permissions**: Selecciona **"Object Read & Write"** o **"Admin Read & Write"**
   - **TTL**: Deja en blanco (sin expiración) o elige una fecha lejana
   - **Bucket restrictions**: Puedes dejar "Allow access to all buckets" o seleccionar solo `baytt-movies`
5. Haz clic en **"Create API token"**
6. **⚠️ IMPORTANTE: COPIA INMEDIATAMENTE:**
   - **Access Key ID** (ej: `a1b2c3d4e5f6g7h8i9j0`)
   - **Secret Access Key** (ej: `xYz123AbC456DeF789GhI012JkL345MnO678PqR`)
   - **⚠️ El Secret Access Key solo se muestra UNA VEZ. Guárdalo en un lugar seguro.**

### Opción B: Desde Account Settings (Alternativa)

1. Ve a **Cloudflare Dashboard** → Click en tu **perfil** (arriba a la derecha)
2. Ve a **"My Profile"** → **"API Tokens"**
3. Haz clic en **"Create Token"**
4. Usa la plantilla **"R2 Token"**
5. Configura los permisos para el bucket `baytt-movies`
6. Copia el **Access Key ID** y **Secret Access Key**

---

## 🌐 Paso 4: Obtener el Endpoint

El endpoint es la URL base para acceder a R2. Depende de tu **Account ID**.

1. En el dashboard de Cloudflare, ve a cualquier página (ej: Overview)
2. En la **barra lateral derecha**, verás tu **Account ID** (ej: `abc123def456ghi789`)
   - También puedes verlo en la URL: `https://dash.cloudflare.com/abc123def456ghi789/...`
3. **El endpoint será**: `https://abc123def456ghi789.r2.cloudflarestorage.com`
   - Reemplaza `abc123def456ghi789` con tu Account ID real

---

## 🔗 Paso 5: Obtener la URL Pública

Para que los videos sean accesibles públicamente, necesitas configurar un dominio público.

### Opción A: Usar Dominio Personalizado (Recomendado)

1. En R2 → Tu bucket `baytt-movies`
2. Ve a **"Settings"** → **"Public Access"**
3. Haz clic en **"Connect domain"** o **"Custom Domain"**
4. Sigue las instrucciones para conectar un dominio (ej: `storage.baytt.com`)

**URL pública**: `https://storage.baytt.com` (o tu dominio)

### Opción B: Usar R2.dev (Temporal)

Si no tienes dominio propio, Cloudflare puede generar una URL temporal:

1. En R2 → Tu bucket `baytt-movies` → **"Settings"**
2. Busca **"Public URL"** o **"R2.dev subdomain"**
3. Habilita **"Public Access"**
4. Se generará una URL tipo: `https://pub-abc123def456ghi789.r2.dev`

**URL pública**: `https://pub-abc123def456ghi789.r2.dev`

---

## ✅ Paso 6: Resumen de Valores a Copiar

Una vez completados los pasos anteriores, deberías tener:

| Variable | Valor Ejemplo | Dónde Encontrarlo |
|----------|--------------|-------------------|
| `R2_ENDPOINT` | `https://abc123def456ghi789.r2.cloudflarestorage.com` | Account ID + `.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | `a1b2c3d4e5f6g7h8i9j0` | API Token creado (Access Key ID) |
| `R2_SECRET_ACCESS_KEY` | `xYz123AbC456DeF789GhI012JkL345MnO678PqR` | API Token creado (Secret Access Key) |
| `R2_BUCKET_NAME` | `baytt-movies` | Nombre del bucket |
| `R2_PUBLIC_URL` | `https://storage.baytt.com` o `https://pub-abc123def456ghi789.r2.dev` | Configuración de dominio público |
| `ASSEMBLY_API_KEY` | `baytt-assembly-2024-secret-key-random-string` | **Generar uno nuevo** (ver abajo) |
| `PORT` | `3001` | **Fijo: 3001** |

---

## 🔐 Paso 7: Generar ASSEMBLY_API_KEY

El `ASSEMBLY_API_KEY` es una clave secreta que protege el endpoint del servidor de ensamblaje. **Genera uno nuevo y único**.

### Generar en PowerShell:

```powershell
# Genera una clave aleatoria segura
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### O genera uno manualmente:

Puedes usar cualquier string largo y aleatorio, por ejemplo:
- `baytt-assembly-2024-secret-key-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`
- Mínimo 32 caracteres, mezcla letras, números y guiones

**⚠️ IMPORTANTE**: Usa la MISMA clave en:
- Railway (variable de entorno `ASSEMBLY_API_KEY`)
- BAYTT local (en `.env.local` como `ASSEMBLY_API_KEY`)

---

## 📝 Paso 8: Verificar Configuración

1. Ve a R2 → `baytt-movies` → **"Settings"**
2. Verifica que:
   - ✅ Bucket existe: `baytt-movies`
   - ✅ Public Access está habilitado (si usas R2.dev)
   - ✅ API Token está creado y activo

---

## 🆘 Problemas Comunes

### "R2 not available in your account"
- **Solución**: Necesitas actualizar tu plan de Cloudflare. R2 está disponible en planes pagos, aunque hay un tier gratuito.
- Ve a: https://dash.cloudflare.com/?to=/:account/r2

### "Cannot find Account ID"
- **Solución**: El Account ID está en la URL del dashboard o en la barra lateral derecha.

### "API Token expired"
- **Solución**: Crea un nuevo token y actualiza las variables de entorno.

### "403 Forbidden" al subir
- **Solución**: Verifica que el API Token tenga permisos de "Write" y que esté asignado al bucket correcto.

---

## ✅ Checklist Final

- [ ] Bucket `baytt-movies` creado en Cloudflare R2
- [ ] API Token creado con permisos Read & Write
- [ ] Access Key ID copiado
- [ ] Secret Access Key copiado (¡solo se muestra una vez!)
- [ ] Account ID identificado
- [ ] Endpoint calculado: `https://[ACCOUNT_ID].r2.cloudflarestorage.com`
- [ ] URL pública configurada (dominio o R2.dev)
- [ ] ASSEMBLY_API_KEY generado

---

**¿Necesitas ayuda? Si tienes problemas en algún paso, comparte qué ves en la pantalla de Cloudflare.**
