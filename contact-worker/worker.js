/**
 * skaluj.ai — most formularz kontaktowy -> Resend
 * Cloudflare Worker. Trzyma RESEND_API_KEY po stronie serwera (sekret).
 *
 * Deploy: patrz contact-worker/README.md
 * Sekrety/zmienne (Cloudflare -> Worker -> Settings -> Variables):
 *   RESEND_API_KEY  (Secret)  — klucz z https://resend.com/api-keys
 *   TO_EMAIL        (opcj.)   — dokad przychodza zgloszenia (domyslnie kontakt@skaluj.ai)
 *   FROM_EMAIL      (opcj.)   — nadawca; do czasu weryfikacji domeny w Resend uzyj
 *                                "skaluj.ai <onboarding@resend.dev>", pozniej "formularz@skaluj.ai"
 *   ALLOW_ORIGIN    (opcj.)   — dozwolony origin CORS (domyslnie "*")
 */

const SERVICE_LABELS = {
  strona: "Strona + SEO",
  email: "Email / Mailing",
  chatbot: "Chatbot AI",
  geo: "GEO / AI Search",
  ads: "Meta Ads",
  branding: "Branding",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const allow = env.ALLOW_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(allow) });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405, allow);
    }
    if (!env.RESEND_API_KEY) {
      return json({ ok: false, error: "Brak konfiguracji serwera (RESEND_API_KEY)." }, 500, allow);
    }

    let form;
    try {
      form = await request.formData();
    } catch (e) {
      return json({ ok: false, error: "Nieprawidlowe dane formularza." }, 400, allow);
    }

    // honeypot — boty wypelniaja ukryte pole
    if ((form.get("_gotcha") || "").toString().trim() !== "") {
      return json({ ok: true }, 200, allow); // udajemy sukces, nic nie wysylamy
    }

    const name = (form.get("name") || "").toString().trim();
    const email = (form.get("email") || "").toString().trim();
    const company = (form.get("company") || "").toString().trim();
    const message = (form.get("message") || "").toString().trim();
    const services = form.getAll("svc").map((s) => SERVICE_LABELS[s] || s);

    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !company) {
      return json({ ok: false, error: "Uzupelnij imie, poprawny e-mail i firme." }, 422, allow);
    }

    // zalacznik (opcjonalny) -> base64 dla Resend
    const attachments = [];
    for (const file of form.getAll("attachment")) {
      if (file && typeof file === "object" && file.size > 0) {
        if (file.size > 8 * 1024 * 1024) {
          return json({ ok: false, error: "Zalacznik za duzy (max 8 MB)." }, 413, allow);
        }
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        attachments.push({ filename: file.name || "zalacznik", content: btoa(bin) });
      }
    }

    const html = `
      <div style="font-family:system-ui,sans-serif;font-size:15px;color:#0b0d10;line-height:1.6">
        <h2 style="margin:0 0 14px">Nowe zapytanie ze skaluj.ai</h2>
        <p style="margin:0 0 4px"><strong>Imie i nazwisko:</strong> ${esc(name)}</p>
        <p style="margin:0 0 4px"><strong>E-mail:</strong> ${esc(email)}</p>
        <p style="margin:0 0 4px"><strong>Firma:</strong> ${esc(company)}</p>
        ${services.length ? `<p style="margin:0 0 4px"><strong>Zainteresowanie:</strong> ${esc(services.join(", "))}</p>` : ""}
        ${message ? `<p style="margin:12px 0 4px"><strong>Wiadomosc:</strong></p><p style="margin:0;white-space:pre-wrap">${esc(message)}</p>` : ""}
        ${attachments.length ? `<p style="margin:12px 0 0;color:#565d68">Zalaczniki: ${attachments.length}</p>` : ""}
      </div>`;

    const payload = {
      from: env.FROM_EMAIL || "skaluj.ai <onboarding@resend.dev>",
      to: [env.TO_EMAIL || "kontakt@skaluj.ai"],
      reply_to: email,
      subject: `Zapytanie: ${name} (${company})`,
      html,
    };
    if (attachments.length) payload.attachments = attachments;

    let r;
    try {
      r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json({ ok: false, error: "Nie udalo sie polaczyc z serwisem mailowym." }, 502, allow);
    }

    if (!r.ok) {
      let detail = "";
      try { detail = await r.text(); } catch (e) {}
      return json({ ok: false, error: "Wysylka nie powiodla sie.", status: r.status, detail: detail.slice(0, 400) }, 502, allow);
    }

    return json({ ok: true }, 200, allow);
  },
};
