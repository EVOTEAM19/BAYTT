// src/app/api/movies/proxy-video/route.ts
// Proxy para copiar videos de Runway a Supabase Storage y evitar CORS

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Proxy que descarga un video de Runway y lo sube a Supabase Storage
 * Esto resuelve problemas de CORS y permite usar nuestros propios URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_url, movie_id, scene_number } = body;

    if (!video_url || !movie_id) {
      return NextResponse.json(
        { error: 'video_url y movie_id son requeridos' },
        { status: 400 }
      );
    }

    console.log(`[VIDEO PROXY] Copying video to storage: ${video_url.substring(0, 100)}...`);

    // Verificar autenticación
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Descargar video de Runway
    const response = await fetch(video_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const videoBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(videoBuffer);

    console.log(`[VIDEO PROXY] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Determinar path en storage
    const fileName = scene_number 
      ? `scene_${String(scene_number).padStart(3, '0')}.mp4`
      : `video_${Date.now()}.mp4`;
    const storagePath = `${movie_id}/${fileName}`;

    // Asegurar que el bucket existe
    const bucketName = 'movies';
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === bucketName);
      
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 500 * 1024 * 1024, // 500MB
        });
      }
    } catch (bucketError) {
      console.warn('[VIDEO PROXY] Could not create bucket (may already exist)');
    }

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: 'video/mp4',
        upsert: true,
        cacheControl: '31536000', // 1 año
      });

    if (uploadError) {
      console.error('[VIDEO PROXY] Upload error:', uploadError);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    console.log(`[VIDEO PROXY] ✅ Video copied to: ${publicUrl}`);

    // Si es una escena específica, actualizar movie_scenes
    if (scene_number) {
      await supabaseAdmin
        .from('movie_scenes')
        .update({
          video_url: publicUrl,
          video_proxied: true, // Indicar que fue copiado
        })
        .eq('movie_id', movie_id)
        .eq('scene_number', scene_number);
    }

    return NextResponse.json({
      success: true,
      video_url: publicUrl,
      original_url: video_url,
      file_size_bytes: buffer.length,
    });

  } catch (error: any) {
    console.error('[VIDEO PROXY] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
