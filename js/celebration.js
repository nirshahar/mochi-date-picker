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
    App.sfx.play("fanfare");
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
    App.sfx.play("sparkles");
    for (let i = 0; i < 8; i++) {
      setTimeout(() => App.fx.floatHeart(App.fx.rectOf(mochiEl)), i * 280);
    }
    await App.fx.wait(3200);
  }

  App.celebrate = celebrate;
  App.catRain = catRain;
})();
