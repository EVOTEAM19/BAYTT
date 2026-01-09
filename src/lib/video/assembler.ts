// ============================================
// BAYTT - Video Assembler
// ============================================

import {
  CROSSFADE_DURATION_SECONDS,
  SCENE_DURATION_SECONDS,
} from "@/lib/utils/constants";
import type { Scene } from "@/types/database";

// ============================================
// Types
// ============================================

export interface AssemblyParams {
  movie_id: string;
  scenes: Scene[];
  audio_tracks: {
    dialogue: string[]; // URLs de diálogos por escena
    music: string; // URL de música continua
    effects: string[]; // URLs de efectos por escena
  };
  quality: "720p" | "1080p" | "4k";
  generate_trailer?: boolean;
}

export interface AssembledMovie {
  video_url: string;
  trailer_url?: string;
  thumbnail_url: string;
  poster_url: string;
  duration: number;
  file_size: number;
}

interface VideoClip {
  url: string;
  duration: number;
  start_time: number;
  end_time: number;
  transition_in?: string;
  transition_out?: string;
}

interface AudioTrack {
  url: string;
  type: "dialogue" | "music" | "effect";
  start_time: number;
  duration: number;
  volume: number;
  ducking?: {
    enabled: boolean;
    threshold: number;
    duck_level: number; // 0-1 (30% = 0.3)
  };
}

interface VideoTimeline {
  clips: VideoClip[];
  total_duration: number;
}

interface AudioTimeline {
  tracks: AudioTrack[];
  total_duration: number;
}

// ============================================
// Main Function
// ============================================

export async function assembleMovie(
  params: AssemblyParams
): Promise<AssembledMovie> {
  const { scenes, audio_tracks, quality } = params;

  // PASO 1: Preparar clips con transiciones
  const clipsWithTransitions = await prepareClipsWithTransitions(scenes);

  // PASO 2: Crear timeline de video
  // Crossfade de 0.5 segundos entre cada escena
  const videoTimeline = createVideoTimeline(
    clipsWithTransitions,
    CROSSFADE_DURATION_SECONDS
  );

  // PASO 3: Crear timeline de audio
  // - Música continua de fondo
  // - Diálogos sincronizados con timestamps
  // - Efectos de sonido en momentos específicos
  const audioTimeline = createAudioTimeline(audio_tracks, scenes);

  // PASO 4: Mezclar audio
  // - Ducking: bajar música cuando hay diálogo
  // - Normalización de niveles
  const mixedAudio = await mixAudioTracks(audioTimeline);

  // PASO 5: Combinar video + audio
  const finalVideo = await combineVideoAudio(videoTimeline, mixedAudio);

  // PASO 6: Aplicar corrección de color para coherencia
  const colorCorrectedVideo = await applyColorCorrection([finalVideo]);

  // PASO 7: Transcodificar a calidades
  const transcodedVideo = await transcodeToQuality(
    colorCorrectedVideo[0],
    quality
  );

  // PASO 8: Generar thumbnail y poster
  const thumbnail = await generateThumbnail(transcodedVideo);
  const poster = await generatePoster(scenes[0]?.first_frame_url || scenes[0]?.clip_url || "");

  // PASO 8.5: Generar créditos con nombres de personajes
  const creditsText = await generateCredits(scenes, params.movie_id);

  // PASO 9: Generar trailer (opcional)
  let trailer: string | null = null;
  if (params.generate_trailer) {
    trailer = await generateTrailer(scenes, transcodedVideo);
  }

  // PASO 10: Subir a storage
  const uploadedUrl = await uploadToStorage(transcodedVideo, params.movie_id);
  const thumbnailUrl = await uploadToStorage(thumbnail, `${params.movie_id}_thumb`);
  const posterUrl = await uploadToStorage(poster, `${params.movie_id}_poster`);
  const trailerUrl = trailer
    ? await uploadToStorage(trailer, `${params.movie_id}_trailer`)
    : undefined;

  return {
    video_url: uploadedUrl,
    trailer_url: trailerUrl,
    thumbnail_url: thumbnailUrl,
    poster_url: posterUrl,
    duration: calculateTotalDuration(scenes),
    file_size: await getFileSize(transcodedVideo),
  };
}

