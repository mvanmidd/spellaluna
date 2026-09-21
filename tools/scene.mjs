/*
 * Art-iteration helper: opens a theme and screenshots one celebration scene at several
 * moments, without playing the game. No dependencies — drives headless Chrome over CDP.
 *
 * Usage:  node tools/scene.mjs <theme> [scene] [ms,ms,ms]
 *   node tools/scene.mjs spellasaurus                 # start overlay + main scene
 *   node tools/scene.mjs spellasaurus goldenleaf      # that scene at default moments
 *   node tools/scene.mjs spellasaurus splash 0,2400,3500
 *
 * Shots land in .shots/<theme>-<scene>-<ms>.png
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9222;
const theme = process.argv[2] || 'spellasaurus';
const scene = process.argv[3] || '';
const times = (process.argv[4] || '600,2200,3600,5200').split(',').map(Number);

mkdirSync('.shots', { recursive: true });

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no page target — start Chrome with --remote-debugging-port');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails.text + ' ' +
      (m.params.exceptionDetails.exception?.description || ''));
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
};
const send = (method, params = {}) => new Promise((ok, no) => {
  const id = ++msgId;
  pending.set(id, (m) => (m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error('evaluate: ' + JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`.shots/${name}.png`, Buffer.from(r.data, 'base64'));
  console.log('shot:', name);
}

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1200, height: 820, deviceScaleFactor: 1, mobile: false,
});
await send('Page.navigate', { url: `file://${process.cwd()}/themes/${theme}/index.html` });
await sleep(900);

if (!scene) {
  await shot(`${theme}-start`);
  await evaluate(`document.getElementById('start-overlay').hidden = true`);
  await sleep(700);
  await shot(`${theme}-main`);
} else {
  // show the scene exactly the way the engine does, then sample it over time
  await evaluate(`(() => {
    document.getElementById('start-overlay').hidden = true;
    const cel = document.getElementById('celebration');
    cel.hidden = false;
    document.getElementById('celebration-word').textContent = 'TRICERATOPS';
    document.getElementById('celebration-caption').textContent = '${scene}';
    for (const s of document.querySelectorAll('#celebration .scene')) {
      s.setAttribute('hidden', ''); s.classList.remove('playing');
    }
    const s = document.getElementById('scene-${scene}');
    if (!s) throw new Error('no scene-${scene}');
    s.removeAttribute('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add('playing')));
  })()`);
  let elapsed = 0;
  for (const t of times) {
    await sleep(Math.max(0, t - elapsed));
    elapsed = t;
    await shot(`${theme}-${scene}-${t}`);
  }
}

if (errors.length) {
  console.error('CONSOLE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK — no console errors');
ws.close();
