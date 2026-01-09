// ============================================
// BAYTT - Constants
// ============================================

// ============================================
// Site Info
// ============================================

export const SITE_NAME = "BAYTT";
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "info@evoteam.es";

// ============================================
// File Upload
// ============================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// ============================================
// Rental Settings
// ============================================

export const RENTAL_DURATION_HOURS = 48;

// ============================================
// Video Settings
// ============================================

export const SCENE_DURATION_SECONDS = 10;
export const CROSSFADE_DURATION_SECONDS = 0.5;

// ============================================
// API Endpoints
// ============================================

export const API_ENDPOINTS = {
  // Auth
  auth: {
    callback: "/api/auth/callback",
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
  },
  
  // Movies
  movies: {
    list: "/api/movies",
    create: "/api/movies",
    get: (id: string) => `/api/movies/${id}`,
    update: (id: string) => `/api/movies/${id}`,
    delete: (id: string) => `/api/movies/${id}`,
    publish: (id: string) => `/api/movies/${id}/publish`,
    unpublish: (id: string) => `/api/movies/${id}/unpublish`,
    rent: (id: string) => `/api/movies/${id}/rent`,
  },
  
  // Generation
  generate: {
    script: "/api/generate/script",
    video: "/api/generate/video",
    audio: "/api/generate/audio",
    assemble: "/api/generate/assemble",
    progress: (movieId: string) => `/api/generate/progress/${movieId}`,
  },
  
  // Characters
  characters: {
    list: "/api/characters",
    create: "/api/characters",
    get: (id: string) => `/api/characters/${id}`,
    update: (id: string) => `/api/characters/${id}`,
    delete: (id: string) => `/api/characters/${id}`,
    userCharacters: "/api/characters/user",
  },
  
  // Providers
  providers: {
    list: "/api/providers",
    create: "/api/providers",
    get: (id: string) => `/api/providers/${id}`,
    update: (id: string) => `/api/providers/${id}`,
    delete: (id: string) => `/api/providers/${id}`,
    test: (id: string) => id ? `/api/providers/${id}/test` : "/api/providers/test",
  },
  
  // Payouts
  payouts: {
    list: "/api/payouts",
    create: "/api/payouts",
    get: (id: string) => `/api/payouts/${id}`,
    request: "/api/payouts",
  },
  
  // Admin Providers (same endpoints but clearer naming)
  adminProviders: {
    list: "/api/providers",
    create: "/api/providers",
    get: (id: string) => `/api/providers/${id}`,
    update: (id: string) => `/api/providers/${id}`,
    delete: (id: string) => `/api/providers/${id}`,
    test: (id: string) => `/api/providers/${id}/test`,
  },
  
  // Rentals
  rentals: {
    list: "/api/rentals",
    get: (id: string) => `/api/rentals/${id}`,
    myRentals: "/api/rentals/my",
  },
  
  // Plans
  plans: {
    list: "/api/plans",
    get: (id: string) => `/api/plans/${id}`,
    subscribe: (id: string) => `/api/plans/${id}/subscribe`,
    cancel: "/api/plans/cancel",
  },
  
  // Admin
  admin: {
    config: "/api/admin/config",
    stats: "/api/admin/stats",
    users: "/api/admin/users",
    movies: "/api/admin/movies",
    moderateMovie: (id: string) => `/api/admin/movies/${id}/moderate`,
    characters: "/api/admin/characters",
    providers: "/api/admin/providers",
    plans: "/api/admin/plans",
    plansById: (id: string) => `/api/admin/plans/${id}`,
  },
  
  // Webhooks
  webhooks: {
    stripe: "/api/webhooks/stripe",
  },
} as const;

// ============================================
// Pagination
// ============================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================
// Cache
// ============================================

export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
};

// ============================================
// Video Quality
// ============================================

export const VIDEO_QUALITIES = ["720p", "1080p", "4k"] as const;
export const DEFAULT_VIDEO_QUALITY = "1080p" as const;

// ============================================
// Movie Status
// ============================================

export const MOVIE_STATUSES = [
  "draft",
  "script_generating",
  "video_generating",
  "audio_generating",
  "assembling",
  "completed",
  "failed",
  "published",
  "pending_review",
  "rejected",
] as const;
