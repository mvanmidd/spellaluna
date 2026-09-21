/*
 * Spellaluna's word list and reward order — the file to edit to tune the game.
 * UMD-ish: window.SpellWords in the browser, require() in tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.SpellWords = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    // Story words from Spellaluna's world, 2–5 letters.
    WORDS: [
      'BAT', 'MANGO', 'PIP', 'FLAP', 'MOON', 'FLY', 'NEST',
      'BUG', 'HUG', 'MAMA', 'WING', 'TREE', 'SUN', 'SKY',
    ],

    // One reward per word, walked in order: hug, fly, mama, hug, ...
    CELEBRATIONS: { pool: ['hug', 'fly', 'mama'], pick: 'cycle' },
  };
});
