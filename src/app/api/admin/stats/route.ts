// ============================================
// BAYTT - Admin Stats API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET - Obtener estadísticas del dashboard
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Verificar rol admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" || profile?.role === "superadmin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No autorizado - Se requiere rol admin" },
        { status: 403 }
      );
    }

    // Obtener parámetros de fecha
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Usuarios
    const { count: totalUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: newUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

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

    const { count: completedMovies } = await supabaseAdmin
      .from("movies")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { count: failedMovies } = await supabaseAdmin
      .from("movies")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed");

    // Ingresos
    const { data: revenueData } = await supabaseAdmin
      .from("rentals")
      .select("price_paid, created_at")
      .eq("payment_status", "completed")
      .gte("created_at", startDate.toISOString());

    const totalRevenue =
      revenueData?.reduce((sum, r) => sum + (r.price_paid || 0), 0) || 0;

    // Costes de API
    const { data: costData } = await supabaseAdmin
      .from("generation_jobs")
      .select("cost, created_at")
      .gte("created_at", startDate.toISOString());

    const totalCosts =
      costData?.reduce((sum, j) => sum + (j.cost || 0), 0) || 0;

    // Usuarios por día
    const { data: usersByDay } = await supabaseAdmin
      .from("profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString());

    // Ingresos por día
    const { data: revenueByDay } = await supabaseAdmin
      .from("rentals")
      .select("created_at, price_paid")
      .eq("payment_status", "completed")
      .gte("created_at", startDate.toISOString());

    // Procesar datos para gráficos
    const usersChart = processChartData(usersByDay || [], "created_at");
    const revenueChart = processRevenueChartData(revenueByDay || []);

    // Películas por estado
    const { data: moviesByStatus } = await supabaseAdmin
      .from("movies")
      .select("status");

    const moviesStatusChart = processMoviesByStatus(moviesByStatus || []);

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: totalUsers || 0,
          new: newUsers || 0,
        },
        movies: {
          total: totalMovies || 0,
          inProgress: inProgressMovies || 0,
          completed: completedMovies || 0,
          failed: failedMovies || 0,
        },
        revenue: {
          total: totalRevenue,
          period,
        },
        costs: {
          total: totalCosts,
          period,
        },
        profit: totalRevenue - totalCosts,
        charts: {
          users: usersChart,
          revenue: revenueChart,
          moviesByStatus: moviesStatusChart,
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/stats:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Helper functions

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

