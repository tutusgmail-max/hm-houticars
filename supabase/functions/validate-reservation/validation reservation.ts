// ============================================================
// HoutiCars — Edge Function: validate-reservation
// POST /functions/v1/validate-reservation
// ============================================================
// Called BEFORE creating a reservation to:
//   1. Validate all inputs server-side
//   2. Check real-time car availability
//   3. Calculate authoritative price
//   4. Return a signed "reservation token" (prevents price tampering)
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN_SECRET  = Deno.env.get("RESERVATION_TOKEN_SECRET")!; // set in Supabase secrets

const corsHeaders = {
  "Access-Control-Allow-Origin":  Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationRequest {
  car_id:          string;
  start_date:      string;  // ISO date "YYYY-MM-DD"
  end_date:        string;
  pickup_location: string;
  return_location: string;
  payment_method:  string;
  client_notes?:   string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Authenticate user ──────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Missing authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Unauthorized");
    }

    // ── Check user is not banned ───────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_banned, driving_license_verified")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse(404, "Profile not found");
    }

    if (profile.is_banned) {
      return errorResponse(403, "Your account has been suspended");
    }

    // ── Parse & validate request body ─────────────────────
    const body: ValidationRequest = await req.json();
    const validationErrors = validateInput(body);

    if (validationErrors.length > 0) {
      return errorResponse(400, "Validation failed", { errors: validationErrors });
    }

    const startDate = new Date(body.start_date);
    const endDate   = new Date(body.end_date);
    const today     = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return errorResponse(400, "Start date cannot be in the past");
    }

    if (endDate <= startDate) {
      return errorResponse(400, "End date must be after start date");
    }

    // ── Check car exists and is active ────────────────────
    const { data: car, error: carError } = await supabase
      .from("cars")
      .select("id, brand, model, price_per_day, availability_status, active")
      .eq("id", body.car_id)
      .eq("active", true)
      .single();

    if (carError || !car) {
      return errorResponse(404, "Car not found or unavailable");
    }

    if (car.availability_status !== "available") {
      return errorResponse(409, "Car is currently unavailable");
    }

    // ── Check availability via DB function ─────────────────
    const { data: available, error: availError } = await supabase
      .rpc("is_car_available", {
        p_car_id: body.car_id,
        p_start:  body.start_date,
        p_end:    body.end_date,
      });

    if (availError) {
      console.error("Availability check error:", availError);
      return errorResponse(500, "Could not check availability");
    }

    if (!available) {
      return errorResponse(409, "Car is not available for selected dates");
    }

    // ── Calculate authoritative price ─────────────────────
    const { data: totalPrice, error: priceError } = await supabase
      .rpc("calculate_reservation_price", {
        p_car_id: body.car_id,
        p_start:  body.start_date,
        p_end:    body.end_date,
      });

    if (priceError) {
      return errorResponse(500, "Could not calculate price");
    }

    // ── Generate signed validation token (valid 10 min) ───
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(TOKEN_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        user_id:         user.id,
        car_id:          body.car_id,
        start_date:      body.start_date,
        end_date:        body.end_date,
        total_price:     totalPrice,
        pickup_location: body.pickup_location,
        return_location: body.return_location,
        payment_method:  body.payment_method,
        exp:             Math.floor(Date.now() / 1000) + 600, // 10 minutes
      },
      key
    );

    return jsonResponse(200, {
      valid: true,
      quote: {
        car_id:      car.id,
        car_name:    `${car.brand} ${car.model}`,
        start_date:  body.start_date,
        end_date:    body.end_date,
        days:        Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000),
        price_per_day: car.price_per_day,
        total_price: totalPrice,
        currency:    "MAD",
      },
      validation_token: token,  // client sends this back when booking
    });

  } catch (err) {
    console.error("validate-reservation error:", err);
    return errorResponse(500, "Internal server error");
  }
});

// ── Input validation ──────────────────────────────────────────
function validateInput(body: ValidationRequest): string[] {
  const errors: string[] = [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const validPaymentMethods = ["cash", "bank_transfer", "card", "online"];

  if (!body.car_id || !uuidRegex.test(body.car_id)) {
    errors.push("Invalid car_id");
  }
  if (!body.start_date || !dateRegex.test(body.start_date)) {
    errors.push("Invalid start_date format (use YYYY-MM-DD)");
  }
  if (!body.end_date || !dateRegex.test(body.end_date)) {
    errors.push("Invalid end_date format (use YYYY-MM-DD)");
  }
  if (!body.pickup_location?.trim()) {
    errors.push("pickup_location is required");
  }
  if (!body.return_location?.trim()) {
    errors.push("return_location is required");
  }
  if (!body.payment_method || !validPaymentMethods.includes(body.payment_method)) {
    errors.push(`payment_method must be one of: ${validPaymentMethods.join(", ")}`);
  }

  return errors;
}

// ── Response helpers ──────────────────────────────────────────
function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string, extra?: Record<string, unknown>) {
  return jsonResponse(status, { error: true, message, ...extra });
}
