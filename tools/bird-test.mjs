/* Renders the bird proto big, folded vs flying, for art debugging. */
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

await send('Page.enable');
await send('Page.navigate', { url: `file://${process.cwd()}/themes/spellaluna/index.html` });
await sleep(700);
await send('Runtime.evaluate', { expression: `(() => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:#223;z-index:999;display:flex;';
  d.innerHTML = \`
    <svg viewBox="-150 -260 320 280" style="width:50%"><g>
      <use href="#bird-proto" class="bird-use"/></g></svg>
    <svg viewBox="-150 -260 320 280" style="width:50%"><g>
      <use href="#bird-proto" class="bird-use flying"/></g></svg>\`;
  document.body.appendChild(d);
})()` });
await sleep(400);
const r = await send('Page.captureScreenshot', { format: 'png' });
const { writeFileSync } = await import('node:fs');
writeFileSync('.shots/bird-test.png', Buffer.from(r.data, 'base64'));
console.log('bird-test.png written');
ws.close();
