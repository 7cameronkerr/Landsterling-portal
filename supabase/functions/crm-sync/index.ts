// ============================================================================
//  EDGE FUNCTION: crm-sync   (Item 36 — push leads to your CRM)
//  Triggered by a Supabase DATABASE WEBHOOK on INSERT into:
//    - access_requests   (new registration)
//    - enquiries         (Download Particulars / Book a Call / enquiry)
//  Supports HubSpot or Attio. Set these Function secrets (Supabase dashboard):
//    CRM_PROVIDER = 'hubspot' | 'attio'
//    CRM_API_KEY  = <your CRM API key>
//  Wire-up: Database → Webhooks → create webhook → INSERT on those tables →
//  point at this function's URL. See SETUP.md (Phase 2).
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // The browser sends a CORS preflight OPTIONS request before the real POST —
  // this must be answered immediately, before touching req.json().
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const ok = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const provider = Deno.env.get("CRM_PROVIDER") ?? "";
    const apiKey = Deno.env.get("CRM_API_KEY") ?? "";
    if (!provider || !apiKey) return ok({ skipped: "CRM not configured" });

    const payload = await req.json();
    const table = payload.table;
    const r = payload.record ?? {};

    // Normalise either table into a single contact shape
    const contact = {
      email:   r.email ?? "",
      name:    [r.first_name, r.last_name].filter(Boolean).join(" ") || r.name || "",
      phone:   r.mobile ?? r.phone ?? "",
      company: r.company ?? "",
      source:  table === "access_requests" ? "Portal registration" : `Portal ${r.type ?? "enquiry"}`,
      note:    table === "enquiries"
                 ? `${r.type ?? "Enquiry"} — ${r.opportunity_name ?? "General"}: ${r.message ?? ""}`
                 : "New access request",
    };
    if (!contact.email) return ok({ skipped: "no email" });

    if (provider === "hubspot") {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: {
            email: contact.email,
            firstname: r.first_name ?? contact.name.split(" ")[0] ?? "",
            lastname: r.last_name ?? contact.name.split(" ").slice(1).join(" "),
            phone: contact.phone,
            company: contact.company,
            hs_lead_status: "NEW",
            lifecyclestage: "lead",
          },
        }),
      });
      // 409 = contact already exists; that's fine for our purposes.
      if (!res.ok && res.status !== 409) return ok({ error: await res.text() }, 502);
      return ok({ ok: true, provider });
    }

    if (provider === "attio") {
      // Assert (upsert) a person by email in Attio.
      const res = await fetch(
        "https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses",
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              values: {
                email_addresses: [{ email_address: contact.email }],
                name: contact.name ? [{ full_name: contact.name }] : undefined,
                phone_numbers: contact.phone ? [{ original_phone_number: contact.phone }] : undefined,
              },
            },
          }),
        },
      );
      if (!res.ok) return ok({ error: await res.text() }, 502);
      return ok({ ok: true, provider });
    }

    return ok({ skipped: `unknown provider ${provider}` });
  } catch (e) {
    return ok({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
