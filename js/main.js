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

  // ?demo: Mochi performs every trick by herself (handy for previewing).
  async function runDemo(esc) {
    await App.fx.wait(1200);
    while (!esc.converted) {
      await esc.attempt();
      await App.fx.wait(1500);
    }
  }

  function init() {
    const params = parseParams(window.location.search);
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

    let hasPicked = false;
    function showTicket(idea) {
      App.dates.renderTicket($("ticket"), {
        herName: CONFIG.herName, fromName: CONFIG.fromName, catName: CONFIG.catName, idea,
      });
      showScreen("ticket");
    }
    function showDates() {
      App.dates.renderDateCards($("date-cards"), CONFIG.dateIdeas, (idea) => {
        App.notify.send(App.notify.pickMessage(idea, hasPicked), { test: params.test });
        hasPicked = true;
        showTicket(idea);
      });
      showScreen("dates");
    }
    $("change-pick").addEventListener("click", showDates);

    const onYes = App.fx.once(async () => {
      noCtl.deactivate();
      App.notify.send(App.notify.yesMessage(noCtl.escalation.count), { test: params.test });
      await App.celebrate({
        yesBtn: $("yes-btn"), noBtn: $("no-btn"), mochiEl, biscuit: noCtl.biscuit,
        titleEl: $("question-title"), subEl: $("yay-sub"), captionEl: $("caption"),
      });
      showDates();
    });
    const noCtl = App.setupNoButton({
      noBtn: $("no-btn"), yesBtn: $("yes-btn"), mochiEl, titleEl: $("question-title"),
      captionEl: $("caption"), appEl: $("app"), onYes,
    });
    $("yes-btn").addEventListener("click", onYes);

    showScreen("question");
    if (params.screen === "dates") showDates();
    else if (params.screen === "ticket") showTicket(CONFIG.dateIdeas[0]);
    else if (params.step) requestAnimationFrame(() => noCtl.skipTo(params.step));
    else if (params.demo) runDemo(noCtl.escalation);
  }

  App.parseParams = parseParams;
  App.showScreen = showScreen;
  if (document.getElementById("app")) init();
})();
