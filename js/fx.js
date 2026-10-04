// Small DOM + animation effects shared by the screens.
window.App = window.App || {};

(function () {
  const PAW_TIP = { x: 45, y: 0 }; // tip of the paw drawing, in px inside .paw-wrap

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function once(fn) {
    let called = false;
    return function (...args) {
      if (called) return undefined;
      called = true;
      return fn.apply(this, args);
    };
  }

  const stage = () => document.getElementById("stage");
  const viewport = () => ({ vw: window.innerWidth, vh: window.innerHeight });

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  function sizeOf(el) { return { w: el.offsetWidth, h: el.offsetHeight }; }
  function placeAt(el, p) { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; }
  function posOf(el) { return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 }; }

  // Slides an absolutely-positioned element to `dest`, then commits its new left/top.
  async function glide(el, dest, { duration = 500, easing = "ease-in-out", spin = 0, arc = 0 } = {}) {
    const from = posOf(el);
    const dx = dest.x - from.x;
    const dy = dest.y - from.y;
    const anim = el.animate([
      { transform: "translate(0px, 0px) rotate(0deg)" },
      { transform: `translate(${dx / 2}px, ${dy / 2 - arc}px) rotate(${spin / 2}deg)` },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg)` },
    ], { duration, easing, fill: "forwards" });
    await anim.finished;
    placeAt(el, dest);
    anim.cancel();
  }

  function makePaw(anchor) {
    const wrap = document.createElement("div");
    wrap.className = "paw-wrap";
    wrap.innerHTML = App.cats.paw();
    placeAt(wrap, { x: anchor.x - PAW_TIP.x, y: anchor.y - PAW_TIP.y });
    stage().appendChild(wrap);
    return wrap;
  }

  // Transform that puts the tip of a paw anchored at `anchor` onto `tip`, rotated to `angle`.
  function pawTransform(tip, anchor, angle) {
    return `translate(${tip.x - anchor.x}px, ${tip.y - anchor.y}px) rotate(${angle}deg)`;
  }

  // A paw shoots in from `edge`, taps `point`, and pulls back.
  // Returns { contact, done }: promises for the moment of impact and for the end.
  function pawStrike(point, edge, { duration = 650 } = {}) {
    const g = App.geo.pawGeometry(edge, point, viewport());
    const push = App.geo.PUSH[edge];
    const wrap = makePaw(point);
    const hidden = pawTransform(g.hidden, point, g.angle);
    const hit = pawTransform({ x: point.x + push.x * 8, y: point.y + push.y * 8 }, point, g.angle);
    wrap.style.transform = hidden;
    const anim = wrap.animate([
      { transform: hidden, easing: "cubic-bezier(.2,.9,.3,1.25)" },
      { transform: hit, offset: 0.35 },
      { transform: hit, offset: 0.5, easing: "ease-in" },
      { transform: hidden },
    ], { duration, fill: "forwards" });
    return {
      contact: wait(duration * 0.35),
      done: anim.finished.catch(() => {}).then(() => wrap.remove()),
    };
  }

  // A paw peeks in from `edge` and wiggles until pawHide().
  function pawPeek(point, edge) {
    const g = App.geo.pawGeometry(edge, point, viewport());
    const wrap = makePaw(point);
    const hidden = pawTransform(g.hidden, point, g.angle);
    const peek = pawTransform(g.peek, point, g.angle);
    wrap.classList.add("peeking");
    wrap.dataset.hidden = hidden;
    wrap.style.transform = peek;
    wrap.animate([{ transform: hidden }, { transform: peek }], { duration: 220, easing: "ease-out" });
    return wrap;
  }

  function pawHide(wrap) {
    if (!wrap || !wrap.isConnected) return;
    wrap.animate([{ transform: wrap.style.transform }, { transform: wrap.dataset.hidden }],
      { duration: 200, easing: "ease-in", fill: "forwards" })
      .finished.catch(() => {}).then(() => wrap.remove());
  }

  function bubble(text, anchor) {
    const el = document.createElement("div");
    el.className = "bubble";
    el.textContent = text;
    placeAt(el, { x: anchor.x + anchor.w * 0.78, y: anchor.y + anchor.h * 0.08 });
    stage().appendChild(el);
    setTimeout(() => el.remove(), 1400);
    return el;
  }

  function burst(text, p) {
    const el = document.createElement("div");
    el.className = "burst";
    el.textContent = text;
    placeAt(el, p);
    stage().appendChild(el);
    el.addEventListener("animationend", () => el.remove());
    return el;
  }

  function setCaption(el, text) {
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth; // restart the pop-in animation
    el.classList.add("show");
  }

  function shake(el) {
    return el.animate([
      { transform: "translate(0px, 0px)" },
      { transform: "translate(-8px, 3px)" },
      { transform: "translate(7px, -3px)" },
      { transform: "translate(-4px, 2px)" },
      { transform: "translate(0px, 0px)" },
    ], { duration: 320, easing: "ease-out" }).finished;
  }

  // Little paw prints between two centre points, appearing while something scoots past.
  function pawTrail(from, to, { count = 6, duration = 800 } = {}) {
    for (let i = 1; i <= count; i++) {
      setTimeout(() => {
        const t = i / (count + 1);
        const side = i % 2 ? -1 : 1;
        const el = document.createElement("div");
        el.className = "trail-print";
        el.innerHTML = App.cats.pawPrint("#e58fb0");
        placeAt(el, { x: from.x + (to.x - from.x) * t + side * 8, y: from.y + (to.y - from.y) * t + side * 6 });
        stage().appendChild(el);
        el.addEventListener("animationend", () => el.remove());
      }, (duration * i) / (count + 1));
    }
  }

  function floatHeart(anchor) {
    const el = document.createElement("div");
    el.className = "float-heart";
    el.innerHTML = App.cats.heart("#ff6b9a");
    placeAt(el, { x: anchor.x + anchor.w * (0.3 + Math.random() * 0.4), y: anchor.y + anchor.h * 0.15 });
    stage().appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  App.fx = {
    wait, once, stage, viewport, rectOf, sizeOf, placeAt, posOf, glide,
    pawStrike, pawPeek, pawHide, bubble, burst, setCaption, shake, pawTrail, floatHeart,
  };
})();
