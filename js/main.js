// Wires the screens together.
window.App = window.App || {};

(function () {
  function parseParams(search) {
    const p = new URLSearchParams(search);
    const step = Math.max(0, Math.min(CONFIG.attempts.length, parseInt(p.get("step"), 10) || 0));
    const screen = ["dates", "days", "ticket"].includes(p.get("screen")) ? p.get("screen") : null;
    // Any debug param means someone is previewing, so its notifications are marked TEST too.
    const test = ["test", "demo", "step", "screen"].some((name) => p.has(name));
    return { test, step, screen, demo: p.has("demo") };
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

  // Petting Mochi makes her purr (unless she's busy being dramatic).
  function setupPurr(mochiEl, text) {
    const svg = mochiEl.querySelector("svg");
    const celebrating = () => mochiEl.classList.contains("hop");
    mochiEl.addEventListener("click", () => {
      if (svg.dataset.mood) return;
      App.fx.bubble(text, App.fx.rectOf(mochiEl));
      App.fx.floatHeart(App.fx.rectOf(mochiEl));
      svg.dataset.mood = "happy";
      setTimeout(() => { if (svg.dataset.mood === "happy" && !celebrating()) svg.dataset.mood = ""; }, 1200);
    });
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

    const mode = App.notify.deliveryMode({ test: params.test, hash: window.location.hash, linkKey: CONFIG.linkKey });
    const notify = (msg) => { if (mode !== "off") App.notify.send(msg, { test: mode === "test" }); };
    // "Opened" only counts for a person: not a bot, and only once they move, tap, scroll or type.
    if (!App.visitor.looksLikeBot(window.navigator)) {
      App.visitor.onFirstHumanInput(window, () => {
        notify(App.notify.openMessage(window.matchMedia("(pointer: coarse)").matches));
      });
    }

    document.title = T.pageTitle;
    $("question-title").textContent = T.question;
    $("yes-btn").textContent = T.yes;
    $("no-btn").textContent = T.no;
    $("dates-title").textContent = T.datesTitle;
    $("days-title").textContent = T.daysTitle;
    $("ticket-note").textContent = T.ticketNote;
    $("change-pick").textContent = T.changePick;

    const mochiEl = $("mochi");
    mochiEl.innerHTML = App.cats.mochi();
    startBlinking(mochiEl.querySelector("svg"));
    setupPurr(mochiEl, T.purr);

    let hasPicked = false;
    function showTicket(idea, day) {
      App.dates.renderTicket($("ticket"), {
        herName: CONFIG.herName, fromName: CONFIG.fromName, catName: CONFIG.catName, idea, day,
      });
      showScreen("ticket");
    }
    function showDays(idea) {
      const days = App.dates.upcomingDays(new Date(), CONFIG.dayCount);
      App.dates.renderDayCards($("day-cards"), days, (day) => {
        notify(App.notify.pickMessage(idea, day, hasPicked));
        hasPicked = true;
        showTicket(idea, day);
      });
      showScreen("days");
    }
    function showDates() {
      App.dates.renderDateCards($("date-cards"), CONFIG.dateIdeas, (idea) => {
        notify(App.notify.activityMessage(idea, hasPicked));
        showDays(idea);
      });
      showScreen("dates");
    }
    $("change-pick").addEventListener("click", showDates);

    const onYes = App.fx.once(async () => {
      noCtl.deactivate();
      notify(App.notify.yesMessage(noCtl.escalation.count));
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
    else if (params.screen === "days") showDays(CONFIG.dateIdeas[0]);
    else if (params.screen === "ticket") showTicket(CONFIG.dateIdeas[0], App.dates.upcomingDays(new Date(), 1)[0]);
    else if (params.step) requestAnimationFrame(() => noCtl.skipTo(params.step));
    else if (params.demo) runDemo(noCtl.escalation);
  }

  App.parseParams = parseParams;
  App.showScreen = showScreen;
  App.setupPurr = setupPurr;
  if (document.getElementById("app")) init();
})();
