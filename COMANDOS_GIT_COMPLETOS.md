# 🚀 Comandos para Subir a GitHub - Listo para Copiar

## ⚡ Comandos Rápidos (Ejecuta en PowerShell desde BAYTT\baytt)

```powershell
# 1. Añadir todos los archivos
git add .

# 2. Hacer commit
git commit -m "Initial commit: BAYTT with assembly server"

# 3. Conectar con GitHub (reemplaza EVOTEAM19 con tu usuario si es diferente)
git remote add origin https://github.com/EVOTEAM19/BAYTT.git

# 4. Subir a GitHub
git branch -M main
git push -u origin main
```

## 📋 Paso a Paso Detallado

### 1. Crear Repositorio en GitHub (si no lo has creado)

1. Ve a: https://github.com/new
2. **Repository name**: `BAYTT`
3. **Description**: (opcional)
4. **Visibility**: Private o Public
5. **NO marques** ninguna opción adicional (README, .gitignore, license)
6. Haz clic en **"Create repository"**

### 2. Ejecutar Comandos

Abre PowerShell en la carpeta `BAYTT\baytt` y ejecuta los comandos de arriba uno por uno.

### 3. Autenticación con GitHub

Cuando ejecutes `git push`, GitHub te pedirá:
- **Username**: `EVOTEAM19` (o tu usuario)
- **Password**: **NO uses tu contraseña**, usa un **Personal Access Token**

#### Crear Personal Access Token:
1. Ve a: https://github.com/settings/tokens
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. **Note**: "Railway Deployment"
4. **Expiration**: El que prefieras (90 days, 1 year, etc.)
5. **Select scopes**: Marca **`repo`** (todos los permisos de repositorio)
6. Click en **"Generate token"**
7. **COPIA EL TOKEN** (solo se muestra una vez)
8. Úsalo como contraseña cuando `git push` te lo pida

### 4. Verificar

Después del push, ve a: `https://github.com/EVOTEAM19/BAYTT`

Deberías ver todos tus archivos, incluyendo:
- ✅ `assembly-server/` (con todos sus archivos)
- ✅ `src/`
- ✅ `package.json`
- ✅ etc.

## 🎯 Siguiente Paso: Conectar Railway

Una vez el código esté en GitHub:
1. Vuelve a Railway
2. "+ Create" → Busca "GitHub Repo"
3. Selecciona "EVOTEAM19/BAYTT"
4. Root Directory: `assembly-server`
5. Configura variables de entorno
6. ¡Despliega!

---

**Ejecuta estos comandos y luego seguimos con Railway!** 🚂
