/*
 * Spellaluna core game logic — pure, no DOM.
 * UMD-ish: usable as a classic <script> (window.SpellalunaLogic) and via require() in Node tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SpellalunaLogic = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const WORDS = [
    'BAT', 'MANGO', 'PIP', 'FLAP', 'MOON', 'FLY', 'NEST',
    'BUG', 'HUG', 'MAMA', 'WING', 'TREE', 'SUN', 'SKY',
  ];

  // Reward animation shown after the 1st, 2nd, and 3rd completed word, then repeating.
  const CELEBRATIONS = ['hug', 'fly', 'mama'];

  function shuffle(arr, rng) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function createGame(opts) {
    opts = opts || {};
    const allWords = (opts.words || WORDS).slice();
    const rng = opts.rng || Math.random;
    return {
      allWords,
      rng,
      queue: shuffle(allWords, rng),
      wordIndex: 0,
      letterIndex: 0,
      wordsCompleted: 0,
    };
  }

  function getCurrentWord(game) {
    return game.queue[game.wordIndex];
  }

  function getLetterIndex(game) {
    return game.letterIndex;
  }

  function advanceWord(game) {
    const lastWord = getCurrentWord(game);
    game.wordIndex++;
    game.letterIndex = 0;
    if (game.wordIndex >= game.queue.length) {
      const next = shuffle(game.allWords, game.rng);
      if (next.length > 1 && next[0] === lastWord) {
        [next[0], next[next.length - 1]] = [next[next.length - 1], next[0]];
      }
      game.queue = next;
      game.wordIndex = 0;
    }
  }

  /*
   * Feed one keypress into the game. Mutates `game` and returns an event:
   *   {type:'ignored'}
   *   {type:'incorrect', letter, expected}
   *   {type:'correct', letter, index}
   *   {type:'word-complete', word, letter, index, celebration, wordsCompleted}
   * After 'word-complete' the game has already advanced to the next word.
   */
  function inputLetter(game, raw) {
    const letter = String(raw || '').toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return { type: 'ignored' };

    const word = getCurrentWord(game);
    const expected = word[game.letterIndex];
    if (letter !== expected) {
      return { type: 'incorrect', letter, expected };
    }

    const index = game.letterIndex;
    game.letterIndex++;
    if (game.letterIndex >= word.length) {
      game.wordsCompleted++;
      const celebration = CELEBRATIONS[(game.wordsCompleted - 1) % CELEBRATIONS.length];
      advanceWord(game);
      return {
        type: 'word-complete',
        word,
        letter,
        index,
        celebration,
        wordsCompleted: game.wordsCompleted,
      };
    }
    return { type: 'correct', letter, index };
  }

  return { WORDS, CELEBRATIONS, createGame, getCurrentWord, getLetterIndex, inputLetter };
});
