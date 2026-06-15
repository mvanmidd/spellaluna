const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WORDS,
  CELEBRATIONS,
  createGame,
  getCurrentWord,
  getLetterIndex,
  inputLetter,
} = require('../logic.js');

// rng that always returns ~1 makes the Fisher-Yates shuffle an identity permutation,
// so word order is deterministic in tests.
const identityRng = () => 0.999999;

function typeWord(game, word) {
  const events = [];
  for (const ch of word) events.push(inputLetter(game, ch));
  return events;
}

test('word list is non-empty uppercase 2-5 letter words', () => {
  assert.ok(WORDS.length >= 10);
  for (const w of WORDS) assert.match(w, /^[A-Z]{2,5}$/);
});

test('typing a word correctly emits correct events then word-complete', () => {
  const game = createGame({ words: ['BAT', 'FLY'], rng: identityRng });
  assert.equal(getCurrentWord(game), 'BAT');

  const events = typeWord(game, 'BAT');
  assert.deepEqual(events[0], { type: 'correct', letter: 'B', index: 0 });
  assert.deepEqual(events[1], { type: 'correct', letter: 'A', index: 1 });
  assert.equal(events[2].type, 'word-complete');
  assert.equal(events[2].word, 'BAT');
  assert.equal(events[2].index, 2);
  assert.equal(events[2].celebration, 'hug');
  assert.equal(events[2].wordsCompleted, 1);

  // Game advanced to the next word automatically.
  assert.equal(getCurrentWord(game), 'FLY');
  assert.equal(getLetterIndex(game), 0);
});

test('wrong letter emits incorrect and does not advance', () => {
  const game = createGame({ words: ['BAT'], rng: identityRng });
  const ev = inputLetter(game, 'X');
  assert.deepEqual(ev, { type: 'incorrect', letter: 'X', expected: 'B' });
  assert.equal(getLetterIndex(game), 0);
  // Mid-word wrong letter keeps progress.
  inputLetter(game, 'B');
  inputLetter(game, 'Z');
  assert.equal(getLetterIndex(game), 1);
});

test('lowercase input is accepted', () => {
  const game = createGame({ words: ['BAT'], rng: identityRng });
  assert.equal(inputLetter(game, 'b').type, 'correct');
});

test('non-letter input is ignored', () => {
  const game = createGame({ words: ['BAT'], rng: identityRng });
  for (const key of ['1', ' ', 'Shift', 'Enter', '', null, 'ArrowUp']) {
    assert.deepEqual(inputLetter(game, key), { type: 'ignored' });
  }
  assert.equal(getLetterIndex(game), 0);
});

test('celebrations cycle hug, fly, mama, hug...', () => {
  const game = createGame({ words: ['UP', 'GO', 'ON', 'IT'], rng: identityRng });
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const word = getCurrentWord(game);
    const events = typeWord(game, word);
    seen.push(events[events.length - 1].celebration);
  }
  assert.deepEqual(seen, ['hug', 'fly', 'mama', 'hug']);
  assert.deepEqual(CELEBRATIONS, ['hug', 'fly', 'mama']);
});

test('queue reshuffles when exhausted and avoids immediate repeats', () => {
  const game = createGame({ words: ['UP', 'GO'], rng: identityRng });
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
  const game = createGame({ words: ['UP'], rng: identityRng });
  for (let i = 0; i < 3; i++) {
    const events = typeWord(game, 'UP');
    assert.equal(events[1].type, 'word-complete');
    assert.equal(getCurrentWord(game), 'UP');
  }
});

test('default game uses the real word list and random rng', () => {
  const game = createGame();
  assert.ok(WORDS.includes(getCurrentWord(game)));
  assert.equal(game.queue.length, WORDS.length);
});
