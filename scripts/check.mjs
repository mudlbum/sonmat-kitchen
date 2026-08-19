#!/usr/bin/env node
// Post-build checks. Runs against dist/ before anything is deployed.
//
// The failure this is really guarding against: a recipe title containing "&"
// or "<" that escapes correctly in HTML but breaks feed.xml, leaving a site
// that looks fine to a human and is invisible to every feed reader and crawler.

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

/* ------------------------------------------------- XML well-formedness */

const VOID_OK = new Set(); // our XML has no void elements

function checkXml(name, src) {
  const stack = [];
  let i = 0;
  // Strip the declaration.
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

for (const f of ['sitemap.xml', 'feed.xml']) {
  if (!files.includes(f)) { fail(`missing ${f}`); continue; }
  checkXml(f, await readFile(path.join(OUT, f), 'utf8'));
}

/* --------------------------------------------------------- JSON-LD */

for (const f of htmlFiles) {
  const html = await readFile(path.join(OUT, f), 'utf8');
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      fail(`${f}: JSON-LD does not parse — ${err.message}`);
    }
  }
  if (!/<link rel="canonical"/.test(html)) fail(`${f}: no canonical link`);
  if (!/<meta name="description"/.test(html)) fail(`${f}: no meta description`);
  if (/(^|[^&])&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)[a-zA-Z]{2,10};/.test(html))
    fail(`${f}: suspicious entity — possible double-escape`);
}

/* ------------------------------------------- internal link resolution */

const base = cfg.base.replace(/\/$/, '');
const resolves = (href) => {
  let p = href.slice(base.length) || '/';
  p = p.split('#')[0].split('?')[0];
  if (p.endsWith('/')) p += 'index.html';
  const rel = p.replace(/^\//, '');
  return files.includes(rel);
};

for (const f of htmlFiles) {
  const html = await readFile(path.join(OUT, f), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(href)) continue;
    if (!href.startsWith(`${base}/`)) {
      fail(`${f}: link "${href}" is missing the ${base} base path`);
      continue;
    }
    if (!resolves(href)) fail(`${f}: link "${href}" does not resolve to a built file`);
  }
}

/* ------------------------------------------------------ sanity counts */

const health = JSON.parse(await readFile(path.join(OUT, 'health.json'), 'utf8'));
const recipePages = files.filter((f) => f.startsWith('recipes/') && f.endsWith('index.html')).length;
if (recipePages !== health.publishedCount)
  fail(`built ${recipePages} recipe pages but health.json says ${health.publishedCount}`);

const feed = await readFile(path.join(OUT, 'feed.xml'), 'utf8');
const itemCount = [...feed.matchAll(/<item>/g)].length;
if (health.publishedCount > 0 && itemCount === 0) fail('feed.xml has no <item> entries');
if (!/<pubDate>/.test(feed) && health.publishedCount > 0) fail('feed.xml items have no pubDate');

/* ------------------------------------------------------------ report */

if (problems.length) {
  console.error(`check failed — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  • ${p}`);
  process.exit(1);
}
console.log(
  `check passed — ${htmlFiles.length} pages, ${recipePages} recipes, ${itemCount} feed items, all internal links resolve`,
);
