// Screen 1's "No" button: Mochi's escalating tricks, plus the hover tease.
window.App = window.App || {};

App.setupNoButton = function ({ noBtn, yesBtn, mochiEl, titleEl, captionEl, appEl, onYes, avoidEls = [] }) {
  const fx = App.fx;
  const geo = App.geo;
  const sfx = (name, opts) => App.sfx.play(name, opts);
  const mochiSvg = () => mochiEl.querySelector("svg");
  let active = true;
  let yesScale = 1;
  let biscuit = null;
  let moodTimer = null;
  let teasePaw = null;

  // Once YES is clicked a trick may still be mid-animation. Every await in the tricks goes through
  // live(), which never resolves after deactivate(), so a frozen trick can't touch the celebration.
  const live = (promise) => promise.then((value) => (active ? value : new Promise(() => {})));

  // ---------- shared helpers ----------
  function setMood(mood) {
    if (!active) return;
    clearTimeout(moodTimer);
    mochiSvg().dataset.mood = mood;
  }
  function moodFor(mood, ms) {
    if (!active) return;
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
    avoidEls.forEach((el) => list.push(fx.rectOf(el)));
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

  async function strikeNo(burstText, hitSound) {
    const r = fx.rectOf(noBtn);
    const edge = geo.nearestEdge(r, fx.viewport());
    const point = geo.contactPoint(r, edge);
    const strike = fx.pawStrike(point, edge);
    await live(strike.contact);
    sfx(hitSound);
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
    await live(off.finished);
    const dest = spot();
    off.cancel();
    fx.placeAt(noBtn, dest);
    live(fx.wait(420)).then(() => sfx("boing")); // the moment it hits the ground
    await live(noBtn.animate([
      { transform: `translateY(${-(dest.y + 140)}px)`, easing: "cubic-bezier(.5,0,1,.6)" },
      { transform: "translateY(0px)", offset: 0.65, easing: "ease-out" },
      { transform: "translateY(-16px)", offset: 0.82, easing: "ease-in" },
      { transform: "translateY(0px)" },
    ], { duration: 650 }).finished);
  }

  function wobble() {
    return noBtn.animate([
      { transform: "rotate(0deg)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(10deg)" },
      { transform: "rotate(-5deg)" }, { transform: "rotate(0deg)" },
    ], { duration: 380 }).finished;
  }

  // ---------- Biscuit (step 3) ----------
  function biscuitSize() {
    const w = Math.max(190, noBtn.offsetWidth * 1.35);
    return { w, h: (w * 150) / 220 };
  }

  function makeBiscuit(size, at) {
    const el = document.createElement("div");
    el.className = "biscuit-wrap";
    el.style.width = `${size.w}px`;
    el.innerHTML = `${App.cats.biscuit()}<span class="zzz"><span>z</span><span>z</span><span>z</span></span>`;
    fx.placeAt(el, at);
    fx.stage().appendChild(el);
    return el;
  }

  // ---------- Mochi's walk (step 5) ----------
  const WALK_SPEED = 0.55; // px per ms

  function walkTo(walker, dest) {
    const from = fx.posOf(walker);
    const duration = Math.max(500, Math.hypot(dest.x - from.x, dest.y - from.y) / WALK_SPEED);
    const footsteps = setInterval(() => { // in time with the trot
      if (active && walker.isConnected) sfx("step");
      else clearInterval(footsteps);
    }, 280);
    return fx.glide(walker, dest, { duration, easing: "linear" }).finally(() => clearInterval(footsteps));
  }

  function cleanupWalker() {
    if (noBtn.classList.contains("carried")) { // drop it right where it is on screen
      const r = fx.rectOf(noBtn);
      fx.stage().appendChild(noBtn);
      fx.placeAt(noBtn, r);
    }
    noBtn.classList.remove("carried");
    fx.stage().querySelectorAll(".walker").forEach((w) => w.remove());
    mochiEl.style.visibility = "";
  }

  // ---------- the steps (one per No attempt) ----------
  const steps = [
    { // 1. The Swat
      async play() {
        sfx("whoosh");
        const { edge } = await live(strikeNo("SWAT!", "swat"));
        detach(); // only now, so YES re-centres while No is already flying
        applyState(1);
        moodFor("smug", 1600);
        await live(flyOffAndDrop(edge));
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
        sfx("mrrp");
        await live(fx.wait(650));
        const first = await live(strikeNo("tap", "tap"));
        await live(wobble());
        await live(first.done);
        sfx("whoosh");
        const { edge } = await live(strikeNo("SWAT!!", "swat"));
        applyState(2);
        moodFor("smug", 1600);
        await live(flyOffAndDrop(edge));
      },
      settle() {
        setMood("");
        applyState(2, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
    { // 3. The Sit
      async play() {
        const r = fx.rectOf(noBtn);
        const size = biscuitSize();
        const at = geo.clampToViewport(
          { x: r.x + r.w / 2 - size.w / 2, y: r.y + r.h / 2 - size.h * 0.6 }, size, fx.viewport());
        biscuit = makeBiscuit(size, at);
        sfx("slide");
        await live(biscuit.animate([
          { transform: `translateY(${-(at.y + size.h + 60)}px)` },
          { transform: "translateY(0px)" },
        ], { duration: 460, easing: "cubic-bezier(.55,0,1,.45)" }).finished);
        biscuit.animate([{ transform: "scale(1.15, 0.8)" }, { transform: "scale(1, 1)" }],
          { duration: 280, easing: "ease-out" });
        sfx("thud");
        fx.burst("THUD!", { x: at.x + size.w / 2, y: at.y });
        fx.shake(appEl);
        applyState(3);
        biscuit.classList.add("sleeping");
        await live(fx.wait(1200));
        // squeeze out on the roomier side, then scoot away leaving paw prints
        sfx("squeak");
        await live(noBtn.animate([
          { transform: "scale(1, 1)" }, { transform: "scale(0.55, 1.35)" }, { transform: "scale(1, 1)" },
        ], { duration: 380 }).finished);
        const goRight = r.x + r.w / 2 < window.innerWidth / 2;
        const out = { x: goRight ? at.x + size.w + 8 : at.x - noBtn.offsetWidth - 8, y: fx.posOf(noBtn).y };
        await live(fx.glide(noBtn, geo.clampToViewport(out, fx.sizeOf(noBtn), fx.viewport()),
          { duration: 260, easing: "ease-out" }));
        const dest = spot();
        const centre = (p) => ({ x: p.x + noBtn.offsetWidth / 2, y: p.y + noBtn.offsetHeight / 2 });
        fx.pawTrail(centre(fx.posOf(noBtn)), centre(dest));
        sfx("patter");
        await live(fx.glide(noBtn, dest, { duration: 800 }));
      },
      settle() {
        if (!biscuit) {
          const size = biscuitSize();
          biscuit = makeBiscuit(size, geo.randomSafeSpot(size, fx.viewport(), obstacles()));
        }
        biscuit.classList.add("sleeping");
        applyState(3, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
    { // 4. The Bat-Around
      async play() {
        const vp = fx.viewport();
        const size = fx.sizeOf(noBtn);
        const y = Math.min(Math.max(fx.posOf(noBtn).y, 90), vp.vh - size.h - 90);
        const leftSpot = { x: 64, y };
        const rightSpot = { x: vp.vw - size.w - 64, y };
        await live(fx.glide(noBtn, leftSpot, { duration: 320, easing: "ease-in" }));
        let atLeft = true;
        for (let i = 0; i < 3; i++) {
          const edge = atLeft ? "left" : "right";
          const point = geo.contactPoint(fx.rectOf(noBtn), edge);
          const strike = fx.pawStrike(point, edge, { duration: 520 });
          await live(strike.contact);
          sfx("boop", { pitch: [0, 4, 7][i] }); // three pats going up: do, mi, sol
          fx.burst("pat!", point);
          await live(fx.glide(noBtn, atLeft ? rightSpot : leftSpot,
            { duration: 420, spin: atLeft ? 360 : -360, arc: 50 }));
          atLeft = !atLeft;
        }
        const edge = atLeft ? "left" : "right";
        const point = geo.contactPoint(fx.rectOf(noBtn), edge);
        const strike = fx.pawStrike(point, edge);
        await live(strike.contact);
        sfx("bonk");
        fx.burst("BONK!", point);
        applyState(4);
        const corner = geo.safeCorner(fx.sizeOf(noBtn), fx.viewport(), obstacles());
        await live(fx.glide(noBtn, corner, { duration: 560, easing: "cubic-bezier(.2,.7,.3,1)", spin: 540, arc: 90 }));
      },
      settle() {
        applyState(4, { caption: false });
        fx.placeAt(noBtn, geo.safeCorner(fx.sizeOf(noBtn), fx.viewport(), obstacles()));
      },
    },
    { // 5. Left the Chat
      async play() {
        const home = fx.rectOf(mochiEl);
        const walker = document.createElement("div");
        walker.className = "walker";
        walker.style.width = `${home.w}px`;
        walker.innerHTML = `<div class="walker-body">${App.cats.mochi()}</div>`;
        const body = walker.firstElementChild;
        const walkerSvg = walker.querySelector("svg");
        walkerSvg.dataset.mood = "smug";
        fx.placeAt(walker, home);
        fx.stage().appendChild(walker);
        mochiEl.style.visibility = "hidden";

        const mouth = { x: home.w * 0.5, y: home.h * 0.5 }; // Mochi's mouth, inside the walker
        const hold = () => ({ x: mouth.x - noBtn.offsetWidth / 2, y: mouth.y - 4 });
        const r = fx.rectOf(noBtn);
        await live(walkTo(walker, { x: r.x + r.w / 2 - mouth.x, y: r.y - mouth.y + 4 }));

        body.appendChild(noBtn); // picked up!
        noBtn.classList.add("carried");
        fx.placeAt(noBtn, hold());
        const vw = window.innerWidth;
        const exitRight = fx.posOf(walker).x + home.w / 2 > vw / 2;
        await live(walkTo(walker, { x: exitRight ? vw + 40 : -home.w - 40, y: fx.posOf(walker).y }));
        fx.setCaption(captionEl, CONFIG.text.leftChat);
        sfx("leave");
        await live(fx.wait(2000));

        applyState(5, { caption: false }); // the button comes back… edited
        fx.placeAt(noBtn, hold());
        const dest = spot();
        walkerSvg.dataset.mood = "happy";
        fx.placeAt(walker, { x: exitRight ? -home.w - 40 : vw + 40, y: dest.y - mouth.y + 4 });
        await live(walkTo(walker, { x: dest.x + noBtn.offsetWidth / 2 - mouth.x, y: dest.y - mouth.y + 4 }));

        fx.stage().appendChild(noBtn); // dropped
        noBtn.classList.remove("carried");
        fx.placeAt(noBtn, dest);
        esc.convert(); // "yes 💕" works from this moment, not only once Mochi is home
        sfx("sparkle");
        fx.setCaption(captionEl, CONFIG.attempts[4].caption);
        walkerSvg.dataset.mood = "smug";
        await live(walkTo(walker, home));
        walker.remove();
        mochiEl.style.visibility = "";
      },
      settle() {
        cleanupWalker();
        applyState(5, { caption: false });
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
    // YES was clicked: freeze any running trick and clear what it left lying around.
    deactivate() {
      stopTease();
      active = false;
      clearTimeout(moodTimer);
      fx.stage().querySelectorAll(".paw-wrap, .burst, .bubble, .trail-print").forEach((el) => el.remove());
      if (fx.stage().querySelector(".walker")) cleanupWalker();
    },
    get biscuit() { return biscuit; },
  };
};
