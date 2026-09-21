/*
 * Bundles each theme into one self-contained HTML file, for emailing or hosting anywhere.
 *
 *   node tools/bundle.mjs            # every theme  -> dist/<theme>.html
 *   node tools/bundle.mjs spellasaurus
 *
 * Each themes/<name>/index.html has its <link rel="stylesheet"> and <script src> tags
 * replaced by inline <style> and <script> blocks, in the same order, so the scripts
 * still load in the order the page asks for. The page itself is otherwise untouched.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THEMES_DIR = join(ROOT, 'themes');
const OUT_DIR = join(ROOT, 'dist');

const LINK_RE = /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g;
const SCRIPT_RE = /<script\s+src="([^"]+)"\s*><\/script>/g;

// A literal "</script" or "</style" inside inlined text would end the block early.
const escapeClose = (text, tag) => text.replace(new RegExp(`</(${tag})`, 'gi'), '<\\/$1');

function bundle(name) {
  const dir = join(THEMES_DIR, name);
  const read = (ref) => {
    if (/^(https?:)?\/\//.test(ref)) throw new Error(`${name}: remote asset ${ref} can't be inlined`);
    return readFileSync(resolve(dir, ref), 'utf8').replace(/\n$/, '');
  };

  let html = readFileSync(join(dir, 'index.html'), 'utf8');
  html = html.replace(LINK_RE, (_, ref) => `<style>\n${escapeClose(read(ref), 'style')}\n</style>`);
  html = html.replace(SCRIPT_RE, (_, ref) => `<script>\n${escapeClose(read(ref), 'script')}\n</script>`);

  // Anything still pointing at a file would break once the page is moved out of the repo.
  const leftover = html.match(/<(?:link|script)\b[^>]*\b(?:href|src)="(?!#)[^"]*"/g);
  if (leftover) throw new Error(`${name}: unresolved external reference: ${leftover[0]}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `${name}.html`);
  writeFileSync(out, html);
  return { out, bytes: Buffer.byteLength(html) };
}

const dirs = readdirSync(THEMES_DIR).filter((d) => statSync(join(THEMES_DIR, d)).isDirectory());
const all = dirs.filter((d) => existsSync(join(THEMES_DIR, d, 'index.html')));
for (const d of dirs.filter((d) => !all.includes(d))) console.log(`skipping ${d}: no index.html yet`);
const names = process.argv.length > 2 ? process.argv.slice(2) : all;

for (const name of names) {
  if (!all.includes(name)) {
    console.error(`no such theme: ${name} (have: ${all.join(', ')})`);
    process.exit(1);
  }
  const { out, bytes } = bundle(name);
  console.log(`${out.replace(ROOT + '/', '')}  ${(bytes / 1024).toFixed(1)} KB`);
}
