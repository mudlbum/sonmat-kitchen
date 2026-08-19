#!/usr/bin/env node
// Post-build checks. Runs against dist/ before anything is deployed.
//
// The failure this is really guarding against: a recipe title containing "&"
// or "<" that escapes correctly in HTML but breaks feed.xml, leaving a site
// that looks fine to a human and is invisible to every feed reader and crawler.
//
// Since the site went bilingual it also guards the invariant the whole design
// rests on: an English page and a Korean page exist for the same thing, they
// point at each other, and neither can ship without the other.

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));

const problems = [];
const fail = (msg) => problems.push(msg);

if (!existsSync(OUT)) {
  console.error('dist/ does not exist — run `node scripts/build.mjs` first');
  process.exit(1);
}

async function walk(dir, base = '') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path.join(dir, entry.name), rel)));
    else out.push(rel);
  }
  return out;
}

const files = await walk(OUT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const html = new Map();
for (const f of htmlFiles) html.set(f, await readFile(path.join(OUT, f), 'utf8'));

/* ------------------------------------------------- XML well-formedness */

const VOID_OK = new Set(); // our XML has no void elements

function checkXml(name, src) {
  const stack = [];
  let i = 0;
  src = src.replace(/^<\?xml[^?]*\?>/, '');

  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const text = lt === -1 ? src.slice(i) : src.slice(i, lt);

    // Bare & is the classic breakage. Allow only real entities/char refs.
    const bad = text.match(/&(?!(?:amp|lt|gt|quot|apos);|#\d+;|#x[0-9a-fA-F]+;)/);
    if (bad) fail(`${name}: unescaped "&" in text content near "${text.slice(Math.max(0, bad.index - 25), bad.index + 25).trim()}"`);

    if (lt === -1) break;
    const gt = src.indexOf('>', lt);
    if (gt === -1) { fail(`${name}: unterminated tag`); break; }

    const tag = src.slice(lt + 1, gt);
    if (tag.startsWith('!--')) {
      const end = src.indexOf('-->', lt);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    if (tag.startsWith('/')) {
      const nameOnly = tag.slice(1).trim();
      const open = stack.pop();
      if (open !== nameOnly) fail(`${name}: </${nameOnly}> closes <${open ?? 'nothing'}>`);
    } else if (!tag.endsWith('/')) {
      const nameOnly = tag.split(/[\s/>]/)[0];
      if (!VOID_OK.has(nameOnly)) stack.push(nameOnly);
    }
    i = gt + 1;
  }
  if (stack.length) fail(`${name}: unclosed <${stack.join('>, <')}>`);
}

const xmlFiles = ['sitemap.xml', 'feed.xml', 'ko/feed.xml'];
for (const f of xmlFiles) {
  if (!files.includes(f)) { fail(`missing ${f}`); continue; }
  checkXml(f, await readFile(path.join(OUT, f), 'utf8'));
}

/* --------------------------------------------------- per-page HTML checks */

const base = cfg.base.replace(/\/$/, '');
const origin = cfg.origin.replace(/\/$/, '');
const titles = new Map();   // lang -> Map(title -> [files])
const descs = new Map();

const bump = (store, lang, key, f) => {
  if (!store.has(lang)) store.set(lang, new Map());
  const m = store.get(lang);
  if (!m.has(key)) m.set(key, []);
  m.get(key).push(f);
};

for (const [f, src] of html) {
  const lang = f.startsWith('ko/') ? 'ko' : 'en';

  for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      fail(`${f}: JSON-LD does not parse — ${err.message}`);
    }
  }

  if (!/<link rel="canonical"/.test(src)) fail(`${f}: no canonical link`);
  if (!/<meta name="description"/.test(src)) fail(`${f}: no meta description`);
  if (/(^|[^&])&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)[a-zA-Z]{2,10};/.test(src))
    fail(`${f}: suspicious entity — possible double-escape`);

  // Exactly one <h1>.
  const h1s = [...src.matchAll(/<h1[\s>]/g)].length;
  if (h1s !== 1) fail(`${f}: ${h1s} <h1> elements, expected exactly 1`);

  // <html lang> must match the tree the file lives in.
  const declared = src.match(/<html lang="([^"]+)"/)?.[1];
  if (declared !== lang) fail(`${f}: <html lang="${declared}"> but the file is in the ${lang} tree`);

  // Light is the default: nothing may pin a theme into the served markup.
  if (/<html[^>]*data-theme=/.test(src)) fail(`${f}: <html> ships with data-theme set — light must be the default`);
  if (!/localStorage.getItem\('sk-theme'\)/.test(src)) fail(`${f}: the theme boot script is missing`);
  if (!/data-theme-toggle/.test(src)) fail(`${f}: no theme toggle in the header`);

  // Every image needs alt text, and must come from the image host we declared.
  for (const img of src.matchAll(/<img\b[^>]*>/g)) {
    const tag = img[0];
    const alt = tag.match(/\salt="([^"]*)"/);
    if (!alt) fail(`${f}: <img> with no alt attribute`);
    else if (!alt[1].trim()) fail(`${f}: <img> with empty alt`);
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag))
      fail(`${f}: <img> without width/height — that is a layout-shift risk`);
    const srcAttr = tag.match(/\ssrc="([^"]+)"/)?.[1] || '';
    if (srcAttr && !srcAttr.startsWith('https://images.pexels.com/'))
      fail(`${f}: <img src> points somewhere unexpected: ${srcAttr}`);
  }

  const title = src.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
  const desc = src.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (f !== '404.html') {
    bump(titles, lang, title, f);
    bump(descs, lang, desc, f);
  }
}

