import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No authorization" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").single();
    if (!roleData) return new Response(JSON.stringify({ error: "Admin only" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { id, email, full_name, password, action } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: "id is required" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      // Soft disable: Ban the user so they can't login, and mark as inactive to hide from lists.
      // This preserves all their tasks and sales history.
      const { error } = await supabase.auth.admin.updateUserById(id, { ban_duration: '876000h' });
      if (error) throw error;
      await supabase.from("profiles").update({ is_active: false }).eq("id", id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "email and full_name are required" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update Auth user
    const updatePayload: any = {
      email,
      user_metadata: { full_name }
    };
    
    if (password && password.trim().length > 0) {
      updatePayload.password = password;
    }

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(id, updatePayload);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update profile table sync
    await supabase.from("profiles").update({ email, full_name }).eq("id", id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
