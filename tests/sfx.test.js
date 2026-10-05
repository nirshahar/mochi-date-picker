// Sound effects are rendered into an OfflineAudioContext, so the tests "hear" what she would.
const SOUND_NAMES = ["purr", "pop"];
const RATE = 22050;

function memoryStorage() {
  const data = {};
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

// Offline rendering happens off the main thread, and headless virtual time skips ahead whenever the
// page looks idle (ending the run). Zero-delay messages keep it busy until `promise` settles.
function busyUntil(promise) {
  let done = false;
  const ch = new MessageChannel();
  ch.port1.onmessage = () => { if (!done) ch.port2.postMessage(0); };
  ch.port2.postMessage(0);
  return promise.finally(() => { done = true; ch.port1.close(); });
}

// Runs `fn(sfx, ctx)` against an offline context and returns the loudest sample overall,
// from `quietFrom` seconds on, and in the last 0.3s.
async function render(fn, { seconds = 3.5, storage = memoryStorage(), quietFrom = seconds } = {}) {
  const ctx = new OfflineAudioContext(1, RATE * seconds, RATE);
  const sfx = App.createSfx({ makeContext: () => ctx, storage });
  sfx.unlock();
  fn(sfx, ctx);
  const data = (await busyUntil(ctx.startRendering())).getChannelData(0);
  const peak = (from) => {
    let p = 0;
    for (let i = Math.floor(from * RATE); i < data.length; i++) p = Math.max(p, Math.abs(data[i]));
    return p;
  };
  return { peak: peak(0), after: peak(quietFrom), tail: peak(seconds - 0.3) };
}

// Swaps in a recorder for App.sfx while `fn` runs; resolves with the sound names, in order.
async function recordSounds(fn) {
  const real = App.sfx;
  const played = [];
  App.sfx = { play: (name) => { played.push(name); return true; } };
  try {
    await fn(played);
  } finally {
    App.sfx = real;
  }
  return played;
}

test("sfx: every sound is audible, never clips, and fades out", async () => {
  for (const name of SOUND_NAMES) {
    const r = await render((sfx) => eq(sfx.play(name), true, `${name} played`));
    assert(r.peak > 0.02, `${name} is too quiet (${r.peak.toFixed(4)})`);
    assert(r.peak <= 1, `${name} clips (${r.peak.toFixed(3)})`);
    assert(r.tail < 0.001, `${name} still sounding at the end (${r.tail.toFixed(4)})`);
  }
});

test("sfx: an unknown sound name is ignored", async () => {
  const r = await render((sfx) => eq(sfx.play("definitely-not-a-sound"), false));
  eq(r.peak, 0);
});

test("sfx: muted plays nothing", async () => {
  const r = await render((sfx) => {
    sfx.setMuted(true);
    eq(sfx.play("pop"), false);
  });
  eq(r.peak, 0);
});

test("sfx: muting cuts a sound that is already playing", async () => {
  const r = await render((sfx, ctx) => {
    sfx.play("purr");
    ctx.suspend(0.3).then(() => { sfx.setMuted(true); ctx.resume(); });
  }, { quietFrom: 0.45 });
  assert(r.peak > 0.02, "purr started");
  assert(r.after < 0.001, `still audible after mute (${r.after.toFixed(4)})`);
});

test("sfx: the mute choice is remembered next visit", async () => {
  const storage = memoryStorage();
  const first = App.createSfx({ makeContext: () => null, storage });
  eq(first.muted, false, "sound on by default");
  first.setMuted(true);
  const r = await render((sfx) => {
    eq(sfx.muted, true, "starts muted");
    sfx.play("pop");
  }, { storage });
  eq(r.peak, 0);
  first.setMuted(false);
  eq(App.createSfx({ makeContext: () => null, storage }).muted, false, "unmute remembered too");
});

test("sfx: storage that throws (private mode) still works, with sound on", () => {
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  const sfx = App.createSfx({ makeContext: () => null, storage: broken });
  eq(sfx.muted, false);
  sfx.setMuted(true);
  eq(sfx.muted, true);
});

test("sfx: no audio context until her first tap or key press", () => {
  let made = 0;
  const ctx = new OfflineAudioContext(1, RATE, RATE);
  const sfx = App.createSfx({ makeContext: () => { made += 1; return ctx; }, storage: memoryStorage() });
  const target = document.createElement("div");
  sfx.listen(target);
  eq(sfx.play("pop"), false, "nothing before a gesture");
  eq(made, 0, "no context before a gesture");
  target.dispatchEvent(new Event("pointerdown"));
  eq(made, 1, "context made on the first tap");
  eq(sfx.play("pop"), true);
  target.dispatchEvent(new Event("keydown"));
  eq(made, 1, "only one context");
});

test("sfx: a browser without Web Audio stays silent without errors", () => {
  const sfx = App.createSfx({ makeContext: () => null, storage: memoryStorage() });
  sfx.unlock();
  eq(sfx.play("pop"), false);
  sfx.setMuted(true);
  sfx.setMuted(false);
});

test("sfx.bindToggle: the button shows the state and flips it", () => {
  const storage = memoryStorage();
  const sfx = App.createSfx({ makeContext: () => null, storage });
  const btn = document.createElement("button");
  sfx.bindToggle(btn);
  eq([btn.textContent, btn.getAttribute("aria-pressed")], ["🔊", "true"], "sound on");
  btn.click();
  eq(sfx.muted, true);
  eq([btn.textContent, btn.getAttribute("aria-pressed")], ["🔇", "false"], "muted");
  btn.click();
  eq(sfx.muted, false);
  eq(btn.getAttribute("aria-pressed"), "true");
});

test("sounds: petting Mochi purrs", async () => {
  const stage = document.createElement("div");
  stage.id = "stage";
  const mochiEl = document.createElement("div");
  mochiEl.innerHTML = App.cats.mochi();
  document.body.append(mochiEl, stage);
  try {
    const played = await recordSounds(() => {
      App.setupPurr(mochiEl, "purr~");
      mochiEl.click();
    });
    eq(played, ["purr"]);
  } finally {
    mochiEl.remove();
    stage.remove();
  }
});

test("sounds: picking a date or a day card pops", async () => {
  const played = await recordSounds(() => {
    const box = document.createElement("div");
    App.dates.renderDateCards(box, CONFIG.dateIdeas, () => {}, { stampMs: 0 });
    box.querySelector(".date-card").click();
    App.dates.renderDayCards(box, App.dates.upcomingDays(new Date(), 3), () => {}, { stampMs: 0 });
    box.querySelector(".day-card").click();
  });
  eq(played, ["pop", "pop"]);
});

test("sounds: YES pops", async () => {
  const rain = document.createElement("div");
  rain.id = "rain";
  const stage = document.createElement("div");
  stage.id = "stage";
  const box = document.createElement("div");
  box.innerHTML = `<div class="mochi-spot">${App.cats.mochi()}</div><h1></h1><p></p><p></p>`
    + "<button></button><button></button>";
  document.body.append(box, stage, rain);
  try {
    const $ = (sel) => box.querySelectorAll(sel);
    let celebration;
    const played = await recordSounds(() => {
      celebration = App.celebrate({
        yesBtn: $("button")[0], noBtn: $("button")[1], mochiEl: $(".mochi-spot")[0], biscuit: null,
        titleEl: $("h1")[0], subEl: $("p")[0], captionEl: $("p")[1],
      });
    });
    await celebration; // its floating hearts need the stage until it's over, even if the check fails
    eq(played, ["pop"]);
  } finally {
    box.remove();
    stage.remove();
    rain.remove();
  }
});
