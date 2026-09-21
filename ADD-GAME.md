# Adding a new game

A guide for whoever builds game #3. Read `themes/spellasaurus/` alongside this — it is the
reference implementation and every rule below is visible in it.

## The split

`engine/` owns everything that is the same in every game: the shuffled word queue,
letter-by-letter matching, which reward comes next, the phase machine, keyboard input,
the letter tiles, the celebration sequencer, the add-a-word modal, the mute button, and
the audio/speech/sprite primitives.

A theme owns words, art, sounds, and choreography. Four files, no build step, no
dependencies — the games open over `file://`, so **no ES modules and no `fetch()`**.
Classic `<script>` tags and globals only.

Never edit `engine/` to make one theme work. If you find yourself wanting to, either the
engine genuinely needs a new knob (add it with a default that preserves existing
behaviour, and run both other games afterwards) or you're solving it in the wrong place.

## 1. Decide the design before writing code

Pin these down first; everything else follows:

- **The hero and the setting** — one character with a face, in a place.
- **The treat** (correct letter): a small thing that flies from the tile to the hero's
  mouth, and piles up in the tray.
- **The critter** (wrong letter): something silly that scurries across under the tiles.
  Never punitive — no lost progress, no scary noise.
- **The happy animations**: 3–5 short scenes, ~6 seconds each.
- **The finale**: one bigger scene, ~8 seconds, for every Nth word.
- **The word list**: 15–25 words, a mix of lengths, all uppercase A–Z, 2–16 letters.

Then pick how rewards are chosen: `pick: 'cycle'` walks the pool in order (Spellaluna),
`pick: 'random'` draws at random and never repeats back to back (Spellasaurus). A
`finale` replaces the pool pick every Nth word rather than playing in addition to it.

## 2. Files to create

```
themes/<name>/
  index.html   inline SVG <defs>, the main scene, the start overlay, the celebration scenes
  words.js     the word list + celebration config   (UMD-ish, so tests can require it)
  theme.js     sound design, art hookups, choreography; calls SpellEngine.boot()
  theme.css    palette + every animation
```

Then add a card to the root `index.html` launcher (a test checks the link exists).

`index.html` must load, in this order, and contain these ids:

```html
<link rel="stylesheet" href="../../engine/engine.css">
<link rel="stylesheet" href="theme.css">
...
<script src="words.js"></script>
<script src="../../engine/rules.js"></script>
<script src="../../engine/fx.js"></script>
<script src="../../engine/engine.js"></script>
<script src="theme.js"></script>
```

Required ids: `#tiles`, `#hint`, `#start-overlay`, `#celebration`, `#celebration-word`,
`#celebration-caption`, one `#scene-<celebration>` per celebration, and optionally
`#tray`. The engine injects the mute button and the add-a-word modal itself, so don't
write them.

## 3. The theme contract

```js
SpellEngine.boot({
  name: 'Spellasaurus',
  hint: 'Help Spellasaurus spell it!',
  addWordLabel: 'Add a word for Spellasaurus to spell:',

  words: window.SpellWords.WORDS,
  celebrations: window.SpellWords.CELEBRATIONS,   // { pool, pick, finale }

  scenes: {
    // one key per celebration name; the key must match #scene-<key>
    snuggle: { caption: '...', duration: 6000 },
    splash: {
      caption: '...', duration: 6200,
      // optional: timed steps inside the scene. Return a cleanup function.
      start(sceneEl, ev) {
        const cancel = E.steps([[2400, splashSound], [3450, splashSound]]);
        return () => cancel();
      },
    },
  },

  onCorrect({ tileEl, index, letter }) { /* sound + the treat flying */ },
  onIncorrect({ letter, expected })    { /* sound + the critter + a face */ },
  onWordComplete(ev)                   { /* fanfare; ev.finale is true on finale words */ },
  onWordStart(word) {},                // optional
});
```

`start()` runs when the scene appears; whatever it returns is called when the scene ends.
**Anything it mutates must be undone in the cleanup** — a class you add to a `<use>`
survives into the next play otherwise. Clear your own timers there too (`E.steps` returns
a canceller for exactly this).

