// ============================================
// BAYTT - Plans API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET - Listar todos los planes activos
export async function GET(request: NextRequest) {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("is_active", true)
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
    console.error("Error in GET /api/plans:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
