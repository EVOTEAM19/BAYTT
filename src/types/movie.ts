// ============================================
// BAYTT - Movie Types
// ============================================

// ============================================
// Genres
// ============================================

export interface Genre {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const GENRES: Genre[] = [
  {
    id: "sci-fi",
    name: "Ciencia Ficción",
    icon: "🚀",
    color: "#39FF14",
  },
  {
    id: "horror",
    name: "Terror",
    icon: "👻",
    color: "#E50914",
  },
  {
    id: "comedy",
    name: "Comedia",
    icon: "😂",
    color: "#FFD700",
  },
  {
    id: "drama",
    name: "Drama",
    icon: "🎭",
    color: "#8B5CF6",
  },
  {
    id: "action",
    name: "Acción",
    icon: "💥",
    color: "#FF6B6B",
  },
  {
    id: "romance",
    name: "Romance",
    icon: "💕",
    color: "#FF69B4",
  },
  {
    id: "thriller",
    name: "Thriller",
    icon: "🔪",
    color: "#DC143C",
  },
  {
    id: "fantasy",
    name: "Fantasía",
    icon: "✨",
    color: "#9370DB",
  },
  {
    id: "adventure",
    name: "Aventura",
    icon: "🗺️",
    color: "#FF8C00",
  },
  {
    id: "mystery",
    name: "Misterio",
    icon: "🔍",
    color: "#4B0082",
  },
  {
    id: "animation",
    name: "Animación",
    icon: "🎨",
    color: "#00CED1",
  },
  {
    id: "documentary",
    name: "Documental",
    icon: "📹",
    color: "#708090",
  },
];

// ============================================
// Durations
// ============================================

export interface Duration {
  minutes: number;
  label: string;
  scenes: number;
}

export const DURATIONS: Duration[] = [
  {
    minutes: 20/60, // 20 segundos
    label: "20 segundos",
    scenes: 1,
  },
  {
    minutes: 1,
    label: "1 minuto",
    scenes: 3,
  },
  {
    minutes: 2,
    label: "2 minutos",
    scenes: 5,
  },
  {
    minutes: 3,
    label: "3 minutos",
    scenes: 7,
  },
  {
    minutes: 5,
    label: "5 minutos",
    scenes: 10,
  },
  {
    minutes: 10,
    label: "10 minutos",
    scenes: 15,
  },
  {
    minutes: 15,
    label: "15 minutos",
    scenes: 20,
  },
  {
    minutes: 30,
    label: "30 minutos",
    scenes: 30,
  },
];

// ============================================
// Movie Status Config
// ============================================

export interface MovieStatusConfig {
  label: string;
  color: string;
  description: string;
  progress: number;
}

export const MOVIE_STATUS_CONFIG: Record<
  "draft" | "script_generating" | "video_generating" | "audio_generating" | "assembling" | "completed" | "failed" | "published" | "pending_review" | "rejected" | "processing",
  MovieStatusConfig
> = {
  draft: {
    label: "Borrador",
    color: "#6B6B6B",
    description: "Película en borrador, lista para generar",
    progress: 0,
  },
  script_generating: {
    label: "Generando Guión",
    color: "#3B82F6",
    description: "Generando el guión con IA",
    progress: 10,
  },
  video_generating: {
    label: "Generando Video",
    color: "#8B5CF6",
    description: "Generando las escenas de video",
    progress: 50,
  },
  audio_generating: {
    label: "Generando Audio",
    color: "#F59E0B",
    description: "Generando diálogos y música",
    progress: 75,
  },
  assembling: {
    label: "Ensamblando",
    color: "#22C55E",
    description: "Uniendo video, audio y música",
    progress: 90,
  },
  completed: {
    label: "Completada",
    color: "#39FF14",
    description: "Película generada exitosamente",
    progress: 100,
  },
  failed: {
    label: "Error",
    color: "#EF4444",
    description: "Error en la generación",
    progress: 0,
  },
  published: {
    label: "Publicada",
    color: "#39FF14",
    description: "Disponible en el marketplace",
    progress: 100,
  },
  pending_review: {
    label: "Pendiente de Revisión",
    color: "#F59E0B",
    description: "Esperando aprobación de técnico",
    progress: 0,
  },
  rejected: {
    label: "Rechazada",
    color: "#EF4444",
    description: "Rechazada por el técnico",
    progress: 0,
  },
  processing: {
    label: "En Proceso",
    color: "#3B82F6",
    description: "Película en proceso de generación",
    progress: 50,
  },
};

// ============================================
// Music Moods
// ============================================

export type MusicMood = "epic" | "tense" | "romantic" | "sad" | "happy" | "mysterious" | "action" | "horror";

export const MUSIC_MOODS: Record<MusicMood, { label: string; icon: string; description: string }> = {
  epic: {
    label: "Épico",
    icon: "🎺",
    description: "Música grandiosa y emocionante",
  },
  tense: {
    label: "Tenso",
    icon: "🎻",
    description: "Suspense y tensión",
  },
  romantic: {
    label: "Romántico",
    icon: "💕",
    description: "Música suave y romántica",
  },
  sad: {
    label: "Triste",
    icon: "😢",
    description: "Música melancólica y emotiva",
  },
  happy: {
    label: "Alegre",
    icon: "😊",
    description: "Música positiva y energética",
  },
  mysterious: {
    label: "Misterioso",
    icon: "🔮",
    description: "Música enigmática y atmosférica",
  },
  action: {
    label: "Acción",
    icon: "💥",
    description: "Música dinámica y rápida",
  },
  horror: {
    label: "Terror",
    icon: "👻",
    description: "Música inquietante y escalofriante",
  },
};
