// ============================================================
// HoutiCars — Edge Function: confirm-reservation
// POST /functions/v1/confirm-reservation
// ============================================================
// Verifies the validation token then creates the reservation
// atomically. This is the ONLY way to create a reservation.
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN_SECRET  = Deno.env.get("RESERVATION_TOKEN_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  validation_token: string;
  client_notes?:    string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "Missing authorization");

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return errorResponse(401, "Unauthorized");

    const body: ConfirmRequest = await req.json();

    if (!body.validation_token) {
      return errorResponse(400, "validation_token is required");
    }

    // ── Verify the token ──────────────────────────────────
    let payload: Record<string, unknown>;
    try {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(TOKEN_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );
      payload = await verify(body.validation_token, key) as Record<string, unknown>;
    } catch {
      return errorResponse(400, "Invalid or expired validation token. Please re-validate.");
    }

    // ── Verify token belongs to this user ─────────────────
    if (payload.user_id !== user.id) {
      return errorResponse(403, "Token does not match authenticated user");
    }

    // ── Final availability re-check (prevents race) ───────
    const { data: stillAvailable } = await supabaseAdmin
      .rpc("is_car_available", {
        p_car_id: payload.car_id,
        p_start:  payload.start_date,
        p_end:    payload.end_date,
      });

    if (!stillAvailable) {
      return errorResponse(409, "Sorry, the car was just booked by another user. Please choose different dates.");
    }

    // ── Create reservation ────────────────────────────────
    const { data: reservation, error: insertErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        user_id:             user.id,
        car_id:              payload.car_id,
        start_date:          payload.start_date,
        end_date:            payload.end_date,
        pickup_location:     payload.pickup_location,
        return_location:     payload.return_location,
        payment_method:      payload.payment_method,
        total_price:         payload.total_price,
        client_notes:        body.client_notes ?? null,
        reservation_status:  "pending",
        payment_status:      "pending",
      })
      .select("id, created_at")
      .single();

    if (insertErr) {
      console.error("Reservation insert error:", insertErr);

      // Surface meaningful errors to the client
      if (insertErr.message?.includes("not available for the selected dates")) {
        return errorResponse(409, "Car is no longer available for those dates");
      }
      if (insertErr.message?.includes("Price mismatch")) {
        return errorResponse(400, "Pricing error. Please start over.");
      }

      return errorResponse(500, "Could not create reservation. Please try again.");
    }

    // ── Send admin notification ───────────────────────────
    // Insert notification for all admins
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ["admin", "super_admin"]);

    if (admins?.length) {
      const notifications = admins.map((a) => ({
        user_id:  a.id,
        title:    "New Reservation Received 🚗",
        message:  `A new reservation has been submitted and is awaiting review.`,
        type:     "reservation_new",
        metadata: { reservation_id: reservation.id },
      }));

      await supabaseAdmin.from("notifications").insert(notifications);
    }

    return jsonResponse(201, {
      success: true,
      reservation_id: reservation.id,
      message: "Reservation submitted successfully. We will confirm it shortly.",
    });

  } catch (err) {
    console.error("confirm-reservation error:", err);
    return errorResponse(500, "Internal server error");
  }
});

function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string, extra?: Record<string, unknown>) {
  return jsonResponse(status, { error: true, message, ...extra });
}
