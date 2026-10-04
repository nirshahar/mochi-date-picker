# "Will You Date Me, {HER}?" — Cat-themed site

## Context
A playful "will you date me" page for {HER}, based on the trend where the "No" button misbehaves. Here the twist is about cats: **Mochi the cat guards the "No" button.** She swats it, sits on it, bats it around, and finally walks off with it, the way cats knock things off tables. After YES, {HER} picks a first-date idea and the site **pushes a notification to your phone** automatically.

The project folder (`/mnt/c/Users/hihia/Desktop/WillYouDateMe`) is empty, so everything here is new.

**Decided with the user**
- Desktop first, but it must be easy to switch to mobile later. "No" reacts to `pointerdown` (mouse and touch), not hover-only, so the core joke already works on phones.
- English. Cute fonts look better in English, and we skip right-to-left layout issues.
- Twist: the paw swats "No", with escalating jokes (detailed below).
- After YES: a celebration, then a date-idea picker, then an "official date ticket" card.
- Notifications use **ntfy.sh push**, with no backend. Events: **she said YES** and **she picked a date**.

**Success:** {HER} laughs her way through the No attempts, clicks YES, picks a date, and your phone buzzes with her choice.

## Approach
A static site: HTML, CSS and vanilla JS, with no framework, build step or backend. Scripts are classic `<script>` tags, so double-clicking `index.html` works, and the folder can go on GitHub Pages or Netlify Drop as is (hosting is decided at the end). The cats are hand-made **inline SVGs** with state classes for their expressions, so there are no image assets. Animations are CSS keyframes plus small JS helpers. The font is Fredoka from Google Fonts.

## Files
```
index.html          – the 3 screens: question / date picker / ticket
styles.css          – pastel pink + cream palette, faint paw-print background, all keyframes
js/config.js        – every editable text and setting (see below)
js/cats.js          – SVG builders: Mochi (expressions), Biscuit, paw, cat-face/paw/heart confetti
js/geometry.js      – pure geometry (unit-tested): randomSafeSpot(), safeCorner(), nearestEdge(), paw aiming, YES fit
js/fx.js            – DOM effects: paw strike/peek, glide, speech bubble, caption, screen shake, comic "SWAT!" burst
js/escalation.js    – escalation state machine (attempt count → step, busy lock; unit-tested)
js/no-button.js     – the five step choreographies + hover tease + wiring
js/celebration.js   – cat rain + Mochi's happy dance
js/date-picker.js   – date cards → ticket, "change my pick"
js/notify.js        – ntfy.sh sender (fire-and-forget)
js/main.js          – screen switching, debug URL params, wiring
```

`js/config.js`, the only file you'd need to edit:
```js
const CONFIG = {
  herName: "{HER}",
  fromName: "",                 // your name; empty → "me"
  catName: "Mochi",             // the guard cat
  sittingCatName: "Biscuit",    // the chubby one from step 3
  ntfyTopic: "{her}-date-<random-16-chars>",   // generated at build time
  attempts: [ /* noLabel + caption per step, see table */ ],
  dateIdeas: [ /* emoji, title, blurb */ ],
};
```

## Screen 1: the question

**Layout:** Mochi, a cream-and-orange tabby SVG, sits beside the headline **"{HER}, will you go on a date with me? 🐾"**. Below are **YES** (pink, with two little cat ears on top) and **No** (plain grey). A caption line under the buttons starts empty.

**Ambient life:** Mochi blinks at random every 3–6 seconds and slowly swishes her tail. If {HER} clicks Mochi herself, she purrs: a "purr~" bubble appears and a heart floats up (an easter egg).

**Hover tease (desktop only, before each attempt):** when the pointer comes near No, Mochi's eyes narrow into suspicious slits and follow the cursor, and a paw peeks about 30px in from the nearest screen edge and wiggles. When the pointer moves away, the paw pulls back and her eyes relax. Touch screens skip this part, and everything else still works.

**Escalation.** Every activation of No (`pointerdown`, or Enter/Space on the keyboard) triggers the next step. The real click never registers, and No ignores input while an animation plays. On the first attempt, No is taken out of the layout flow so YES can grow without pushing it around. YES gets bigger at every step through a `--yes-scale` CSS variable with a springy overshoot. Its maximum size is limited so it always fits on screen.

| # | Name | What happens | No label after | Caption | YES scale |
|---|------|--------------|----------------|---------|-----------|
| 1 | **The Swat** | A giant toe-bean paw shoots in from the nearest edge (≈250ms). A comic "SWAT!" burst appears. No spins 720° and flies off-screen in the swat direction, then drops in from the top at a random safe spot with a little bounce. Mochi looks smug. | "Are you sure?" | "Oops! Mochi's paw slipped 🐾" | 1.25 |
| 2 | **The Warning** | Mochi's ears flatten and a "mrrp?!" bubble appears. After a 300ms pause, a *double* swat: the first tap makes No wobble, the second sends it flying to a new spot. | "Really sure??" | "Mochi is very protective of this button." | 1.5 |
| 3 | **The Sit** | Biscuit, a chubby grey cat, falls from the top of the screen with a THUD (small screen shake) and sits right on No, which disappears underneath. After about 1.2s, No squeezes out sideways (squash and stretch), smaller, and scoots to a new spot leaving a paw-print trail. Biscuit stays loafed where he landed for the rest of the visit, with a little "zzz". | "pls 🥺" | "Biscuit is sitting on it. Sorry, those are the rules." | 1.8 |
| 4 | **The Bat-Around** | Two paws pop out from opposite sides and bat No back and forth like a toy, three ping-pongs, then fling it into a corner, now tiny (0.6×). Mochi's tail swishes twice as fast. | "no" (tiny) | "Cats don't take no for an answer." | 2.2, and the ears on YES wiggle |
| 5 | **Left the Chat** | Mochi gets up, trots over, picks No up in her mouth and trots off-screen. Caption 1: "*no has left the chat* 😼". After 2 seconds she trots back in from the other side and drops the button. It now has bite marks (a CSS mask) and reads **"yes 💕"**. Caption 2: "Mochi brought it back. With a few edits." | "yes 💕" | as described | 2.6 |

