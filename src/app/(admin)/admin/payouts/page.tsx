import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminPayoutsClient } from "./admin-payouts-client";

export default async function AdminPayoutsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar rol admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Obtener liquidaciones
  const { data: payouts = [] } = await supabaseAdmin
    .from("payouts")
    .select(
      `
      *,
      profiles!payouts_user_id_fkey (
        id,
        full_name,
        email
      )
    `
    )
    .order("created_at", { ascending: false });

  // Obtener estadísticas
  const { data: pendingPayouts = [] } = await supabaseAdmin
    .from("payouts")
    .select("amount")
    .eq("status", "pending");

  const { data: completedPayouts = [] } = await supabaseAdmin
    .from("payouts")
    .select("amount")
    .eq("status", "completed")
    .gte("processed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const totalPending = pendingPayouts.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const totalCompleted = completedPayouts.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  return (
    <AdminPayoutsClient
      payouts={payouts || []}
      totalPending={totalPending}
      totalCompleted={totalCompleted}
    />
  );
}

