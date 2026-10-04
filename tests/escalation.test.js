function fakeSteps(n, log) {
  return Array.from({ length: n }, (_, i) => ({
    play: () => new Promise((resolve) => setTimeout(() => { log.push(`play${i + 1}`); resolve(); }, 20)),
    settle: () => log.push(`settle${i + 1}`),
  }));
}

test("escalation: each attempt plays the next step", async () => {
  const log = [];
  const esc = App.createEscalation({ steps: fakeSteps(3, log) });
  await esc.attempt();
  await esc.attempt();
  eq(log, ["play1", "play2"]);
  eq(esc.count, 2);
});

test("escalation: clicks during an animation are ignored (no skipped steps)", async () => {
  const log = [];
  const esc = App.createEscalation({ steps: fakeSteps(3, log) });
  const first = esc.attempt();
  eq(esc.busy, true);
  eq(await esc.attempt(), false, "second click while busy");
  await first;
  eq(log, ["play1"]);
  eq(esc.count, 1);
});

test("escalation: a failing step still settles and frees the button", async () => {
  const log = [];
  const steps = fakeSteps(2, log);
  steps[0].play = () => Promise.reject(new Error("boom"));
  const esc = App.createEscalation({ steps });
  await esc.attempt();
  eq(esc.busy, false);
  eq(log, ["settle1"]);
  await esc.attempt();
  eq(log, ["settle1", "play2"]);
});

test("escalation: converts after the last step, exactly once", async () => {
  const log = [];
  let conversions = 0;
  const esc = App.createEscalation({ steps: fakeSteps(2, log), onConverted: () => { conversions += 1; } });
  await esc.attempt();
  eq(esc.converted, false);
  await esc.attempt();
  eq(esc.converted, true);
  eq(await esc.attempt(), false);
  eq(conversions, 1);
});

test("escalation: skipTo settles earlier steps instantly and clamps", () => {
  const log = [];
  const esc = App.createEscalation({ steps: fakeSteps(3, log) });
  esc.skipTo(99);
  eq(log, ["settle1", "settle2", "settle3"]);
  eq(esc.count, 3);
  eq(esc.converted, true);
});

test("escalation: convert() mid-step makes the button a YES right away (no dead taps)", async () => {
  const log = [];
  let conversions = 0;
  const steps = fakeSteps(1, log);
  const esc = App.createEscalation({ steps, onConverted: () => { conversions += 1; } });
  steps[0].play = () => new Promise((resolve) => { esc.convert(); setTimeout(resolve, 20); });
  const running = esc.attempt();
  eq(esc.converted, true, "converted while the step is still playing");
  eq(esc.busy, true);
  await running;
  eq(conversions, 1, "onConverted fires once");
});