After step 5, both buttons mean YES. Clicking the former No button triggers the celebration like YES does. The notification reports how many No attempts she made.

**Safe positioning (`fx.randomSafeSpot`)** picks a random x/y inside the viewport with a margin, avoiding YES (plus 24px padding), Mochi, the headline and Biscuit. It retries up to 30 times and falls back to the emptiest corner. Positions are based on the viewport, so a phone layout only needs CSS changes.

## Screen 2: celebration + date picker

**On YES:**
- Both buttons pop like bubbles. Mochi does a happy hop with ^ ^ eyes, hearts rise from her, and Biscuit (if he's there) wakes up and hops too.
- **Cat rain:** about 40 falling cat faces in 4 fur colours, paw prints and hearts, each with a random x position, rotation and duration of 2–4s. They're DOM elements with CSS animations and are removed when the animation ends.
- Headline: **"YAAAY!! I knew it, {HER} 💕"**. Sub-line: "Mochi approves. (She never approves of anything.)"
- 🔔 Notification sent: **"{HER} said YES! 💕"**, body "After 3 no-attempts 😼". With 0 attempts it says "Didn't even try to say no 🥹".
- After about 3s the date picker fades in.

**Date picker:** the heading is "Okay, now the important part… pick our first date 😽". Cards sit in a grid (one column on narrow screens):
- ☕🐱 **Cat café**: "Coffee, surrounded by judgmental cats."
- 🧺 **Picnic in the park**: "Sandwiches, sunshine, maybe a stray cat."
- 🍿 **Movie night**: "Blanket, snacks, you pick the movie."
- 🍦 **Sunset walk + ice cream**: "Golden hour and two scoops."
- 🎁 **Surprise me**: "Trust me (and Mochi)."

When the pointer is over a card, it tilts slightly and two cat ears pop up on its top edge. Clicking a card stamps a paw print on it with a "thunk", then moves to the ticket.

## Screen 3: the date ticket
A ticket-style card with a perforated edge:
> 🎟️ **OFFICIAL DATE TICKET**: admits two
> **{HER} + {fromName or "me"}**
> Plan: ☕🐱 Cat café
> Approved by: Mochi 🐾 *(paw-print stamp)*

Under the ticket: "Screenshot this and send it to me 😽 …actually, Mochi already told me." This is honest about the automatic notification, and it's a cute reveal. A small "change my pick" link goes back to the cards.

🔔 Notification sent: **"{HER} picked a date! 🐾"**, body "☕🐱 Cat café". If she changes her pick: title "{HER} changed her pick", body "→ 🍿 Movie night".

## Notifications (ntfy.sh)
- `notify.js` POSTs a JSON body `{ topic, title, message, tags: ["cat","heart"], priority: 4 }` to `https://ntfy.sh/` with `mode: "no-cors"` and `keepalive: true`. It uses the JSON body because emoji aren't allowed in HTTP header values, and `fetch` throws if you try. Plain text with no custom headers makes this a "simple" request, so there's no CORS preflight.
- It's fire-and-forget: failures are swallowed silently, so {HER} never sees an error.
- The YES notification is sent at most once per page load.
- **Test mode:** adding `?test` to the URL puts "🧪 TEST" in front of every notification title, so you can tell your own test runs from the real thing.
- **Your one-time setup:** install the ntfy app (Android/iOS) and subscribe to the topic from `config.js`. I'll generate a long random topic name so nobody can guess it. It is still visible in the page source, which is the accepted tradeoff.

## Debug helpers (for testing)
- `?step=N` starts with N No attempts already done, to check one step quickly.
- `?screen=dates` / `?screen=ticket` jumps straight to a later screen.
- `?demo` makes Mochi perform all five tricks by herself, one after another (YES is never clicked, so no notification is sent).
- These can be combined with `?test`.
- Unit tests: `python3 tests/run.py` runs `tests/test.html` in headless Chrome (there's no Node on this machine). `python3 tests/shot.py` takes screenshots for visual checks.

## Process notes
- On approval: `git init` the folder, save this design to `docs/superpowers/specs/2026-10-04-will-you-date-me-design.md` and commit it. Then write the implementation plan with writing-plans and implement.
- `fromName` stays a placeholder ("me") unless you give me your name.
- Hosting (GitHub Pages or Netlify Drop) and a mobile polish pass are separate follow-ups.

## Verification
1. Serve locally with `python3 -m http.server` (Node isn't installed) and open `http://localhost:8000/?test`.
2. Go through all 5 No steps and check each animation, label and caption. Check that No never leaves the screen or overlaps YES, Mochi or Biscuit, and that spam-clicking during an animation does nothing. Check that Tab + Enter on No triggers a swat.
3. Click YES and confirm the cat rain, the "🧪 TEST {HER} said YES" push on your phone with the right attempt count, the date picker, the ticket and a second push. Then change the pick and confirm a third push.
4. Use `?step=4` and `?screen=dates` to re-check individual parts.
5. Check at a phone width in Chrome DevTools device mode: tapping No triggers the swat and the layout doesn't break.
6. No console errors in Chrome and Firefox.
