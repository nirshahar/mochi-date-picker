// Drives the real No-button controller on a small fixture page. Web Animations never finish under
// headless virtual time, so a step "hangs" at its first animation — which is exactly the moment
// she might click YES mid-trick.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function noButtonFixture({ avoidEls = [] } = {}) {
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
    captionEl: $(".caption"), appEl: app, onYes: () => {}, avoidEls,
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
async function withFixture(fn, opts) {
  const f = noButtonFixture(opts);
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

test("sounds: the first swat whooshes, then smacks on contact", () => withFixture(async (f) => {
  const played = await recordSounds(async (log) => {
    f.ctl.escalation.attempt();
    await pause(50);
    eq(log, ["whoosh"], "paw on its way");
    await pause(400); // past the paw's contact (~230ms)
  });
  eq(played, ["whoosh", "swat"]);
}));

test("sounds: YES mid-swat silences the rest of the trick", () => withFixture(async (f) => {
  const played = await recordSounds(async () => {
    f.ctl.escalation.attempt();
    await pause(50);
    f.ctl.deactivate();
    await pause(500);
  });
  eq(played, ["whoosh"]);
}));

test("sounds: Mochi's warning starts with a mrrp", () => withFixture(async (f) => {
  f.ctl.skipTo(1);
  const played = await recordSounds(() => { f.ctl.escalation.attempt(); }); // the trick itself never ends here
  eq(played[0], "mrrp");
}));

test("sounds: YES while Mochi walks off stops her footsteps", () => withFixture(async (f) => {
  f.ctl.skipTo(4);
  const played = await recordSounds(async (log) => {
    f.ctl.escalation.attempt(); // step 5: Mochi walks over to No
    await pause(700);
    assert(log.includes("step"), `footsteps while walking (got ${JSON.stringify(log)})`);
    f.ctl.deactivate();
    const before = log.length;
    await pause(700);
    eq(log.length, before, "no footsteps after YES");
  });
  assert(played.length > 0);
}));

test("no-button: No never lands on the sound button", async () => {
  const soundBtn = document.createElement("button");
  soundBtn.style.cssText = "position: fixed; left: 0; bottom: 0; width: 260px; height: 140px;";
  document.body.appendChild(soundBtn);
  try {
    await withFixture(async (f) => {
      f.ctl.skipTo(4); // the bat-around ends in a corner; bottom-left would win without the sound button
      const no = App.fx.rectOf(document.querySelector(".no-btn"));
      assert(!App.geo.rectsOverlap(no, App.fx.rectOf(soundBtn)), `No landed on it at ${JSON.stringify(no)}`);
    }, { avoidEls: [soundBtn] });
  } finally {
    soundBtn.remove();
  }
});
