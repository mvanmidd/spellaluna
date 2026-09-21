/*
 * Shared effects toolkit: Web Audio primitives, speech, and the sprite animations both
 * games use (a treat flying from a tile to the hero's mouth, a critter scurrying past).
 * Art is always supplied by the theme as an SVG <defs> id — this file never names one.
 *
 * Exposes window.SpellFx.
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let muted = false;
  let actx = null;
  let trayEl = null;

  /* ---------- sound ---------- */

  // Must be called from inside a user gesture the first time, or the context stays suspended.
  function ctx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function tone(freq, startIn, dur, type, peak) {
    const c = ctx();
    if (!c || muted) return;
    const t0 = c.currentTime + (startIn || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    return osc;
  }

  /* A pitch slide — the raw material for bloops, rumbles and whooshes. */
  function sweep(from, to, dur, type, peak, startIn) {
    const c = ctx();
    if (!c || muted) return;
    const t0 = c.currentTime + (startIn || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur * 0.85);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak || 0.2, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.07);
    return osc;
  }

  /* Filtered noise burst — splashes, thumps, tail cracks. */
  function noise(dur, startIn, peak, filterHz, filterType) {
    const c = ctx();
    if (!c || muted) return;
    const t0 = c.currentTime + (startIn || 0);
    const frames = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, frames, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = filterType || 'bandpass';
    filter.frequency.setValueAtTime(filterHz || 1200, t0);
    const gain = c.createGain();
    gain.gain.setValueAtTime(peak || 0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur);
  }

  /* ---------- speech ---------- */

  function say(text, opts) {
    opts = opts || {};
    if (muted || !window.speechSynthesis) return;
    if (opts.cancel !== false) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate || 0.9;
    u.pitch = opts.pitch || 1.15;
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }

  /* Letters and all-caps words are read as "capital B" / acronyms — always lowercase. */
  function sayWord(word, opts) {
    say(String(word).toLowerCase(), opts);
  }

  function setMuted(next) {
    muted = next;
    if (muted && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function isMuted() {
    return muted;
  }

  /* ---------- sprites ---------- */

  function sprite(protoId, size, viewBox) {
    const wrap = document.createElement('div');
    wrap.className = 'sprite';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', viewBox || '-32 -32 64 64');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + protoId);
    svg.appendChild(use);
    wrap.appendChild(svg);
    document.body.appendChild(wrap);
    return wrap;
  }

  /*
   * Arc a treat from a letter tile up to the hero's mouth, then hand off to onArrive.
   * opts: { proto, size, fromEl, toEl, viewBox, duration, lift, spin, onArrive }
   */
  function flyTo(opts) {
    const size = opts.size || 84;
    const from = opts.fromEl.getBoundingClientRect();
    const to = opts.toEl.getBoundingClientRect();
    const s = sprite(opts.proto, size, opts.viewBox);
    const x0 = from.left + from.width / 2 - size / 2;
    const y0 = from.top - size / 2;
    s.style.left = x0 + 'px';
    s.style.top = y0 + 'px';
    const dx = to.left + to.width / 2 - size / 2 - x0;
    const dy = to.top + to.height / 2 - size / 2 - y0;
    const lift = opts.lift == null ? 90 : opts.lift;
    const spin = opts.spin == null ? 330 : opts.spin;

    const anim = s.animate(
      [
        { transform: 'translate(0px, 0px) scale(0.4) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${dx * 0.45}px, ${dy * 0.5 - lift}px) scale(1.1) rotate(${spin * 0.48}deg)`,
          opacity: 1,
          offset: 0.55,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(0.45) rotate(${spin}deg)`, opacity: 0.9 },
      ],
      { duration: opts.duration || 800, easing: 'ease-in-out' }
    );
    anim.onfinish = () => {
      s.remove();
      if (opts.onArrive) opts.onArrive();
    };
    return s;
  }

  /* A critter wanders in under the tiles and scurries off one side. */
  function crawlPast(opts) {
    const size = opts.size || 120;
    const area = opts.areaEl.getBoundingClientRect();
    const x0 = area.left + area.width * (0.15 + Math.random() * 0.7);
    const y0 = area.bottom + (opts.drop == null ? 18 : opts.drop);
    const s = sprite(opts.proto, size, opts.viewBox);
    s.style.left = x0 + 'px';
    s.style.top = y0 + 'px';
    const dir = Math.random() < 0.5 ? -1 : 1;
    const dist = (window.innerWidth / 2 + size) * dir;
    const flip = dir < 0 ? ' scale(-1, 1)' : '';
    const wobble = opts.wobble == null ? 8 : opts.wobble;

    const anim = s.animate(
      [
        { transform: `translate(0,0) scale(0.2)${flip}`, opacity: 0 },
        { transform: `translate(${dist * 0.05}px, -6px)${flip}`, opacity: 1, offset: 0.15 },
        { transform: `translate(${dist * 0.3}px, 4px) rotate(${wobble * dir}deg)${flip}`, offset: 0.45 },
        { transform: `translate(${dist * 0.6}px, -4px) rotate(${-wobble * dir}deg)${flip}`, offset: 0.7 },
        { transform: `translate(${dist}px, 2px)${flip}`, opacity: 1 },
      ],
      { duration: opts.duration || 1700, easing: 'linear' }
    );
    anim.onfinish = () => s.remove();
    return s;
  }

  /* ---------- the collection tray (fruit eaten / leaves munched) ---------- */

  function useTray(el) {
    trayEl = el;
  }

  function addToTray(protoId, viewBox, max) {
    if (!trayEl) return;
    if (trayEl.children.length >= (max || 18)) trayEl.innerHTML = '';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', viewBox || '-26 -30 52 56');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + protoId);
    svg.appendChild(use);
    trayEl.appendChild(svg);
  }

  /* ---------- mood classes (a temporary face on a <use> element) ---------- */

  const moodTimers = new Map();

  function mood(el, cls, ms, siblings) {
    if (!el) return;
    for (const other of siblings || []) el.classList.remove(other);
    if (moodTimers.has(el)) clearTimeout(moodTimers.get(el));
    if (!cls) return;
    el.classList.add(cls);
    moodTimers.set(el, setTimeout(() => el.classList.remove(cls), ms));
  }

  function rand(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  window.SpellFx = {
    ctx, tone, sweep, noise,
    say, sayWord, setMuted, isMuted,
    sprite, flyTo, crawlPast,
    useTray, addToTray,
    mood, rand,
    SVG_NS,
  };
})();
