/**
 * skaluj.ai — panel klienta: style.
 *
 * Jezyk dema "panel wynikow" ze strony glownej, tylko na prawdziwych danych: kafelki z ikona,
 * zielone i czerwone pigulki zmian, glowna liczba w akcencie obok wykresu, niebieska poswiata
 * pod pierwszym rzedem. Klient ma zobaczyc dokladnie to, co obiecuje strona.
 * Geist do tresci i duzych liczb, Azeret Mono do danych (tabele, osie, zmiany), akcent #2f6fe0.
 *
 * Sygnatura stanu bez danych: rysunek techniczny (.pa-bp-*). Zakladka bez podlaczonego zrodla
 * ma czytac sie jak PLAN tego, co powstanie — nie jak zepsuty wykres. "Nie zmyslamy liczb".
 */
export const CSS = `
:root{
  --bg:#ffffff;--bg-elev:#f7f8fa;--bg-elev-2:#eef1f5;
  --text:#0b0d10;--muted:#565d68;--faint:#626873;
  --line:rgba(0,0,0,.10);--line-2:rgba(0,0,0,.06);
  --accent:#2f6fe0;--accent-dim:#2456b0;--accent-ink:#2456b0;--accent-soft:rgba(47,111,224,.10);
  /* kolory zmian jak w demo na stronie glownej, przyciemnione do kontrastu 4.5:1 na swoim tle */
  --good:#137038;--good-bg:rgba(22,163,74,.10);
  --down:#b4321f;--down-bg:rgba(220,38,38,.08);
  --warn:#a8380a;--warn-bg:rgba(234,88,12,.10);
  --tile:linear-gradient(180deg,#ffffff 0%,#f8f9fb 100%);
  --tile-sh:0 1px 2px rgba(15,30,60,.04);
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
/* przecinek dziesietny w mono tez ma pelna komorke; w Geist jest waski i nie trzeba go ruszac */
.num .dc{margin:0 -.17em}
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
/* panel pokazowy: etykieta jak "Demo" w oknie dema na stronie glownej; widoczna takze na telefonie */
.pnl-demo{display:inline-flex;align-items:center;gap:7px;flex:none;font-family:var(--mono);font-size:11px;letter-spacing:.08em;
  text-transform:uppercase;color:var(--accent-ink);background:var(--accent-soft);border-radius:9999px;padding:4px 10px;white-space:nowrap}
.pnl-demo::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent)}

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
/* "na zywo" jak na stronie glownej: dane pobierane przy kazdym otwarciu */
.pnl-pulse{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);
  margin-right:9px;vertical-align:1px;box-shadow:0 0 0 3px var(--accent-soft);animation:paPulse 1.8s ease-in-out infinite}
@keyframes paPulse{0%,100%{opacity:1}50%{opacity:.3}}

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
.pa-tab.is-active svg{color:var(--accent)}
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

/* ===== skrzynki ===== */
.pa-box{min-width:0;background:var(--tile);border:1px solid var(--line-2);border-radius:16px;
  padding:18px 20px 20px;box-shadow:var(--tile-sh)}
.pa-sec-h{display:flex;justify-content:space-between;align-items:baseline;gap:4px 12px;flex-wrap:wrap;margin-bottom:14px}
.pa-sec-h h2{font-size:14px;font-weight:600;letter-spacing:-.01em}
.pa-sec-h>span{font-size:12px;color:var(--faint)}
.pa-empty{font-size:13px;color:var(--muted)}
.pa-note{font-size:12.5px;color:var(--faint);line-height:1.55;margin-top:18px;max-width:78ch}

/* ===== rzad 1: glowna liczba + wykres, pod nimi niebieska poswiata jak pod demo na stronie ===== */
.pa-hero-row{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.55fr);gap:14px;margin-bottom:14px}
.pa-hero-row::before{content:"";position:absolute;left:50%;top:50%;width:94%;height:130%;transform:translate(-50%,-50%);
  border-radius:50%;pointer-events:none;filter:blur(80px);
  background:radial-gradient(ellipse,rgba(47,111,224,.15),rgba(47,111,224,.04) 45%,transparent 72%)}
.pa-hero-row>*{position:relative}
.pa-hero{overflow:hidden;border:1px solid rgba(47,111,224,.18);border-radius:16px;padding:24px 24px 22px;
  display:flex;flex-direction:column;justify-content:center;box-shadow:var(--tile-sh);
  background:radial-gradient(130% 130% at 85% 0%,rgba(47,111,224,.11),rgba(255,255,255,0) 60%),var(--tile)}
.pa-hero-ico{position:absolute;right:-24px;bottom:-34px;width:178px;height:178px;color:var(--accent);opacity:.07;pointer-events:none}
.pa-hero-ico svg{width:100%;height:100%;stroke-width:1.3}
.pa-hero-l{font-size:13.5px;color:var(--muted);margin-bottom:12px}
.pa-hero-v{font-size:clamp(3rem,6vw,4.25rem);font-weight:580;letter-spacing:-.04em;line-height:.95;
  color:var(--accent);margin-bottom:16px;white-space:nowrap}
.pa-hero-d{display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;font-size:12.5px;color:var(--faint)}
.pa-hero-note{margin-top:16px;padding-top:14px;border-top:1px solid var(--line-2);font-size:13px;color:var(--muted)}
.pa-hero-note b{color:var(--text);font-weight:600}

/* ===== pigulka zmiany: zielona = lepiej, czerwona = gorzej (przy odrzuceniach spadek jest lepszy) ===== */
.pa-d{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:9999px;font-family:var(--mono);
  font-size:11.5px;letter-spacing:-.01em;white-space:nowrap;color:var(--muted);background:var(--bg-elev-2)}
.pa-d svg{width:9px;height:9px;fill:currentColor;flex:none}
.pa-d small{font:inherit;opacity:.75}
.pa-d-up{color:var(--good);background:var(--good-bg)}
.pa-d-dn{color:var(--down);background:var(--down-bg)}

/* ===== kafelki jak w demo na stronie glownej ===== */
.pa-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}
.pa-kpi{min-width:0;background:var(--tile);border:1px solid var(--line-2);border-radius:14px;padding:16px 16px 15px;
  box-shadow:var(--tile-sh);transition:border-color .25s,box-shadow .3s var(--ease)}
.pa-kpi:hover{border-color:rgba(47,111,224,.28);box-shadow:0 14px 28px -18px rgba(47,111,224,.45)}
.pa-kpi dt{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.pa-ki{width:30px;height:30px;border-radius:9px;background:var(--accent-soft);color:var(--accent);
  display:flex;align-items:center;justify-content:center}
.pa-ki svg{width:16px;height:16px}
.pa-kl{max-width:100%;font-size:12.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-kpi .pa-kv{font-size:clamp(1.55rem,2.3vw,1.95rem);font-weight:570;letter-spacing:-.035em;line-height:1;
  margin:8px 0 10px;white-space:nowrap}

/* ===== wykres tygodni ===== */
.pa-chartbox{display:flex;flex-direction:column}
.pa-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
/* podpisy osi w HTML, zeby na telefonie nie malaly razem z rozciagnietym SVG */
.pa-cw{position:relative;height:200px;padding-left:44px;margin-top:auto}
.pa-ay{position:absolute;left:0;width:36px;text-align:right;transform:translateY(-50%);font-size:11px;color:var(--faint);pointer-events:none}
.pa-ax{position:relative;height:18px;margin:8px 0 0 44px}
.pa-ax span{position:absolute;top:0;font-size:11px;color:var(--faint);white-space:nowrap}
.pa-plot{position:relative;height:100%;cursor:crosshair;touch-action:pan-y;border-radius:6px}
.pa-plot:focus-visible{outline-offset:6px}
.pa-svg{display:block;width:100%;height:100%;overflow:visible}
.c-grid{stroke:var(--line-2);stroke-width:1;vector-effect:non-scaling-stroke}
.c-area{fill:url(#pa-fill)}
.c-line{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round;
  vector-effect:non-scaling-stroke;filter:drop-shadow(0 4px 8px rgba(47,111,224,.28))}
/* ostatni tydzien: kropka jak w demo i jego wartosc podpisana wprost */
.pa-end{position:absolute;width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border-radius:50%;background:#fff;
  border:2.5px solid var(--accent);box-shadow:0 0 0 5px rgba(47,111,224,.14);pointer-events:none;
  transition:opacity .4s var(--ease) 1s,transform .6s var(--ease) 1s}
.pa-end-v{position:absolute;right:14px;transform:translateY(-155%);font-size:11.5px;color:var(--accent-ink);
  background:#fff;border:1px solid rgba(47,111,224,.25);border-radius:9999px;padding:1px 8px;pointer-events:none;
  transition:opacity .3s var(--ease)}
/* celownik i dymek pod kursorem */
.pa-xh{position:absolute;top:0;bottom:0;width:1px;margin-left:-.5px;background:rgba(47,111,224,.4);opacity:0;pointer-events:none}
.pa-hd{position:absolute;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:var(--accent);
  box-shadow:0 0 0 4px rgba(47,111,224,.2);opacity:0;pointer-events:none}
.pa-tip{position:absolute;z-index:3;background:#0b0d10;color:#fff;border-radius:10px;padding:7px 11px;font-size:12px;
  line-height:1.35;white-space:nowrap;box-shadow:0 12px 26px -10px rgba(11,13,16,.55);opacity:0;pointer-events:none}
.pa-tip b{font-family:var(--mono);font-weight:500;word-spacing:-.4em}
.pa-tip span{display:block;color:#aab1bd;font-size:11px}
.pa-plot.is-hover .pa-xh,.pa-plot.is-hover .pa-hd,.pa-plot.is-hover .pa-tip{opacity:1}
.pa-plot.is-hover .pa-end-v{opacity:0}
/* wejscie: linia rysuje sie od lewej, potem pojawia sie kropka ostatniego tygodnia */
.pa-plot.pa-pre .pa-svg{clip-path:inset(-24px 100% -24px -24px)}
.pa-plot.pa-pre.is-on .pa-svg{clip-path:inset(-24px -24px -24px -24px);transition:clip-path 1.3s var(--ease)}
.pa-plot.pa-pre .pa-end{opacity:0;transform:scale(.3)}
.pa-plot.pa-pre .pa-end-v{opacity:0}
.pa-plot.pa-pre.is-on .pa-end{opacity:1;transform:none}
.pa-plot.pa-pre.is-on:not(.is-hover) .pa-end-v{opacity:1;transition:opacity .4s var(--ease) 1.15s}

/* ===== rzad 3: zrodla i strony ===== */
.pa-lower{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:14px;margin-bottom:14px}
.pa-bars{display:grid;gap:2px}
.pa-bar{display:grid;grid-template-columns:minmax(0,170px) minmax(0,1fr) 48px 38px;align-items:center;gap:12px;
  font-size:13px;padding:7px 8px;margin:0 -8px;border-radius:9px;transition:background-color .2s}
.pa-bar:hover{background:rgba(47,111,224,.05)}
.pa-bar>span:first-child{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-trk{height:7px;border-radius:4px;background:var(--bg-elev-2);overflow:hidden}
/* display:block jest konieczne — .pa-trk i to element inline, a na nim width nie dziala */
.pa-trk i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,rgba(47,111,224,.55),var(--accent));
  transform-origin:left;transition:transform .9s var(--ease)}
.pa-bar .num{text-align:right;font-size:12.5px}
.pa-share{color:var(--faint)}
.pa-pages{list-style:none;display:grid;grid-template-columns:minmax(0,1fr);gap:5px}
.pa-pages li{position:relative;isolation:isolate;display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:8px 11px;border-radius:9px;font-size:13px}
.pa-pages li::before{content:"";position:absolute;inset:0 auto 0 0;width:var(--w);z-index:-1;border-radius:9px;
  background:linear-gradient(90deg,rgba(47,111,224,.13),rgba(47,111,224,.05))}
.pa-pp{min-width:0;font-family:var(--mono);font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pa-pages .num{font-size:12.5px}

/* ===== Google: wyrozniona skrzynka jak "Widocznosc w AI" w demo ===== */
.pa-geo{position:relative;border-color:rgba(47,111,224,.2);
  background:radial-gradient(110% 140% at 100% 0%,rgba(47,111,224,.09),transparent 58%),var(--tile)}
.pa-geo-h{display:flex;align-items:center;gap:12px}
.pa-geo-ico{width:36px;height:36px;border-radius:10px;background:var(--accent-soft);color:var(--accent);
  display:flex;align-items:center;justify-content:center;flex:none}
.pa-geo-ico svg{width:18px;height:18px}
.pa-geo-h h2{font-size:15px;font-weight:600;letter-spacing:-.015em;line-height:1.3}
.pa-geo-h p{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.pa-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:16px 0 20px;
  border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2)}
.pa-k{padding:14px 0 14px 18px;min-width:0}
.pa-k:first-child{padding-left:0}
.pa-k+.pa-k{border-left:1px solid var(--line-2)}
.pa-k dt{font-size:12.5px;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-k .pa-kv{display:block;font-size:clamp(1.35rem,2vw,1.6rem);font-weight:570;letter-spacing:-.03em;margin:4px 0 6px;white-space:nowrap}
.pa-sub-h{font-size:14px;font-weight:600;letter-spacing:-.01em;margin-bottom:10px}
/* miejsce w Google jak znaczki w tabeli dema: top 3 / 1. strona / 2. strona / dalej */
.pa-badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-family:var(--mono);font-size:11px;
  letter-spacing:-.01em;white-space:nowrap;word-spacing:normal}
.pa-badge-g{color:var(--good);background:var(--good-bg)}
.pa-badge-b{color:var(--accent-ink);background:var(--accent-soft)}
.pa-badge-o{color:var(--warn);background:var(--warn-bg)}
.pa-badge-n{color:var(--muted);background:var(--bg-elev-2)}
.pa-badge-r{color:var(--down);background:var(--down-bg)}
.pa-pos{display:inline-block;min-width:4ch;margin-right:10px}

/* tabela przewija sie we wlasnym kontenerze, nigdy calym body */
.pa-tbl-scroll{min-width:0;overflow-x:auto}
.pa-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:300px}
.pa-tbl th{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);
  padding:0 0 10px;text-align:left;font-weight:500}
.pa-tbl td{padding:10px 0;border-top:1px solid var(--line-2);color:var(--muted);vertical-align:middle}
.pa-tbl tbody tr{transition:background-color .2s}
.pa-tbl tbody tr:hover{background:rgba(47,111,224,.04)}
.pa-tbl td:first-child{color:var(--text);font-weight:500}
.pa-tbl td.num,.pa-tbl th.num{padding-left:14px}
.pa-tbl th.num{text-align:right}
.pa-tbl td.num{text-align:right;white-space:nowrap}
.kr{display:none}

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
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(1){animation-delay:.34s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(2){animation-delay:.42s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(3){animation-delay:.5s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(4){animation-delay:.58s}

@media(max-width:1040px){
  .pa-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media(max-width:900px){
  .pa-hero-row,.pa-lower{grid-template-columns:minmax(0,1fr)}
  .pa-bp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:640px){
  .pnl-hero{padding:32px 0 24px}
  .pnl-top-in{gap:10px}
  .pnl-for,.pnl-demo-d{display:none}
  .pa-bp{padding:22px 18px}
  .pa-box{padding:16px 16px 18px}
  .pa-hero{padding:20px 18px 18px}
  .pa-hero-ico{width:140px;height:140px}
  .pa-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  /* piaty kafelek na cala szerokosc, zeby nie zostawial dziury */
  .pa-kpis .pa-kpi:last-child:nth-child(odd){grid-column:1/-1}
  .pa-kpi{padding:14px 14px 13px}
  /* nazwa kanalu w osobnej linii nad paskiem — bez ucinania */
  .pa-bar{grid-template-columns:minmax(0,1fr) 52px 40px;row-gap:6px}
  .pa-bar>span:first-child{grid-column:1/-1;white-space:normal}
  .pa-cw{height:170px;padding-left:38px}
  .pa-ay{width:31px}
  .pa-ax{margin-left:38px}
  /* okres w dwoch wywazonych liniach zamiast sciesnionej kreski */
  .pa-period{text-wrap:balance}.pa-period::after{display:none}
  .kr{display:inline}.dl{display:none}
  .pa-tbl{min-width:0}
  .pa-col-imp{display:none}
  .pa-pos{min-width:0;margin-right:6px}
  /* liczby Google 2 + 2 */
  .pa-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
  .pa-k:nth-child(n){padding-left:14px;border-left:0}
  .pa-k:nth-child(odd){padding-left:0}
  .pa-k:nth-child(even){border-left:1px solid var(--line-2)}
  .pa-k:nth-child(n+3){border-top:1px solid var(--line-2)}
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
