import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MovieCreationForm } from "@/components/admin/movie-creation-form";

export default async function AdminCreateMoviePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar que sea admin o superadmin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin" && profile?.role !== "admin") {
    redirect("/admin");
  }

  return <MovieCreationForm />;
}

