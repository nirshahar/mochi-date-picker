test("parseParams: defaults", () => {
  eq(App.parseParams(""), { test: false, step: 0, screen: null, demo: false });
});

test("parseParams: test flag, step, screen and demo", () => {
  eq(App.parseParams("?test&step=3&screen=dates&demo"), { test: true, step: 3, screen: "dates", demo: true });
});

test("parseParams: junk is clamped or ignored", () => {
  eq(App.parseParams("?step=99").step, 5);
  eq(App.parseParams("?step=-2").step, 0);
  eq(App.parseParams("?step=abc").step, 0);
  eq(App.parseParams("?screen=lol").screen, null);
});

test("fx.once: YES can only fire once", () => {
  let calls = 0;
  const yes = App.fx.once(() => { calls += 1; });
  yes();
  yes();
  yes();
  eq(calls, 1);
});

test("leaving the question screen hides every leftover cat/paw/button", () => {
  const stage = document.createElement("div");
  stage.id = "stage";
  document.body.appendChild(stage);
  document.body.dataset.screen = "question";
  assert(getComputedStyle(stage).display !== "none", "stage visible on the question screen");
  document.body.dataset.screen = "dates";
  eq(getComputedStyle(stage).display, "none");
  document.body.dataset.screen = "ticket";
  eq(getComputedStyle(stage).display, "none");
  stage.remove();
  delete document.body.dataset.screen;
});

test("parseParams: any debug param implies test mode (no unmarked pushes while previewing)", () => {
  eq(App.parseParams("?demo").test, true, "demo");
  eq(App.parseParams("?step=2").test, true, "step");
  eq(App.parseParams("?screen=dates").test, true, "screen");
  eq(App.parseParams("?utm=x").test, false, "unrelated params stay real");
});

test("purr: petting Mochi just before YES doesn't wipe her celebration smile", async () => {
  const stage = document.createElement("div");
  stage.id = "stage";
  const mochiEl = document.createElement("div");
  mochiEl.innerHTML = App.cats.mochi();
  document.body.append(mochiEl, stage);
  try {
    App.setupPurr(mochiEl, "purr~");
    mochiEl.click(); // purr: happy for 1.2s
    mochiEl.classList.add("hop"); // ...then YES: the celebration makes her hop, still happy
    await new Promise((r) => setTimeout(r, 1300));
    eq(mochiEl.querySelector("svg").dataset.mood, "happy");
  } finally {
    mochiEl.remove();
    stage.remove();
  }
});

test("parseParams: ?screen=days previews the day picker", () => {
  eq(App.parseParams("?screen=days").screen, "days");
});
