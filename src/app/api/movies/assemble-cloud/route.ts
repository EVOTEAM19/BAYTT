// src/app/api/movies/assemble-cloud/route.ts
// API Route para ensamblar usando servicio cloud (Shotstack, Transloadit, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Ensamblador usando servicio cloud de edición de video
 * Opciones:
 * 1. Shotstack API (https://shotstack.io) - $0.01 por segundo de video
 * 2. Transloadit (https://transloadit.com) - Servicio de transcodificación
 * 3. Mux (https://mux.com) - Video API con capacidades de edición
 * 
 * Por ahora, implementamos una solución usando Supabase Storage
 * y un servidor externo con FFmpeg (si está disponible)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movie_id, videos } = body;

    console.log(`[CLOUD ASSEMBLER] Assembling ${videos.length} videos for movie ${movie_id}`);

    // Verificar autenticación
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // ⭐ SOLUCIÓN REAL: Usar servicio externo de ensamblaje
    // Si tienes un servidor con FFmpeg, configurar ASSEMBLY_SERVER_URL
    const assemblyServerUrl = process.env.ASSEMBLY_SERVER_URL;
    
    if (assemblyServerUrl) {
      // Llamar a servidor externo con FFmpeg
      console.log(`[CLOUD ASSEMBLER] Using external FFmpeg server: ${assemblyServerUrl}`);
      
      const response = await fetch(`${assemblyServerUrl}/assemble`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ASSEMBLY_SERVER_KEY || ''}`,
        },
        body: JSON.stringify({
          movie_id,
          videos,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    }

    // Si no hay servidor externo, usar Shotstack API (si está configurado)
    const shotstackApiKey = process.env.SHOTSTACK_API_KEY;
    
    if (shotstackApiKey) {
      console.log(`[CLOUD ASSEMBLER] Using Shotstack API`);
      return await assembleWithShotstack(movie_id, videos, shotstackApiKey);
    }

    // Si no hay ningún servicio configurado, retornar error
    return NextResponse.json({
      success: false,
      error: 'No assembly service configured. Set ASSEMBLY_SERVER_URL or SHOTSTACK_API_KEY in environment variables.',
      message: 'Necesitas configurar: 1) Servidor con FFmpeg (ASSEMBLY_SERVER_URL), o 2) Shotstack API (SHOTSTACK_API_KEY)',
    }, { status: 503 });

  } catch (error: any) {
    console.error('[CLOUD ASSEMBLER] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Ensamblar usando Shotstack API
 */
async function assembleWithShotstack(movieId: string, videos: any[], apiKey: string): Promise<NextResponse> {
  // Shotstack requiere crear un timeline con todos los clips
  const timeline = {
    soundtrack: {
      src: videos[0]?.video_url || '',
      effect: 'fadeOut',
    },
    tracks: videos.map((video, index) => ({
      clips: [{
        asset: {
          type: 'video',
          src: video.video_url,
        },
        start: index * 10, // 10 segundos por escena
        length: 10,
        transition: index > 0 ? {
          in: 'fade',
          out: 'fade',
        } : undefined,
      }],
    })),
  };

  // Renderizar video en Shotstack
  const renderResponse = await fetch('https://api.shotstack.io/v1/render', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      timeline,
      output: {
        format: 'mp4',
        resolution: 'hd',
        fps: 30,
        quality: 'high',
      },
    }),
  });

  if (!renderResponse.ok) {
    const error = await renderResponse.text();
    throw new Error(`Shotstack API error: ${error}`);
  }

  const renderResult = await renderResponse.json();
  
  // Polling para obtener el video renderizado
  const renderId = renderResult.response.id;
  
  // Retornar información del render (el frontend deberá hacer polling)
  return NextResponse.json({
    success: true,
    render_id: renderId,
    status: 'rendering',
    message: 'Video está siendo renderizado. Usa el render_id para hacer polling.',
    poll_url: `https://api.shotstack.io/v1/render/${renderId}`,
  });
}
