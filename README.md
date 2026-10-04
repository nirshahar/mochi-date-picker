# A question for her 🐾

A cat-themed "will you date me?" page. Mochi the cat guards the **No** button: she swats it, Biscuit sits on it, paws bat it around, and finally Mochi walks off with it and brings it back as "yes 💕". After YES, she picks a first date and a day (from the next two weeks), gets an official date ticket, and your phone gets a push notification.

All names live in `js/config.js`: `HER` (who's being asked) and `ME` (you, shown on the ticket). Change them there and the whole page follows. Below, `{HER}` means whatever `HER` is set to.

## Open it
Double-click `index.html`, or put the folder on any static host (GitHub Pages, Netlify Drop). No build step.

## Send her the secret link
Notifications only come from visits through the link that ends in `#` + `linkKey` from `js/config.js`:

```
https://<your-user>.github.io/<repo>/#<linkKey>
```

Visits to the bare URL (scrapers, people browsing the repo) never notify you. With `?test` or any preview param they still do, marked 🧪 TEST, so you can try it yourself. On top of that, the "opened the page" push waits for a real person (a mouse move, tap, scroll or key press) and skips bots and headless browsers, and the page asks search engines not to index it. Set `linkKey` to `""` to notify on every visit.

## Get the notifications (one-time)
1. Install the **ntfy** app (Android / iOS).
2. Subscribe to the topic in `js/config.js` (`ntfyTopic`), on server `ntfy.sh`.
3. You'll get "👀 {HER} just opened the page" (on a phone / on a computer) once she starts interacting, then "{HER} said YES! 💕" (with how many times she tried No) and "{HER} picked a date! 🐾" with the idea and the day (plus "changed her pick" if she does).

When you first subscribe you may see a few "🧪 TEST" messages: those are from testing the page.

## Edit
Everything you might want to change is in `js/config.js`: the names (`HER`, `ME`), all text, the captions for the five No tricks, the date ideas, how many days ahead she can pick (`dayCount`), and the ntfy topic.

## Preview / debug (add to the URL)
| Param | What it does |
|-------|--------------|
| `?test` | Notifications get a "🧪 TEST" prefix, so you can tell your test runs apart (any of the params below turns this on too) |
| `?demo` | Mochi performs all five tricks by herself |
| `?step=N` | Start as if No was tried N times (0–5) |
| `?screen=dates` / `?screen=days` / `?screen=ticket` | Jump to the date idea picker / day picker / ticket |

**Don't send her a link with any of these in it.**

## Tests
- `python3 tests/run.py` runs the unit tests in headless Chrome.
- `python3 tests/shot.py index.html "?step=3"` takes a screenshot into `tests/screenshots/`. Add `--live` to run animations in real time, and `--act=down:no@600,click:yes@4000` to script clicks (see `tests/frame.html`).
- `tests/gallery.html` shows every cat drawing and mood.
