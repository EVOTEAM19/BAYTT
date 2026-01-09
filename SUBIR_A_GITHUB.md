# 📤 Subir Código a GitHub - Guía Rápida

## Paso 1: Crear Repositorio en GitHub

1. **Ve a GitHub**: https://github.com
2. **Haz clic en el botón verde "+"** (arriba derecha) → **"New repository"**
3. **Configura el repositorio**:
   - **Repository name**: `BAYTT` (o el nombre que prefieras)
   - **Description**: (opcional) "BAYTT - Movie Generation Platform"
   - **Visibility**: Private o Public (como prefieras)
   - **NO marques** "Add a README file" (ya tienes código)
   - **NO marques** "Add .gitignore" (ya tienes uno)
   - **NO marques** "Choose a license"
4. **Haz clic en "Create repository"**

## Paso 2: Inicializar Git Localmente (si no está inicializado)

Abre una terminal en la carpeta `BAYTT/baytt/` y ejecuta:

```bash
# Verificar si ya es un repositorio Git
git status

# Si dice "not a git repository", inicializa:
git init
```

## Paso 3: Configurar Git (si es la primera vez)

```bash
# Configurar tu nombre (usa tu nombre real o GitHub username)
git config user.name "EVOTEAM19"

# Configurar tu email (usa el email de tu cuenta GitHub)
git config user.email "tu-email@example.com"
```

## Paso 4: Añadir Todos los Archivos

```bash
# Asegúrate de estar en la carpeta BAYTT/baytt/
cd BAYTT/baytt

# Añadir todos los archivos
git add .

# Si quieres ver qué se va a subir:
git status
```

## Paso 5: Hacer Primer Commit

```bash
git commit -m "Initial commit: BAYTT project with assembly server"
```

## Paso 6: Conectar con GitHub y Subir

GitHub te dará instrucciones después de crear el repo, pero aquí están los comandos:

```bash
# Conectar con tu repositorio remoto (reemplaza USERNAME con tu usuario)
git remote add origin https://github.com/EVOTEAM19/BAYTT.git

# O si prefieres usar SSH (si tienes configurado):
# git remote add origin git@github.com:EVOTEAM19/BAYTT.git

# Subir código
git branch -M main
git push -u origin main
```

**Nota**: Si GitHub te pide autenticación:
- Usa un **Personal Access Token** (no tu contraseña)
- Crear token: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- Permisos: `repo` (todos los permisos de repositorio)
- Copia el token y úsalo como contraseña

## Paso 7: Verificar que se Subió

1. Ve a tu repositorio en GitHub: `https://github.com/EVOTEAM19/BAYTT`
2. Deberías ver todos tus archivos, incluyendo:
   - `assembly-server/`
   - `src/`
   - `package.json`
   - etc.

## Paso 8: Ahora Conecta Railway

Una vez el código esté en GitHub:

1. **Vuelve a Railway**
2. **Ve a tu proyecto "efficient-stillness"**
3. **Haz clic en "+ Create"** o **"Add a Service"**
4. **Busca "GitHub Repo"** (ahora debería aparecer)
5. **Selecciona "EVOTEAM19/BAYTT"**
6. **Configura Root Directory**: `assembly-server`
7. **Despliega**

## ✅ Comandos Rápidos (Copia y Pega)

```bash
# Desde la carpeta BAYTT/baytt/
git init
git add .
git commit -m "Initial commit: BAYTT with assembly server"
git remote add origin https://github.com/EVOTEAM19/BAYTT.git
git branch -M main
git push -u origin main
```

## 🐛 Si Ya Tienes un Repositorio Git

Si ya tenías git inicializado pero con otro remote:

```bash
# Ver remotes actuales
git remote -v

# Cambiar o añadir el remote de GitHub
git remote set-url origin https://github.com/EVOTEAM19/BAYTT.git

# O si no existe, añádelo:
git remote add origin https://github.com/EVOTEAM19/BAYTT.git

# Subir
git push -u origin main
```

## 📝 Nota sobre .gitignore

Asegúrate de que tu `.gitignore` incluya:
- `node_modules/`
- `.env`
- `.env.local`
- `.next/`
- Archivos temporales

El proyecto ya debería tener un `.gitignore` correcto, pero verifica que esté ahí.

---

**Una vez subido a GitHub, vuelve aquí y seguimos con Railway!** 🚂
