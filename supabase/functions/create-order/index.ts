// Supabase Edge Function: create-order
// Creates a Razorpay order and returns the order_id.
// Deploy with:
//   supabase functions deploy create-order
// Required secrets:
//   RAZORPAY_KEY_ID      = rzp_live_SNnU8ftzmAC4jA
//   RAZORPAY_KEY_SECRET  = e3fkInGlSS6S3qTV9RK43M9W

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("[create-order] Missing Razorpay secrets");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing Razorpay keys" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Parse request body (optional — caller can override amount/receipt)
    let body: { amount?: number; currency?: string; receipt?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body — use defaults
    }

    const amount   = body.amount   ?? 100;           // ₹1 in paise
    const currency = body.currency ?? "INR";
    const receipt  = body.receipt  ?? "trial_payment";

    // Build Basic Auth header: base64(key_id:key_secret)
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency, receipt }),
    });

    const rzpBody = await rzpRes.json();

    if (!rzpRes.ok) {
      console.error("[create-order] Razorpay error:", rzpBody);
      return new Response(
        JSON.stringify({ error: rzpBody?.error?.description ?? "Razorpay order creation failed" }),
        { status: rzpRes.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    console.log("[create-order] Order created:", rzpBody.id);

    // Return order_id (and the full order for debugging)
    return new Response(
      JSON.stringify({ order_id: rzpBody.id, order: rzpBody }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-order] Unexpected error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
