/**
 * skaluj.ai — panel wewnętrzny: ruch na stronach wszystkich klientów.
 *
 * Dla Michała i zespołu, nie dla klientów. Jeden ekran: kto rośnie, kto spada
 * i dlaczego (które źródło), a po kliknięciu szczegóły jednego klienta.
 * Dane przychodzą jako tygodnie × źródła (24 tygodnie), resztę liczy przeglądarka.
 *
 * Na razie tylko warstwa wizualna na danych DEMO (demo-internal.js).
 * Hasło i prawdziwe dane z GA4 dojdą w Workerze — ta strona nie trafia na GitHub Pages.
 */
import { esc } from "./render.js";

const IKONY = {
  gora: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5 13 9H3z"/></svg>',
  dol: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5 3 7h10z"/></svg>',
  szukaj: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>',
  zewn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 4 12"/></svg>',
  zamknij: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>',
};

const CSS = `
:root{--bg:#fff;--ground:#f5f6f8;--elev:#f7f8fa;--elev-2:#eef1f5;--text:#0b0d10;--muted:#565d68;--faint:#6b717c;
  --line:rgba(11,13,16,.10);--line-2:rgba(11,13,16,.06);--accent:#2f6fe0;--accent-ink:#2456b0;--accent-soft:rgba(47,111,224,.10);
  --down:#b4321f;--down-soft:rgba(180,50,31,.09);
  --sans:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--mono:"Azeret Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --ease:cubic-bezier(.22,1,.36,1)}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scrollbar-color:#c5cad3 transparent;scrollbar-width:thin}
body{background:var(--ground);color:var(--text);font:15px/1.55 var(--sans);letter-spacing:-.011em;-webkit-font-smoothing:antialiased}
::selection{background:var(--accent-soft);color:var(--text)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
button,input{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0}
svg{flex:none}
/* word-spacing zweza twarda spacje grupujaca tysiace: w kroju o stalej szerokosci ma pelna
   komorke i "1 463" czytaloby sie jak dwie liczby (U+202F nie pomaga, tez dostaje komorke) */
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.02em;word-spacing:-.4em}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ---- belka ---- */
.top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.4) blur(10px);
  border-bottom:1px solid var(--line-2)}
.top-in{max-width:1360px;margin:0 auto;padding:12px clamp(16px,3vw,32px);display:flex;align-items:center;gap:14px}
.logo{display:flex;align-items:center;gap:8px;flex-shrink:0}
.logo img{display:block;height:22px;width:auto}
.logo .word{height:17px}
.top-sep{width:1px;height:20px;background:var(--line)}
.top-name{font-size:14px;font-weight:550}
.kr{display:none}
.demo{white-space:nowrap;font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);
  background:var(--accent-soft);border-radius:999px;padding:3px 9px}
.top-sp{flex:1}
.seg{display:flex;padding:3px;background:var(--elev-2);border-radius:10px;gap:2px}
.seg button{white-space:nowrap;font-size:13px;font-weight:500;color:var(--muted);padding:6px 12px;border-radius:7px;transition:color .2s,background-color .2s,box-shadow .2s}
.seg button:hover{color:var(--text)}
.seg button[aria-pressed="true"]{background:#fff;color:var(--text);box-shadow:0 1px 2px rgba(11,13,16,.08),0 0 0 1px rgba(11,13,16,.05)}

.wrap{max-width:1360px;margin:0 auto;padding:28px clamp(16px,3vw,32px) 64px}

/* ---- podsumowanie ---- */
.sum{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:22px}
.sum h1{font-size:clamp(1.5rem,2.4vw,1.9rem);font-weight:600;letter-spacing:-.03em;line-height:1.15}
.sum p{margin-top:8px;color:var(--muted);max-width:66ch}
.sum p b{color:var(--text);font-weight:600}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--muted);background:#fff;border:1px solid var(--line);
  border-radius:999px;padding:6px 12px;transition:border-color .2s,color .2s,background-color .2s}
.chip:hover{color:var(--text);border-color:rgba(11,13,16,.2)}
.chip[aria-pressed="true"]{color:var(--text);border-color:var(--text)}
.chip .num{font-size:12px;color:var(--text)}
.chip i{width:7px;height:7px;border-radius:50%;background:var(--faint)}
.chip i.up{background:var(--accent)} .chip i.dn{background:var(--down)}

/* ---- co sie zmienilo: jeden pasek, nie trzy karty ---- */
.ch{background:#fff;border:1px solid var(--line-2);border-radius:14px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:22px}
.ch h2{grid-column:1/-1;font-size:13px;font-weight:600;padding:14px 18px 0}
.ch-i{text-align:left;padding:10px 18px 16px;border-radius:0;display:grid;gap:3px;transition:background-color .2s}
.ch-i+.ch-i{border-left:1px solid var(--line-2)}
.ch-i:hover{background:var(--elev)}
.ch-n{font-size:13px;color:var(--muted)}
.ch-v{display:flex;align-items:baseline;gap:8px;font-size:22px;font-weight:500}
.ch-v small{font-size:12.5px;color:var(--faint);font-family:var(--sans);letter-spacing:-.01em}
.ch-r{font-size:12.5px;color:var(--muted)}
.ch-empty{grid-column:1/-1;padding:10px 18px 16px;color:var(--muted);font-size:14px}
.up{color:var(--accent-ink)} .dn{color:var(--down)} .flat{color:var(--faint)}

/* ---- uklad: ranking | szczegoly ---- */
.grid{display:grid;grid-template-columns:minmax(0,1.32fr) minmax(0,1fr);gap:18px;align-items:start}
.lewa{display:grid;gap:14px;min-width:0}
.lewa .note{margin-top:0;padding:0 4px}
.box{background:#fff;border:1px solid var(--line-2);border-radius:14px}
.rk-h{display:flex;align-items:center;gap:12px;padding:12px 14px 12px 18px;border-bottom:1px solid var(--line-2)}
.rk-h h2{font-size:13px;font-weight:600;flex:1}
.find{display:flex;align-items:center;gap:7px;background:var(--elev);border:1px solid var(--line-2);border-radius:9px;padding:0 10px;width:min(220px,100%)}
.find svg{width:15px;height:15px;stroke:var(--faint);fill:none;stroke-width:1.8;stroke-linecap:round}
.find input{border:0;background:none;outline:none;padding:7px 0;font-size:13.5px;width:100%}
.find:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}

.rk-scroll{overflow-x:auto;overscroll-behavior-x:contain}
table{width:100%;border-collapse:collapse}
th{font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);
  text-align:left;padding:10px 10px;white-space:nowrap}
th:first-child,td:first-child{padding-left:18px} th:last-child,td:last-child{padding-right:18px}
th.r,td.r{text-align:right}
th button{font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;display:inline-flex;align-items:center;gap:4px}
th button:hover{color:var(--text)}
th[aria-sort] button{color:var(--text)}
th button svg{width:9px;height:9px;fill:currentColor;opacity:0}
th[aria-sort] button svg{opacity:1}
th[aria-sort="ascending"] button svg{transform:rotate(180deg)}
td{padding:11px 10px;border-top:1px solid var(--line-2);vertical-align:middle;font-size:14px}
tbody tr{cursor:pointer;transition:background-color .15s}
tbody tr:hover{background:var(--elev)}
tbody tr[aria-selected="true"]{background:var(--accent-soft)}
tbody tr:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.cl b{display:block;font-weight:550;line-height:1.3}
.cl span{display:block;font-family:var(--mono);font-size:11px;color:var(--faint);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:26ch}
.delta{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;font-size:13.5px}
.delta svg{width:9px;height:9px;fill:currentColor}
.src{color:var(--muted);font-size:13px;white-space:nowrap}
.src .num{font-size:12px;color:var(--faint);margin-left:4px}
.empty{padding:28px 18px;color:var(--muted);font-size:14px}
.legend{display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;padding:10px 18px 12px;border-top:1px solid var(--line-2);font-size:12px;color:var(--faint)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(11,13,16,.08);margin-right:-6px}
.legend i.u2{background:rgba(47,111,224,.75)} .legend i.d2{background:rgba(180,50,31,.62)}
.legend b{display:inline-block;width:14px;height:2px;border-radius:1px;background:var(--accent);margin-right:-6px}

/* pasek 12 tygodni: kolor = zmiana tydzien do tygodnia */
.weeks{display:grid;grid-template-columns:repeat(12,10px);grid-template-rows:minmax(0,1fr) 2px;gap:2px;height:25px}
.weeks i{grid-row:1;border-radius:2px;background:rgba(11,13,16,.08)}
.weeks b{grid-row:2;border-radius:1px;background:var(--accent)}
.weeks i.u1{background:rgba(47,111,224,.35)} .weeks i.u2{background:rgba(47,111,224,.75)}
.weeks i.d1{background:rgba(180,50,31,.28)} .weeks i.d2{background:rgba(180,50,31,.62)}

/* ---- szczegoly ---- */
.det{position:sticky;top:76px}
.det-h{display:flex;align-items:flex-start;gap:10px;padding:16px 18px 14px;border-bottom:1px solid var(--line-2)}
.det-h div{flex:1;min-width:0}
.det-h h2{font-size:18px;font-weight:600;letter-spacing:-.02em;line-height:1.25}
.det-h a{display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:11.5px;color:var(--faint);text-decoration:none;margin-top:2px}
.det-h a:hover{color:var(--accent-ink)}
.det-h a svg,.close svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.close{display:none;width:34px;height:34px;border-radius:9px;align-items:center;justify-content:center;color:var(--muted);background:var(--elev)}
.close svg{width:16px;height:16px}
.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid var(--line-2)}
.kpi{padding:13px 0 13px 18px}
.kpi+.kpi{border-left:1px solid var(--line-2);padding-left:14px}
.kpi dt{font-size:12px;color:var(--faint);white-space:nowrap}
.kpi dd{font-size:18px;font-weight:500;margin-top:2px;white-space:nowrap}
.kpi .delta{font-size:12px;margin-top:2px}
.sec{padding:14px 18px 16px}
.sec+.sec{border-top:1px solid var(--line-2)}
.sec h3{font-size:12.5px;font-weight:600;margin-bottom:10px;display:flex;justify-content:space-between;align-items:baseline;gap:4px 10px;flex-wrap:wrap}
.sec h3 span{font-size:12px;font-weight:400;color:var(--faint)}
.chart{position:relative}
.chart svg{display:block;width:100%;height:auto;overflow:visible}
.c-grid{stroke:var(--line-2);stroke-width:1}
.c-band{fill:var(--accent-soft)}
.c-area{fill:url(#pl-fill)}
.c-line{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.c-axis{font-family:var(--mono);font-size:10px;fill:var(--faint);word-spacing:-.4em}
.c-cross{stroke:var(--text);stroke-width:1;stroke-dasharray:2 3;opacity:0}
.c-dot{fill:#fff;stroke:var(--accent);stroke-width:2;opacity:0}
.chart.hov .c-cross,.chart.hov .c-dot{opacity:1}
.tip{position:absolute;top:0;pointer-events:none;background:var(--text);color:#fff;font-size:12px;line-height:1.35;padding:6px 9px;border-radius:7px;
  white-space:nowrap;opacity:0;transform:translate(-50%,-110%);transition:opacity .12s}
.tip b{font-family:var(--mono);font-weight:500;word-spacing:-.4em}
.chart.hov .tip{opacity:1}
.bars{display:grid;gap:6px}
.bar{display:grid;grid-template-columns:118px minmax(0,1fr) 48px 52px;align-items:center;gap:10px;font-size:13px}
.bar span:first-child{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar .trk{height:6px;border-radius:3px;background:var(--elev-2);overflow:hidden}
.bar .trk i{display:block;height:100%;border-radius:3px;background:var(--accent)}
.bar .num{text-align:right;font-size:12px}
.pages{list-style:none;display:grid}
.pages li{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:13px;border-top:1px solid var(--line-2)}
.pages li:first-child{border-top:0}
.pages li span:first-child{font-family:var(--mono);font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.note{margin-top:18px;font-size:12.5px;color:var(--faint);max-width:80ch}

/* wejscie szczegolow: jedyny autorski ruch na stronie */
.det-body{animation:pl-in .38s var(--ease)}
@keyframes pl-in{from{opacity:.4;transform:translateY(4px)}to{opacity:1;transform:none}}
.c-line.draw{animation:pl-draw .7s var(--ease)}
@keyframes pl-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}

@media(max-width:1080px){.kpis{grid-template-columns:repeat(3,minmax(0,1fr))}.kpi:nth-child(4){border-left:0;padding-left:18px}
  .kpi:nth-child(n+4){border-top:1px solid var(--line-2)}}
@media(max-width:900px){
  .grid{grid-template-columns:minmax(0,1fr)}
  .det{position:fixed;inset:0;z-index:40;border-radius:0;border:0;overflow-y:auto;transform:translateY(100%);visibility:hidden;
    transition:transform .32s var(--ease),visibility 0s .32s}
  .det.open{transform:none;visibility:visible;transition:transform .32s var(--ease)}
  .close{display:inline-flex}
  .ch{grid-template-columns:minmax(0,1fr)}.ch-i+.ch-i{border-left:0;border-top:1px solid var(--line-2)}
  .top-name,.top-sep{display:none}
}
@media(max-width:640px){
  .col-src,.col-ses{display:none}
  .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .kpis .kpi{border-left:0;padding-left:18px;border-top:1px solid var(--line-2)}
  .kpis .kpi:first-child{grid-column:1/-1;border-top:0}
  .kpis .kpi:nth-child(odd):not(:first-child){border-left:1px solid var(--line-2);padding-left:14px}
  .kr{display:inline}.dl{display:none}
  .top-in{gap:6px}
  .seg button{padding:6px 7px}
  .demo{padding:3px 7px}
  th,td{padding-left:6px;padding-right:6px}
  th{letter-spacing:.02em}
  th:first-child,td:first-child{padding-left:14px}
  th:nth-last-child(2),td:nth-last-child(2){padding-right:14px}
  .rk-h{padding-left:14px}
  .weeks{grid-template-columns:repeat(12,5px);column-gap:1px}
  .seg button{padding:6px 9px;font-size:12.5px}
  .bar{grid-template-columns:96px minmax(0,1fr) 44px 46px}
  .gen{display:none}
}
/* najwezsze telefony (320 px): sam znak marki, bez napisu — logo nigdy nie jest sciskane */
@media(max-width:340px){.logo .word{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

/* Logika po stronie przeglądarki. Dane: window.__PANEL__ = { klienci, zrodla, demo }. */
const SKRYPT = `
(function(){
var D=window.__PANEL__, K=D.klienci, Z=D.zrodla, IK=${JSON.stringify(IKONY)};
var S={okres:1,wybrany:null,sort:{k:"zmiana",kier:-1},filtr:"wszyscy",szukaj:""};
var nf=new Intl.NumberFormat("pl-PL",{useGrouping:"always"});
var MIES=["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
function $(s){return document.querySelector(s)}
function e(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function n(v){return nf.format(Math.round(v))}
function ses(v){v=Math.abs(Math.round(v));var j=v%10,d=v%100;return v===1?"sesja":j>=2&&j<=4&&(d<12||d>14)?"sesje":"sesji"}
function suma(o){var s=0;for(var k in o)s+=o[k];return s}
function tydz(iso){var a=new Date(iso+"T00:00:00Z"),b=new Date(a);b.setUTCDate(b.getUTCDate()+6);
  return a.getUTCMonth()===b.getUTCMonth()?a.getUTCDate()+"–"+b.getUTCDate()+" "+MIES[b.getUTCMonth()]
    :a.getUTCDate()+" "+MIES[a.getUTCMonth()]+" – "+b.getUTCDate()+" "+MIES[b.getUTCMonth()]}
function dzien(iso){var a=new Date(iso+"T00:00:00Z");return a.getUTCDate()+" "+MIES[a.getUTCMonth()]}
function zakres(t){return S.okres===1?"tydzień "+tydz(t[t.length-1].start):"ostatnie "+S.okres+" tyg."}

/* okres biezacy vs poprzedni o tej samej dlugosci */
function agg(k){
  var t=k.tygodnie,L=t.length,o=S.okres;
  function pak(od,do_){var src={},cz=0,za=0,ile=0;Z.forEach(function(z){src[z]=0});
    for(var i=od;i<do_;i++){Z.forEach(function(z){src[z]+=t[i].src[z]});cz+=t[i].czas;za+=t[i].zaang;ile++}
    var s=suma(src);return{sesje:s,src:src,uzyt:s*k.ratio,ods:s*k.pps,czas:cz/ile,zaang:za/ile}}
  var cur=pak(L-o,L),prev=pak(L-2*o,L-o),d=cur.sesje-prev.sesje;
  var prog=Math.max(8,prev.sesje*.06);
  return{k:k,cur:cur,prev:prev,zmiana:d,kier:d>=prog?"up":d<=-prog?"dn":"flat"};
}
/* powod zmiany: zrodla, ktore przesunely sie najbardziej w kierunku zmiany */
function powod(a){
  var r=Z.map(function(z){return{z:z,d:a.cur.src[z]-a.prev.src[z]}})
    .filter(function(x){return a.zmiana>=0?x.d>0:x.d<0})
    .sort(function(x,y){return Math.abs(y.d)-Math.abs(x.d)}).slice(0,2)
    .filter(function(x){return Math.abs(x.d)>=3});
  return r.length?r.map(function(x){return x.z+" "+znak(x.d)}).join(" · "):"bez jednego wyraźnego źródła";
}
function znak(v){return (v>0?"+":v<0?"−":"±")+n(Math.abs(v))}
/* procent tylko przy duzych liczbach: +2 z 1 to nie jest "+200%" */
function pct(a){return a.prev.sesje>=100&&a.zmiana!==0?" ("+(a.zmiana>0?"+":"−")+Math.round(Math.abs(a.zmiana)/a.prev.sesje*100)+"%)":""}
function delta(v,kier,txt){var ik=kier==="up"?IK.gora:kier==="dn"?IK.dol:"";
  return '<span class="delta '+kier+'">'+ik+'<span class="num">'+(txt||znak(v))+'</span></span>'}
function glowne(a){var best=null;Z.forEach(function(z){if(!best||a.cur.src[z]>a.cur.src[best])best=z});
  return{z:best,p:a.cur.sesje?Math.round(a.cur.src[best]/a.cur.sesje*100):0}}

function wszystkie(){return K.map(agg)}

function rysujSumy(A){
  var cur=0,prev=0,u=0,dn=0,fl=0,t=K[0].tygodnie;
  A.forEach(function(a){cur+=a.cur.sesje;prev+=a.prev.sesje;a.kier==="up"?u++:a.kier==="dn"?dn++:fl++});
  var d=cur-prev,okr=S.okres===1?"W tygodniu "+tydz(t[t.length-1].start):"W ostatnich "+S.okres+" tygodniach";
  var por=S.okres===1?"tydzień wcześniej":"w poprzednich "+S.okres+" tygodniach";
  $("#sum-p").innerHTML=okr+" strony klientów miały <b class=\\"num\\">"+n(cur)+"</b> "+ses(cur)+" — "
    +(d===0?"tyle samo co ":"<b class=\\"num\\">"+n(Math.abs(d))+"</b> "+(d>0?"więcej niż ":"mniej niż "))+por+".";
  $("#c-all").textContent=K.length;$("#c-up").textContent=u;$("#c-dn").textContent=dn;$("#c-fl").textContent=fl;
}

function rysujZmiany(A){
  var top=A.filter(function(a){return a.kier!=="flat"}).sort(function(x,y){return Math.abs(y.zmiana)-Math.abs(x.zmiana)}).slice(0,3);
  var h='<h2>Co się zmieniło · '+e(zakres(K[0].tygodnie))+'</h2>';
  if(!top.length)h+='<p class="ch-empty">U żadnego klienta nie było istotnej zmiany w tym okresie.</p>';
  top.forEach(function(a){
    h+='<button class="ch-i" data-id="'+a.k.id+'"><span class="ch-n">'+e(a.k.nazwa)+'</span>'
      +'<span class="ch-v '+a.kier+'"><span class="num">'+znak(a.zmiana)+'</span><small>'+ses(a.zmiana)+pct(a)+'</small></span>'
      +'<span class="ch-r">'+e(powod(a))+'</span></button>';
  });
  $("#ch").innerHTML=h;
}

function pasek(k){
  var t=k.tygodnie,L=t.length,h="";
  for(var i=L-12;i<L;i++){
    var v=suma(t[i].src),p=suma(t[i-1].src),r=p?(v-p)/p:0;
    var c=r>.15?"u2":r>.06?"u1":r<-.15?"d2":r<-.06?"d1":"";
    h+='<i class="'+c+'" data-tip="'+e(tydz(t[i].start))+'|'+n(v)+'|'+znak(v-p)+'"></i>';
  }
  /* jedna kreska pod komorkami wybranego okresu */
  return '<span class="weeks" aria-hidden="true">'+h+'<b style="grid-column:'+(13-S.okres)+'/13"></b></span>';
}

function rysujRanking(A){
  var q=S.szukaj.trim().toLowerCase();
  var L=A.filter(function(a){
    if(S.filtr==="up"&&a.kier!=="up")return false;
    if(S.filtr==="dn"&&a.kier!=="dn")return false;
    if(S.filtr==="flat"&&a.kier!=="flat")return false;
    return !q||a.k.nazwa.toLowerCase().indexOf(q)>-1||a.k.domena.indexOf(q)>-1;
  });
  var s=S.sort;
  L.sort(function(x,y){
    if(s.k==="nazwa")return s.kier*x.k.nazwa.localeCompare(y.k.nazwa,"pl");
    var vx=s.k==="sesje"?x.cur.sesje:x.zmiana,vy=s.k==="sesje"?y.cur.sesje:y.zmiana;
    return s.kier*(vx-vy);
  });
  document.querySelectorAll("th[data-k]").forEach(function(th){
    if(th.dataset.k===s.k)th.setAttribute("aria-sort",s.kier>0?"ascending":"descending");else th.removeAttribute("aria-sort");
  });
  var h="";
  L.forEach(function(a){
    var g=glowne(a);
    h+='<tr tabindex="0" data-id="'+a.k.id+'" aria-selected="'+(a.k.id===S.wybrany)+'">'
      +'<td class="cl"><b>'+e(a.k.nazwa)+'</b><span>'+e(a.k.domena)+'</span></td>'
      +'<td class="r num col-ses">'+n(a.cur.sesje)+'</td>'
      +'<td class="r">'+delta(a.zmiana,a.kier)+'</td>'
      +'<td>'+pasek(a.k)+'</td>'
      +'<td class="src col-src">'+e(g.z)+'<span class="num">'+g.p+'%</span></td></tr>';
  });
  $("#rk-b").innerHTML=h;
  $("#rk-empty").hidden=L.length>0;
  $("#rk-t").hidden=!L.length;
}

function wykres(a){
  var t=a.k.tygodnie.slice(-12),W=600,H=170,P={l:36,r:8,t:12,b:22};
  var v=t.map(function(w){return suma(w.src)}),max=Math.max.apply(null,v),min=Math.min.apply(null,v);
  var top=Math.ceil(max*1.12/50)*50,bot=Math.max(0,Math.floor(min*.7/50)*50);
  var x=function(i){return P.l+i*(W-P.l-P.r)/(t.length-1)},y=function(z){return P.t+(1-(z-bot)/(top-bot))*(H-P.t-P.b)};
  var d=v.map(function(z,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(z).toFixed(1)}).join(" ");
  var g="",ty=[bot,(bot+top)/2,top];
  ty.forEach(function(z){g+='<line class="c-grid" x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+y(z)+'" y2="'+y(z)+'"/>'
    +'<text class="c-axis" x="'+(P.l-6)+'" y="'+(y(z)+3)+'" text-anchor="end">'+n(z)+'</text>'});
  var b0=x(t.length-S.okres)-(S.okres===1?14:(W-P.l-P.r)/(t.length-1)/2);
  var lab="";[0,4,8,11].forEach(function(i){lab+='<text class="c-axis" x="'+x(i)+'" y="'+(H-4)+'" text-anchor="'+(i===11?"end":i===0?"start":"middle")+'">'+e(dzien(t[i].start))+'</text>'});
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Sesje tygodniowo, ostatnie 12 tygodni: od '+n(v[0])+' do '+n(v[v.length-1])+'">'
    +'<defs><linearGradient id="pl-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fe0" stop-opacity=".16"/><stop offset="1" stop-color="#2f6fe0" stop-opacity="0"/></linearGradient></defs>'
    +'<rect class="c-band" x="'+Math.max(P.l,b0)+'" y="'+P.t+'" width="'+(W-P.r-Math.max(P.l,b0))+'" height="'+(H-P.t-P.b)+'" rx="4"/>'
    +g+'<path class="c-area" d="'+d+' L'+x(t.length-1)+' '+y(bot)+' L'+x(0)+' '+y(bot)+'Z"/>'
    +'<path class="c-line draw" d="'+d+'"/>'
    +'<line class="c-cross" y1="'+P.t+'" y2="'+(H-P.b)+'"/><circle class="c-dot" r="4"/>'
    +'<rect class="c-hit" x="'+P.l+'" y="0" width="'+(W-P.l-P.r)+'" height="'+H+'" fill="transparent"/>'
    +lab+'</svg><div class="tip"></div>';
}

function rysujSzczegoly(){
  var k=K.filter(function(x){return x.id===S.wybrany})[0];if(!k)return;
  var a=agg(k),pr=S.okres===1?"vs poprz. tydzień":"vs poprz. "+S.okres+" tyg.";
  function zn(v){return v>0?"+":v<0?"−":"±"}
  /* zmiana mniejsza niz 2% poprzedniej wartosci = bez zmian */
  function kp(lbl,cur,prev,fmt,txt){var d=cur-prev,kr=Math.abs(d)<Math.abs(prev)*.02?"flat":d>0?"up":"dn";
    return '<div class="kpi"><dt>'+lbl+'</dt><dd class="num">'+fmt(cur)+'</dd><dd>'+delta(d,kr,txt&&txt(d))+'</dd></div>'}
  var czas=function(s){s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
  var srt=Z.map(function(z){return{z:z,v:a.cur.src[z],d:a.cur.src[z]-a.prev.src[z]}}).sort(function(x,y){return y.v-x.v});
  var mx=srt[0].v||1,bars="";
  srt.forEach(function(s){bars+='<div class="bar"><span>'+e(s.z)+'</span><span class="trk"><i style="width:'+(s.v/mx*100).toFixed(1)+'%"></i></span>'
    +'<span class="num">'+n(s.v)+'</span><span class="num '+(s.d>2?"up":s.d<-2?"dn":"flat")+'">'+znak(s.d)+'</span></div>'});
  var pg="";k.strony.forEach(function(p){pg+='<li><span>'+e(p[0])+'</span><span class="num">'+n(a.cur.ods*p[1]/k.pps)+'</span></li>'});
  $("#det").innerHTML='<div class="det-h"><div><h2 id="det-t">'+e(k.nazwa)+'</h2>'
    +'<a href="https://'+e(k.domena)+'" target="_blank" rel="noopener">'+e(k.domena)+IK.zewn+'</a></div>'
    +'<button class="close" id="det-x" aria-label="Wróć do listy klientów">'+IK.zamknij+'</button></div>'
    +'<div class="det-body"><dl class="kpis">'
      +kp("Sesje",a.cur.sesje,a.prev.sesje,n)+kp("Użytkownicy",a.cur.uzyt,a.prev.uzyt,n)+kp("Odsłony",a.cur.ods,a.prev.ods,n)
      +kp("Śr. czas",a.cur.czas,a.prev.czas,czas,function(d){return zn(d)+Math.abs(Math.round(d))+" s"})
      +kp("Zaangażowanie",a.cur.zaang,a.prev.zaang,function(z){return Math.round(z*100)+"%"},function(d){return zn(d)+Math.abs(Math.round(d*100))+" pp"})
    +'</dl>'
    +'<div class="sec"><h3>Sesje tygodniowo<span>12 tyg. · zaznaczony okres</span></h3><div class="chart" id="chart">'+wykres(a)+'</div></div>'
    +'<div class="sec"><h3>Źródła ruchu<span>'+e(pr)+'</span></h3><div class="bars">'+bars+'</div></div>'
    +'<div class="sec"><h3>Najczęściej odwiedzane<span>sesje</span></h3><ul class="pages">'+pg+'</ul></div></div>';
  var ln=$("#det .c-line");if(ln){var len=ln.getTotalLength();ln.style.strokeDasharray=len;ln.style.setProperty("--len",len)}
  podpinWykres(a);
  $("#det-x").onclick=function(){$("#det").classList.remove("open");var r=document.querySelector('tr[data-id="'+S.wybrany+'"]');if(r)r.focus()};
}

function podpinWykres(a){
  var c=$("#chart"),svg=c.querySelector("svg"),hit=c.querySelector(".c-hit"),tip=c.querySelector(".tip");
  var t=a.k.tygodnie.slice(-12),P={l:36,r:8},W=600;
  var pts=Array.prototype.map.call(svg.querySelector(".c-line").getAttribute("d").split(/[ML]/).filter(Boolean),function(s){var q=s.trim().split(" ");return[+q[0],+q[1]]});
  hit.addEventListener("pointermove",function(ev){
    var b=svg.getBoundingClientRect(),sx=(ev.clientX-b.left)/b.width*W;
    var i=Math.max(0,Math.min(t.length-1,Math.round((sx-P.l)/((W-P.l-P.r)/(t.length-1)))));
    var p=pts[i],cr=svg.querySelector(".c-cross"),dt=svg.querySelector(".c-dot");
    cr.setAttribute("x1",p[0]);cr.setAttribute("x2",p[0]);dt.setAttribute("cx",p[0]);dt.setAttribute("cy",p[1]);
    var v=suma(t[i].src),pv=i?suma(t[i-1].src):v;
    tip.innerHTML=e(tydz(t[i].start))+' · <b>'+n(v)+'</b> '+ses(v)+(i?' <b>'+znak(v-pv)+'</b>':'');
    var f=p[0]/W;tip.style.left=(f*100)+"%";
    /* przy krawedziach dymek przesuwa sie do srodka, zeby nie wyjechal poza wykres */
    tip.style.transform="translate("+(f<.2?"-12%":f>.8?"-88%":"-50%")+",-110%)";tip.style.top=(p[1]/170*b.height)+"px";
    c.classList.add("hov");
  });
  hit.addEventListener("pointerleave",function(){c.classList.remove("hov")});
}

/* dymek nad komorkami paska tygodni */
var dym=document.createElement("div");dym.className="tip";dym.style.position="fixed";document.body.appendChild(dym);
document.addEventListener("pointerover",function(ev){
  var i=ev.target.closest&&ev.target.closest(".weeks i");if(!i){dym.style.opacity=0;return}
  var p=i.dataset.tip.split("|"),b=i.getBoundingClientRect();
  dym.innerHTML=e(p[0])+' · <b>'+p[1]+'</b> <b>'+p[2]+'</b>';dym.style.left=(b.left+b.width/2)+"px";dym.style.top=(b.top-4)+"px";dym.style.opacity=1;
});

function wybierz(id,otworz){
  S.wybrany=id;
  document.querySelectorAll("#rk-b tr").forEach(function(r){r.setAttribute("aria-selected",r.dataset.id===id)});
  rysujSzczegoly();
  if(otworz&&matchMedia("(max-width:900px)").matches){$("#det").classList.add("open");var x=$("#det-x");if(x)x.focus()}
}

function wszystko(){var A=wszystkie();rysujSumy(A);rysujZmiany(A);rysujRanking(A);rysujSzczegoly()}

/* zdarzenia */
document.querySelectorAll(".seg button").forEach(function(b){b.onclick=function(){
  S.okres=+b.dataset.o;document.querySelectorAll(".seg button").forEach(function(x){x.setAttribute("aria-pressed",x===b)});wszystko()}});
document.querySelectorAll(".chip").forEach(function(b){b.onclick=function(){
  S.filtr=b.dataset.f;document.querySelectorAll(".chip").forEach(function(x){x.setAttribute("aria-pressed",x===b)});rysujRanking(wszystkie())}});
document.querySelectorAll("th[data-k] button").forEach(function(b){b.onclick=function(){
  var k=b.parentNode.dataset.k;S.sort=S.sort.k===k?{k:k,kier:-S.sort.kier}:{k:k,kier:k==="nazwa"?1:-1};rysujRanking(wszystkie())}});
$("#q").oninput=function(){S.szukaj=this.value;rysujRanking(wszystkie())};
$("#rk-b").addEventListener("click",function(ev){var r=ev.target.closest("tr");if(r)wybierz(r.dataset.id,true)});
$("#rk-b").addEventListener("keydown",function(ev){
  var r=ev.target.closest("tr");if(!r)return;
  if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();wybierz(r.dataset.id,true)}
  if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ev.preventDefault();var s=ev.key==="ArrowDown"?r.nextElementSibling:r.previousElementSibling;if(s){s.focus();wybierz(s.dataset.id,false)}}
});
$("#ch").addEventListener("click",function(ev){var b=ev.target.closest(".ch-i");if(b)wybierz(b.dataset.id,true)});
document.addEventListener("keydown",function(ev){if(ev.key==="Escape"&&$("#det").classList.contains("open"))$("#det-x").click()});

/* start: zaznacz klienta z najwieksza zmiana */
var A0=wszystkie().sort(function(x,y){return Math.abs(y.zmiana)-Math.abs(x.zmiana)});
S.wybrany=A0[0].k.id;wszystko();
})();
`;

/**
 * @param {{klienci:Array, zrodla:string[], demo:boolean, generatedAt:Date}} p
 */
export function renderInternal({ klienci, zrodla, demo, generatedAt }) {
  const stamp = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw" }).format(generatedAt);
  /* JSON w <script>: zamykamy "</" zeby tresc nie zakonczyla znacznika */
  const dane = JSON.stringify({ klienci, zrodla, demo }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Panel · ruch u klientów · skaluj.ai</title>
<link rel="icon" type="image/png" href="https://skaluj.ai/sygnet.png">
<link rel="stylesheet" href="https://skaluj.ai/fonts.css">
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="top-in">
  <a class="logo" href="https://skaluj.ai" aria-label="skaluj.ai">
    <img src="https://skaluj.ai/sygnet.png" alt="" width="140" height="170">
    <img class="word" src="https://skaluj.ai/samo%20skaluj.png" alt="skaluj.ai" width="478" height="112">
  </a>
  <span class="top-sep" aria-hidden="true"></span>
  <span class="top-name">Panel wewnętrzny</span>
  ${demo ? '<span class="demo" title="Dane demo: fikcyjne firmy i liczby — do podłączenia GA4"><span class="dl">Dane demo</span><span class="kr">Demo</span></span>' : ""}
  <span class="top-sp"></span>
  <div class="seg" role="group" aria-label="Okres">
    <button data-o="1" aria-pressed="true" aria-label="Tydzień"><span class="dl">Tydzień</span><span class="kr" aria-hidden="true">1 tyg.</span></button>
    <button data-o="4" aria-pressed="false" aria-label="4 tygodnie"><span class="dl">4 tygodnie</span><span class="kr" aria-hidden="true">4 tyg.</span></button>
    <button data-o="12" aria-pressed="false" aria-label="12 tygodni"><span class="dl">12 tygodni</span><span class="kr" aria-hidden="true">12 tyg.</span></button>
  </div>
</div></header>

<main class="wrap">
  <section class="sum">
    <div>
      <h1>Ruch u klientów</h1>
      <p id="sum-p"></p>
    </div>
    <div class="chips" role="group" aria-label="Pokaż klientów">
      <button class="chip" data-f="wszyscy" aria-pressed="true">Wszyscy <span class="num" id="c-all"></span></button>
      <button class="chip" data-f="up" aria-pressed="false"><i class="up"></i>Rosną <span class="num" id="c-up"></span></button>
      <button class="chip" data-f="dn" aria-pressed="false"><i class="dn"></i>Spadają <span class="num" id="c-dn"></span></button>
      <button class="chip" data-f="flat" aria-pressed="false"><i></i>Bez zmian <span class="num" id="c-fl"></span></button>
    </div>
  </section>

  <section class="ch" id="ch" aria-live="polite"></section>

  <div class="grid">
    <div class="lewa"><section class="box" aria-labelledby="rk-title">
      <div class="rk-h">
        <h2 id="rk-title">Klienci</h2>
        <label class="find">${IKONY.szukaj}<span class="sr">Szukaj klienta</span><input id="q" type="search" placeholder="Szukaj klienta" autocomplete="off"></label>
      </div>
      <div class="rk-scroll"><table id="rk-t">
        <thead><tr>
          <th scope="col" data-k="nazwa"><button>Klient ${IKONY.dol}</button></th>
          <th scope="col" class="r col-ses" data-k="sesje"><button>Sesje ${IKONY.dol}</button></th>
          <th scope="col" class="r" data-k="zmiana"><button>Zmiana ${IKONY.dol}</button></th>
          <th scope="col">12 tygodni</th>
          <th scope="col" class="col-src">Główne źródło</th>
        </tr></thead>
        <tbody id="rk-b"></tbody>
      </table></div>
      <p class="empty" id="rk-empty" hidden>Żaden klient nie pasuje do wyszukiwania ani filtra.</p>
      <p class="legend" aria-hidden="true"><i class="u2"></i>wzrost <i class="d2"></i>spadek <i></i>bez zmian <b></b>wybrany okres</p>
    </section>
    <p class="note">${demo ? "Dane demonstracyjne na fikcyjnych firmach — po podłączeniu Google Analytics pojawią się tu prawdziwe liczby klientów. " : ""}Zmiana to różnica sesji względem poprzedniego okresu tej samej długości; procent tylko przy co najmniej 100 sesjach. <span class="gen">Wygenerowano: ${esc(stamp)}.</span></p></div>
    <aside class="box det" id="det" aria-labelledby="det-t" aria-live="polite"></aside>
  </div>

</main>
<script>window.__PANEL__=${dane};</script>
<script>${SKRYPT}</script>
</body>
</html>`;
}
