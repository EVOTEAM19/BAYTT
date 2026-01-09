const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configurar R2
// ⚠️ Validar y normalizar el endpoint de R2
let r2Endpoint = process.env.R2_ENDPOINT;

if (r2Endpoint) {
  // Remover cualquier prefijo o sufijo incorrecto
  // El formato correcto es: https://[account-id].r2.cloudflarestorage.com
  r2Endpoint = r2Endpoint.trim();
  
  // ⭐ CORRECCIÓN: Manejar formato incorrecto con ".2." en lugar de ".r2."
  // Formato incorrecto: https://xxx.2.cloudflarestorage.com
  // Formato correcto: https://xxx.r2.cloudflarestorage.com
  if (r2Endpoint.includes('.2.cloudflarestorage.com')) {
    const accountIdMatch = r2Endpoint.match(/https?:\/\/([a-f0-9]+)\.2\.cloudflarestorage\.com/i);
    if (accountIdMatch) {
      const accountId = accountIdMatch[1];
      r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      console.log(`[ASSEMBLY SERVER] ⚠️ Fixed R2 endpoint format (changed .2. to .r2.): ${r2Endpoint}`);
    }
  }
  
  // Si tiene el formato correcto, validar
  const correctFormatMatch = r2Endpoint.match(/https?:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/i);
  if (correctFormatMatch) {
    const accountId = correctFormatMatch[1];
    r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    console.log(`[ASSEMBLY SERVER] ✅ Normalized R2 endpoint: ${r2Endpoint}`);
  } else {
    // Si no coincide el formato, intentar extraer el account ID de cualquier manera
    const accountIdMatch = r2Endpoint.match(/([a-f0-9]{32})/i);
    if (accountIdMatch) {
      const accountId = accountIdMatch[1];
      r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      console.log(`[ASSEMBLY SERVER] ⚠️ Reconstructed R2 endpoint from account ID: ${r2Endpoint}`);
    } else {
      console.error(`[ASSEMBLY SERVER] ❌ Invalid R2 endpoint format: ${r2Endpoint}`);
      console.error(`[ASSEMBLY SERVER] Expected format: https://[account-id].r2.cloudflarestorage.com`);
      console.error(`[ASSEMBLY SERVER] Common mistake: .2.cloudflarestorage.com should be .r2.cloudflarestorage.com`);
    }
  }
}

// ⭐ CONFIGURACIÓN SSL/TLS CORRECTA PARA R2
// Cloudflare R2 requiere TLS 1.2 o superior y configuración específica
// Crear un agente HTTPS con configuración compatible con R2
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  // ⭐ IMPORTANTE: No especificar secureProtocol en Node.js moderno (18+)
  // Node.js 18+ usa TLS 1.3 por defecto, que es compatible con R2
  // Solo especificamos si tenemos problemas de compatibilidad
  rejectUnauthorized: true,
  // Timeout aumentado para archivos grandes
  timeout: 0, // Sin timeout en el agente, se maneja en el requestHandler
  // Configuración de TLS mínima - Node.js maneja automáticamente TLS 1.2/1.3
});

// Crear requestHandler con configuración específica
const requestHandler = new NodeHttpHandler({
  httpsAgent: httpsAgent,
  connectionTimeout: 30000, // 30 segundos para establecer conexión
  socketTimeout: 300000, // 5 minutos para transferencia de datos
  requestTimeout: 300000 // 5 minutos timeout total de la petición
});

// ⭐ S3Client con configuración optimizada para R2
const s3Client = new S3Client({
  region: 'auto', // R2 usa 'auto' como región
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  },
  requestHandler: requestHandler,
  // R2 usa path-style buckets (bucket-name.r2.dev) pero acepta virtual-hosted
  forcePathStyle: true, // Usar path-style para mejor compatibilidad con R2
  // Deshabilitar características no soportadas por R2
  useAccelerateEndpoint: false,
  useDualstackEndpoint: false
});

console.log(`[ASSEMBLY SERVER] ✅ S3Client configured for R2`);
console.log(`[ASSEMBLY SERVER]   - Endpoint: ${r2Endpoint}`);
console.log(`[ASSEMBLY SERVER]   - Path-style: true`);
console.log(`[ASSEMBLY SERVER]   - TLS: Auto (Node.js ${process.version})`);

// Directorio temporal
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/baytt-assembly';
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log(`[ASSEMBLY SERVER] Temp directory: ${TEMP_DIR}`);
console.log(`[ASSEMBLY SERVER] R2 Endpoint (raw): ${process.env.R2_ENDPOINT || 'NOT SET'}`);
console.log(`[ASSEMBLY SERVER] R2 Bucket: ${process.env.R2_BUCKET_NAME || 'baytt-movies'}`);
console.log(`[ASSEMBLY SERVER] R2 Public URL: ${process.env.R2_PUBLIC_URL || 'NOT SET'}`);

