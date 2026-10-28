/* nav.js — wspolna nawigacja wszystkich podstron:
   - .nav.scrolled po przewinieciu (pigulka + scrim),
   - menu mobilne z blokada przewijania (powrot dokladnie w to samo miejsce),
   - dropdowny Oferta / Blog jako disclosure (bez role=menu): hover na myszce,
     klik/Enter/Spacja przelaczaja, Escape zamyka i oddaje fokus przyciskowi. */
(function(){
  "use strict";
  var nav = document.getElementById("nav");
  if(!nav) return;
  var body = document.body;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- pigulka po przewinieciu (+ bez jasnego scrimu, poki pod paskiem jest ciemne hero) --- */
  var darks = document.querySelectorAll(".svc-header--video, .blog-header, .ctc");
  function overDark(){
    for(var i = 0; i < darks.length; i++){ var r = darks[i].getBoundingClientRect(); if(r.top < 30 && r.bottom > 0) return true; }
    return false;
  }
  function onScroll(){
    if(body.classList.contains("menu-open")) return;
    nav.classList.toggle("scrolled", (window.scrollY || 0) > 20);
    if(darks.length) nav.classList.toggle("over-dark", overDark());
  }
  addEventListener("scroll", onScroll, {passive:true});
  onScroll();

  /* --- menu mobilne --- */
  var burger = document.getElementById("burger");
  var mm = document.getElementById("mobileMenu");
  var y = 0;
  function isOpen(){ return body.classList.contains("menu-open"); }
  function lock(){
    y = window.scrollY || window.pageYOffset || 0;
    body.style.top = (-y) + "px";
    body.classList.add("menu-open");
    if(burger){ burger.setAttribute("aria-expanded", "true"); burger.setAttribute("aria-label", "Zamknij menu"); }
  }
  function unlock(){
    if(!isOpen()) return;
    body.classList.remove("menu-open");
    body.style.top = "";
    /* "instant": html ma scroll-behavior:smooth, bez tego strona przewijalaby sie od gory */
    try{ window.scrollTo({top:y, behavior:"instant"}); }catch(e){ window.scrollTo(0, y); }
    if(burger){ burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Menu"); }
  }
  function samePage(a){
    function p(s){ return s.replace(/index\.html$/, "").replace(/\/$/, ""); }
    return a.hash && a.origin === location.origin && p(a.pathname) === p(location.pathname);
  }
  if(burger && mm){
    burger.addEventListener("click", function(){ isOpen() ? unlock() : lock(); });
    mm.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", function(e){
        if(!isOpen()) return;
        var target = samePage(a) && document.querySelector(a.hash);
        unlock();
        if(target){ e.preventDefault(); target.scrollIntoView({behavior: reduce ? "auto" : "smooth"}); }
      });
    });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && isOpen()){ unlock(); burger.focus(); }
    });
    /* obrot tabletu / poszerzenie okna ponad prog burgera: nie zostawiaj zablokowanej strony */
    var wide = matchMedia("(min-width: 1041px)");
    var onWide = function(e){ if(e.matches) unlock(); };
    if(wide.addEventListener) wide.addEventListener("change", onWide); else if(wide.addListener) wide.addListener(onWide);
  }

  /* --- dropdowny (disclosure) --- */
  var hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  [["ofertaItem", "ofertaBtn"], ["blogItem", "blogBtn"]].forEach(function(ids){
    var item = document.getElementById(ids[0]), btn = document.getElementById(ids[1]);
    if(!item || !btn) return;
    var t;
    function opened(){ return item.classList.contains("open"); }
    function open(){ clearTimeout(t); item.classList.add("open"); btn.setAttribute("aria-expanded", "true"); }
    function close(){ clearTimeout(t); item.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    function toggle(){ opened() ? close() : open(); }
    if(hover){
      item.addEventListener("mouseenter", open);
      item.addEventListener("mouseleave", function(){ clearTimeout(t); t = setTimeout(close, 180); });
    }
    /* e.detail === 0 to klik z klawiatury (Enter/Spacja) — zawsze przelacza;
       klik myszka na urzadzeniu z hoverem tylko otwiera (hover juz otworzyl panel) */
    btn.addEventListener("click", function(e){ e.preventDefault(); (hover && e.detail) ? open() : toggle(); });
    btn.addEventListener("keydown", function(e){
      if(e.key === "ArrowDown"){
        e.preventDefault(); open();
        var first = item.querySelector(".dropdown a");
        if(first) first.focus();
      }
    });
    item.addEventListener("focusout", function(){
      setTimeout(function(){ if(!item.contains(document.activeElement) && !item.matches(":hover")) close(); }, 0);
    });
    document.addEventListener("click", function(e){ if(!item.contains(e.target)) close(); });
    document.addEventListener("keydown", function(e){
      if(e.key !== "Escape" || !opened()) return;
      var inside = item.contains(document.activeElement);
      close();
      if(inside) btn.focus();
    });
    item.querySelectorAll(".dropdown a").forEach(function(a){ a.addEventListener("click", close); });
  });
})();
