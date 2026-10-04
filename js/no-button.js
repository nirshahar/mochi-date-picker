// Screen 1's "No" button: Mochi's escalating tricks, plus the hover tease.
window.App = window.App || {};

App.setupNoButton = function ({ noBtn, yesBtn, mochiEl, titleEl, captionEl, appEl, onYes }) {
  const fx = App.fx;
  const geo = App.geo;
  const mochiSvg = () => mochiEl.querySelector("svg");
  let active = true;
  let yesScale = 1;
  let biscuit = null;
  let moodTimer = null;
  let teasePaw = null;

  // ---------- shared helpers ----------
  function setMood(mood) {
    clearTimeout(moodTimer);
    mochiSvg().dataset.mood = mood;
  }
  function moodFor(mood, ms) {
    setMood(mood);
    moodTimer = setTimeout(() => setMood(""), ms);
  }

  // YES's rect at a given scale (its centre stays put while it grows).
  function scaledRect(el, scale) {
    const r = fx.rectOf(el);
    const w = el.offsetWidth * scale;
    const h = el.offsetHeight * scale;
    return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
  }

  function obstacles() {
    const list = [scaledRect(yesBtn, yesScale), fx.rectOf(mochiEl), fx.rectOf(titleEl), fx.rectOf(captionEl)];
    if (biscuit) list.push(fx.rectOf(biscuit));
    return list;
  }

  const spot = () => geo.randomSafeSpot(fx.sizeOf(noBtn), fx.viewport(), obstacles());

  // Labels, sizes and caption after attempt n (1-based).
  function applyState(n, { caption = true } = {}) {
    const a = CONFIG.attempts[n - 1];
    noBtn.textContent = a.noLabel;
    noBtn.style.setProperty("--no-size", a.noSize);
    yesScale = geo.fitYesScale(a.yesScale, { w: yesBtn.offsetWidth, h: yesBtn.offsetHeight }, fx.viewport());
    yesBtn.style.setProperty("--yes-scale", yesScale);
    if (caption) fx.setCaption(captionEl, a.caption);
    mochiSvg().classList.toggle("tail-fast", n >= 4);
    yesBtn.classList.toggle("ears-wiggle", n >= 4);
    noBtn.classList.toggle("bitten", n >= 5);
  }

  // First attempt: lift No out of the layout so it can roam the screen.
  function detach() {
    if (noBtn.classList.contains("loose")) return;
    const r = fx.rectOf(noBtn);
    fx.stage().appendChild(noBtn);
    noBtn.classList.add("loose");
    fx.placeAt(noBtn, r);
  }

  async function strikeNo(burstText) {
    const r = fx.rectOf(noBtn);
    const edge = geo.nearestEdge(r, fx.viewport());
    const point = geo.contactPoint(r, edge);
    const strike = fx.pawStrike(point, edge);
    await strike.contact;
    fx.burst(burstText, point);
    return { edge, done: strike.done };
  }

  async function flyOffAndDrop(edge) {
    const push = geo.PUSH[edge];
    const far = Math.max(window.innerWidth, window.innerHeight) * 1.2;
    const off = noBtn.animate([
      { transform: "translate(0px, 0px) rotate(0deg)" },
      { transform: `translate(${push.x * far}px, ${push.y * far - 120}px) rotate(720deg)` },
    ], { duration: 520, easing: "cubic-bezier(.3,.6,.5,1)", fill: "forwards" });
    await off.finished;
    const dest = spot();
    off.cancel();
    fx.placeAt(noBtn, dest);
    await noBtn.animate([
      { transform: `translateY(${-(dest.y + 140)}px)`, easing: "cubic-bezier(.5,0,1,.6)" },
      { transform: "translateY(0px)", offset: 0.65, easing: "ease-out" },
      { transform: "translateY(-16px)", offset: 0.82, easing: "ease-in" },
      { transform: "translateY(0px)" },
    ], { duration: 650 }).finished;
  }

  function wobble() {
    return noBtn.animate([
      { transform: "rotate(0deg)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(10deg)" },
      { transform: "rotate(-5deg)" }, { transform: "rotate(0deg)" },
    ], { duration: 380 }).finished;
  }

  // ---------- the steps (one per No attempt) ----------
  const steps = [
    { // 1. The Swat
      async play() {
        const { edge } = await strikeNo("SWAT!");
        detach(); // only now, so YES re-centres while No is already flying
        applyState(1);
        moodFor("smug", 1600);
        await flyOffAndDrop(edge);
      },
      settle() {
        detach();
        applyState(1, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
    { // 2. The Warning
      async play() {
        setMood("alarmed");
        fx.bubble(CONFIG.text.mrrp, fx.rectOf(mochiEl));
        await fx.wait(650);
        const first = await strikeNo("tap");
        await wobble();
        await first.done;
        const { edge } = await strikeNo("SWAT!!");
        applyState(2);
        moodFor("smug", 1600);
        await flyOffAndDrop(edge);
      },
      settle() {
        setMood("");
        applyState(2, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
  ];

  // ---------- hover tease (mouse only) ----------
  function lookAt(p) {
    const pupils = mochiSvg().querySelector(".pupils");
    if (!p) {
      pupils.removeAttribute("transform");
      return;
    }
    const r = fx.rectOf(mochiEl);
    const dx = Math.max(-1, Math.min(1, (p.x - (r.x + r.w / 2)) / 250)) * 4;
    const dy = Math.max(-1, Math.min(1, (p.y - (r.y + r.h * 0.4)) / 250)) * 3;
    pupils.setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`);
  }

  function startTease() {
    const r = fx.rectOf(noBtn);
    const edge = geo.nearestEdge(r, fx.viewport());
    teasePaw = fx.pawPeek(geo.contactPoint(r, edge), edge);
    setMood("suspicious");
  }

  function stopTease() {
    if (!teasePaw) return;
    fx.pawHide(teasePaw);
    teasePaw = null;
    if (mochiSvg().dataset.mood === "suspicious") setMood("");
    lookAt(null);
  }

  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      if (!active || esc.busy || esc.converted) {
        stopTease();
        return;
      }
      const d = geo.distToRect(e.clientX, e.clientY, fx.rectOf(noBtn));
      if (!teasePaw && d < 90) startTease();
      else if (teasePaw && d > 150) stopTease();
      if (teasePaw) lookAt({ x: e.clientX, y: e.clientY });
    });
  }

  // ---------- wiring ----------
  const esc = App.createEscalation({ steps });

  function tryNo() {
    if (!active) return;
    if (esc.converted) {
      onYes();
      return;
    }
    stopTease();
    esc.attempt();
  }

  noBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    tryNo();
  });
  // Enter/Space make a click with detail 0; mouse and touch were already handled on pointerdown.
  noBtn.addEventListener("click", (e) => {
    if (e.detail === 0) tryNo();
  });

  window.addEventListener("resize", () => {
    if (!noBtn.classList.contains("loose") || noBtn.classList.contains("carried")) return;
    fx.placeAt(noBtn, geo.clampToViewport(fx.posOf(noBtn), fx.sizeOf(noBtn), fx.viewport()));
  });

  return {
    escalation: esc,
    skipTo: (n) => esc.skipTo(n),
    deactivate() {
      active = false;
      stopTease();
    },
    get biscuit() { return biscuit; },
  };
};
