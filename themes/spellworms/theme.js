/* Spellworms — theme layer: art hookups, sound design, celebration choreography.
   Shared rules and shell live in ../../engine/. */
(function () {
  'use strict';

  const E = window.SpellEngine;
  const fx = window.SpellFx;

  const plume = document.getElementById('spellworm');       // the plume <use> carries her face
  const anchor = document.querySelector('#scene .hero .plume-anchor');
  const wormMouth = document.getElementById('worm-mouth');
  const ventStack = document.getElementById('vent-stack');
  const MOODS = ['munching', 'yucking'];

  // the three sulfides a vent actually precipitates, in the colours they come out
  const MINERALS = ['mineral-pyrite', 'mineral-copper', 'mineral-barite'];
  const MINERAL_BOX = '-28 -28 56 56';

  /* ---------- sound design: glassy, watery, a long way down ---------- */

  // A bell that climbs through the word, wrapped in a little bubble of water.
  const SCALE = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  function plink(letterIndex) {
    const f = SCALE[Math.min(letterIndex, SCALE.length - 1)];
    fx.tone(f, 0, 0.3, 'sine', 0.2);
    fx.tone(f * 2, 0.01, 0.14, 'triangle', 0.06);
    fx.sweep(f * 0.6, f * 1.6, 0.14, 'sine', 0.05);      // the bubble
    fx.noise(0.1, 0.02, 0.035, 2600, 'bandpass');
  }

  // Wrong letter: the vent burps and goes quiet. Daft, not scary.
  function gulp() {
    fx.sweep(230, 64, 0.55, 'sine', 0.16);
    fx.noise(0.3, 0, 0.09, 260, 'lowpass');
    fx.tone(98, 0.22, 0.2, 'triangle', 0.07);
  }

  function ping() {
    fx.tone(1396.9, 0, 0.5, 'sine', 0.1);
    fx.tone(2093.0, 0.02, 0.3, 'sine', 0.05);
  }

  function clack() {
    fx.noise(0.05, 0, 0.16, 3200, 'bandpass');
    fx.tone(880, 0, 0.05, 'square', 0.05);
  }

  function flap() {
    fx.noise(0.3, 0, 0.07, 700, 'lowpass');
    fx.sweep(180, 90, 0.3, 'sine', 0.05);
  }

  function pop() {
    fx.sweep(160, 640, 0.13, 'sine', 0.18);
    fx.tone(880, 0.1, 0.12, 'triangle', 0.08);
  }

  function rumble(dur) {
    fx.noise(dur, 0, 0.11, 180, 'lowpass');
    fx.sweep(70, 130, dur, 'triangle', 0.06);
  }

  function boom() {
    fx.noise(0.9, 0, 0.26, 240, 'lowpass');
    fx.sweep(160, 40, 0.8, 'sawtooth', 0.14);
  }

  function shimmer(startIn) {
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((f, i) => {
      fx.tone(f, startIn + i * 0.1, 0.3, 'sine', 0.09);
    });
  }

  function fanfare() {
    [392.0, 523.25, 659.25, 783.99].forEach((f, i) => {
      fx.tone(f, i * 0.13, 0.34, 'sine', 0.17);
      fx.tone(f * 2, i * 0.13 + 0.01, 0.16, 'triangle', 0.05);
    });
    fx.noise(0.5, 0.5, 0.05, 900, 'lowpass');           // a swell of warm water
  }

  function bigFanfare() {
    [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      fx.tone(f, i * 0.12, 0.38, 'sine', 0.17);
      fx.tone(f * 2, i * 0.12 + 0.01, 0.18, 'triangle', 0.05);
    });
    fx.tone(1567.98, 0.8, 0.8, 'sine', 0.11);
    fx.noise(0.7, 0.76, 0.07, 800, 'lowpass');
  }

  /* ---------- the vent hiccup (the wrong-letter animation) ---------- */

  let stallTimer = null;
  function stallVent() {
    clearTimeout(stallTimer);
    ventStack.classList.remove('stalled');
    // a reflow, or re-adding the class in the same frame wouldn't restart the cough
    void ventStack.getBoundingClientRect();
    ventStack.classList.add('stalled');
    stallTimer = setTimeout(() => ventStack.classList.remove('stalled'), 1000);
  }

  let duckTimer = null;
  function duckAnchor() {
    clearTimeout(duckTimer);
    anchor.classList.remove('ducking');
    void anchor.getBoundingClientRect();
    anchor.classList.add('ducking');
    duckTimer = setTimeout(() => anchor.classList.remove('ducking'), 1100);
  }

  /* ---------- celebrations ---------- */

  const scenes = {
    crab: {
      caption: 'A ghost crab scuttles over to say hello!',
      duration: 6200,
      // a claw-clack on every sideways step, then a happy little chirp
      start() {
        const beats = [];
        for (let i = 0; i < 7; i++) beats.push([420 + i * 300, clack]);
        beats.push([2700, () => { fx.tone(659.25, 0, 0.2, 'sine', 0.13); fx.tone(880, 0.14, 0.26, 'sine', 0.13); }]);
        return E.steps(beats);
      },
    },

    octopus: {
      caption: 'A dumbo octopus flaps by on its little ears!',
      duration: 6400,
      start() {
        const beats = [];
        for (let i = 0; i < 9; i++) beats.push([400 + i * 560, flap]);
        beats.push([3700, () => shimmer(0)]);
        return E.steps(beats);
      },
    },

    pompeii: {
      caption: 'The Pompeii worms pop out for a party!',
      duration: 6400,
      // one pop per worm, matching the --d delays in theme.css, over a bouncy bass
      start() {
        const beats = [[500, pop], [900, pop], [1300, pop], [1700, pop], [2100, pop]];
        for (let i = 0; i < 8; i++) {
          beats.push([700 + i * 560, () => {
            fx.tone(146.83 + (i % 3) * 49, 0, 0.16, 'triangle', 0.09);
            fx.noise(0.1, 0, 0.05, 300, 'lowpass');
          }]);
        }
        return E.steps(beats);
      },
    },

    alvin: {
      caption: 'Alvin the submarine comes down to visit!',
      duration: 6600,
      start() {
        return E.steps([
          [300, () => fx.sweep(90, 150, 2.6, 'sawtooth', 0.06)],   // thrusters, descending
          [900, ping],
          [2000, ping],
          [3400, () => { fx.tone(523.25, 0, 0.24, 'square', 0.1); fx.tone(783.99, 0.2, 0.34, 'square', 0.1); }],
          [4600, ping],
        ]);
      },
    },

    isopod: {
      caption: 'A giant isopod rolls in like a marble — and unrolls!',
      duration: 6400,
      start() {
        return E.steps([
          [320, () => rumble(2.3)],
          [2500, () => { pop(); fx.sweep(300, 900, 0.3, 'triangle', 0.14); }],
          [3400, () => shimmer(0)],
        ]);
      },
    },

    eelpout: {
      caption: 'A vent eelpout swims over for a hello!',
      duration: 6800,
      start() {
        const beats = [];
        for (let i = 0; i < 7; i++) beats.push([400 + i * 620, () => fx.noise(0.34, 0, 0.055, 520, 'lowpass')]);
        beats.push([4600, () => { fx.tone(587.33, 0, 0.22, 'sine', 0.13); fx.tone(880, 0.18, 0.3, 'sine', 0.13); }]);
        return E.steps(beats);
      },
    },

    yeticrab: {
      caption: 'A yeti crab dances with its furry arms!',
      duration: 6400,
      // a bop on every beat of the dance, matching the 0.62s arm swing
      start() {
        const beats = [];
        for (let i = 0; i < 10; i++) {
          beats.push([400 + i * 620, () => {
            fx.tone(196 + (i % 4) * 65.4, 0, 0.16, 'triangle', 0.1);
            fx.noise(0.08, 0, 0.06, 2400, 'bandpass');
          }]);
        }
        return E.steps(beats);
      },
    },

    clams: {
      caption: 'The giant clams open up and sing!',
      duration: 6400,
      // one soft note per clam, on the frame its shell gapes open
      start() {
        const notes = [392.0, 493.88, 587.33, 659.25];
        const beats = [];
        for (let round = 0; round < 3; round++) {
          [600, 1100, 1600, 2100].forEach((t, i) => {
            beats.push([t + round * 1500, () => {
              fx.tone(notes[i], 0, 0.5, 'sine', 0.13);
              fx.noise(0.2, 0, 0.05, 900, 'lowpass');
            }]);
          });
        }
        return E.steps(beats.filter(([t]) => t < 6200));
      },
    },

    nodule: {
      caption: 'Spellworm finds tasty manganese minerals!',
      duration: 8400,
      start(scene) {
        const reach = scene.querySelector('.reacher .plume');
        const cancel = E.steps([
          [900, boom],
          [1200, () => fx.sweep(120, 420, 2.2, 'sine', 0.07)],     // the nodule rising
          [3400, () => { reach.classList.add('happy'); shimmer(0); }],
          [3600, bigFanfare],
        ]);
        return () => { cancel(); reach.classList.remove('happy'); };
      },
    },
  };

  E.boot({
    name: 'Spellworms',
    hint: 'Help Spellworm spell it!',
    addWordLabel: 'Add a word for Spellworm to spell:',

    words: window.SpellWords.WORDS,
    celebrations: window.SpellWords.CELEBRATIONS,
    scenes,

    onCorrect({ tileEl, index }) {
      plink(index);
      const mineral = fx.rand(MINERALS);
      fx.flyTo({
        proto: mineral,
        size: 76,
        viewBox: MINERAL_BOX,
        fromEl: tileEl,
        toEl: wormMouth,
        spin: 280,
        onArrive() {
          fx.mood(plume, 'munching', 900, MOODS);
          fx.addToTray(mineral, MINERAL_BOX);
        },
      });
    },

    // no critter here — the vent itself stops blowing, and she ducks into her tube
    onIncorrect() {
      gulp();
      stallVent();
      duckAnchor();
      fx.mood(plume, 'yucking', 1100, MOODS);
    },

    // the finale saves its big noise for the moment she actually reaches the nodule
    onWordComplete() {
      fanfare();
    },
  });
})();