// ============================================
// Step 1: Prepare Clips with Transitions
// ============================================

async function prepareClipsWithTransitions(
  scenes: Scene[]
): Promise<VideoClip[]> {
  const clips: VideoClip[] = [];
  let currentTime = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const clipUrl = scene.clip_url || "";

    clips.push({
      url: clipUrl,
      duration: SCENE_DURATION_SECONDS,
      start_time: currentTime,
      end_time: currentTime + SCENE_DURATION_SECONDS,
      transition_in: i > 0 ? "crossfade" : undefined,
      transition_out: i < scenes.length - 1 ? "crossfade" : undefined,
    });

    currentTime += SCENE_DURATION_SECONDS - CROSSFADE_DURATION_SECONDS;
  }

  return clips;
}

// ============================================
// Step 2: Create Video Timeline
// ============================================

function createVideoTimeline(
  clips: VideoClip[],
  crossfadeDuration: number
): VideoTimeline {
  return {
    clips,
    total_duration: calculateTotalDurationFromClips(clips),
  };
}

function calculateTotalDurationFromClips(clips: VideoClip[]): number {
  if (clips.length === 0) return 0;
  const lastClip = clips[clips.length - 1];
  return lastClip.end_time;
}

// ============================================
// Step 3: Create Audio Timeline
// ============================================

function createAudioTimeline(
  audioTracks: AssemblyParams["audio_tracks"],
  scenes: Scene[]
): AudioTimeline {
  const tracks: AudioTrack[] = [];
  let currentTime = 0;

  // Música continua de fondo
  if (audioTracks.music) {
    const totalDuration = calculateTotalDuration(scenes);
    tracks.push({
      url: audioTracks.music,
      type: "music",
      start_time: 0,
      duration: totalDuration,
      volume: 0.6, // 60% volumen base
      ducking: {
        enabled: true,
        threshold: -20, // dB threshold
        duck_level: 0.3, // Bajar a 30% cuando hay diálogo
      },
    });
  }

  // Diálogos sincronizados
  audioTracks.dialogue.forEach((dialogueUrl, index) => {
    if (dialogueUrl && scenes[index]) {
      const scene = scenes[index];
      const dialogueStart = scene.dialogue
        ? currentTime + 0.5 // Pequeño offset para sincronización
        : currentTime;

      tracks.push({
        url: dialogueUrl,
        type: "dialogue",
        start_time: dialogueStart,
        duration: SCENE_DURATION_SECONDS,
        volume: 1.0, // 100% volumen para diálogos
      });
    }

    currentTime += SCENE_DURATION_SECONDS - CROSSFADE_DURATION_SECONDS;
  });

  // Efectos de sonido
  audioTracks.effects.forEach((effectUrl, index) => {
    if (effectUrl && scenes[index]) {
      tracks.push({
        url: effectUrl,
        type: "effect",
        start_time: currentTime,
        duration: 2, // Efectos típicamente cortos
        volume: 0.8,
      });
    }
  });

  const totalDuration = calculateTotalDuration(scenes);

  return {
    tracks,
    total_duration: totalDuration,
  };
}

// ============================================
// Step 4: Mix Audio Tracks
// ============================================

async function mixAudioTracks(
  audioTimeline: AudioTimeline
): Promise<string> {
  // Esta función debería usar FFmpeg o un servicio de procesamiento de audio
  // Por ahora, retornamos una URL placeholder que se procesará en el servidor

  // Llamar a API route que procesa el audio
  try {
    const response = await fetch("/api/video/mix-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tracks: audioTimeline.tracks,
        total_duration: audioTimeline.total_duration,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.mixed_audio_url;
    }
  } catch (error) {
    console.error("Error mixing audio:", error);
  }

  // Fallback: retornar música principal si falla
  const musicTrack = audioTimeline.tracks.find((t) => t.type === "music");
  return musicTrack?.url || "";
}

// ============================================
// Step 5: Combine Video + Audio
// ============================================

