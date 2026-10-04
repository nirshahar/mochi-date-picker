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
