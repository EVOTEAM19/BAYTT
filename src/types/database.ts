// ============================================
// BAYTT - Database Types (Supabase)
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      plans: {
        Row: Plan;
        Insert: Omit<Plan, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Plan, "id" | "created_at">>;
      };
      characters: {
        Row: Character;
        Insert: Omit<Character, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Character, "id" | "created_at">>;
      };
      user_characters: {
        Row: UserCharacter;
        Insert: Omit<UserCharacter, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserCharacter, "id" | "created_at">>;
      };
      movies: {
        Row: Movie;
        Insert: Omit<Movie, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Movie, "id" | "created_at">>;
      };
      scripts: {
        Row: Script;
        Insert: Omit<Script, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Script, "id" | "created_at">>;
      };
      scenes: {
        Row: Scene;
        Insert: Omit<Scene, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Scene, "id" | "created_at">>;
      };
      api_providers: {
        Row: ApiProvider;
        Insert: Omit<ApiProvider, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ApiProvider, "id" | "created_at">>;
      };
      admin_config: {
        Row: AdminConfig;
        Insert: Omit<AdminConfig, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AdminConfig, "id" | "created_at">>;
      };
      rentals: {
        Row: Rental;
        Insert: Omit<Rental, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Rental, "id" | "created_at">>;
      };
      generation_jobs: {
        Row: GenerationJob;
        Insert: Omit<GenerationJob, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<GenerationJob, "id" | "created_at">>;
      };
      payouts: {
        Row: Payout;
        Insert: Omit<Payout, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Payout, "id" | "created_at">>;
      };
      visual_bibles: {
        Row: VisualBible;
        Insert: Omit<VisualBible, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<VisualBible, "id" | "created_at">>;
      };
      movie_visual_bibles: {
        Row: MovieVisualBible;
        Insert: Omit<MovieVisualBible, "id">;
        Update: Partial<Omit<MovieVisualBible, "id">>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "user" | "admin" | "superadmin";
      subscription_status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
      video_quality: "720p" | "1080p" | "4k";
      character_category: "protagonist" | "antagonist" | "secondary" | "professional" | "fantasy" | "child";
      permission_level: "private" | "public";
      model_status: "pending" | "processing" | "ready" | "failed";
      ending_type: "user" | "ai";
      movie_status: "draft" | "script_generating" | "video_generating" | "audio_generating" | "assembling" | "completed" | "failed" | "published" | "pending_review" | "rejected" | "processing";
      clip_status: "pending" | "generating" | "completed" | "failed";
      provider_type: "video" | "audio" | "music" | "llm" | "storage";
      auth_method: "bearer" | "api_key" | "custom";
      job_type: "script" | "video" | "audio" | "assembly";
      job_status: "pending" | "processing" | "completed" | "failed";
      payment_status: "pending" | "completed" | "refunded" | "failed";
      payout_status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    };
  };
};

