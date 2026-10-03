import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) throw new Error("Server configuration is unavailable");

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: caller, error: callerError } = await admin.from("profiles").select("role,status").eq("id", userData.user.id).single();
    if (callerError || caller?.role !== "admin" || caller?.status !== "active") {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.full_name || "").trim();
    const role = body.role === "admin" ? "admin" : "doctor";
    if (!email || !email.includes("@")) return new Response(JSON.stringify({ error: "Valid email is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    if (fullName.length < 2) return new Response(JSON.stringify({ error: "Full name is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: body.redirect_to || undefined,
      data: { full_name: fullName },
    });
    if (inviteError) throw inviteError;
    if (!invited.user) throw new Error("Invite did not create a user");

    const { error: profileError } = await admin.from("profiles").update({ role, status: "active", full_name: fullName }).eq("id", invited.user.id);
    if (profileError) throw profileError;

    if (role === "doctor") {
      const { error: doctorError } = await admin.from("doctor_profiles").upsert({ user_id: invited.user.id, verification_status: "pending" }, { onConflict: "user_id" });
      if (doctorError) throw doctorError;
    }

    await admin.from("audit_events").insert({
      actor_id: userData.user.id,
      action: "user_invited",
      entity_type: "profile",
      entity_id: invited.user.id,
      metadata: { role, email },
    });

    return new Response(JSON.stringify({ id: invited.user.id, email, role }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || "Invite failed" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});