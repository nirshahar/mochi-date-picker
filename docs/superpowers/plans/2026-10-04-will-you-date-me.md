# "Will You Date Me, {HER}?" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cat-themed "will you date me" page for {HER}. Mochi the cat sabotages the "No" button in five escalating ways. After YES there's a celebration, a date-idea picker and an "official date ticket", and a push notification reaches the author's phone through ntfy.sh.

**Architecture:** A static site with no build step. Classic `<script>` tags (not modules) attach everything to one global `App` namespace, plus a global `CONFIG` that holds all the copy. Pure logic lives in `geometry.js`, `escalation.js` and `notify.js` and is unit-tested in headless Chrome. The DOM and animation code (`fx.js`, `no-button.js`, `celebration.js`) is checked with headless screenshots and by hand. The cats are inline SVG strings. Animations use the Web Animations API (`el.animate(...).finished`) for sequencing, plus CSS keyframes for looping effects.

**Tech Stack:** HTML, CSS, vanilla JS (ES2020), Google Fonts (Fredoka), ntfy.sh. Python 3 runs the tests and screenshots through Windows Chrome headless from WSL. There's no Node and no npm.

**Spec:** `docs/superpowers/specs/2026-10-04-will-you-date-me-design.md`

## Global Constraints

- No frameworks, npm, bundler or ES modules. Every JS file is a classic script that starts with `window.App = window.App || {};`. The only globals are `App` and `CONFIG`.
- It must work when `index.html` is opened directly (`file://`) and from any static host.
- All user-facing copy is English and lives in `js/config.js`, word for word as given in Task 1.
- Font: `"Fredoka", "Trebuchet MS", system-ui, sans-serif`, loaded from Google Fonts.
- The "No" button reacts to `pointerdown` (mouse and touch) and to keyboard clicks (`click` with `detail === 0`). Nothing depends on hover alone; the hover tease is an extra.
- Notifications are fire-and-forget. {HER} must never see an error, and a failed request can't break the page.
- Targets are the latest desktop Chrome and Firefox. The layout must not break at 375px wide.
- Script load order (index.html and tests/test.html): `config, cats, geometry, fx, escalation, notify, no-button, celebration, date-picker, main`.
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Emoji in notification titles.** Sending the title as an HTTP header makes `fetch` throw ("{HER} said YES! 💕" isn't ISO-8859-1), so the notification would silently never arrive. Expected: the title goes in the JSON body and no custom headers are sent. *Test: Task 4, "notify.send: JSON body to the ntfy root, emoji safe".*
2. **Fast or repeated clicks on No during an animation.** Expected: they're ignored, no step is skipped, and two steps never run at once. *Test: Task 3, "clicks during an animation are ignored".*
3. **A step's animation throws** (old browser, element removed mid-animation). Expected: the button doesn't freeze; the step's end state is applied and the next attempt works. *Test: Task 3, "a failing step still settles and frees the button".*
4. **Tiny viewports, crowded screens, window resize.** Expected: No always stays fully on screen and falls back to the emptiest corner. *Tests: Task 2, "falls back to the emptiest corner", "safeCorner never leaves the viewport", "works on a viewport smaller than the button", "clampToViewport pulls an off-screen button back in".*
5. **YES clicked twice, or clicked while Mochi is mid-trick.** Expected: one celebration and one YES notification, and no stray cats, paws or No button on the date and ticket screens. *Tests: Task 6, "fx.once: YES can only fire once" and "leaving the question screen hides every leftover cat/paw/button".*

---

## File map

| File | Responsibility | Task |
|------|----------------|------|
| `index.html` | Markup for the 3 screens, the `#stage` and `#rain` overlay layers, script tags | 1 |
| `styles.css` | All styling and keyframes, built up section by section | 1, 5, 6, 8, 9 |
| `js/config.js` | `CONFIG`: names, copy, escalation table, date ideas, ntfy topic | 1 |
| `js/cats.js` | `App.cats`: SVG strings for Mochi, Biscuit, the paw, paw print, cat face and heart | 5 |
| `js/geometry.js` | `App.geo`: pure geometry | 2 |
| `js/fx.js` | `App.fx`: DOM and animation helpers | 6 |
| `js/escalation.js` | `App.createEscalation`: attempt counter and busy lock | 3 |
| `js/notify.js` | `App.notify`: message text and the ntfy sender | 4 |
| `js/no-button.js` | `App.setupNoButton`: the five tricks, hover tease, input wiring | 7, 8 |
| `js/celebration.js` | `App.celebrate`, `App.catRain` | 9 |
| `js/date-picker.js` | `App.dates`: date cards and ticket | 9 |
| `js/main.js` | `App.parseParams`, `App.showScreen`, init and wiring | 6, 7, 9 |
| `tests/harness.js`, `tests/test.html`, `tests/run.py` | In-browser test runner, run headless | 1 |
| `tests/*.test.js` | Unit tests | 1–6, 9 |
| `tests/shot.py` | Headless screenshot tool for visual checks | 1 |
| `tests/gallery.html` | Shows every cat drawing and mood on one page | 5 |
| `README.md` | Setup (ntfy), editing, debug parameters, tests | 10 |

---

### Task 1: Scaffold, config and test runner

**Files:**
- Create: `index.html`, `styles.css`, `js/config.js`
- Create: `tests/harness.js`, `tests/test.html`, `tests/run.py`, `tests/shot.py`, `tests/config.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: global `CONFIG` with `herName, fromName, catName, sittingCatName, ntfyTopic, text{question, yes, no, yayTitle, yaySub, datesTitle, ticketNote, changePick, purr, mrrp, leftChat}, attempts[5]{noLabel, caption, yesScale, noSize}, dateIdeas[5]{emoji, title, blurb}`.
- Produces: the test helpers `test(name, fn)`, `assert(cond, msg)` and `eq(actual, expected, msg)` (JSON comparison, so key order matters). `fn` may be async.
- Produces: DOM ids `app, screen-question, mochi, question-title, yay-sub, yes-btn, no-btn, caption, screen-dates, dates-title, date-cards, screen-ticket, ticket, ticket-note, change-pick, stage, rain`.

- [ ] **Step 1: Write the test harness**

`tests/harness.js`:
```js
// Tiny in-browser test harness. Run with: python3 tests/run.py
(function () {
  const tests = [];
  const errors = [];
  window.addEventListener("error", (e) => {
    errors.push(`error: ${e.message} (${(e.filename || "").split("/").pop()}:${e.lineno})`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    errors.push(`unhandled rejection: ${e.reason && e.reason.message ? e.reason.message : e.reason}`);
  });

  window.test = (name, fn) => tests.push({ name, fn });
  window.assert = (cond, msg = "assertion failed") => {
    if (!cond) throw new Error(msg);
  };
  window.eq = (actual, expected, msg = "") => {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${msg ? `${msg}: ` : ""}expected ${e}, got ${a}`);
  };

  window.runTests = async function () {
    const out = [];
    let failed = 0;
    for (const t of tests) {
      try {
        await t.fn();
        out.push(`PASS ${t.name}`);
      } catch (err) {
        failed += 1;
        out.push(`FAIL ${t.name} — ${err.message}`);
      }
    }
    await new Promise((r) => setTimeout(r, 50)); // let late rejections surface
    errors.forEach((m) => out.push(`FAIL ${m}`));
    failed += errors.length;
    out.push(failed ? `${failed} FAILED (${tests.length} tests)` : `ALL ${tests.length} PASSED`);
    document.getElementById("results").textContent = out.join("\n");
  };
})();
```

`tests/test.html`. It lists every source and test file from the start. A file that doesn't exist yet just fails to load, so its tests don't run, or tests that depend on it fail:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tests</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <pre id="results">running…</pre>
  <script src="harness.js"></script>
  <script src="../js/config.js"></script>
  <script src="../js/cats.js"></script>
  <script src="../js/geometry.js"></script>
  <script src="../js/fx.js"></script>
  <script src="../js/escalation.js"></script>
  <script src="../js/notify.js"></script>
  <script src="../js/no-button.js"></script>
  <script src="../js/celebration.js"></script>
  <script src="../js/date-picker.js"></script>
  <script src="../js/main.js"></script>
  <script src="config.test.js"></script>
  <script src="geometry.test.js"></script>
  <script src="escalation.test.js"></script>
  <script src="notify.test.js"></script>
  <script src="cats.test.js"></script>
  <script src="dates.test.js"></script>
  <script src="main.test.js"></script>
  <script>window.addEventListener("load", runTests);</script>
</body>
</html>
```

`tests/run.py`:
```python
#!/usr/bin/env python3
"""Run tests/test.html in headless Chrome and print the results.

Usage: python3 tests/run.py      (exit code 0 = all passed)
Uses Windows Chrome through WSL; override with CHROME=/path/to/chrome.
"""
import html
import os
import re
import subprocess
import sys

CHROME = os.environ.get("CHROME", "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe")
HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    page = subprocess.run(["wslpath", "-m", os.path.join(HERE, "test.html")],
                          capture_output=True, text=True, check=True).stdout.strip()
    result = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--virtual-time-budget=8000",
         "--dump-dom", "file:///" + page],
        capture_output=True, timeout=180,
    )
    dom = result.stdout.decode("utf-8", errors="replace")
    match = re.search(r'<pre id="results">(.*?)</pre>', dom, re.S)
    if not match:
        print("Could not find test results in the page output.")
        return 2
    text = html.unescape(match.group(1))
    print(text)
    return 0 if re.search(r"^ALL \d+ PASSED$", text, re.M) else 1


if __name__ == "__main__":
    sys.exit(main())
```

`tests/shot.py`:
```python
#!/usr/bin/env python3
"""Screenshot a page of this project in headless Chrome.

Usage: python3 tests/shot.py [page] [query] [ms] [WxH]
  e.g. python3 tests/shot.py index.html "?step=3" 1500 1280x800
`ms` is virtual time to let pass before the shot (animations included).
Prints the PNG path (saved under tests/screenshots/, which git ignores).
"""
import os
import re
import subprocess
import sys

CHROME = os.environ.get("CHROME", "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def wslpath(flag, path):
    return subprocess.run(["wslpath", flag, path], capture_output=True, text=True, check=True).stdout.strip()


def main():
    page = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    query = sys.argv[2] if len(sys.argv) > 2 else ""
    ms = sys.argv[3] if len(sys.argv) > 3 else "1500"
    size = sys.argv[4] if len(sys.argv) > 4 else "1280x800"
    out_dir = os.path.join(ROOT, "tests", "screenshots")
    os.makedirs(out_dir, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", f"{page}{query}-{ms}ms-{size}".lower()).strip("-")
    out = os.path.join(out_dir, slug + ".png")
    if os.path.exists(out):
        os.remove(out)
    url = "file:///" + wslpath("-m", os.path.join(ROOT, page)) + query
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--window-size={size.replace('x', ',')}", f"--virtual-time-budget={ms}",
         f"--screenshot={wslpath('-w', out)}", url],
        capture_output=True, timeout=120,
    )
    if not os.path.exists(out):
        print("Screenshot failed:", out)
        return 1
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

Append to `.gitignore`:
```
tests/screenshots/
```

- [ ] **Step 2: Write the failing config tests**

`tests/config.test.js`:
```js
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
  assert(/^{her}-date-[0-9a-f]{16}$/.test(CONFIG.ntfyTopic), CONFIG.ntfyTopic);
});

test("config: the question is addressed to {HER}", () => {
  eq(CONFIG.text.question, "{HER}, will you go on a date with me? 🐾");
});
```

- [ ] **Step 3: Run the tests and check they fail**

Run: `python3 tests/run.py`
Expected: exit code 1, with lines like `FAIL config: five escalation steps with a growing YES — CONFIG is not defined`.

- [ ] **Step 4: Generate the secret topic and write `js/config.js`**

Run: `python3 -c "import secrets; print(secrets.token_hex(8))"` and paste the 16 hex characters in place of `<16-hex-chars>` below.

`js/config.js`:
```js
// Everything you might want to edit lives in this file.
window.App = window.App || {};

const CONFIG = (() => {
  const HER = "{HER}";
  const CAT = "Mochi";
  const SITTER = "Biscuit";

  return {
    herName: HER,
    fromName: "", // your name; empty → "me"
    catName: CAT,
    sittingCatName: SITTER,
    // Secret ntfy.sh topic: subscribe to it in the ntfy app to get the notifications.
    ntfyTopic: "{her}-date-<16-hex-chars>",

    text: {
      question: `${HER}, will you go on a date with me? 🐾`,
      yes: "YES",
      no: "No",
      yayTitle: `YAAAY!! I knew it, ${HER} 💕`,
      yaySub: `${CAT} approves. (She never approves of anything.)`,
      datesTitle: "Okay, now the important part… pick our first date 😽",
      ticketNote: `Screenshot this and send it to me 😽 …actually, ${CAT} already told me.`,
      changePick: "change my pick",
      purr: "purr~ 💗",
      mrrp: "mrrp?!",
      leftChat: "no has left the chat 😼",
    },

    // One entry per "No" attempt, in order. noLabel / yesScale / noSize describe the buttons afterwards.
    attempts: [
      { noLabel: "Are you sure?", caption: `Oops! ${CAT}'s paw slipped 🐾`, yesScale: 1.25, noSize: 1 },
      { noLabel: "Really sure??", caption: `${CAT} is very protective of this button.`, yesScale: 1.5, noSize: 1 },
      { noLabel: "pls 🥺", caption: `${SITTER} is sitting on it. Sorry, those are the rules.`, yesScale: 1.8, noSize: 0.8 },
      { noLabel: "no", caption: "Cats don't take no for an answer.", yesScale: 2.2, noSize: 0.6 },
      { noLabel: "yes 💕", caption: `${CAT} brought it back. With a few edits.`, yesScale: 2.6, noSize: 1 },
    ],

    dateIdeas: [
      { emoji: "☕🐱", title: "Cat café", blurb: "Coffee, surrounded by judgmental cats." },
      { emoji: "🧺", title: "Picnic in the park", blurb: "Sandwiches, sunshine, maybe a stray cat." },
      { emoji: "🍿", title: "Movie night", blurb: "Blanket, snacks, you pick the movie." },
      { emoji: "🍦", title: "Sunset walk + ice cream", blurb: "Golden hour and two scoops." },
      { emoji: "🎁", title: "Surprise me", blurb: `Trust me (and ${CAT}).` },
    ],
  };
})();
```

- [ ] **Step 5: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 4 PASSED`, exit code 0.

