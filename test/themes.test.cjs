/*
 * Checks each theme's data against its page: every word is typeable, and every
 * celebration the rules can pick has a scene in the HTML to play it. These are the
 * mistakes that are easy to make when adding a theme and invisible until mid-game.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const THEMES_DIR = join(__dirname, '..', 'themes');
const themes = readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

test('there is at least one theme', () => {
  assert.ok(themes.length >= 1);
});

for (const name of themes) {
  const dir = join(THEMES_DIR, name);
  const { WORDS, CELEBRATIONS } = require(join(dir, 'words.js'));
  const html = readFileSync(join(dir, 'index.html'), 'utf8');

  test(`${name}: words are uppercase letters only, and not too long to spell`, () => {
    assert.ok(WORDS.length >= 10, `only ${WORDS.length} words`);
    for (const w of WORDS) {
      assert.match(w, /^[A-Z]+$/, `${w} is not plain uppercase letters`);
      assert.ok(w.length >= 2 && w.length <= 16, `${w} is ${w.length} letters`);
    }
    assert.equal(new Set(WORDS).size, WORDS.length, 'duplicate words');
  });

  test(`${name}: every celebration it can pick has a scene on the page`, () => {
    const named = [...CELEBRATIONS.pool];
    if (CELEBRATIONS.finale) named.push(CELEBRATIONS.finale.name);
    assert.ok(named.length >= 1);
    for (const celebration of named) {
      assert.ok(
        html.includes(`id="scene-${celebration}"`),
        `${name} can pick "${celebration}" but has no #scene-${celebration}`
      );
    }
  });

  test(`${name}: every celebration has a caption and a duration`, () => {
    const themeJs = readFileSync(join(dir, 'theme.js'), 'utf8');
    const named = [...CELEBRATIONS.pool];
    if (CELEBRATIONS.finale) named.push(CELEBRATIONS.finale.name);
    for (const celebration of named) {
      assert.match(themeJs, new RegExp(`\\b${celebration}\\s*:\\s*\\{`),
        `theme.js has no scene entry for "${celebration}"`);
    }
    assert.match(themeJs, /caption:/);
    assert.match(themeJs, /duration:/);
  });

  test(`${name}: the page loads the engine and its own theme files`, () => {
    for (const src of ['words.js', '../../engine/rules.js', '../../engine/fx.js',
                       '../../engine/engine.js', 'theme.js']) {
      assert.ok(html.includes(`src="${src}"`), `missing <script src="${src}">`);
    }
    assert.ok(html.includes('href="../../engine/engine.css"'), 'missing engine.css');
    assert.ok(html.includes('href="theme.css"'), 'missing theme.css');
  });

  test(`${name}: the page has the elements the engine drives`, () => {
    for (const id of ['tiles', 'hint', 'start-overlay', 'celebration',
                      'celebration-word', 'celebration-caption']) {
      assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
    }
  });

  test(`${name}: the launcher links to it`, () => {
    const launcher = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(launcher.includes(`themes/${name}/index.html`), `launcher has no link to ${name}`);
  });
}
