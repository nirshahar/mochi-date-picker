// Push notifications to your phone through ntfy.sh (fire-and-forget).
window.App = window.App || {};

(function () {
  // "real" for the secret link, "test" while previewing (?test etc.), "off" for everyone else.
  function deliveryMode({ test, hash, linkKey }) {
    if (test) return "test";
    if (!linkKey || hash === `#${linkKey}`) return "real";
    return "off";
  }

  function openMessage(onPhone) {
    return {
      title: `👀 ${CONFIG.herName} just opened the page`,
      message: onPhone ? "on a phone" : "on a computer",
    };
  }

  function yesMessage(attempts) {
    const plural = attempts === 1 ? "no-attempt" : "no-attempts";
    return {
      title: `${CONFIG.herName} said YES! 💕`,
      message: attempts === 0 ? "Didn't even try to say no 🥹" : `After ${attempts} ${plural} 😼`,
    };
  }

  // Sent as soon as she taps an activity, before she has picked the day.
  function activityMessage(idea, changed) {
    const choice = `${idea.emoji} ${idea.title} (now picking a day…)`;
    return changed
      ? { title: `🎯 ${CONFIG.herName} is changing her pick`, message: `→ ${choice}` }
      : { title: `🎯 ${CONFIG.herName} picked an activity`, message: choice };
  }

  function pickMessage(idea, day, changed) {
    const choice = `${idea.emoji} ${idea.title} · ${day.name}`;
    return changed
      ? { title: `${CONFIG.herName} changed her pick`, message: `→ ${choice}` }
      : { title: `${CONFIG.herName} picked a date! 🐾`, message: choice };
  }

  // Emoji aren't allowed in HTTP headers, so everything goes in a JSON body posted to the root URL.
  // A text body with no custom headers is a "simple" request: no CORS preflight, nothing to read back.
  function send(msg, { test = false, topic = CONFIG.ntfyTopic, fetchFn = (...args) => window.fetch(...args) } = {}) {
    const payload = {
      topic,
      title: (test ? "🧪 TEST " : "") + msg.title,
      message: msg.message,
      tags: ["cat", "heart"],
      priority: 4,
    };
    try {
      const request = fetchFn("https://ntfy.sh/", {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        body: JSON.stringify(payload),
      });
      if (request && typeof request.catch === "function") request.catch(() => {});
    } catch (err) {
      // Never show her an error.
    }
    return payload;
  }

  App.notify = { deliveryMode, openMessage, yesMessage, activityMessage, pickMessage, send };
})();
