# Spelling games — Plan

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


## Iteration 3: engine / theme split + Spellasaurus

Adding a second game made it worth separating the parts that never change from the parts
that are entirely art. The shared code isn't large (~280 lines), but it carries the
bug fixes that were expensive to find the first time — SVG `hidden` needs the attribute
not the property, re-adding `.playing` needs a double `requestAnimationFrame`, speech
has to be lowercased or it reads "capital B", and the AudioContext must be unlocked
inside the user gesture. Those should exist once, not once per game.

### Engine (theme-free)

- `engine/rules.js` — word queue, letter matching, and a celebration selector that covers
  both games: a `pool` walked in order (`pick: 'cycle'`) or drawn at random without
  immediate repeats (`pick: 'random'`), plus an optional `finale` every Nth word.
- `engine/fx.js` — `tone`/`sweep`/`noise` audio primitives, speech, the sprite factory,
  `flyTo` (tile → the hero's mouth) and `crawlPast` (a critter across the tiles), the tray.
- `engine/engine.js` — phase machine, keyboard input, tiles, the celebration sequencer,
  the add-a-word modal and the mute button. It injects the chrome that has no theme
  content at all, so a theme page is art and nothing else.
- `engine/engine.css` — tiles, overlays, modal; every colour comes from a custom property
  so a daylight theme works as well as a night one.

### Theme contract

`SpellEngine.boot({ words, celebrations, scenes, onCorrect, onIncorrect, onWordComplete })`.
Each celebration name needs a `#scene-<name>` in the page and an entry in `scenes` with a
caption, a duration, and an optional `start(sceneEl)` for timed steps, which returns a
cleanup function. `test/themes.test.cjs` checks the wiring for every theme.

### Spellasaurus

- Brontosaurus drawn in three pieces — body, neck (pivoting at the shoulder), tail
  (pivoting at the hip) — so scenes can articulate her. `#bronto-proto` glues them
  together for static art.
- 20 words, 3–13 letters, EGG through TYRANNOSAURUS. Tiles now size themselves to the
  word length so the long ones still fit on one line.
- Correct letter → a star-shaped leaf flies to her mouth; wrong letter → a dragonfly.
- Four happy animations picked at random (snuggle, splash, tail crack, friends), and the
  golden leaf at the top of the tree as the finale every third word.

### Progress

- [x] Engine extracted; Spellaluna migrated onto it and verified unchanged end to end
- [x] Rules generalised (random picks, finale every Nth word) — a test caught the finale
      throwing off the cycle position
- [x] Spellasaurus art, scenes, sound design and choreography
- [x] Launcher page at the repo root
- [x] `tools/snap.mjs` takes a theme; `tools/scene.mjs` added for art iteration

## Iteration 4: Spellworms

A third game, built entirely through the theme contract — **`engine/` was not touched**,
which is the main thing worth recording: a dark underwater world, a hero that hides
instead of a critter that scurries, and eight celebrations all fit inside the existing
knobs. The engine's defaults already assume a dark play area, so the palette work was
just overriding `--accent` and friends.

### The world

Spellworm is a giant tube worm on a hydrothermal vent, two and a half kilometres down.
Ten neighbours crowd round a black smoker; she stands in the foreground.

- **Tube worm rig** — two pieces, `#worm-tube` and `#worm-plume` (pivot at the tube's
  rim), with `#worm-proto` gluing them for static art. The plume is drawn **before** the
  tube so the tube occludes it — that is the whole trick behind the wrong-letter duck.
- **Correct letter** → one of three real vent sulfides flies to her mouth (pyrite gold,
  chalcopyrite violet, barite pale blue) and piles up in the tray, chosen with `fx.rand`
  so the tray ends up mixed.
- **Wrong letter** → no critter. The vent stops blowing for a second (the smoke `<use>`
  elements get `animation: none`, the chimney coughs) and she pulls down inside her tube.
  Non-punitive and, from watching it, the funniest of the three games' wrong-letter beats.
- **Eight happy animations** picked at random — ghost crab, dumbo octopus, Pompeii worm
  party, Alvin the submarine, giant isopod, vent eelpout, dancing yeti crab, singing
  giant clams — and a manganese nodule rising out of the vent as the finale every 4th word.
- 24 words, 4–9 letters, DEEP through MANGANESE.

### Things learned the hard way

- **Restarting a CSS animation needs a forced reflow, not just a class toggle.** The vent
  cough and the duck both re-add a class that may already be there; without
  `void el.getBoundingClientRect()` between the remove and the add, nothing replays.
- **Two animations on one property, with the second delayed, is how you chain.** A pop
  then a bob (`pop-up ... forwards, pw-bob ... <delay> infinite alternate`) works because
  an animation in its delay phase with `fill-mode: none` doesn't apply, so the later one
  only wins once it starts. Used for the Pompeii worms, Alvin's dive-then-hover, and the
  isopod's unroll-then-wiggle.
- **A `<use>`'s CSS `rotate()` pivots on the parent group's origin**, which makes hinges
  free: place a `<g class="clam">` at the hinge and the two valves just `rotate()` about
  it, the lower one under an extra `scale(1, -1)`.
- **SMIL inside a proto covers idle articulation** that every instance should share —
  crab claws, octopus fins, the eelpout's tail. CSS keyframes stay for anything a scene
  needs to time.
- **Bottlebrush plumes read as an afro; pointed blades read as a crown.** What works is a
  pointed blade with a fringe of barbs drawn *behind* it, so only the barb tips escape
  the silhouette.
- **Light cones need `mix-blend-mode: screen`.** A pale yellow fill at low opacity over
  deep blue is just olive-grey.

### Progress

- [x] Word list, art, sound design, choreography — no engine changes
- [x] Eight celebration scenes plus the manganese finale, each checked in screenshots
- [x] `node --test test/` green (31 tests); `snap.mjs spellworms 8` — finale on 4 and 8
- [x] `snap.mjs spellaluna 3` and `spellasaurus 4` still green
- [x] `BUNDLE=1 snap.mjs spellworms 5` — the single-file build plays too
- [x] Launcher card added