// ============================================
// Table Types
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan_id: string | null;
  subscription_status: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | null;
  stripe_customer_id: string | null;
  movies_created_this_month: number;
  rentals_this_month: number;
  wallet_balance: number; // Saldo en monedero (ingresos por alquileres)
  bank_account_number: string | null; // Número de cuenta para liquidaciones
  role: "user" | "admin" | "superadmin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  movies_per_month: number;
  max_duration_minutes: number;
  rentals_per_month: number;
  video_quality: "720p" | "1080p" | "4k";
  has_ads: boolean;
  custom_characters: boolean;
  can_publish_marketplace: boolean;
  marketplace_commission: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  name: string;
  slug: string;
  is_baytt_character: boolean;
  category: "protagonist" | "antagonist" | "secondary" | "professional" | "fantasy" | "child";
  gender: string | null;
  description: string | null;
  physical_traits: Record<string, any> | null; // JSON field
  wardrobe: Record<string, any> | null; // JSON field
  tags: string[];
  reference_images: string[];
  thumbnail_url: string | null;
  voice_provider_id: string | null;
  voice_id: string | null;
  voice_name: string | null;
  lora_model_url: string | null;
  lora_trigger_word: string | null;
  visual_prompt_base: string | null;
  usage_count: number;
  is_active: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCharacter {
  id: string;
  user_id: string;
  name: string;
  photos: string[];
  consent_given: boolean;
  permission_level: "private" | "public";
  model_status: "pending" | "processing" | "ready" | "failed";
  model_url: string | null;
  voice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Movie {
  id: string;
  user_id: string;
  title: string;
  slug: string | null; // Slug único para la URL
  description: string | null;
  genre: string;
  duration_minutes: number;
  user_prompt: string;
  user_plot: string | null;
  user_ending: string | null;
  ending_type: "user" | "ai";
  status: "draft" | "script_generating" | "video_generating" | "audio_generating" | "assembling" | "completed" | "failed" | "published" | "pending_review" | "rejected" | "processing";
  progress: number;
  thumbnail_url: string | null;
  video_url_720p: string | null;
  video_url_1080p: string | null;
  video_url_4k: string | null;
  is_published: boolean;
  rental_price: number | null;
  views_count: number;
  rentals_count: number;
  average_rating: number | null;
  available_plans: string[] | null; // Array de plan IDs. null = disponible para todos los planes
  is_deleted: boolean | null; // Soft delete: true si está eliminada
  deleted_at: string | null; // Fecha de eliminación
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  movie_id: string;
  full_text: string;
  summary: string | null;
  total_scenes: number;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  movie_id: string;
  scene_number: number;
  description: string;
  dialogue: string | null;
  character_ids: string[];
  visual_prompt: string;
  audio_prompt: string | null;
  music_mood: string | null;
  clip_url: string | null;
  clip_status: "pending" | "generating" | "completed" | "failed" | null;
  audio_dialogue_url: string | null;
  last_frame_url: string | null;
  first_frame_url: string | null;
  visual_context: Json | null;
  created_at: string;
  updated_at: string;
}

export interface ApiProvider {
  id: string;
  type: "video" | "audio" | "music" | "llm" | "storage" | "image" | "lora_training" | "lip_sync";
  name: string;
  slug: string;
  api_url: string | null;
  api_key_encrypted: string | null;
  auth_method: "bearer" | "api_key" | "custom";
  config: Json | null;
  is_active: boolean;
  is_default: boolean;
  priority: number;
  cost_per_second: number | null;
  cost_per_request: number | null;
  total_requests: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface AdminConfig {
  id: string;
  key: string;
  value: Json;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: string;
  movie_id: string;
  user_id: string;
  creator_id: string;
  price_paid: number;
  creator_earning: number;
  platform_earning: number;
  rental_end: string | null;
  watch_count: number;
  payment_status: "pending" | "completed" | "refunded" | "failed";
  created_at: string;
  updated_at: string;
}

export interface GenerationJob {
  id: string;
  movie_id: string | null;
  scene_id: string | null;
  job_type: "script" | "video" | "audio" | "assembly";
  status: "pending" | "processing" | "completed" | "failed";
  input_data: Json | null;
  output_data: Json | null;
  attempts: number;
  error_message: string | null;
  cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  bank_account_number: string;
  transaction_reference: string | null;
  notes: string | null;
  processed_by: string | null; // Admin que procesó la liquidación
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Type Helpers
// ============================================

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// ============================================
// Exports
// ============================================

// ============================================
// Visual Bible Types
// ============================================

export interface VisualBible {
  id: string;
  location_name: string;
  location_type: string;
  content: Json;
  reference_images: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovieVisualBible {
  id: string;
  movie_id: string;
  bible_id: string;
}

export type {
  Profile,
  Plan,
  Character,
  UserCharacter,
  Movie,
  Script,
  Scene,
  ApiProvider,
  AdminConfig,
  Rental,
  GenerationJob,
  Payout,
  VisualBible,
  MovieVisualBible,
};
