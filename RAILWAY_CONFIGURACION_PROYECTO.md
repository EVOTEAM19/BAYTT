# 🚂 Configuración del Proyecto en Railway - Guía Visual

## Situación Actual
Tienes dos proyectos en Railway: "efficient-stillness" e "independent-ambition". Necesitas configurar uno de ellos para el servidor de ensamblaje.

## Opción 1: Usar un Proyecto Existente (Recomendado)

### Paso 1: Abre uno de los proyectos
1. Haz clic en el proyecto **"efficient-stillness"** (o "independent-ambition", el que prefieras)
2. Se abrirá la página de configuración del proyecto

### Paso 2: Conecta el Repositorio
1. En la página del proyecto, busca la sección **"Source"** o **"GitHub"**
2. Haz clic en **"Connect GitHub Repo"** o **"Configure"**
3. Selecciona tu repositorio de BAYTT
4. **IMPORTANTE**: Cuando Railway te pregunte sobre el directorio, selecciona o escribe: **`assembly-server`**

### Paso 3: Configurar Variables de Entorno
1. En la página del proyecto, busca la pestaña **"Variables"** o haz clic en **"Variables"** en el menú lateral
2. Haz clic en **"Raw Editor"** o **"+ New Variable"**
3. Añade estas variables (copia y pega exactamente):

```bash
PORT=3001
ASSEMBLY_API_KEY=b93a1f2c-edab-4cd7-9e97-30b08d595ae4
TEMP_DIR=/tmp/baytt-assembly
```

4. **Para R2** (si ya lo tienes, si no lo añades después):
```bash
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu-access-key-id
R2_SECRET_ACCESS_KEY=tu-secret-access-key
R2_BUCKET_NAME=baytt-movies
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

5. Haz clic en **"Save"** o **"Add"**

### Paso 4: Configurar el Servicio
1. En la página del proyecto, busca **"Settings"** o haz clic en el icono de engranaje ⚙️
2. Busca la sección **"Root Directory"** o **"Source"**
3. Asegúrate de que esté configurado como: **`assembly-server`**
   - Si no está, cámbialo a `assembly-server`
   - Esto le dice a Railway que solo despliegue esa carpeta

### Paso 5: Configurar el Puerto
1. En **Settings**, busca **"Port"** o **"Expose Port"**
2. Configúralo a: **`3001`**
3. Railway detectará el Dockerfile automáticamente, pero asegúrate de que el puerto sea 3001

### Paso 6: Desplegar
1. Railway debería desplegar automáticamente cuando detecte cambios
2. Si no, busca el botón **"Deploy"** o **"Redeploy"**
3. Espera a que termine el despliegue (verás logs en tiempo real)

## Opción 2: Crear un Proyecto Nuevo Desde Cero

Si prefieres crear un proyecto específico para el servidor:

1. Haz clic en el botón morado **"+ New"** (arriba a la derecha)
2. Selecciona **"Empty Project"**
3. Nombre: **"baytt-assembly-server"** (o el que prefieras)
4. Una vez creado, haz clic en **"+ New"** dentro del proyecto
5. Selecciona **"GitHub Repo"**
6. Conecta tu repositorio de BAYTT
7. **IMPORTANTE**: En **"Root Directory"**, escribe: **`assembly-server`**
8. Railway detectará el Dockerfile automáticamente
9. Configura las variables como en el Paso 3 de arriba

## ⚠️ IMPORTANTE: Root Directory

**Este es el paso más crítico**: Railway debe saber que solo debe desplegar la carpeta `assembly-server/`, no todo el repositorio.

- Si no configuras el Root Directory, Railway intentará desplegar todo el proyecto BAYTT (Next.js)
- El Root Directory debe ser exactamente: **`assembly-server`** (sin barras, sin puntos)

## 📍 Dónde Está el Root Directory

1. Ve a tu proyecto en Railway
2. Haz clic en **Settings** (o el icono ⚙️)
3. Busca la sección **"Source"** o **"Deploy"**
4. Busca **"Root Directory"** o **"Working Directory"**
5. Si está vacío o dice `/`, cámbialo a `assembly-server`
6. Guarda los cambios

## ✅ Verificación

Una vez configurado y desplegado:

1. Ve a la pestaña **"Deployments"** o **"Deploys"** en tu proyecto
2. Deberías ver un despliegue en progreso o completado
3. Haz clic en el despliegue para ver los logs
4. Busca mensajes como:
   - `[ASSEMBLY SERVER] 🚀 Server running on port 3001`
   - `[ASSEMBLY SERVER] R2 Endpoint: ...` (si configuraste R2)
5. Ve a la pestaña **"Settings"** → **"Networking"**
6. Busca la **URL del servicio** (ej: `https://baytt-assembly-xxxxx.up.railway.app`)
7. Copia esa URL y prueba: `https://tu-url.com/health`

## 🎯 Siguiente Paso

Una vez tengas la URL del servidor funcionando:

1. Copia la URL completa (ej: `https://baytt-assembly-xxxxx.up.railway.app`)
2. Ve a tu proyecto BAYTT (en Vercel o donde esté)
3. Añade las variables:
   - `ASSEMBLY_SERVER_URL=https://tu-url-completa-de-railway`
   - `ASSEMBLY_API_KEY=b93a1f2c-edab-4cd7-9e97-30b08d595ae4`

## 🐛 Si Algo No Funciona

### No veo "Root Directory"
- Busca "Source" o "Deploy Settings"
- O busca "Working Directory"
- Si no encuentras nada, Railway puede detectarlo automáticamente si el Dockerfile está en `assembly-server/`

### El despliegue falla
- Revisa los logs en la pestaña "Deployments"
- Verifica que el Dockerfile esté en `assembly-server/Dockerfile`
- Verifica que `package.json` esté en `assembly-server/package.json`

### No se generan variables
- Asegúrate de estar en la pestaña correcta: **"Variables"**
- Usa "Raw Editor" para añadir múltiples variables a la vez
- Guarda después de añadir cada variable

---

**¿Necesitas ayuda con algún paso específico? Dime qué ves en tu pantalla y te guío exactamente.**
