import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, plan_id, plans(name)")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar - Solo visible en mobile */}
      <div className="lg:hidden">
        <Navbar />
      </div>

      <div className="flex">
        {/* Sidebar - Oculto en mobile, visible en desktop */}
        <div className="hidden lg:block">
          <Sidebar
            user={{
              role: profile?.role as "user" | "admin" | "superadmin" | undefined,
              plan: profile?.plans
                ? { name: (profile.plans as any).name }
                : undefined,
            }}
          />
        </div>

        {/* Contenido principal */}
        <main className="flex-1 lg:ml-64">
          <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Solo visible en mobile */}
      <div className="lg:hidden">
        <MobileNav />
        {/* Padding bottom para que el contenido no quede oculto */}
        <div className="h-16" />
      </div>
    </div>
  );
}
