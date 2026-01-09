// src/lib/movie-generation/real-movie-assembler.ts

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface VideoScene {
  scene_number: number;
  video_url: string;
  is_continuation?: boolean;
  duration?: number;
}

export interface AssemblyResult {
  success: boolean;
  video_url: string;
  duration_seconds: number;
  file_size_bytes: number;
  error?: string;
}

/**
 * Ensamblador REAL de películas
 * Descarga videos, los une y sube el resultado
 */
export class RealMovieAssembler {
  private movieId: string;
  private supabase: any;

  constructor(movieId: string, supabase: any) {
    this.movieId = movieId;
    this.supabase = supabase;
  }

  /**
   * Ensamblar película completa usando API externa o servicio cloud
   * Como estamos en serverless, usamos un servicio externo o API route
   */
  async assemble(videos: VideoScene[]): Promise<AssemblyResult> {
    console.log(`[REAL ASSEMBLER] ==========================================`);
    console.log(`[REAL ASSEMBLER] Starting REAL assembly for movie: ${this.movieId}`);
    console.log(`[REAL ASSEMBLER] Total scenes: ${videos.length}`);

    try {
      // Ordenar videos por número de escena
      const sortedVideos = [...videos]
        .filter(v => v.video_url && v.video_url.trim() !== '')
        .sort((a, b) => a.scene_number - b.scene_number);

      if (sortedVideos.length === 0) {
        throw new Error('No valid videos to assemble');
      }

      console.log(`[REAL ASSEMBLER] Valid videos: ${sortedVideos.length}`);

      // Llamar a API de ensamblaje (que se ejecuta en un servidor con FFmpeg o servicio cloud)
      // Intentar primero con servicio cloud, luego con API local
      const assemblyCloudUrl = '/api/movies/assemble-cloud';
      const assemblyLocalUrl = '/api/movies/assemble';
      
      console.log(`[REAL ASSEMBLER] Attempting cloud assembly first: ${assemblyCloudUrl}`);

      // Intentar primero con servicio cloud (si está configurado)
      let response = await fetch(`${assemblyCloudUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movie_id: this.movieId,
          videos: sortedVideos.map(v => ({
            scene_number: v.scene_number,
            video_url: v.video_url,
            is_continuation: v.is_continuation || false,
          })),
        }),
      });

      // Si el servicio cloud no está disponible (503), intentar con API local
      if (response.status === 503 || response.status === 404) {
        console.log(`[REAL ASSEMBLER] Cloud assembly not available, trying local API: ${assemblyLocalUrl}`);
        response = await fetch(`${assemblyLocalUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            movie_id: this.movieId,
            videos: sortedVideos.map(v => ({
              scene_number: v.scene_number,
              video_url: v.video_url,
              is_continuation: v.is_continuation || false,
            })),
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[REAL ASSEMBLER] ❌ API error: ${response.status} - ${errorText}`);
        throw new Error(`Assembly API failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Assembly failed');
      }

      console.log(`[REAL ASSEMBLER] ✅ Movie assembled successfully`);
      console.log(`[REAL ASSEMBLER]   - URL: ${result.video_url}`);
      console.log(`[REAL ASSEMBLER]   - Duration: ${result.duration_seconds}s`);
      console.log(`[REAL ASSEMBLER]   - Size: ${(result.file_size_bytes / 1024 / 1024).toFixed(2)} MB`);

      return {
        success: true,
        video_url: result.video_url,
        duration_seconds: result.duration_seconds || 0,
        file_size_bytes: result.file_size_bytes || 0,
      };
    } catch (error: any) {
      console.error(`[REAL ASSEMBLER] ❌ Assembly failed: ${error.message}`);
      console.error(`[REAL ASSEMBLER] Error stack:`, error.stack);
      return {
        success: false,
        video_url: '',
        duration_seconds: 0,
        file_size_bytes: 0,
        error: error.message,
      };
    }
  }
}
