/*
 * Spellworms's word list and rewards — the file to edit to tune the game.
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
    // Deep-sea words, 4–9 letters. The short ones name what is on screen (VENT, TUBE,
    // PLUME); the long ones are the fun mouthfuls a small human likes shouting.
    WORDS: [
      'DEEP', 'WORM', 'VENT', 'TUBE', 'CRAB', 'CLAM',
      'OCEAN', 'ABYSS', 'ALVIN', 'PLUME',
      'PYRITE', 'ISOPOD', 'SAMPLE', 'NODULE',
      'CHIMNEY', 'SULFIDE', 'BENTHIC', 'OCTOPUS', 'POMPEII', 'MINERAL', 'EELPOUT',
      'ATLANTIS', 'MANGANESE', 'SUBMARINE',
    ],

    // A random visitor to the vent after each word — then the manganese nodule every 4th.
    CELEBRATIONS: {
      pool: ['crab', 'octopus', 'pompeii', 'alvin', 'isopod', 'eelpout', 'yeticrab', 'clams'],
      pick: 'random',
      finale: { name: 'nodule', every: 4 },
    },
  };
});
