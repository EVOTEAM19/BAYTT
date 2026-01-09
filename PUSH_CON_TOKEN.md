# 🚀 Hacer Push Usando Personal Access Token

## Método Más Fácil: Usar Token Directamente en la URL

Si ya creaste tu Personal Access Token, puedes usarlo directamente:

### Paso 1: Obtener tu Personal Access Token

Si aún no lo tienes:
1. Ve a: https://github.com/settings/tokens/new
2. O: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)
3. **Note**: "Railway Deployment"
4. **Expiration**: 90 days
5. **Scopes**: Marca **`repo`** (todos los permisos)
6. **Generate token**
7. **COPIA EL TOKEN** (solo se muestra una vez)

### Paso 2: Usar el Token en Git

**Opción A: Token en la URL (Temporal, para el primer push)**

```powershell
cd C:\Users\USER\BAYTT\BAYTT\baytt

# Reemplaza TU_TOKEN con tu Personal Access Token real
git remote set-url origin https://TU_TOKEN@github.com/EVOTEAM19/BAYTT.git

# Hacer push (no pedirá credenciales)
git push -u origin main

# IMPORTANTE: Después del push exitoso, elimina el token de la URL:
git remote set-url origin https://github.com/EVOTEAM19/BAYTT.git
```

**Opción B: Push Normal (Pedirá Credenciales)**

```powershell
cd C:\Users\USER\BAYTT\BAYTT\baytt

# Configurar para que pida credenciales
git config credential.helper manager-core

# Hacer push
git push -u origin main
```

Cuando te pida credenciales:
- **Username**: `EVOTEAM19`
- **Password**: Pega tu **Personal Access Token** (no tu contraseña)

### Paso 3: Si Aún No Funciona - Usar VS Code

1. Abre VS Code en la carpeta `C:\Users\USER\BAYTT\BAYTT\baytt`
2. Ve a la pestaña **"Source Control"** (icono de ramificación, o Ctrl+Shift+G)
3. Haz clic en **"..."** (tres puntos)
4. Selecciona **"Push"** o **"Push to..."**
5. Selecciona **"origin"** y **"main"**
6. Cuando pida autenticación, usa:
   - Username: `EVOTEAM19`
   - Password: Tu Personal Access Token

## ⚡ Comando Rápido (Con Token)

Si ya tienes el token, ejecuta esto (reemplaza `TU_TOKEN`):

```powershell
cd C:\Users\USER\BAYTT\BAYTT\baytt
git remote set-url origin https://TU_TOKEN@github.com/EVOTEAM19/BAYTT.git
git push -u origin main
git remote set-url origin https://github.com/EVOTEAM19/BAYTT.git
```

## ✅ Después del Push Exitoso

Una vez el código esté en GitHub:
1. Ve a: https://github.com/EVOTEAM19/BAYTT
2. Verifica que veas todos los archivos, incluyendo `assembly-server/`
3. Vuelve a Railway y conecta el repositorio

---

**¿Ya tienes el Personal Access Token? Si sí, puedo ayudarte a hacer el push directamente.**
