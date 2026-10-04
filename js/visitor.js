// Telling a real visitor from a bot, so scrapers don't trigger the "opened the page" push.
window.App = window.App || {};

(function () {
  // Crawlers, link-preview fetchers and headless browsers. `bot\b` skips phone models like "CUBOT_P60".
  const BOT_UA = /bot\b|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|embedly|preview|^whatsapp\//i;

  function looksLikeBot(nav) {
    return nav.webdriver === true || BOT_UA.test(nav.userAgent || "");
  }

  // Scrapers load the page and leave; people move the mouse, tap, scroll or type.
  const HUMAN_EVENTS = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"];

  function onFirstHumanInput(target, fn) {
    const opts = { capture: true, passive: true };
    function handler() {
      HUMAN_EVENTS.forEach((type) => target.removeEventListener(type, handler, opts));
      fn();
    }
    HUMAN_EVENTS.forEach((type) => target.addEventListener(type, handler, opts));
  }

  App.visitor = { looksLikeBot, onFirstHumanInput };
})();
