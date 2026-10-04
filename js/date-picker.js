// Date idea cards, day cards and the final "date ticket".
window.App = window.App || {};

(function () {
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");

  // The next `count` days starting today (local time), e.g. { name: "Fri 30 Oct", relative: "Today", ... }.
  function upcomingDays(from, count) {
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      const weekday = WEEKDAYS[d.getDay()];
      const month = MONTHS[d.getMonth()];
      return {
        iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        weekday,
        day: d.getDate(),
        month,
        name: `${weekday} ${d.getDate()} ${month}`,
        relative: ["Today", "Tomorrow"][i] || "",
      };
    });
  }

  // Shared by idea and day cards: one button per item, a paw stamp on click, one pick per render.
  function renderCards(container, items, { className, markup, fill }, onPick, stampMs) {
    container.replaceChildren();
    let picked = false;
    items.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = className;
      card.innerHTML = `<span class="card-ears"></span>${markup}<span class="card-stamp"></span>`;
      fill(card, item);
      card.querySelector(".card-stamp").innerHTML = App.cats.pawPrint("#e84d80");
      card.addEventListener("click", () => {
        if (picked) return;
        picked = true;
        card.classList.add("stamped");
        setTimeout(() => onPick(item), stampMs);
      });
      container.appendChild(card);
    });
  }

  function renderDateCards(container, ideas, onPick, { stampMs = 600 } = {}) {
    renderCards(container, ideas, {
      className: "date-card",
      markup: '<span class="card-emoji"></span><span class="card-title"></span><span class="card-blurb"></span>',
      fill(card, idea) {
        card.querySelector(".card-emoji").textContent = idea.emoji;
        card.querySelector(".card-title").textContent = idea.title;
        card.querySelector(".card-blurb").textContent = idea.blurb;
      },
    }, onPick, stampMs);
  }

  function renderDayCards(container, days, onPick, { stampMs = 600 } = {}) {
    renderCards(container, days, {
      className: "date-card day-card",
      markup: '<span class="day-name"></span><span class="day-num"></span><span class="day-month"></span>',
      fill(card, day) {
        card.querySelector(".day-name").textContent = day.relative || day.weekday;
        card.querySelector(".day-num").textContent = day.day;
        card.querySelector(".day-month").textContent = day.month;
      },
    }, onPick, stampMs);
  }

  function renderTicket(container, { herName, fromName, catName, idea, day }) {
    container.innerHTML = `
      <div class="ticket">
        <div class="ticket-head">🎟️ OFFICIAL DATE TICKET <span class="ticket-admit">admits two</span></div>
        <div class="ticket-names"></div>
        <div class="ticket-plan">Plan: <b></b></div>
        <div class="ticket-when" hidden>When: <b></b></div>
        <div class="ticket-approved">Approved by: <span class="ticket-cat"></span></div>
        <div class="ticket-stamp"></div>
      </div>`;
    container.querySelector(".ticket-names").textContent = `${herName} + ${(fromName || "").trim() || "me"}`;
    container.querySelector(".ticket-plan b").textContent = `${idea.emoji} ${idea.title}`;
    if (day) {
      container.querySelector(".ticket-when b").textContent = day.name;
      container.querySelector(".ticket-when").hidden = false;
    }
    container.querySelector(".ticket-cat").textContent = `${catName} 🐾`;
    container.querySelector(".ticket-stamp").innerHTML = App.cats.pawPrint("#e84d80");
  }

  App.dates = { upcomingDays, renderDateCards, renderDayCards, renderTicket };
})();
