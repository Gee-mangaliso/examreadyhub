import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return `+27${digits.slice(1)}`;
  }
  if (digits.startsWith("27") && digits.length === 11) {
    return `+${digits}`;
  }

  return trimmed;
};

const errorResponse = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone_number } = await req.json();
    if (!phone_number) {
      return errorResponse(400, "Phone number required");
    }

    const normalizedPhone = normalizePhoneNumber(phone_number);
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accountSid || !authToken || !twilioPhone) {
      console.error("Twilio not configured", {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasTwilioPhone: !!twilioPhone,
      });
      return errorResponse(500, "SMS service not configured");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing backend env", { hasUrl: !!supabaseUrl, hasServiceRoleKey: !!serviceRoleKey });
      return errorResponse(500, "Server configuration error");
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    await supabaseAdmin.from("phone_otps").delete().eq("phone_number", normalizedPhone);

    const { error: insertErr } = await supabaseAdmin.from("phone_otps").insert({
      phone_number: normalizedPhone,
      otp_code: otp,
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      return errorResponse(500, "Failed to store OTP");
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: normalizedPhone,
      From: twilioPhone,
      Body: `Your ExamReady Hub verification code is: ${otp}. Valid for 10 minutes.`,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: body.toString(),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error("Twilio error:", errText);

      if (errText.includes("21212")) {
        return errorResponse(500, "SMS sender number is invalid. Use a Twilio sender number in E.164 format, e.g. +1234567890.");
      }

      if (errText.includes("21211")) {
        return errorResponse(400, "Invalid phone number. Use a real mobile number in international format, e.g. +27831234567.");
      }

      if (errText.includes("21266")) {
        return errorResponse(400, "The recipient number cannot be the same as your Twilio sender number. Use a different mobile number for testing OTP delivery.");
      }

      if (errText.includes("21608")) {
        return errorResponse(400, "This Twilio account is in trial mode and can only send OTPs to verified recipient numbers. Verify this phone number in Twilio or upgrade the account.");
      }

      if (errText.includes("21606")) {
        return errorResponse(400, "Your Twilio sender cannot send SMS to this destination. Check the sender type, region permissions, and messaging setup in Twilio.");
      }

      if (errText.includes("21408")) {
        return errorResponse(400, "SMS permissions are not enabled for this destination country in Twilio. Enable the country in Twilio Geo Permissions.");
      }

      return errorResponse(500, "Failed to send SMS. Check the Twilio logs for the destination number, sender type, and account status.");
    }

    return new Response(JSON.stringify({ success: true, phone_number: normalizedPhone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(500, "Internal server error");
  }
});
