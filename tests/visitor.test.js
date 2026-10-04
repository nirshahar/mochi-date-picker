const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  cubot: "Mozilla/5.0 (Linux; Android 12; CUBOT_P60) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  headless: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36",
  whatsapp: "WhatsApp/2.24.6.77 A",
  slack: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
};

test("visitor.looksLikeBot: real phones and browsers are people", () => {
  ["iphone", "chrome", "cubot"].forEach((k) => eq(App.visitor.looksLikeBot({ userAgent: UA[k] }), false, k));
});

test("visitor.looksLikeBot: crawlers, link previewers and headless browsers are bots", () => {
  ["googlebot", "headless", "whatsapp", "slack", "facebook"].forEach((k) =>
    eq(App.visitor.looksLikeBot({ userAgent: UA[k] }), true, k));
});

test("visitor.looksLikeBot: automation (navigator.webdriver) is a bot even with a normal UA", () => {
  eq(App.visitor.looksLikeBot({ userAgent: UA.chrome, webdriver: true }), true);
});

test("visitor.onFirstHumanInput: fires once, on the first real input, then stops listening", () => {
  const target = document.createElement("div");
  let calls = 0;
  App.visitor.onFirstHumanInput(target, () => { calls += 1; });
  eq(calls, 0, "nothing before any input");
  target.dispatchEvent(new Event("pointermove"));
  target.dispatchEvent(new Event("keydown"));
  target.dispatchEvent(new Event("touchstart"));
  eq(calls, 1);
});

test("visitor.onFirstHumanInput: a scroll or tap alone is enough", () => {
  ["scroll", "pointerdown", "touchstart", "wheel", "keydown"].forEach((type) => {
    const target = document.createElement("div");
    let calls = 0;
    App.visitor.onFirstHumanInput(target, () => { calls += 1; });
    target.dispatchEvent(new Event(type));
    eq(calls, 1, type);
  });
});