- [ ] **Step 6: Write `index.html` and the base of `styles.css`**

`index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A question for {HER} 🐾</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐱</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="styles.css">
</head>
<body data-screen="question">
  <main id="app">
    <section id="screen-question" class="screen">
      <div id="mochi" class="mochi-spot"></div>
      <h1 id="question-title"></h1>
      <p id="yay-sub" class="sub" hidden></p>
      <div class="buttons">
        <button id="yes-btn" class="yes-btn" type="button"></button>
        <button id="no-btn" class="no-btn" type="button"></button>
      </div>
      <p id="caption" class="caption" aria-live="polite"></p>
    </section>

    <section id="screen-dates" class="screen" hidden>
      <h2 id="dates-title"></h2>
      <div id="date-cards" class="date-cards"></div>
    </section>

    <section id="screen-ticket" class="screen" hidden>
      <div id="ticket"></div>
      <p id="ticket-note" class="sub ticket-note"></p>
      <button id="change-pick" class="link-btn" type="button"></button>
    </section>
  </main>

  <div id="stage"></div>
  <div id="rain"></div>

  <script src="js/config.js"></script>
  <script src="js/cats.js"></script>
  <script src="js/geometry.js"></script>
  <script src="js/fx.js"></script>
  <script src="js/escalation.js"></script>
  <script src="js/notify.js"></script>
  <script src="js/no-button.js"></script>
  <script src="js/celebration.js"></script>
  <script src="js/date-picker.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

`styles.css` (the base section; later tasks append more sections):
```css
/* ---------- base ---------- */
:root {
  --bg: #fff1f4;
  --bg-2: #ffe1e9;
  --pink: #ff6b9a;
  --pink-dark: #e84d80;
  --pink-soft: #ffd3df;
  --ink: #5b3a4a;
  --muted: #9a7d8a;
  --grey: #c4b8be;
  --grey-dark: #a3959c;
  --font: "Fredoka", "Trebuchet MS", system-ui, sans-serif;
}

* { box-sizing: border-box; }

html, body { margin: 0; }

body {
  font-family: var(--font);
  color: var(--ink);
  background-color: var(--bg);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cg fill='%23ff6b9a' fill-opacity='0.08'%3E%3Cellipse cx='35' cy='42' rx='10' ry='8'/%3E%3Cellipse cx='23' cy='31' rx='4' ry='5'/%3E%3Cellipse cx='31' cy='24' rx='4' ry='5'/%3E%3Cellipse cx='40' cy='24' rx='4' ry='5'/%3E%3Cellipse cx='48' cy='31' rx='4' ry='5'/%3E%3Cellipse cx='105' cy='112' rx='10' ry='8'/%3E%3Cellipse cx='93' cy='101' rx='4' ry='5'/%3E%3Cellipse cx='101' cy='94' rx='4' ry='5'/%3E%3Cellipse cx='110' cy='94' rx='4' ry='5'/%3E%3Cellipse cx='118' cy='101' rx='4' ry='5'/%3E%3C/g%3E%3C/svg%3E"),
    radial-gradient(circle at 50% 30%, #fff 0%, var(--bg) 55%, var(--bg-2) 100%);
  background-attachment: fixed;
  overflow-x: hidden;
}

#app { min-height: 100vh; min-height: 100dvh; display: flex; }

.screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 24px 16px;
  text-align: center;
  animation: screen-in 0.5s ease-out;
}
.screen[hidden] { display: none; }
@keyframes screen-in { from { opacity: 0; } to { opacity: 1; } }

h1, h2 { margin: 0; font-weight: 700; line-height: 1.15; }
h1 { font-size: clamp(1.7rem, 4.5vw, 2.8rem); max-width: 20ch; }
h2 { font-size: clamp(1.4rem, 3.6vw, 2.2rem); max-width: 24ch; margin-bottom: 1rem; }
.sub { margin: 0; font-size: 1.15rem; color: var(--muted); }

.mochi-spot { width: 170px; cursor: pointer; -webkit-tap-highlight-color: transparent; }

/* ---------- buttons ---------- */
button {
  font-family: inherit;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
button:focus-visible { outline: 3px dashed var(--pink-dark); outline-offset: 4px; }

.buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  width: 100%;
  min-height: 190px;
}

.yes-btn {
  position: relative;
  z-index: 1;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.55em 1.7em;
  color: #fff;
  background: var(--pink);
  border: none;
  border-radius: 999px;
  box-shadow: 0 6px 0 var(--pink-dark), 0 10px 24px rgba(232, 77, 128, 0.3);
  scale: var(--yes-scale, 1);
  transition: scale 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s;
}
.yes-btn:hover { filter: brightness(1.06); }
.yes-btn:active { translate: 0 3px; box-shadow: 0 3px 0 var(--pink-dark); }
.yes-btn::before,
.yes-btn::after { /* cat ears */
  content: "";
  position: absolute;
  top: -14px;
  width: 26px;
  height: 22px;
  background: var(--pink);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  transform-origin: 50% 100%;
}
.yes-btn::before { left: 20%; rotate: -14deg; }
.yes-btn::after { right: 20%; rotate: 14deg; }

.no-btn {
  font-size: calc(1.1rem * var(--no-size, 1));
  font-weight: 600;
  padding: 0.55em 1.3em;
  color: #fff;
  background: var(--grey);
  border: none;
  border-radius: 999px;
  box-shadow: 0 5px 0 var(--grey-dark);
  white-space: nowrap;
}

.caption {
  min-height: 1.6em;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--pink-dark);
}
.caption.show { animation: caption-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes caption-in { from { opacity: 0; transform: translateY(8px) scale(0.9); } }

@media (max-width: 600px) {
  .mochi-spot { width: 130px; }
  .buttons { gap: 1.2rem; min-height: 160px; }
}
```

- [ ] **Step 7: Check the tests still pass and take a first screenshot**

Run: `python3 tests/run.py` → `ALL 4 PASSED`.
Run: `python3 tests/shot.py index.html "" 1000` and open the PNG with the Read tool.
Expected: the pink paw-print background and two empty pill buttons, the pink one with ears. The text is still empty because main.js comes in Task 6.

- [ ] **Step 8: Commit**

```bash
git add .gitignore index.html styles.css js/config.js tests/
git commit -m "feat: scaffold page, config and headless test runner" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Geometry (where No can land, where the paw comes from)

**Files:**
- Create: `js/geometry.js`
- Test: `tests/geometry.test.js`

**Interfaces:**
- Produces `App.geo`. Rects are `{x, y, w, h}`, sizes `{w, h}`, points `{x, y}`, viewports `{vw, vh}`:
  - `overlapArea(a, b, pad=0) → number`, `rectsOverlap(a, b, pad=0) → boolean`. `pad` grows `b` on every side.
  - `clampToViewport(pos, size, vp, margin=16) → {x, y}`
  - `safeCorner(size, vp, obstacles, {margin=16, pad=24}) → {x, y}`: the emptiest corner; bottom corners win ties.
  - `randomSafeSpot(size, vp, obstacles, {margin=16, pad=24, tries=30, rng=Math.random}) → {x, y}`
  - `nearestEdge(rect, vp) → "left"|"right"|"bottom"|"top"` (ties go in that order)
  - `contactPoint(rect, edge) → {x, y}`: the middle of the side that faces `edge`
  - `pawGeometry(edge, point, vp, {out=20, peek=34}) → {angle, hidden:{x,y}, peek:{x,y}}`
  - `PUSH`: `{left:{x:1,y:0}, right:{x:-1,y:0}, top:{x:0,y:1}, bottom:{x:0,y:-1}}`
  - `fitYesScale(desired, base{w,h}, vp, {sideRoom=32, maxHeight=170}) → number ≥ 1`
  - `distToRect(px, py, rect) → number`

- [ ] **Step 1: Write the failing tests**

`tests/geometry.test.js`:
```js
const VP = { vw: 1000, vh: 800 };
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test("geo.rectsOverlap: touching edges don't overlap, padding makes them", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  const b = { x: 10, y: 0, w: 10, h: 10 };
  eq(App.geo.rectsOverlap(a, b), false);
  eq(App.geo.rectsOverlap(a, b, 1), true);
});

test("geo.randomSafeSpot: stays inside the viewport and off obstacles", () => {
  const size = { w: 100, h: 40 };
  const yes = { x: 400, y: 300, w: 200, h: 200 };
  for (let i = 0; i < 200; i++) {
    const p = App.geo.randomSafeSpot(size, VP, [yes]);
    assert(p.x >= 16 && p.y >= 16 && p.x + 100 <= 984 && p.y + 40 <= 784, `out of bounds ${JSON.stringify(p)}`);
    eq(App.geo.rectsOverlap({ ...p, ...size }, yes, 24), false, "overlaps YES");
  }
});

test("geo.randomSafeSpot: retries past a blocked first guess", () => {
  const size = { w: 100, h: 40 };
  const leftHalf = { x: 0, y: 0, w: 500, h: 800 };
  const p = App.geo.randomSafeSpot(size, VP, [leftHalf], { rng: seq(0.1, 0.5, 0.9, 0.5) });
  assert(p.x > 524, `expected the right half, got x=${p.x}`);
});

test("geo.randomSafeSpot: falls back to the emptiest corner when nothing random fits", () => {
  const size = { w: 100, h: 40 };
  const mostOfScreen = { x: 0, y: 0, w: 1000, h: 700 };
  const p = App.geo.randomSafeSpot(size, VP, [mostOfScreen], { rng: () => 0.2 });
  eq(p, { x: 16, y: 744 });
});

test("geo.safeCorner: never leaves the viewport even if every corner is covered", () => {
  const p = App.geo.safeCorner({ w: 100, h: 40 }, VP, [{ x: 0, y: 0, w: 1000, h: 800 }]);
  assert(p.x >= 16 && p.y >= 16 && p.x <= 884 && p.y <= 744, JSON.stringify(p));
});

test("geo.safeCorner: works on a viewport smaller than the button", () => {
  eq(App.geo.safeCorner({ w: 300, h: 40 }, { vw: 200, vh: 100 }, []), { x: 16, y: 44 });
});

test("geo.clampToViewport: pulls an off-screen button back in (window resized)", () => {
  eq(App.geo.clampToViewport({ x: 1200, y: -50 }, { w: 100, h: 40 }, VP), { x: 884, y: 16 });
});

test("geo.nearestEdge: picks the closest side", () => {
  eq(App.geo.nearestEdge({ x: 20, y: 300, w: 100, h: 40 }, VP), "left");
  eq(App.geo.nearestEdge({ x: 880, y: 300, w: 100, h: 40 }, VP), "right");
  eq(App.geo.nearestEdge({ x: 450, y: 740, w: 100, h: 40 }, VP), "bottom");
  eq(App.geo.nearestEdge({ x: 450, y: 5, w: 100, h: 40 }, VP), "top");
});

test("geo.contactPoint: middle of the side facing the edge", () => {
  const r = { x: 100, y: 200, w: 80, h: 40 };
  eq(App.geo.contactPoint(r, "left"), { x: 100, y: 220 });
  eq(App.geo.contactPoint(r, "right"), { x: 180, y: 220 });
  eq(App.geo.contactPoint(r, "top"), { x: 140, y: 200 });
  eq(App.geo.contactPoint(r, "bottom"), { x: 140, y: 240 });
});

test("geo.pawGeometry: hidden just off-screen, peeking just inside", () => {
  const g = App.geo.pawGeometry("right", { x: 700, y: 300 }, VP);
  eq(g.angle, -90);
  eq(g.hidden, { x: 1020, y: 300 });
  eq(g.peek, { x: 966, y: 300 });
  eq(App.geo.pawGeometry("bottom", { x: 700, y: 300 }, VP).hidden, { x: 700, y: 820 });
  eq(App.geo.pawGeometry("left", { x: 700, y: 300 }, VP).angle, 90);
});

test("geo.fitYesScale: grows as asked but never past the screen", () => {
  const base = { w: 150, h: 50 };
  eq(App.geo.fitYesScale(2.2, base, VP), 2.2);
  eq(App.geo.fitYesScale(2.6, base, { vw: 375, vh: 667 }), (375 - 32) / 150);
  eq(App.geo.fitYesScale(2.6, base, { vw: 100, vh: 667 }), 1);
});

test("geo.distToRect: 0 inside, straight-line distance outside", () => {
  const r = { x: 100, y: 100, w: 50, h: 50 };
  eq(App.geo.distToRect(120, 120, r), 0);
  eq(App.geo.distToRect(100, 50, r), 50);
  eq(App.geo.distToRect(180, 190, r), 50);
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `python3 tests/run.py`
Expected: exit 1; the `geo.*` tests fail with `Cannot read properties of undefined (reading 'rectsOverlap')` or similar.

- [ ] **Step 3: Implement `js/geometry.js`**

```js
// Pure geometry helpers (no DOM). Rects are { x, y, w, h }, viewports { vw, vh }.
window.App = window.App || {};

(function () {
  function overlapArea(a, b, pad = 0) {
    const w = Math.min(a.x + a.w, b.x + b.w + pad) - Math.max(a.x, b.x - pad);
    const h = Math.min(a.y + a.h, b.y + b.h + pad) - Math.max(a.y, b.y - pad);
    return w > 0 && h > 0 ? w * h : 0;
  }

  function rectsOverlap(a, b, pad = 0) {
    return overlapArea(a, b, pad) > 0;
  }

  function clampToViewport(pos, size, vp, margin = 16) {
    const maxX = Math.max(margin, vp.vw - size.w - margin);
    const maxY = Math.max(margin, vp.vh - size.h - margin);
    return {
      x: Math.min(Math.max(pos.x, margin), maxX),
      y: Math.min(Math.max(pos.y, margin), maxY),
    };
  }

  // The corner whose spot overlaps obstacles the least (bottom corners win ties).
  function safeCorner(size, vp, obstacles, { margin = 16, pad = 24 } = {}) {
    const right = vp.vw - size.w - margin;
    const bottom = vp.vh - size.h - margin;
    const candidates = [
      { x: margin, y: bottom }, { x: right, y: bottom },
      { x: margin, y: margin }, { x: right, y: margin },
    ];
    let best = null;
    let bestArea = Infinity;
    candidates.forEach((c) => {
      const p = clampToViewport(c, size, vp, margin);
      const area = obstacles.reduce((sum, o) => sum + overlapArea({ ...p, ...size }, o, pad), 0);
      if (area < bestArea) {
        best = p;
        bestArea = area;
      }
    });
    return best;
  }

  function randomSafeSpot(size, vp, obstacles, { margin = 16, pad = 24, tries = 30, rng = Math.random } = {}) {
    const maxX = vp.vw - size.w - margin;
    const maxY = vp.vh - size.h - margin;
    if (maxX >= margin && maxY >= margin) {
      for (let i = 0; i < tries; i++) {
        const p = { x: margin + rng() * (maxX - margin), y: margin + rng() * (maxY - margin) };
        if (!obstacles.some((o) => rectsOverlap({ ...p, ...size }, o, pad))) return p;
      }
    }
    return safeCorner(size, vp, obstacles, { margin, pad });
  }

  function nearestEdge(rect, vp) {
    const d = {
      left: rect.x,
      right: vp.vw - (rect.x + rect.w),
      bottom: vp.vh - (rect.y + rect.h),
      top: rect.y,
    };
    return Object.keys(d).reduce((best, k) => (d[k] < d[best] ? k : best));
  }

  function contactPoint(rect, edge) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    return {
      left: { x: rect.x, y: cy },
      right: { x: rect.x + rect.w, y: cy },
      top: { x: cx, y: rect.y },
      bottom: { x: cx, y: rect.y + rect.h },
    }[edge];
  }

  // The paw is drawn pointing up with its tip at the top; these angles aim it in from each edge.
  const PAW_ANGLE = { bottom: 0, left: 90, right: -90, top: 180 };

  // Direction a swat from each edge pushes things.
  const PUSH = { left: { x: 1, y: 0 }, right: { x: -1, y: 0 }, top: { x: 0, y: 1 }, bottom: { x: 0, y: -1 } };

  // Where the paw tip sits when hidden just off-screen, or peeking in, lined up with `point`.
  function pawGeometry(edge, point, vp, { out = 20, peek = 34 } = {}) {
    const spots = {
      left: { hidden: { x: -out, y: point.y }, peek: { x: peek, y: point.y } },
      right: { hidden: { x: vp.vw + out, y: point.y }, peek: { x: vp.vw - peek, y: point.y } },
      top: { hidden: { x: point.x, y: -out }, peek: { x: point.x, y: peek } },
      bottom: { hidden: { x: point.x, y: vp.vh + out }, peek: { x: point.x, y: vp.vh - peek } },
    }[edge];
    return { angle: PAW_ANGLE[edge], hidden: spots.hidden, peek: spots.peek };
  }

  // YES grows as configured, but never wider than the screen or taller than its row.
  function fitYesScale(desired, base, vp, { sideRoom = 32, maxHeight = 170 } = {}) {
    const fit = Math.min((vp.vw - sideRoom) / base.w, maxHeight / base.h);
    return Math.max(1, Math.min(desired, fit));
  }

  function distToRect(px, py, r) {
    const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
    const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    return Math.hypot(dx, dy);
  }

  App.geo = {
    overlapArea, rectsOverlap, clampToViewport, safeCorner, randomSafeSpot,
    nearestEdge, contactPoint, pawGeometry, PUSH, fitYesScale, distToRect,
  };
})();
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 16 PASSED`.

- [ ] **Step 5: Commit**

```bash
git add js/geometry.js tests/geometry.test.js
git commit -m "feat: geometry helpers for safe spots and paw aiming" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Escalation state machine

