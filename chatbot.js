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
    KNOWLEDGE_URL: "/wiedza.txt",
    // Osadzić kalendarz w oknie czatu (true) czy otwierać w nowej karcie (false).
    EMBED_CALENDAR: true,
  };

  if (window.__skalujChat) return; window.__skalujChat = true;

  /* ---------- STYLE ---------- */
  const CSS = `
  .cb-launcher{position:fixed;right:24px;bottom:24px;z-index:99998;height:52px;width:52px;border:none;cursor:pointer;border-radius:50%;
    background:linear-gradient(135deg,#3d7ef0,#2158c8);color:#fff;box-shadow:0 6px 16px rgba(15,30,60,.18);
    display:grid;place-items:center;transition:box-shadow .25s,opacity .3s,visibility .3s;
    opacity:0;pointer-events:none}
  .cb-launcher.cb-ready{opacity:1;pointer-events:auto;animation:cbEnter .62s cubic-bezier(.22,1,.36,1)}
  @keyframes cbEnter{0%{opacity:0;transform:translateY(16px) scale(.9)}100%{opacity:1;transform:none}}
  .cb-launcher:hover{box-shadow:inset 0 0 0 40px rgba(10,25,60,.12),0 6px 16px rgba(15,30,60,.18)}
  .cb-launcher:focus-visible{outline:2px solid #2f6fe0;outline-offset:3px}
  /* baner cookies (na telefonie na cala szerokosc) i otwarte menu mobilne maja pierwszenstwo: launcher znika, zamiast zaslaniac ich przyciski */
  body.menu-open .cb-launcher,body.menu-open .cb-panel{opacity:0!important;visibility:hidden;pointer-events:none!important}
  @media(max-width:600px){body:has(.ck.in) .cb-launcher{opacity:0!important;visibility:hidden;pointer-events:none!important}}
  .cb-launcher .ic{width:22px;height:22px;transition:transform .4s cubic-bezier(.22,1,.36,1)}
  .cb-launcher .ic-close{position:absolute;transform:scale(0) rotate(90deg)}
  .cb-launcher.open .ic-chat{transform:scale(0) rotate(-90deg)}
  .cb-launcher.open .ic-close{transform:scale(1) rotate(0)}
  .cb-launcher .pulse{position:absolute;inset:0;border-radius:50%;animation:cbpulse 2.8s 2}
  @keyframes cbpulse{0%{box-shadow:0 0 0 0 rgba(47,111,224,.34)}70%{box-shadow:0 0 0 14px rgba(47,111,224,0)}100%{box-shadow:0 0 0 0 rgba(47,111,224,0)}}
  .cb-panel{position:fixed;right:24px;bottom:88px;z-index:99999;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100dvh - 120px);
    background:#fff;border:1px solid rgba(15,30,60,.09);border-radius:20px;box-shadow:0 30px 90px rgba(15,30,60,.20),0 8px 24px rgba(15,30,60,.08);
    display:flex;flex-direction:column;overflow:hidden;font-family:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0b0d10;position:fixed;
    opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;visibility:hidden;transform-origin:bottom right;
    transition:opacity .32s cubic-bezier(.22,1,.36,1),transform .32s cubic-bezier(.22,1,.36,1),visibility .32s}
  .cb-panel::before{content:"";position:absolute;top:0;left:0;right:0;height:2.5px;z-index:9;background:linear-gradient(90deg,#66b0ff,#2158c8)}
  .cb-panel.open{opacity:1;transform:none;pointer-events:auto;visibility:visible}
  /* naglowek — czysty brand: kafelek z sygnetem + nazwa + status */
  .cb-head{display:flex;align-items:center;gap:11px;padding:13px 15px;border-bottom:1px solid rgba(15,30,60,.07);background:rgba(255,255,255,.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
  .cb-hava{flex:none;width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#3d7ef0,#2158c8);display:grid;place-items:center;box-shadow:0 4px 12px rgba(33,88,200,.28)}
  .cb-hava svg{width:17px;height:auto;color:#fff}
  .cb-id{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:3px}
  .cb-id b{font-size:14px;font-weight:600;letter-spacing:-.01em;color:#0b0d10;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .cb-live{font:400 12px/1.2 "Geist",sans-serif;color:#565d68}
  .cb-hbtn{background:none;border:none;color:#565d68;width:26px;height:26px;border-radius:7px;cursor:pointer;display:grid;place-items:center;transition:background .2s,color .2s;flex:none}
  .cb-hbtn:hover{background:rgba(0,0,0,.05);color:#0b0d10}
  .cb-body{flex:1;overflow-y:auto;padding:20px 16px 8px;background:#fbfcfe}
  .cb-body::-webkit-scrollbar{width:8px}.cb-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px;border:2px solid transparent;background-clip:padding-box}
  .cb-msg{display:flex;gap:9px;margin-bottom:14px;align-items:flex-start;animation:cbin .4s cubic-bezier(.22,1,.36,1) both}
  @keyframes cbin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .cb-msg .mava{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#3d7ef0,#2158c8);display:grid;place-items:center;flex:none;box-shadow:0 3px 8px rgba(33,88,200,.24)}
  .cb-msg .mava svg{width:13px;height:auto;color:#fff}
  .cb-bubble{max-width:84%;padding:11px 14px;border-radius:15px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}
  .cb-msg.bot .cb-bubble{background:#f1f4f9;border:1px solid rgba(15,30,60,.05);border-bottom-left-radius:5px}
  .cb-msg.user{flex-direction:row-reverse}.cb-msg.user .cb-bubble{background:linear-gradient(135deg,#3d7ef0,#2158c8);color:#fff;border-bottom-right-radius:5px;box-shadow:0 4px 14px rgba(33,88,200,.22)}
  .cb-bubble a{color:inherit;text-decoration:underline;text-underline-offset:2px}
  .cb-typing{display:flex;gap:4px;padding:14px 15px;background:#f1f4f9;border:1px solid rgba(15,30,60,.05);border-radius:15px;border-bottom-left-radius:5px;width:fit-content}
  .cb-typing i{width:7px;height:7px;border-radius:50%;background:#2f6fe0;opacity:.7;animation:cbdot 1.2s infinite}
  .cb-typing i:nth-child(2){animation-delay:.18s}.cb-typing i:nth-child(3){animation-delay:.36s}
  @keyframes cbdot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-5px);opacity:.9}}
  .cb-chips{display:flex;flex-wrap:wrap;gap:5px;padding:4px 10px 12px;overflow-x:auto;scrollbar-width:none}
  .cb-chips::-webkit-scrollbar{display:none}
  .cb-chip{flex:none;background:#fff;border:1px solid rgba(47,111,224,.26);color:#2456c9;font:500 12.5px "Geist",sans-serif;padding:7px 12px;border-radius:9999px;cursor:pointer;transition:all .2s;white-space:nowrap}
  .cb-chip:hover{border-color:#2f6fe0;color:#fff;background:linear-gradient(135deg,#3d7ef0,#2158c8);box-shadow:0 4px 12px rgba(33,88,200,.24)}
  .cb-book{margin:2px 0 4px 37px;max-width:84%;border:1px solid rgba(47,111,224,.18);border-radius:15px;overflow:hidden;background:#fff;box-shadow:0 8px 24px rgba(15,30,60,.07);animation:cbin .4s cubic-bezier(.22,1,.36,1) both}
  .cb-book-top{padding:13px 15px;border-bottom:1px solid rgba(15,30,60,.06);display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(102,176,255,.08),rgba(33,88,200,.05))}
  .cb-book-top svg{width:19px;height:19px;color:#2f6fe0;flex:none}.cb-book-top b{font-size:13px}.cb-book-top span{display:block;font-size:11px;color:#565d68;margin-top:1px}
  .cb-book .cta{display:block;margin:12px 15px 14px;text-align:center;background:linear-gradient(135deg,#3d7ef0,#2158c8);color:#fff;text-decoration:none;font-size:13.5px;font-weight:500;padding:11px;border-radius:11px;transition:box-shadow .2s,filter .2s}
  .cb-book .cta:hover{filter:brightness(1.06);box-shadow:0 6px 18px rgba(33,88,200,.32)}.cb-book iframe{width:100%;height:520px;border:0;display:block}
  .cb-foot{padding:12px 14px;border-top:1px solid rgba(15,30,60,.07);background:#fff}
  .cb-disc{margin:8px 2px 0;font-size:11.5px;line-height:1.45;color:#5c636e;text-align:center;text-wrap:balance}
  .cb-disc a{color:#565d68;text-decoration:underline;text-underline-offset:2px}
  .cb-disc a:hover{color:#2f6fe0}
  .cb-inrow{display:flex;align-items:flex-end;gap:9px;background:#f6f8fb;border:1px solid rgba(15,30,60,.08);border-radius:9999px;padding:5px 5px 5px 16px;transition:border-color .2s,background .2s,box-shadow .2s}
  .cb-inrow:focus-within{border-color:#2f6fe0;background:#fff;box-shadow:0 0 0 3px rgba(47,111,224,.12)}
  .cb-in{flex:1;border:none;background:none;outline:none;font:14px "Geist",sans-serif;color:#0b0d10;resize:none;max-height:96px;line-height:1.5;padding:8px 0}
  .cb-send{width:38px;height:38px;flex:none;border:none;border-radius:50%;cursor:pointer;background:linear-gradient(135deg,#3d7ef0,#2158c8);color:#fff;display:grid;place-items:center;transition:box-shadow .2s,filter .2s,transform .2s}
  .cb-send:hover{filter:brightness(1.06);transform:scale(1.05);box-shadow:0 4px 14px rgba(33,88,200,.34)}.cb-send:disabled{opacity:.4;cursor:default;box-shadow:none;transform:none}
  /* telefon: czat jako arkusz od dolnej krawedzi; zamyka go X w naglowku */
  @media(max-width:600px){.cb-panel{left:0;right:0;bottom:0;width:100%;max-width:none;height:min(88dvh,640px);max-height:none;border-radius:20px 20px 0 0}
    .cb-foot{padding-bottom:max(12px,env(safe-area-inset-bottom))}.cb-in{font-size:16px}
    .cb-launcher{right:16px;bottom:16px}.cb-launcher.open{opacity:0;pointer-events:none}}
  @media(prefers-reduced-motion:reduce){.cb-launcher .pulse,.cb-launcher.cb-ready,.cb-msg,.cb-book,.cb-typing i{animation:none!important}
    .cb-launcher .ic{transition:none}.cb-panel{transform:none!important;transition:opacity .2s,visibility .2s}}
  `;

  /* ---------- WIEDZA (tryb lokalny bez Workera) ---------- */
  let KB = "";
  /* pobierana dopiero, gdy naprawdę potrzebna (tryb lokalny / awaria Workera) — nie przy każdym wejściu na stronę */
  let kbLoad = null;
  function loadKB() { return kbLoad || (kbLoad = fetch(CONFIG.KNOWLEDGE_URL).then(r => r.text()).then(t => { KB = t; }).catch(() => {})); }
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
      { k: ["cześć","czesc","hej","witam","siema","hello","dzień"], a: "Cześć! 👋 Jestem asystentem skaluj.ai. Zapytaj o ofertę, strony, automatyzacje, chatboty albo umów bezpłatną konsultację." },
      { k: ["spotkani","konsultacj","umów","umow","rozmow","demo","kalendarz","termin"], a: "Jasne — umówmy 30-minutową bezpłatną konsultację. Przyjdziemy z gotowym demo. Wybierz termin:", book: true },
      { k: ["cena","koszt","ile","wycena","cennik","budż"], s: "kontakt" },
      { k: ["strona","stronę","www","landing"], s: "oferta: strona-seo" },
      { k: ["seo","geo","pozycjon","widoczn","perplexity","google"], s: "oferta: geo-seo" },
      { k: ["reklam","ads","chatgpt"], s: "oferta: reklamy-chatgpt" },
      { k: ["audyt","diagnoz","cyfryzac","dofinans"], s: "oferta: audyt-cyfryzacji" },
      { k: ["automatyz","mailing","faktur","crm","lead"], s: "oferta: automatyzacje-email" },
      { k: ["chatbot","bot","asystent","obsług"], s: "oferta: chatbot-ai" },
      { k: ["branding","logo","grafik","marka"], s: "oferta: branding" },
      { k: ["rolk","reels","tiktok","wideo","video","film","lektor","napis","shorts"], s: "oferta: rolki-ai" },
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
        if (d && d.answer) return { answer: d.answer, book: !!d.book };
      } catch (e) { /* fallback */ }
    }
    await Promise.all([new Promise(r => setTimeout(r, 500 + Math.random() * 400)), loadKB()]);
    return answerLocal(question);
  }

  /* ---------- BUDOWA UI ---------- */
  const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
  const AV = '<svg viewBox="-8 0 152 177" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M94.3 0L130.4 0Q143.4 0 133.9 8.9L55.5 81.9Q48.9 88 39.9 88L5.4 88Q-7.6 88 1.8 79L78.8 6.2Q85.3 0 94.3 0Z"/><path d="M94.3 89L130.4 89Q143.4 89 133.9 97.9L55.5 170.9Q48.9 177 39.9 177L5.4 177Q-7.6 177 1.8 168L78.8 95.2Q85.3 89 94.3 89Z"/></svg>';
  const ppPath = (location.pathname.indexOf("/oferta/") > -1 || location.pathname.indexOf("/blog/") > -1) ? "../polityka-prywatnosci" : "polityka-prywatnosci";
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button class="cb-launcher" id="cbLauncher" aria-label="Otwórz czat" aria-expanded="false" aria-controls="cbPanel">
      <span class="pulse"></span>
      <svg class="ic ic-chat" viewBox="-8 0 152 177" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M94.3 0L130.4 0Q143.4 0 133.9 8.9L55.5 81.9Q48.9 88 39.9 88L5.4 88Q-7.6 88 1.8 79L78.8 6.2Q85.3 0 94.3 0Z"/><path d="M94.3 89L130.4 89Q143.4 89 133.9 97.9L55.5 170.9Q48.9 177 39.9 177L5.4 177Q-7.6 177 1.8 168L78.8 95.2Q85.3 89 94.3 89Z"/></svg>
      <svg class="ic ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <div class="cb-panel" id="cbPanel" role="dialog" aria-label="Czat skaluj.ai">
      <div class="cb-head">
        <span class="cb-hava">${AV}</span>
        <div class="cb-id"><b>skaluj.ai</b><span class="cb-live">Asystent AI</span></div>
        <button class="cb-hbtn" id="cbClose" aria-label="Zamknij"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="cb-body" id="cbBody" role="log" aria-live="polite" aria-atomic="false" aria-label="Historia rozmowy"></div>
      <div class="cb-chips" id="cbChips"></div>
      <div class="cb-foot">
        <div class="cb-inrow"><textarea class="cb-in" id="cbIn" rows="1" aria-label="Napisz wiadomość" placeholder="Napisz wiadomość…"></textarea>
          <button class="cb-send" id="cbSend" aria-label="Wyślij"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>
        </div>
        <p class="cb-disc">Odpowiada asystent AI. Nie podawaj danych wrażliwych. <a href="${ppPath}" target="_blank" rel="noopener">Prywatność</a></p>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const $ = s => wrap.querySelector(s);
  const launcher = $("#cbLauncher"), panel = $("#cbPanel"), body = $("#cbBody"), chips = $("#cbChips"),
        input = $("#cbIn"), send = $("#cbSend");
  let opened = false, greeted = false; const history = [];

  /* fromUser=false: otwarcie/zamkniecie automatyczne — nie przenosi fokusu (nie kradnie klawiatury) */
  function toggle(fromUser) {
    opened = !opened; launcher.classList.toggle("open", opened); panel.classList.toggle("open", opened);
    launcher.setAttribute("aria-expanded", opened ? "true" : "false");
    launcher.setAttribute("aria-label", opened ? "Zamknij czat" : "Otwórz czat");
    if (opened) { if (!greeted) { greeted = true; greet(); } if (fromUser) setTimeout(() => input.focus(), 300); }
    else if (fromUser || panel.contains(document.activeElement)) { launcher.focus(); }
  }
  launcher.onclick = () => toggle(true); $("#cbClose").onclick = () => toggle(true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && opened) toggle(true); });

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
    addMsg('Cześć! 👋 Jestem <b>wirtualnym asystentem AI</b> skaluj.ai — odpowiadam automatycznie. W&nbsp;czym mogę pomóc?', "bot");
    setChips(["Co oferujecie?", "Ile kosztuje strona?", "Umów spotkanie"]);
  }
  /* tresc od AI i od uzytkownika wstawiamy jako tekst, nie HTML: model mozna naklonic (prompt injection)
     do odpowiedzi z kodem HTML/JS. Dozwolone tylko **pogrubienie**, nowe linie i linki http(s). */
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function safeAnswer(t) {
    return esc(t)
      .replace(/\*\*([^*\n]{1,200})\*\*/g, "<strong>$1</strong>")
      .replace(/(https?:\/\/[^\s<]{3,200})/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, "<br>");
  }
  async function sendMsg(text) {
    text = (text || input.value).trim(); if (!text) return;
    input.value = ""; input.style.height = "auto"; send.disabled = true; chips.innerHTML = "";
    addMsg(esc(text), "user");
    const t = typing();
    /* do workera idzie tylko ostatnie 8 wiadomosci (bez biezacego pytania - worker dokleja je sam) */
    const res = await askAI(text, history.slice(-8));
    history.push({ role: "user", content: text });
    t.remove(); addMsg(safeAnswer(res.answer), "bot"); history.push({ role: "assistant", content: res.answer });
    if (res.book) bookingCard();
    setChips(["Automatyzacje", "Chatbot AI", "Umów spotkanie"]);
    send.disabled = false; input.focus();
  }
  send.onclick = () => sendMsg();
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 96) + "px"; });

  /* ---------- POKAZANIE: launcher pojawia sie sam, panel otwiera sie WYLACZNIE po kliknieciu ---------- */
  let revealed = false;
  function reveal() { if (revealed) return; revealed = true; launcher.classList.add("cb-ready"); }
  const offerSection = document.getElementById("oferta");
  if (offerSection) {
    // strona główna: launcher pokazuje się DOPIERO, gdy user
    // dojedzie scrollem do oferty 04 „Asystent i chatbot AI". Sygnał emituje index.html
    // (event „skaluj:chatbot-offer") — w trybie pin-scroll dokładnie przy tej karcie,
    // a w zwykłym accordionie gdy karta wejdzie w widok.
    let armed = false;
    const armChat = function () { if (armed) return; armed = true; reveal(); };
    window.addEventListener("skaluj:chatbot-offer", armChat, { once: true });
    if (window.__skalujChatbotOffer) armChat();   // sygnał mógł paść, zanim tu doszliśmy
  } else {
    // podstrony (brak sekcji Oferta): pokaż launcher po załadowaniu
    if (document.readyState === "complete") setTimeout(reveal, 650);
    else window.addEventListener("load", () => setTimeout(reveal, 650));
  }
})();