async function combineVideoAudio(
  videoTimeline: VideoTimeline,
  mixedAudioUrl: string
): Promise<string> {
  // Esta función debería usar FFmpeg para combinar video y audio
  // Por ahora, retornamos una URL placeholder

  try {
    const response = await fetch("/api/video/combine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clips: videoTimeline.clips,
        audio_url: mixedAudioUrl,
        crossfade_duration: CROSSFADE_DURATION_SECONDS,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.combined_video_url;
    }
  } catch (error) {
    console.error("Error combining video and audio:", error);
  }

  // Fallback
  return videoTimeline.clips[0]?.url || "";
}

// ============================================
// Step 6: Color Correction
// ============================================

async function applyColorCorrection(clips: string[]): Promise<string[]> {
  // Aplicar LUT uniforme a todos los clips
  // Normalizar brillo/contraste/saturación

  try {
    const response = await fetch("/api/video/color-correct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clips,
        lut: "cinematic", // LUT predefinida
        normalize: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.corrected_clips;
    }
  } catch (error) {
    console.error("Error applying color correction:", error);
  }

  // Fallback: retornar clips originales
  return clips;
}

// ============================================
// Step 7: Transcode to Quality
// ============================================

async function transcodeToQuality(
  videoUrl: string,
  quality: "720p" | "1080p" | "4k"
): Promise<string> {
  const resolutions = {
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
    "4k": { width: 3840, height: 2160 },
  };

  const resolution = resolutions[quality];

  try {
    const response = await fetch("/api/video/transcode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_url: videoUrl,
        width: resolution.width,
        height: resolution.height,
        bitrate: getBitrateForQuality(quality),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.transcoded_url;
    }
  } catch (error) {
    console.error("Error transcoding:", error);
  }

  // Fallback
  return videoUrl;
}

function getBitrateForQuality(quality: "720p" | "1080p" | "4k"): number {
  const bitrates = {
    "720p": 5000000, // 5 Mbps
    "1080p": 10000000, // 10 Mbps
    "4k": 50000000, // 50 Mbps
  };
  return bitrates[quality];
}

// ============================================
// Step 8: Generate Thumbnail and Poster
// ============================================

async function generateThumbnail(videoUrl: string): Promise<string> {
  try {
    const response = await fetch("/api/video/generate-thumbnail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_url: videoUrl,
        timestamp: 5, // 5 segundos en el video
        width: 1280,
        height: 720,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.thumbnail_url;
    }
  } catch (error) {
    console.error("Error generating thumbnail:", error);
  }

  // Fallback
  return `${videoUrl}?thumbnail=true`;
}

async function generatePoster(frameUrl: string): Promise<string> {
  try {
    const response = await fetch("/api/video/generate-poster", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        frame_url: frameUrl,
        width: 1920,
        height: 1080,
        style: "cinematic",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.poster_url;
    }
  } catch (error) {
    console.error("Error generating poster:", error);
  }

  // Fallback
  return frameUrl;
}

// ============================================
// Step 9: Generate Trailer
// ============================================

async function generateTrailer(
  scenes: Scene[],
  fullVideoUrl: string
): Promise<string> {
  // Seleccionar escenas más impactantes (primera, media, última)
  const selectedScenes = [
    scenes[0],
    scenes[Math.floor(scenes.length / 2)],
    scenes[scenes.length - 1],
  ].filter(Boolean);

  try {
    const response = await fetch("/api/video/generate-trailer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        scenes: selectedScenes.map((s) => s.clip_url),
        duration: 30, // 30 segundos de trailer
        style: "fast-paced",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.trailer_url;
    }
  } catch (error) {
    console.error("Error generating trailer:", error);
  }

  // Fallback: usar primera escena
  return scenes[0]?.clip_url || "";
}

// ============================================
// Step 10: Upload to Storage
// ============================================

async function uploadToStorage(
  fileUrl: string,
  filename: string
): Promise<string> {
  try {
    const response = await fetch("/api/storage/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_url: fileUrl,
        filename,
        bucket: "movies",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.public_url;
    }
  } catch (error) {
    console.error("Error uploading to storage:", error);
  }

  // Fallback: retornar URL original
  return fileUrl;
}

// ============================================
// Helper Functions
// ============================================

