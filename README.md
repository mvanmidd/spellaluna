# Spelling games 🦇🥭 🦕🌿

Two single-page spelling games for a small human (with a grown-up at the keyboard):

- **Spellaluna** — Spellaluna the fruit bat and her bird friends Pip, Flitter and Flap.
- **Spellasaurus** — Spellasaurus the brontosaurus, who eats star leaves off a tall tree.

Both games share one engine; each supplies its own words, art, sounds and rewards.

## Play

Open `index.html` in any browser and pick a game — no server, no build, no dependencies.
Press any key to start, then type the word shown in the tiles.

- **Correct letter** → the tile lights up, a note plays, the letter is spoken, and a
  treat flies up to the hero (a mango for Spellaluna, a star leaf for Spellasaurus).
- **Wrong letter** → a silly noise and a critter scurries past — a juicy bug or a
  dragonfly. The hero pulls a face. No penalty, and progress is kept.
- **Word complete** → the word is spoken again and a celebration plays.
  - *Spellaluna*: hugging her friends, learning to fly, then finding her mama, in order.
  - *Spellasaurus*: a random one of snuggling her mommy, splashing in the water, a tail
    crack, or playing with friends — and every third word, the golden leaf at the very
    top of the tree.

The 🔊 button (top right) mutes speech and sound effects. **Press `+`** to add a word of
your own for the hero to spell next.

## Layout

```
index.html            the launcher — pick a game
engine/               everything that isn't a theme
  rules.js              word queue, letter matching, which reward comes next (pure, tested)
  fx.js                 Web Audio, speech, flying/crawling sprites, the tray
  engine.js             phase machine, input, tiles, celebration sequencing, add-a-word
  engine.css            tiles, overlays, modal — palette comes from custom properties
themes/<name>/
  index.html            the page: inline SVG art + the scenes, nothing else
  words.js              the word list and which rewards can play
  theme.js              sound design, art hookups, celebration choreography
  theme.css             palette and all the animation
```

A theme calls `SpellEngine.boot({...})` with its words, celebrations, per-scene captions
and durations, and three callbacks: `onCorrect`, `onIncorrect`, `onWordComplete`.
Each celebration named in `words.js` needs a matching `#scene-<name>` in the page; a test
checks that for you.

## Tweak it

- **Words and reward order**: `themes/<name>/words.js`.
- **Captions and celebration length**: the `scenes` object in `themes/<name>/theme.js`.
- **Sounds**: the small functions at the top of `theme.js`, built on `SpellFx.tone`,
  `SpellFx.sweep` and `SpellFx.noise`.

## Develop

Unit tests (game rules, plus each theme's data against its page):

```sh
node --test test/
```

Automated visual runs drive headless Chrome over CDP and fail on any console error:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/spell-chrome about:blank &

node tools/snap.mjs spellasaurus 4     # play 4 words end to end, screenshots in .shots/
node tools/scene.mjs spellasaurus goldenleaf 900,2400,3800   # one scene at set moments
```

`tools/probe.mjs` and `tools/bird-test.mjs` are small debugging aids for SVG layout.

See `PLAN.md` for the design plan and build progress.
