/* Spellaluna — theme layer: art hookups, sound design, celebration choreography.
   Shared rules and shell live in ../../engine/. */
(function () {
  'use strict';

  const E = window.SpellEngine;
  const fx = window.SpellFx;

  const luna = document.getElementById('luna');
  const lunaMouth = document.getElementById('luna-mouth');
  const tiles = document.getElementById('tiles');

  // Mostly mangos — they are her favorite.
  const FRUITS = ['mango', 'mango', 'mango', 'mango', 'banana', 'fig'];

  /* ---------- sound design ---------- */

  // Ascending pentatonic chime — pitch rises with each letter in the word.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  function chime(letterIndex) {
    const f = SCALE[Math.min(letterIndex, SCALE.length - 1)];
    fx.tone(f, 0, 0.22, 'triangle', 0.2);
    fx.tone(f * 2, 0, 0.14, 'sine', 0.06);
  }

  function fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      fx.tone(f, i * 0.13, 0.3, 'triangle', 0.18);
    });
    fx.tone(1318.5, 0.52, 0.5, 'sine', 0.12);
  }

  function bloop() {
    fx.sweep(300, 95, 0.38, 'sine', 0.2);
  }

  /* ---------- celebrations ---------- */

  const scenes = {
    hug: {
      caption: 'Spellaluna hugs Pip, Flitter, and Flap!',
      duration: 6200,
    },
    fly: {
      caption: 'Spellaluna learns to fly!',
      duration: 6800,
      // wings stay folded through the leap and the fall, then snap open mid-air
      start(scene) {
        const flyer = scene.querySelector('.fly-luna');
        const birds = [...scene.querySelectorAll('.bird-use')];
        const cancel = E.steps([
          [2100, () => flyer.classList.add('flying')],
          [2750, () => birds.forEach((b) => b.classList.add('flying'))],
        ]);
        return () => {
          cancel();
          [flyer, ...birds].forEach((f) => f.classList.remove('flying'));
        };
      },
    },
    mama: {
      caption: 'Spellaluna found her mama!',
      duration: 7000,
    },
  };

  E.boot({
    name: 'Spellaluna',
    hint: 'Help Spellaluna spell it!',
    addWordLabel: 'Add a word for Spellaluna to spell:',

    words: window.SpellWords.WORDS,
    celebrations: window.SpellWords.CELEBRATIONS,
    scenes,

    onCorrect({ tileEl, index }) {
      chime(index);
      const kind = fx.rand(FRUITS);
      fx.flyTo({
        proto: 'fruit-' + kind,
        size: 84,
        fromEl: tileEl,
        toEl: lunaMouth,
        onArrive() {
          fx.mood(luna, 'munching', 750, ['munching', 'yucking']);
          fx.addToTray('fruit-' + kind);
        },
      });
    },

    onIncorrect() {
      bloop();
      fx.mood(luna, 'yucking', 1000, ['munching', 'yucking']);
      fx.crawlPast({ proto: 'bug-proto', size: 120, areaEl: tiles });
    },

    onWordComplete() {
      fanfare();
    },
  });
})();
