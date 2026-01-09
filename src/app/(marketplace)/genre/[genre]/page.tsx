import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { GENRES } from "@/types/movie";
import { MovieGrid } from "@/components/movies/movie-grid";
import { PageHeader } from "@/components/shared/page-header";

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: { genre: string };
  searchParams: { sort?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const genre = GENRES.find((g) => g.id === params.genre);

  if (!genre) {
    notFound();
  }

  // Obtener plan del usuario si está autenticado
  let userPlanId: string | null = null;
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan_id")
      .eq("id", user.id)
      .single();
    userPlanId = profile?.plan_id || null;
  }

  const sort = searchParams.sort || "popular";

  // Determinar orden
  let orderBy: { column: string; ascending: boolean } = {
    column: "views_count",
    ascending: false,
  };

  switch (sort) {
    case "new":
      orderBy = { column: "created_at", ascending: false };
      break;
    case "popular":
      orderBy = { column: "views_count", ascending: false };
      break;
    case "rated":
      orderBy = { column: "average_rating", ascending: false };
      break;
    case "price":
      orderBy = { column: "rental_price", ascending: true };
      break;
  }

  // Obtener películas del género con filtro de plan
  let moviesQuery = supabaseAdmin
    .from("movies")
    .select("*")
    .eq("is_published", true)
    .eq("status", "completed")
    .eq("genre", params.genre);

  if (userPlanId) {
    moviesQuery = moviesQuery.or(
      `available_plans.is.null,available_plans.cs.{${userPlanId}}`
    );
  } else {
    moviesQuery = moviesQuery.is("available_plans", null);
  }

  const { data: movies = [] } = await moviesQuery.order(orderBy.column, {
    ascending: orderBy.ascending,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={`${genre.icon} ${genre.name}`}
        subtitle="Explora películas de este género"
      />

      {/* Sort Options */}
      <div className="mb-6 flex flex-wrap gap-2">
        <SortButton currentSort={sort} sort="new" label="Nuevas" />
        <SortButton currentSort={sort} sort="popular" label="Populares" />
        <SortButton currentSort={sort} sort="rated" label="Mejor valoradas" />
        <SortButton currentSort={sort} sort="price" label="Precio" />
      </div>

      {/* Grid */}
      <MovieGrid movies={movies} />
    </div>
  );
}

function SortButton({
  currentSort,
  sort,
  label,
}: {
  currentSort: string;
  sort: string;
  label: string;
}) {
  const isActive = currentSort === sort;

  return (
    <a
      href={`?sort=${sort}`}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border text-foreground hover:bg-card-hover"
      }`}
    >
      {label}
    </a>
  );
}
