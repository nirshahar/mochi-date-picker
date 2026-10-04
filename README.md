# A question for Shira 🐾

A cat-themed "will you date me?" page. Mochi the cat guards the **No** button: she swats it, Biscuit sits on it, paws bat it around, and finally Mochi walks off with it and brings it back as "yes 💕". After YES, Shira picks a first date, gets an official date ticket, and your phone gets a push notification.

## Open it
Double-click `index.html`, or put the folder on any static host (GitHub Pages, Netlify Drop). No build step.

## Get the notifications (one-time)
1. Install the **ntfy** app (Android / iOS).
2. Subscribe to the topic `shira-date-d371b01f36fbcfff` (server `ntfy.sh`), which is `ntfyTopic` in `js/config.js`.
3. You'll get "Shira said YES! 💕" (with how many times she tried No) and "Shira picked a date! 🐾" (plus "changed her pick" if she does).

When you first subscribe you may see a few "🧪 TEST" messages: those are from testing the page.

## Edit
Everything you might want to change is in `js/config.js`: your name (`fromName`, shown on the ticket), all text, the captions for the five No tricks, and the date ideas.

## Preview / debug (add to the URL)
| Param | What it does |
|-------|--------------|
| `?test` | Notifications get a "🧪 TEST" prefix, so you can tell your test runs apart |
| `?demo` | Mochi performs all five tricks by herself |
| `?step=N` | Start as if No was tried N times (0–5) |
| `?screen=dates` / `?screen=ticket` | Jump to the date picker / ticket |

**Don't send Shira a link with any of these in it.**

## Tests
- `python3 tests/run.py` runs the unit tests in headless Chrome.
- `python3 tests/shot.py index.html "?step=3"` takes a screenshot into `tests/screenshots/`. Add `--live` to run animations in real time, and `--act=down:no@600,click:yes@4000` to script clicks (see `tests/frame.html`).
- `tests/gallery.html` shows every cat drawing and mood.