function calculateTotalDuration(scenes: Scene[]): number {
  return scenes.length * SCENE_DURATION_SECONDS;
}

async function getFileSize(fileUrl: string): Promise<number> {
  try {
    const response = await fetch(fileUrl, { method: "HEAD" });
    const contentLength = response.headers.get("content-length");
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch (error) {
    console.error("Error getting file size:", error);
    return 0;
  }
}

// ============================================
// Crossfade Function (FFmpeg implementation)
// ============================================

/**
 * Aplica crossfade entre dos clips usando FFmpeg
 * Esta función debe ejecutarse en el servidor
 */
export async function applyCrossfade(
  clip1: string,
  clip2: string,
  duration: number
): Promise<string> {
  // Esta función debería usar FFmpeg en el servidor
  // ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.5[v]" ...

  try {
    const response = await fetch("/api/video/apply-crossfade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clip1_url: clip1,
        clip2_url: clip2,
        crossfade_duration: duration,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.output_url;
    }
  } catch (error) {
    console.error("Error applying crossfade:", error);
  }

  // Fallback
  return clip1;
}

// ============================================
// Audio Ducking Function
// ============================================

/**
 * Aplica ducking de música cuando hay diálogo
 * Detecta cuando hay diálogo y baja música a 30%
 */
export async function applyDucking(
  music: AudioTrack,
  dialogues: AudioTrack[]
): Promise<AudioTrack> {
  // Esta función debería usar FFmpeg o procesamiento de audio
  // Detecta picos de audio en diálogos y baja música automáticamente

  try {
    const response = await fetch("/api/video/apply-ducking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        music_track: music,
        dialogue_tracks: dialogues,
        duck_level: 0.3, // 30%
        threshold: -20, // dB
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ...music,
        url: data.ducked_audio_url,
      };
    }
  } catch (error) {
    console.error("Error applying ducking:", error);
  }

  // Fallback: retornar música original
  return music;
}

// ============================================
// Generate Credits Function
// ============================================

/**
 * Genera los créditos con nombres de todos los personajes que aparecen en la película
 */
async function generateCredits(
  scenes: Scene[],
  movieId: string
): Promise<string> {
  try {
    // Obtener todos los character_ids únicos de las escenas
    const characterIds = new Set<string>();
    scenes.forEach((scene) => {
      if (scene.character_ids && Array.isArray(scene.character_ids)) {
        scene.character_ids.forEach((id) => characterIds.add(id));
      }
    });

    if (characterIds.size === 0) {
      return "Créditos\n\nGracias por ver.";
    }

    // Obtener información de los personajes desde la base de datos
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const characterIdsArray = Array.from(characterIds);

    const { data: characters } = await supabaseAdmin
      .from("characters")
      .select("id, name, is_baytt_character")
      .in("id", characterIdsArray);

    if (!characters || characters.length === 0) {
      return "Créditos\n\nGracias por ver.";
    }

    // Separar personajes BAYTT de personajes reales
    const bayttCharacters = characters.filter((c) => c.is_baytt_character);
    const realCharacters = characters.filter((c) => !c.is_baytt_character);

    // Construir texto de créditos
    let credits = "CRÉDITOS\n\n";

    if (realCharacters.length > 0) {
      credits += "PERSONAJES\n";
      realCharacters.forEach((char) => {
        credits += `${char.name}\n`;
      });
      credits += "\n";
    }

    if (bayttCharacters.length > 0) {
      credits += "PERSONAJES BAYTT\n";
      bayttCharacters.forEach((char) => {
        credits += `${char.name}\n`;
      });
      credits += "\n";
    }

    credits += "Gracias por ver.\n";
    credits += "Generado con BAYTT - Plataforma de Cine con IA";

    // Guardar créditos en el script
    const { data: script } = await supabaseAdmin
      .from("scripts")
      .select("id")
      .eq("movie_id", movieId)
      .maybeSingle();

    if (script) {
      await supabaseAdmin
        .from("scripts")
        .update({ credits })
        .eq("id", script.id);
    }

    return credits;
  } catch (error) {
    console.error("Error generating credits:", error);
    return "Créditos\n\nGracias por ver.";
  }
}