`SpellFx` (aliased as `fx`) gives you:

| | |
|---|---|
| `tone(freq, startIn, dur, type, peak)` | one note |
| `sweep(from, to, dur, type, peak, startIn)` | a pitch slide — bloops, rumbles, whooshes |
| `noise(dur, startIn, peak, filterHz, filterType)` | filtered noise — splashes, thumps, cracks |
| `sayWord(text, opts)` / `say(text, opts)` | speech |
| `flyTo({proto, size, fromEl, toEl, spin, lift, onArrive})` | treat: tile → mouth |
| `crawlPast({proto, size, areaEl, drop, wobble, duration})` | critter across the tiles |
| `addToTray(protoId, viewBox)` | pile up what's been eaten |
| `mood(el, cls, ms, siblings)` | a temporary face class on a `<use>` |
| `rand(list)` | pick one |

The mouth target is an invisible `<circle id="...-mouth">` you place in the main scene. If
the hero's head moves, give the anchor the same transform and animation as the head so it
tracks (see `.neck-anchor` in Spellasaurus).

## 4. Drawing the cast

Inline SVG in `<defs>`, flat shapes, a few highlights. Conventions that matter:

- **Feet at the origin, facing right, y negative is up.** Mirror with `scale(-1, 1)` for
  characters that face left.
- **Faces are switched with CSS custom properties**, not classes on inner elements — CSS
  can't reach inside a `<use>` shadow tree, but custom properties inherit into it:

  ```html
  <g style="display: var(--eyes-happy, none)"> ... </g>
  ```
  ```css
  .dino-face { --eyes-open: block; --eyes-happy: none; --mouth-munch: none; }
  .dino-face.happy { --eyes-open: none; --eyes-happy: block; }
  ```
  Same trick for recolouring: `fill="var(--dino-body, #7bb37f)"` lets one proto serve as
  the hero and her mother.

- **If a body part has to move on its own, draw it as its own proto with its pivot at the
  origin**, and place the parts as siblings inside a wrapper `<g>`. Spellasaurus is
  `#bronto-body` + `#bronto-neck` (pivot at the shoulder) + `#bronto-tail` (pivot at the
  hip), with a `#bronto-proto` that glues all three together for static art. Keep the
  part offsets in one CSS rule:

  ```css
  .dino .neck { transform: translate(58px, -148px); }
  .dino .tail { transform: translate(-82px, -126px); }
  ```

- A path with no `fill` inherits it, so `<use>` inside a coloured `<g>` can shade a whole
  set of limbs at once.

## 5. Animating scenes — the four rules that actually matter

These were established by experiment; trust them rather than re-deriving.

1. **A CSS `transform` on a `<use>` resolves in its parent `<g>`'s local coordinates with
   the origin at `0 0`.** So `translate(x, y) scale(s) rotate(a)` puts the referenced
   art's own origin at `(x, y)` and rotates about that point. `transform-box` makes no
   difference when you use absolute lengths.
2. **CSS `transform` replaces the SVG `transform` attribute entirely.** A part that
   animates must carry its *full* transform in CSS and in every keyframe — including the
   translate and scale, not just the rotate.
3. **Custom properties can't be animated** (they step discretely). But they *can* appear
   inside animated `transform` values, which is how one `@keyframes` serves many sprites:

   ```css
   @keyframes burst {
     0%   { transform: translate(var(--px), var(--py)) rotate(var(--a)) translate(0, 0) scale(0.25); opacity: 0; }
     100% { transform: translate(var(--px), var(--py)) rotate(var(--a)) translate(0, calc(-1 * var(--d))) scale(1.05); opacity: 0; }
   }
   .drop.d1 { --a: -74deg; --d: 176px; }
   ```
   Same pattern drives `hop` in the friends scene (per-character `--hx/--hy/--sx/--sy`).
4. **The individual `translate:` / `rotate:` / `scale:` properties compose on top of
   `transform`, in the parent's space.** That's how `heart-float` and `star-pop` drift and
   pop while `transform` holds their position.

