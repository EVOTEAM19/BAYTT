import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { WalletClient } from "./wallet-client";

export default async function WalletPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil con monedero
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_balance, bank_account_number")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Obtener liquidaciones del usuario
  const { data: payouts = [] } = await supabaseAdmin
    .from("payouts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Obtener historial de ingresos (rentals donde es creador)
  const { data: earningsHistory = [] } = await supabaseAdmin
    .from("rentals")
    .select(
      `
      id,
      creator_earning,
      price_paid,
      created_at,
      movies (
        id,
        title,
        thumbnail_url
      )
    `
    )
    .eq("creator_id", user.id)
    .eq("payment_status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <WalletClient
      walletBalance={profile.wallet_balance || 0}
      bankAccountNumber={profile.bank_account_number || ""}
      payouts={payouts || []}
      earningsHistory={earningsHistory || []}
    />
  );
}

