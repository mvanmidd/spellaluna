/*
 * Spellasaurus's word list and rewards — the file to edit to tune the game.
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
    // Dinosaur words, 3–13 letters — short ones to build confidence, long ones to show off.
    WORDS: [
      'EGG', 'MUD', 'ROAR', 'TAIL', 'HORN', 'LEAF',
      'SPIKE', 'STOMP', 'SWAMP', 'RAPTOR', 'POINTY', 'RUMBLE', 'FOSSIL',
      'VOLCANO', 'DINOSAUR', 'SHARPTOOTH', 'TRICERATOPS', 'STEGOSAURUS',
      'BRONTOSAURUS', 'TYRANNOSAURUS',
    ],

    // A random happy animation after each word — then the golden leaf every 3rd word.
    CELEBRATIONS: {
      pool: ['snuggle', 'splash', 'tailcrack', 'friends'],
      pick: 'random',
      finale: { name: 'goldenleaf', every: 3 },
    },
  };
});
