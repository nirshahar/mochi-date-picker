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
