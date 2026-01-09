import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AdminUserDetailClient } from "./admin-user-detail-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return null;
  }

  // Obtener usuario
  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", params.id)
    .maybeSingle();

  if (!user) {
    notFound();
  }

  const plan = Array.isArray((user as any).plans)
    ? (user as any).plans[0]
    : (user as any).plans;

  // Verificar si es superadmin
  const { data: currentProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .maybeSingle();

  const isSuperAdmin = currentProfile?.role === "superadmin";

  // Obtener películas del usuario
  const { data: movies = [] } = await supabaseAdmin
    .from("movies")
    .select("*")
    .eq("user_id", params.id)
    .order("created_at", { ascending: false });

  // Obtener transacciones (rentals donde es creator)
  const { data: transactions = [] } = await supabaseAdmin
    .from("rentals")
    .select("*, movies(title)")
    .eq("creator_id", params.id)
    .eq("payment_status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);

  // Obtener alquileres del usuario
  const { data: rentals = [] } = await supabaseAdmin
    .from("rentals")
    .select("*, movies(title)")
    .eq("user_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Obtener todos los planes
  const { data: plans = [] } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  return (
    <AdminUserDetailClient
      user={user}
      plan={plan}
      movies={movies}
      transactions={transactions}
      rentals={rentals}
      plans={plans}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

