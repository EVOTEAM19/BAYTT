// ============================================
// BAYTT - Admin Plans API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { planSchema } from "@/lib/utils/validators";

// GET - Listar todos los planes
export async function GET(request: NextRequest) {
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

    const { data: plans, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      return NextResponse.json(
        { error: "Error al obtener planes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plans || [],
    });
  } catch (error) {
    console.error("Error in GET /api/admin/plans:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo plan
export async function POST(request: NextRequest) {
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
    const validated = planSchema.parse(body);

    // Verificar slug único
    const { data: existing } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("slug", validated.slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un plan con ese slug" },
        { status: 400 }
      );
    }

    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .insert(validated)
      .select()
      .single();

    if (error) {
      console.error("Error creating plan:", error);
      return NextResponse.json(
        { error: "Error al crear plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/plans:", error);
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

