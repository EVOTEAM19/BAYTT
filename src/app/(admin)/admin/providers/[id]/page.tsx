import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AdminProviderFormClient } from "../new/admin-provider-form-client";

export default async function AdminProviderEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Manejar tanto el formato nuevo (Promise) como el antiguo
  const resolvedParams = params instanceof Promise ? await params : params;
  const providerId = resolvedParams.id;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Obtener proveedor
  const { data: provider } = await supabaseAdmin
    .from("api_providers")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();

  if (!provider) {
    notFound();
  }

  return <AdminProviderFormClient provider={provider} />;
}