**Files:**
- Create: `js/escalation.js`
- Test: `tests/escalation.test.js`

**Interfaces:**
- Produces `App.createEscalation({ steps, onConverted? })`, where `steps` is `Array<{ play: () => Promise<void>, settle: () => void }>`. `settle` applies the step's end state instantly.
- It returns `{ count, busy, converted }` (read-only getters), plus `attempt() → Promise<boolean>` (false means the attempt was ignored) and `skipTo(n)`.

- [ ] **Step 1: Write the failing tests**

`tests/escalation.test.js`:
```js
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
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `python3 tests/run.py`
Expected: exit 1; the `escalation:` tests fail with `App.createEscalation is not a function`.

- [ ] **Step 3: Implement `js/escalation.js`**

```js
// The "No" button's escalation: counts attempts and runs one step at a time.
window.App = window.App || {};

App.createEscalation = function ({ steps, onConverted = () => {} }) {
  let count = 0;
  let busy = false;
  let converted = false;

  function checkConverted() {
    if (!converted && count >= steps.length) {
      converted = true;
      onConverted();
    }
  }

  return {
    get count() { return count; },
    get busy() { return busy; },
    get converted() { return converted; },

    // Plays the next step. Resolves false when ignored (mid-animation or already converted).
    async attempt() {
      if (busy || converted) return false;
      busy = true;
      const step = steps[count];
      count += 1;
      try {
        await step.play();
      } catch (err) {
        console.error("escalation step failed", err);
        try { step.settle(); } catch (e) { console.error("settle failed", e); }
      } finally {
        busy = false;
      }
      checkConverted();
      return true;
    },

    // Jumps straight to the end state of the first n steps (debug ?step=N).
    skipTo(n) {
      const target = Math.max(0, Math.min(n, steps.length));
      while (count < target) {
        steps[count].settle();
        count += 1;
      }
      checkConverted();
    },
  };
};
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 21 PASSED`. A `console.error` for "boom" is expected; it doesn't appear in the results.

- [ ] **Step 5: Commit**

```bash
git add js/escalation.js tests/escalation.test.js
git commit -m "feat: escalation state machine with busy lock" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ntfy notifications

**Files:**
- Create: `js/notify.js`
- Test: `tests/notify.test.js`

**Interfaces:**
- Consumes `CONFIG.herName` and `CONFIG.ntfyTopic`.
- Produces `App.notify`:
  - `yesMessage(attempts: number) → {title, message}`
  - `pickMessage(idea: {emoji, title}, changed: boolean) → {title, message}`
  - `send(msg, {test=false, topic=CONFIG.ntfyTopic, fetchFn}) → payload`. It never throws, and the returned payload is for tests.

- [ ] **Step 1: Write the failing tests**

`tests/notify.test.js`:
```js
test("notify.yesMessage: counts attempts with the right plural", () => {
  eq(App.notify.yesMessage(0), { title: "{HER} said YES! 💕", message: "Didn't even try to say no 🥹" });
  eq(App.notify.yesMessage(1).message, "After 1 no-attempt 😼");
  eq(App.notify.yesMessage(5).message, "After 5 no-attempts 😼");
});

test("notify.pickMessage: first pick vs changed pick", () => {
  const idea = { emoji: "🍿", title: "Movie night" };
  eq(App.notify.pickMessage(idea, false), { title: "{HER} picked a date! 🐾", message: "🍿 Movie night" });
  eq(App.notify.pickMessage(idea, true), { title: "{HER} changed her pick", message: "→ 🍿 Movie night" });
});

test("notify.send: JSON body to the ntfy root, emoji safe (no custom headers)", () => {
  let call = null;
  App.notify.send({ title: "{HER} said YES! 💕", message: "hi" }, {
    topic: "t-123",
    fetchFn: (url, opts) => { call = { url, opts }; return Promise.resolve(); },
  });
  eq(call.url, "https://ntfy.sh/");
  eq(call.opts.method, "POST");
  eq(call.opts.mode, "no-cors");
  eq(call.opts.keepalive, true);
  eq(call.opts.headers, undefined);
  eq(JSON.parse(call.opts.body), {
    topic: "t-123", title: "{HER} said YES! 💕", message: "hi", tags: ["cat", "heart"], priority: 4,
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
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `python3 tests/run.py`
Expected: exit 1; the `notify.*` tests fail with `Cannot read properties of undefined`.

- [ ] **Step 3: Implement `js/notify.js`**

```js
// Push notifications to your phone through ntfy.sh (fire-and-forget).
window.App = window.App || {};

(function () {
  function yesMessage(attempts) {
    const plural = attempts === 1 ? "no-attempt" : "no-attempts";
    return {
      title: `${CONFIG.herName} said YES! 💕`,
      message: attempts === 0 ? "Didn't even try to say no 🥹" : `After ${attempts} ${plural} 😼`,
    };
  }

  function pickMessage(idea, changed) {
    const choice = `${idea.emoji} ${idea.title}`;
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
      // Never bother {HER} with errors.
    }
    return payload;
  }

  App.notify = { yesMessage, pickMessage, send };
})();
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 26 PASSED`.

- [ ] **Step 5: Live check that ntfy accepts this exact request shape**

The unit tests can't prove the server reads a JSON body sent as `text/plain` on the root URL. This check uses a throwaway `-check` suffix on the topic, so nobody gets notified. Replace `<topic>` with `CONFIG.ntfyTopic`:
```bash
curl -s -H 'Content-Type: text/plain;charset=UTF-8' \
  -d '{"topic":"<topic>-check","title":"🧪 TEST hello","message":"from curl","tags":["cat","heart"],"priority":4}' \
  https://ntfy.sh/
```
Expected: a JSON reply containing `"event":"message"`, `"topic":"<topic>-check"` and `"title":"🧪 TEST hello"`. If the title comes back missing or garbled, stop and report it instead of continuing.

- [ ] **Step 6: Commit**

```bash
git add js/notify.js tests/notify.test.js
git commit -m "feat: ntfy push notifications (JSON body, fire-and-forget)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The cats (SVG art + mood styles)

**Files:**
- Create: `js/cats.js`, `tests/gallery.html`
- Modify: `styles.css` (append the "cats" section)
- Test: `tests/cats.test.js`

**Interfaces:**
- Produces `App.cats`, whose functions return SVG markup strings:
  - `mochi()`: `<svg class="cat mochi" data-mood="">` with parts `.tail, .ear.ear-l, .ear.ear-r, .eyes-open > .pupils, .lids, .eyes-happy, .mouth, .mouth-smug`. Moods are set with `svg.dataset.mood = "" | "suspicious" | "smug" | "alarmed" | "happy"`, and the classes `blink` and `tail-fast` go on the svg. The viewBox is 200×220 and the mouth sits at (50%, 50%).
  - `biscuit()`: viewBox 220×150, a grey loaf with closed eyes.
  - `paw()`: viewBox 90×220 with the tip at (45, 0), pointing up. The arm runs far past the bottom, so the svg needs `overflow: visible`.
  - `pawPrint(color)`, `catFace(fur, eye)`, `heart(color)`
  - `FUR`: `[[fur, eye] × 4]`

- [ ] **Step 1: Write the failing tests**

`tests/cats.test.js`:
```js
function parseSvg(markup) {
  const div = document.createElement("div");
  div.innerHTML = markup.trim();
  return div.firstElementChild;
}

test("cats.mochi: has every part the moods and animations use", () => {
  const svg = parseSvg(App.cats.mochi());
  eq(svg.tagName.toLowerCase(), "svg");
  [".tail", ".ear-l", ".ear-r", ".eyes-open", ".pupils", ".lids", ".eyes-happy", ".mouth", ".mouth-smug"]
    .forEach((sel) => assert(svg.querySelector(sel), `missing ${sel}`));
  eq(svg.dataset.mood, "");
  eq(svg.getAttribute("viewBox"), "0 0 200 220");
});

test("cats: biscuit, paw and confetti pieces are SVGs", () => {
  [App.cats.biscuit(), App.cats.paw(), App.cats.pawPrint("#000"), App.cats.catFace("#000", "#fff"), App.cats.heart("#f00")]
    .forEach((markup) => eq(parseSvg(markup).tagName.toLowerCase(), "svg"));
  eq(parseSvg(App.cats.paw()).getAttribute("viewBox"), "0 0 90 220");
});

test("cats.FUR: four fur colours, each with an eye colour", () => {
  eq(App.cats.FUR.length, 4);
  App.cats.FUR.forEach(([fur, eye]) => assert(fur && eye, "fur + eye"));
});

test("cats.mochi: mood styles show and hide the right parts", () => {
  const host = document.createElement("div");
  host.innerHTML = App.cats.mochi();
  document.body.appendChild(host);
  const svg = host.firstElementChild;
  const shown = (sel) => getComputedStyle(svg.querySelector(sel)).display !== "none";
  eq(shown(".eyes-happy"), false, "happy eyes hidden by default");
  svg.dataset.mood = "happy";
  eq(shown(".eyes-happy"), true, "happy eyes when happy");
  eq(shown(".eyes-open"), false, "open eyes hidden when happy");
  svg.dataset.mood = "smug";
  eq(shown(".lids"), true, "lids when smug");
  eq(shown(".mouth-smug"), true, "smug mouth when smug");
  host.remove();
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `python3 tests/run.py`
Expected: exit 1; the `cats` tests fail (`App.cats` is undefined).

- [ ] **Step 3: Implement `js/cats.js`**

```js
// Hand-drawn SVG cats. Every function returns an SVG markup string.
window.App = window.App || {};

