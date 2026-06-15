/* Spellaluna — presentation layer. Game rules live in logic.js (SpellalunaLogic). */
(function () {
  'use strict';

  const L = window.SpellalunaLogic;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const el = {
    tiles: document.getElementById('tiles'),
    hint: document.getElementById('hint'),
    tray: document.getElementById('tray'),
    luna: document.getElementById('luna'),
    lunaMouth: document.getElementById('luna-mouth'),
    startOverlay: document.getElementById('start-overlay'),
    celebration: document.getElementById('celebration'),
    celebrationWord: document.getElementById('celebration-word'),
    celebrationCaption: document.getElementById('celebration-caption'),
    mute: document.getElementById('mute'),
    scenes: {
      hug: document.getElementById('scene-hug'),
      fly: document.getElementById('scene-fly'),
      mama: document.getElementById('scene-mama'),
    },
  };

  const CELEBRATION_INFO = {
    hug: { caption: 'Spellaluna hugs Pip, Flitter, and Flap!', duration: 6200 },
    fly: { caption: 'Spellaluna learns to fly!', duration: 6800 },
    mama: { caption: 'Spellaluna found her mama!', duration: 7000 },
  };

  // Mostly mangos — they are her favorite.
  const FRUITS = ['mango', 'mango', 'mango', 'mango', 'banana', 'fig'];

  let game = null;
  let phase = 'start'; // 'start' | 'playing' | 'celebrating'
  let muted = false;
  let moodTimer = null;

  /* ---------- sound effects (Web Audio, no files) ---------- */

  let actx = null;
  function audioCtx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function tone(freq, startIn, dur, type, peak) {
    const ctx = audioCtx();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + startIn;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    return osc;
  }

  // Ascending pentatonic chime — pitch rises with each letter in the word.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  function chime(letterIndex) {
    const f = SCALE[Math.min(letterIndex, SCALE.length - 1)];
    tone(f, 0, 0.22, 'triangle', 0.2);
    tone(f * 2, 0, 0.14, 'sine', 0.06);
  }

  function fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, i * 0.13, 0.3, 'triangle', 0.18);
    });
    tone(1318.5, 0.52, 0.5, 'sine', 0.12);
  }

  function bloop() {
    const ctx = audioCtx();
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t0);
    osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.32);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  }

  /* ---------- speech ---------- */

  function say(text, opts) {
    opts = opts || {};
    if (muted || !window.speechSynthesis) return;
    if (opts.cancel !== false) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate || 0.9;
    u.pitch = opts.pitch || 1.15;
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }

  /* ---------- Spellaluna's mood ---------- */

  function setMood(mood, ms) {
    el.luna.classList.remove('munching', 'yucking');
    if (moodTimer) clearTimeout(moodTimer);
    if (!mood) return;
    el.luna.classList.add(mood);
    moodTimer = setTimeout(() => el.luna.classList.remove(mood), ms);
  }

  /* ---------- sprites (flying fruit, crawling bugs) ---------- */

  function makeSprite(protoId, size) {
    const wrap = document.createElement('div');
    wrap.className = 'sprite';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '-32 -32 64 64');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + protoId);
    svg.appendChild(use);
    wrap.appendChild(svg);
    document.body.appendChild(wrap);
    return wrap;
  }

  function flyFruitFromTile(tileEl, fruitKind) {
    const size = 84;
    const from = tileEl.getBoundingClientRect();
    const to = el.lunaMouth.getBoundingClientRect();
    const sprite = makeSprite('fruit-' + fruitKind, size);
    const x0 = from.left + from.width / 2 - size / 2;
    const y0 = from.top - size / 2;
    sprite.style.left = x0 + 'px';
    sprite.style.top = y0 + 'px';
    const dx = to.left + to.width / 2 - size / 2 - x0;
    const dy = to.top + to.height / 2 - size / 2 - y0;

    const anim = sprite.animate(
      [
        { transform: 'translate(0px, 0px) scale(0.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.5 - 90}px) scale(1.1) rotate(160deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.45) rotate(330deg)`, opacity: 0.9 },
      ],
      { duration: 800, easing: 'ease-in-out' }
    );
    anim.onfinish = () => {
      sprite.remove();
      setMood('munching', 750);
      addFruitToTray(fruitKind);
    };
  }

  function addFruitToTray(fruitKind) {
    if (el.tray.children.length >= 18) el.tray.innerHTML = '';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '-26 -30 52 56');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#fruit-' + fruitKind);
    svg.appendChild(use);
    el.tray.appendChild(svg);
  }

  function crawlBug() {
    const size = 120;
    const area = el.tiles.getBoundingClientRect();
    const x0 = area.left + area.width * (0.15 + Math.random() * 0.7);
    const y0 = area.bottom + 18;
    const sprite = makeSprite('bug-proto', size);
    sprite.style.left = x0 + 'px';
    sprite.style.top = y0 + 'px';
    const dir = Math.random() < 0.5 ? -1 : 1;
    const dist = (window.innerWidth / 2 + size) * dir;
    const flip = dir < 0 ? ' scale(-1, 1)' : '';

    const anim = sprite.animate(
      [
        { transform: `translate(0,0) scale(0.2)${flip ? ' scaleX(-1)' : ''}`, opacity: 0 },
        { transform: `translate(${dist * 0.05}px, -6px)${flip}`, opacity: 1, offset: 0.15 },
        { transform: `translate(${dist * 0.3}px, 4px) rotate(${8 * dir}deg)${flip}`, offset: 0.45 },
        { transform: `translate(${dist * 0.6}px, -4px) rotate(${-8 * dir}deg)${flip}`, offset: 0.7 },
        { transform: `translate(${dist}px, 2px)${flip}`, opacity: 1 },
      ],
      { duration: 1700, easing: 'linear' }
    );
    anim.onfinish = () => sprite.remove();
  }

  /* ---------- word rendering + rounds ---------- */

  function renderWord(word) {
    el.tiles.innerHTML = '';
    for (const letter of word) {
      const tile = document.createElement('span');
      tile.className = 'tile';
      tile.textContent = letter;
      el.tiles.appendChild(tile);
    }
  }

  function startWord() {
    const word = L.getCurrentWord(game);
    renderWord(word);
    el.hint.textContent = 'Help Spellaluna spell it!';
    // lowercase for speech: TTS reads "B" as "capital B" and caps words as acronyms
    say(word.toLowerCase(), { rate: 0.75 });
  }

  function handleCorrect(ev) {
    const tile = el.tiles.children[ev.index];
    tile.classList.add('done');
    chime(ev.index);
    say(ev.letter.toLowerCase());
    flyFruitFromTile(tile, FRUITS[Math.floor(Math.random() * FRUITS.length)]);
  }

  function handleIncorrect() {
    bloop();
    setMood('yucking', 1000);
    crawlBug();
  }

  function handleWordComplete(ev) {
    handleCorrect(ev);
    phase = 'celebrating';
    setTimeout(() => {
      fanfare();
      say(ev.word.toLowerCase() + '!', { rate: 0.75 });
      celebrate(ev);
    }, 700);
  }

  let flyTimers = [];
  function flySceneFlyers() {
    return el.scenes.fly.querySelectorAll('.fly-luna, .bird-use');
  }

  function celebrate(ev) {
    const info = CELEBRATION_INFO[ev.celebration];
    el.celebrationWord.textContent = ev.word;
    el.celebrationCaption.textContent = info.caption;
    el.celebration.hidden = false;
    // .hidden property doesn't exist on SVG elements — toggle the attribute
    for (const scene of Object.values(el.scenes)) {
      scene.setAttribute('hidden', '');
      scene.classList.remove('playing');
    }
    const scene = el.scenes[ev.celebration];
    scene.removeAttribute('hidden');
    // next frame, so re-adding .playing restarts the CSS animations
    requestAnimationFrame(() => requestAnimationFrame(() => scene.classList.add('playing')));

    // in the fly scene, wings stay folded through the leap and fall, then snap open
    if (ev.celebration === 'fly') {
      const [luna, ...birds] = [el.scenes.fly.querySelector('.fly-luna'), ...el.scenes.fly.querySelectorAll('.bird-use')];
      flyTimers = [
        setTimeout(() => luna.classList.add('flying'), 2100),
        setTimeout(() => birds.forEach((b) => b.classList.add('flying')), 2750),
      ];
    }

    setTimeout(() => say(info.caption, { cancel: false }), 1200);
    setTimeout(endCelebration, info.duration);
  }

  function endCelebration() {
    el.celebration.hidden = true;
    for (const scene of Object.values(el.scenes)) scene.classList.remove('playing');
    flyTimers.forEach(clearTimeout);
    flyTimers = [];
    flySceneFlyers().forEach((f) => f.classList.remove('flying'));
    phase = 'playing';
    startWord();
  }

  /* ---------- input ---------- */

  function begin() {
    audioCtx(); // unlock audio inside the user gesture
    el.startOverlay.hidden = true;
    game = L.createGame();
    phase = 'playing';
    startWord();
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (phase === 'start') {
      begin();
      return;
    }
    if (phase !== 'playing') return;
    const ev = L.inputLetter(game, e.key);
    if (ev.type === 'correct') handleCorrect(ev);
    else if (ev.type === 'incorrect') handleIncorrect();
    else if (ev.type === 'word-complete') handleWordComplete(ev);
  });

  el.startOverlay.addEventListener('click', () => {
    if (phase === 'start') begin();
  });

  el.mute.addEventListener('click', () => {
    muted = !muted;
    el.mute.textContent = muted ? '🔇' : '🔊';
    if (muted && window.speechSynthesis) window.speechSynthesis.cancel();
  });
})();
