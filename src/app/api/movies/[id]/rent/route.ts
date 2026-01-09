import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RENTAL_DURATION_HOURS } from "@/lib/utils/constants";

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

    const movieId = params.id;

    // Obtener película
    const { data: movie, error: movieError } = await supabaseAdmin
      .from("movies")
      .select("*, profiles!movies_user_id_fkey(id)")
      .eq("id", movieId)
      .single();

    if (movieError || !movie) {
      return NextResponse.json(
        { error: "Película no encontrada" },
        { status: 404 }
      );
    }

    if (!movie.is_published) {
      return NextResponse.json(
        { error: "La película no está publicada" },
        { status: 400 }
      );
    }

    // Verificar si ya tiene un alquiler activo
    const { data: existingRental } = await supabaseAdmin
      .from("rentals")
      .select("id")
      .eq("movie_id", movieId)
      .eq("user_id", user.id)
      .eq("payment_status", "completed")
      .gt("rental_end", new Date().toISOString())
      .maybeSingle();

    if (existingRental) {
      return NextResponse.json(
        { error: "Ya tienes un alquiler activo de esta película" },
        { status: 400 }
      );
    }

    // Obtener configuración de comisiones
    const { data: config } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", "marketplace_settings")
      .maybeSingle();

    const marketplaceSettings = config?.value || {};
    const creatorCommission =
      marketplaceSettings.creator_commission || 70; // % por defecto
    const platformCommission =
      marketplaceSettings.platform_commission || 30; // % por defecto

    const price = movie.rental_price || 2.99;
    const creatorEarning = (price * creatorCommission) / 100;
    const platformEarning = (price * platformCommission) / 100;

    // Calcular fecha de fin del alquiler
    const rentalEnd = new Date();
    rentalEnd.setHours(rentalEnd.getHours() + RENTAL_DURATION_HOURS);

    // Crear rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from("rentals")
      .insert({
        movie_id: movieId,
        user_id: user.id,
        creator_id: movie.user_id,
        price_paid: price,
        creator_earning: creatorEarning,
        platform_earning: platformEarning,
        rental_end: rentalEnd.toISOString(),
        watch_count: 0,
        payment_status: "completed", // En producción, esto vendría de Stripe webhook
      })
      .select()
      .single();

    if (rentalError) {
      console.error("Error creating rental:", rentalError);
      return NextResponse.json(
        { error: "Error al crear el alquiler" },
        { status: 500 }
      );
    }

    // Añadir creator_earning al monedero del creador
    const { data: creatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_balance")
      .eq("id", movie.user_id)
      .single();

    if (creatorProfile) {
      const newBalance = (creatorProfile.wallet_balance || 0) + creatorEarning;

      const { error: walletError } = await supabaseAdmin
        .from("profiles")
        .update({
          wallet_balance: newBalance,
        })
        .eq("id", movie.user_id);

      if (walletError) {
        console.error("Error updating wallet:", walletError);
        // No fallamos la operación, solo logueamos el error
      }
    }

    // Actualizar contadores de la película
    await supabaseAdmin
      .from("movies")
      .update({
        rentals_count: (movie.rentals_count || 0) + 1,
      })
      .eq("id", movieId);

    // Actualizar contador de rentals del usuario
    await supabaseAdmin
      .from("profiles")
      .update({
        rentals_this_month: (movie.profiles?.rentals_this_month || 0) + 1,
      })
      .eq("id", user.id);

    return NextResponse.json({
      success: true,
      data: rental,
      message: "Alquiler creado correctamente",
    });
  } catch (error: any) {
    console.error("Error in POST /api/movies/[id]/rent:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

