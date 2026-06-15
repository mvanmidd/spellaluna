# Spellaluna 🦇🥭

A single-page spelling game starring Spellaluna the fruit bat and her bird friends
Pip, Flitter, and Flap. Built for a 2-year-old (with a grown-up at the keyboard).

## Play

Open `index.html` in any browser — no server, no build, no dependencies.
Press any key to start, then type the word shown in the tiles.

- **Correct letter** → the tile lights up, a chime plays, the letter is spoken, and a
  fruit flies up to Spellaluna for a munch.
- **Wrong letter** → a silly bloop, a juicy bug scurries past, and Spellaluna makes a
  yuck face. No penalty — progress is kept.
- **Word complete** → a celebration: hugging her bird friends (1st word), learning to
  fly (2nd), and reuniting with her mama (3rd). Then a new set of words begins.

The 🔊 button (top right) mutes speech and sound effects.

## Tweak it

- **Words**: edit the `WORDS` list at the top of `logic.js` (uppercase, 2–5 letters).
- **Captions / celebration length**: `CELEBRATION_INFO` in `game.js`.
- **Fruit mix**: the `FRUITS` array in `game.js` (more `'mango'` entries = more mangos).

## Develop

- Unit tests for the game rules: `node --test test/logic.test.cjs`
- Automated visual run (drives headless Chrome via CDP, screenshots into `.shots/`):
  ```sh
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --remote-debugging-port=9222 \
    --user-data-dir=/tmp/spellaluna-chrome about:blank &
  node tools/snap.mjs
  ```

See `PLAN.md` for the design plan and build progress.
