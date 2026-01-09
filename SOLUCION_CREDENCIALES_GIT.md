# 🔐 Solución: Credenciales de Git en Windows

## Problema
Git está usando credenciales de otro usuario (`winosoapp`) en lugar de `EVOTEAM19`.

## Solución: Limpiar Credenciales Guardadas

### Paso 1: Eliminar Credenciales Antiguas

**Opción A: Desde PowerShell (Más Fácil)**

```powershell
# Ver credenciales guardadas
cmdkey /list

# Eliminar credenciales de GitHub (reemplaza con la que veas)
cmdkey /delete:git:https://github.com

# O si hay una específica, elimínala:
# cmdkey /delete:LegacyGeneric:target=git:https://github.com
```

**Opción B: Desde Panel de Control**

1. Presiona `Win + R`
2. Escribe: `control /name Microsoft.CredentialManager`
3. Ve a **"Credenciales de Windows"**
4. Busca entradas que contengan:
   - `git:https://github.com`
   - `github.com`
   - Cualquier entrada relacionada con `winosoapp`
5. Haz clic en cada una y selecciona **"Quitar"**

### Paso 2: Configurar Git para Usar Credenciales Nuevas

```powershell
# Configurar usuario de Git (si no está configurado)
git config --global user.name "EVOTEAM19"
git config --global user.email "tu-email@example.com"

# Asegurar que use el gestor de credenciales correcto
git config --global credential.helper manager-core
```

### Paso 3: Hacer Push con Credenciales Nuevas

```powershell
cd C:\Users\USER\BAYTT\BAYTT\baytt

# Hacer push (te pedirá credenciales nuevas)
git push -u origin main
```

**Cuando te pida credenciales:**
- **Username**: `EVOTEAM19`
- **Password**: Tu **Personal Access Token** (no tu contraseña de GitHub)

### Paso 4: Si Aún No Funciona - Usar Token en la URL

Si sigue sin funcionar, puedes incluir el token directamente en la URL (menos seguro, pero funciona):

```powershell
# Reemplaza TU_TOKEN con tu Personal Access Token
git remote set-url origin https://TU_TOKEN@github.com/EVOTEAM19/BAYTT.git

# Hacer push (ya no pedirá credenciales)
git push -u origin main
```

**⚠️ IMPORTANTE**: Después de hacer push exitosamente, elimina el token de la URL:

```powershell
git remote set-url origin https://github.com/EVOTEAM19/BAYTT.git
```

## 🔑 Crear Personal Access Token (Si Aún No Lo Tienes)

1. Ve a: https://github.com/settings/tokens/new
2. O desde GitHub: Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)
3. **Note**: "Railway Deployment"
4. **Expiration**: 90 days (o el que prefieras)
5. **Scopes**: Marca **`repo`** (todos los permisos)
6. Click en **"Generate token"**
7. **COPIA EL TOKEN** inmediatamente

## ✅ Comandos Rápidos (Copia y Pega)

```powershell
# 1. Ver credenciales guardadas
cmdkey /list

# 2. Eliminar credenciales de GitHub
cmdkey /delete:git:https://github.com

# 3. Intentar push de nuevo
cd C:\Users\USER\BAYTT\BAYTT\baytt
git push -u origin main
```

Cuando te pida credenciales, usa:
- Username: `EVOTEAM19`
- Password: Tu Personal Access Token

---

**Ejecuta estos comandos y debería funcionar!** 🚀
