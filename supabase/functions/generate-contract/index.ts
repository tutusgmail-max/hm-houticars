// ============================================================
// HoutiCars — Edge Function: generate-contract
// POST /functions/v1/generate-contract
// ============================================================
// Generates a PDF rental contract for a confirmed reservation
// Stores in private 'contracts' bucket
// Returns a signed URL valid for 1 hour
// ============================================================

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin":  Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "Missing authorization");

    const supabaseUser  = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return errorResponse(401, "Unauthorized");

    const { reservation_id } = await req.json();
    if (!reservation_id) return errorResponse(400, "reservation_id required");

    // ── Load reservation with all relations ───────────────
    const { data: res, error: resErr } = await supabaseAdmin
      .from("reservations")
      .select(`
        *,
        profiles!reservations_user_id_fkey (full_name, email, phone, city),
        cars (brand, model, year, license_plate, insurance_info, price_per_day)
      `)
      .eq("id", reservation_id)
      .single();

    if (resErr || !res) return errorResponse(404, "Reservation not found");

    // Verify caller owns reservation or is admin
    const isOwner = res.user_id === user.id;
    if (!isOwner) {
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("role").eq("id", user.id).single();
      if (!["admin", "super_admin"].includes(profile?.role)) {
        return errorResponse(403, "Access denied");
      }
    }

    if (res.reservation_status !== "confirmed") {
      return errorResponse(400, "Contract can only be generated for confirmed reservations");
    }

    // ── Generate HTML contract ─────────────────────────────
    const html = generateContractHTML(res);

    // ── Convert HTML → PDF via browser API or pdfkit ──────
    // In production, use a PDF service (Puppeteer, WeasyPrint, PDFShift, etc.)
    // Here we demonstrate storing the HTML as a stand-in until PDF service is wired.
    const contractBytes = new TextEncoder().encode(html);
    const fileName = `contract_${reservation_id}_${Date.now()}.html`;
    const storagePath = `${reservation_id}/${fileName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("contracts")
      .upload(storagePath, contractBytes, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return errorResponse(500, "Could not save contract");
    }

    // ── Create signed URL (1 hour) ─────────────────────────
    const { data: signedUrlData, error: signedErr } = await supabaseAdmin.storage
      .from("contracts")
      .createSignedUrl(storagePath, 3600);

    if (signedErr || !signedUrlData) {
      return errorResponse(500, "Could not generate contract URL");
    }

    // ── Update reservation with contract URL ───────────────
    await supabaseAdmin
      .from("reservations")
      .update({ contract_url: storagePath })
      .eq("id", reservation_id);

    return jsonResponse(200, {
      contract_url: signedUrlData.signedUrl,
      expires_in:   3600,
    });

  } catch (err) {
    console.error("generate-contract error:", err);
    return errorResponse(500, "Internal server error");
  }
});

// ── Contract HTML template ────────────────────────────────────
function generateContractHTML(res: Record<string, unknown>): string {
  const profile = res.profiles as Record<string, string>;
  const car     = res.cars     as Record<string, unknown>;
  const days    = Math.ceil(
    (new Date(res.end_date as string).getTime() - new Date(res.start_date as string).getTime()) / 86400000
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e55c00; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #e55c00; }
    h2 { color: #e55c00; }
    .section { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    td, th { padding: 10px; border: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .total { font-size: 20px; font-weight: bold; color: #e55c00; text-align: right; }
    .signature { display: flex; justify-content: space-between; margin-top: 60px; }
    .sig-box { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 8px; }
    .footer { margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🚗 HoutiCars</div>
      <div style="color:#888;font-size:13px;">Car Rental Contract</div>
    </div>
    <div style="text-align:right;">
      <div><strong>Contract #:</strong> ${(res.id as string).substring(0, 8).toUpperCase()}</div>
      <div><strong>Date:</strong> ${new Date().toLocaleDateString("en-GB")}</div>
    </div>
  </div>

  <div class="section">
    <h2>Renter Information</h2>
    <table>
      <tr><th>Name</th><td>${profile.full_name ?? "—"}</td><th>Email</th><td>${profile.email ?? "—"}</td></tr>
      <tr><th>Phone</th><td>${profile.phone ?? "—"}</td><th>City</th><td>${profile.city ?? "—"}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Vehicle Information</h2>
    <table>
      <tr><th>Vehicle</th><td>${car.brand} ${car.model} (${car.year})</td></tr>
      <tr><th>Price/Day</th><td>${car.price_per_day} MAD</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Rental Details</h2>
    <table>
      <tr><th>Pickup Date</th><td>${res.start_date}</td><th>Return Date</th><td>${res.end_date}</td></tr>
      <tr><th>Pickup Location</th><td>${res.pickup_location}</td><th>Return Location</th><td>${res.return_location}</td></tr>
      <tr><th>Duration</th><td>${days} day(s)</td><th>Payment Method</th><td>${res.payment_method}</td></tr>
    </table>
    <div class="total">Total: ${res.total_price} MAD</div>
  </div>

  <div class="section">
    <h2>Terms & Conditions</h2>
    <ol style="font-size:13px;line-height:1.8;">
      <li>The renter must hold a valid driving license during the entire rental period.</li>
      <li>The vehicle must be returned in the same condition as received.</li>
      <li>Any damage caused during the rental period is the responsibility of the renter.</li>
      <li>Smoking is strictly prohibited inside the vehicle.</li>
      <li>The renter is responsible for all traffic violations during the rental period.</li>
      <li>Fuel costs are the responsibility of the renter.</li>
      <li>Late returns may incur additional daily charges.</li>
    </ol>
  </div>

  <div class="signature">
    <div class="sig-box">HoutiCars Representative</div>
    <div class="sig-box">Renter Signature</div>
  </div>

  <div class="footer">
    This document constitutes a legally binding rental agreement between HoutiCars and the renter.
    Reservation ID: ${res.id} | Generated: ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, message: string) {
  return jsonResponse(status, { error: true, message });
}
