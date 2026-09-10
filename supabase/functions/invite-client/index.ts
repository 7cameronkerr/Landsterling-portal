// ============================================================================
//  EDGE FUNCTION: invite-client   (Onboarding Path A — admin invites a client)
//  - Verifies the caller is an authenticated ADMIN.
//  - Sends a Supabase invite email so the client can set a password.
//  - Pre-approves the client (status = 'approved') so they can log in at once.
//
//  Deploy:  supabase functions deploy invite-client   (or paste in the
//  Supabase dashboard → Edge Functions). No manual secrets needed — Supabase
//  injects SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- 1. Authenticate the caller from their bearer token -----------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    // --- 2. Confirm the caller is an admin ----------------------------------
    const { data: profile } = await callerClient
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
      return json({ error: "Admin access required" }, 403);
    }

    // --- 3. Parse input -----------------------------------------------------
    const { email, first_name, last_name, mobile, company, redirectTo } = await req.json();
    if (!email) return json({ error: "Email is required" }, 400);

    // --- 4. Invite via the service-role client ------------------------------
    // Metadata flows into the profile row via the handle_new_user trigger.
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name, mobile, company, status: "approved" },
      redirectTo: redirectTo || undefined,
    });
    if (error) return json({ error: error.message }, 400);

    // Ensure the profile is marked approved even if the trigger defaulted it.
    if (data?.user?.id) {
      await admin.from("profiles")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }

    return json({ ok: true, user_id: data?.user?.id ?? null });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
