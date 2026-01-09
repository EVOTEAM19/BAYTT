"use client";

import { StatsCardsGrid, StatsCard } from "@/components/admin/stats-cards";
import { StatsChart } from "@/components/admin/stats-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate, timeAgo } from "@/lib/utils/formatters";

function formatChartDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Borrador",
    script_generating: "Generando Guión",
    video_generating: "Generando Video",
    audio_generating: "Generando Audio",
    assembling: "Ensamblando",
    completed: "Completada",
    failed: "Fallida",
    published: "Publicada",
  };
  return labels[status] || status;
}
import {
  Users,
  Film,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminDashboardClientProps {
  stats: {
    users: {
      total: number;
      newToday: number;
      trend: number;
    };
    movies: {
      total: number;
      inProgress: number;
      failed: number;
    };
    revenue: {
      today: number;
      week: number;
      month: number;
    };
    costs: {
      today: number;
      week: number;
    };
  };
  usersChartData: Array<{ date: string; value: number }>;
  revenueChartData: Array<{ date: string; revenue: number }>;
  moviesStatusData: Array<{ status: string; count: number }>;
  recentMovies: any[];
  recentUsers: any[];
  failedJobs: any[];
  providersWithErrors: any[];
}

export function AdminDashboardClient({
  stats,
  usersChartData,
  revenueChartData,
  moviesStatusData,
  recentMovies,
  recentUsers,
  failedJobs,
  providersWithErrors,
}: AdminDashboardClientProps) {
  const router = useRouter();

  // Combinar datos de usuarios e ingresos para el gráfico
  const allDates = new Set([
    ...usersChartData.map((d) => d.date),
    ...revenueChartData.map((d) => d.date),
  ]);

  const combinedChartData = Array.from(allDates)
    .sort()
    .map((date) => {
      const userData = usersChartData.find((d) => d.date === date);
      const revenueData = revenueChartData.find((d) => d.date === date);
      return {
        date: formatChartDate(date),
        usuarios: userData?.value || 0,
        ingresos: revenueData?.revenue || 0,
      };
    });

  const statsCards: Array<React.ComponentProps<typeof StatsCard>> = [
    {
      title: "Usuarios Totales",
      value: stats.users.total,
      trend: {
        value: stats.users.trend,
        label: "vs ayer",
      },
      icon: <Users className="h-4 w-4" />,
      onClick: () => router.push("/admin/users"),
    },
    {
      title: "Nuevos Hoy",
      value: stats.users.newToday,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Películas Totales",
      value: stats.movies.total,
      icon: <Film className="h-4 w-4" />,
      onClick: () => router.push("/admin/movies"),
    },
    {
      title: "En Progreso",
      value: stats.movies.inProgress,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      title: "Fallidas",
      value: stats.movies.failed,
      icon: <XCircle className="h-4 w-4" />,
    },
    {
      title: "Ingresos Hoy",
      value: formatPrice(stats.revenue.today),
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Ingresos Semana",
      value: formatPrice(stats.revenue.week),
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Ingresos Mes",
      value: formatPrice(stats.revenue.month),
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      title: "Costes API Hoy",
      value: formatPrice(stats.costs.today),
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: "Costes API Semana",
      value: formatPrice(stats.costs.week),
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Panel de Administración
        </h1>
        <p className="text-foreground-muted mt-1">
          Resumen general de la plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCardsGrid cards={statsCards} columns={4} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users & Revenue Chart */}
        <StatsChart
          title="Usuarios e Ingresos (30 días)"
          data={combinedChartData}
          series={[
            {
              key: "usuarios",
              name: "Usuarios",
              color: "#39FF14",
            },
            {
              key: "ingresos",
              name: "Ingresos",
              color: "#3B82F6",
            },
          ]}
          type="line"
        />

        {/* Movies by Status */}
        <StatsChart
          title="Películas por Estado"
          data={moviesStatusData.map((m) => ({
            date: formatStatusLabel(m.status),
            count: m.count,
          }))}
          series={[
            {
              key: "count",
              name: "Cantidad",
              color: "#8B5CF6",
            },
          ]}
          type="bar"
        />
      </div>

      {/* Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground-muted mb-2">
                Últimas Películas
              </h3>
              <div className="space-y-2">
                {recentMovies.slice(0, 5).map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-card-hover transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {movie.title}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {timeAgo(movie.created_at)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {movie.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground-muted mb-2">
                Nuevos Usuarios
              </h3>
              <div className="space-y-2">
                {recentUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-card-hover transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {timeAgo(user.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Failed Jobs */}
            {failedJobs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-error mb-2">
                  Trabajos Fallidos ({failedJobs.length})
                </h3>
                <div className="space-y-2">
                  {failedJobs.slice(0, 5).map((job) => (
                    <div
                      key={job.id}
                      className="p-2 rounded bg-error/10 border border-error/20"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {job.job_type} - {timeAgo(job.created_at)}
                      </p>
                      {job.error_message && (
                        <p className="text-xs text-foreground-muted mt-1 truncate">
                          {job.error_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push("/admin/analytics")}
                >
                  Ver todos
                </Button>
              </div>
            )}

            {/* Providers with Errors */}
            {providersWithErrors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-warning mb-2">
                  APIs Inactivas ({providersWithErrors.length})
                </h3>
                <div className="space-y-2">
                  {providersWithErrors.slice(0, 5).map((provider) => (
                    <div
                      key={provider.id}
                      className="p-2 rounded bg-warning/10 border border-warning/20"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {provider.name} ({provider.type})
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push("/admin/providers")}
                >
                  Ver todos
                </Button>
              </div>
            )}

            {failedJobs.length === 0 && providersWithErrors.length === 0 && (
              <div className="text-center py-8 text-foreground-muted">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay alertas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

