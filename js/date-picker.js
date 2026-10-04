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
