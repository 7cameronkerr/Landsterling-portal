// ============================================================================
//  EDGE FUNCTION: notify-whatsapp   (send Cameron an instant WhatsApp on any
//  meaningful portal activity — new registration, particulars/data-room
//  request, further-details enquiry, call-back request, etc.)
//
//  NOT LIVE UNTIL CONFIGURED. With no credentials set, this function returns
//  {skipped:true} and does nothing — it never blocks or breaks the calling
//  flow (email notifications via Formspree keep working regardless).
//
//  Supports two providers — set Function secret WHATSAPP_PROVIDER to one of:
//
//  'twilio' (simplest to get running — Twilio manages the WhatsApp
//    infrastructure for you):
//      TWILIO_ACCOUNT_SID    - from twilio.com console
//      TWILIO_AUTH_TOKEN     - from twilio.com console
//      TWILIO_WHATSAPP_FROM  - your Twilio WhatsApp sender, e.g. 'whatsapp:+14155238886'
//      NOTIFY_WHATSAPP_TO    - Cameron's WhatsApp number, e.g. 'whatsapp:+971509005736'
//
//  'meta' (Meta WhatsApp Cloud API direct — cheaper per message, more setup):
//      META_WA_TOKEN         - permanent access token from Meta Business Manager
//      META_WA_PHONE_ID      - the WhatsApp Business phone number ID
//      META_WA_TEMPLATE_NAME - an approved message template name (business-
//                               initiated messages outside a 24h chat window
//                               require an approved template, not free text)
//      NOTIFY_WHATSAPP_TO    - Cameron's WhatsApp number, e.g. '971509005736'
//
//  See docs/WHATSAPP-SETUP.md for the exact external setup checklist.
// ============================================================================
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function formatMessage(table: string, r: Record<string, unknown>): string {
  const name = String(r.name ?? [r.first_name, r.last_name].filter(Boolean).join(" ") ?? "").trim() || "(name not given)";
  const company = r.company ? String(r.company) : null;
  const phone = String(r.mobile ?? r.phone ?? "").trim();
  const lines: string[] = [];

  if (table === "access_requests") {
    lines.push("New portal access request");
  } else {
    const typeLabel: Record<string, string> = {
      particulars: "Requested particulars",
      data_room: "Requested data room access",
      enquiry: "Requested further details",
      callback: "Requested a call-back",
      research: "Requested a research report",
    };
    lines.push(typeLabel[String(r.type)] ?? "New opportunity enquiry");
  }
  lines.push(name);
  if (company) lines.push(company);
  if (phone) lines.push(phone);
  if (r.opportunity_name && r.opportunity_name !== "General Enquiry") lines.push(String(r.opportunity_name));
  if (r.budget) lines.push("Budget: " + r.budget);
  if (r.target_location) lines.push("Location: " + r.target_location);
  if (r.message) lines.push("Comment: " + String(r.message).slice(0, 200));
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const ok = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const provider = Deno.env.get("WHATSAPP_PROVIDER") ?? "";
    const to = Deno.env.get("NOTIFY_WHATSAPP_TO") ?? "";
    if (!provider || !to) return ok({ skipped: "WhatsApp notifications not configured" });

    const payload = await req.json();
    const table = payload.table;
    const r = payload.record ?? {};
    const message = formatMessage(table, r);

    if (provider === "twilio") {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
      const token = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
      const from = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "";
      if (!sid || !token || !from) return ok({ skipped: "Twilio credentials incomplete" });
      const body = new URLSearchParams({ From: from, To: to, Body: message });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${sid}:${token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) return ok({ error: await res.text() }, 502);
      return ok({ ok: true, provider });
    }

    if (provider === "meta") {
      const token = Deno.env.get("META_WA_TOKEN") ?? "";
      const phoneId = Deno.env.get("META_WA_PHONE_ID") ?? "";
      const templateName = Deno.env.get("META_WA_TEMPLATE_NAME") ?? "";
      if (!token || !phoneId) return ok({ skipped: "Meta WhatsApp credentials incomplete" });
      // Business-initiated messages outside an open 24h window need an approved
      // template. If no template is configured, attempt free-form text (only
      // works inside an open window — e.g. Cameron messaged the number first).
      const body = templateName
        ? {
            messaging_product: "whatsapp", to, type: "template",
            template: { name: templateName, language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: message }] }] },
          }
        : { messaging_product: "whatsapp", to, type: "text", text: { body: message } };
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return ok({ error: await res.text() }, 502);
      return ok({ ok: true, provider });
    }

    return ok({ skipped: `unknown provider ${provider}` });
  } catch (e) {
    return ok({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
