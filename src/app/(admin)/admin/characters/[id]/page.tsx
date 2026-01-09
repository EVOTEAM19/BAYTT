import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AdminCharacterFormClient } from "../new/admin-character-form-client";

export default async function AdminCharacterEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Manejar tanto el formato nuevo (Promise) como el antiguo
  const resolvedParams = params instanceof Promise ? await params : params;
  const characterId = resolvedParams.id;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Obtener personaje
  const { data: character } = await supabaseAdmin
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .maybeSingle();

  if (!character) {
    notFound();
  }

  // Obtener proveedores de audio activos
  const { data: audioProviders = [] } = await supabaseAdmin
    .from("api_providers")
    .select("*")
    .eq("type", "audio")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  return (
    <AdminCharacterFormClient
      audioProviders={audioProviders}
      character={character}
    />
  );
}

