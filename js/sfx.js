// Simple click sounds, synthesized live with Web Audio (no audio files to load).
window.App = window.App || {};

(function () {
  const VOLUME = 0.6;
  const STORAGE_KEY = "mochi-sound-muted";

  // ---------- building blocks: each schedules nodes on `ctx` from time `t`, into `out` ----------

  // Sets `param` through [secondsAfterT, value] points, gliding exponentially between them.
  function ramp(param, t, points) {
    param.setValueAtTime(points[0][1], t + points[0][0]);
    points.slice(1).forEach(([dt, value]) => param.exponentialRampToValueAtTime(value, t + dt));
  }

  // Loudness: up to `peak` in `attack`, held until `hold`, then fading out by `dur`.
  function envelope(ctx, out, t, { peak, attack = 0.005, hold = attack, dur }) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(out);
    return g;
  }

  // An oscillator whose pitch follows `glide` ([secondsAfterT, Hz] points).
  function tone(ctx, out, t, { type = "sine", glide, dur, peak = 0.3, attack, hold }) {
    const osc = ctx.createOscillator();
    osc.type = type;
    ramp(osc.frequency, t, glide);
    osc.connect(envelope(ctx, out, t, { peak, attack, hold, dur }));
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return osc;
  }

  // A low-frequency oscillator wobbling `param` by ±depth (depth may be [secondsAfterT, amount] points).
  function wobble(ctx, param, t, { rate, depth, dur }) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const amount = ctx.createGain();
    if (Array.isArray(depth)) ramp(amount.gain, t, depth);
    else amount.gain.value = depth;
    lfo.connect(amount).connect(param);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  const noiseBuffers = new WeakMap();
  function noiseBuffer(ctx) {
    if (!noiseBuffers.has(ctx)) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // one second, looped
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noiseBuffers.set(ctx, buffer);
    }
    return noiseBuffers.get(ctx);
  }

  // Filtered hiss; the filter frequency follows `sweep` ([secondsAfterT, Hz] points).
  function noise(ctx, out, t, { filter = "bandpass", sweep, q = 1, dur, peak = 0.3, attack, hold }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    ramp(f.frequency, t, sweep);
    src.connect(f).connect(envelope(ctx, out, t, { peak, attack, hold, dur }));
    src.start(t);
    src.stop(t + dur + 0.05);
    return src;
  }

  // ---------- the sounds ----------
  const SOUNDS = {
    // Petting Mochi: a purr is ~25 soft rattles a second, swelling as she breathes out, then softer in.
    purr(ctx, out, t) {
      const rate = ctx.sampleRate;
      const breaths = [
        { start: 0, dur: 0.75, pulses: 25, level: 1 }, // out
        { start: 0.82, dur: 0.55, pulses: 27, level: 0.55 }, // in
      ];
      const buffer = ctx.createBuffer(1, Math.ceil(rate * 1.45), rate);
      const data = buffer.getChannelData(0);
      const len = Math.floor(rate * 0.045);
      breaths.forEach(({ start, dur, pulses, level }) => {
        // a little uneven, like a real cat
        for (let at = start; at < start + dur; at += (1 + (Math.random() - 0.5) * 0.2) / pulses) {
          const swell = level * Math.sin((Math.PI * (at - start)) / dur) * (0.75 + Math.random() * 0.25);
          const from = Math.floor(at * rate);
          for (let i = 0; i < len && from + i < data.length; i++) {
            const x = i / (rate * 0.006); // each rattle swells in over 6ms and dies away, no click
            data[from + i] += swell * (Math.random() * 2 - 1) * x * Math.exp(1 - x);
          }
        }
      });
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      // two lowpasses in a row: a purr is all chest, nothing above ~650 Hz
      const chest = [650, 650].map((f) => {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = f;
        lp.Q.value = 0.7;
        return lp;
      });
      const level = ctx.createGain();
      level.gain.value = 2;
      src.connect(chest[0]).connect(chest[1]).connect(level).connect(out);
      src.start(t);
      // the breath itself: a little air under the rattle
      breaths.forEach(({ start, dur, level: l }) => {
        noise(ctx, out, t + start, { sweep: [[0, 1100]], q: 0.5, dur, peak: 0.05 * l, attack: dur * 0.4, hold: dur * 0.5 });
      });
    },

    // YES: a happy cartoon "mew" (the filter opens and closes like a mouth: m-ee-ow).
    mew(ctx, out, t) {
      const dur = 0.55;
      const mouth = ctx.createBiquadFilter();
      mouth.type = "lowpass";
      mouth.Q.value = 5;
      ramp(mouth.frequency, t, [[0, 700], [0.12, 3200], [0.5, 900]]);
      mouth.connect(out);
      const voice = tone(ctx, mouth, t, {
        type: "sawtooth", glide: [[0, 620], [0.1, 900], [0.3, 820], [dur, 560]], dur, peak: 0.16, attack: 0.04, hold: 0.32,
      });
      wobble(ctx, voice.frequency, t, { rate: 7, depth: 12, dur });
    },

    // Clicking No or "change my pick": a soft little tap.
    tap(ctx, out, t) {
      tone(ctx, out, t, { glide: [[0, 950], [0.06, 620]], dur: 0.09, peak: 0.3, attack: 0.002 });
    },

    // A card being stamped with a paw (and unmuting).
    pop(ctx, out, t) {
      tone(ctx, out, t, { glide: [[0, 380], [0.06, 1300]], dur: 0.1, peak: 0.35, attack: 0.002 });
    },
  };

  // ---------- the player ----------
  function browserContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return AudioContext ? new AudioContext() : null;
  }

  function browserStorage() {
    try {
      return window.localStorage;
    } catch (err) {
      return null;
    }
  }

  // Taps, clicks and key presses: the only moments a browser lets audio start.
  const GESTURES = ["pointerdown", "touchend", "click", "keydown"];

  App.createSfx = function ({ makeContext = browserContext, storage = browserStorage() } = {}) {
    let ctx = null;
    let master = null;
    let tried = false;
    let muted = false;
    const toggles = [];

    try {
      muted = !!storage && storage.getItem(STORAGE_KEY) === "1";
    } catch (err) {
      // private mode: sound on
    }

    function unlock() {
      if (!tried) {
        tried = true;
        try {
          ctx = makeContext();
        } catch (err) {
          ctx = null;
        }
        if (!ctx) return;
        master = ctx.createGain();
        master.gain.value = muted ? 0 : VOLUME;
        master.connect(ctx.destination);
      }
      if (ctx && ctx.state === "suspended") Promise.resolve(ctx.resume()).catch(() => {});
    }

    // Keeps unlocking on each gesture until the audio is actually running (iOS can need two).
    function listen(target) {
      const opts = { capture: true, passive: true };
      function handler() {
        unlock();
        if (!ctx || ctx.state === "running") GESTURES.forEach((type) => target.removeEventListener(type, handler, opts));
      }
      GESTURES.forEach((type) => target.addEventListener(type, handler, opts));
    }

    // Returns true when the sound was scheduled; never throws.
    function play(name, opts = {}) {
      if (muted || !ctx) return false;
      const sound = SOUNDS[name];
      if (!sound) {
        console.warn(`no sound called "${name}"`);
        return false;
      }
      try {
        sound(ctx, master, ctx.currentTime + 0.02, opts);
        return true;
      } catch (err) {
        console.error(`sound "${name}" failed`, err);
        return false;
      }
    }

    function renderToggle(btn) {
      btn.textContent = muted ? "🔇" : "🔊";
      btn.setAttribute("aria-pressed", String(!muted));
      btn.title = muted ? "Sound off" : "Sound on";
    }

    function setMuted(value) {
      muted = !!value;
      try {
        if (storage) storage.setItem(STORAGE_KEY, muted ? "1" : "0");
      } catch (err) {
        // private mode: remembered for this visit only
      }
      if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.015);
      toggles.forEach(renderToggle);
    }

    function bindToggle(btn) {
      toggles.push(btn);
      renderToggle(btn);
      btn.addEventListener("click", () => {
        setMuted(!muted);
        play("pop");
      });
    }

    return {
      get muted() { return muted; },
      names: Object.keys(SOUNDS),
      unlock, listen, play, setMuted, bindToggle,
    };
  };

  App.sfx = App.createSfx();
})();
