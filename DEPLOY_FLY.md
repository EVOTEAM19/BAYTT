# 🚀 Desplegar Servidor de Ensamblaje en Fly.io (Gratis)

## ✅ Ventajas de Fly.io:
- Plan gratuito generoso
- Soporta Docker
- Muy rápido
- Variables de entorno fáciles

## 📋 Pasos:

### 1. Instalar Fly CLI
```powershell
# En PowerShell (como administrador)
iwr https://fly.io/install.ps1 -useb | iex
```

### 2. Login en Fly.io
```powershell
fly auth login
```

### 3. Crear App
```powershell
cd C:\Users\USER\BAYTT\BAYTT\baytt\assembly-server
fly launch
```

Sigue las instrucciones:
- App name: `baytt-assembly-server`
- Region: Elige el más cercano (ej: `iad` para Virginia)
- PostgreSQL: No (no lo necesitas)

### 4. Configurar Variables
```powershell
fly secrets set R2_ENDPOINT=https://bbe12a0259a64824ec97d4203ff5065.2.cloudflarestorage.com
fly secrets set R2_ACCESS_KEY_ID=980b40cb5ab978c7b51657a6cb027cb7
fly secrets set R2_SECRET_ACCESS_KEY=b54c569604df03dde9116072032442e6e7027ecf3a5b50c3e7c023167fe72ef4
fly secrets set R2_BUCKET_NAME=baytt-storage
fly secrets set R2_PUBLIC_URL=https://pub-a95bf11c2a5b4482bab51e97f8ad2d2c.r2.dev
fly secrets set ASSEMBLY_API_KEY=3645f53db6e988178a3b0078173b6206db8d53963638e51802f21f856793fdd1
fly secrets set PORT=3001
```

### 5. Desplegar
```powershell
fly deploy
```

### 6. Obtener URL
```powershell
fly status
```
Copiar la URL (ej: `https://baytt-assembly-server.fly.dev`)

---

**Nota**: Fly.io tiene un plan gratuito generoso con 3 VMs compartidas gratis.
