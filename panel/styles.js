/**
 * skaluj.ai — panel klienta: style.
 *
 * Ten sam jezyk co panel wewnetrzny (internal.js) i strona: tokeny skaluj.ai, Geist do tresci,
 * Azeret Mono do liczb, jeden akcent #2f6fe0 dla wzrostu, spokojna czerwien dla spadku,
 * wlosowe linie zamiast kafelkow z poswiata.
 *
 * Sygnatura panelu: stan bez danych rysowany jak projekt techniczny (.pa-bp-*).
 * Zakladka bez podlaczonego zrodla ma czytac sie jak PLAN tego, co powstanie —
 * nie jak zepsuty wykres. To wizualizacja zasady "nie zmyslamy liczb".
 */
export const CSS = `
:root{
  --bg:#ffffff;--bg-elev:#f7f8fa;--bg-elev-2:#eef1f5;
  --text:#0b0d10;--muted:#565d68;--faint:#626873;
  --line:rgba(0,0,0,.10);--line-2:rgba(0,0,0,.06);
  --accent:#2f6fe0;--accent-dim:#2456b0;--accent-ink:#2456b0;--accent-soft:rgba(47,111,224,.10);
  --down:#b4321f;
  --maxw:1180px;
  --sans:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --mono:"Azeret Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scrollbar-color:#c5cad3 transparent;scrollbar-width:thin}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;
  line-height:1.55;letter-spacing:-.011em;-webkit-font-smoothing:antialiased;
  /* stopka dociagnieta do dolu — bez tego krotki panel zostawia martwa biel */
  min-height:100vh;display:flex;flex-direction:column}
::selection{background:var(--accent-soft);color:var(--text)}
a{color:inherit;text-decoration:none}
main{flex:1 0 auto}
.pnl-wrap{max-width:var(--maxw);margin:0 auto;padding:0 clamp(20px,4vw,48px);width:100%}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
/* word-spacing zweza twarda spacje grupujaca tysiace: w kroju o stalej szerokosci ma pelna
   komorke i "1 463" czytaloby sie jak dwie liczby */
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.02em;word-spacing:-.4em}
.dc{margin:0 -.17em}
.pa-nw{white-space:nowrap}

/* ===== belka: jak w panelu wewnetrznym — logo, klient, rodzaj panelu ===== */
.pnl-top{position:relative;z-index:2;padding:14px 0;border-bottom:1px solid var(--line-2)}
.pnl-top-in{display:flex;align-items:center;gap:14px}
.pnl-brand{display:inline-flex;align-items:center;gap:8px;flex:none}
.pnl-brand img{height:22px;width:auto;display:block}
.pnl-brand .pnl-word{height:17px}
.pnl-sep{width:1px;height:20px;background:var(--line);flex:none}
.pnl-client{font-size:14px;font-weight:550;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pnl-sp{flex:1}
.pnl-for{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);white-space:nowrap}

/* ===== hero: radialny wash jak w hero strony, wygaszony maska u dolu ===== */
.pnl-hero{position:relative;overflow:hidden;padding:52px 0 32px}
.pnl-hero::before{content:"";position:absolute;inset:-120px 0 0;pointer-events:none;
  background:radial-gradient(ellipse 120% 78% at 50% 0%,rgba(47,111,224,.10),transparent 62%);
  -webkit-mask-image:linear-gradient(180deg,#000 0,#000 64%,transparent 100%);
          mask-image:linear-gradient(180deg,#000 0,#000 64%,transparent 100%)}
.pnl-hero-in{position:relative;z-index:1}
.pnl-h1{font-size:clamp(2rem,4.6vw,3.4rem);font-weight:500;letter-spacing:-.028em;
  line-height:1.1;max-width:18ch;opacity:0;animation:paUp .9s var(--ease) .06s forwards}
.pnl-sub{margin-top:16px;color:var(--muted);font-size:15.5px;max-width:56ch;
  opacity:0;animation:paUp .9s var(--ease) .14s forwards}
.pnl-stamp{margin-top:22px;display:inline-block;font-family:var(--mono);
  font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);
  border:1px solid var(--line-2);border-radius:9999px;padding:6px 13px;background:rgba(255,255,255,.6);
  opacity:0;animation:paUp .9s var(--ease) .22s forwards}
.pnl-stamp b{color:var(--text);font-weight:500}

/* ===== zakladki ===== */
.pa-tabs{position:relative;display:inline-flex;flex-wrap:nowrap;gap:2px;margin-bottom:26px;padding:4px;
  background:var(--bg-elev-2);border:1px solid var(--line-2);border-radius:9999px;max-width:100%;
  overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity;
  opacity:0;animation:paUp .8s var(--ease) .3s forwards;
  -webkit-mask-image:linear-gradient(90deg,#000,#000);mask-image:linear-gradient(90deg,#000,#000);
  transition:mask-image .2s,-webkit-mask-image .2s}
.pa-tabs::-webkit-scrollbar{display:none}
.pa-tabs.can-r{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 26px),transparent)}
.pa-tabs.can-l{-webkit-mask-image:linear-gradient(90deg,transparent,#000 26px);mask-image:linear-gradient(90deg,transparent,#000 26px)}
.pa-tabs.can-l.can-r{-webkit-mask-image:linear-gradient(90deg,transparent,#000 26px,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(90deg,transparent,#000 26px,#000 calc(100% - 26px),transparent)}
.pa-tab{scroll-snap-align:start;position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;
  font-family:var(--sans);font-size:13px;font-weight:500;letter-spacing:-.01em;color:var(--muted);
  background:none;border:0;border-radius:9999px;padding:9px 17px;cursor:pointer;white-space:nowrap;
  transition:color .25s}
.pa-tab svg{width:14px;height:14px;flex:none}
.pa-tab:hover{color:var(--text)}
.pa-tab.is-active{color:var(--text)}
.pa-tab-glider{position:absolute;top:4px;left:0;height:calc(100% - 8px);width:0;background:#fff;
  border-radius:9999px;box-shadow:0 2px 10px rgba(15,30,60,.14),0 0 0 1px rgba(0,0,0,.045);
  transition:transform .38s var(--ease),width .38s var(--ease);pointer-events:none}
/* kropka stanu: pelna i blekitna = na zywo, obrys = czeka na podlaczenie */
.pa-live-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);flex:none;
  box-shadow:0 0 0 3px var(--accent-soft)}
/* dziala u klienta, ale pomiaru jeszcze nie podlaczylismy — blekit, ale pusty srodek */
.pa-wait-dot{width:6px;height:6px;border-radius:50%;background:transparent;flex:none;
  box-shadow:inset 0 0 0 1.5px var(--accent)}
/* nie jest czescia wdrozenia tego klienta */
.pa-soon-dot{width:6px;height:6px;border-radius:50%;background:transparent;flex:none;
  box-shadow:inset 0 0 0 1.5px var(--faint);opacity:.6}

/* ===== panele ===== */
/* minmax(0,1fr) + min-width:0 sa konieczne: element siatki ma domyslnie min-width:auto,
   wiec szeroka tabela rozpychalaby caly tor i strona przewijalaby sie w poziomie. */
.pa-panels{display:grid;grid-template-columns:minmax(0,1fr);padding-bottom:56px}
.pa-panel{grid-area:1/1;min-width:0;display:flex;flex-direction:column;animation:paIn .34s var(--ease)}
.pa-panel.pa-hidden{visibility:hidden;opacity:0;pointer-events:none}
.pa-period{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--faint);margin-bottom:14px;display:flex;align-items:center;gap:12px}
.pa-period::after{content:"";flex:1;height:1px;background:var(--line-2)}

/* ===== skrzynki i sekcje ===== */
.pa-box{min-width:0;background:var(--bg);border:1px solid var(--line-2);border-radius:14px;margin-bottom:14px;overflow:hidden}
.pa-lower{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px}
.pa-sec{padding:16px 20px 18px}
.pa-sec-h{display:flex;justify-content:space-between;align-items:baseline;gap:4px 12px;flex-wrap:wrap;margin-bottom:12px}
.pa-sec-h h2{font-size:13.5px;font-weight:600;letter-spacing:-.01em}
.pa-sec-h span{font-size:12px;color:var(--faint)}
.pa-sec-h-pad{padding:16px 20px 0;margin-bottom:4px}
.pa-empty{font-size:13px;color:var(--muted)}
.pa-note{font-size:12.5px;color:var(--faint);line-height:1.55;margin-top:4px;max-width:78ch}

/* ===== pasek liczb: wlosowe linie zamiast kafelkow ===== */
.pa-strip{display:grid;border-bottom:1px solid var(--line-2)}
.pa-strip:last-child{border-bottom:0}
.pa-strip-6{grid-template-columns:repeat(6,minmax(0,1fr))}
.pa-strip-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.pa-k{padding:16px 0 16px 20px;min-width:0}
.pa-k+.pa-k{border-left:1px solid var(--line-2);padding-left:16px}
.pa-k dt{font-size:12.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-kv{display:block;font-size:clamp(1.3rem,2vw,1.65rem);font-weight:500;margin:3px 0 4px;white-space:nowrap}
.pa-d{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;white-space:nowrap}
.pa-d svg{width:9px;height:9px;fill:currentColor;flex:none}
.pa-d small{font-size:12px;color:var(--faint);font-family:var(--sans)}
.pa-d-up{color:var(--accent-ink)} .pa-d-dn{color:var(--down)} .pa-d-flat{color:var(--faint)}

/* ===== wykres tygodni ===== */
/* wykres rozciagany na szerokosc; podpisy osi w HTML, zeby na telefonie nie malaly do ~5 px */
.pa-cw{position:relative;height:170px;padding-left:46px}
.pa-chart{display:block;width:100%;height:100%;overflow:visible}
.pa-ay{position:absolute;left:0;width:38px;text-align:right;transform:translateY(-50%);font-size:11px;color:var(--faint);pointer-events:none}
.pa-ax{position:relative;height:18px;margin:6px 0 0 46px}
.pa-ax span{position:absolute;top:0;font-size:11px;color:var(--faint);white-space:nowrap}
.kr{display:none}
.c-grid{stroke:var(--line-2);stroke-width:1;vector-effect:non-scaling-stroke}
.c-area{fill:url(#pa-fill)}
.c-line{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.c-pt{fill:transparent;pointer-events:all}

/* ===== zrodla i strony ===== */
.pa-bars{display:grid;gap:8px}
.pa-bar{display:grid;grid-template-columns:minmax(0,160px) minmax(0,1fr) 52px 40px;align-items:center;gap:10px;font-size:13px}
.pa-bar>span:first-child{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-trk{height:6px;border-radius:3px;background:var(--bg-elev-2);overflow:hidden}
/* display:block jest konieczne — .pa-trk i to element inline, a na nim width nie dziala */
.pa-trk i{display:block;height:100%;border-radius:3px;background:var(--accent);transform-origin:left;transition:transform .8s var(--ease)}
.pa-bar .num{text-align:right;font-size:12.5px}
.pa-share{color:var(--faint)}
.pa-pages{list-style:none}
.pa-pages li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line-2);font-size:13px}
.pa-pages li:first-child{border-top:0;padding-top:0}
.pa-pages li span:first-child{min-width:0;font-family:var(--mono);font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* tabela przewija sie we wlasnym kontenerze, nigdy calym body */
.pa-tbl-scroll{min-width:0;overflow-x:auto}
.pa-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:300px}
.pa-tbl th{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);
  padding:0 0 10px;text-align:left;font-weight:500}
.pa-tbl td{padding:9px 0;border-top:1px solid var(--line-2);color:var(--muted);vertical-align:middle}
.pa-tbl td:first-child{color:var(--text);font-weight:500}
.pa-tbl td.num,.pa-tbl th.num{padding-left:14px}
.pa-tbl th.num{text-align:right}
.pa-tbl td.num{text-align:right;white-space:nowrap}

/* ===== SYGNATURA: stan bez danych jako rysunek techniczny ===== */
.pa-bp{position:relative;border:1px dashed rgba(47,111,224,.32);border-radius:18px;padding:30px;
  background-image:
    linear-gradient(rgba(47,111,224,.055) 1px,transparent 1px),
    linear-gradient(90deg,rgba(47,111,224,.055) 1px,transparent 1px);
  background-size:26px 26px;background-position:center}
/* znaczniki narozne — jak na rysunku wykonawczym */
.pa-bp::before,.pa-bp::after{content:"";position:absolute;width:13px;height:13px;pointer-events:none;
  border-color:rgba(47,111,224,.5);border-style:solid}
.pa-bp::before{top:11px;left:11px;border-width:1px 0 0 1px;border-radius:3px 0 0 0}
.pa-bp::after{bottom:11px;right:11px;border-width:0 1px 1px 0;border-radius:0 0 3px 0}
.pa-bp-tag{position:absolute;top:-10px;left:26px;font-family:var(--mono);font-size:11px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--accent-ink);background:var(--bg);padding:0 9px}
.pa-bp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:26px}
/* karta metryki jako opis na rysunku: nazwa jest prawdziwa, liczby brak */
.pa-bp-cell{border:1px dashed rgba(47,111,224,.28);border-radius:12px;padding:16px 18px;
  background:rgba(255,255,255,.55)}
.pa-bp-name{display:block;font-size:12.5px;color:var(--muted);line-height:1.3;margin-bottom:14px}
/* linia wymiarowa jak na rysunku technicznym — kreskowany odcinek z zasadniczkami.
   Czyta sie jako zarezerwowane miejsce na wartosc, a nie jako pusta przestrzen. */
.pa-bp-rule{position:relative;display:block;width:52px;height:10px;margin-bottom:14px}
.pa-bp-rule::before{content:"";position:absolute;left:0;right:0;top:4px;
  border-top:1px dashed rgba(47,111,224,.6)}
.pa-bp-rule::after{content:"";position:absolute;inset:0;
  border-left:1px solid rgba(47,111,224,.6);border-right:1px solid rgba(47,111,224,.6)}
.pa-bp-wait{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.pa-bp-body{text-align:center;max-width:56ch;margin:0 auto}
.pa-bp-h{font-size:19px;font-weight:600;letter-spacing:-.022em;margin-bottom:10px}
.pa-bp-p{font-size:13.5px;color:var(--muted);line-height:1.65;margin-bottom:22px}
.pa-bp-btn{display:inline-flex;align-items:center;gap:9px;height:46px;padding:0 24px;border-radius:9999px;
  background:var(--text);color:#fff;font-size:14px;font-weight:500;letter-spacing:-.01em;
  box-shadow:0 3px 14px rgba(11,13,16,.18);
  transition:background-color .2s,box-shadow .3s var(--ease),transform .3s var(--ease)}
.pa-bp-btn:hover{background:#000;transform:translateY(-2px);
  box-shadow:0 10px 24px rgba(11,13,16,.24),0 0 0 4px var(--accent-soft)}
.pa-bp-btn svg{width:15px;height:15px;transition:transform .3s var(--ease)}
.pa-bp-btn:hover svg{transform:translateX(3px)}

/* ===== blad pobierania — tez bez zmyslonych liczb ===== */
.pa-err{border:1px solid rgba(180,50,31,.25);background:rgba(180,50,31,.04);border-radius:14px;padding:22px 24px}
.pa-err-h{font-size:14.5px;font-weight:600;color:var(--down);margin-bottom:8px}
.pa-err-p{font-size:13px;color:var(--muted);line-height:1.65;max-width:70ch}

/* ===== stopka: ciemne pasmo domykajace strone ===== */
.pnl-foot{flex:none;background:#0b0d10;color:#9299a6;padding:30px 0;margin-top:auto}
.pnl-foot-in{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center;
  font-family:var(--mono);font-size:11px;letter-spacing:.04em}
.pnl-foot a{color:#dfe4ec;border-bottom:1px solid rgba(255,255,255,.22);padding-bottom:1px;
  transition:border-color .2s,color .2s}
.pnl-foot a:hover{color:#fff;border-bottom-color:#fff}

/* ===== kaskada wejscia ===== */
@keyframes paUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes paIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.pa-panel:not(.pa-hidden) .pa-stag{opacity:0;animation:paUp .7s var(--ease) forwards}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(1){animation-delay:.38s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(2){animation-delay:.44s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(3){animation-delay:.50s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(4){animation-delay:.56s}

@media(max-width:900px){
  .pa-lower{grid-template-columns:minmax(0,1fr)}
  .pa-bp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .pa-strip-6{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pa-strip-6 .pa-k:nth-child(3n+1){border-left:0;padding-left:20px}
  .pa-strip-6 .pa-k:nth-child(n+4){border-top:1px solid var(--line-2)}
}
@media(max-width:640px){
  .pnl-hero{padding:32px 0 24px}
  .pnl-top-in{gap:10px}
  .pnl-for{display:none}
  .pa-bp{padding:22px 18px}
  .pa-sec{padding:14px 16px 16px}
  .pa-sec-h-pad{padding:14px 16px 0}
  /* nazwa kanalu w osobnej linii nad paskiem — bez ucinania */
  .pa-bar{grid-template-columns:minmax(0,1fr) 52px 40px;row-gap:5px}
  .pa-bar>span:first-child{grid-column:1/-1;white-space:normal}
  .pa-cw{height:150px}
  /* okres w dwoch wywazonych liniach zamiast sciesnionej kreski */
  .pa-period{text-wrap:balance}.pa-period::after{display:none}
  .kr{display:inline}.dl{display:none}
  .pa-tbl{min-width:0}
  /* liczby 2 + 2 + 2: najpierw zerujemy uklad z 900px, potem rysujemy go od nowa */
  .pa-strip-6,.pa-strip-4{grid-template-columns:repeat(2,minmax(0,1fr))}
  .pa-strip .pa-k:nth-child(n){border-left:0;padding-left:16px;border-top:1px solid var(--line-2)}
  .pa-strip .pa-k:nth-child(-n+2){border-top:0}
  .pa-strip .pa-k:nth-child(even){border-left:1px solid var(--line-2);padding-left:14px}
}
@media(max-width:460px){
  .pa-bp-grid{grid-template-columns:minmax(0,1fr)}
  .pnl-brand .pnl-word{display:none}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important}
  .pnl-h1,.pnl-sub,.pnl-stamp,.pa-tabs,.pa-stag{opacity:1!important}
}
`;
