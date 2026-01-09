import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar con búsqueda prominente */}
      <Navbar />

      {/* Contenido principal - Estilo Netflix browse */}
      <main className="flex-1">
        <div className="space-y-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
