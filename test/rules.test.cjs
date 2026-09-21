const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createGame,
  getCurrentWord,
  getLetterIndex,
  replaceCurrentWord,
  inputLetter,
} = require('../engine/rules.js');

// rng that always returns ~1 makes the Fisher-Yates shuffle an identity permutation,
// so word order is deterministic in tests.
const identityRng = () => 0.999999;

const CYCLE_OF_THREE = { pool: ['hug', 'fly', 'mama'], pick: 'cycle' };

function typeWord(game, word) {
  const events = [];
  for (const ch of word) events.push(inputLetter(game, ch));
  return events;
}

function playWords(game, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    const events = typeWord(game, getCurrentWord(game));
    seen.push(events[events.length - 1]);
  }
  return seen;
}

test('typing a word correctly emits correct events then word-complete', () => {
  const game = createGame({ words: ['BAT', 'FLY'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  assert.equal(getCurrentWord(game), 'BAT');

  const events = typeWord(game, 'BAT');
  assert.deepEqual(events[0], { type: 'correct', letter: 'B', index: 0 });
  assert.deepEqual(events[1], { type: 'correct', letter: 'A', index: 1 });
  assert.equal(events[2].type, 'word-complete');
  assert.equal(events[2].word, 'BAT');
  assert.equal(events[2].index, 2);
  assert.equal(events[2].celebration, 'hug');
  assert.equal(events[2].finale, false);
  assert.equal(events[2].wordsCompleted, 1);

  // Game advanced to the next word automatically.
  assert.equal(getCurrentWord(game), 'FLY');
  assert.equal(getLetterIndex(game), 0);
});

test('wrong letter emits incorrect and does not advance', () => {
  const game = createGame({ words: ['BAT'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  const ev = inputLetter(game, 'X');
  assert.deepEqual(ev, { type: 'incorrect', letter: 'X', expected: 'B' });
  assert.equal(getLetterIndex(game), 0);
  // Mid-word wrong letter keeps progress.
  inputLetter(game, 'B');
  inputLetter(game, 'Z');
  assert.equal(getLetterIndex(game), 1);
});

test('lowercase input is accepted', () => {
  const game = createGame({ words: ['BAT'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  assert.equal(inputLetter(game, 'b').type, 'correct');
});

test('non-letter input is ignored', () => {
  const game = createGame({ words: ['BAT'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  for (const key of ['1', ' ', 'Shift', 'Enter', '', null, 'ArrowUp']) {
    assert.deepEqual(inputLetter(game, key), { type: 'ignored' });
  }
  assert.equal(getLetterIndex(game), 0);
});

test('a long word is spelled letter by letter like any other', () => {
  const game = createGame({ words: ['TYRANNOSAURUS'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  const events = typeWord(game, 'TYRANNOSAURUS');
  assert.equal(events.length, 13);
  assert.equal(events.filter((e) => e.type === 'correct').length, 12);
  assert.equal(events[12].type, 'word-complete');
  assert.equal(events[12].index, 12);
});

test('cycle celebrations walk the pool in order', () => {
  const game = createGame({ words: ['UP', 'GO', 'ON', 'IT'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  assert.deepEqual(
    playWords(game, 4).map((e) => e.celebration),
    ['hug', 'fly', 'mama', 'hug']
  );
});

test('random celebrations never repeat back to back', () => {
  const pool = ['a', 'b', 'c', 'd'];
  let i = 0;
  // a cycling rng, so the picks are varied but reproducible
  const rng = () => [0.05, 0.4, 0.8, 0.99, 0.3, 0.6][i++ % 6];
  const game = createGame({ words: ['UP', 'GO'], rng, celebrations: { pool, pick: 'random' } });
  const seen = playWords(game, 24).map((e) => e.celebration);
  for (const name of seen) assert.ok(pool.includes(name), `unknown celebration ${name}`);
  for (let n = 1; n < seen.length; n++) {
    assert.notEqual(seen[n], seen[n - 1], `repeat at ${n}: ${seen.join(',')}`);
  }
});

test('a finale replaces the happy animation every Nth word', () => {
  const game = createGame({
    words: ['UP', 'GO'],
    rng: identityRng,
    celebrations: { pool: ['a', 'b'], pick: 'cycle', finale: { name: 'big', every: 3 } },
  });
  const events = playWords(game, 9);
  assert.deepEqual(
    events.map((e) => e.celebration),
    ['a', 'b', 'big', 'a', 'b', 'big', 'a', 'b', 'big']
  );
  assert.deepEqual(
    events.map((e) => e.finale),
    [false, false, true, false, false, true, false, false, true]
  );
});

test('queue reshuffles when exhausted and avoids immediate repeats', () => {
  const game = createGame({ words: ['UP', 'GO'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  const played = [];
  for (let i = 0; i < 6; i++) {
    const word = getCurrentWord(game);
    played.push(word);
    typeWord(game, word);
  }
  assert.equal(played.length, 6);
  for (let i = 1; i < played.length; i++) {
    assert.notEqual(played[i], played[i - 1], `repeat at position ${i}: ${played.join(',')}`);
  }
});

test('single-word list still cycles without crashing', () => {
  const game = createGame({ words: ['UP'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  for (let i = 0; i < 3; i++) {
    const events = typeWord(game, 'UP');
    assert.equal(events[1].type, 'word-complete');
    assert.equal(getCurrentWord(game), 'UP');
  }
});

test('an added word is spelled next and joins the rotation', () => {
  const game = createGame({ words: ['UP', 'GO'], rng: identityRng, celebrations: CYCLE_OF_THREE });
  replaceCurrentWord(game, 'REX');
  assert.equal(getCurrentWord(game), 'REX');
  assert.equal(getLetterIndex(game), 0);
  assert.ok(game.allWords.includes('REX'));
  assert.equal(typeWord(game, 'REX')[2].type, 'word-complete');
});

test('a game needs words', () => {
  assert.throws(() => createGame({ words: [] }), /non-empty words/);
});
