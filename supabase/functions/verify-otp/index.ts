import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone_number, otp_code } = await req.json();
    if (!phone_number || !otp_code) {
      return new Response(JSON.stringify({ error: "Phone number and OTP required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: otpRecord } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone_number", phone_number)
      .eq("otp_code", otp_code)
      .eq("verified", false)
      .single();

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: "Invalid OTP code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP has expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as verified
    await supabaseAdmin.from("phone_otps").update({ verified: true }).eq("id", otpRecord.id);

    return new Response(JSON.stringify({ success: true, verified: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
