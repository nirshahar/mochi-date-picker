// Cute sound effects, synthesized live with Web Audio (no audio files to load).
window.App = window.App || {};

(function () {
  const VOLUME = 0.6;
  const STORAGE_KEY = "mochi-sound-muted";
  const C5 = 523.25;
  const note = (semitones) => C5 * 2 ** (semitones / 12);

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

  // A rolled "rrr": a tone whose loudness flutters ~30 times a second.
  function trill(ctx, out, t, { glide, dur, peak }) {
    const flutter = ctx.createGain();
    flutter.gain.value = 0.6;
    flutter.connect(out);
    wobble(ctx, flutter.gain, t, { rate: 30, depth: 0.4, dur });
    tone(ctx, flutter, t, { type: "triangle", glide, dur, peak, attack: 0.02, hold: dur * 0.6 });
  }

  // A bright little note: triangle plus a soft octave above, like a toy piano.
  function chime(ctx, out, t, { freq, dur = 0.35, peak = 0.2 }) {
    tone(ctx, out, t, { type: "triangle", glide: [[0, freq]], dur, peak });
    tone(ctx, out, t, { glide: [[0, freq * 2]], dur: dur * 0.7, peak: peak * 0.35 });
  }

  // A water-drop "boop": the pitch starts high and drops onto `freq`.
  function blip(ctx, out, t, { freq, dur = 0.18, peak = 0.3, droop = 1 }) {
    tone(ctx, out, t, { glide: [[0, freq * 1.6], [0.025, freq], [dur, freq * droop]], dur, peak });
  }

  // ---------- the sounds ----------
  const SOUNDS = {
    // Petting Mochi: a tiny "prrt" and then a rumbling purr.
    purr(ctx, out, t) {
      trill(ctx, out, t, { glide: [[0, 620], [0.14, 820]], dur: 0.16, peak: 0.12 });
      const dur = 1.1;
      const pulse = ctx.createGain();
      pulse.gain.value = 0.5;
      pulse.connect(envelope(ctx, out, t + 0.1, { peak: 1.6, attack: 0.15, hold: 0.75, dur }));
      wobble(ctx, pulse.gain, t + 0.1, { rate: 26, depth: 0.5, dur });
      noise(ctx, pulse, t + 0.1, { filter: "lowpass", sweep: [[0, 520]], q: 0.7, dur, peak: 1, attack: 0.001, hold: dur - 0.01 });
    },

    // Step 2's "mrrp?!": a trill that rises at the end, like a question.
    mrrp(ctx, out, t) {
      trill(ctx, out, t, { glide: [[0, 520], [0.18, 600], [0.34, 1080]], dur: 0.38, peak: 0.4 });
    },

    // A happy cartoon "mew": the filter opens and closes like a mouth (m-ee-ow).
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

    // A paw swiping in; loudest just as it reaches the button.
    whoosh(ctx, out, t) {
      noise(ctx, out, t, { sweep: [[0, 500], [0.2, 2600], [0.3, 900]], q: 1.2, dur: 0.32, peak: 0.9, attack: 0.18 });
    },

    // The paw connecting: a soft "thwap".
    swat(ctx, out, t) {
      noise(ctx, out, t, { sweep: [[0, 1800], [0.09, 900]], q: 0.8, dur: 0.1, peak: 0.6, attack: 0.002 });
      tone(ctx, out, t, { type: "triangle", glide: [[0, 420], [0.1, 140]], dur: 0.12, peak: 0.4, attack: 0.002 });
    },

    // Step 2's warning tap.
    tap(ctx, out, t) {
      tone(ctx, out, t, { glide: [[0, 950], [0.06, 620]], dur: 0.09, peak: 0.3, attack: 0.002 });
    },

    // No landing after a swat: boyoyoyoing.
    boing(ctx, out, t) {
      const dur = 0.5;
      const spring = tone(ctx, out, t, { type: "triangle", glide: [[0, 140], [0.4, 330]], dur, peak: 0.4 });
      wobble(ctx, spring.frequency, t, { rate: 16, depth: [[0, 70], [dur, 4]], dur });
    },

    // Biscuit falling from the sky: a slide whistle going down.
    slide(ctx, out, t) {
      tone(ctx, out, t, { glide: [[0, 1500], [0.46, 260]], dur: 0.5, peak: 0.16, attack: 0.03, hold: 0.42 });
    },

    // Biscuit landing on No.
    thud(ctx, out, t) {
      tone(ctx, out, t, { type: "triangle", glide: [[0, 160], [0.25, 48]], dur: 0.35, peak: 0.7, attack: 0.003 });
      noise(ctx, out, t, { filter: "lowpass", sweep: [[0, 700], [0.2, 120]], dur: 0.2, peak: 0.6, attack: 0.002 });
    },

    // No squeezing out from under Biscuit, like a rubber toy.
    squeak(ctx, out, t) {
      const toy = tone(ctx, out, t, { type: "triangle", glide: [[0, 1100], [0.09, 1900], [0.22, 1300]], dur: 0.24, peak: 0.22, attack: 0.01, hold: 0.15 });
      wobble(ctx, toy.frequency, t, { rate: 24, depth: 40, dur: 0.24 });
    },

    // The trail of six paw prints (over 0.8s, in step with fx.pawTrail).
    patter(ctx, out, t) {
      for (let i = 1; i <= 6; i++) {
        const at = t + (0.8 * i) / 7;
        noise(ctx, out, at, { sweep: [[0, i % 2 ? 2400 : 3000]], q: 3, dur: 0.05, peak: 0.6, attack: 0.002 });
      }
    },

    // One soft footstep while Mochi walks.
    step(ctx, out, t) {
      noise(ctx, out, t, { filter: "lowpass", sweep: [[0, 700 + Math.random() * 300]], dur: 0.06, peak: 0.3, attack: 0.003 });
    },

    // A pat in the bat-around; `pitch` (semitones above C5) makes the three pats rise.
    boop(ctx, out, t, { pitch = 0 } = {}) {
      blip(ctx, out, t, { freq: note(pitch), dur: 0.2, peak: 0.32 });
    },

    // The bat-around's final BONK.
    bonk(ctx, out, t) {
      tone(ctx, out, t, { type: "triangle", glide: [[0, 520], [0.12, 250]], dur: 0.24, peak: 0.5, attack: 0.002 });
      tone(ctx, out, t, { glide: [[0, 1560], [0.05, 900]], dur: 0.07, peak: 0.2, attack: 0.001 });
      noise(ctx, out, t, { sweep: [[0, 1200]], q: 2, dur: 0.04, peak: 0.5, attack: 0.001 });
    },

    // "no has left the chat": two notes going down, the second one drooping.
    leave(ctx, out, t) {
      blip(ctx, out, t, { freq: note(7), dur: 0.16, peak: 0.3 });
      blip(ctx, out, t + 0.17, { freq: note(0), dur: 0.36, peak: 0.3, droop: 0.85 });
    },

    // Mochi bringing No back as "yes 💕": a quick sparkly arpeggio up.
    sparkle(ctx, out, t) {
      [12, 16, 19, 24].forEach((st, i) => chime(ctx, out, t + i * 0.07, { freq: note(st), dur: 0.4, peak: 0.14 }));
    },

    // YES: ta-da-da-DAAA, then a happy mew.
    fanfare(ctx, out, t) {
      [0, 4, 7].forEach((st, i) => chime(ctx, out, t + i * 0.12, { freq: note(st), dur: 0.22, peak: 0.2 }));
      chime(ctx, out, t + 0.36, { freq: note(12), dur: 0.8, peak: 0.24 });
      SOUNDS.mew(ctx, out, t + 0.95);
    },

    // Little plinks while the cats rain down (random notes of a pentatonic scale).
    sparkles(ctx, out, t) {
      const scale = [0, 2, 4, 7, 9];
      for (let i = 0; i < 14; i++) {
        const st = 12 + scale[Math.floor(Math.random() * scale.length)] + (Math.random() < 0.4 ? 12 : 0);
        tone(ctx, out, t + Math.random() * 2.2, { glide: [[0, note(st)]], dur: 0.25, peak: 0.07 + Math.random() * 0.05 });
      }
    },

    // A card being stamped with a paw.
    pop(ctx, out, t) {
      tone(ctx, out, t, { glide: [[0, 380], [0.06, 1300]], dur: 0.1, peak: 0.35, attack: 0.002 });
    },

    // The ticket: ta-da, then a soft thump when its paw stamp lands (0.9s, as in the CSS).
    tada(ctx, out, t) {
      chime(ctx, out, t, { freq: note(7), dur: 0.14, peak: 0.2 });
      chime(ctx, out, t + 0.14, { freq: note(12), dur: 0.6, peak: 0.24 });
      tone(ctx, out, t + 0.9, { type: "triangle", glide: [[0, 300], [0.1, 120]], dur: 0.14, peak: 0.3, attack: 0.002 });
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
