import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET - Listar liquidaciones (admin) o del usuario actual
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const userId = searchParams.get("user_id");

    let query = supabaseAdmin.from("payouts").select("*");

    if (isAdmin) {
      // Admin puede ver todas las liquidaciones
      if (userId) {
        query = query.eq("user_id", userId);
      }
      if (status) {
        query = query.eq("status", status);
      }
    } else {
      // Usuario solo puede ver las suyas
      query = query.eq("user_id", user.id);
      if (status) {
        query = query.eq("status", status);
      }
    }

    const { data: payouts, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching payouts:", error);
      return NextResponse.json(
        { error: "Error al obtener liquidaciones" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: payouts || [] });
  } catch (error: any) {
    console.error("Error in GET /api/payouts:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear solicitud de liquidación (usuario) o procesar (admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount, payout_id } = body;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, wallet_balance, bank_account_number")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

    if (action === "request") {
      // Usuario solicita liquidación
      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: "El monto debe ser mayor a 0" },
          { status: 400 }
        );
      }

      if (!profile?.bank_account_number) {
        return NextResponse.json(
          { error: "Debes configurar tu número de cuenta primero" },
          { status: 400 }
        );
      }

      if ((profile.wallet_balance || 0) < amount) {
        return NextResponse.json(
          { error: "Saldo insuficiente en el monedero" },
          { status: 400 }
        );
      }

      // Crear solicitud de liquidación
      const { data: payout, error: createError } = await supabaseAdmin
        .from("payouts")
        .insert({
          user_id: user.id,
          amount,
          status: "pending",
          bank_account_number: profile.bank_account_number,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating payout:", createError);
        return NextResponse.json(
          { error: "Error al crear solicitud de liquidación" },
          { status: 500 }
        );
      }

      // Descontar del monedero
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          wallet_balance: (profile.wallet_balance || 0) - amount,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating wallet:", updateError);
        // Revertir la creación de payout
        await supabaseAdmin.from("payouts").delete().eq("id", payout.id);
        return NextResponse.json(
          { error: "Error al actualizar monedero" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: payout,
        message: "Solicitud de liquidación creada",
      });
    } else if (action === "process" && isAdmin) {
      // Admin procesa liquidación
      if (!payout_id) {
        return NextResponse.json(
          { error: "payout_id es requerido" },
          { status: 400 }
        );
      }

      const { transaction_reference, notes, status: newStatus } = body;

      const { data: payout, error: updateError } = await supabaseAdmin
        .from("payouts")
        .update({
          status: newStatus || "completed",
          transaction_reference,
          notes,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", payout_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error processing payout:", updateError);
        return NextResponse.json(
          { error: "Error al procesar liquidación" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: payout,
        message: "Liquidación procesada",
      });
    } else {
      return NextResponse.json(
        { error: "Acción no válida o no autorizada" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error in POST /api/payouts:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