Whole-body motion: animate the wrapper `<g>`'s transform. Articulation: animate the
part's transform. Both at once is fine — they're independent coordinate systems.

Composition notes: celebration scenes use `viewBox="0 100 800 400"` with the ground around
`y = 464`. The main scene is full-bleed (`preserveAspectRatio="xMidYMax slice"`, width
`100vw`), which crops ~60 units off the top on a wide window — **keep treetops and
anything important below `y ≈ 60`**.

## 6. Palette

`engine.css` takes every colour from custom properties. Override them in `theme.css`:
`--ink`, `--ink-dim`, `--accent`, `--accent-edge`, `--accent-ink`, `--overlay-bg`,
`--panel-bg`, `--hairline`, `--error`, `--game-font`.

If the play area is **light** (Spellasaurus) you must also set `--tile-bg`, `--tile-ink`,
`--tile-edge`, `--hint-ink`, `--chrome-ink`, `--chrome-bg`, `--chrome-hairline` — the
defaults assume a dark background and vanish on a pale one. Overlays can be dark even
when the play area is light; that combination works well.

## 7. Sound

Build small named functions on `fx.tone` / `fx.sweep` / `fx.noise` at the top of
`theme.js`. Give the correct-letter sound a pitch that climbs with the letter index — it
makes a long word feel like it's going somewhere. Keep the wrong-letter sound short,
low and daft. Sync scene-specific sounds to the animation with `E.steps`, matching the
keyframe percentages (a sound at 52% of a 3s animation with a 0.5s delay fires at 2050ms).

## 8. The dev loop on this laptop

Non-interactive shells don't source `~/.zprofile`, so export the path first:

```sh
export PATH=/opt/homebrew/bin:$PATH     # node 26 lives here
node --test test/
```

Start headless Chrome once and leave it running:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/spell-chrome about:blank &
```

Then iterate. Both tools fail loudly on any console error, and write PNGs into `.shots/`
which you should actually open and look at:

```sh
node tools/scene.mjs <theme>                        # start overlay + main scene
node tools/scene.mjs <theme> <scene> 900,2400,3800  # one scene sampled at those ms
node tools/snap.mjs  <theme> 6                      # play 6 words for real, end to end
```

`snap.mjs` is the one that proves the game works: it types a wrong letter and asserts no
progress is lost, and reports which celebration fired after each word — check the finale
lands on every Nth. `scene.mjs` only adds the `.playing` class, so anything your scene's
`start()` hook does (sounds, classes added mid-scene) won't show up in its previews.

Build the art in this order — main scene first, then each celebration — and screenshot
after every change. Getting a scene right takes several passes; that's normal, and it is
much faster than reasoning about SVG coordinates in your head.

Stop Chrome when you're done: `pkill -f 'remote-debugging-port=9222'`.

## 9. Tests

`test/themes.test.cjs` discovers every directory under `themes/` automatically, so a new
game is covered the moment it exists. It checks the word list, that every celebration the
rules can pick has a matching `#scene-<name>` **and** an entry in `theme.js` written as
`name: {` with a caption and duration, that the page loads the engine files, that the
required ids are present, and that the launcher links to it.

`test/rules.test.cjs` covers the engine and should need no changes. If you do change
`engine/rules.js`, add a test there and re-run `snap.mjs` on **all** themes — the reward
selector is shared, and a bug there is invisible until the third or fourth word.

## 10. Checklist before calling it done

- [ ] `node --test test/` green
- [ ] `node tools/snap.mjs <new-theme> 6` — no console errors, finale on every Nth word,
      all happy animations seen across a couple of runs
- [ ] `node tools/snap.mjs spellaluna 3` and `spellasaurus 4` still green
- [ ] Every scene looked at in a screenshot, mid-animation and at the end
- [ ] The longest word fits on one line; the shortest doesn't look silly
- [ ] `+` opens the add-a-word modal and the added word is spelled next
- [ ] Launcher card added and linked
- [ ] `PLAN.md` gets a short section on what you built and anything you learned the hard way
