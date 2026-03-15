import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone_number, password, full_name, role } = await req.json();

    if (!phone_number || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Phone number, password, and name are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify OTP was completed for this phone
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: otpRecord } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone_number", phone_number)
      .eq("verified", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: "Phone number not verified. Please complete OTP verification first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create user with admin API (auto-confirmed since phone was verified via OTP)
    const placeholderEmail = `${phone_number.replace(/\+/g, "")}@phone.examready.local`;

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: placeholderEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: role || "user",
        phone_number,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Clean up OTP records
    await supabaseAdmin.from("phone_otps").delete().eq("phone_number", phone_number);

    return new Response(JSON.stringify({ success: true, message: "Account created successfully" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