// Función para descargar archivo con manejo de redirects y headers
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 300000 // 5 minutos timeout
    };
    
    const req = protocol.get(url, options, (response) => {
      // Seguir redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        console.log(`[DOWNLOAD] Following redirect: ${redirectUrl}`);
        req.destroy();
        file.close();
        fs.unlink(destPath, () => {});
        downloadFile(redirectUrl, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        req.destroy();
        file.close();
        fs.unlink(destPath, () => {});
        
        // ⚠️ Error 401: Token JWT expirado - las URLs de Runway tienen tokens temporales
        if (response.statusCode === 401) {
          const errorMsg = `HTTP ${response.statusCode}: Unauthorized - Token JWT expirado. Las URLs de Runway con tokens JWT expiran después de un tiempo. Necesitas copiar los videos a R2 inmediatamente después de generarlos.`;
          console.error(`[DOWNLOAD] ❌ ${errorMsg}`);
          reject(new Error(errorMsg));
          return;
        }
        
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(destPath);
        if (stats.size === 0) {
          fs.unlink(destPath, () => {});
          reject(new Error('Downloaded file is empty'));
          return;
        }
        resolve(destPath);
      });
    });
    
    req.on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      file.close();
      fs.unlink(destPath, () => {});
      reject(new Error('Download timeout'));
    });
  });
}

