/**
 * skaluj.ai — panel klienta: style.
 *
 * Jezyk wizualny wziety wprost ze strony (index.html): te same tokeny, Geist +
 * Azeret Mono, radialny wash w blekicie, mono-eyebrow z kreskami, kaskada fadeUp.
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
  --accent:#2f6fe0;--accent-dim:#2456b0;--accent-soft:rgba(47,111,224,.10);
  --maxw:1180px;
  --sans:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --mono:"Azeret Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;
  line-height:1.55;letter-spacing:-.011em;-webkit-font-smoothing:antialiased;
  /* stopka dociagnieta do dolu — bez tego krotki panel zostawia martwa biel */
  min-height:100vh;display:flex;flex-direction:column}
a{color:inherit;text-decoration:none}
main{flex:1 0 auto}
.pnl-wrap{max-width:var(--maxw);margin:0 auto;padding:0 clamp(24px,4vw,48px);width:100%}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}

/* ===== belka ===== */
.pnl-top{position:relative;z-index:2;padding:20px 0}
.pnl-top-in{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.pnl-brand{display:inline-flex;align-items:center;gap:9px;font-weight:600;letter-spacing:-.02em;font-size:17px}
.pnl-brand img{height:22px;width:auto;display:block}
.pnl-for{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}

/* ===== hero: radialny wash jak w hero strony, wygaszony maska u dolu ===== */
.pnl-hero{position:relative;overflow:hidden;padding:56px 0 34px}
.pnl-hero::before{content:"";position:absolute;inset:-120px 0 0;pointer-events:none;
  background:radial-gradient(ellipse 120% 78% at 50% 0%,rgba(47,111,224,.10),transparent 62%);
  -webkit-mask-image:linear-gradient(180deg,#000 0,#000 64%,transparent 100%);
          mask-image:linear-gradient(180deg,#000 0,#000 64%,transparent 100%)}
.pnl-hero-in{position:relative;z-index:1}
.pnl-eyebrow{display:flex;align-items:center;gap:14px;font-family:var(--mono);font-size:10.5px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
  opacity:0;animation:paUp .8s var(--ease) .04s forwards}
.pnl-eyebrow::after{content:"";height:1px;flex:1;max-width:220px;
  background:linear-gradient(90deg,rgba(47,111,224,.55),transparent)}
.pnl-h1{margin-top:20px;font-size:clamp(2rem,4.6vw,3.4rem);font-weight:500;letter-spacing:-.028em;
  line-height:1.1;max-width:18ch;opacity:0;animation:paUp .9s var(--ease) .12s forwards}
.pnl-sub{margin-top:16px;color:var(--muted);font-size:15.5px;max-width:56ch;
  opacity:0;animation:paUp .9s var(--ease) .2s forwards}
.pnl-stamp{margin-top:22px;display:inline-flex;align-items:center;gap:9px;font-family:var(--mono);
  font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
  border:1px solid var(--line-2);border-radius:9999px;padding:6px 13px;background:rgba(255,255,255,.6);
  opacity:0;animation:paUp .9s var(--ease) .28s forwards}
.pnl-stamp b{color:var(--text);font-weight:500}

/* ===== zakladki ===== */
.pa-tabs{position:relative;display:inline-flex;flex-wrap:nowrap;gap:2px;margin-bottom:26px;padding:4px;
  background:var(--bg-elev-2);border:1px solid var(--line-2);border-radius:9999px;max-width:100%;
  overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity;
  opacity:0;animation:paUp .8s var(--ease) .36s forwards;
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
.pa-soon-dot{width:6px;height:6px;border-radius:50%;background:transparent;flex:none;
  box-shadow:inset 0 0 0 1.5px var(--faint);opacity:.6}

/* ===== panele ===== */
/* minmax(0,1fr) + min-width:0 sa konieczne: element siatki ma domyslnie min-width:auto,
   wiec szeroka tabela rozpychalaby caly tor i strona przewijalaby sie w poziomie. */
.pa-panels{display:grid;grid-template-columns:minmax(0,1fr);padding-bottom:56px}
.pa-panel{grid-area:1/1;min-width:0;display:flex;flex-direction:column;animation:paIn .34s var(--ease)}
.pa-panel.pa-hidden{visibility:hidden;opacity:0;pointer-events:none}
.pa-period{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;
  color:var(--faint);margin-bottom:16px;display:flex;align-items:center;gap:12px}
.pa-period::after{content:"";flex:1;height:1px;background:var(--line-2)}

/* ===== karty KPI ===== */
.pa-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px}
.pa-kpis-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.pa-kpi{position:relative;overflow:hidden;border:1px solid var(--line-2);border-radius:16px;padding:20px 22px;
  /* ten sam wash co karty na stronie glownej */
  background:radial-gradient(120% 140% at 100% 0%,rgba(47,111,224,.07),transparent 58%),var(--bg-elev);
  transition:transform .3s var(--ease),border-color .3s,box-shadow .3s var(--ease)}
.pa-kpi:hover{transform:translateY(-3px);border-color:rgba(47,111,224,.28);
  box-shadow:0 18px 34px -20px rgba(47,111,224,.45)}
.pa-kl{display:block;font-size:11.5px;color:var(--faint);margin-bottom:12px;line-height:1.3}
.pa-kv{display:block;font-family:var(--mono);font-size:clamp(1.6rem,2.6vw,2.3rem);font-weight:500;
  letter-spacing:-.035em;color:var(--text);font-variant-numeric:tabular-nums;line-height:1;margin-bottom:12px}
.pa-trend{font-family:var(--mono);font-size:9.5px;display:inline-flex;align-items:center;gap:3px;
  padding:3px 8px;border-radius:9999px;letter-spacing:.01em}
.pa-up{color:#16a34a;background:rgba(22,163,74,.10)}
.pa-dn{color:#dc2626;background:rgba(220,38,38,.10)}
.pa-nu{color:var(--faint);background:var(--bg-elev-2)}

/* ===== dolne skrzynki ===== */
.pa-lower{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:12px;align-items:stretch}
.pa-box{min-width:0;background:var(--bg-elev);border:1px solid var(--line-2);border-radius:16px;padding:20px 22px}
.pa-box-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:8px;flex-wrap:wrap}
.pa-box-title{font-size:13px;font-weight:540;color:var(--text);letter-spacing:-.012em}
.pa-box-sub{font-family:var(--mono);font-size:9px;color:var(--faint);letter-spacing:.08em;text-transform:uppercase}
.pa-bar-row{display:flex;align-items:center;gap:12px;padding:5px 7px;margin:-5px -7px 6px;border-radius:9px;
  transition:background-color .2s}
.pa-bar-row:hover{background:rgba(47,111,224,.05)}
.pa-bar-row:last-child{margin-bottom:-5px}
.pa-brl{flex:none;width:112px;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-brb{flex:1;height:6px;background:var(--bg-elev-2);border-radius:3px;overflow:hidden}
/* display:block jest konieczne — .pa-brf to <span>, na elemencie inline width nie dziala */
.pa-brf{display:block;height:100%;border-radius:3px;
  background:linear-gradient(90deg,var(--accent-dim),var(--accent));
  box-shadow:0 0 8px rgba(47,111,224,.4);transition:width .8s var(--ease)}
.pa-brv{font-family:var(--mono);font-size:10.5px;color:var(--muted);flex:none;width:38px;text-align:right;
  font-variant-numeric:tabular-nums}
/* tabela przewija sie we wlasnym kontenerze, nigdy calym body */
.pa-tbl-scroll{min-width:0;overflow-x:auto;margin:0 -4px;padding:0 4px}
.pa-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:280px}
.pa-tbl th{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
  padding:0 0 10px;text-align:left;font-weight:500}
.pa-tbl td{padding:9px 0;border-top:1px solid var(--line-2);color:var(--muted);vertical-align:middle}
.pa-tbl td:first-child{color:var(--text);font-weight:500;font-size:12.5px}
.pa-tbl td.num,.pa-tbl th.num{padding-left:14px}
.pa-tbl th.num{text-align:right}
.pa-tbl td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.pa-note{font-size:11.5px;color:var(--faint);line-height:1.55;margin-top:18px;max-width:78ch}

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
.pa-bp-tag{position:absolute;top:-9px;left:26px;font-family:var(--mono);font-size:8.5px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--accent);background:var(--bg);padding:0 9px}
.pa-bp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:26px}
/* karta metryki jako opis na rysunku: nazwa jest prawdziwa, liczby brak */
.pa-bp-cell{border:1px dashed rgba(47,111,224,.28);border-radius:12px;padding:16px 18px;
  background:rgba(255,255,255,.55)}
.pa-bp-name{display:block;font-size:11.5px;color:var(--muted);line-height:1.3;margin-bottom:14px}
/* linia wymiarowa jak na rysunku technicznym — kreskowany odcinek z zasadniczkami.
   Czyta sie jako zarezerwowane miejsce na wartosc, a nie jako pusta przestrzen. */
.pa-bp-rule{position:relative;display:block;width:52px;height:10px;margin-bottom:14px}
.pa-bp-rule::before{content:"";position:absolute;left:0;right:0;top:4px;
  border-top:1px dashed rgba(47,111,224,.6)}
.pa-bp-rule::after{content:"";position:absolute;inset:0;
  border-left:1px solid rgba(47,111,224,.6);border-right:1px solid rgba(47,111,224,.6)}
.pa-bp-wait{font-family:var(--mono);font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
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
.pa-err{border:1px solid rgba(220,38,38,.25);background:rgba(220,38,38,.04);border-radius:16px;padding:22px 24px}
.pa-err-h{font-size:14.5px;font-weight:600;color:#b91c1c;margin-bottom:8px}
.pa-err-p{font-size:13px;color:var(--muted);line-height:1.65;max-width:70ch}

/* ===== stopka: ciemne pasmo domykajace strone ===== */
.pnl-foot{flex:none;background:#0b0d10;color:#9299a6;padding:30px 0;margin-top:auto}
.pnl-foot-in{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center;
  font-family:var(--mono);font-size:10.5px;letter-spacing:.04em}
.pnl-foot a{color:#dfe4ec;border-bottom:1px solid rgba(255,255,255,.22);padding-bottom:1px;
  transition:border-color .2s,color .2s}
.pnl-foot a:hover{color:#fff;border-bottom-color:#fff}

/* ===== kaskada wejscia ===== */
@keyframes paUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes paIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.pa-panel:not(.pa-hidden) .pa-stag{opacity:0;animation:paUp .7s var(--ease) forwards}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(1){animation-delay:.44s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(2){animation-delay:.50s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(3){animation-delay:.56s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(4){animation-delay:.62s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(5){animation-delay:.68s}
.pa-panel:not(.pa-hidden) .pa-stag:nth-child(6){animation-delay:.74s}

@media(max-width:900px){
  .pa-lower{grid-template-columns:minmax(0,1fr)}
  .pa-bp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:760px){
  .pnl-hero{padding:36px 0 26px}
  .pa-kpis,.pa-kpis-4{grid-template-columns:repeat(2,minmax(0,1fr))}
  .pa-brl{width:88px}
  .pa-bp{padding:22px 18px}
  .pa-eyebrow::after{max-width:80px}
}
@media(max-width:460px){
  .pa-kpis,.pa-kpis-4,.pa-bp-grid{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important}
  .pnl-eyebrow,.pnl-h1,.pnl-sub,.pnl-stamp,.pa-tabs,.pa-stag{opacity:1!important}
}
`;
