import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Verificar rol admin/superadmin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin =
    profile?.role === "admin" || profile?.role === "superadmin";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Verificar si Mock Mode está activo
  const { data: mockConfig } = await supabaseAdmin
    .from("admin_config")
    .select("value")
    .eq("key", "mock_mode")
    .maybeSingle();

  const mockModeActive = mockConfig?.value === true || false;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Admin Sidebar */}
      <AdminSidebar mockModeActive={mockModeActive} />

      {/* Contenido principal */}
      <main className="flex-1 ml-64">
        <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
