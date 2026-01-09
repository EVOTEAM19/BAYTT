# 🚀 Desplegar Servidor de Ensamblaje en Render.com (Gratis)

## ✅ Ventajas de Render:
- Plan gratuito disponible
- Soporta Node.js y Docker
- Variables de entorno fáciles de configurar
- Auto-deploy desde GitHub

## 📋 Pasos:

### 1. Crear cuenta en Render
1. Ve a: https://render.com
2. Crea una cuenta (puedes usar GitHub para login rápido)
3. Confirma tu email

### 2. Crear nuevo Web Service
1. En el Dashboard, haz clic en **"New +"** → **"Web Service"**
2. Conecta tu repositorio: `EVOTEAM19/BAYTT`
3. Configura el servicio:
   - **Name**: `baytt-assembly-server`
   - **Region**: Elige la más cercana (ej: `Oregon (US West)`)
   - **Branch**: `main`
   - **Root Directory**: `assembly-server`
   - **Runtime**: `Docker` (o `Node` si prefieres)
   - **Build Command**: (dejar vacío si usas Docker)
   - **Start Command**: (dejar vacío si usas Docker)
   - **Plan**: Selecciona **"Free"**

### 3. Configurar Variables de Entorno
En la sección "Environment Variables", añade:

```
R2_ENDPOINT = https://bbe12a0259a64824ec97d4203ff5065.2.cloudflarestorage.com
R2_ACCESS_KEY_ID = 980b40cb5ab978c7b51657a6cb027cb7
R2_SECRET_ACCESS_KEY = b54c569604df03dde9116072032442e6e7027ecf3a5b50c3e7c023167fe72ef4
R2_BUCKET_NAME = baytt-storage
R2_PUBLIC_URL = https://pub-a95bf11c2a5b4482bab51e97f8ad2d2c.r2.dev
ASSEMBLY_API_KEY = 3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1
PORT = 3001
```

### 4. Desplegar
1. Haz clic en **"Create Web Service"**
2. Render comenzará a construir y desplegar automáticamente
3. Espera 5-10 minutos para que termine
4. Obtendrás una URL tipo: `https://baytt-assembly-server.onrender.com`

### 5. Configurar en BAYTT
En tu proyecto BAYTT, actualiza `.env.local`:

```bash
ASSEMBLY_SERVER_URL=https://baytt-assembly-server.onrender.com
ASSEMBLY_API_KEY=3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1
```

---

**Nota**: El plan gratuito de Render puede "dormir" después de 15 minutos de inactividad. La primera petición después de dormir puede tardar 30-60 segundos en responder.
