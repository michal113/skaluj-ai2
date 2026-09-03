/**
 * skaluj.ai — panel klienta: style.
 * Jezyk wizualny .pa-* przeniesiony 1:1 z demo na stronie glownej (index.html),
 * zeby panel wygladal jak ta sama marka. Dolozone: powloka strony (.pnl-*)
 * i stan "wkrotce" dla paneli bez podlaczonych danych (.pa-soon-*).
 */
export const CSS = `
:root{--bg:#ffffff;--bg-elev:#f7f8fa;--bg-elev-2:#eef1f5;--text:#0b0d10;--muted:#565d68;--faint:#626873;--line:rgba(0,0,0,.10);--line-2:rgba(0,0,0,.06);--accent:#2f6fe0;--accent-dim:#2456b0;--accent-soft:rgba(47,111,224,.10);--r-lg:16px;--maxw:1080px;--sans:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--mono:"Azeret Mono",ui-monospace,SFMono-Regular,Menlo,monospace;--ease:cubic-bezier(.22,1,.36,1)}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:16px;line-height:1.55;letter-spacing:-.011em;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.pnl-wrap{max-width:var(--maxw);margin:0 auto;padding:0 clamp(24px,4vw,48px)}

/* naglowek strony */
.pnl-top{border-bottom:1px solid var(--line-2);padding:22px 0;margin-bottom:30px}
.pnl-top-in{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.pnl-brand{display:inline-flex;align-items:center;gap:9px;font-weight:600;letter-spacing:-.02em;font-size:17px}
.pnl-brand img{height:24px;width:auto;display:block}
.pnl-for{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.pnl-head{margin-bottom:26px}
.pnl-h1{font-size:clamp(1.5rem,3vw,2rem);font-weight:600;letter-spacing:-.03em;line-height:1.2;margin-bottom:8px}
.pnl-sub{color:var(--muted);font-size:14.5px}
.pnl-foot{border-top:1px solid var(--line-2);margin-top:44px;padding:22px 0 60px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;font-family:var(--mono);font-size:11px;color:var(--faint)}
.pnl-foot a{color:var(--accent)}

/* ===== jezyk .pa-* (z index.html) ===== */
.pa-tabs{position:relative;display:inline-flex;flex-wrap:nowrap;gap:2px;margin-bottom:20px;padding:4px;background:var(--bg-elev-2);border:1px solid var(--line-2);border-radius:9999px;max-width:100%;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity;-webkit-mask-image:linear-gradient(90deg,#000,#000);mask-image:linear-gradient(90deg,#000,#000);transition:mask-image .2s,-webkit-mask-image .2s}
.pa-tabs::-webkit-scrollbar{display:none}
.pa-tabs.can-r{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 26px),transparent)}
.pa-tabs.can-l{-webkit-mask-image:linear-gradient(90deg,transparent,#000 26px);mask-image:linear-gradient(90deg,transparent,#000 26px)}
.pa-tabs.can-l.can-r{-webkit-mask-image:linear-gradient(90deg,transparent,#000 26px,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(90deg,transparent,#000 26px,#000 calc(100% - 26px),transparent)}
.pa-tab{scroll-snap-align:start;position:relative;z-index:1;display:inline-flex;align-items:center;gap:7px;font-family:var(--sans);font-size:12.5px;font-weight:500;letter-spacing:-.01em;color:var(--muted);background:none;border:0;border-radius:9999px;padding:8px 16px;cursor:pointer;white-space:nowrap;transition:color .25s}
/* SVG bez atrybutow width/height jest flex-itemem o zerowym rozmiarze — trzeba go zwymiarowac */
.pa-tab svg{width:14px;height:14px;flex:none}
.pa-tab:hover{color:var(--text)}
.pa-tab.is-active{color:var(--text)}
.pa-tab-glider{position:absolute;top:4px;left:0;height:calc(100% - 8px);width:0;background:#fff;border-radius:9999px;box-shadow:0 2px 10px rgba(15,30,60,.14),0 0 0 1px rgba(0,0,0,.045);transition:transform .35s var(--ease),width .35s var(--ease);pointer-events:none}
.pa-panels{display:grid}
.pa-panel{grid-area:1/1;animation:paIn .3s var(--ease);display:flex;flex-direction:column}
.pa-panel.pa-hidden{visibility:hidden;opacity:0;pointer-events:none}
.pa-period{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin-bottom:14px;display:flex;align-items:center;gap:10px}
.pa-period::after{content:"";flex:1;height:1px;background:var(--line-2)}
.pa-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.pa-kpis-4{grid-template-columns:repeat(4,1fr)}
.pa-kpi{position:relative;background:var(--bg-elev);border:1px solid var(--line-2);border-radius:14px;padding:14px 16px;transition:transform .25s var(--ease),border-color .25s,box-shadow .25s}
.pa-kpi:hover{transform:translateY(-3px);border-color:rgba(47,111,224,.3);box-shadow:0 14px 28px -16px rgba(47,111,224,.45)}
.pa-kl{display:block;font-size:11px;color:var(--faint);margin-bottom:8px;line-height:1.3}
.pa-kv{display:block;font-size:clamp(1.3rem,2.2vw,1.8rem);font-weight:560;letter-spacing:-.03em;color:var(--text);font-variant-numeric:tabular-nums;line-height:1;margin-bottom:8px}
.pa-trend{font-family:var(--mono);font-size:9.5px;display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:9999px;letter-spacing:.01em}
.pa-up{color:#16a34a;background:rgba(22,163,74,.10)}
.pa-dn{color:#dc2626;background:rgba(220,38,38,.10)}
.pa-nu{color:var(--faint);background:var(--bg-elev-2)}
.pa-lower{display:grid;grid-template-columns:1.45fr 1fr;gap:12px;align-items:stretch}
.pa-box{background:var(--bg-elev);border:1px solid var(--line-2);border-radius:14px;padding:16px 18px}
.pa-box-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:8px;flex-wrap:wrap}
.pa-box-title{font-size:12.5px;font-weight:540;color:var(--text);letter-spacing:-.01em}
.pa-box-sub{font-family:var(--mono);font-size:9px;color:var(--faint);letter-spacing:.06em}
.pa-bar-row{display:flex;align-items:center;gap:10px;padding:4px 6px;margin:-4px -6px 5px;border-radius:8px;transition:background-color .2s}
.pa-bar-row:hover{background:rgba(47,111,224,.05)}
.pa-bar-row:last-child{margin-bottom:-4px}
.pa-brl{flex:none;width:104px;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pa-brb{flex:1;height:5px;background:var(--bg-elev-2);border-radius:3px;overflow:hidden}
/* display:block jest konieczne — .pa-brf to <span>, a na elemencie inline width nie dziala */
.pa-brf{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--accent-dim),var(--accent));box-shadow:0 0 8px rgba(47,111,224,.4);transition:width .6s var(--ease)}
.pa-brv{font-family:var(--mono);font-size:10px;color:var(--muted);flex:none;width:36px;text-align:right;font-variant-numeric:tabular-nums}
.pa-tbl{width:100%;border-collapse:collapse;font-size:11.5px}
.pa-tbl th{font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);padding:0 0 9px;text-align:left;font-weight:500}
.pa-tbl td{padding:8px 0;border-top:1px solid var(--line-2);color:var(--muted);vertical-align:middle}
.pa-tbl td:first-child{color:var(--text);font-weight:500;font-size:12px}
.pa-tbl td.num,.pa-tbl th.num{padding-left:14px}
.pa-tbl th.num{text-align:right}
.pa-tbl td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.pa-note{font-size:11px;color:var(--faint);line-height:1.5;margin-top:14px}
@keyframes paIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}

/* ===== stan "wkrotce": panel bez podlaczonych danych ===== */
/* Kropka przy zakladce — neutralna, wyraznie inna niz akcentowa "na zywo" */
.pa-soon-dot{width:5px;height:5px;border-radius:50%;background:var(--faint);opacity:.55;flex:none}
/* Karty KPI z prawdziwa etykieta metryki, ale BEZ liczby (myslnik, nigdy 0) */
.pa-kpi.is-soon{background:transparent;border-style:dashed}
.pa-kpi.is-soon:hover{transform:none;border-color:var(--line-2);box-shadow:none}
.pa-kpi.is-soon .pa-kv{color:var(--faint);opacity:.5}
.pa-soon-wait{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;color:var(--faint)}
.pa-soon-card{text-align:center;padding:30px 24px;border:1px dashed var(--line);border-radius:14px;background:var(--bg-elev)}
.pa-soon-ico{width:40px;height:40px;border-radius:12px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.pa-soon-ico svg{width:20px;height:20px}
.pa-soon-h{font-size:15px;font-weight:600;letter-spacing:-.015em;margin-bottom:8px}
.pa-soon-p{font-size:13px;color:var(--muted);line-height:1.6;max-width:52ch;margin:0 auto 18px}
.pa-soon-btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 20px;border-radius:9999px;background:var(--text);color:#fff;font-size:13.5px;font-weight:500;letter-spacing:-.01em;box-shadow:0 3px 12px rgba(11,13,16,.16);transition:background-color .2s,box-shadow .25s var(--ease),transform .25s var(--ease)}
.pa-soon-btn:hover{background:#000;transform:translateY(-1px);box-shadow:0 6px 18px rgba(11,13,16,.22),0 0 0 3px var(--accent-soft)}

/* stan bledu pobierania danych — tez bez zmyslonych liczb */
.pa-err{border:1px solid rgba(220,38,38,.25);background:rgba(220,38,38,.04);border-radius:14px;padding:18px 20px}
.pa-err-h{font-size:13.5px;font-weight:600;color:#b91c1c;margin-bottom:6px}
.pa-err-p{font-size:12.5px;color:var(--muted);line-height:1.6}

@media(max-width:760px){
  .pa-kpis,.pa-kpis-4{grid-template-columns:1fr 1fr}
  .pa-lower{grid-template-columns:1fr}
  .pa-brl{width:82px}
}
@media (prefers-reduced-motion:reduce){
  .pa-tabs,.pa-tab-glider,.pa-brf{transition:none}
  .pa-panel,.pa-kpi{animation:none;transition:none}
}
`;
