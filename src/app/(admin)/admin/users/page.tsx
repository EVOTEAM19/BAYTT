import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Obtener todos los usuarios con sus planes y conteo de películas
  const { data: users = [] } = await supabaseAdmin
    .from("profiles")
    .select(
      `
      *,
      plans (*)
    `
    )
    .order("created_at", { ascending: false });

  // Obtener conteo de películas por usuario
  const usersWithMovies = await Promise.all(
    users.map(async (userData) => {
      const { count } = await supabaseAdmin
        .from("movies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userData.id);

      const plan = Array.isArray((userData as any).plans)
        ? (userData as any).plans[0]
        : (userData as any).plans;

      return {
        ...userData,
        plans: plan,
        movies_count: count || 0,
      };
    })
  );

  // Obtener todos los planes para el filtro
  const { data: plans = [] } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  return (
    <AdminUsersClient
      users={usersWithMovies}
      plans={plans}
      currentUserId={user.id}
    />
  );
}
