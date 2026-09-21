/*
 * Plays a theme end to end in headless Chrome via the DevTools protocol (no dependencies;
 * uses Node's built-in WebSocket). Types through several words — correctly and
 * incorrectly — screenshots into .shots/, and fails loudly on any console error.
 *
 * Usage: start Chrome first, then
 *   node tools/snap.mjs [theme] [wordCount]
 *   node tools/snap.mjs spellaluna
 *   node tools/snap.mjs spellasaurus 3
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9222;
const theme = process.argv[2] || 'spellaluna';
const wordCount = Number(process.argv[3] || 3);

mkdirSync('.shots', { recursive: true });

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const errors = [];

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.text + ' ' +
      (msg.params.exceptionDetails.exception?.description || ''));
  } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error('evaluate failed: ' + JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`.shots/${theme}-${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('shot:', name);
}

async function press(key) {
  const code = /^[a-z]$/i.test(key) ? 'Key' + key.toUpperCase() : key;
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
}

const currentWord = () => evaluate(`document.getElementById('tiles').textContent`);

/* Which celebration scene is on screen right now, if any. */
const playingScene = () => evaluate(
  `(document.querySelector('#celebration .scene.playing') || {}).id || ''`
);

/* Wait (up to 14s) for the celebration to finish and the next word to render. */
async function waitForNewWord(prevWord) {
  for (let i = 0; i < 70; i++) {
    await sleep(200);
    const word = await evaluate(
      `document.getElementById('celebration').hidden ? document.getElementById('tiles').textContent : ''`
    );
    if (word && word !== prevWord) return word;
  }
  throw new Error('timed out waiting for a new word after ' + prevWord);
}

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 820, deviceScaleFactor: 1, mobile: false });

await send('Page.navigate', { url: `file://${process.cwd()}/themes/${theme}/index.html` });
await sleep(900);
await shot('01-start');

// begin the game
await press('x');
await sleep(700);
let word = await currentWord();
console.log('word 1:', word);
if (!/^[A-Z]{2,20}$/.test(word)) throw new Error('no word rendered: ' + JSON.stringify(word));
await shot('02-word');

// one correct letter — catch the treat mid-flight
await press(word[0].toLowerCase());
await sleep(320);
await shot('03-treat-flying');

// a wrong letter — the critter and the unhappy face
const wrong = word[1] === 'Z' ? 'Q' : 'Z';
await press(wrong.toLowerCase());
await sleep(500);
await shot('04-wrong-letter');
const progress = await evaluate(`document.querySelectorAll('.tile.done').length`);
if (progress !== 1) throw new Error(`a wrong letter cost progress: ${progress} tiles done, expected 1`);
await sleep(1200);

// finish this word and every following one, screenshotting each celebration
const seen = [];
for (let n = 1; n <= wordCount; n++) {
  for (const ch of word.slice(n === 1 ? 1 : 0)) {
    await press(ch.toLowerCase());
    await sleep(n === 1 ? 260 : 110);
  }
  await sleep(1800);
  const scene = await playingScene();
  seen.push(scene);
  console.log(`word ${n} (${word}) ->`, scene || '(no scene)');
  if (!scene) throw new Error('no celebration scene playing after ' + word);
  await shot(`05-${n}-${scene.replace('scene-', '')}`);
  await sleep(1600);
  await shot(`06-${n}-${scene.replace('scene-', '')}-late`);
  if (n < wordCount) {
    word = await waitForNewWord(word);
    console.log(`word ${n + 1}:`, word);
  }
}

console.log('celebrations seen:', seen.join(', '));

if (errors.length) {
  console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK — no console errors');
ws.close();