for (const [lang, m] of titles) {
  for (const [title, fs] of m) if (fs.length > 1) fail(`duplicate <title> in ${lang}: "${title}" on ${fs.join(', ')}`);
}
for (const [lang, m] of descs) {
  for (const [d, fs] of m) if (fs.length > 1) fail(`duplicate meta description in ${lang}: "${d.slice(0, 50)}…" on ${fs.join(', ')}`);
}

/* ------------------------------------------- internal link resolution */

const resolves = (href) => {
  let p = href.slice(base.length) || '/';
  p = p.split('#')[0].split('?')[0];
  if (p.endsWith('/')) p += 'index.html';
  const rel = p.replace(/^\//, '');
  return files.includes(rel);
};

for (const [f, src] of html) {
  for (const m of src.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(href)) continue;
    if (!href.startsWith(`${base}/`)) {
      fail(`${f}: link "${href}" is missing the ${base} base path`);
      continue;
    }
    if (!resolves(href)) fail(`${f}: link "${href}" does not resolve to a built file`);
  }
}

/* -------------------------------------------- bilingual reciprocity */
// Every page names its counterpart in the other language, that counterpart is
// a file that exists, and it names this page back. This is what stops an
// English recipe going live without its Korean twin, or vice versa.

const abs2rel = (u) => {
  if (!u.startsWith(origin)) return null;
  let p = u.slice(origin.length + base.length) || '/';
  p = p.split('#')[0].split('?')[0];
  if (p.endsWith('/')) p += 'index.html';
  return p.replace(/^\//, '');
};

const altsOf = (src) =>
  Object.fromEntries(
    [...src.matchAll(/<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );

for (const [f, src] of html) {
  if (f === '404.html') continue;
  const alts = altsOf(src);
  for (const lang of ['en', 'ko', 'x-default']) {
    if (!alts[lang]) { fail(`${f}: no hreflang="${lang}" alternate`); continue; }
    const rel = abs2rel(alts[lang]);
    if (!rel) { fail(`${f}: hreflang="${lang}" points off-origin: ${alts[lang]}`); continue; }
    if (!files.includes(rel)) fail(`${f}: hreflang="${lang}" → ${rel}, which was not built`);
  }
  // Reciprocity: the counterpart must point back here.
  const selfLang = f.startsWith('ko/') ? 'ko' : 'en';
  const otherLang = selfLang === 'en' ? 'ko' : 'en';
  const otherRel = alts[otherLang] && abs2rel(alts[otherLang]);
  if (otherRel && html.has(otherRel)) {
    const back = altsOf(html.get(otherRel))[selfLang];
    const backRel = back && abs2rel(back);
    if (backRel !== f) fail(`${f}: its ${otherLang} counterpart ${otherRel} points back at ${backRel}, not ${f}`);
  }
}

const enPages = htmlFiles.filter((f) => !f.startsWith('ko/') && f !== '404.html').length;
const koPages = htmlFiles.filter((f) => f.startsWith('ko/')).length;
if (enPages !== koPages) fail(`${enPages} English pages but ${koPages} Korean pages — the editions have drifted`);

/* ------------------------------------------------------ sanity counts */

const health = JSON.parse(await readFile(path.join(OUT, 'health.json'), 'utf8'));
const recipePages = htmlFiles.filter((f) => /(^|\/)recipes\//.test(f)).length;
if (recipePages !== health.publishedCount * 2)
  fail(`built ${recipePages} recipe pages but expected ${health.publishedCount * 2} (${health.publishedCount} recipes × 2 languages)`);

let itemCount = 0;
for (const f of ['feed.xml', 'ko/feed.xml']) {
  const feed = await readFile(path.join(OUT, f), 'utf8');
  const n = [...feed.matchAll(/<item>/g)].length;
  if (f === 'feed.xml') itemCount = n;
  if (health.publishedCount > 0 && n === 0) fail(`${f} has no <item> entries`);
  if (health.publishedCount > 0 && !/<pubDate>/.test(feed)) fail(`${f} items have no pubDate`);
  if (health.publishedCount > 0 && !/<media:thumbnail/.test(feed)) fail(`${f} items carry no image`);
}

// A recipe with no photo would still render — the hole is silent, so look for it.
for (const [f, src] of html) {
  if (!/(^|\/)recipes\//.test(f)) continue;
  if (!/<figure class="shot">/.test(src)) fail(`${f}: recipe page has no hero photograph`);
  if (!/"image":\s*\[/.test(src)) fail(`${f}: Recipe JSON-LD has no image array — Google needs one for rich results`);
}

/* ------------------------------------------------------------ report */

if (problems.length) {
  console.error(`check failed — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}
console.log(
  `check passed — ${htmlFiles.length} pages (${enPages} en / ${koPages} ko), ` +
    `${health.publishedCount} recipes in both languages, ${itemCount} feed items, ` +
    `hreflang reciprocal, every image has alt text, all internal links resolve`,
);
