import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is an admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = claims.claims.sub as string;

    // Check caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can manage admin roles" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, email } = await req.json();

    if (action === "add") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Find user by email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return new Response(JSON.stringify({ error: "Failed to search users" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const targetUser = users.find((u: any) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "No account found with that email" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check if already admin
      const { data: alreadyAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: targetUser.id, _role: "admin" });
      if (alreadyAdmin) {
        return new Response(JSON.stringify({ error: "User is already an admin" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Add admin role
      const { error: insertError } = await supabaseAdmin.from("user_roles").insert({ user_id: targetUser.id, role: "admin" });
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, message: `${email} is now an admin` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "remove") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = users?.find((u: any) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "No account found with that email" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Can't remove yourself
      if (targetUser.id === callerId) {
        return new Response(JSON.stringify({ error: "You cannot remove your own admin role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error: deleteError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUser.id).eq("role", "admin");
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, message: `Admin role removed from ${email}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      const { data: adminRoles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (adminRoles || []).map((r: any) => r.user_id);
      
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const admins = users?.filter((u: any) => adminIds.includes(u.id)).map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      })) || [];

      return new Response(JSON.stringify({ admins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
