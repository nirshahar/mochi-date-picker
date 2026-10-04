// Drives the real No-button controller on a small fixture page. Web Animations never finish under
// headless virtual time, so a step "hangs" at its first animation — which is exactly the moment
// Shira might click YES mid-trick.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function noButtonFixture() {
  const stage = document.createElement("div");
  stage.id = "stage";
  const app = document.createElement("div");
  app.innerHTML = `<div class="mochi-spot">${App.cats.mochi()}</div><h1>q</h1>`
    + '<div class="buttons"><button class="yes-btn">YES</button><button class="no-btn">No</button></div>'
    + '<p class="caption"></p>';
  document.body.append(app, stage);
  document.body.dataset.screen = "question";
  const $ = (sel) => app.querySelector(sel);
  const ctl = App.setupNoButton({
    noBtn: $(".no-btn"), yesBtn: $(".yes-btn"), mochiEl: $(".mochi-spot"), titleEl: $("h1"),
    captionEl: $(".caption"), appEl: app, onYes: () => {},
  });
  return {
    ctl,
    stage,
    mochiEl: $(".mochi-spot"),
    mochiSvg: $(".mochi-spot svg"),
    caption: $(".caption"),
    cleanup() {
      ctl.deactivate();
      app.remove();
      stage.remove();
      delete document.body.dataset.screen;
    },
  };
}

// Always cleans up, even when an assertion fails (leftover #stage elements would confuse later tests).
async function withFixture(fn) {
  const f = noButtonFixture();
  try {
    await fn(f);
  } finally {
    f.cleanup();
  }
}

test("no-button: YES mid-swat freezes the trick (no caption, paw or burst afterwards)", () => withFixture(async (f) => {
  f.ctl.escalation.attempt(); // step 1: the paw is on its way
  await pause(50);
  f.ctl.deactivate(); // YES clicked
  f.mochiSvg.dataset.mood = "happy"; // what the celebration does
  await pause(500); // well past the paw's contact (~230ms)
  eq(f.caption.textContent, "", "caption");
  eq(f.mochiSvg.dataset.mood, "happy", "mood");
  eq(f.stage.querySelectorAll(".paw-wrap, .burst").length, 0, "leftover paw/burst");
}));

test("no-button: YES right after a swat keeps Mochi happy (pending smug timer cancelled)", () => withFixture(async (f) => {
  f.ctl.escalation.attempt();
  await pause(400); // contact happened: smug face + its 1600ms reset timer are running
  f.ctl.deactivate();
  f.mochiSvg.dataset.mood = "happy";
  await pause(1700);
  eq(f.mochiSvg.dataset.mood, "happy");
}));

test("no-button: YES while Mochi is walking off brings her home (no second Mochi)", () => withFixture(async (f) => {
  f.ctl.skipTo(4);
  f.ctl.escalation.attempt(); // step 5: a walking Mochi replaces the sitting one
  await pause(50);
  assert(f.stage.querySelector(".walker"), "walker should exist mid-step");
  f.ctl.deactivate();
  eq(f.stage.querySelector(".walker"), null, "walker removed");
  eq(f.mochiEl.style.visibility, "", "home Mochi visible");
}));
