import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si está autenticado, redirigir al dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Si no está autenticado, redirigir al marketplace
  redirect("/browse");
}
