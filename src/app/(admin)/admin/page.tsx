import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminDashboardClient } from "./admin-dashboard-client";

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(now.setDate(now.getDate() - 7));
  const monthStart = new Date(now.setMonth(now.getMonth() - 1));

  // Usuarios
  const { count: totalUsers } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: newUsersToday } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  const { count: newUsersYesterday } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date(todayStart.getTime() - 86400000).toISOString())
    .lt("created_at", todayStart.toISOString());

  // Películas
  const { count: totalMovies } = await supabaseAdmin
    .from("movies")
    .select("*", { count: "exact", head: true });

  const { count: inProgressMovies } = await supabaseAdmin
    .from("movies")
    .select("*", { count: "exact", head: true })
    .in("status", [
      "script_generating",
      "video_generating",
      "audio_generating",
      "assembling",
    ]);

  const { count: failedMovies } = await supabaseAdmin
    .from("movies")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  // Ingresos (de rentals)
  const { data: todayRevenue } = await supabaseAdmin
    .from("rentals")
    .select("price_paid")
    .eq("payment_status", "completed")
    .gte("created_at", todayStart.toISOString());

  const { data: weekRevenue } = await supabaseAdmin
    .from("rentals")
    .select("price_paid")
    .eq("payment_status", "completed")
    .gte("created_at", weekStart.toISOString());

  const { data: monthRevenue } = await supabaseAdmin
    .from("rentals")
    .select("price_paid")
    .eq("payment_status", "completed")
    .gte("created_at", monthStart.toISOString());

  const revenueToday =
    todayRevenue?.reduce((sum, r) => sum + (r.price_paid || 0), 0) || 0;
  const revenueWeek =
    weekRevenue?.reduce((sum, r) => sum + (r.price_paid || 0), 0) || 0;
  const revenueMonth =
    monthRevenue?.reduce((sum, r) => sum + (r.price_paid || 0), 0) || 0;

  // Costes de API (de generation_jobs)
  const { data: todayCosts } = await supabaseAdmin
    .from("generation_jobs")
    .select("cost")
    .gte("created_at", todayStart.toISOString());

  const { data: weekCosts } = await supabaseAdmin
    .from("generation_jobs")
    .select("cost")
    .gte("created_at", weekStart.toISOString());

  const costsToday =
    todayCosts?.reduce((sum, j) => sum + (j.cost || 0), 0) || 0;
  const costsWeek =
    weekCosts?.reduce((sum, j) => sum + (j.cost || 0), 0) || 0;

  // Datos para gráficos (últimos 30 días)
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
  
  // Usuarios por día
  const { data: usersData } = await supabaseAdmin
    .from("profiles")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Ingresos por día
  const { data: revenueData } = await supabaseAdmin
    .from("rentals")
    .select("created_at, price_paid")
    .eq("payment_status", "completed")
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Películas por estado
  const { data: moviesByStatus } = await supabaseAdmin
    .from("movies")
    .select("status");

  // Actividad reciente
  const { data: recentMovies = [] } = await supabaseAdmin
    .from("movies")
    .select("id, title, status, created_at, user_id, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: recentUsers = [] } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // Alertas
  const { data: failedJobs = [] } = await supabaseAdmin
    .from("generation_jobs")
    .select("id, movie_id, job_type, error_message, created_at")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: providersWithErrors = [] } = await supabaseAdmin
    .from("api_providers")
    .select("id, name, type, is_active")
    .eq("is_active", false);

  // Procesar datos para gráficos
  const usersChartData = processChartData(usersData || [], "created_at");
  const revenueChartData = processRevenueChartData(revenueData || []);

  const moviesStatusData = processMoviesByStatus(moviesByStatus || []);

  // Calcular tendencia de usuarios
  let usersTrend = 0;
  if (newUsersYesterday && newUsersYesterday > 0) {
    usersTrend = ((newUsersToday || 0) - newUsersYesterday) / newUsersYesterday * 100;
  } else if (newUsersToday && newUsersToday > 0) {
    usersTrend = 100; // 100% de aumento si no había usuarios ayer
  }

  return (
    <AdminDashboardClient
      stats={{
        users: {
          total: totalUsers || 0,
          newToday: newUsersToday || 0,
          trend: usersTrend,
        },
        movies: {
          total: totalMovies || 0,
          inProgress: inProgressMovies || 0,
          failed: failedMovies || 0,
        },
        revenue: {
          today: revenueToday,
          week: revenueWeek,
          month: revenueMonth,
        },
        costs: {
          today: costsToday,
          week: costsWeek,
        },
      }}
      usersChartData={usersChartData}
      revenueChartData={revenueChartData}
      moviesStatusData={moviesStatusData}
      recentMovies={recentMovies}
      recentUsers={recentUsers}
      failedJobs={failedJobs}
      providersWithErrors={providersWithErrors}
    />
  );
}

function processChartData(
  data: Array<{ created_at: string }>,
  dateField: string
): Array<{ date: string; value: number }> {
  const grouped: Record<string, number> = {};

  data.forEach((item) => {
    const date = new Date(item[dateField as keyof typeof item] as string);
    const dateKey = date.toISOString().split("T")[0];
    grouped[dateKey] = (grouped[dateKey] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function processRevenueChartData(
  data: Array<{ created_at: string; price_paid: number }>
): Array<{ date: string; revenue: number }> {
  const grouped: Record<string, number> = {};

  data.forEach((item) => {
    const date = new Date(item.created_at);
    const dateKey = date.toISOString().split("T")[0];
    grouped[dateKey] = (grouped[dateKey] || 0) + (item.price_paid || 0);
  });

  return Object.entries(grouped)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function processMoviesByStatus(
  data: Array<{ status: string }>
): Array<{ status: string; count: number }> {
  const grouped: Record<string, number> = {};

  data.forEach((item) => {
    grouped[item.status] = (grouped[item.status] || 0) + 1;
  });

  return Object.entries(grouped).map(([status, count]) => ({
    status,
    count,
  }));
}
