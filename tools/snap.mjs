/*
 * Drives the game in headless Chrome via the DevTools protocol (no dependencies;
 * uses Node's built-in WebSocket). Types through words, takes screenshots into
 * .shots/, and fails loudly on any console error.
 *
 * Usage: start Chrome first, then `node tools/snap.mjs`
 */
import { writeFileSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9222;

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
  writeFileSync(`.shots/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('shot:', name);
}

async function press(key) {
  const code = /^[a-z]$/i.test(key) ? 'Key' + key.toUpperCase() : key;
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
}

// Wait (up to 12s) for the celebration to finish and the next word to render.
async function waitForNewWord(prevWord) {
  for (let i = 0; i < 60; i++) {
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
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });

await send('Page.navigate', { url: `file://${process.cwd()}/index.html` });
await sleep(900);
await shot('01-start');

// begin the game
await press('x');
await sleep(700);
const word = await evaluate(`document.getElementById('tiles').textContent`);
console.log('word:', word);
if (!/^[A-Z]{2,5}$/.test(word)) throw new Error('no word rendered: ' + JSON.stringify(word));
await shot('02-word');

// type the first letter correctly, catch the fruit mid-flight
await press(word[0].toLowerCase());
await sleep(350);
await shot('03-fruit-flying');

// wrong letter -> bug + yuck face
const wrong = word[1] === 'Z' ? 'Q' : 'Z';
await press(wrong.toLowerCase());
await sleep(500);
await shot('04-bug');
await sleep(1500);

// finish the word -> first celebration (hug)
for (const ch of word.slice(1)) {
  await press(ch.toLowerCase());
  await sleep(450);
}
const doneCount = await evaluate(`document.querySelectorAll('.tile.done').length`);
console.log('tiles done:', doneCount, '/', word.length);
await sleep(1200);
await shot('05-celebration-hug-early');
await sleep(2800);
await shot('06-celebration-hug-late');

// word 2 -> fly celebration (jump from nest, fall, flap)
const word2 = await waitForNewWord(word);
console.log('word 2:', word2);
for (const ch of word2) { await press(ch.toLowerCase()); await sleep(120); }
await sleep(2400);
await shot('07a-celebration-fly-leap');
await sleep(1800);
await shot('07b-celebration-fly-soar');

// word 3 -> mama celebration
const word3 = await waitForNewWord(word2);
console.log('word 3:', word3);
for (const ch of word3) { await press(ch.toLowerCase()); await sleep(120); }
await sleep(4200);
await shot('08-celebration-mama');

// back to play for word 4
const word4 = await waitForNewWord(word3);
console.log('word 4:', word4);
await shot('09-word4');

if (errors.length) {
  console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK — no console errors');
ws.close();
