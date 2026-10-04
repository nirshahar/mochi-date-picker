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

// Fri 30 Oct 2026, mid-afternoon: the list must cross into November.
const FROM = new Date(2026, 9, 30, 15, 0);

test("dates.upcomingDays: starts today, crosses month ends, labels today and tomorrow", () => {
  const days = App.dates.upcomingDays(FROM, 4);
  eq(days.map((d) => d.name), ["Fri 30 Oct", "Sat 31 Oct", "Sun 1 Nov", "Mon 2 Nov"]);
  eq(days.map((d) => d.relative), ["Today", "Tomorrow", "", ""]);
  eq(days.map((d) => d.iso), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  eq([days[2].weekday, days[2].day, days[2].month], ["Sun", 1, "Nov"]);
});

test("dates.upcomingDays: two weeks by default config", () => {
  eq(CONFIG.dayCount, 14);
  eq(App.dates.upcomingDays(FROM, CONFIG.dayCount).length, 14);
});

test("dates.renderDayCards: one card per day, clicking one picks it (once)", async () => {
  const box = document.createElement("div");
  const picked = [];
  App.dates.renderDayCards(box, App.dates.upcomingDays(FROM, 3), (day) => picked.push(day.name), { stampMs: 0 });
  const cards = box.querySelectorAll(".day-card");
  eq(cards.length, 3);
  eq(cards[0].querySelector(".day-name").textContent, "Today");
  eq(cards[2].querySelector(".day-name").textContent, "Sun");
  eq(cards[2].querySelector(".day-num").textContent, "1");
  eq(cards[2].querySelector(".day-month").textContent, "Nov");
  cards[2].click();
  cards[1].click();
  assert(cards[2].classList.contains("stamped"), "stamped class");
  await tick();
  eq(picked, ["Sun 1 Nov"]);
});

test("dates.renderTicket: shows when, if a day was picked", () => {
  const box = document.createElement("div");
  const day = App.dates.upcomingDays(FROM, 2)[1];
  App.dates.renderTicket(box, { herName: "Her", fromName: "Me", catName: "Mochi", idea: IDEAS[0], day });
  eq(box.querySelector(".ticket-when b").textContent, "Sat 31 Oct");
});
