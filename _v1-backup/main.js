/* ============================================================
   skaluj.ai — interakcje
   ============================================================ */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const fmt = new Intl.NumberFormat("pl-PL");

/* ---------- rok w stopce ---------- */
$("#year").textContent = new Date().getFullYear();

/* ---------- nawigacja: tło po scrollu ---------- */
const nav = $(".nav");
const onScrollNav = () => nav.classList.toggle("scrolled", scrollY > 24);
addEventListener("scroll", onScrollNav, { passive: true });
onScrollNav();

/* ---------- menu mobilne ---------- */
const burger = $(".burger");
burger.addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  burger.setAttribute("aria-expanded", open);
});
$$(".mobile-menu a").forEach(a =>
  a.addEventListener("click", () => document.body.classList.remove("menu-open"))
);

/* ---------- reveal przy scrollu ---------- */
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

$$(".reveal").forEach(el => revealIO.observe(el));

/* ---------- liczniki (data-count) ---------- */
function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const dur = 1500;
  const t0 = performance.now();

  function frame(t) {
    const p = Math.min((t - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + fmt.format(Math.round(target * eased)) + suffix;
    if (p < 1) requestAnimationFrame(frame);
  }

  if (prefersReduced) {
    el.textContent = prefix + fmt.format(target) + suffix;
  } else {
    requestAnimationFrame(frame);
  }
}

const countIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCount(e.target);
      countIO.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

$$("[data-count]").forEach(el => countIO.observe(el));

/* ---------- wykres: rysowanie po wejściu w widok ---------- */
const chart = $(".chart");
if (chart) {
  const chartIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        chart.classList.add("draw");
        chartIO.disconnect();
      }
    });
  }, { threshold: 0.4 });
  chartIO.observe(chart);
}

/* ---------- hero: delikatny tilt 3D ---------- */
const heroApp = $("#heroApp");
if (heroApp && finePointer && !prefersReduced) {
  const wrap = $(".hero-app-wrap");
  wrap.addEventListener("mousemove", e => {
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    heroApp.style.transform =
      `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
  });
  wrap.addEventListener("mouseleave", () => {
    heroApp.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

/* ---------- suwak przed / po ---------- */
const baFrame = $("#baFrame");
if (baFrame) {
  const handle = $(".ba-handle", baFrame);
  let pos = 65;
  let hinted = false;
  let hintRaf = null;

  function setPos(p, instant = false) {
    pos = Math.min(94, Math.max(6, p));
    if (instant) baFrame.style.transition = "none";
    baFrame.style.setProperty("--pos", pos + "%");
    handle.setAttribute("aria-valuenow", Math.round(pos));
  }

  function posFromEvent(e) {
    const r = baFrame.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100;
  }

  baFrame.addEventListener("pointerdown", e => {
    cancelHint();
    try { baFrame.setPointerCapture(e.pointerId); } catch (_) {}
    setPos(posFromEvent(e), true);

    const move = ev => setPos(posFromEvent(ev), true);
    const up = () => {
      baFrame.removeEventListener("pointermove", move);
      baFrame.removeEventListener("pointerup", up);
      baFrame.removeEventListener("pointercancel", up);
    };
    baFrame.addEventListener("pointermove", move);
    baFrame.addEventListener("pointerup", up);
    baFrame.addEventListener("pointercancel", up);
  });

  handle.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { setPos(pos - 4); e.preventDefault(); }
    if (e.key === "ArrowRight") { setPos(pos + 4); e.preventDefault(); }
  });

  /* podpowiedź: delikatne wahnięcie suwaka przy pierwszym pokazaniu */
  function cancelHint() {
    hinted = true;
    if (hintRaf) cancelAnimationFrame(hintRaf);
  }

  function playHint() {
    if (hinted || prefersReduced) return;
    hinted = true;
    const t0 = performance.now();
    const dur = 2000;
    function frame(t) {
      const p = Math.min((t - t0) / dur, 1);
      // 65 -> 42 -> 65, sinusoidalnie
      const offset = Math.sin(p * Math.PI) * 23;
      baFrame.style.setProperty("--pos", (65 - offset) + "%");
      if (p < 1) hintRaf = requestAnimationFrame(frame);
      else setPos(65);
    }
    hintRaf = requestAnimationFrame(frame);
  }

  const baIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(playHint, 700);
        baIO.disconnect();
      }
    });
  }, { threshold: 0.45 });
  baIO.observe(baFrame);
}

/* ---------- sekcja SKALA ---------- */
const skalaRange = $("#skalaRange");
if (skalaRange) {
  const word = $("#skalaWord");
  const xLabel = $("#skalaX");
  const punchX = $("#skalaPunchX");
  const convos = $("#skConvos");
  const hours = $("#skHours");
  const BASE_CONVOS = 8400;
  const BASE_HOURS = 640;

  function updateSkala() {
    const n = parseInt(skalaRange.value, 10);
    const fill = ((n - 1) / 9) * 100;
    skalaRange.style.setProperty("--fill", fill + "%");
    word.style.transform = `scale(${(0.62 + n * 0.038).toFixed(3)})`;
    xLabel.textContent = "×" + n;
    punchX.textContent = "×" + n;
    convos.textContent = fmt.format(BASE_CONVOS * n);
    hours.textContent = fmt.format(BASE_HOURS * n);
  }

  skalaRange.addEventListener("input", updateSkala);
  updateSkala();

  /* auto-demo: po wejściu w widok suwak sam przejeżdża do ×10 i wraca do ×3 */
  if (!prefersReduced) {
    let touched = false;
    skalaRange.addEventListener("pointerdown", () => { touched = true; }, { once: true });

    const skalaIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        skalaIO.disconnect();
        const seq = [2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3];
        seq.forEach((v, i) => {
          setTimeout(() => {
            if (touched) return;
            skalaRange.value = v;
            updateSkala();
          }, 600 + i * 130);
        });
      });
    }, { threshold: 0.5 });
    skalaIO.observe($(".skala-stage"));
  }
}

/* ---------- linijka: postęp scrolla ---------- */
const rulerFill = $(".ruler-fill");
const rulerLabel = $(".ruler-label");
const footerScale = $("#footerScale");

function updateRuler() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const pct = max > 0 ? Math.round((scrollY / max) * 100) : 0;
  if (rulerFill) rulerFill.style.height = pct + "%";
  if (rulerLabel) rulerLabel.textContent = pct + "%";
  if (footerScale) footerScale.textContent = pct + "%";
}

addEventListener("scroll", updateRuler, { passive: true });
addEventListener("resize", updateRuler, { passive: true });
updateRuler();

/* ---------- przyciski magnetyczne ---------- */
if (finePointer && !prefersReduced) {
  $$(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", e => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      btn.style.transform = `translate(${x * 8}px, ${y * 6}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0, 0)";
    });
  });
}

/* ---------- własny kursor ---------- */
if (finePointer && !prefersReduced) {
  const dot = $(".cursor-dot");
  const ring = $(".cursor-ring");
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;
  let shown = false;

  addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    if (!shown) { shown = true; document.body.classList.add("cursor-on"); }
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    document.body.classList.remove("cursor-on");
    shown = false;
  });

  (function loop() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.left = rx + "px";
    ring.style.top = ry + "px";
    requestAnimationFrame(loop);
  })();

  const hoverables = "a, button, input[type=range], .ba-frame";
  document.addEventListener("mouseover", e => {
    if (e.target.closest(hoverables)) document.body.classList.add("cursor-hover");
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest(hoverables)) document.body.classList.remove("cursor-hover");
  });
}
