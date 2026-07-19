/* =====================================================================
   skaluj.ai — widżet czatu (self-injecting)
   Dodaj na każdej stronie przed </body>:  <script src="chatbot.js" defer></script>
   (na podstronach w /oferta i /blog użyj ścieżki ../chatbot.js)
   ===================================================================== */
(function () {
  /* ---------- KONFIGURACJA (uzupełnij po wdrożeniu) ---------- */
  const CONFIG = {
    // Adres Cloudflare Workera. Pusty => bot działa lokalnie (baseline, bez AI).
    WORKER_URL: "https://botszkalu.sergiuszserafin26.workers.dev/",
    // Link do Google Calendar „Harmonogram terminów" (Appointment schedule).
    // Pusty => karta rezerwacji pokaże przycisk kierujący do formularza kontaktu.
    BOOKING_URL: "",
    // Skąd pobrać wiedzę (dla trybu lokalnego bez Workera).
    KNOWLEDGE_URL: "wiedza.txt",
    // Osadzić kalendarz w oknie czatu (true) czy otwierać w nowej karcie (false).
    EMBED_CALENDAR: true,
  };

  if (window.__skalujChat) return; window.__skalujChat = true;

  /* ---------- STYLE ---------- */
  const CSS = `
  .cb-launcher{position:fixed;right:24px;bottom:24px;z-index:99998;height:58px;width:58px;border:none;cursor:pointer;border-radius:50%;
    background:#0b0d10;color:#fff;box-shadow:0 12px 34px rgba(11,13,16,.30),0 3px 10px rgba(15,30,60,.14);
    display:grid;place-items:center;transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .3s;
    opacity:0;pointer-events:none}
  .cb-launcher.cb-ready{opacity:1;pointer-events:auto;animation:cbEnter .62s cubic-bezier(.34,1.56,.64,1)}
  @keyframes cbEnter{0%{opacity:0;transform:scale(.2) translateY(34px)}55%{opacity:1;transform:scale(1.14) translateY(0)}100%{transform:scale(1)}}
  .cb-launcher:hover{transform:translateY(-2px);box-shadow:0 0 0 4px rgba(47,111,224,.16),0 14px 38px rgba(11,13,16,.34)}
  .cb-launcher .ic{width:24px;height:24px;transition:transform .4s cubic-bezier(.22,1,.36,1)}
  .cb-launcher .ic-close{position:absolute;transform:scale(0) rotate(90deg)}
  .cb-launcher.open .ic-chat{transform:scale(0) rotate(-90deg)}
  .cb-launcher.open .ic-close{transform:scale(1) rotate(0)}
  .cb-launcher .pulse{position:absolute;inset:0;border-radius:50%;animation:cbpulse 2.8s infinite}
  @keyframes cbpulse{0%{box-shadow:0 0 0 0 rgba(47,111,224,.34)}70%{box-shadow:0 0 0 14px rgba(47,111,224,0)}100%{box-shadow:0 0 0 0 rgba(47,111,224,0)}}
  .cb-badge{position:fixed;right:21px;bottom:64px;z-index:99999;background:var(--cb-accent,#2f6fe0);color:#fff;font:600 11px "Geist Mono",monospace;
    min-width:19px;height:19px;border-radius:10px;display:grid;place-items:center;padding:0 6px;box-shadow:0 2px 8px rgba(0,0,0,.18);opacity:0;transition:opacity .3s}
  .cb-launcher.open ~ .cb-badge{opacity:0;pointer-events:none}
  .cb-panel{position:fixed;right:24px;bottom:94px;z-index:99999;width:384px;max-width:calc(100vw - 32px);height:588px;max-height:calc(100dvh - 128px);
    background:#fff;border:1px solid rgba(0,0,0,.10);border-radius:18px;box-shadow:0 30px 80px rgba(15,30,60,.20),0 8px 24px rgba(15,30,60,.09);
    display:flex;flex-direction:column;overflow:hidden;font-family:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0b0d10;position:fixed;
    opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;transform-origin:bottom right;
    transition:opacity .32s cubic-bezier(.22,1,.36,1),transform .32s cubic-bezier(.22,1,.36,1)}
  .cb-panel::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;z-index:9;background:linear-gradient(90deg,transparent,rgba(0,0,0,.06),transparent)}
  .cb-panel.open{opacity:1;transform:none;pointer-events:auto}
  /* nagłówek = "okno" jak na stronie */
  .cb-head{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(0,0,0,.06);background:rgba(255,255,255,.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
  .cb-dots{display:flex;gap:7px;flex:none}
  .cb-dots i{width:9px;height:9px;border-radius:50%}
  .cb-dots i:nth-child(1){background:#ff5f57}.cb-dots i:nth-child(2){background:#febc2e}.cb-dots i:nth-child(3){background:#28c840}
  .cb-tag{font-family:"Geist Mono",monospace;font-size:9px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:#9a6a00;background:rgba(254,188,46,.16);border:1px solid rgba(254,188,46,.5);border-radius:5px;padding:2px 7px;flex:none}
  .cb-title{flex:1;text-align:center;font-family:"Geist Mono",monospace;font-size:11px;color:#8b929c;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cb-live{display:flex;align-items:center;gap:6px;font-family:"Geist Mono",monospace;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:#565d68;flex:none}
  .cb-live::before{content:"";width:6px;height:6px;border-radius:50%;background:#2f6fe0;box-shadow:0 0 9px #2f6fe0}
  .cb-hbtn{background:none;border:none;color:#8b929c;width:26px;height:26px;border-radius:7px;cursor:pointer;display:grid;place-items:center;transition:background .2s,color .2s;flex:none}
  .cb-hbtn:hover{background:rgba(0,0,0,.05);color:#0b0d10}
  .cb-body{flex:1;overflow-y:auto;padding:20px 16px 8px;background:#fbfcfd}
  .cb-body::-webkit-scrollbar{width:8px}.cb-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px;border:2px solid transparent;background-clip:padding-box}
  .cb-msg{display:flex;gap:9px;margin-bottom:14px;align-items:flex-end;animation:cbin .4s cubic-bezier(.22,1,.36,1) both}
  @keyframes cbin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .cb-msg .mava{width:28px;height:28px;border-radius:8px;background:#0b0d10;display:grid;place-items:center;flex:none}
  .cb-msg .mava svg{width:15px;height:15px;color:#fff}
  .cb-bubble{max-width:78%;padding:11px 14px;border-radius:14px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}
  .cb-msg.bot .cb-bubble{background:#eef1f5;border-bottom-left-radius:5px}
  .cb-msg.user{flex-direction:row-reverse}.cb-msg.user .cb-bubble{background:#0b0d10;color:#fff;border-bottom-right-radius:5px}
  .cb-bubble a{color:inherit;text-decoration:underline;text-underline-offset:2px}
  .cb-typing{display:flex;gap:4px;padding:14px 15px;background:#eef1f5;border-radius:14px;border-bottom-left-radius:5px;width:fit-content}
  .cb-typing i{width:7px;height:7px;border-radius:50%;background:#8b929c;animation:cbdot 1.2s infinite}
  .cb-typing i:nth-child(2){animation-delay:.18s}.cb-typing i:nth-child(3){animation-delay:.36s}
  @keyframes cbdot{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
  .cb-chips{display:flex;flex-wrap:wrap;gap:8px;padding:4px 16px 12px}
  .cb-chip{background:#fff;border:1px solid rgba(0,0,0,.10);color:#0b0d10;font:12.5px "Geist",sans-serif;padding:8px 13px;border-radius:9999px;cursor:pointer;transition:all .2s;white-space:nowrap}
  .cb-chip:hover{border-color:#2f6fe0;color:#2f6fe0;background:rgba(47,111,224,.08)}
  .cb-book{margin:2px 0 4px 37px;max-width:84%;border:1px solid rgba(0,0,0,.10);border-radius:14px;overflow:hidden;background:#fff;animation:cbin .4s cubic-bezier(.22,1,.36,1) both}
  .cb-book-top{padding:13px 15px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;align-items:center;gap:10px}
  .cb-book-top svg{width:19px;height:19px;color:#2f6fe0;flex:none}.cb-book-top b{font-size:13px}.cb-book-top span{display:block;font-size:11px;color:#565d68;margin-top:1px}
  .cb-book .cta{display:block;margin:12px 15px 14px;text-align:center;background:#0b0d10;color:#fff;text-decoration:none;font-size:13.5px;font-weight:500;padding:11px;border-radius:10px;transition:box-shadow .2s,background .2s}
  .cb-book .cta:hover{background:#000;box-shadow:0 0 0 3px rgba(47,111,224,.14)}.cb-book iframe{width:100%;height:520px;border:0;display:block}
  .cb-foot{padding:12px 14px;border-top:1px solid rgba(0,0,0,.10);background:#fff}
  .cb-inrow{display:flex;align-items:flex-end;gap:9px;background:#f7f8fa;border:1px solid rgba(0,0,0,.10);border-radius:13px;padding:6px 6px 6px 14px;transition:border-color .2s}
  .cb-inrow:focus-within{border-color:#2f6fe0}
  .cb-in{flex:1;border:none;background:none;outline:none;font:14px "Geist",sans-serif;color:#0b0d10;resize:none;max-height:96px;line-height:1.5;padding:6px 0}
  .cb-send{width:38px;height:38px;flex:none;border:none;border-radius:10px;cursor:pointer;background:#0b0d10;color:#fff;display:grid;place-items:center;transition:box-shadow .2s,background .2s}
  .cb-send:hover{background:#000;box-shadow:0 0 0 3px rgba(47,111,224,.14)}.cb-send:disabled{opacity:.4;cursor:default;box-shadow:none}
  .cb-cred{text-align:center;font:10px "Geist Mono",monospace;color:#8b929c;margin-top:8px;letter-spacing:.06em}.cb-cred b{color:#2f6fe0;font-weight:500}
  @media(max-width:600px){.cb-panel{right:12px;left:12px;bottom:84px;width:auto;height:min(70vh,540px);max-height:calc(100dvh - 92px)}.cb-launcher{right:16px;bottom:16px}.cb-badge{right:16px;bottom:60px}}
  `;

  /* ---------- WIEDZA (tryb lokalny bez Workera) ---------- */
  let KB = "";
  fetch(CONFIG.KNOWLEDGE_URL).then(r => r.text()).then(t => KB = t).catch(() => {});
  const SECTIONS = {};
  function parseKB() {
    let cur = "ogolne";
    (KB || "").split("\n").forEach(l => {
      const m = l.match(/^===\s*(.+?)\s*===$/) || l.match(/^\[\[(.+?)\]\]$/);
      if (m) { cur = m[1].toLowerCase(); SECTIONS[cur] = ""; }
      else if (l.trim() && !l.startsWith("#")) SECTIONS[cur] = (SECTIONS[cur] || "") + l.trim() + " ";
    });
  }
  function answerLocal(q) {
    parseKB();
    const t = q.toLowerCase();
    const map = [
      { k: ["cześć","czesc","hej","witam","siema","hello","dzień"], a: "Cześć! 👋 Jestem asystentem skaluj.ai. Zapytaj o ofertę, strony, automatyzacje, chatboty albo umów bezpłatną konsultację." },
      { k: ["spotkani","konsultacj","umów","umow","rozmow","demo","kalendarz","termin"], a: "Jasne — umówmy 30-minutową bezpłatną konsultację. Przyjdziemy z gotowym demo. Wybierz termin:", book: true },
      { k: ["cena","koszt","ile","wycena","cennik","budż"], s: "kontakt" },
      { k: ["strona","www","seo","geo","pozycjon"], s: "oferta: strona-seo" },
      { k: ["automatyz","mailing","faktur","crm","lead"], s: "oferta: automatyzacje-email" },
      { k: ["chatbot","bot","asystent","obsług"], s: "oferta: chatbot-ai" },
      { k: ["branding","logo","grafik","marka"], s: "oferta: branding" },
      { k: ["kontakt","mail","gdzie","rzeszów","lokaliz"], s: "kontakt" },
    ];
    let best = null, sc = 0;
    for (const it of map) { const s = it.k.reduce((a, w) => a + (t.includes(w) ? 1 : 0), 0); if (s > sc) { sc = s; best = it; } }
    if (!best) return { answer: "Chętnie pomogę! Po podłączeniu AI odpowiem na każde pytanie. Chcesz od razu umówić bezpłatną konsultację?", book: false };
    if (best.a && !best.s) return { answer: best.a, book: !!best.book };
    const txt = (SECTIONS[best.s] || SECTIONS["kontakt"] || "").trim().slice(0, 320);
    return { answer: txt || "Napisz na kontakt@skaluj.ai — chętnie pomożemy.", book: false };
  }

  /* ---------- MÓZG: Worker albo lokalnie ---------- */
  async function askAI(question, history) {
    if (CONFIG.WORKER_URL) {
      try {
        const r = await fetch(CONFIG.WORKER_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, history }),
        });
        const d = await r.json();
        return { answer: d.answer, book: !!d.book };
      } catch (e) { /* fallback */ }
    }
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    return answerLocal(question);
  }

  /* ---------- BUDOWA UI ---------- */
  const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
  const AV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>';
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button class="cb-launcher" id="cbLauncher" aria-label="Otwórz czat">
      <span class="pulse"></span>
      <svg class="ic ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <svg class="ic ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <span class="cb-badge" id="cbBadge">1</span>
    <div class="cb-panel" id="cbPanel" role="dialog" aria-label="Czat skaluj.ai">
      <div class="cb-head">
        <span class="cb-dots"><i></i><i></i><i></i></span>
        <span class="cb-tag">AI</span>
        <span class="cb-title">asystent · skaluj.ai</span>
        <span class="cb-live">na żywo</span>
        <button class="cb-hbtn" id="cbClose" aria-label="Zamknij"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="cb-body" id="cbBody"></div>
      <div class="cb-chips" id="cbChips"></div>
      <div class="cb-foot">
        <div class="cb-inrow"><textarea class="cb-in" id="cbIn" rows="1" placeholder="Napisz wiadomość…"></textarea>
          <button class="cb-send" id="cbSend" aria-label="Wyślij"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>
        </div>
        <div class="cb-cred">napędzane przez <b>skaluj.ai</b></div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const $ = s => wrap.querySelector(s);
  const launcher = $("#cbLauncher"), panel = $("#cbPanel"), body = $("#cbBody"), chips = $("#cbChips"),
        input = $("#cbIn"), send = $("#cbSend"), badge = $("#cbBadge");
  let opened = false, greeted = false; const history = [];

  function toggle() {
    opened = !opened; launcher.classList.toggle("open", opened); panel.classList.toggle("open", opened);
    if (opened) { badge.style.opacity = "0"; if (!greeted) { greeted = true; greet(); } setTimeout(() => input.focus(), 300); }
  }
  launcher.onclick = toggle; $("#cbClose").onclick = toggle;

  function addMsg(text, who) {
    const d = document.createElement("div"); d.className = "cb-msg " + who;
    d.innerHTML = (who === "bot" ? '<div class="mava">' + AV + "</div>" : "") + '<div class="cb-bubble">' + text + "</div>";
    body.appendChild(d); body.scrollTop = body.scrollHeight; return d;
  }
  function typing() {
    const d = document.createElement("div"); d.className = "cb-msg bot";
    d.innerHTML = '<div class="mava">' + AV + '</div><div class="cb-typing"><i></i><i></i><i></i></div>';
    body.appendChild(d); body.scrollTop = body.scrollHeight; return d;
  }
  function bookingCard() {
    const d = document.createElement("div"); d.className = "cb-book";
    const head = `<div class="cb-book-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><div><b>Bezpłatna konsultacja · 30 min</b><span>Rzeszów / online — bez zobowiązań</span></div></div>`;
    if (CONFIG.BOOKING_URL && CONFIG.EMBED_CALENDAR) {
      d.innerHTML = head + `<iframe src="${CONFIG.BOOKING_URL}" loading="lazy"></iframe>`;
    } else if (CONFIG.BOOKING_URL) {
      d.innerHTML = head + `<a class="cta" href="${CONFIG.BOOKING_URL}" target="_blank" rel="noopener">Wybierz termin →</a>`;
    } else {
      const c = location.pathname.includes("/oferta/") || location.pathname.includes("/blog/") ? "../kontakt.html" : "kontakt.html";
      d.innerHTML = head + `<a class="cta" href="${c}">Przejdź do formularza →</a>`;
    }
    body.appendChild(d); body.scrollTop = body.scrollHeight;
  }
  function setChips(list) {
    chips.innerHTML = "";
    list.forEach(c => { const b = document.createElement("button"); b.className = "cb-chip"; b.textContent = c; b.onclick = () => sendMsg(c); chips.appendChild(b); });
  }
  async function greet() {
    const t = typing(); await new Promise(r => setTimeout(r, 650)); t.remove();
    addMsg('Cześć! 👋 Jestem asystentem <b>skaluj.ai</b>. W czym mogę pomóc?', "bot");
    setChips(["Co oferujecie?", "Ile kosztuje strona?", "Umów spotkanie"]);
  }
  async function sendMsg(text) {
    text = (text || input.value).trim(); if (!text) return;
    input.value = ""; input.style.height = "auto"; send.disabled = true; chips.innerHTML = "";
    addMsg(text.replace(/</g, "&lt;"), "user"); history.push({ role: "user", content: text });
    const t = typing();
    const res = await askAI(text, history);
    t.remove(); addMsg(res.answer, "bot"); history.push({ role: "assistant", content: res.answer });
    if (res.book) bookingCard();
    setChips(["Automatyzacje", "Chatbot AI", "Umów spotkanie"]);
    send.disabled = false; input.focus();
  }
  send.onclick = () => sendMsg();
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 96) + "px"; });

  /* ---------- POKAZANIE PO ZAŁADOWANIU STRONY ---------- */
  function isMobile() { return window.matchMedia("(max-width: 600px)").matches; }
  function reveal() {
    launcher.classList.add("cb-ready");
    if (isMobile()) {
      setTimeout(() => { badge.style.opacity = "1"; }, 500);   // telefon: tylko launcher + odznaka, bez otwierania
    } else {
      setTimeout(() => { if (!opened) toggle(); }, 1500);       // desktop: sam się otwiera po chwili
    }
  }
  if (document.readyState === "complete") setTimeout(reveal, 650);
  else window.addEventListener("load", () => setTimeout(reveal, 650));
})();
