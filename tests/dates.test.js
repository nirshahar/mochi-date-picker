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
  App.dates.renderTicket(box, { herName: "Her", fromName: "Me", catName: "Mochi", idea: IDEAS[0] });
  eq(box.querySelector(".ticket-names").textContent, "Her + Me");
  eq(box.querySelector(".ticket-plan b").textContent, "☕🐱 Cat café");
  eq(box.querySelector(".ticket-cat").textContent, "Mochi 🐾");
});

test("dates.renderTicket: empty or blank fromName becomes 'me'", () => {
  const box = document.createElement("div");
  App.dates.renderTicket(box, { herName: "Her", fromName: "  ", catName: "Mochi", idea: IDEAS[0] });
  eq(box.querySelector(".ticket-names").textContent, "Her + me");
});

test("dates.renderTicket: names are text, never HTML", () => {
  const box = document.createElement("div");
  App.dates.renderTicket(box, { herName: "<b>x</b>", fromName: "", catName: "Mochi", idea: IDEAS[0] });
  eq(box.querySelector(".ticket-names b"), null);
});
