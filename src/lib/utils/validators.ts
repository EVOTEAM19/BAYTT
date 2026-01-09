// ============================================
// BAYTT - Validators (Zod Schemas)
// ============================================

import { z } from "zod";

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

// ============================================
// Movie Schemas
// ============================================

// Schema base - los límites se validan dinámicamente desde la configuración
export const createMovieSchema = (minDuration: number = 20/60, maxDuration: number = 180) => z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  genre: z.string().min(1, "Debes seleccionar un género"),
  duration_minutes: z.number()
    .min(minDuration, `La duración mínima es ${minDuration >= 1 ? `${minDuration} minuto${minDuration > 1 ? 's' : ''}` : `${Math.round(minDuration * 60)} segundos`}`)
    .max(maxDuration, `La duración máxima es ${maxDuration} minutos`),
  user_prompt: z.string().min(50, "El prompt debe tener al menos 50 caracteres"),
  user_plot: z.string().optional(),
  user_ending: z.string().optional(),
  ending_type: z.enum(["user", "ai"]),
  character_ids: z.array(z.string()).optional(),
});

// Schema por defecto (para compatibilidad) - 20 segundos mínimo
export const createMovieSchemaDefault = createMovieSchema(20/60, 180);

// ============================================
// Character Schemas
// ============================================

export const characterSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  category: z.enum(["protagonist", "antagonist", "secondary", "professional", "fantasy", "child"]),
  tags: z.array(z.string()).optional(),
  reference_images: z.array(z.string()).min(1, "Debes subir al menos 1 imagen de referencia"),
  thumbnail_url: z.string().optional(),
  voice_provider_id: z.string().optional(),
  voice_id: z.string().optional(),
  voice_name: z.string().optional(),
  visual_prompt_base: z.string().optional(),
  is_premium: z.boolean().optional(),
});

// ============================================
// Provider Schemas
// ============================================

export const providerSchema = z.object({
  type: z.enum(["video", "audio", "music", "llm", "storage", "image", "lora_training", "lip_sync"]),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string().min(2, "El slug debe tener al menos 2 caracteres"),
  api_url: z.union([
    z.string().url("URL inválida"),
    z.literal(""),
    z.null()
  ]).optional(),
  api_key: z.string().optional(),
  api_key_encrypted: z.string().optional(),
  api_version: z.string().optional(), // ⭐ NUEVO: Versión de API
  auth_method: z.enum(["bearer", "api_key", "custom", "basic", "none"]),
  config: z.record(z.unknown()).nullable().optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
  cost_per_second: z.number().min(0).nullable().optional(),
  cost_per_request: z.number().min(0).nullable().optional(),
}).passthrough(); // Permite campos adicionales que no están en el schema

// ============================================
// Plan Schemas
// ============================================

export const planSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string().min(2, "El slug debe tener al menos 2 caracteres"),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0"),
  movies_per_month: z.number().int().min(0),
  max_duration_minutes: z.number().int().min(1),
  rentals_per_month: z.number().int().min(0),
  video_quality: z.enum(["720p", "1080p", "4k"]),
  has_ads: z.boolean(),
  custom_characters: z.boolean(),
  can_publish_marketplace: z.boolean(),
  marketplace_commission: z.number().min(0).max(100).optional(),
  stripe_price_id: z.string().optional(),
  is_active: z.boolean().optional(),
});

// ============================================
// Review Schemas
// ============================================

export const reviewSchema = z.object({
  movie_id: z.string().uuid("ID de película inválido"),
  rating: z.number().int().min(1, "La calificación mínima es 1").max(5, "La calificación máxima es 5"),
  comment: z.string().min(10, "El comentario debe tener al menos 10 caracteres").max(500, "El comentario no puede exceder 500 caracteres").optional(),
});

// ============================================
// Type Exports
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type CreateMovieInput = z.infer<ReturnType<typeof createMovieSchema>>;
export type CharacterInput = z.infer<typeof characterSchema>;
export type ProviderInput = z.infer<typeof providerSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
