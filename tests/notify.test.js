test("notify.yesMessage: counts attempts with the right plural", () => {
  eq(App.notify.yesMessage(0), { title: `${CONFIG.herName} said YES! 💕`, message: "Didn't even try to say no 🥹" });
  eq(App.notify.yesMessage(1).message, "After 1 no-attempt 😼");
  eq(App.notify.yesMessage(5).message, "After 5 no-attempts 😼");
});

test("notify.pickMessage: idea and day, first pick vs changed pick", () => {
  const idea = { emoji: "🍿", title: "Movie night" };
  const day = { name: "Fri 30 Oct" };
  eq(App.notify.pickMessage(idea, day, false),
    { title: `${CONFIG.herName} picked a date! 🐾`, message: "🍿 Movie night · Fri 30 Oct" });
  eq(App.notify.pickMessage(idea, day, true),
    { title: `${CONFIG.herName} changed her pick`, message: "→ 🍿 Movie night · Fri 30 Oct" });
});

test("notify.send: JSON body to the ntfy root, emoji safe (no custom headers)", () => {
  let call = null;
  App.notify.send({ title: "She said YES! 💕", message: "hi" }, {
    topic: "t-123",
    fetchFn: (url, opts) => { call = { url, opts }; return Promise.resolve(); },
  });
  eq(call.url, "https://ntfy.sh/");
  eq(call.opts.method, "POST");
  eq(call.opts.mode, "no-cors");
  eq(call.opts.keepalive, true);
  eq(call.opts.headers, undefined);
  eq(JSON.parse(call.opts.body), {
    topic: "t-123", title: "She said YES! 💕", message: "hi", tags: ["cat", "heart"], priority: 4,
  });
});

test("notify.send: test mode marks the title", () => {
  const payload = App.notify.send({ title: "x", message: "y" }, { test: true, fetchFn: () => Promise.resolve() });
  eq(payload.title, "🧪 TEST x");
});

test("notify.send: network failures never escape", async () => {
  App.notify.send({ title: "x", message: "y" }, { fetchFn: () => { throw new TypeError("offline"); } });
  App.notify.send({ title: "x", message: "y" }, { fetchFn: () => Promise.reject(new TypeError("offline")) });
  await new Promise((r) => setTimeout(r, 10)); // an unhandled rejection would be reported as a FAIL
});

test("notify.openMessage: says she opened the page, and on what", () => {
  eq(App.notify.openMessage(true), { title: `👀 ${CONFIG.herName} just opened the page`, message: "on a phone" });
  eq(App.notify.openMessage(false).message, "on a computer");
});

test("notify.deliveryMode: only the secret link sends real pushes", () => {
  eq(App.notify.deliveryMode({ test: false, hash: "#abc123", linkKey: "abc123" }), "real");
  eq(App.notify.deliveryMode({ test: false, hash: "", linkKey: "abc123" }), "off", "bare URL");
  eq(App.notify.deliveryMode({ test: false, hash: "#nope", linkKey: "abc123" }), "off", "wrong key");
});

test("notify.deliveryMode: test/preview mode always sends (marked TEST); no key configured = always real", () => {
  eq(App.notify.deliveryMode({ test: true, hash: "", linkKey: "abc123" }), "test");
  eq(App.notify.deliveryMode({ test: true, hash: "#abc123", linkKey: "abc123" }), "test");
  eq(App.notify.deliveryMode({ test: false, hash: "", linkKey: "" }), "real");
});
