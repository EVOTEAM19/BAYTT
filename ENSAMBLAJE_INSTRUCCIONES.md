# 🎬 Instrucciones para Ensamblaje Real de Películas

## 📋 Problema Actual

El ensamblaje actual usa solo la primera escena como video "ensamblado". Necesitamos un sistema que realmente descargue, una y suba todas las escenas en un único video MP4.

## ⚠️ Limitación: Serverless (Vercel)

En entornos serverless como Vercel, **NO podemos ejecutar FFmpeg directamente** porque:
- No hay acceso al sistema de archivos
- No podemos instalar binarios como FFmpeg
- Timeout máximo de 60 segundos (no suficiente para ensamblar videos)

## ✅ Soluciones Disponibles

### Opción 1: Servidor Externo con FFmpeg (RECOMENDADO)

1. **Crear un servidor dedicado** (VPS, Railway, Render, Fly.io, etc.)
2. **Instalar FFmpeg** en el servidor
3. **Crear API endpoint** que reciba videos y los ensamble
4. **Configurar variables de entorno** en tu proyecto:

```bash
ASSEMBLY_SERVER_URL=https://tu-servidor-ffmpeg.com
ASSEMBLY_SERVER_KEY=tu-api-key-secreta
```

#### Ejemplo de Servidor FFmpeg (Node.js + Express)

```typescript
// server.js
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

app.post('/assemble', async (req, res) => {
  const { movie_id, videos } = req.body;
  const workDir = `/tmp/assembly/${movie_id}`;
  
  try {
    // 1. Crear directorio
    await fs.mkdir(workDir, { recursive: true });
    
    // 2. Descargar videos
    const videoPaths = [];
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const localPath = path.join(workDir, `scene_${i + 1}.mp4`);
      const response = await fetch(video.video_url);
      const buffer = await response.buffer();
      await fs.writeFile(localPath, buffer);
      videoPaths.push(localPath);
    }
    
    // 3. Crear lista de archivos para FFmpeg
    const listFile = path.join(workDir, 'files.txt');
    const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(listFile, listContent);
    
    // 4. Concatenar con FFmpeg
    const outputFile = path.join(workDir, 'final.mp4');
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'concat',
        '-safe', '0',
        '-i', listFile,
        '-c', 'copy',
        '-y',
        outputFile
      ]);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
    
    // 5. Subir a Supabase Storage o R2
    const videoBuffer = await fs.readFile(outputFile);
    const { data, error } = await supabase.storage
      .from('movies')
      .upload(`${movie_id}/final.mp4`, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (error) throw error;
    
    // 6. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('movies')
      .getPublicUrl(`${movie_id}/final.mp4`);
    
    // 7. Limpiar archivos temporales
    await fs.rm(workDir, { recursive: true, force: true });
    
    res.json({
      success: true,
      video_url: publicUrl,
      duration_seconds: 0, // Calcular con ffprobe si es necesario
      file_size_bytes: (await fs.stat(outputFile)).size
    });
    
  } catch (error) {
    console.error('Assembly error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, () => {
  console.log('FFmpeg assembly server running on port 3001');
});
```

### Opción 2: Servicio Cloud (Shotstack, Transloadit, Mux)

#### Shotstack (Recomendado - $0.01/segundo)

1. **Registrarse en Shotstack**: https://shotstack.io
2. **Obtener API Key**
3. **Configurar variable de entorno**:

```bash
SHOTSTACK_API_KEY=tu-api-key
```

4. El código ya está preparado para usar Shotstack en `/api/movies/assemble-cloud`

#### Transloadit

Similar a Shotstack, servicio de transcodificación y edición de video.

#### Mux

API de video con capacidades de edición, pero más costoso.

### Opción 3: Supabase Edge Functions (LIMITADO)

Las Edge Functions tienen limitaciones:
- Timeout máximo de 60 segundos
- No pueden ejecutar FFmpeg directamente
- Necesitarías FFmpeg WASM (limitado en funcionalidad)

**No recomendado** para ensamblaje de video.

## 🚀 Implementación Inmediata

Para que funcione AHORA, el sistema usa un **fallback temporal**:

1. Si hay servidor FFmpeg configurado (`ASSEMBLY_SERVER_URL`), lo usa
2. Si hay Shotstack configurado (`SHOTSTACK_API_KEY`), lo usa
3. Si no, usa la primera escena como video temporal y guarda metadata

### Para Habilitar Ensamblaje Real:

```bash
# Opción A: Servidor FFmpeg propio
ASSEMBLY_SERVER_URL=https://tu-servidor.com
ASSEMBLY_SERVER_KEY=tu-key-secreta

# Opción B: Shotstack
SHOTSTACK_API_KEY=tu-shotstack-key

# Opción C: Cloudflare R2 (para almacenar videos finales)
R2_ENDPOINT=https://tu-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu-access-key
R2_SECRET_ACCESS_KEY=tu-secret-key
R2_BUCKET_NAME=baytt-movies
R2_PUBLIC_URL=https://media.baytt.com
```

## 🔧 Próximos Pasos

1. ✅ Código del ensamblador creado (`RealMovieAssembler`)
2. ✅ API routes creadas (`/api/movies/assemble`, `/api/movies/assemble-cloud`)
3. ✅ Pipeline actualizado para usar ensamblador real
4. ⏳ **PENDIENTE**: Configurar servidor FFmpeg o servicio cloud
5. ⏳ **PENDIENTE**: Probar ensamblaje completo

## 📝 Notas

- El sistema actualmente guarda metadata de las escenas para referencia futura
- El frontend puede reproducir escenas secuencialmente mientras se implementa el ensamblaje real
- Una vez configurado el servidor FFmpeg o servicio cloud, el ensamblaje funcionará automáticamente
