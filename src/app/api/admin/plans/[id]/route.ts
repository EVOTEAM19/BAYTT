// ============================================
// BAYTT - Admin Plans [id] API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planSchema } from "@/lib/utils/validators";

// GET - Obtener plan por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" || profile?.role === "superadmin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching plan:", error);
      return NextResponse.json(
        { error: "Error al obtener plan" },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/plans/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" || profile?.role === "superadmin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = planSchema.partial().parse(body);

    // Verificar slug único si se está actualizando
    if (validated.slug) {
      const { data: existing } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("slug", validated.slug)
        .neq("id", params.id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "Ya existe un plan con ese slug" },
          { status: 400 }
        );
      }
    }

    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .update(validated)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating plan:", error);
      return NextResponse.json(
        { error: "Error al actualizar plan" },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/plans/[id]:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin =
      profile?.role === "admin" || profile?.role === "superadmin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    // Verificar si hay usuarios con este plan
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", params.id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un plan con usuarios asignados" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("plans")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Error deleting plan:", error);
      return NextResponse.json(
        { error: "Error al eliminar plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Plan eliminado correctamente",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/plans/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

