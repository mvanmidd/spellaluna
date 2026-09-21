/*
 * The game shell, shared by every theme.
 *
 * Owns: the phase machine, keyboard input, letter tiles, the celebration sequencer,
 * the add-a-word modal and the mute button. Knows nothing about bats, dinosaurs,
 * fruit or leaves — a theme supplies words, art, sounds and celebration scenes, and
 * calls SpellEngine.boot(theme) once its <script> has loaded.
 *
 * The theme's page must provide: #tiles, #hint, #start-overlay, #celebration,
 * #celebration-word, #celebration-caption, one #scene-<name> per celebration, and
 * optionally #tray. Everything else on the page is the theme's own art.
 */
(function () {
  'use strict';

  const R = window.SpellRules;
  const fx = window.SpellFx;

  let theme = null;
  let game = null;
  let phase = 'start'; // 'start' | 'playing' | 'celebrating' | 'adding-word'
  let sceneCleanup = null;
  let celebrationTimers = [];
  const el = {};

  /* ---------- chrome the engine owns outright ---------- */

  function buildChrome() {
    const mute = document.createElement('button');
    mute.id = 'mute';
    mute.setAttribute('aria-label', 'Toggle sound');
    mute.textContent = '🔊';
    mute.addEventListener('click', () => {
      fx.setMuted(!fx.isMuted());
      mute.textContent = fx.isMuted() ? '🔇' : '🔊';
    });
    document.body.appendChild(mute);

    const modal = document.createElement('div');
    modal.id = 'add-word-modal';
    modal.className = 'overlay';
    modal.hidden = true;
    modal.innerHTML = `
      <div id="add-word-card">
        <label for="add-word-input"></label>
        <input id="add-word-input" type="text" maxlength="20"
               autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">
        <div id="add-word-error" hidden></div>
        <div id="add-word-buttons">
          <button id="add-word-confirm">Add word</button>
          <button id="add-word-cancel">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    el.addWordModal = modal;
    el.addWordLabel = modal.querySelector('label');
    el.addWordInput = modal.querySelector('#add-word-input');
    el.addWordError = modal.querySelector('#add-word-error');
    el.addWordLabel.textContent =
      theme.addWordLabel || `Add a word for ${theme.name || 'the game'} to spell:`;

    modal.querySelector('#add-word-confirm').addEventListener('click', confirmAddWord);
    modal.querySelector('#add-word-cancel').addEventListener('click', closeAddWordModal);
    el.addWordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); confirmAddWord(); }
      if (e.key === 'Escape') { e.preventDefault(); closeAddWordModal(); }
    });
  }

  /* ---------- words and tiles ---------- */

  function renderWord(word) {
    el.tiles.innerHTML = '';
    // tiles shrink to fit long words (TYRANNOSAURUS is 13 of them)
    el.tiles.style.setProperty('--n', word.length);
    for (const letter of word) {
      const tile = document.createElement('span');
      tile.className = 'tile';
      tile.textContent = letter;
      el.tiles.appendChild(tile);
    }
  }

  function startWord() {
    const word = R.getCurrentWord(game);
    renderWord(word);
    el.hint.textContent = theme.hint || '';
    fx.sayWord(word, { rate: 0.75 });
    if (theme.onWordStart) theme.onWordStart(word);
  }

  /* ---------- per-letter feedback ---------- */

  function handleCorrect(ev) {
    const tileEl = el.tiles.children[ev.index];
    tileEl.classList.add('done');
    fx.sayWord(ev.letter);
    if (theme.onCorrect) theme.onCorrect({ tileEl, index: ev.index, letter: ev.letter });
  }

  function handleIncorrect(ev) {
    if (theme.onIncorrect) theme.onIncorrect({ letter: ev.letter, expected: ev.expected });
  }

  function handleWordComplete(ev) {
    handleCorrect(ev);
    phase = 'celebrating';
    // a beat between the last letter and the fanfare — the pause is part of the reward
    celebrationTimers.push(setTimeout(() => {
      if (theme.onWordComplete) theme.onWordComplete(ev);
      fx.sayWord(ev.word + '!', { rate: 0.75 });
      celebrate(ev);
    }, theme.completeDelay || 700));
  }

  /* ---------- celebrations ---------- */

  function sceneFor(name) {
    const spec = theme.scenes[name];
    if (!spec) return null;
    return document.querySelector(spec.selector || '#scene-' + name);
  }

  function allScenes() {
    return Object.keys(theme.scenes).map(sceneFor).filter(Boolean);
  }

  function celebrate(ev) {
    const spec = theme.scenes[ev.celebration];
    const scene = sceneFor(ev.celebration);
    if (!spec || !scene) { endCelebration(); return; }

    el.celebrationWord.textContent = ev.word;
    el.celebrationCaption.textContent = spec.caption || '';
    el.celebration.hidden = false;
    el.celebration.classList.toggle('finale', !!ev.finale);

    // SVG elements have no .hidden property — the attribute is the only thing that works
    for (const s of allScenes()) {
      s.setAttribute('hidden', '');
      s.classList.remove('playing');
    }
    scene.removeAttribute('hidden');
    // next frame, so re-adding .playing restarts the CSS animations from the top
    requestAnimationFrame(() => requestAnimationFrame(() => scene.classList.add('playing')));

    if (spec.start) sceneCleanup = spec.start(scene, ev) || null;

    if (spec.caption) {
      celebrationTimers.push(setTimeout(() => fx.say(spec.caption, { cancel: false }), 1200));
    }
    celebrationTimers.push(setTimeout(endCelebration, spec.duration || 6500));
  }

  function endCelebration() {
    el.celebration.hidden = true;
    el.celebration.classList.remove('finale');
    for (const s of allScenes()) s.classList.remove('playing');
    if (sceneCleanup) sceneCleanup();
    sceneCleanup = null;
    clearTimers();
    phase = 'playing';
    startWord();
  }

  function clearTimers() {
    celebrationTimers.forEach(clearTimeout);
    celebrationTimers = [];
  }

  /* ---------- add-a-word modal ---------- */

  function openAddWordModal() {
    phase = 'adding-word';
    el.addWordInput.value = '';
    el.addWordError.hidden = true;
    el.addWordModal.hidden = false;
    el.addWordInput.focus();
  }

  function closeAddWordModal() {
    el.addWordModal.hidden = true;
    phase = 'playing';
  }

  function confirmAddWord() {
    const word = el.addWordInput.value.trim().toUpperCase();
    if (!word || !/^[A-Z]+$/.test(word)) {
      el.addWordError.textContent = 'Only letters please!';
      el.addWordError.hidden = false;
      return;
    }
    R.replaceCurrentWord(game, word);
    closeAddWordModal();
    startWord();
  }

  /* ---------- input ---------- */

  function begin() {
    fx.ctx(); // unlock audio inside the user gesture
    el.startOverlay.hidden = true;
    game = R.createGame({ words: theme.words, celebrations: theme.celebrations });
    phase = 'playing';
    startWord();
  }

  function onKeyDown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (phase === 'start') { begin(); return; }
    if (phase !== 'playing') return;
    // without preventDefault the same keystroke lands in the input we just focused
    if (e.key === '+') { e.preventDefault(); openAddWordModal(); return; }
    const ev = R.inputLetter(game, e.key);
    if (ev.type === 'correct') handleCorrect(ev);
    else if (ev.type === 'incorrect') handleIncorrect(ev);
    else if (ev.type === 'word-complete') handleWordComplete(ev);
  }

  /* ---------- a small helper themes use for timed steps inside a scene ---------- */

  function steps(pairs) {
    const timers = pairs.map(([ms, fn]) => setTimeout(fn, ms));
    return () => timers.forEach(clearTimeout);
  }

  function boot(themeSpec) {
    theme = themeSpec;
    el.tiles = document.getElementById('tiles');
    el.hint = document.getElementById('hint');
    el.startOverlay = document.getElementById('start-overlay');
    el.celebration = document.getElementById('celebration');
    el.celebrationWord = document.getElementById('celebration-word');
    el.celebrationCaption = document.getElementById('celebration-caption');
    const tray = document.getElementById('tray');
    if (tray) fx.useTray(tray);

    buildChrome();
    document.addEventListener('keydown', onKeyDown);
    el.startOverlay.addEventListener('click', () => { if (phase === 'start') begin(); });
    if (theme.onReady) theme.onReady();
  }

  window.SpellEngine = { boot, steps, fx, get phase() { return phase; } };
})();
