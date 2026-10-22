/**
 * skaluj.ai — panel wewnętrzny: DANE DEMO.
 *
 * Fikcyjne firmy, liczby wygenerowane deterministycznie (zawsze te same).
 * Nigdy nie udają wyników prawdziwych klientów — na ekranie są oznaczone.
 * Po podłączeniu GA4 zastąpi je pobieranie przez google.js; kształt danych
 * (tygodnie × źródła) jest ten sam, który da się złożyć z runReport.
 */

export const ZRODLA = ["Google", "Bezpośrednio", "Social media", "Asystenci AI", "Odesłania", "Płatne"];

/* udzialy: w kolejności ZRODLA. zdarzenia: od tygodnia `od` (0 = najstarszy z 24)
   źródło dostaje +plus sesji tygodniowo albo ×mnoz. */
const FIRMY = [
  { id: "nowak", nazwa: "Studio Kuchni Nowak", domena: "kuchnie-nowak.pl",
    baza: 210, trend: 0.012, sezon: 0.04, faza: 0, udzialy: [.48, .2, .07, .05, .12, .08],
    zdarzenia: [{ od: 21, zrodlo: "Google", plus: 31 }, { od: 22, zrodlo: "Asystenci AI", plus: 9 }],
    strony: [["/", .34], ["/kuchnie-na-wymiar", .27], ["/realizacje", .18], ["/blog/jak-zaplanowac-kuchnie", .13], ["/kontakt", .08]],
    ratio: .79, pps: 2.9, czas: 112, zaang: .64 },
  { id: "fizjo", nazwa: "Gabinet Fizjo Ruch", domena: "fizjoruch.pl",
    baza: 140, trend: 0.009, sezon: 0.03, faza: 1, udzialy: [.57, .22, .05, .04, .07, .05],
    zdarzenia: [{ od: 20, zrodlo: "Google", plus: 18 }],
    strony: [["/", .41], ["/cennik", .22], ["/rehabilitacja-kregoslupa", .17], ["/zespol", .11], ["/kontakt", .09]],
    ratio: .83, pps: 2.2, czas: 74, zaang: .58 },
  { id: "dab", nazwa: "Meble Dąb & Syn", domena: "meble-dab.pl",
    baza: 330, trend: 0.004, sezon: 0.05, faza: 2, udzialy: [.34, .14, .09, .02, .06, .35],
    zdarzenia: [{ od: 22, zrodlo: "Płatne", mnoz: 0.18 }],
    strony: [["/", .29], ["/stoly", .24], ["/sypialnie", .19], ["/promocje", .17], ["/kontakt", .11]],
    ratio: .77, pps: 3.4, czas: 138, zaang: .61 },
  { id: "lingwa", nazwa: "Szkoła Językowa Lingwa", domena: "lingwa.edu.pl",
    baza: 190, trend: 0.003, sezon: 0.16, faza: 3.6, udzialy: [.45, .26, .13, .03, .08, .05],
    zdarzenia: [],
    strony: [["/", .36], ["/kursy-angielskiego", .28], ["/zapisy", .16], ["/dla-firm", .12], ["/kontakt", .08]],
    ratio: .81, pps: 2.6, czas: 96, zaang: .62 },
  { id: "klos", nazwa: "Ceramika Kłos", domena: "ceramikaklos.pl",
    baza: 120, trend: 0.006, sezon: 0.05, faza: 4, udzialy: [.31, .19, .34, .03, .09, .04],
    zdarzenia: [{ od: 22, zrodlo: "Social media", plus: 44 }, { od: 23, zrodlo: "Social media", plus: 12 }],
    strony: [["/", .3], ["/sklep/kubki", .26], ["/sklep/talerze", .18], ["/warsztaty", .16], ["/o-nas", .1]],
    ratio: .76, pps: 3.8, czas: 151, zaang: .69 },
  { id: "bilans", nazwa: "Biuro Rachunkowe Bilans", domena: "bilans-biuro.pl",
    baza: 95, trend: 0.002, sezon: 0.03, faza: 5, udzialy: [.61, .24, .03, .04, .06, .02],
    zdarzenia: [],
    strony: [["/", .44], ["/uslugi", .23], ["/cennik", .17], ["/kontakt", .1], ["/blog/ksef-2026", .06]],
    ratio: .86, pps: 1.9, czas: 63, zaang: .55 },
  { id: "lipa", nazwa: "Pensjonat Pod Lipą", domena: "podlipa.pl",
    baza: 260, trend: -0.002, sezon: 0.22, faza: 0.4, udzialy: [.44, .21, .17, .02, .11, .05],
    zdarzenia: [{ od: 19, zrodlo: "Google", mnoz: 0.72 }],
    strony: [["/", .38], ["/pokoje", .26], ["/cennik", .16], ["/okolica", .12], ["/rezerwacja", .08]],
    ratio: .74, pps: 3.1, czas: 128, zaang: .66 },
];

/* mulberry32: deterministyczny szum, żeby demo nie skakało między odświeżeniami */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poniedziałek ostatniego pełnego tygodnia (pon–nd) przed `teraz`. */
function ostatniPoniedzialek(teraz) {
  const d = new Date(Date.UTC(teraz.getUTCFullYear(), teraz.getUTCMonth(), teraz.getUTCDate()));
  const dzien = (d.getUTCDay() + 6) % 7; /* 0 = poniedziałek */
  d.setUTCDate(d.getUTCDate() - dzien - 7);
  return d;
}

/** 24 tygodnie danych na firmę: sesje per źródło, czas i zaangażowanie. */
export function demoKlienci(teraz = new Date(), TYG = 24) {
  const ostatni = ostatniPoniedzialek(teraz);
  return FIRMY.map((f, fi) => {
    const r = rng(1009 * (fi + 1));
    const tygodnie = [];
    for (let w = 0; w < TYG; w++) {
      const start = new Date(ostatni);
      start.setUTCDate(start.getUTCDate() - 7 * (TYG - 1 - w));
      const suma = f.baza * (1 + f.trend * w) * (1 + f.sezon * Math.sin(w / 3.8 + f.faza)) * (0.94 + r() * 0.12);
      const src = {};
      ZRODLA.forEach((z, i) => {
        let v = suma * f.udzialy[i] * (0.9 + r() * 0.2);
        for (const e of f.zdarzenia) {
          if (e.zrodlo === z && w >= e.od) v = e.mnoz != null ? v * e.mnoz : v + e.plus;
        }
        src[z] = Math.max(0, Math.round(v));
      });
      tygodnie.push({
        start: start.toISOString().slice(0, 10),
        src,
        czas: Math.round(f.czas * (0.88 + r() * 0.24)),
        zaang: +(f.zaang * (0.93 + r() * 0.14)).toFixed(3),
      });
    }
    return { id: f.id, nazwa: f.nazwa, domena: f.domena, ratio: f.ratio, pps: f.pps, strony: f.strony, tygodnie };
  });
}