(function () {
  const ORANGE = "#F6A65A";
  const ORANGE_DARK = "#D9823A";
  const CREAM = "#FFE8C7";
  const PINK = "#FFB5C8";
  const INK = "#3B2A33";
  const NOSE = "#FF6B9A";
  const GREY = "#A3ACB9";
  const GREY_DARK = "#87919E";

  // Mochi: the cream-and-orange tabby who guards the No button.
  function mochi() {
    return `
<svg class="cat mochi" viewBox="0 0 200 220" data-mood="" aria-hidden="true">
  <path class="tail" d="M146 196 C 196 192, 204 136, 176 112" stroke="${ORANGE}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <ellipse cx="100" cy="166" rx="58" ry="50" fill="${ORANGE}"/>
  <ellipse cx="100" cy="176" rx="33" ry="35" fill="${CREAM}"/>
  <ellipse cx="78" cy="210" rx="16" ry="9" fill="${CREAM}"/>
  <ellipse cx="122" cy="210" rx="16" ry="9" fill="${CREAM}"/>
  <g class="ear ear-l"><path d="M50 74 L56 18 L96 50 Z" fill="${ORANGE}"/><path d="M59 62 L62 31 L84 50 Z" fill="${PINK}"/></g>
  <g class="ear ear-r"><path d="M150 74 L144 18 L104 50 Z" fill="${ORANGE}"/><path d="M141 62 L138 31 L116 50 Z" fill="${PINK}"/></g>
  <ellipse cx="100" cy="90" rx="60" ry="50" fill="${ORANGE}"/>
  <path d="M100 42 v14 M85 45 l3 11 M115 45 l-3 11" stroke="${ORANGE_DARK}" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="100" cy="110" rx="25" ry="16" fill="${CREAM}"/>
  <circle cx="60" cy="106" r="9" fill="${NOSE}" opacity=".35"/>
  <circle cx="140" cy="106" r="9" fill="${NOSE}" opacity=".35"/>
  <g class="eyes-open"><g class="pupils">
    <ellipse cx="78" cy="86" rx="9" ry="11" fill="${INK}"/><circle cx="81" cy="82" r="3.2" fill="#fff"/>
    <ellipse cx="122" cy="86" rx="9" ry="11" fill="${INK}"/><circle cx="125" cy="82" r="3.2" fill="#fff"/>
  </g></g>
  <g class="lids" fill="${ORANGE}">
    <rect x="66" y="72" width="24" height="13"/><rect x="110" y="72" width="24" height="13"/>
    <path d="M67 85 H89 M111 85 H133" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <g class="eyes-happy" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round">
    <path d="M68 90 Q78 76 88 90"/><path d="M112 90 Q122 76 132 90"/>
  </g>
  <path d="M94 102 H106 L100 109 Z" fill="${NOSE}"/>
  <path class="mouth" d="M100 109 Q95 117 88 112 M100 109 Q105 117 112 112" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path class="mouth-smug" d="M89 114 Q102 118 113 108" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M36 102 L68 106 M36 114 L68 111 M164 102 L132 106 M164 114 L132 111" stroke="${ORANGE_DARK}" stroke-width="2" stroke-linecap="round"/>
</svg>`;
  }

  // Biscuit: a chubby grey loaf, always asleep.
  function biscuit() {
    return `
<svg class="cat biscuit" viewBox="0 0 220 150" aria-hidden="true">
  <path d="M46 62 L58 12 L98 44 Z" fill="${GREY}"/><path d="M57 50 L62 26 L84 44 Z" fill="${PINK}"/>
  <path d="M174 62 L162 12 L122 44 Z" fill="${GREY}"/><path d="M163 50 L158 26 L136 44 Z" fill="${PINK}"/>
  <rect x="18" y="38" width="184" height="106" rx="53" fill="${GREY}"/>
  <path d="M95 44 v12 M110 42 v13 M125 44 v12" stroke="${GREY_DARK}" stroke-width="5" stroke-linecap="round"/>
  <g stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round">
    <path d="M70 84 Q80 92 90 84"/><path d="M130 84 Q140 92 150 84"/>
    <path d="M110 103 Q104 110 98 106 M110 103 Q116 110 122 106" stroke-width="2.5"/>
  </g>
  <path d="M104 96 H116 L110 103 Z" fill="${NOSE}"/>
  <circle cx="62" cy="100" r="9" fill="${NOSE}" opacity=".35"/>
  <circle cx="158" cy="100" r="9" fill="${NOSE}" opacity=".35"/>
  <path d="M34 136 Q110 152 186 132" stroke="${GREY_DARK}" stroke-width="13" fill="none" stroke-linecap="round"/>
</svg>`;
  }

  // A big toe-bean paw pointing up, tip at (45, 0). The arm runs far below so it reaches any edge.
  function paw() {
    return `
<svg class="paw" viewBox="0 0 90 220" aria-hidden="true">
  <rect x="17" y="40" width="56" height="2400" rx="28" fill="${ORANGE}"/>
  <path d="M28 120 h34 M28 160 h34 M28 200 h34 M28 240 h34" stroke="${ORANGE_DARK}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="16" cy="24" r="13" fill="${ORANGE}"/><circle cx="35" cy="12" r="13" fill="${ORANGE}"/>
  <circle cx="55" cy="12" r="13" fill="${ORANGE}"/><circle cx="74" cy="24" r="13" fill="${ORANGE}"/>
  <ellipse cx="45" cy="48" rx="38" ry="34" fill="${ORANGE}"/>
  <ellipse cx="45" cy="56" rx="16" ry="12" fill="${PINK}"/>
  <ellipse cx="18" cy="28" rx="6" ry="7" fill="${PINK}"/><ellipse cx="36" cy="17" rx="6" ry="7" fill="${PINK}"/>
  <ellipse cx="54" cy="17" rx="6" ry="7" fill="${PINK}"/><ellipse cx="72" cy="28" rx="6" ry="7" fill="${PINK}"/>
</svg>`;
  }

  function pawPrint(color) {
    return `<svg viewBox="0 0 50 50" aria-hidden="true"><g fill="${color}">
  <ellipse cx="25" cy="33" rx="12" ry="10"/><ellipse cx="10" cy="20" rx="5" ry="6.5"/><ellipse cx="20" cy="11" rx="5" ry="6.5"/>
  <ellipse cx="31" cy="11" rx="5" ry="6.5"/><ellipse cx="40" cy="20" rx="5" ry="6.5"/></g></svg>`;
  }

  function catFace(fur, eye = INK) {
    return `<svg viewBox="0 0 60 54" aria-hidden="true">
  <path d="M8 26 L10 2 L28 14 Z M52 26 L50 2 L32 14 Z" fill="${fur}"/>
  <ellipse cx="30" cy="32" rx="25" ry="20" fill="${fur}"/>
  <circle cx="21" cy="30" r="3" fill="${eye}"/><circle cx="39" cy="30" r="3" fill="${eye}"/>
  <path d="M27 37 H33 L30 40 Z" fill="${NOSE}"/></svg>`;
  }

  function heart(color) {
    return `<svg viewBox="0 0 50 46" aria-hidden="true"><path d="M25 44 C 10 32, 2 24, 2 14 A 12 12 0 0 1 25 9 A 12 12 0 0 1 48 14 C 48 24, 40 32, 25 44 Z" fill="${color}"/></svg>`;
  }

  // [fur, eye] pairs for the cat rain: ginger, grey, black, cream.
  const FUR = [[ORANGE, INK], [GREY, INK], ["#4A3B42", "#FFE08A"], ["#FFF3E2", INK]];

  App.cats = { mochi, biscuit, paw, pawPrint, catFace, heart, FUR };
})();
```

- [ ] **Step 4: Append the cats section to `styles.css`**

```css
/* ---------- cats ---------- */
.mochi-spot svg { display: block; width: 100%; height: auto; overflow: visible; }

.cat .ear,
.cat .tail,
.cat .eyes-open { transform-box: fill-box; }

.cat .ear { transform-origin: 50% 100%; transition: transform 0.2s ease; }
.cat[data-mood="alarmed"] .ear-l { transform: rotate(-38deg) translateY(6px); }
.cat[data-mood="alarmed"] .ear-r { transform: rotate(38deg) translateY(6px); }

.cat .eyes-open { transform-origin: 50% 50%; transition: transform 0.07s; }
.cat.blink .eyes-open { transform: scaleY(0.1); }

.cat .tail { transform-origin: 0% 100%; animation: swish 2.6s ease-in-out infinite alternate; }
.cat.tail-fast .tail { animation-duration: 0.8s; }
@keyframes swish { from { transform: rotate(-10deg); } to { transform: rotate(12deg); } }

.cat .lids,
.cat .eyes-happy,
.cat .mouth-smug { display: none; }
.cat[data-mood="suspicious"] .lids,
.cat[data-mood="smug"] .lids { display: inline; }
.cat[data-mood="smug"] .mouth { display: none; }
.cat[data-mood="smug"] .mouth-smug { display: inline; }
.cat[data-mood="happy"] .eyes-open { display: none; }
.cat[data-mood="happy"] .eyes-happy { display: inline; }
```

- [ ] **Step 5: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 30 PASSED`.

- [ ] **Step 6: Build the gallery and check the drawings**

`tests/gallery.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Cat gallery</title>
  <link rel="stylesheet" href="../styles.css">
  <style>
    .row { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; align-items: flex-end; }
    .cell { width: 150px; text-align: center; font-family: var(--font); }
    .cell svg { display: block; width: 100%; height: auto; }
    .paw-cell { height: 240px; overflow: hidden; }
    .paw-cell svg { width: 90px; overflow: visible; margin: 10px auto 0; }
    .small { width: 60px; }
  </style>
</head>
<body>
  <div class="row" id="moods"></div>
  <div class="row" id="others"></div>
  <script src="../js/cats.js"></script>
  <script>
    const add = (rowId, markup, label, cls = "cell") => {
      const cell = document.createElement("div");
      cell.className = cls;
      cell.innerHTML = `${markup}<div>${label}</div>`;
      document.getElementById(rowId).appendChild(cell);
      return cell.querySelector("svg");
    };
    ["", "suspicious", "smug", "alarmed", "happy"].forEach((mood) => {
      add("moods", App.cats.mochi(), mood || "neutral").dataset.mood = mood;
    });
    add("moods", App.cats.mochi(), "blink").classList.add("blink");
    add("others", App.cats.biscuit(), "Biscuit");
    add("others", App.cats.paw(), "paw", "cell paw-cell");
    App.cats.FUR.forEach(([fur, eye]) => add("others", App.cats.catFace(fur, eye), "face", "cell small"));
    add("others", App.cats.pawPrint("#e84d80"), "print", "cell small");
    add("others", App.cats.heart("#ff6b9a"), "heart", "cell small");
  </script>
</body>
</html>
```
Run: `python3 tests/shot.py tests/gallery.html "" 500 1280x800` and look at the PNG with the Read tool.
Expected:
- Six Mochis. Neutral has round eyes. Suspicious has half-closed lids. Smug has lids and a lopsided smirk. Alarmed has its ears tilted outward and flattened. Happy has ^ ^ eyes. Blink has flat eyes.
- A grey sleeping loaf with closed curved eyes and a tail along the bottom.
- A paw with four toes and pink beans.
- Four cat faces (ginger, grey, black with yellow eyes, cream), a paw print and a heart.

If a part looks wrong (an ear detached from the head, a lid covering the wrong area), adjust the SVG coordinates in `cats.js` and re-shoot.

- [ ] **Step 7: Commit**

```bash
git add js/cats.js styles.css tests/cats.test.js tests/gallery.html
git commit -m "feat: SVG cats (Mochi moods, Biscuit, paw, confetti)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Effects layer and the question screen

**Files:**
- Create: `js/fx.js`, `js/main.js`
- Modify: `styles.css` (append the "stage and effects" section)
- Test: `tests/main.test.js`

**Interfaces:**
- Consumes `App.cats` and `App.geo` (`pawGeometry`, `PUSH`).
- Produces `App.fx`:
  - `wait(ms) → Promise`, `once(fn) → fn`
  - `stage() → #stage`, `viewport() → {vw, vh}`, `rectOf(el) → rect`, `sizeOf(el) → {w, h}` (offset size, which ignores transforms), `placeAt(el, {x, y})`, `posOf(el) → {x, y}` (from inline left/top)
  - `glide(el, dest, {duration=500, easing="ease-in-out", spin=0, arc=0}) → Promise`: animates, then commits left/top
  - `pawStrike(point, edge, {duration=650}) → {contact: Promise, done: Promise}`
  - `pawPeek(point, edge) → element`, `pawHide(element)`
  - `bubble(text, anchorRect)`, `burst(text, point)`, `setCaption(el, text)`, `shake(el) → Promise`
  - `pawTrail(fromCentre, toCentre, {count=6, duration=800})`, `floatHeart(anchorRect)`
- Produces `App.parseParams(search) → {test, step, screen, demo}`. `step` is clamped to 0..`CONFIG.attempts.length`, and `screen` is `"dates" | "ticket" | null`.
- Produces `App.showScreen(name)`: unhides `#screen-<name>`, hides the rest, and sets `body[data-screen]`.

- [ ] **Step 1: Write the failing tests**

