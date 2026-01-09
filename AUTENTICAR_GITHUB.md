# 🔐 Solución: Error de Autenticación con GitHub

## Problema
El error `Permission denied to winosoapp` indica que Git está usando credenciales de otro usuario.

## Solución Rápida

### Opción 1: Usar Personal Access Token (Recomendado)

1. **Crear Token en GitHub:**
   - Ve a: https://github.com/settings/tokens
   - Click en **"Generate new token"** → **"Generate new token (classic)"**
   - **Note**: "Railway Deployment"
   - **Expiration**: El que prefieras
   - **Select scopes**: Marca **`repo`** (todos los permisos)
   - Click en **"Generate token"**
   - **COPIA EL TOKEN** (solo se muestra una vez)

2. **Actualizar Remote con Token:**
   ```powershell
   # Desde BAYTT\baytt
   git remote set-url origin https://TU-TOKEN@github.com/EVOTEAM19/BAYTT.git
   
   # O mejor, sin exponer el token:
   git remote set-url origin https://github.com/EVOTEAM19/BAYTT.git
   ```

3. **Hacer Push:**
   ```powershell
   git push -u origin main
   ```
   - **Username**: `EVOTEAM19`
   - **Password**: Pega el **Personal Access Token** (no tu contraseña)

### Opción 2: Configurar Credenciales de Windows

1. **Borrar credenciales antiguas:**
   - Presiona `Win + R`
   - Escribe: `control /name Microsoft.CredentialManager`
   - Ve a **"Credenciales de Windows"**
   - Busca entradas de `git:https://github.com`
   - Elimínalas

2. **Hacer push de nuevo:**
   ```powershell
   git push -u origin main
   ```
   - Te pedirá usuario y contraseña
   - Usa tu Personal Access Token como contraseña

### Opción 3: Usar GitHub CLI (gh)

Si tienes GitHub CLI instalado:

```powershell
# Autenticar
gh auth login

# Hacer push
git push -u origin main
```

## ⚡ Solución Inmediata (Copia y Pega)

```powershell
# 1. Actualizar remote
git remote set-url origin https://github.com/EVOTEAM19/BAYTT.git

# 2. Hacer push (te pedirá credenciales)
git push -u origin main
```

Cuando te pida credenciales:
- **Username**: `EVOTEAM19`
- **Password**: Tu Personal Access Token (no tu contraseña de GitHub)

## 🔑 Crear Personal Access Token

1. Ve a: https://github.com/settings/tokens/new
2. Nombre: "Railway Deployment"
3. Expiración: 90 días (o el que prefieras)
4. Permisos: Marca **`repo`** (todos)
5. Click en "Generate token"
6. **COPIA EL TOKEN** inmediatamente

---

**Ejecuta estos comandos y luego intenta el push de nuevo!**
