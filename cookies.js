/* =====================================================================
   skaluj.ai — dyskretna zgoda na cookies (self-injecting, bez zależności)
   Dodaj na każdej stronie przed </body>:  <script src="cookies.js" defer></script>
   (na podstronach w /oferta i /blog użyj ścieżki ../cookies.js)

   Jak dodać piksel/analitykę ZA ZGODĄ (nie ładuje się przed akceptacją):
     <script type="text/plain" data-consent="analytics" src="...gtag.js"><\/script>
     <script type="text/plain" data-consent="marketing"> ... kod Meta Pixel ... <\/script>
   Kategorie: "analytics" | "marketing". Skrypty "niezbedne" laduj normalnie.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__skalujCookies) return; window.__skalujCookies = true;

  var KEY = "skaluj_consent_v1";
  var reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---------- stan zgody ---------- */
  var consent = { necessary: true, analytics: false, marketing: false, ts: 0 };
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var d = JSON.parse(raw); consent.analytics = !!d.analytics; consent.marketing = !!d.marketing; consent.ts = d.ts || 0; return true; }
    } catch (e) {}
    return false;
  }
  function save() {
    consent.ts = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch (e) {}
    window.skalujConsent = { analytics: consent.analytics, marketing: consent.marketing };
    window.dispatchEvent(new CustomEvent("skaluj:consent", { detail: window.skalujConsent }));
    activateScripts();
  }
  /* uruchamia skrypty oznaczone type="text/plain" data-consent="..." po zgodzie */
  function activateScripts() {
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach(function (s) {
      var cat = s.getAttribute("data-consent");
      if (!consent[cat]) return;
      var n = document.createElement("script");
      for (var i = 0; i < s.attributes.length; i++) {
        var a = s.attributes[i];
        if (a.name === "type" || a.name === "data-consent") continue;
        n.setAttribute(a.name, a.value);
      }
      if (!s.src) n.textContent = s.textContent;
      s.parentNode.insertBefore(n, s);
      s.removeAttribute("data-consent");
    });
  }
  window.skalujConsent = { analytics: consent.analytics, marketing: consent.marketing };

  /* ---------- ścieżka do polityki (root vs podstrona) ---------- */
  var pp = (location.pathname.indexOf("/oferta/") > -1 || location.pathname.indexOf("/blog/") > -1) ? "../polityka-prywatnosci" : "polityka-prywatnosci";

  /* ---------- style (dyskretne, lewy dolny róg) ---------- */
  var CSS =
  '.ck{position:fixed;left:20px;bottom:20px;z-index:99990;width:330px;max-width:calc(100vw - 32px);' +
  'background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
  'border:1px solid rgba(15,30,60,.10);border-radius:16px;box-shadow:0 18px 50px rgba(15,30,60,.16),0 4px 14px rgba(15,30,60,.06);' +
  'padding:15px 16px 14px;font-family:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0b0d10;' +
  'opacity:0;transform:translateY(14px);transition:opacity .4s cubic-bezier(.22,1,.36,1),transform .4s cubic-bezier(.22,1,.36,1)}' +
  '.ck.in{opacity:1;transform:none}' +
  '.ck-t{font-size:12.5px;line-height:1.55;color:#3a424e;margin:0 0 12px}' +
  '.ck-t b{color:#0b0d10;font-weight:600}' +
  '.ck-t a{color:#2456c9;text-decoration:underline;text-underline-offset:2px}' +
  '.ck-row{display:flex;gap:8px;align-items:center}' +
  '.ck-btn{flex:1;border:none;cursor:pointer;border-radius:10px;font:550 12.5px "Geist",sans-serif;padding:9px 12px;transition:filter .2s,background .2s,box-shadow .2s,transform .15s}' +
  '.ck-btn:active{transform:translateY(1px)}' +
  '.ck-acc{background:linear-gradient(135deg,#3d7ef0,#2158c8);color:#fff;box-shadow:0 6px 16px rgba(33,88,200,.24)}' +
  '.ck-acc:hover{filter:brightness(1.05);box-shadow:0 8px 20px rgba(33,88,200,.30)}' +
  '.ck-nec{background:#eef1f6;color:#2b333f}' +
  '.ck-nec:hover{background:#e5e9f0}' +
  '.ck-set{background:none;border:none;cursor:pointer;color:#8b929c;font:500 11px "Geist",sans-serif;padding:8px 2px 0;margin-top:4px;text-decoration:underline;text-underline-offset:2px}' +
  '.ck-set:hover{color:#2456c9}' +
  '.ck-opts{max-height:0;overflow:hidden;transition:max-height .35s var(--ease,cubic-bezier(.22,1,.36,1))}' +
  '.ck.open .ck-opts{max-height:160px}' +
  '.ck-opt{display:flex;align-items:flex-start;gap:9px;padding:9px 0;border-top:1px solid rgba(15,30,60,.07)}' +
  '.ck-opt:first-child{margin-top:10px}' +
  '.ck-opt label{font-size:12px;font-weight:550;color:#0b0d10;cursor:pointer}' +
  '.ck-opt p{margin:2px 0 0;font-size:11px;line-height:1.45;color:#6b7280}' +
  '.ck-sw{position:relative;flex:none;width:34px;height:20px;margin-top:1px}' +
  '.ck-sw input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}' +
  '.ck-sw i{position:absolute;inset:0;border-radius:9999px;background:#cfd6e0;transition:background .2s}' +
  '.ck-sw i::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}' +
  '.ck-sw input:checked + i{background:#2f6fe0}' +
  '.ck-sw input:checked + i::after{transform:translateX(14px)}' +
  '.ck-sw input:disabled + i{background:#2f6fe0;opacity:.5}' +
  '@media(max-width:600px){.ck{left:12px;right:12px;bottom:12px;width:auto}}' +
  '@media(prefers-reduced-motion:reduce){.ck{transition:none}.ck-opts{transition:none}}';

  function injectStyle() { var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- UI ---------- */
  var box;
  function build() {
    box = document.createElement("div");
    box.className = "ck";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Zgoda na pliki cookie");
    box.innerHTML =
      '<p class="ck-t">Używamy plików cookie, aby strona działała poprawnie, a za Twoją zgodą także do <b>analityki i marketingu</b>. <a href="' + pp + '">Polityka prywatności</a></p>' +
      '<div class="ck-opts">' +
        '<div class="ck-opt"><span class="ck-sw"><input type="checkbox" checked disabled aria-label="Niezbędne (zawsze aktywne)"><i></i></span><div><label>Niezbędne</label><p>Konieczne do działania strony. Zawsze aktywne.</p></div></div>' +
        '<div class="ck-opt"><span class="ck-sw"><input type="checkbox" id="ckAn"><i></i></span><div><label for="ckAn">Analityka</label><p>Anonimowe statystyki odwiedzin.</p></div></div>' +
        '<div class="ck-opt"><span class="ck-sw"><input type="checkbox" id="ckMk"><i></i></span><div><label for="ckMk">Marketing</label><p>Pomiar i personalizacja reklam.</p></div></div>' +
      '</div>' +
      '<div class="ck-row">' +
        '<button class="ck-btn ck-nec" id="ckNec">Tylko niezbędne</button>' +
        '<button class="ck-btn ck-acc" id="ckAcc">Akceptuję</button>' +
      '</div>' +
      '<button class="ck-set" id="ckSet" aria-expanded="false">Ustawienia</button>';
    document.body.appendChild(box);

    var an = box.querySelector("#ckAn"), mk = box.querySelector("#ckMk");
    an.checked = consent.analytics; mk.checked = consent.marketing;

    box.querySelector("#ckSet").addEventListener("click", function () {
      var open = box.classList.toggle("open");
      this.setAttribute("aria-expanded", open ? "true" : "false");
      this.textContent = open ? "Ukryj ustawienia" : "Ustawienia";
    });
    box.querySelector("#ckAcc").addEventListener("click", function () {
      // "Akceptuję" respektuje przełączniki jeśli otwarto ustawienia; domyślnie akceptuje wszystko
      consent.analytics = box.classList.contains("open") ? an.checked : true;
      consent.marketing = box.classList.contains("open") ? mk.checked : true;
      finish();
    });
    box.querySelector("#ckNec").addEventListener("click", function () {
      consent.analytics = false; consent.marketing = false; finish();
    });

    requestAnimationFrame(function () { requestAnimationFrame(function () { if (box) box.classList.add("in"); }); });
    setTimeout(function () { if (box) box.classList.add("in"); }, 90); // fallback gdy rAF throttlowany
  }
  function finish() { save(); hide(); }
  function hide() {
    if (!box) return;
    box.classList.remove("in");
    setTimeout(function () { if (box && box.parentNode) box.parentNode.removeChild(box); box = null; }, reduced ? 0 : 400);
  }

  /* ---------- ponowne otwarcie (np. link „Ustawienia cookie" w stopce) ---------- */
  window.skalujCookies = {
    open: function () { if (!box) { injectedOnce || (injectStyle(), injectedOnce = true); build(); } else { box.classList.add("open"); } },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
  var injectedOnce = false;

  /* ---------- start ---------- */
  var had = load();
  window.skalujConsent = { analytics: consent.analytics, marketing: consent.marketing };
  activateScripts(); // odpal skrypty dozwolone przez wcześniejszą zgodę
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-cookie-settings]");
    if (t) { e.preventDefault(); window.skalujCookies.open(); }
  });
  if (!had) {
    injectStyle(); injectedOnce = true;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
    else build();
  }
})();
