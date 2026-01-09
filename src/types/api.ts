// ============================================
// BAYTT - API Types
// ============================================

// ============================================
// Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Movie Request Types
// ============================================

export interface CreateMovieRequest {
  title: string;
  description?: string;
  genre: string;
  duration_minutes: number;
  user_prompt: string;
  user_plot?: string;
  user_ending?: string;
  ending_type: "user" | "ai";
  character_ids?: string[];
}

export interface GenerateScriptRequest {
  movie_id: string;
  user_prompt: string;
  user_plot?: string;
  user_ending?: string;
  genre: string;
  duration_minutes: number;
  character_ids?: string[];
}

export interface GeneratedScript {
  movie_id: string;
  full_text: string;
  summary: string;
  total_scenes: number;
  scenes: SceneOutline[];
  is_approved: boolean;
}

// ============================================
// Scene Types
// ============================================

export interface SceneOutline {
  scene_number: number;
  title: string;
  description: string;
  dialogue: string | null;
  characters: string[];
  duration_seconds: number;
  visual_prompt: string;
  audio_prompt: string | null;
  music_mood: string | null;
  transition_to_next: string | null;
}

// ============================================
// Generation Progress
// ============================================

export interface GenerationProgress {
  movie_id: string;
  status: "draft" | "script_generating" | "video_generating" | "audio_generating" | "assembling" | "completed" | "failed" | "published";
  progress: number;
  current_step: string;
  scenes_completed: number;
  total_scenes: number;
  estimated_time_remaining: number | null; // seconds
}

// ============================================
// Provider Config
// ============================================

export interface ProviderConfig {
  primary_id: string | null;
  fallback_id: string | null;
  mock_mode: boolean;
}

// ============================================
// Admin Config Values
// ============================================

export interface AdminConfigValues {
  mock_mode: boolean;
  video_config: ProviderConfig;
  audio_config: ProviderConfig;
  music_config: ProviderConfig;
  llm_config: ProviderConfig;
  assembly_settings: {
    default_quality: "720p" | "1080p" | "4k";
    enable_watermark: boolean;
    compression_level: number;
    audio_bitrate: number;
  };
}

// ============================================
// Admin Stats
// ============================================

export interface AdminStats {
  users: {
    total: number;
    active: number;
    new_this_month: number;
  };
  movies: {
    total: number;
    published: number;
    generating: number;
    completed_this_month: number;
  };
  revenue: {
    total: number;
    this_month: number;
    from_subscriptions: number;
    from_rentals: number;
  };
  costs: {
    total: number;
    this_month: number;
    video_generation: number;
    audio_generation: number;
    llm_usage: number;
    storage: number;
  };
  providers: Array<{
    id: string;
    name: string;
    type: string;
    requests: number;
    cost: number;
    status: "active" | "inactive" | "error";
  }>;
}