`tests/main.test.js`:
```js
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
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `python3 tests/run.py`
Expected: exit 1; `parseParams`, `fx.once` and the stage test fail.

- [ ] **Step 3: Implement `js/fx.js`**

```js
// Small DOM + animation effects shared by the screens.
window.App = window.App || {};

(function () {
  const PAW_TIP = { x: 45, y: 0 }; // tip of the paw drawing, in px inside .paw-wrap

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function once(fn) {
    let called = false;
    return function (...args) {
      if (called) return undefined;
      called = true;
      return fn.apply(this, args);
    };
  }

  const stage = () => document.getElementById("stage");
  const viewport = () => ({ vw: window.innerWidth, vh: window.innerHeight });

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  function sizeOf(el) { return { w: el.offsetWidth, h: el.offsetHeight }; }
  function placeAt(el, p) { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; }
  function posOf(el) { return { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 }; }

  // Slides an absolutely-positioned element to `dest`, then commits its new left/top.
  async function glide(el, dest, { duration = 500, easing = "ease-in-out", spin = 0, arc = 0 } = {}) {
    const from = posOf(el);
    const dx = dest.x - from.x;
    const dy = dest.y - from.y;
    const anim = el.animate([
      { transform: "translate(0px, 0px) rotate(0deg)" },
      { transform: `translate(${dx / 2}px, ${dy / 2 - arc}px) rotate(${spin / 2}deg)` },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg)` },
    ], { duration, easing, fill: "forwards" });
    await anim.finished;
    placeAt(el, dest);
    anim.cancel();
  }

  function makePaw(anchor) {
    const wrap = document.createElement("div");
    wrap.className = "paw-wrap";
    wrap.innerHTML = App.cats.paw();
    placeAt(wrap, { x: anchor.x - PAW_TIP.x, y: anchor.y - PAW_TIP.y });
    stage().appendChild(wrap);
    return wrap;
  }

  // Transform that puts the tip of a paw anchored at `anchor` onto `tip`, rotated to `angle`.
  function pawTransform(tip, anchor, angle) {
    return `translate(${tip.x - anchor.x}px, ${tip.y - anchor.y}px) rotate(${angle}deg)`;
  }

  // A paw shoots in from `edge`, taps `point`, and pulls back.
  // Returns { contact, done }: promises for the moment of impact and for the end.
  function pawStrike(point, edge, { duration = 650 } = {}) {
    const g = App.geo.pawGeometry(edge, point, viewport());
    const push = App.geo.PUSH[edge];
    const wrap = makePaw(point);
    const hidden = pawTransform(g.hidden, point, g.angle);
    const hit = pawTransform({ x: point.x + push.x * 8, y: point.y + push.y * 8 }, point, g.angle);
    wrap.style.transform = hidden;
    const anim = wrap.animate([
      { transform: hidden, easing: "cubic-bezier(.2,.9,.3,1.25)" },
      { transform: hit, offset: 0.35 },
      { transform: hit, offset: 0.5, easing: "ease-in" },
      { transform: hidden },
    ], { duration, fill: "forwards" });
    return {
      contact: wait(duration * 0.35),
      done: anim.finished.catch(() => {}).then(() => wrap.remove()),
    };
  }

  // A paw peeks in from `edge` and wiggles until pawHide().
  function pawPeek(point, edge) {
    const g = App.geo.pawGeometry(edge, point, viewport());
    const wrap = makePaw(point);
    const hidden = pawTransform(g.hidden, point, g.angle);
    const peek = pawTransform(g.peek, point, g.angle);
    wrap.classList.add("peeking");
    wrap.dataset.hidden = hidden;
    wrap.style.transform = peek;
    wrap.animate([{ transform: hidden }, { transform: peek }], { duration: 220, easing: "ease-out" });
    return wrap;
  }

  function pawHide(wrap) {
    if (!wrap || !wrap.isConnected) return;
    wrap.animate([{ transform: wrap.style.transform }, { transform: wrap.dataset.hidden }],
      { duration: 200, easing: "ease-in", fill: "forwards" })
      .finished.catch(() => {}).then(() => wrap.remove());
  }

  function bubble(text, anchor) {
    const el = document.createElement("div");
    el.className = "bubble";
    el.textContent = text;
    placeAt(el, { x: anchor.x + anchor.w * 0.78, y: anchor.y + anchor.h * 0.08 });
    stage().appendChild(el);
    setTimeout(() => el.remove(), 1400);
    return el;
  }

  function burst(text, p) {
    const el = document.createElement("div");
    el.className = "burst";
    el.textContent = text;
    placeAt(el, p);
    stage().appendChild(el);
    el.addEventListener("animationend", () => el.remove());
    return el;
  }

  function setCaption(el, text) {
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth; // restart the pop-in animation
    el.classList.add("show");
  }

  function shake(el) {
    return el.animate([
      { transform: "translate(0px, 0px)" },
      { transform: "translate(-8px, 3px)" },
      { transform: "translate(7px, -3px)" },
      { transform: "translate(-4px, 2px)" },
      { transform: "translate(0px, 0px)" },
    ], { duration: 320, easing: "ease-out" }).finished;
  }

  // Little paw prints between two centre points, appearing while something scoots past.
  function pawTrail(from, to, { count = 6, duration = 800 } = {}) {
    for (let i = 1; i <= count; i++) {
      setTimeout(() => {
        const t = i / (count + 1);
        const side = i % 2 ? -1 : 1;
        const el = document.createElement("div");
        el.className = "trail-print";
        el.innerHTML = App.cats.pawPrint("#e58fb0");
        placeAt(el, { x: from.x + (to.x - from.x) * t + side * 8, y: from.y + (to.y - from.y) * t + side * 6 });
        stage().appendChild(el);
        el.addEventListener("animationend", () => el.remove());
      }, (duration * i) / (count + 1));
    }
  }

  function floatHeart(anchor) {
    const el = document.createElement("div");
    el.className = "float-heart";
    el.innerHTML = App.cats.heart("#ff6b9a");
    placeAt(el, { x: anchor.x + anchor.w * (0.3 + Math.random() * 0.4), y: anchor.y + anchor.h * 0.15 });
    stage().appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  App.fx = {
    wait, once, stage, viewport, rectOf, sizeOf, placeAt, posOf, glide,
    pawStrike, pawPeek, pawHide, bubble, burst, setCaption, shake, pawTrail, floatHeart,
  };
})();
```

- [ ] **Step 4: Implement `js/main.js` (question screen only for now)**

```js
// Wires the screens together.
window.App = window.App || {};

(function () {
  function parseParams(search) {
    const p = new URLSearchParams(search);
    const step = Math.max(0, Math.min(CONFIG.attempts.length, parseInt(p.get("step"), 10) || 0));
    const screen = ["dates", "ticket"].includes(p.get("screen")) ? p.get("screen") : null;
    return { test: p.has("test"), step, screen, demo: p.has("demo") };
  }

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => { s.hidden = s.id !== `screen-${name}`; });
    document.body.dataset.screen = name;
  }

  function startBlinking(svg) {
    setTimeout(() => {
      svg.classList.add("blink");
      setTimeout(() => {
        svg.classList.remove("blink");
        startBlinking(svg);
      }, 140);
    }, 3000 + Math.random() * 3000);
  }

  function init() {
    const $ = (id) => document.getElementById(id);
    const T = CONFIG.text;

    $("question-title").textContent = T.question;
    $("yes-btn").textContent = T.yes;
    $("no-btn").textContent = T.no;
    $("dates-title").textContent = T.datesTitle;
    $("ticket-note").textContent = T.ticketNote;
    $("change-pick").textContent = T.changePick;

    const mochiEl = $("mochi");
    mochiEl.innerHTML = App.cats.mochi();
    const mochiSvg = mochiEl.querySelector("svg");
    startBlinking(mochiSvg);
    mochiEl.addEventListener("click", () => {
      if (mochiSvg.dataset.mood) return; // busy being dramatic
      App.fx.bubble(T.purr, App.fx.rectOf(mochiEl));
      App.fx.floatHeart(App.fx.rectOf(mochiEl));
      mochiSvg.dataset.mood = "happy";
      setTimeout(() => { if (mochiSvg.dataset.mood === "happy") mochiSvg.dataset.mood = ""; }, 1200);
    });

    showScreen("question");
  }

  App.parseParams = parseParams;
  App.showScreen = showScreen;
  if (document.getElementById("app")) init();
})();
```

- [ ] **Step 5: Append the stage-and-effects section to `styles.css`**

```css
/* ---------- stage and effects ---------- */
#stage,
#rain { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
#stage { z-index: 10; }
#rain { z-index: 20; }
#stage > * { position: absolute; }
body:not([data-screen="question"]) #stage { display: none; }

.no-btn.loose { position: absolute; z-index: 2; margin: 0; pointer-events: auto; }
.no-btn.carried { z-index: 3; pointer-events: none; }

.paw-wrap { width: 90px; height: 220px; z-index: 4; transform-origin: 45px 0; }
.paw-wrap svg {
  display: block;
  width: 90px;
  height: 220px;
  overflow: visible;
  filter: drop-shadow(0 4px 6px rgba(91, 58, 74, 0.25));
}
.paw-wrap.peeking svg { transform-origin: 45px 0; animation: paw-wiggle 0.45s ease-in-out infinite alternate; }
@keyframes paw-wiggle { from { transform: rotate(-9deg); } to { transform: rotate(9deg); } }

.bubble {
  z-index: 5;
  translate: -50% -100%;
  padding: 0.35em 0.8em;
  border-radius: 16px;
  background: #fff;
  color: var(--ink);
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(91, 58, 74, 0.18);
  animation: bubble-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bubble::after {
  content: "";
  position: absolute;
  left: 22%;
  bottom: -9px;
  border: 10px solid transparent;
  border-top-color: #fff;
  border-bottom: 0;
}
@keyframes bubble-in { from { transform: scale(0); opacity: 0; } }

.burst {
  z-index: 5;
  translate: -50% -50%;
  rotate: -8deg;
  padding: 0.2em 0.55em;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--pink-dark);
  background: #fff6a8;
  border: 3px solid var(--pink-dark);
  border-radius: 12px;
  white-space: nowrap;
  animation: burst 0.75s ease-out forwards;
}
@keyframes burst {
  0% { transform: scale(0.3); opacity: 0; }
  25% { transform: scale(1.15); opacity: 1; }
  70% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1) translateY(-14px); opacity: 0; }
}

.trail-print { width: 18px; z-index: 1; translate: -50% -50%; animation: fade-out 1s ease-in forwards; }
.float-heart { width: 26px; z-index: 5; translate: -50% -50%; animation: float-up 1.4s ease-out forwards; }
.trail-print svg,
.float-heart svg { display: block; width: 100%; height: auto; }
@keyframes fade-out { from { opacity: 0.9; } to { opacity: 0; } }
@keyframes float-up {
  from { opacity: 1; transform: translateY(0) scale(0.6); }
  to { opacity: 0; transform: translateY(-90px) scale(1.1); }
}
```

- [ ] **Step 6: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 35 PASSED`.

- [ ] **Step 7: Visual check**

Run: `python3 tests/shot.py index.html "" 1500 1280x800` and `python3 tests/shot.py index.html "" 1500 375x667`, then Read both PNGs.
Expected at both sizes:
- Mochi is centred above "{HER}, will you go on a date with me? 🐾" in Fredoka.
- A pink YES with ears sits next to a grey No.
- Nothing overflows sideways.

- [ ] **Step 8: Commit**

```bash
git add js/fx.js js/main.js styles.css tests/main.test.js
git commit -m "feat: effects layer and question screen with Mochi" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: No button, part 1 (controller, The Swat, The Warning, hover tease)

**Files:**
- Create: `js/no-button.js`
- Modify: `js/main.js` (wire up the controller, `?step`, `?demo`)

**Interfaces:**
- Consumes `App.fx`, `App.geo`, `App.cats`, `App.createEscalation` and `CONFIG.attempts/text`.
- Produces `App.setupNoButton({ noBtn, yesBtn, mochiEl, titleEl, captionEl, appEl, onYes })`, which returns `{ escalation, skipTo(n), deactivate(), biscuit }`. `biscuit` is a getter for Biscuit's element, or null.

These are animations, so there are no new unit tests. Verification is by screenshot (Step 4) and by hand (Step 5). The escalation logic underneath is already covered by Task 3.

- [ ] **Step 1: Implement `js/no-button.js` (steps 1 and 2)**

```js
// Screen 1's "No" button: Mochi's escalating tricks, plus the hover tease.
window.App = window.App || {};

App.setupNoButton = function ({ noBtn, yesBtn, mochiEl, titleEl, captionEl, appEl, onYes }) {
  const fx = App.fx;
  const geo = App.geo;
  const mochiSvg = () => mochiEl.querySelector("svg");
  let active = true;
  let yesScale = 1;
  let biscuit = null;
  let moodTimer = null;
  let teasePaw = null;

  // ---------- shared helpers ----------
  function setMood(mood) {
    clearTimeout(moodTimer);
    mochiSvg().dataset.mood = mood;
  }
  function moodFor(mood, ms) {
    setMood(mood);
    moodTimer = setTimeout(() => setMood(""), ms);
  }

  // YES's rect at a given scale (its centre stays put while it grows).
  function scaledRect(el, scale) {
    const r = fx.rectOf(el);
    const w = el.offsetWidth * scale;
    const h = el.offsetHeight * scale;
    return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
  }

  function obstacles() {
    const list = [scaledRect(yesBtn, yesScale), fx.rectOf(mochiEl), fx.rectOf(titleEl), fx.rectOf(captionEl)];
    if (biscuit) list.push(fx.rectOf(biscuit));
    return list;
  }

  const spot = () => geo.randomSafeSpot(fx.sizeOf(noBtn), fx.viewport(), obstacles());

  // Labels, sizes and caption after attempt n (1-based).
  function applyState(n, { caption = true } = {}) {
    const a = CONFIG.attempts[n - 1];
    noBtn.textContent = a.noLabel;
    noBtn.style.setProperty("--no-size", a.noSize);
    yesScale = geo.fitYesScale(a.yesScale, { w: yesBtn.offsetWidth, h: yesBtn.offsetHeight }, fx.viewport());
    yesBtn.style.setProperty("--yes-scale", yesScale);
    if (caption) fx.setCaption(captionEl, a.caption);
    mochiSvg().classList.toggle("tail-fast", n >= 4);
    yesBtn.classList.toggle("ears-wiggle", n >= 4);
    noBtn.classList.toggle("bitten", n >= 5);
  }

  // First attempt: lift No out of the layout so it can roam the screen.
  function detach() {
    if (noBtn.classList.contains("loose")) return;
    const r = fx.rectOf(noBtn);
    fx.stage().appendChild(noBtn);
    noBtn.classList.add("loose");
    fx.placeAt(noBtn, r);
  }

  async function strikeNo(burstText) {
    const r = fx.rectOf(noBtn);
    const edge = geo.nearestEdge(r, fx.viewport());
    const point = geo.contactPoint(r, edge);
    const strike = fx.pawStrike(point, edge);
    await strike.contact;
    fx.burst(burstText, point);
    return { edge, done: strike.done };
  }

  async function flyOffAndDrop(edge) {
    const push = geo.PUSH[edge];
    const far = Math.max(window.innerWidth, window.innerHeight) * 1.2;
    const off = noBtn.animate([
      { transform: "translate(0px, 0px) rotate(0deg)" },
      { transform: `translate(${push.x * far}px, ${push.y * far - 120}px) rotate(720deg)` },
    ], { duration: 520, easing: "cubic-bezier(.3,.6,.5,1)", fill: "forwards" });
    await off.finished;
    const dest = spot();
    off.cancel();
    fx.placeAt(noBtn, dest);
    await noBtn.animate([
      { transform: `translateY(${-(dest.y + 140)}px)`, easing: "cubic-bezier(.5,0,1,.6)" },
      { transform: "translateY(0px)", offset: 0.65, easing: "ease-out" },
      { transform: "translateY(-16px)", offset: 0.82, easing: "ease-in" },
      { transform: "translateY(0px)" },
    ], { duration: 650 }).finished;
  }

  function wobble() {
    return noBtn.animate([
      { transform: "rotate(0deg)" }, { transform: "rotate(-14deg)" }, { transform: "rotate(10deg)" },
      { transform: "rotate(-5deg)" }, { transform: "rotate(0deg)" },
    ], { duration: 380 }).finished;
  }

  // ---------- the steps (one per No attempt) ----------
  const steps = [
    { // 1. The Swat
      async play() {
        detach();
        const { edge } = await strikeNo("SWAT!");
        applyState(1);
        moodFor("smug", 1600);
        await flyOffAndDrop(edge);
      },
      settle() {
        detach();
        applyState(1, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
    { // 2. The Warning
      async play() {
        setMood("alarmed");
        fx.bubble(CONFIG.text.mrrp, fx.rectOf(mochiEl));
        await fx.wait(650);
        const first = await strikeNo("tap");
        await wobble();
        await first.done;
        const { edge } = await strikeNo("SWAT!!");
        applyState(2);
        moodFor("smug", 1600);
        await flyOffAndDrop(edge);
      },
      settle() {
        setMood("");
        applyState(2, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
  ];

  // ---------- hover tease (mouse only) ----------
  function lookAt(p) {
    const pupils = mochiSvg().querySelector(".pupils");
    if (!p) {
      pupils.removeAttribute("transform");
      return;
    }
    const r = fx.rectOf(mochiEl);
    const dx = Math.max(-1, Math.min(1, (p.x - (r.x + r.w / 2)) / 250)) * 4;
    const dy = Math.max(-1, Math.min(1, (p.y - (r.y + r.h * 0.4)) / 250)) * 3;
    pupils.setAttribute("transform", `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`);
  }

  function startTease() {
    const r = fx.rectOf(noBtn);
    const edge = geo.nearestEdge(r, fx.viewport());
    teasePaw = fx.pawPeek(geo.contactPoint(r, edge), edge);
    setMood("suspicious");
  }

  function stopTease() {
    if (!teasePaw) return;
    fx.pawHide(teasePaw);
    teasePaw = null;
    if (mochiSvg().dataset.mood === "suspicious") setMood("");
    lookAt(null);
  }

  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      if (!active || esc.busy || esc.converted) {
        stopTease();
        return;
      }
      const d = geo.distToRect(e.clientX, e.clientY, fx.rectOf(noBtn));
      if (!teasePaw && d < 90) startTease();
      else if (teasePaw && d > 150) stopTease();
      if (teasePaw) lookAt({ x: e.clientX, y: e.clientY });
    });
  }

  // ---------- wiring ----------
  const esc = App.createEscalation({ steps });

  function tryNo() {
    if (!active) return;
    if (esc.converted) {
      onYes();
      return;
    }
    stopTease();
    esc.attempt();
  }

  noBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    tryNo();
  });
  // Enter/Space make a click with detail 0; mouse and touch were already handled on pointerdown.
  noBtn.addEventListener("click", (e) => {
    if (e.detail === 0) tryNo();
  });

  window.addEventListener("resize", () => {
    if (!noBtn.classList.contains("loose") || noBtn.classList.contains("carried")) return;
    fx.placeAt(noBtn, geo.clampToViewport(fx.posOf(noBtn), fx.sizeOf(noBtn), fx.viewport()));
  });

  return {
    escalation: esc,
    skipTo: (n) => esc.skipTo(n),
    deactivate() {
      active = false;
      stopTease();
    },
    get biscuit() { return biscuit; },
  };
};
```

- [ ] **Step 2: Wire it up in `js/main.js`**

Edit 1. In `js/main.js`, insert this directly above the line `  function init() {`:
```js
  // ?demo: Mochi performs every trick by herself (handy for previewing).
  async function runDemo(esc) {
    await App.fx.wait(1200);
    while (!esc.converted) {
      await esc.attempt();
      await App.fx.wait(1500);
    }
  }

```

Edit 2. In `js/main.js`, replace:
```js
    showScreen("question");
  }
```
with:
```js
    const params = parseParams(window.location.search);
    const onYes = App.fx.once(() => noCtl.deactivate());
    const noCtl = App.setupNoButton({
      noBtn: $("no-btn"), yesBtn: $("yes-btn"), mochiEl, titleEl: $("question-title"),
      captionEl: $("caption"), appEl: $("app"), onYes,
    });
    $("yes-btn").addEventListener("click", onYes);

    showScreen("question");
    if (params.step) requestAnimationFrame(() => noCtl.skipTo(params.step));
    else if (params.demo) runDemo(noCtl.escalation);
  }
```

- [ ] **Step 3: Run the tests (nothing should regress)**

Run: `python3 tests/run.py`
Expected: `ALL 35 PASSED`, with no `FAIL error:` lines.

- [ ] **Step 4: Screenshot checks**

Run each of these and Read each PNG:
- `python3 tests/shot.py index.html "?step=1" 1500` should show No, labelled "Are you sure?", somewhere away from YES, Mochi, the title and the caption line. YES is a bit bigger and the caption is empty (settle skips captions).
- `python3 tests/shot.py index.html "?step=2" 1500` should show "Really sure??" with YES bigger again.
- `python3 tests/shot.py index.html "?demo" 1650` should catch the first swat mid-air: a paw coming in from the nearest edge and a yellow "SWAT!" burst near No. If the timing misses the frame, try 1550, 1750 and 1850.
- `python3 tests/shot.py index.html "?demo" 5200` should catch step 2: Mochi's "mrrp?!" bubble, or the double tap.

If the virtual-time screenshots don't show animation frames at all, skip those two and rely on Step 5.

- [ ] **Step 5: Manual check in a real browser**

Run: `python3 -m http.server 8000` (in the background), then open `http://localhost:8000/` in Chrome on Windows.
- Moving the mouse near No makes Mochi squint and follow the cursor, and a paw wiggles in from the nearest edge. Moving away pulls the paw back.
- Click No once: SWAT, No flies off spinning, drops in elsewhere with a bounce, and the caption and labels update.
- Click No again: "mrrp?!", one tap with a wobble, then SWAT!!.
- Spam-clicking during an animation does nothing extra.
- Tab to No and press Enter: it counts as an attempt.
- Resize the window small: No stays on screen.

Stop the server afterwards.

- [ ] **Step 6: Commit**

```bash
git add js/no-button.js js/main.js
git commit -m "feat: Mochi swats the No button (steps 1-2) and hover tease" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: No button, part 2 (The Sit, The Bat-Around, Left the Chat)

**Files:**
- Modify: `js/no-button.js` (add helpers and steps 3–5)
- Modify: `styles.css` (append the "Biscuit, walker, bitten" section)

**Interfaces:**
- Consumes everything from Task 7. After this task, `steps.length === 5`, so the escalation converts after attempt 5: No then reads "yes 💕" and calls `onYes`.

- [ ] **Step 1: Add the Biscuit and walk helpers**

In `js/no-button.js`, replace the line:
```js
  // ---------- the steps (one per No attempt) ----------
```
with:
```js
  // ---------- Biscuit (step 3) ----------
  function biscuitSize() {
    const w = Math.max(190, noBtn.offsetWidth * 1.35);
    return { w, h: (w * 150) / 220 };
  }

  function makeBiscuit(size, at) {
    const el = document.createElement("div");
    el.className = "biscuit-wrap";
    el.style.width = `${size.w}px`;
    el.innerHTML = `${App.cats.biscuit()}<span class="zzz"><span>z</span><span>z</span><span>z</span></span>`;
    fx.placeAt(el, at);
    fx.stage().appendChild(el);
    return el;
  }

  // ---------- Mochi's walk (step 5) ----------
  const WALK_SPEED = 0.55; // px per ms

  function walkTo(walker, dest) {
    const from = fx.posOf(walker);
    const duration = Math.max(500, Math.hypot(dest.x - from.x, dest.y - from.y) / WALK_SPEED);
    return fx.glide(walker, dest, { duration, easing: "linear" });
  }

  function cleanupWalker() {
    if (noBtn.parentElement !== fx.stage()) fx.stage().appendChild(noBtn);
    noBtn.classList.remove("carried");
    fx.stage().querySelectorAll(".walker").forEach((w) => w.remove());
    mochiEl.style.visibility = "";
  }

  // ---------- the steps (one per No attempt) ----------
```

- [ ] **Step 2: Add steps 3–5**

In `js/no-button.js`, replace:
```js
      settle() {
        setMood("");
        applyState(2, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
  ];
```
with:
```js
      settle() {
        setMood("");
        applyState(2, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
    { // 3. The Sit
      async play() {
        const r = fx.rectOf(noBtn);
        const size = biscuitSize();
        const at = geo.clampToViewport(
          { x: r.x + r.w / 2 - size.w / 2, y: r.y + r.h / 2 - size.h * 0.6 }, size, fx.viewport());
        biscuit = makeBiscuit(size, at);
        await biscuit.animate([
          { transform: `translateY(${-(at.y + size.h + 60)}px)` },
          { transform: "translateY(0px)" },
        ], { duration: 460, easing: "cubic-bezier(.55,0,1,.45)" }).finished;
        biscuit.animate([{ transform: "scale(1.15, 0.8)" }, { transform: "scale(1, 1)" }],
          { duration: 280, easing: "ease-out" });
        fx.burst("THUD!", { x: at.x + size.w / 2, y: at.y });
        fx.shake(appEl);
        applyState(3);
        biscuit.classList.add("sleeping");
        await fx.wait(1200);
        // squeeze out on the roomier side, then scoot away leaving paw prints
        await noBtn.animate([
          { transform: "scale(1, 1)" }, { transform: "scale(0.55, 1.35)" }, { transform: "scale(1, 1)" },
        ], { duration: 380 }).finished;
        const goRight = r.x + r.w / 2 < window.innerWidth / 2;
        const out = { x: goRight ? at.x + size.w + 8 : at.x - noBtn.offsetWidth - 8, y: fx.posOf(noBtn).y };
        await fx.glide(noBtn, geo.clampToViewport(out, fx.sizeOf(noBtn), fx.viewport()),
          { duration: 260, easing: "ease-out" });
        const dest = spot();
        const centre = (p) => ({ x: p.x + noBtn.offsetWidth / 2, y: p.y + noBtn.offsetHeight / 2 });
        fx.pawTrail(centre(fx.posOf(noBtn)), centre(dest));
        await fx.glide(noBtn, dest, { duration: 800 });
      },
      settle() {
        if (!biscuit) {
          const size = biscuitSize();
          biscuit = makeBiscuit(size, geo.randomSafeSpot(size, fx.viewport(), obstacles()));
        }
        biscuit.classList.add("sleeping");
        applyState(3, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
    { // 4. The Bat-Around
      async play() {
        const vp = fx.viewport();
        const size = fx.sizeOf(noBtn);
        const y = Math.min(Math.max(fx.posOf(noBtn).y, 90), vp.vh - size.h - 90);
        const leftSpot = { x: 64, y };
        const rightSpot = { x: vp.vw - size.w - 64, y };
        await fx.glide(noBtn, leftSpot, { duration: 320, easing: "ease-in" });
        let atLeft = true;
        for (let i = 0; i < 3; i++) {
          const edge = atLeft ? "left" : "right";
          const point = geo.contactPoint(fx.rectOf(noBtn), edge);
          const strike = fx.pawStrike(point, edge, { duration: 520 });
          await strike.contact;
          fx.burst("pat!", point);
          await fx.glide(noBtn, atLeft ? rightSpot : leftSpot,
            { duration: 420, spin: atLeft ? 360 : -360, arc: 50 });
          atLeft = !atLeft;
        }
        const edge = atLeft ? "left" : "right";
        const point = geo.contactPoint(fx.rectOf(noBtn), edge);
        const strike = fx.pawStrike(point, edge);
        await strike.contact;
        fx.burst("BONK!", point);
        applyState(4);
        const corner = geo.safeCorner(fx.sizeOf(noBtn), fx.viewport(), obstacles());
        await fx.glide(noBtn, corner, { duration: 560, easing: "cubic-bezier(.2,.7,.3,1)", spin: 540, arc: 90 });
      },
      settle() {
        applyState(4, { caption: false });
        fx.placeAt(noBtn, geo.safeCorner(fx.sizeOf(noBtn), fx.viewport(), obstacles()));
      },
    },
    { // 5. Left the Chat
      async play() {
        const home = fx.rectOf(mochiEl);
        const walker = document.createElement("div");
        walker.className = "walker";
        walker.style.width = `${home.w}px`;
        walker.innerHTML = `<div class="walker-body">${App.cats.mochi()}</div>`;
        const body = walker.firstElementChild;
        const walkerSvg = walker.querySelector("svg");
        walkerSvg.dataset.mood = "smug";
        fx.placeAt(walker, home);
        fx.stage().appendChild(walker);
        mochiEl.style.visibility = "hidden";

        const mouth = { x: home.w * 0.5, y: home.h * 0.5 }; // Mochi's mouth, inside the walker
        const hold = () => ({ x: mouth.x - noBtn.offsetWidth / 2, y: mouth.y - 4 });
        const r = fx.rectOf(noBtn);
        await walkTo(walker, { x: r.x + r.w / 2 - mouth.x, y: r.y - mouth.y + 4 });

        body.appendChild(noBtn); // picked up!
        noBtn.classList.add("carried");
        fx.placeAt(noBtn, hold());
        const vw = window.innerWidth;
        const exitRight = fx.posOf(walker).x + home.w / 2 > vw / 2;
        await walkTo(walker, { x: exitRight ? vw + 40 : -home.w - 40, y: fx.posOf(walker).y });
        fx.setCaption(captionEl, CONFIG.text.leftChat);
        await fx.wait(2000);

        applyState(5, { caption: false }); // the button comes back… edited
        fx.placeAt(noBtn, hold());
        const dest = spot();
        walkerSvg.dataset.mood = "happy";
        fx.placeAt(walker, { x: exitRight ? -home.w - 40 : vw + 40, y: dest.y - mouth.y + 4 });
        await walkTo(walker, { x: dest.x + noBtn.offsetWidth / 2 - mouth.x, y: dest.y - mouth.y + 4 });

        fx.stage().appendChild(noBtn); // dropped
        noBtn.classList.remove("carried");
        fx.placeAt(noBtn, dest);
        fx.setCaption(captionEl, CONFIG.attempts[4].caption);
        walkerSvg.dataset.mood = "smug";
        await walkTo(walker, home);
        walker.remove();
        mochiEl.style.visibility = "";
      },
      settle() {
        cleanupWalker();
        applyState(5, { caption: false });
        fx.placeAt(noBtn, spot());
      },
    },
  ];
```

- [ ] **Step 3: Append the "Biscuit, walker, bitten" section to `styles.css`**

```css
/* ---------- Biscuit, walker, bitten ---------- */
.biscuit-wrap { z-index: 3; transform-origin: 50% 100%; }
.biscuit-wrap svg,
.walker svg { display: block; width: 100%; height: auto; overflow: visible; }
.biscuit-wrap svg { filter: drop-shadow(0 6px 8px rgba(91, 58, 74, 0.2)); }

.zzz { position: absolute; right: 10%; top: -4px; display: none; font-weight: 700; color: var(--muted); }
.biscuit-wrap.sleeping .zzz { display: block; }
.zzz span { position: absolute; opacity: 0; animation: zzz 2.4s ease-out infinite; }
.zzz span:nth-child(2) { animation-delay: 0.8s; font-size: 1.2em; }
.zzz span:nth-child(3) { animation-delay: 1.6s; font-size: 1.4em; }
@keyframes zzz {
  0% { opacity: 0; transform: translate(0, 0); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translate(18px, -40px); }
}

.walker { z-index: 3; }
.walker-body { position: relative; animation: trot 0.28s ease-in-out infinite alternate; }
@keyframes trot {
  from { transform: translateY(0) rotate(-3deg); }
  to { transform: translateY(-7px) rotate(3deg); }
}

.no-btn.bitten {
  background: var(--pink);
  box-shadow: none;
  mask:
    radial-gradient(circle 12px at calc(100% - 2px) 2px, #0000 95%, #000 100%),
    radial-gradient(circle 9px at calc(100% - 24px) -3px, #0000 95%, #000 100%),
    radial-gradient(circle 8px at 14px calc(100% + 2px), #0000 95%, #000 100%);
  mask-composite: intersect;
}

.yes-btn.ears-wiggle::before { animation: ear-wiggle-l 0.5s ease-in-out infinite alternate; }
.yes-btn.ears-wiggle::after { animation: ear-wiggle-r 0.5s ease-in-out infinite alternate; }
@keyframes ear-wiggle-l { to { rotate: -30deg; } }
@keyframes ear-wiggle-r { to { rotate: 30deg; } }
```

- [ ] **Step 4: Run the tests (nothing should regress)**

Run: `python3 tests/run.py`
Expected: `ALL 35 PASSED`, with no `FAIL error:` lines.

- [ ] **Step 5: Screenshot checks**

Read each PNG:
- `python3 tests/shot.py index.html "?step=3" 1500`: grey Biscuit loafed somewhere with floating "z"s, No reads "pls 🥺" and is smaller, nothing overlaps.
- `python3 tests/shot.py index.html "?step=4" 1500`: tiny "no" in a corner, YES much bigger, ears wiggle.
- `python3 tests/shot.py index.html "?step=5" 1500`: a pink button with bite marks reading "yes 💕", YES at full size and still on screen.
- `python3 tests/shot.py index.html "?step=5" 1500 375x667`: the same at phone size, with YES fitting the width.

- [ ] **Step 6: Manual run of the whole escalation**

Serve with `python3 -m http.server 8000`, open `http://localhost:8000/?demo`, and watch all five tricks play in order:
- Biscuit THUDs (the screen shakes), No squeezes out and scoots off with paw prints.
- The paws bat No back and forth three times, then BONK it into a corner.
- Mochi gets up, walks to No, carries it off-screen ("no has left the chat 😼"), comes back from the other side, drops "yes 💕", and walks home.

Then reload without `?demo` and do it by clicking. After step 5, clicking "yes 💕" calls onYes; for now the buttons only stop reacting. Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add js/no-button.js styles.css
git commit -m "feat: Biscuit sits, paws bat, Mochi walks off with No (steps 3-5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: YES: celebration, date picker, ticket, notifications

**Files:**
- Create: `js/celebration.js`, `js/date-picker.js`
- Modify: `js/main.js` (full replacement below), `styles.css` (append the "celebration, dates, ticket" section)
- Test: `tests/dates.test.js`

**Interfaces:**
- Produces `App.celebrate({ yesBtn, noBtn, mochiEl, biscuit, titleEl, subEl, captionEl }) → Promise`, which resolves when it's time to show the dates, plus `App.catRain(count=40)`.
- Produces `App.dates.renderDateCards(container, ideas, onPick, {stampMs=600})`, which allows one pick per render and calls `onPick(idea)` after the stamp animation. It also produces `App.dates.renderTicket(container, {herName, fromName, catName, idea})`; a blank `fromName` becomes "me".
- Consumes `App.notify.send/yesMessage/pickMessage` and `noCtl.escalation.count`.

- [ ] **Step 1: Write the failing tests**

`tests/dates.test.js`:
```js
const IDEAS = [
  { emoji: "☕🐱", title: "Cat café", blurb: "a" },
  { emoji: "🍿", title: "Movie night", blurb: "b" },
];
const tick = () => new Promise((r) => setTimeout(r, 10));

test("dates.renderDateCards: one card per idea, clicking one picks it", async () => {
  const box = document.createElement("div");
  const picked = [];
  App.dates.renderDateCards(box, IDEAS, (idea) => picked.push(idea.title), { stampMs: 0 });
  const cards = box.querySelectorAll(".date-card");
  eq(cards.length, 2);
  eq(cards[1].querySelector(".card-title").textContent, "Movie night");
  eq(cards[1].querySelector(".card-emoji").textContent, "🍿");
  cards[1].click();
  assert(cards[1].classList.contains("stamped"), "stamped class");
  await tick();
  eq(picked, ["Movie night"]);
});

test("dates.renderDateCards: a double click only picks once", async () => {
  const box = document.createElement("div");
  const picked = [];
  App.dates.renderDateCards(box, IDEAS, (idea) => picked.push(idea.title), { stampMs: 0 });
  const [first, second] = box.querySelectorAll(".date-card");
  first.click();
  second.click();
  await tick();
  eq(picked, ["Cat café"]);
});

test("dates.renderDateCards: re-rendering (change my pick) allows a new pick", async () => {
  const box = document.createElement("div");
  const picked = [];
  App.dates.renderDateCards(box, IDEAS, (idea) => picked.push(idea.title), { stampMs: 0 });
  box.querySelector(".date-card").click();
  await tick();
  App.dates.renderDateCards(box, IDEAS, (idea) => picked.push(idea.title), { stampMs: 0 });
  eq(box.querySelectorAll(".date-card").length, 2);
  box.querySelectorAll(".date-card")[1].click();
  await tick();
  eq(picked, ["Cat café", "Movie night"]);
});

test("dates.renderTicket: names, plan and approval", () => {
  const box = document.createElement("div");
  App.dates.renderTicket(box, { herName: "{HER}", fromName: "Sam", catName: "Mochi", idea: IDEAS[0] });
  eq(box.querySelector(".ticket-names").textContent, "{HER} + Sam");
  eq(box.querySelector(".ticket-plan b").textContent, "☕🐱 Cat café");
  eq(box.querySelector(".ticket-cat").textContent, "Mochi 🐾");
});

test("dates.renderTicket: empty or blank fromName becomes 'me'", () => {
  const box = document.createElement("div");
  App.dates.renderTicket(box, { herName: "{HER}", fromName: "  ", catName: "Mochi", idea: IDEAS[0] });
  eq(box.querySelector(".ticket-names").textContent, "{HER} + me");
});

test("dates.renderTicket: names are text, never HTML", () => {
  const box = document.createElement("div");
  App.dates.renderTicket(box, { herName: "<b>x</b>", fromName: "", catName: "Mochi", idea: IDEAS[0] });
  eq(box.querySelector(".ticket-names b"), null);
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `python3 tests/run.py`
Expected: exit 1; the `dates.*` tests fail (`App.dates` is undefined).

- [ ] **Step 3: Implement `js/date-picker.js`**

```js
// Date idea cards and the final "date ticket".
window.App = window.App || {};

(function () {
  function renderDateCards(container, ideas, onPick, { stampMs = 600 } = {}) {
    container.replaceChildren();
    let picked = false;
    ideas.forEach((idea) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "date-card";
      card.innerHTML = '<span class="card-ears"></span><span class="card-emoji"></span>'
        + '<span class="card-title"></span><span class="card-blurb"></span><span class="card-stamp"></span>';
      card.querySelector(".card-emoji").textContent = idea.emoji;
      card.querySelector(".card-title").textContent = idea.title;
      card.querySelector(".card-blurb").textContent = idea.blurb;
      card.querySelector(".card-stamp").innerHTML = App.cats.pawPrint("#e84d80");
      card.addEventListener("click", () => {
        if (picked) return;
        picked = true;
        card.classList.add("stamped");
        setTimeout(() => onPick(idea), stampMs);
      });
      container.appendChild(card);
    });
  }

  function renderTicket(container, { herName, fromName, catName, idea }) {
    container.innerHTML = `
      <div class="ticket">
        <div class="ticket-head">🎟️ OFFICIAL DATE TICKET <span class="ticket-admit">admits two</span></div>
        <div class="ticket-names"></div>
        <div class="ticket-plan">Plan: <b></b></div>
        <div class="ticket-approved">Approved by: <span class="ticket-cat"></span></div>
        <div class="ticket-stamp"></div>
      </div>`;
    container.querySelector(".ticket-names").textContent = `${herName} + ${(fromName || "").trim() || "me"}`;
    container.querySelector(".ticket-plan b").textContent = `${idea.emoji} ${idea.title}`;
    container.querySelector(".ticket-cat").textContent = `${catName} 🐾`;
    container.querySelector(".ticket-stamp").innerHTML = App.cats.pawPrint("#e84d80");
  }

  App.dates = { renderDateCards, renderTicket };
})();
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 41 PASSED`.

- [ ] **Step 5: Implement `js/celebration.js`**

```js
// The YES moment: buttons pop, Mochi hops, cats rain from the sky.
window.App = window.App || {};

(function () {
  function catRain(count = 40) {
    const layer = document.getElementById("rain");
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "rain-item";
      const kind = i % 4;
      if (kind === 3) {
        el.innerHTML = App.cats.heart("#ff6b9a");
      } else if (kind === 2) {
        el.innerHTML = App.cats.pawPrint("#e84d80");
      } else {
        const [fur, eye] = App.cats.FUR[Math.floor(Math.random() * App.cats.FUR.length)];
        el.innerHTML = App.cats.catFace(fur, eye);
      }
      el.style.left = `${Math.random() * 100}vw`;
      el.style.width = `${28 + Math.random() * 30}px`;
      el.style.setProperty("--dur", `${2 + Math.random() * 2}s`);
      el.style.setProperty("--delay", `${Math.random() * 1.5}s`);
      el.style.setProperty("--spin", `${Math.round(Math.random() * 720 - 360)}deg`);
      el.addEventListener("animationend", () => el.remove());
      layer.appendChild(el);
    }
  }

  // Resolves when it's time to show the date picker.
  async function celebrate({ yesBtn, noBtn, mochiEl, biscuit, titleEl, subEl, captionEl }) {
    [yesBtn, noBtn].forEach((b) => b.classList.add("pop-away"));
    captionEl.textContent = "";
    mochiEl.style.visibility = "";
    mochiEl.querySelector("svg").dataset.mood = "happy";
    mochiEl.classList.add("hop");
    if (biscuit) {
      biscuit.classList.remove("sleeping");
      biscuit.classList.add("hop");
    }
    titleEl.textContent = CONFIG.text.yayTitle;
    subEl.textContent = CONFIG.text.yaySub;
    subEl.hidden = false;
    catRain(40);
    for (let i = 0; i < 8; i++) {
      setTimeout(() => App.fx.floatHeart(App.fx.rectOf(mochiEl)), i * 280);
    }
    await App.fx.wait(3200);
  }

  App.celebrate = celebrate;
  App.catRain = catRain;
})();
```

- [ ] **Step 6: Replace `js/main.js` with the final version**

```js
// Wires the screens together.
window.App = window.App || {};

(function () {
  function parseParams(search) {
    const p = new URLSearchParams(search);
    const step = Math.max(0, Math.min(CONFIG.attempts.length, parseInt(p.get("step"), 10) || 0));
    const screen = ["dates", "ticket"].includes(p.get("screen")) ? p.get("screen") : null;
    return { test: p.has("test"), step, screen, demo: p.has("demo") };
  }

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => { s.hidden = s.id !== `screen-${name}`; });
    document.body.dataset.screen = name;
  }

  function startBlinking(svg) {
    setTimeout(() => {
      svg.classList.add("blink");
      setTimeout(() => {
        svg.classList.remove("blink");
        startBlinking(svg);
      }, 140);
    }, 3000 + Math.random() * 3000);
  }

  // ?demo: Mochi performs every trick by herself (handy for previewing).
  async function runDemo(esc) {
    await App.fx.wait(1200);
    while (!esc.converted) {
      await esc.attempt();
      await App.fx.wait(1500);
    }
  }

  function init() {
    const params = parseParams(window.location.search);
    const $ = (id) => document.getElementById(id);
    const T = CONFIG.text;

    $("question-title").textContent = T.question;
    $("yes-btn").textContent = T.yes;
    $("no-btn").textContent = T.no;
    $("dates-title").textContent = T.datesTitle;
    $("ticket-note").textContent = T.ticketNote;
    $("change-pick").textContent = T.changePick;

    const mochiEl = $("mochi");
    mochiEl.innerHTML = App.cats.mochi();
    const mochiSvg = mochiEl.querySelector("svg");
    startBlinking(mochiSvg);
    mochiEl.addEventListener("click", () => {
      if (mochiSvg.dataset.mood) return; // busy being dramatic
      App.fx.bubble(T.purr, App.fx.rectOf(mochiEl));
      App.fx.floatHeart(App.fx.rectOf(mochiEl));
      mochiSvg.dataset.mood = "happy";
      setTimeout(() => { if (mochiSvg.dataset.mood === "happy") mochiSvg.dataset.mood = ""; }, 1200);
    });

    let hasPicked = false;
    function showTicket(idea) {
      App.dates.renderTicket($("ticket"), {
        herName: CONFIG.herName, fromName: CONFIG.fromName, catName: CONFIG.catName, idea,
      });
      showScreen("ticket");
    }
    function showDates() {
      App.dates.renderDateCards($("date-cards"), CONFIG.dateIdeas, (idea) => {
        App.notify.send(App.notify.pickMessage(idea, hasPicked), { test: params.test });
        hasPicked = true;
        showTicket(idea);
      });
      showScreen("dates");
    }
    $("change-pick").addEventListener("click", showDates);

    const onYes = App.fx.once(async () => {
      noCtl.deactivate();
      App.notify.send(App.notify.yesMessage(noCtl.escalation.count), { test: params.test });
      await App.celebrate({
        yesBtn: $("yes-btn"), noBtn: $("no-btn"), mochiEl, biscuit: noCtl.biscuit,
        titleEl: $("question-title"), subEl: $("yay-sub"), captionEl: $("caption"),
      });
      showDates();
    });
    const noCtl = App.setupNoButton({
      noBtn: $("no-btn"), yesBtn: $("yes-btn"), mochiEl, titleEl: $("question-title"),
      captionEl: $("caption"), appEl: $("app"), onYes,
    });
    $("yes-btn").addEventListener("click", onYes);

    showScreen("question");
    if (params.screen === "dates") showDates();
    else if (params.screen === "ticket") showTicket(CONFIG.dateIdeas[0]);
    else if (params.step) requestAnimationFrame(() => noCtl.skipTo(params.step));
    else if (params.demo) runDemo(noCtl.escalation);
  }

  App.parseParams = parseParams;
  App.showScreen = showScreen;
  if (document.getElementById("app")) init();
})();
```

- [ ] **Step 7: Append the "celebration, dates, ticket" section to `styles.css`**

```css
/* ---------- celebration ---------- */
.yes-btn.pop-away,
.no-btn.pop-away { animation: pop-away 0.4s ease-in forwards; pointer-events: none; }
@keyframes pop-away {
  40% { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}

.hop { animation: hop 0.5s ease-in-out infinite alternate; }
@keyframes hop { from { transform: translateY(0); } to { transform: translateY(-18px); } }

.rain-item { position: absolute; top: -70px; animation: rain var(--dur) var(--delay) linear both; }
.rain-item svg { display: block; width: 100%; height: auto; }
@keyframes rain {
  from { transform: translateY(0) rotate(0deg); }
  to { transform: translateY(calc(100vh + 140px)) rotate(var(--spin)); }
}

/* ---------- date picker ---------- */
.date-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 1.6rem 1.2rem;
  width: min(960px, 100%);
}
.date-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1.4rem 1rem 1.2rem;
  color: var(--ink);
  background: #fff;
  border: 3px solid var(--pink-soft);
  border-radius: 22px;
  box-shadow: 0 8px 20px rgba(232, 77, 128, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s;
}
.date-card:hover { transform: rotate(-2deg) translateY(-4px); box-shadow: 0 14px 26px rgba(232, 77, 128, 0.2); }
.date-card:nth-child(even):hover { transform: rotate(2deg) translateY(-4px); }
.card-ears::before,
.card-ears::after {
  content: "";
  position: absolute;
  top: -21px;
  width: 30px;
  height: 24px;
  background: var(--pink-soft);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  transform-origin: 50% 100%;
  transform: scaleY(0);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.card-ears::before { left: 22%; }
.card-ears::after { right: 22%; }
.date-card:hover .card-ears::before,
.date-card:hover .card-ears::after { transform: scaleY(1); }
.card-emoji { font-size: 2.4rem; }
.card-title { font-size: 1.25rem; font-weight: 700; }
.card-blurb { font-size: 0.95rem; color: var(--muted); }
.card-stamp { position: absolute; right: 10px; bottom: 8px; width: 46px; opacity: 0; transform: scale(2.2) rotate(-20deg); }
.card-stamp svg { display: block; width: 100%; }
.date-card.stamped { border-color: var(--pink); }
.date-card.stamped .card-stamp { animation: stamp 0.35s ease-in forwards; }
@keyframes stamp { to { opacity: 0.9; transform: scale(1) rotate(-12deg); } }

/* ---------- ticket ---------- */
#ticket { width: min(440px, 100%); filter: drop-shadow(0 12px 22px rgba(232, 77, 128, 0.22)); }
.ticket {
  position: relative;
  display: grid;
  gap: 0.55rem;
  padding: 1.6rem 2rem 1.4rem;
  text-align: left;
  background: #fff;
  border: 3px dashed var(--pink);
  border-radius: 18px;
  mask:
    radial-gradient(circle 14px at 0 50%, #0000 98%, #000 100%),
    radial-gradient(circle 14px at 100% 50%, #0000 98%, #000 100%);
  mask-composite: intersect;
  animation: ticket-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes ticket-in { from { transform: translateY(30px) scale(0.9); opacity: 0; } }
.ticket-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.4rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--pink-dark);
}
.ticket-admit { font-weight: 500; letter-spacing: 0; color: var(--muted); }
.ticket-names { font-size: 1.9rem; font-weight: 700; }
.ticket-plan { font-size: 1.2rem; }
.ticket-approved { color: var(--muted); }
.ticket-stamp { position: absolute; right: 26px; bottom: 16px; width: 64px; rotate: -14deg; opacity: 0.85; animation: stamp-in 0.4s 0.5s ease-in both; }
.ticket-stamp svg { display: block; width: 100%; }
@keyframes stamp-in { from { transform: scale(2.4); opacity: 0; } }
.ticket-note { max-width: 30ch; margin-top: 1rem; }
.link-btn { padding: 0.4rem; font-size: 1rem; color: var(--pink-dark); background: none; border: none; text-decoration: underline; }
```

- [ ] **Step 8: Run the tests and check they pass**

Run: `python3 tests/run.py`
Expected: `ALL 41 PASSED`.

- [ ] **Step 9: Screenshot checks**

Read each PNG:
- `python3 tests/shot.py index.html "?screen=dates" 1500`: the heading and five cards in a grid.
- `python3 tests/shot.py index.html "?screen=dates" 1500 375x667`: one column of cards, scrollable, with no sideways overflow.
- `python3 tests/shot.py index.html "?screen=ticket" 1500`: a ticket with notches on both sides and a dashed border, "{HER} + me", "Plan: ☕🐱 Cat café", "Approved by: Mochi 🐾", a paw stamp, the note, and "change my pick".

- [ ] **Step 10: Manual end-to-end check, with real notifications**

Subscribe to `CONFIG.ntfyTopic` in the ntfy app, or watch `https://ntfy.sh/<topic>` in a browser tab. Serve with `python3 -m http.server 8000` and open `http://localhost:8000/?test`.
1. Click No twice, then YES. Both buttons pop, Mochi hops with ^ ^ eyes and hearts, cats rain down, and the headline reads "YAAAY!! I knew it, {HER} 💕". A push arrives: "🧪 TEST {HER} said YES! 💕" / "After 2 no-attempts 😼".
2. After about 3s the cards appear. Hovering one tilts it and pops ears; clicking stamps a paw and the ticket appears. A push arrives: "🧪 TEST {HER} picked a date! 🐾" / "☕🐱 Cat café" (or whatever was clicked).
3. Click "change my pick" and pick another card. A push arrives: "🧪 TEST {HER} changed her pick" / "→ 🍿 Movie night".
4. Reload with `?step=3&test` and click YES. Biscuit wakes up and hops too, and no paw, Biscuit or No button is left over on the date screen.

Stop the server afterwards.

- [ ] **Step 11: Commit**

```bash
git add js/celebration.js js/date-picker.js js/main.js styles.css tests/dates.test.js
git commit -m "feat: YES celebration, date picker, ticket and notifications" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: README and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# A question for {HER} 🐾

A cat-themed "will you date me?" page. Mochi the cat guards the **No** button: she swats it, Biscuit sits on it, paws bat it around, and finally Mochi walks off with it and brings it back as "yes 💕". After YES, {HER} picks a first date and your phone gets a push notification.

## Open it
Double-click `index.html`, or put the folder on any static host (GitHub Pages, Netlify Drop).

## Get the notifications (one-time)
1. Install the **ntfy** app (Android / iOS).
2. Subscribe to the topic in `js/config.js` (`ntfyTopic`, e.g. `{her}-date-…`), on server `ntfy.sh`.
3. You'll get "{HER} said YES! 💕" (with how many times she tried No) and "{HER} picked a date! 🐾".

## Edit
Everything you might want to change is in `js/config.js`: your name (`fromName`, shown on the ticket), all text, the five No tricks' captions, and the date ideas.

## Preview / debug (add to the URL)
| Param | What it does |
|-------|--------------|
| `?test` | Notifications get a "🧪 TEST" prefix, so you can tell your test runs apart |
| `?demo` | Mochi performs all five tricks by herself |
| `?step=N` | Start as if No was tried N times (0–5) |
| `?screen=dates` / `?screen=ticket` | Jump to the date picker / ticket |

**Don't send {HER} a link with `?test` in it.**

## Tests
`python3 tests/run.py` runs the unit tests in headless Chrome.
`python3 tests/shot.py index.html "?step=3"` takes a screenshot into `tests/screenshots/`.
````

- [ ] **Step 2: Full test run**

Run: `python3 tests/run.py`
Expected: `ALL 41 PASSED`, exit code 0.

- [ ] **Step 3: Final screenshots at desktop and phone size**

Run `python3 tests/shot.py index.html "" 1500 1280x800` and `python3 tests/shot.py index.html "" 1500 375x667`, plus the same two sizes for `?step=5`, `?screen=dates` and `?screen=ticket`. Read all eight PNGs. There should be no clipped text, no horizontal overflow, no overlapping elements, and YES always fully on screen.

- [ ] **Step 4: Check against the spec**

Open `docs/superpowers/specs/2026-10-04-will-you-date-me-design.md` and tick each item against the running page (`python3 -m http.server 8000`):
- The 5-step table: names, labels, captions and YES sizes.
- The hover tease.
- Mochi blinks, swishes her tail, and purrs on click.
- The celebration elements.
- The five cards and their copy.
- The ticket copy.
- The three notification texts.
- The debug parameters.
- Firefox: open the same URL and run steps 1–2 of the Task 9 manual check, so No escalates and YES celebrates.

Fix anything missing before you commit.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README with ntfy setup, editing and debug params" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
