import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function MyCharactersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Personajes"
        subtitle="Gestiona tus personajes personalizados"
        actions={
          <Button asChild>
            <Link href="/create-character">
              <Plus className="mr-2 h-4 w-4" />
              Crear Personaje
            </Link>
          </Button>
        }
      />

      <div className="text-center py-12 text-foreground-muted">
        <p>No tienes personajes personalizados aún.</p>
        <p className="text-sm mt-2">
          Crea personajes personalizados para usar en tus películas.
        </p>
      </div>
    </div>
  );
}
