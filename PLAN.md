# Spellaluna — Plan

A single-page spelling game for a 2-year-old (with a parent at the keyboard), starring
Spellaluna the fruit bat — who loves mangos, hates juicy bugs, likes hanging upside down,
and has three bird friends: Pip, Flitter, and Flap.

## Decisions (confirmed with you)

- **Art**: hand-drawn inline SVG characters — cohesive storybook look, animatable.
- **Sound**: browser speech synthesis (says the word, names each letter) + Web Audio
  chimes for correct letters and a silly "bloop" for bugs. No audio files needed.
- **Words**: story words from Spellaluna's world, 2–5 letters:
  BAT, MANGO, PIP, FLAP, MOON, FLY, NEST, BUG, HUG, MAMA, WING, TREE, SUN, SKY.

## Tech stack

- **Vanilla HTML + CSS + JS, no build step, no dependencies.** Open `index.html` in any
  browser and play. Three files for readability:
  - `index.html` — page structure + inline SVG art
  - `style.css` — layout, theme, CSS animations
  - `game.js` — game state machine, input, audio, speech
- Game logic (word progression, letter checking, round/celebration sequencing) lives in
  pure functions in `logic.js` (an ES module shared by the page and by tests), so it can
  be unit-tested in Node without a browser.

## Gameplay

1. **Start screen**: night-sky title scene, Spellaluna hanging upside down from a branch.
   Any key / tap starts.
2. **A word appears** in big uppercase letter tiles; speech reads it aloud.
3. **Correct letter** → tile fills in, a fruit (mostly mangos, some bananas/figs) pops up
   and flies to Spellaluna, who munches it happily. Chime + the letter's name spoken.
4. **Incorrect letter** → a juicy bug wiggles in, Spellaluna makes a yuck face, silly
   bloop sound, bug crawls away. Gentle and funny — never punitive, no lost progress.
5. **Word complete** → word spoken again + celebration:
   - 1st word: Spellaluna hugs Pip, Flitter, and Flap.
   - 2nd word: Spellaluna learns to fly, leaping from the nest with her friends.
   - 3rd word: Spellaluna reunites with her mother — big starry finale.
6. After the finale, the next set of three words begins (shuffled, no immediate repeats).

## Implementation stages

1. **Scaffold** — plan file, progress tracking, file skeletons.
2. **Core logic** (`logic.js`) — word list, round state machine, letter checking,
   celebration sequencing — plus Node unit tests.
3. **Page + tiles** — layout, letter tiles, keyboard (and on-screen tap) input wired to
   the logic.
4. **SVG art** — Spellaluna (idle, upside down, munching, yuck), Pip/Flitter/Flap,
   mango/fruit, bug, branch/nest/moon scenery.
5. **Feedback layer** — per-letter animations, Web Audio chimes/bloops, speech synthesis.
6. **Celebrations** — the three reward animations + finale.
7. **Polish & verify** — responsive sizing, repeat-play flow, manual browser test.

## Testing

- **Unit tests**: `node test/logic.test.mjs` exercises the pure logic — correct/incorrect
  letter handling, word completion, celebration order, word cycling.
- **Smoke test**: serve or open `index.html`; play through three words, deliberately
  hitting wrong keys, and confirm sounds/speech/animations fire.
- **Iteration**: you play it with your son and tell me what lands and what doesn't —
  word list, pacing, animation length, and sound are all easy to tune.

## Progress

- [x] Stage 1: Scaffold
- [x] Stage 2: Core logic + tests (9/9 passing: `node --test test/logic.test.cjs`)
- [x] Stage 3: Page + tiles + input
- [x] Stage 4: SVG art (bat with moods/poses, 3 birds, fruits, bug, nest, scenery)
- [x] Stage 5: Sound + speech + per-letter feedback (speech lowercased — TTS said "capital B")
- [x] Stage 6: Celebration animations (hug / fly / mama; fixed SVG `hidden` attribute toggling)
- [x] Stage 7: Polish + verify (end-to-end headless-Chrome run via `tools/snap.mjs`, screenshots in `.shots/`)

### Iteration 2 (user feedback)

- [x] Bigger fruit (84px flight sprite, 42px tray) and bugs (120px)
- [x] Birds redrawn as sparrows (brown/black/white, ~Spellaluna-sized), wing poses via CSS vars
- [x] Birds hang upside down on the branch beside Spellaluna, swaying
- [x] Hug rework: birds hop in, Spellaluna wraps her wings around them (pivoting hug wings)
- [x] Fly rework: all four leap from the nest, fall with wings folded, then flap and soar
  (wing snap-open timed from JS)
