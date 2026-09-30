/*
 * Spellodrum's word list and rewards — the file to edit to tune the game.
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
    // Drum words, band words, and a lot of Bowie and Sabbath. 50 of them, 3–10 letters.
    // HI-HAT is the one with a hyphen in it — the minus key types it.
    WORDS: [
      // the kit
      'DRUM', 'SNARE', 'CYMBAL', 'HI-HAT', 'CRASH', 'RIDE', 'KICK', 'TOM', 'STICKS',
      'PEDAL', 'GONG', 'BONGO', 'COWBELL', 'TAMBOURINE', 'TIMPANI',
      // playing
      'BEAT', 'RHYTHM', 'ROCK', 'FAST', 'SLOW', 'LOUD', 'SOLO', 'FILL', 'ROLL',
      'GROOVE', 'TEMPO', 'JAM', 'PUNK', 'SONG', 'MUSIC', 'DRUMMER',
      // the band and the show
      'GREG', 'DEERHOOF', 'BRIAN', 'GUITAR', 'BASS', 'AMP', 'BAND', 'STAGE', 'TOUR',
      'SHOW', 'SINCLAIR', 'CEREAL',
      // the records
      'ZIGGY', 'STARMAN', 'DAVID', 'BOWIE', 'SABBATH', 'OZZY', 'IRONMAN',
    ],

    // Something random and fun after every word — no big finale, just Greg being Greg.
    CELEBRATIONS: {
      pool: ['fast', 'slow', 'rocknroll', 'solo', 'practice', 'tour', 'sinclair', 'cereal'],
      pick: 'random',
    },
  };
});
