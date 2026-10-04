test("config: five escalation steps with a growing YES", () => {
  eq(CONFIG.attempts.length, 5);
  CONFIG.attempts.forEach((a, i) => {
    assert(a.noLabel && a.caption, `step ${i + 1} needs noLabel + caption`);
    assert(a.noSize > 0, `step ${i + 1} needs noSize`);
    if (i > 0) assert(a.yesScale > CONFIG.attempts[i - 1].yesScale, `yesScale must grow at step ${i + 1}`);
  });
  eq(CONFIG.attempts[4].noLabel, "yes 💕");
});

test("config: five date ideas, each with emoji, title and blurb", () => {
  eq(CONFIG.dateIdeas.length, 5);
  CONFIG.dateIdeas.forEach((d) => assert(d.emoji && d.title && d.blurb, JSON.stringify(d)));
});

test("config: ntfy topic is long and random", () => {
  assert(/^shira-date-[0-9a-f]{16}$/.test(CONFIG.ntfyTopic), CONFIG.ntfyTopic);
});

test("config: the question is addressed to Shira", () => {
  eq(CONFIG.text.question, "Shira, will you go on a date with me? 🐾");
});

test("config: the ticket is signed by Nir", () => {
  eq(CONFIG.fromName, "Nir");
});
