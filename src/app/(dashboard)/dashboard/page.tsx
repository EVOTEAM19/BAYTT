import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  const plan = Array.isArray((profile as any).plans)
    ? (profile as any).plans[0]
    : (profile as any).plans;

  // Obtener estadísticas
  const { count: totalMovies } = await supabaseAdmin
    .from("movies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: publishedMovies } = await supabaseAdmin
    .from("movies")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_published", true);

  const { data: activeRentals } = await supabaseAdmin
    .from("rentals")
    .select("id")
    .eq("user_id", user.id)
    .eq("payment_status", "completed")
    .gt("rental_end", new Date().toISOString());

  // Calcular ingresos (suma de creator_earning de rentals de películas publicadas)
  const { data: earningsData } = await supabaseAdmin
    .from("rentals")
    .select("creator_earning")
    .eq("creator_id", user.id)
    .eq("payment_status", "completed");

  const totalEarnings =
    earningsData?.reduce((sum, r) => sum + (r.creator_earning || 0), 0) || 0;

  // Obtener estadísticas de películas publicadas
  const { data: publishedMoviesData = [] } = await supabaseAdmin
    .from("movies")
    .select("views_count, rentals_count")
    .eq("user_id", user.id)
    .eq("is_published", true);

  const totalViews = publishedMoviesData.reduce((sum, m) => sum + (m.views_count || 0), 0);
  const totalRentals = publishedMoviesData.reduce((sum, m) => sum + (m.rentals_count || 0), 0);

  // Películas en progreso
  const { data: inProgressMovies = [] } = await supabaseAdmin
    .from("movies")
    .select("*")
    .eq("user_id", user.id)
    .in("status", [
      "script_generating",
      "video_generating",
      "audio_generating",
      "assembling",
    ])
    .order("created_at", { ascending: false })
    .limit(5);

  // Películas alquiladas activas
  const { data: activeRentalsData = [] } = await supabaseAdmin
    .from("rentals")
    .select("*, movies(*)")
    .eq("user_id", user.id)
    .eq("payment_status", "completed")
    .gt("rental_end", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  // Últimas películas creadas
  const { data: recentMovies = [] } = await supabaseAdmin
    .from("movies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <DashboardClient
      user={user}
      profile={profile}
      plan={plan}
      stats={{
        totalMovies: totalMovies || 0,
        publishedMovies: publishedMovies || 0,
        activeRentals: activeRentals?.length || 0,
        totalEarnings,
        totalViews,
        totalRentals,
      }}
      inProgressMovies={inProgressMovies}
      activeRentals={activeRentalsData}
      recentMovies={recentMovies}
    />
  );
}
