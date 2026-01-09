import { PageHeader } from "@/components/shared/page-header";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Análisis detallado de la plataforma"
      />

      <div className="text-center py-12 text-foreground-muted">
        <p>Página en desarrollo</p>
        <p className="text-sm mt-2">
          Aquí encontrarás análisis detallados y métricas avanzadas.
        </p>
      </div>
    </div>
  );
}
