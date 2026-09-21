/* Spellasaurus — theme layer: art hookups, sound design, celebration choreography.
   Shared rules and shell live in ../../engine/. */
(function () {
  'use strict';

  const E = window.SpellEngine;
  const fx = window.SpellFx;

  const bronto = document.getElementById('bronto');       // the neck <use> carries her face
  const brontoMouth = document.getElementById('bronto-mouth');
  const tiles = document.getElementById('tiles');
  const MOODS = ['munching', 'yucking'];

  /* ---------- sound design: woody, leafy, and a bit rumbly ---------- */

  // A warm marimba-ish plink that climbs through the word, plus a leaf rustle.
  const SCALE = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  function plink(letterIndex) {
    const f = SCALE[Math.min(letterIndex, SCALE.length - 1)];
    fx.tone(f, 0, 0.26, 'triangle', 0.2);
    fx.tone(f * 3, 0, 0.09, 'sine', 0.05);
    fx.noise(0.12, 0.01, 0.05, 5200, 'highpass'); // leaves rustling
  }

  // A friendly little grumble — silly, never scary.
  function grumble() {
    fx.sweep(190, 78, 0.5, 'sawtooth', 0.14);
    fx.noise(0.22, 0, 0.08, 320, 'lowpass');
    fx.tone(240, 0.16, 0.12, 'square', 0.05);
  }

  function fanfare() {
    [392.0, 493.88, 587.33, 783.99].forEach((f, i) => {
      fx.tone(f, i * 0.14, 0.32, 'triangle', 0.18);
    });
    fx.sweep(300, 150, 0.6, 'sawtooth', 0.1, 0.56);   // a happy little roar
    fx.noise(0.4, 0.56, 0.06, 700, 'lowpass');
  }

  function bigFanfare() {
    [392.0, 493.88, 587.33, 783.99, 987.77, 1174.7].forEach((f, i) => {
      fx.tone(f, i * 0.12, 0.34, 'triangle', 0.18);
    });
    fx.tone(1567.98, 0.78, 0.7, 'sine', 0.12);
    fx.sweep(260, 120, 0.9, 'sawtooth', 0.12, 0.8);
    fx.noise(0.5, 0.8, 0.07, 620, 'lowpass');
  }

  function splash() {
    fx.noise(0.5, 0, 0.26, 1400, 'bandpass');
    fx.sweep(900, 260, 0.35, 'sine', 0.1);
  }

  function crack() {
    fx.noise(0.09, 0, 0.3, 2600, 'bandpass');
    fx.sweep(1600, 300, 0.16, 'square', 0.14);
    [1046.5, 1318.5, 1567.98].forEach((f, i) => fx.tone(f, 0.1 + i * 0.07, 0.2, 'sine', 0.09));
  }

  function sparkleRun(startIn) {
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((f, i) => {
      fx.tone(f, startIn + i * 0.1, 0.26, 'sine', 0.09);
    });
  }

  /* ---------- celebrations ---------- */

  const scenes = {
    snuggle: {
      caption: 'Spellasaurus snuggles her mommy!',
      duration: 6000,
    },

    splash: {
      caption: 'Spellasaurus splashes in the water!',
      duration: 6200,
      // the sound has to land on the frame she hits the water
      start() {
        return E.steps([[2400, splash], [3450, splash]]);
      },
    },

    tailcrack: {
      caption: 'Spellasaurus cracks her tail — CRACK!',
      duration: 6400,
      start() {
        return E.steps([[2050, crack], [2200, () => sparkleRun(0)]]);
      },
    },

    friends: {
      caption: 'Spellasaurus plays with her friends!',
      duration: 6200,
      // a bouncy little thump under every hop
      start() {
        const beats = [];
        for (let i = 0; i < 7; i++) {
          beats.push([700 + i * 620, () => {
            fx.noise(0.14, 0, 0.1, 260, 'lowpass');
            fx.tone(196 + (i % 3) * 65, 0, 0.14, 'triangle', 0.08);
          }]);
        }
        return E.steps(beats);
      },
    },

    goldenleaf: {
      caption: 'Spellasaurus reaches the golden leaf at the very top!',
      duration: 8200,
      start(scene) {
        const neck = scene.querySelector('.neck');
        const cancel = E.steps([
          // she stretches... and stretches... and gets it
          [900, () => fx.sweep(180, 300, 1.6, 'sawtooth', 0.07)],
          [3300, () => { neck.classList.add('happy'); sparkleRun(0); }],
          [3500, bigFanfare],
        ]);
        return () => { cancel(); neck.classList.remove('happy'); };
      },
    },
  };

  E.boot({
    name: 'Spellasaurus',
    hint: 'Help Spellasaurus spell it!',
    addWordLabel: 'Add a word for Spellasaurus to spell:',

    words: window.SpellWords.WORDS,
    celebrations: window.SpellWords.CELEBRATIONS,
    scenes,

    onCorrect({ tileEl, index }) {
      plink(index);
      fx.flyTo({
        proto: 'leaf-star',
        size: 76,
        fromEl: tileEl,
        toEl: brontoMouth,
        spin: 300,
        onArrive() {
          fx.mood(bronto, 'munching', 800, MOODS);
          fx.addToTray('leaf-star', '-26 -26 52 56');
        },
      });
    },

    onIncorrect() {
      grumble();
      fx.mood(bronto, 'yucking', 1100, MOODS);
      fx.crawlPast({
        proto: 'bug-dragonfly',
        size: 130,
        areaEl: tiles,
        drop: -26,
        wobble: 14,
        duration: 1500,
      });
    },

    // the finale saves its big noise for the moment she actually reaches the leaf
    onWordComplete() {
      fanfare();
    },
  });
})();
