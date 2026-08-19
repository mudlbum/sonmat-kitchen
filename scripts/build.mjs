#!/usr/bin/env node
// Static site generator for 손맛 키친.
//
// Deliberately zero-dependency: no npm install, no lockfile, no transitive
// supply chain. `node scripts/build.mjs` is the whole build. That matters for a
// site whose entire job is to publish unattended every morning — the smaller
// the build, the fewer ways the morning run can fail.

import { readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { josa } from './lib/korean.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const PUBLISHED_DIR = path.join(ROOT, 'content', 'published');
const QUEUE_DIR = path.join(ROOT, 'data', 'recipes');

const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));

/* ------------------------------------------------------------------ utils */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// XML text/attribute content. Same five entities, but kept separate so the two
// can diverge later without one silently changing the other.
const xesc = esc;

const url = (p = '/') => {
  const clean = `/${String(p).replace(/^\/+/, '')}`;
  return `${cfg.base}${clean}`.replace(/\/{2,}/g, '/');
};
const absUrl = (p = '/') => `${cfg.origin}${url(p)}`;

const KST_OFFSET_MIN = 9 * 60;

/** "YYYY-MM-DD" for the current instant in Asia/Seoul. */
export function todayKst(now = new Date()) {
  const shifted = new Date(now.getTime() + KST_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** RFC-822 date for RSS, pinned to the site's publish time in KST (+0900). */
function rfc822(ymd) {
  const [hh, mm] = String(cfg.publishHourKst || '07:10').split(':').map(Number);
  const [y, m, d] = ymd.split('-').map(Number);
  // Build the UTC instant that corresponds to hh:mm KST on that date.
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0) - KST_OFFSET_MIN * 60_000;
  const at = new Date(utcMs);
  const pad = (n) => String(n).padStart(2, '0');
  // Render the wall-clock time back in KST.
  const k = new Date(utcMs + KST_OFFSET_MIN * 60_000);
  return `${DAYS[at.getUTCDay()]}, ${pad(k.getUTCDate())} ${MONTHS[k.getUTCMonth()]} ${k.getUTCFullYear()} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}:00 +0900`;
}

/** ISO-8601 instant for datePublished / <lastmod>. */
function isoAt(ymd) {
  const [hh, mm] = String(cfg.publishHourKst || '07:10').split(':').map(Number);
  const [y, m, d] = ymd.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00+09:00`;
}

function koreanDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** ISO-8601 duration for schema.org, e.g. 25 -> "PT25M". */
const iso8601Duration = (min) => {
  const n = Number(min) || 0;
  if (n <= 0) return undefined;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}` || undefined;
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function readJsonDir(dir) {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const out = [];
  for (const name of names) {
    const raw = await readFile(path.join(dir, name), 'utf8');
    try {
      out.push({ ...JSON.parse(raw), _file: name });
    } catch (err) {
      throw new Error(`${path.join(dir, name)} is not valid JSON: ${err.message}`);
    }
  }
  return out;
}

async function emit(relPath, contents) {
  const dest = path.join(OUT, relPath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, contents);
}

/* -------------------------------------------------------------- validation */

const REQUIRED = ['slug', 'title', 'summary', 'category', 'servings', 'ingredients', 'steps'];

function validate(r, where) {
  const missing = REQUIRED.filter((k) => r[k] === undefined || r[k] === null || r[k] === '');
  if (missing.length) throw new Error(`${where}/${r._file}: missing ${missing.join(', ')}`);
  if (!Array.isArray(r.ingredients) || !r.ingredients.length)
    throw new Error(`${where}/${r._file}: ingredients must be a non-empty array`);
  if (!Array.isArray(r.steps) || !r.steps.length)
    throw new Error(`${where}/${r._file}: steps must be a non-empty array`);
  if (!/^[a-z0-9-]+$/.test(r.slug)) throw new Error(`${where}/${r._file}: slug "${r.slug}" must be lowercase a-z0-9-`);
}

/* ---------------------------------------------------------------- styling */

const CSS = `
:root{
  --ink:#241c17; --ink-soft:#5b4c42; --ink-faint:#8a7768;
  --paper:#fbf7f1; --card:#fffdfa; --line:#e6dbcc;
  --accent:#b3452b; --accent-soft:#f3e2d9; --gochu:#c8552f;
  --measure:37rem;
  --serif:"Nanum Myeongjo",'Apple SD Gothic Neo',"Noto Serif KR",serif;
  --sans:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,"Noto Sans KR",sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:var(--sans); font-size:17px; line-height:1.75;
  word-break:keep-all; overflow-wrap:break-word;
}
a{color:var(--accent); text-underline-offset:.18em; text-decoration-thickness:.06em}
a:hover{color:#8d3521}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:64rem;margin:0 auto;padding:0 1.25rem}
.skip{position:absolute;left:-9999px}
.skip:focus{left:1rem;top:1rem;background:var(--card);padding:.5rem .9rem;border-radius:.4rem;z-index:20}

header.site{border-bottom:1px solid var(--line);background:var(--card)}
header.site .wrap{display:flex;align-items:baseline;gap:1.5rem;flex-wrap:wrap;padding-block:1.15rem}
.brand{font-family:var(--serif);font-size:1.45rem;font-weight:700;color:var(--ink);text-decoration:none;letter-spacing:-.01em}
.brand span{display:block;font-family:var(--sans);font-size:.7rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);margin-top:.15rem}
nav.site{margin-left:auto;display:flex;gap:1.15rem;flex-wrap:wrap;font-size:.9rem}
nav.site a{color:var(--ink-soft);text-decoration:none}
nav.site a:hover{color:var(--accent)}

main{padding-block:2.5rem 4rem}
.lede{max-width:var(--measure);color:var(--ink-soft);margin:0 0 2.5rem}

h1,h2,h3{font-family:var(--serif);line-height:1.3;letter-spacing:-.015em;color:var(--ink)}
h1{font-size:clamp(1.8rem,4.5vw,2.6rem);margin:0 0 .5rem}
h2{font-size:1.35rem;margin:2.5rem 0 .9rem}
h3{font-size:1.05rem;margin:1.6rem 0 .5rem}

.hero{background:var(--card);border:1px solid var(--line);border-radius:.9rem;padding:1.75rem;margin-bottom:2.5rem}
.hero .kicker{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 .6rem}
.hero h2{font-size:clamp(1.5rem,3.6vw,2.1rem);margin:0 0 .6rem}
.hero h2 a{color:inherit;text-decoration:none}
.hero h2 a:hover{color:var(--accent)}
.hero p{margin:0 0 1rem;color:var(--ink-soft);max-width:var(--measure)}

.meta{display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0;margin:0;font-size:.82rem;color:var(--ink-soft)}
.meta li{background:var(--accent-soft);border-radius:999px;padding:.2rem .7rem}

.cards{list-style:none;padding:0;margin:0;display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:1.15rem}
.card h3{margin:0 0 .35rem;font-size:1.12rem}
.card h3 a{color:inherit;text-decoration:none}
.card h3 a:hover{color:var(--accent)}
.card p{margin:0 0 .8rem;font-size:.92rem;color:var(--ink-soft)}
.card time{font-size:.78rem;color:var(--ink-faint);font-variant-numeric:tabular-nums}

article.recipe{max-width:var(--measure)}
article.recipe .summary{font-size:1.05rem;color:var(--ink-soft);margin:0 0 1.25rem}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr));gap:.75rem;margin:1.5rem 0 2rem;padding:1rem 1.15rem;background:var(--card);border:1px solid var(--line);border-radius:.7rem}
.facts div{font-size:.85rem}
.facts dt{color:var(--ink-faint);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.15rem}
.facts dd{margin:0;font-weight:600}

.ing{margin:0 0 1.5rem}
.ing h3{margin-top:1.2rem}
.ing ul{list-style:none;padding:0;margin:0}
.ing li{display:flex;justify-content:space-between;gap:1rem;padding:.45rem 0;border-bottom:1px dotted var(--line)}
.ing li span:last-child{color:var(--ink-soft);white-space:nowrap;font-variant-numeric:tabular-nums}

ol.steps{counter-reset:step;list-style:none;padding:0;margin:0}
ol.steps li{counter-increment:step;position:relative;padding:0 0 1.15rem 2.6rem;margin-bottom:.15rem}
ol.steps li::before{
  content:counter(step);position:absolute;left:0;top:.15rem;
  width:1.85rem;height:1.85rem;border-radius:50%;
  background:var(--accent);color:#fff;font-size:.85rem;font-weight:700;
  display:grid;place-items:center;font-family:var(--sans)
}
.tips{background:var(--accent-soft);border-radius:.7rem;padding:1.15rem 1.35rem;margin:2rem 0}
.tips h3{margin:0 0 .5rem}
.tips ul{margin:0;padding-left:1.1rem}
.tips li{margin-bottom:.4rem}
.tips li:last-child{margin-bottom:0}

.disclosure{border-left:3px solid var(--gochu);background:var(--card);padding:.9rem 1.1rem;margin:2.5rem 0 0;font-size:.86rem;color:var(--ink-soft);border-radius:0 .5rem .5rem 0}
.disclosure strong{color:var(--ink)}

.tags{display:flex;flex-wrap:wrap;gap:.4rem;list-style:none;padding:0;margin:1.75rem 0 0}
.tags a{font-size:.8rem;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:.25rem .75rem;text-decoration:none;color:var(--ink-soft)}
.tags a:hover{border-color:var(--accent);color:var(--accent)}

.prose{max-width:var(--measure)}
.prose p{margin:0 0 1rem}

.adslot{margin:2.5rem 0;min-height:0}

footer.site{border-top:1px solid var(--line);background:var(--card);padding-block:2rem;font-size:.86rem;color:var(--ink-soft)}
footer.site .wrap{display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center}
footer.site nav{display:flex;gap:1.1rem;flex-wrap:wrap;margin-left:auto}
footer.site a{color:var(--ink-soft)}

@media (max-width:34rem){
  body{font-size:16px}
  .hero{padding:1.35rem}
}
@media (prefers-color-scheme:dark){
  :root{
    --ink:#f0e7dd; --ink-soft:#c3b3a4; --ink-faint:#948273;
    --paper:#1a1512; --card:#221c18; --line:#3a3029;
    --accent:#e88a6b; --accent-soft:#33251f;
  }
  a:hover{color:#f4a488}
  ol.steps li::before{color:#1a1512}
}
@media print{
  header.site nav,footer.site nav,.adslot{display:none}
  body{background:#fff;color:#000;font-size:12pt}
}
`.trim();

/* --------------------------------------------------------------- layout */

function layout({ title, description, canonicalPath, body, jsonld, extraHead = '' }) {
  const fullTitle = title === cfg.title ? `${cfg.title} — ${cfg.tagline}` : `${title} — ${cfg.title}`;
  const canonical = absUrl(canonicalPath);
  return `<!doctype html>
<html lang="${cfg.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${canonicalPath.startsWith('/recipes/') ? 'article' : 'website'}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(cfg.title)}">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.title)}" href="${esc(absUrl('/feed.xml'))}">
<link rel="stylesheet" href="${esc(url('/assets/site.css'))}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
${extraHead}
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="${esc(url('/'))}">${esc(cfg.title)}<span>${esc(cfg.titleEn)}</span></a>
    <nav class="site" aria-label="주요 메뉴">
      <a href="${esc(url('/'))}">전체 레시피</a>
      <a href="${esc(url('/categories/'))}">분류</a>
      <a href="${esc(url('/about/'))}">소개</a>
      <a href="${esc(absUrl('/feed.xml'))}">RSS</a>
    </nav>
  </div>
</header>
<main id="main"><div class="wrap">
${body}
</div></main>
<footer class="site">
  <div class="wrap">
    <p style="margin:0">© ${new Date().getUTCFullYear()} ${esc(cfg.title)}</p>
    <nav aria-label="푸터 메뉴">
      <a href="${esc(url('/about/'))}">소개</a>
      <a href="${esc(url('/editorial/'))}">편집 방침</a>
      <a href="${esc(url('/privacy/'))}">개인정보 처리방침</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

/* --------------------------------------------------------------- pages */

const timeLabel = (r) => {
  const total = (Number(r.prepMinutes) || 0) + (Number(r.cookMinutes) || 0);
  return total ? `${total}분` : null;
};

function recipeCard(r) {
  return `<li class="card">
  <h3><a href="${esc(url(`/recipes/${r.slug}/`))}">${esc(r.title)}</a></h3>
  <p>${esc(r.summary)}</p>
  <time datetime="${esc(r.publishedAt)}">${esc(koreanDate(r.publishedAt))}</time>
</li>`;
}

function renderIndex(recipes) {
  const [latest, ...rest] = recipes;
  const hero = latest
    ? `<section class="hero">
  <p class="kicker">오늘의 레시피</p>
  <h2><a href="${esc(url(`/recipes/${latest.slug}/`))}">${esc(latest.title)}</a></h2>
  <p>${esc(latest.summary)}</p>
  <ul class="meta">
    <li>${esc(latest.category)}</li>
    ${timeLabel(latest) ? `<li>${esc(timeLabel(latest))}</li>` : ''}
    <li>${esc(latest.servings)}인분</li>
    <li><time datetime="${esc(latest.publishedAt)}">${esc(koreanDate(latest.publishedAt))}</time></li>
  </ul>
</section>`
    : `<section class="hero"><p class="kicker">준비 중</p><h2>첫 레시피를 기다리는 중입니다</h2>
<p>매일 아침 ${esc(cfg.publishHourKst)}에 한 가지씩 올라갑니다.</p></section>`;

  const body = `<h1>${esc(cfg.title)}</h1>
<p class="lede">${esc(cfg.description)}</p>
${hero}
${rest.length ? `<h2>지난 레시피</h2>\n<ul class="cards">\n${rest.map(recipeCard).join('\n')}\n</ul>` : ''}
<div class="adslot" data-slot="index-footer"></div>`;

  return layout({
    title: cfg.title,
    description: cfg.description,
    canonicalPath: '/',
    body,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: cfg.title,
      alternateName: cfg.titleEn,
      description: cfg.description,
      url: absUrl('/'),
      inLanguage: cfg.locale,
    },
  });
}

function renderRecipe(r, all) {
  const idx = all.findIndex((x) => x.slug === r.slug);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const groups = r.ingredients.map((g) => {
    const items = g.items
      .map((i) => `<li><span>${esc(i.name)}</span><span>${esc(i.amount)}</span></li>`)
      .join('\n');
    return `${g.group ? `<h3>${esc(g.group)}</h3>` : ''}\n<ul>\n${items}\n</ul>`;
  });

  const facts = [
    ['분류', r.category],
    ['분량', `${r.servings}인분`],
    r.prepMinutes ? ['준비', `${r.prepMinutes}분`] : null,
    r.cookMinutes ? ['조리', `${r.cookMinutes}분`] : null,
    r.difficulty ? ['난이도', r.difficulty] : null,
  ].filter(Boolean);

  const body = `<article class="recipe">
<h1>${esc(r.title)}</h1>
<p class="summary">${esc(r.summary)}</p>
<p style="font-size:.85rem;color:var(--ink-faint);margin:0 0 1rem">
  <time datetime="${esc(r.publishedAt)}">${esc(koreanDate(r.publishedAt))}</time> 공개
</p>

<dl class="facts">
${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
</dl>

${r.intro ? `<div class="prose">${r.intro.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('\n')}</div>` : ''}

<h2>재료</h2>
<div class="ing">
${groups.join('\n')}
</div>

<h2>만드는 법</h2>
<ol class="steps">
${r.steps.map((s) => `<li>${esc(s)}</li>`).join('\n')}
</ol>

${
  Array.isArray(r.tips) && r.tips.length
    ? `<div class="tips">
<h3>알아두면 좋은 것</h3>
<ul>
${r.tips.map((t) => `<li>${esc(t)}</li>`).join('\n')}
</ul>
</div>`
    : ''
}

${
  Array.isArray(r.tags) && r.tags.length
    ? `<ul class="tags">
${r.tags.map((t) => `<li><a href="${esc(url(`/categories/${slugify(r.category)}/`))}">#${esc(t)}</a></li>`).join('\n')}
</ul>`
    : ''
}

<div class="disclosure">
  <strong>이 레시피에 대해.</strong> ${esc(cfg.title)}의 레시피는 표준적인 한식 조리법을 바탕으로
  작성했고, 아직 편집자가 직접 만들어 검증하지는 않았습니다. 검증을 마친 레시피에는 이 자리에
  검증 날짜가 표시됩니다. 불·기름·생고기를 다루는 단계는 본인의 판단을 우선해 주세요.
</div>

<nav class="tags" aria-label="다른 레시피" style="margin-top:2rem">
${older ? `<li><a href="${esc(url(`/recipes/${older.slug}/`))}">← ${esc(older.title)}</a></li>` : ''}
${newer ? `<li><a href="${esc(url(`/recipes/${newer.slug}/`))}">${esc(newer.title)} →</a></li>` : ''}
</nav>

<div class="adslot" data-slot="recipe-footer"></div>
</article>`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.title,
    description: r.summary,
    author: { '@type': 'Organization', name: cfg.title },
    datePublished: isoAt(r.publishedAt),
    recipeCategory: r.category,
    recipeCuisine: '한식',
    recipeYield: `${r.servings}인분`,
    inLanguage: cfg.locale,
    url: absUrl(`/recipes/${r.slug}/`),
    prepTime: iso8601Duration(r.prepMinutes),
    cookTime: iso8601Duration(r.cookMinutes),
    totalTime: iso8601Duration((Number(r.prepMinutes) || 0) + (Number(r.cookMinutes) || 0)),
    recipeIngredient: r.ingredients.flatMap((g) => g.items.map((i) => `${i.name} ${i.amount}`.trim())),
    recipeInstructions: r.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
    keywords: Array.isArray(r.tags) ? r.tags.join(', ') : undefined,
  };
  // Drop undefined keys so the JSON-LD stays clean.
  for (const k of Object.keys(jsonld)) if (jsonld[k] === undefined) delete jsonld[k];

  return layout({
    title: r.title,
    description: r.summary,
    canonicalPath: `/recipes/${r.slug}/`,
    body,
    jsonld,
  });
}

function renderCategoryIndex(byCategory) {
  const entries = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);
  const body = `<h1>분류</h1>
<p class="lede">지금까지 올라온 레시피를 종류별로 모았습니다.</p>
<ul class="cards">
${entries
  .map(
    ([cat, list]) => `<li class="card">
  <h3><a href="${esc(url(`/categories/${slugify(cat)}/`))}">${esc(cat)}</a></h3>
  <p>${list.length}가지 레시피</p>
</li>`,
  )
  .join('\n')}
</ul>`;
  return layout({
    title: '분류',
    description: `${cfg.title}의 레시피를 종류별로 모아 봅니다.`,
    canonicalPath: '/categories/',
    body,
  });
}

function renderCategory(cat, list) {
  // `josa` keeps this from rendering "찌개이" / "반찬가".
  const desc = `${cat}${josa(cat, '이')} ${list.length}가지 올라와 있습니다.`;
  const body = `<h1>${esc(cat)}</h1>
<p class="lede">${esc(desc)}</p>
<ul class="cards">
${list.map(recipeCard).join('\n')}
</ul>`;
  return layout({
    title: cat,
    description: `${cfg.title}의 ${cat} 레시피 모음. ${desc}`,
    canonicalPath: `/categories/${slugify(cat)}/`,
    body,
  });
}

function renderStatic(title, canonicalPath, description, html) {
  return layout({
    title,
    description,
    canonicalPath,
    body: `<h1>${esc(title)}</h1>\n<div class="prose">${html}</div>`,
  });
}

/* ---------------------------------------------------------------- feeds */

function renderSitemap(recipes, categories) {
  const urls = [
    { loc: absUrl('/'), lastmod: recipes[0] ? isoAt(recipes[0].publishedAt) : undefined, priority: '1.0' },
    { loc: absUrl('/categories/'), priority: '0.5' },
    { loc: absUrl('/about/'), priority: '0.3' },
    { loc: absUrl('/editorial/'), priority: '0.3' },
    { loc: absUrl('/privacy/'), priority: '0.2' },
    ...categories.map((c) => ({ loc: absUrl(`/categories/${slugify(c)}/`), priority: '0.5' })),
    ...recipes.map((r) => ({
      loc: absUrl(`/recipes/${r.slug}/`),
      lastmod: isoAt(r.publishedAt),
      priority: '0.8',
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${xesc(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${xesc(u.lastmod)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
}

function renderFeed(recipes) {
  const items = recipes.slice(0, 30);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xesc(cfg.title)}</title>
  <link>${xesc(absUrl('/'))}</link>
  <description>${xesc(cfg.description)}</description>
  <language>ko</language>
  <atom:link href="${xesc(absUrl('/feed.xml'))}" rel="self" type="application/rss+xml"/>
${items[0] ? `  <lastBuildDate>${xesc(rfc822(items[0].publishedAt))}</lastBuildDate>` : ''}
${items
  .map(
    (r) => `  <item>
    <title>${xesc(r.title)}</title>
    <link>${xesc(absUrl(`/recipes/${r.slug}/`))}</link>
    <guid isPermaLink="true">${xesc(absUrl(`/recipes/${r.slug}/`))}</guid>
    <pubDate>${xesc(rfc822(r.publishedAt))}</pubDate>
    <category>${xesc(r.category)}</category>
    <description>${xesc(r.summary)}</description>
  </item>`,
  )
  .join('\n')}
</channel>
</rss>
`;
}

/* ----------------------------------------------------------------- main */

async function main() {
  const published = await readJsonDir(PUBLISHED_DIR);
  const queued = await readJsonDir(QUEUE_DIR);

  published.forEach((r) => validate(r, 'content/published'));
  queued.forEach((r) => validate(r, 'data/recipes'));

  for (const r of published) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.publishedAt || '')) {
      throw new Error(`content/published/${r._file}: publishedAt must be YYYY-MM-DD, got ${r.publishedAt}`);
    }
  }

  const dupes = published.map((r) => r.slug).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupes.length) throw new Error(`duplicate slugs published: ${[...new Set(dupes)].join(', ')}`);

  // Newest first. Same-day publishes fall back to filename order (reversed, so
  // the later file in a batch reads as the newer post).
  const recipes = [...published].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || b._file.localeCompare(a._file),
  );

  const byCategory = new Map();
  for (const r of recipes) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category).push(r);
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  await emit('.nojekyll', '');
  await emit('assets/site.css', CSS);
  await emit('index.html', renderIndex(recipes));

  for (const r of recipes) await emit(`recipes/${r.slug}/index.html`, renderRecipe(r, recipes));

  await emit('categories/index.html', renderCategoryIndex(byCategory));
  for (const [cat, list] of byCategory) await emit(`categories/${slugify(cat)}/index.html`, renderCategory(cat, list));

  const aboutHtml = `
<p>${esc(cfg.title)}는 집 부엌에서 만들 수 있는 한식 레시피를 매일 아침 ${esc(cfg.publishHourKst)}에 한 가지씩 올리는 곳입니다.</p>
<p>특별한 장비나 구하기 어려운 재료는 쓰지 않습니다. 대형마트나 동네 시장에서 살 수 있는 재료, 일반 가정용 가스레인지, 그리고 냄비 하나로 끝나는 것을 기준으로 삼습니다.</p>
<p>분량은 계량컵과 계량스푼 기준입니다. 1큰술은 15mL, 1작은술은 5mL, 1컵은 200mL로 씁니다. 간은 지역과 집마다 다르니, 처음에는 적힌 양의 8할만 넣고 마지막에 맞추시길 권합니다.</p>
<h2>레시피를 어떻게 쓰는가</h2>
<p>레시피는 표준적인 한식 조리법을 바탕으로 작성합니다. 각 레시피 하단에는 편집자가 직접 만들어 검증했는지 여부를 표시합니다. 검증하지 않은 레시피를 검증한 것처럼 표시하지 않습니다.</p>
<p>자세한 내용은 <a href="${esc(url('/editorial/'))}">편집 방침</a>을 봐 주세요.</p>`;

  const editorialHtml = `
<p>이 페이지는 ${esc(cfg.title)}가 무엇을 하고 무엇을 하지 않는지 적어 둔 곳입니다.</p>
<h2>발행</h2>
<p>레시피는 매일 아침 ${esc(cfg.publishHourKst)}(한국 시간)에 자동으로 한 가지가 공개됩니다. 대기열에 미리 작성해 둔 레시피에서 순서대로 나갑니다. 대기열이 ${cfg.queueWarnThreshold}개 미만으로 줄면 저장소에 이슈가 자동으로 열립니다.</p>
<h2>검증 표시</h2>
<p>레시피에는 세 가지 상태 중 하나가 표시됩니다.</p>
<ul>
<li><strong>미검증</strong> — 표준 조리법을 바탕으로 작성했으나 아직 직접 만들어 보지 않았습니다. 기본 상태입니다.</li>
<li><strong>검증됨</strong> — 편집자가 적힌 그대로 만들어 결과를 확인했습니다. 날짜가 함께 표시됩니다.</li>
<li><strong>수정됨</strong> — 만들어 본 뒤 분량이나 순서를 고쳤습니다. 무엇을 고쳤는지 함께 적습니다.</li>
</ul>
<p>이 표시는 사람이 손으로 바꿉니다. 자동으로 "검증됨"이 되는 경로는 없습니다.</p>
<h2>고치기</h2>
<p>레시피가 틀렸거나 재현되지 않으면 <a href="https://github.com/${esc(cfg.repo)}/issues">저장소 이슈</a>로 알려 주세요. 고친 레시피에는 무엇을 언제 고쳤는지 남깁니다.</p>
<h2>광고</h2>
<p>현재 이 사이트에는 광고가 없습니다. 넣게 되면 이 문단을 먼저 고치고, 광고와 본문을 시각적으로 구분해 표시합니다.</p>`;

  const privacyHtml = `
<p>${esc(cfg.title)}는 GitHub Pages로 운영되는 정적 사이트입니다.</p>
<h2>수집하는 정보</h2>
<p>이 사이트는 방문자에게서 직접 정보를 수집하지 않습니다. 회원가입, 로그인, 댓글, 문의 양식이 없고 쿠키를 심지 않습니다.</p>
<h2>호스팅 사업자</h2>
<p>사이트는 GitHub, Inc.의 GitHub Pages에서 제공됩니다. GitHub은 보안 및 서비스 유지 목적으로 방문자의 IP 주소를 포함한 접속 기록을 남길 수 있습니다. 이 기록은 GitHub이 보관하며 운영자는 접근할 수 없습니다. 자세한 내용은 <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement" rel="nofollow">GitHub 개인정보 보호정책</a>을 참고하세요.</p>
<h2>분석 도구와 광고</h2>
<p>현재 분석 도구와 광고 스크립트를 쓰지 않습니다. 도입하면 이 페이지를 먼저 고치고, 어떤 사업자의 어떤 도구인지 밝힙니다.</p>
<h2>외부 링크</h2>
<p>본문에 외부 사이트 링크가 있을 수 있습니다. 링크된 사이트의 개인정보 처리에 대해서는 책임지지 않습니다.</p>
<h2>문의</h2>
<p><a href="https://github.com/${esc(cfg.repo)}/issues">저장소 이슈</a>로 연락할 수 있습니다.</p>`;

  await emit(
    'about/index.html',
    renderStatic('소개', '/about/', `${cfg.title}는 어떤 곳이고 레시피를 어떤 기준으로 쓰는지 적어 둔 페이지입니다.`, aboutHtml),
  );
  await emit(
    'editorial/index.html',
    renderStatic('편집 방침', '/editorial/', `${cfg.title}의 발행 주기, 검증 표시, 정정 방침.`, editorialHtml),
  );
  await emit(
    'privacy/index.html',
    renderStatic('개인정보 처리방침', '/privacy/', `${cfg.title}의 개인정보 처리방침.`, privacyHtml),
  );

  await emit(
    '404.html',
    layout({
      title: '페이지를 찾을 수 없습니다',
      description: '요청하신 주소에 해당하는 페이지가 없습니다.',
      canonicalPath: '/',
      body: `<h1>페이지를 찾을 수 없습니다</h1>
<div class="prose"><p>주소가 바뀌었거나 아직 올라오지 않은 레시피일 수 있습니다.
<a href="${esc(url('/'))}">전체 레시피</a>에서 찾아보세요.</p></div>`,
    }),
  );

  const categories = [...byCategory.keys()];
  await emit('sitemap.xml', renderSitemap(recipes, categories));
  await emit('feed.xml', renderFeed(recipes));
  await emit(
    'robots.txt',
    `User-agent: *\nAllow: /\n\n# Naver\nUser-agent: Yeti\nAllow: /\n\nSitemap: ${absUrl('/sitemap.xml')}\n`,
  );

  // Machine-readable status, for the daily health check to read in one request
  // instead of scraping the feed.
  await emit(
    'health.json',
    `${JSON.stringify(
      {
        site: cfg.title,
        builtAt: new Date().toISOString(),
        buildDateKst: todayKst(),
        publishedCount: recipes.length,
        queueRemaining: queued.length,
        queueWarnThreshold: cfg.queueWarnThreshold,
        queueHealthy: queued.length >= cfg.queueWarnThreshold,
        latest: recipes[0]
          ? { slug: recipes[0].slug, title: recipes[0].title, publishedAt: recipes[0].publishedAt }
          : null,
        daysSinceLatest: recipes[0]
          ? Math.floor((Date.parse(`${todayKst()}T00:00:00Z`) - Date.parse(`${recipes[0].publishedAt}T00:00:00Z`)) / 86_400_000)
          : null,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `built ${recipes.length} recipe page(s), ${categories.length} categor(y/ies) → dist/\n` +
      `queue: ${queued.length} remaining${queued.length < cfg.queueWarnThreshold ? '  ⚠ below threshold' : ''}`,
  );
}

main().catch((err) => {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
});