// Endpoint de ensamblaje
app.post('/assemble', async (req, res) => {
  const { movie_id, videos, api_key } = req.body;
  
  // Verificar API key
  if (!process.env.ASSEMBLY_API_KEY) {
    console.error('[ASSEMBLY] ❌ ASSEMBLY_API_KEY not configured in server');
    return res.status(500).json({ error: 'Assembly server not properly configured' });
  }
  
  if (api_key !== process.env.ASSEMBLY_API_KEY) {
    console.error('[ASSEMBLY] ❌ Invalid API key provided');
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  if (!movie_id || !videos || !Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ 
      error: 'Missing or invalid parameters',
      details: {
        movie_id: !!movie_id,
        videos_is_array: Array.isArray(videos),
        videos_length: videos?.length || 0
      }
    });
  }
  
  console.log(`[ASSEMBLY] ==========================================`);
  console.log(`[ASSEMBLY] Starting assembly for movie: ${movie_id}`);
  console.log(`[ASSEMBLY] Total scenes: ${videos.length}`);
  
  const workDir = path.join(TEMP_DIR, movie_id);
  const startTime = Date.now();
  
  try {
    // Crear directorio de trabajo
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }
    
    // Ordenar videos por scene_number
    const sortedVideos = [...videos].sort((a, b) => a.scene_number - b.scene_number);
    
    // PASO 1: Descargar todos los videos
    console.log('[ASSEMBLY] STEP 1: Downloading videos...');
    const localFiles = [];
    
    for (let i = 0; i < sortedVideos.length; i++) {
      const video = sortedVideos[i];
      const filename = `scene_${String(i + 1).padStart(3, '0')}.mp4`;
      const localPath = path.join(workDir, filename);
      
      console.log(`[ASSEMBLY] Downloading scene ${video.scene_number} (${i + 1}/${sortedVideos.length})...`);
      console.log(`[ASSEMBLY]   URL: ${video.video_url.substring(0, 100)}...`);
      
      try {
        await downloadFile(video.video_url, localPath);
        
        const stats = fs.statSync(localPath);
        console.log(`[ASSEMBLY] ✅ Scene ${video.scene_number}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        localFiles.push(localPath);
      } catch (downloadError) {
        console.error(`[ASSEMBLY] ❌ Failed to download scene ${video.scene_number}: ${downloadError.message}`);
        throw new Error(`Failed to download scene ${video.scene_number}: ${downloadError.message}`);
      }
    }
    
    if (localFiles.length === 0) {
      throw new Error('No videos were downloaded successfully');
    }
    
    console.log(`[ASSEMBLY] ✅ Downloaded ${localFiles.length} videos`);
    
    // PASO 2: Crear archivo de lista para FFmpeg concat
    console.log('[ASSEMBLY] STEP 2: Creating concat file...');
    const listFile = path.join(workDir, 'files.txt');
    const listContent = localFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listFile, listContent);
    console.log(`[ASSEMBLY] ✅ Concat file created with ${localFiles.length} files`);
    
    // PASO 3: Concatenar con FFmpeg
    console.log('[ASSEMBLY] STEP 3: Concatenating with FFmpeg...');
    const outputFile = path.join(workDir, 'final.mp4');
    
    await new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '20',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          '-y'
        ])
        .output(outputFile)
        .on('start', (cmd) => {
          console.log('[ASSEMBLY] FFmpeg started');
          console.log(`[ASSEMBLY] Command: ${cmd.substring(0, 200)}...`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[ASSEMBLY] FFmpeg progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('[ASSEMBLY] ✅ FFmpeg concatenation completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('[ASSEMBLY] ❌ FFmpeg error:', err.message);
          reject(new Error(`FFmpeg error: ${err.message}`));
        });
      
      command.run();
    });
    
    // Verificar archivo de salida
    if (!fs.existsSync(outputFile)) {
      throw new Error('FFmpeg output file was not created');
    }
    
    const outputStats = fs.statSync(outputFile);
    console.log(`[ASSEMBLY] ✅ Output file created: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // PASO 4: Obtener duración con ffprobe
    console.log('[ASSEMBLY] STEP 4: Getting video metadata...');
    const duration = await new Promise((resolve) => {
      ffmpeg.ffprobe(outputFile, (err, metadata) => {
        if (err) {
          console.warn(`[ASSEMBLY] ⚠️ Could not get duration: ${err.message}`);
          resolve(0);
        } else {
          const dur = metadata.format.duration || 0;
          console.log(`[ASSEMBLY] ✅ Video duration: ${dur.toFixed(2)}s`);
          resolve(dur);
        }
      });
    });
    
    // PASO 5: Subir a R2
    console.log('[ASSEMBLY] STEP 5: Uploading to R2...');
    console.log(`[ASSEMBLY] R2 Endpoint: ${r2Endpoint || 'NOT SET'}`);
    console.log(`[ASSEMBLY] R2 Bucket: ${process.env.R2_BUCKET_NAME || 'baytt-movies'}`);
    console.log(`[ASSEMBLY] R2 Public URL: ${process.env.R2_PUBLIC_URL || 'NOT SET'}`);
    console.log(`[ASSEMBLY] Node.js version: ${process.version}`);
    console.log(`[ASSEMBLY] AWS SDK version: ${require('@aws-sdk/client-s3/package.json').version}`);
    
    if (!r2Endpoint || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 configuration missing. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY');
    }
    
    const fileContent = fs.readFileSync(outputFile);
    const r2Key = `movies/${movie_id}/final.mp4`;
    const bucketName = process.env.R2_BUCKET_NAME || 'baytt-movies';
    
    console.log(`[ASSEMBLY] ==========================================`);
    console.log(`[ASSEMBLY] Upload configuration:`);
    console.log(`[ASSEMBLY]   - Bucket: ${bucketName}`);
    console.log(`[ASSEMBLY]   - Key: ${r2Key}`);
    console.log(`[ASSEMBLY]   - File size: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[ASSEMBLY]   - Endpoint: ${r2Endpoint}`);
    console.log(`[ASSEMBLY]   - Has credentials: ${!!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)}`);
    console.log(`[ASSEMBLY] ==========================================`);
    
    try {
      console.log(`[ASSEMBLY] Starting upload to R2...`);
      
      // Usar stream en lugar de Buffer completo para archivos grandes
      // Esto puede ayudar con problemas SSL/TLS en archivos grandes
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: fileContent,
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000',
        // Metadata adicional
        Metadata: {
          'movie-id': movie_id,
          'upload-date': new Date().toISOString(),
          'source': 'baytt-assembly-server'
        }
      });
      
      const uploadStartTime = Date.now();
      await s3Client.send(uploadCommand);
      const uploadElapsed = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
      
      console.log(`[ASSEMBLY] ✅ Upload to R2 completed in ${uploadElapsed}s`);
      
      // Construir URL pública
      let publicUrl;
      if (process.env.R2_PUBLIC_URL) {
        // Si hay un dominio personalizado o URL pública configurada
        const baseUrl = process.env.R2_PUBLIC_URL.replace(/\/$/, '');
        publicUrl = `${baseUrl}/${r2Key}`;
        console.log(`[ASSEMBLY] Using R2_PUBLIC_URL: ${publicUrl}`);
      } else if (r2Endpoint) {
        // Intentar construir URL pública desde el endpoint normalizado
        // Formato: https://[account-id].r2.cloudflarestorage.com -> https://pub-[account-id].r2.dev
        const endpointMatch = r2Endpoint.match(/https?:\/\/([a-f0-9]+)\.r2\.cloudflarestorage\.com/i);
        if (endpointMatch && endpointMatch[1]) {
          const accountId = endpointMatch[1];
          publicUrl = `https://pub-${accountId}.r2.dev/${r2Key}`;
          console.log(`[ASSEMBLY] Constructed public URL from endpoint: ${publicUrl}`);
        } else {
          throw new Error(`Cannot parse R2 endpoint to construct public URL. Endpoint: ${r2Endpoint}. Please set R2_PUBLIC_URL explicitly.`);
        }
      } else {
        throw new Error('Cannot construct public URL. Set R2_PUBLIC_URL environment variable');
      }
      
      console.log(`[ASSEMBLY] ✅ Uploaded to R2: ${publicUrl}`);
      
      // PASO 6: Limpiar archivos temporales
      console.log('[ASSEMBLY] STEP 6: Cleaning up...');
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
        console.log('[ASSEMBLY] ✅ Cleanup completed');
      } catch (cleanupError) {
        console.warn(`[ASSEMBLY] ⚠️ Cleanup warning: ${cleanupError.message}`);
      }
      
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[ASSEMBLY] ==========================================`);
      console.log(`[ASSEMBLY] ✅ Assembly completed in ${elapsedTime}s`);
      console.log(`[ASSEMBLY]   - Movie ID: ${movie_id}`);
      console.log(`[ASSEMBLY]   - URL: ${publicUrl}`);
      console.log(`[ASSEMBLY]   - Duration: ${Math.round(duration)}s`);
      console.log(`[ASSEMBLY]   - Size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[ASSEMBLY] ==========================================`);
      
      // Responder
      res.json({
        success: true,
        video_url: publicUrl,
        duration_seconds: Math.round(duration),
        file_size_bytes: outputStats.size,
        scenes_count: videos.length,
        elapsed_seconds: parseFloat(elapsedTime)
      });
      
    } catch (uploadError) {
      console.error('[ASSEMBLY] ==========================================');
      console.error('[ASSEMBLY] ❌ R2 upload error occurred');
      console.error('[ASSEMBLY] Error message:', uploadError.message);
      console.error('[ASSEMBLY] Error name:', uploadError.name);
      console.error('[ASSEMBLY] Error code:', uploadError.code);
      
      // Información adicional para diagnóstico
      if (uploadError.stack) {
        console.error('[ASSEMBLY] Stack trace:', uploadError.stack);
      }
      
      // Verificar si es un error SSL/TLS específico
      if (uploadError.message.includes('SSL') || 
          uploadError.message.includes('TLS') || 
          uploadError.message.includes('handshake') ||
          uploadError.message.includes('EPROTO')) {
        console.error('[ASSEMBLY] ⚠️ SSL/TLS error detected');
        console.error('[ASSEMBLY] Possible causes:');
        console.error('[ASSEMBLY]   1. Node.js version incompatible (< 18.0.0)');
        console.error('[ASSEMBLY]   2. R2 endpoint format incorrect');
        console.error('[ASSEMBLY]   3. Network/firewall blocking TLS connection');
        console.error('[ASSEMBLY]   4. Certificate validation issue');
        console.error('[ASSEMBLY] Current Node.js version:', process.version);
        console.error('[ASSEMBLY] R2 Endpoint:', r2Endpoint);
      }
      
      console.error('[ASSEMBLY] ==========================================');
      throw new Error(`R2 upload failed: ${uploadError.message}`);
    }
    
  } catch (error) {
    console.error('[ASSEMBLY] ==========================================');
    console.error('[ASSEMBLY] ❌ Assembly failed');
    console.error('[ASSEMBLY] Error:', error.message);
    console.error('[ASSEMBLY] Stack:', error.stack);
    console.error('[ASSEMBLY] ==========================================');
    
    // Limpiar en caso de error
    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn(`[ASSEMBLY] ⚠️ Cleanup after error failed: ${cleanupError.message}`);
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      movie_id: movie_id
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  // Verificar que FFmpeg está disponible
  ffmpeg.getAvailableEncoders((err, encoders) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'FFmpeg not available',
        error: err.message
      });
    }
    
    res.json({
      status: 'ok',
      ffmpeg: true,
      encoders: Object.keys(encoders).length,
      temp_dir: TEMP_DIR,
      r2_configured: !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID)
    });
  });
});

// Verificar versión de FFmpeg
app.get('/version', (req, res) => {
  ffmpeg.getAvailableCodecs((err, codecs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      ffmpeg_available: true,
      codecs_count: Object.keys(codecs).length,
      node_version: process.version
    });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[ASSEMBLY SERVER] ==========================================`);
  console.log(`[ASSEMBLY SERVER] 🚀 Server running on port ${PORT}`);
  console.log(`[ASSEMBLY SERVER] Environment:`);
  console.log(`[ASSEMBLY SERVER]   - Node: ${process.version}`);
  console.log(`[ASSEMBLY SERVER]   - Temp Dir: ${TEMP_DIR}`);
  console.log(`[ASSEMBLY SERVER]   - R2 Endpoint: ${process.env.R2_ENDPOINT || 'NOT SET'}`);
  console.log(`[ASSEMBLY SERVER]   - R2 Bucket: ${process.env.R2_BUCKET_NAME || 'baytt-movies'}`);
  console.log(`[ASSEMBLY SERVER]   - API Key: ${process.env.ASSEMBLY_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`[ASSEMBLY SERVER] ==========================================`);
});
