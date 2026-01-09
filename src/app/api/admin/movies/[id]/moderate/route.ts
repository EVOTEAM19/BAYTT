import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST - Moderar película (aprobar o rechazar)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar que sea admin o superadmin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { approve } = body;

    // Obtener la película
    const { data: movie, error: movieError } = await supabaseAdmin
      .from("movies")
      .select("*")
      .eq("id", params.id)
      .single();

    if (movieError || !movie) {
      return NextResponse.json(
        { error: "Película no encontrada" },
        { status: 404 }
      );
    }

    if (approve) {
      // Aprobar: cambiar estado a completed y publicar
      const { error: updateError } = await supabaseAdmin
        .from("movies")
        .update({
          status: "completed",
          is_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) {
        console.error("Error approving movie:", updateError);
        return NextResponse.json(
          { error: "Error al aprobar película" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Película aprobada y publicada",
      });
    } else {
      // Rechazar: cambiar estado a rejected
      const { error: updateError } = await supabaseAdmin
        .from("movies")
        .update({
          status: "rejected",
          is_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) {
        console.error("Error rejecting movie:", updateError);
        return NextResponse.json(
          { error: "Error al rechazar película" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Película rechazada",
      });
    }
  } catch (error: any) {
    console.error("Error in POST /api/admin/movies/[id]/moderate:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

