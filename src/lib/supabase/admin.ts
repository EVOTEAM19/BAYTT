// ============================================
// BAYTT - Supabase Admin Client
// ============================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase con permisos de service_role
 * Solo usar en server-side para operaciones privilegiadas
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
