// Wires the screens together.
window.App = window.App || {};

(function () {
  function parseParams(search) {
    const p = new URLSearchParams(search);
    const step = Math.max(0, Math.min(CONFIG.attempts.length, parseInt(p.get("step"), 10) || 0));
    const screen = ["dates", "ticket"].includes(p.get("screen")) ? p.get("screen") : null;
    return { test: p.has("test"), step, screen, demo: p.has("demo") };
  }

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => { s.hidden = s.id !== `screen-${name}`; });
    document.body.dataset.screen = name;
  }

  function startBlinking(svg) {
    setTimeout(() => {
      svg.classList.add("blink");
      setTimeout(() => {
        svg.classList.remove("blink");
        startBlinking(svg);
      }, 140);
    }, 3000 + Math.random() * 3000);
  }

  function init() {
    const $ = (id) => document.getElementById(id);
    const T = CONFIG.text;

    $("question-title").textContent = T.question;
    $("yes-btn").textContent = T.yes;
    $("no-btn").textContent = T.no;
    $("dates-title").textContent = T.datesTitle;
    $("ticket-note").textContent = T.ticketNote;
    $("change-pick").textContent = T.changePick;

    const mochiEl = $("mochi");
    mochiEl.innerHTML = App.cats.mochi();
    const mochiSvg = mochiEl.querySelector("svg");
    startBlinking(mochiSvg);
    mochiEl.addEventListener("click", () => {
      if (mochiSvg.dataset.mood) return; // busy being dramatic
      App.fx.bubble(T.purr, App.fx.rectOf(mochiEl));
      App.fx.floatHeart(App.fx.rectOf(mochiEl));
      mochiSvg.dataset.mood = "happy";
      setTimeout(() => { if (mochiSvg.dataset.mood === "happy") mochiSvg.dataset.mood = ""; }, 1200);
    });

    showScreen("question");
  }

  App.parseParams = parseParams;
  App.showScreen = showScreen;
  if (document.getElementById("app")) init();
})();
