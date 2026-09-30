/* Spellodrum — theme layer: art hookups, sound design, celebration choreography.
   Shared rules and shell live in ../../engine/. */
(function () {
  'use strict';

  const E = window.SpellEngine;
  const fx = window.SpellFx;

  // One drummer rig, copied into every <g class="greg"> on the page (main scene, start
  // screen, celebrations), so there's a single drawing of Greg and his kit to maintain.
  const rig = document.getElementById('greg-rig');
  for (const slot of document.querySelectorAll('g.greg')) {
    for (const part of rig.children) slot.appendChild(part.cloneNode(true));
  }

  const greg = document.getElementById('greg');
  const snareAnchor = greg.querySelector('.snare-anchor');
  const MOODS = ['happy', 'oops'];
  const HITS = ['hit-l', 'hit-r', 'dropped-l', 'dropped-r'];

  // correct-letter markers: drumsticks, cymbals and drums, piling up in the tray
  const MARKERS = ['mk-sticks', 'mk-cymbal', 'mk-drum'];
  const MARKER_BOX = '-28 -28 56 56';

  /* ---------- sound design: a synthesised drum kit ---------- */

  function kick(startIn, peak) {
    fx.sweep(150, 42, 0.36, 'sine', peak || 0.5, startIn || 0);
    fx.noise(0.02, startIn || 0, 0.08, 3000, 'bandpass');
  }

  function snare(startIn, peak) {
    const t = startIn || 0;
    fx.noise(0.2, t, peak || 0.28, 1900, 'bandpass');
    fx.noise(0.12, t, (peak || 0.28) * 0.5, 5000, 'highpass');
    fx.tone(196, t, 0.1, 'triangle', 0.16);
  }

  function hat(startIn, peak) {
    fx.noise(0.05, startIn || 0, peak || 0.12, 8000, 'highpass');
  }

  // cymbals are a cluster of out-of-tune partials plus a hiss
  function ride(startIn) {
    const t = startIn || 0;
    [2960, 3730, 5210].forEach((f) => fx.tone(f, t, 0.7, 'sine', 0.025));
    fx.noise(0.5, t, 0.07, 7000, 'highpass');
  }

  function crash(startIn) {
    const t = startIn || 0;
    fx.noise(1.8, t, 0.26, 5200, 'highpass');
    fx.noise(1.2, t, 0.12, 2600, 'bandpass');
    [1830, 2710, 3940].forEach((f) => fx.tone(f, t, 1.4, 'sine', 0.02));
  }

  function tom(freq, startIn, peak) {
    fx.sweep(freq, freq * 0.62, 0.34, 'sine', peak || 0.36, startIn || 0);
    fx.noise(0.04, startIn || 0, 0.06, 1400, 'bandpass');
  }

  // Correct letter: a real drum hit, with a tom that climbs through the word.
  const TOMS = [98, 110, 123.5, 138.6, 155.6, 174.6, 196, 220, 246.9, 277.2];
  function hitSound(index, side) {
    kick(0, 0.42);
    tom(TOMS[Math.min(index, TOMS.length - 1)] * 1.5, 0.01, 0.3);
    if (side === 'hit-l') snare(0.01);
    else ride(0.01);
  }

  // Wrong letter: a stick bouncing on the floor — tick... tick.. tick.tick — and a daft "boing".
  function clatter() {
    fx.sweep(520, 160, 0.3, 'triangle', 0.08);
    [0.38, 0.56, 0.68, 0.76, 0.82].forEach((t, i) => {
      fx.tone(1760 - i * 90, t, 0.06, 'square', 0.05 - i * 0.007);
      fx.noise(0.03, t, 0.08 - i * 0.012, 3400, 'bandpass');
    });
  }

  function cheer(dur, startIn) {
    fx.noise(dur, startIn || 0, 0.12, 1100, 'bandpass');
    fx.noise(dur * 0.8, (startIn || 0) + 0.1, 0.06, 2600, 'bandpass');
  }

  function crunch(startIn) {
    [0, 0.07, 0.13].forEach((t) => fx.noise(0.05, (startIn || 0) + t, 0.14, 2200 + t * 4000, 'bandpass'));
  }

  function click(startIn, accent) {
    fx.tone(accent ? 1760 : 1320, startIn || 0, 0.04, 'square', 0.06);
  }

  function honk(startIn) {
    fx.tone(349.2, startIn || 0, 0.18, 'sawtooth', 0.07);
    fx.tone(440, startIn || 0, 0.18, 'sawtooth', 0.05);
  }

  function fanfare() {
    kick(0);
    crash(0.02);
    [261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
      fx.tone(f, 0.1 + i * 0.1, 0.3, 'square', 0.05);
    });
  }

  /* A groove on a fixed beat: pattern letters are k (kick), s (snare), h (hat),
     r (ride), t (a tom, climbing), c (crash), and '.' for a rest. */
  function groove(pattern, beatMs, fromMs, untilMs) {
    const steps = [];
    let i = 0;
    for (let t = fromMs; t < untilMs; t += beatMs, i++) {
      const hits = pattern[i % pattern.length];
      steps.push([t, () => {
        for (const h of hits) {
          if (h === 'k') kick();
          else if (h === 's') snare();
          else if (h === 'h') hat();
          else if (h === 'r') ride();
          else if (h === 'c') crash();
          else if (h === 't') tom(TOMS[i % TOMS.length] * 1.2);
        }
      }]);
    }
    return steps;
  }

  /* ---------- the main-scene hit and drop (restart the CSS animation each time) ---------- */

  let hitTimer = null;
  function play(cls, ms) {
    clearTimeout(hitTimer);
    for (const c of HITS) greg.classList.remove(c);
    // a reflow, or re-adding the same class in the same frame wouldn't restart it
    void greg.getBoundingClientRect();
    greg.classList.add(cls);
    hitTimer = setTimeout(() => greg.classList.remove(cls), ms);
  }

  /* ---------- celebrations ---------- */

  // Each scene's Greg drums on a --beat set in the markup; the sound follows the same beat.
  const scenes = {
    fast: {
      caption: 'Greg plays fast!',
      duration: 6400,
      start() {
        return E.steps(groove(['kh', 'sh', 'kh', 'sh', 'kh', 'sh', 'kh', 'skh'], 160, 300, 5800));
      },
    },

    slow: {
      caption: 'Greg plays slow...',
      duration: 6800,
      start() {
        return E.steps(groove(['kr', 's'], 1200, 400, 6400));
      },
    },

    rocknroll: {
      caption: 'Rock & roll finish!',
      duration: 7000,
      // a roll that builds for 3.4s, then everything at once and the sticks go up
      start(scene) {
        const g = scene.querySelector('.greg');
        const roll = [];
        for (let i = 0; i < 24; i++) {
          roll.push([i * 140, () => { snare(0, 0.12 + i * 0.008); if (i % 2 === 0) kick(0, 0.3); }]);
        }
        const cancel = E.steps(roll.concat([
          [3400, () => { crash(); kick(0, 0.6); tom(80, 0, 0.5); g.classList.add('finished'); }],
          [3500, () => cheer(2.2)],
          [4300, () => crash()],
        ]));
        return () => { cancel(); g.classList.remove('finished'); };
      },
    },

    solo: {
      caption: 'Greg plays a drum solo!',
      duration: 6600,
      start() {
        return E.steps(groove(['kt', 't', 'st', 't', 'kt', 't', 'krt', 's'], 260, 300, 6100));
      },
    },

    practice: {
      caption: 'Greg practices hard!',
      duration: 6600,
      // the metronome ticks every 0.5s, and Greg is exactly on it
      start() {
        const ticks = [];
        for (let t = 0, i = 0; t < 6200; t += 500, i++) ticks.push([t + 250, () => click(0, i % 4 === 0)]);
        return E.steps(ticks.concat(groove(['k', 's', 'k', 'ks'], 500, 250, 6200)));
      },
    },

    tour: {
      caption: 'Greg goes on tour with his band!',
      duration: 7000,
      start() {
        return E.steps([
          [100, () => fx.sweep(70, 110, 1.8, 'sawtooth', 0.05)],        // the van pulling in
          [1900, () => honk(0)],
          [2150, () => honk(0)],
          ...groove(['k', 'h', 's', 'h'], 300, 2400, 5400),
          [5400, () => fx.sweep(90, 160, 1.4, 'sawtooth', 0.05)],        // and off again
          [5600, () => honk(0)],
        ]);
      },
    },

    sinclair: {
      caption: 'Greg plays a sold-out show at The Sinclair!',
      duration: 7200,
      start() {
        return E.steps([
          [200, () => cheer(1.6)],
          ...groove(['kr', 's', 'kr', 's', 'kkr', 's', 'kr', 'sc'], 300, 500, 6600),
          [3600, () => cheer(2.4)],
        ]);
      },
    },

    cereal: {
      caption: 'Greg eats a lot of cereal!',
      duration: 7000,
      // every hit bounces an O out of the bowl; it lands in his mouth half a beat later
      start() {
        const steps = groove(['k', 's'], 500, 250, 6400);
        for (let t = 250 + 810; t < 6400; t += 500) steps.push([t, () => crunch()]);
        return E.steps(steps);
      },
    },
  };

  let side = 'hit-r';

  E.boot({
    name: 'Spellodrum',
    hint: 'Help Greg spell it!',
    addWordLabel: 'Add a word for Greg to spell:',

    words: window.SpellWords.WORDS,
    celebrations: window.SpellWords.CELEBRATIONS,
    scenes,

    // every letter is a hit, left hand then right, so a word is a little drum fill
    onCorrect({ tileEl, index }) {
      side = side === 'hit-l' ? 'hit-r' : 'hit-l';
      hitSound(index, side);
      play(side, 460);
      fx.mood(greg, null, 0, MOODS);
      const marker = fx.rand(MARKERS);
      fx.flyTo({
        proto: marker,
        size: 76,
        viewBox: MARKER_BOX,
        fromEl: tileEl,
        toEl: snareAnchor,
        spin: 300,
        onArrive() { fx.addToTray(marker, MARKER_BOX); },
      });
    },

    // oops — he drops a stick, and grabs a new one
    onIncorrect() {
      clatter();
      play(fx.rand(['dropped-l', 'dropped-r']), 1150);
      fx.mood(greg, 'oops', 1100, MOODS);
    },

    onWordComplete() {
      fanfare();
      fx.mood(greg, 'happy', 900, MOODS);
    },
  });
})();
