/*
 * Spelling-game rules — pure, no DOM, no theme.
 *
 * Every themed game (Spellaluna, Spellasaurus, ...) shares this: a shuffled word queue
 * with no immediate repeats, letter-by-letter matching, and a celebration picked after
 * each finished word.
 *
 * UMD-ish: usable as a classic <script> (window.SpellRules) and via require() in tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SpellRules = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function shuffle(arr, rng) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function pickFrom(list, rng) {
    return list[Math.min(Math.floor(rng() * list.length), list.length - 1)];
  }

  /*
   * createGame({ words, rng, celebrations })
   *
   * celebrations describes how the reward after each word is chosen:
   *   pool:   celebration names to draw from
   *   pick:   'cycle'  — walk the pool in order (1st word, 2nd word, ...)
   *           'random' — pick at random, never the same one twice in a row
   *   finale: { name, every } — optional; replaces the pool pick on every Nth word
   */
  function createGame(opts) {
    opts = opts || {};
    const allWords = (opts.words || []).slice();
    if (!allWords.length) throw new Error('createGame needs a non-empty words list');
    const rng = opts.rng || Math.random;
    const cel = opts.celebrations || {};
    const finale = cel.finale && cel.finale.name
      ? { name: cel.finale.name, every: cel.finale.every || 3 }
      : null;
    return {
      allWords,
      rng,
      celebrations: {
        pool: (cel.pool || []).slice(),
        pick: cel.pick === 'random' ? 'random' : 'cycle',
        finale,
      },
      queue: shuffle(allWords, rng),
      wordIndex: 0,
      letterIndex: 0,
      wordsCompleted: 0,
      poolPicks: 0,          // pool position; finales don't advance it
      lastCelebration: null,
    };
  }

  function getCurrentWord(game) {
    return game.queue[game.wordIndex];
  }

  function getLetterIndex(game) {
    return game.letterIndex;
  }

  /* Swap the word being spelled right now (the add-a-word feature). */
  function replaceCurrentWord(game, word) {
    game.queue[game.wordIndex] = word;
    game.letterIndex = 0;
    if (!game.allWords.includes(word)) game.allWords.push(word);
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

  /* Which reward plays now that `game.wordsCompleted` words are done. */
  function chooseCelebration(game) {
    const c = game.celebrations;
    const n = game.wordsCompleted;
    if (c.finale && n % c.finale.every === 0) {
      return { celebration: c.finale.name, finale: true };
    }
    if (!c.pool.length) return { celebration: null, finale: false };

    let name;
    if (c.pick === 'cycle') {
      name = c.pool[game.poolPicks % c.pool.length];
    } else {
      // never the same happy animation twice in a row — variety matters to a small human
      const choices = c.pool.length > 1
        ? c.pool.filter((x) => x !== game.lastCelebration)
        : c.pool;
      name = pickFrom(choices, game.rng);
    }
    game.poolPicks++;
    game.lastCelebration = name;
    return { celebration: name, finale: false };
  }

  /*
   * Feed one keypress into the game. Mutates `game` and returns an event:
   *   {type:'ignored'}
   *   {type:'incorrect', letter, expected}
   *   {type:'correct', letter, index}
   *   {type:'word-complete', word, letter, index, celebration, finale, wordsCompleted}
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
      const chosen = chooseCelebration(game);
      advanceWord(game);
      return {
        type: 'word-complete',
        word,
        letter,
        index,
        celebration: chosen.celebration,
        finale: chosen.finale,
        wordsCompleted: game.wordsCompleted,
      };
    }
    return { type: 'correct', letter, index };
  }

  return {
    createGame,
    getCurrentWord,
    getLetterIndex,
    replaceCurrentWord,
    inputLetter,
    shuffle,
  };
});
