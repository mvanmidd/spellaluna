/* Quick CDP probe for debugging layout — prints sizes/styles of celebration scene parts. */
const PORT = process.env.CDP_PORT || 9222;
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

await send('Page.enable');
await send('Page.navigate', { url: `file://${process.cwd()}/themes/spellaluna/index.html` });
await sleep(800);

const out = await evaluate(`(() => {
  const cel = document.getElementById('celebration');
  cel.hidden = false;
  const scene = document.getElementById('scene-hug');
  scene.hidden = false;
  scene.classList.add('playing');
  const luna = scene.querySelector('.cb-luna');
  const sceneRect = scene.getBoundingClientRect();
  const lunaRect = luna.getBoundingClientRect();
  const cs = getComputedStyle(luna);
  return JSON.stringify({
    sceneRect: { w: sceneRect.width, h: sceneRect.height, x: sceneRect.x, y: sceneRect.y },
    lunaRect: { w: lunaRect.width, h: lunaRect.height, x: lunaRect.x, y: lunaRect.y },
    lunaTransform: cs.transform,
    lunaTransformBox: cs.transformBox,
    lunaDisplay: cs.display,
    bbox: (() => { try { return luna.getBBox(); } catch (e) { return String(e); } })(),
    protoExists: !!document.getElementById('bat-proto'),
    sceneDisplay: getComputedStyle(scene).display,
  }, null, 1);
})()`);
console.log(out);
ws.close();
