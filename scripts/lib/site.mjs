// Foundations: config, escaping, locale-aware URLs, dates, and the loader that
// turns the JSON on disk into the per-language view models every page renders
// from.
//
// The rule this file exists to enforce: nothing above it ever sees a raw recipe
// record. Pages receive a `localised` view — already resolved to one language —
// so a page function cannot accidentally render a Korean string into the
// English tree. That is what keeps the two editions structurally identical.

import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LANG, categoryName, categorySlug, formatDate, t } from './i18n.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = path.join(ROOT, 'dist');
export const PUBLISHED_DIR = path.join(ROOT, 'content', 'published');
export const QUEUE_DIR = path.join(ROOT, 'data', 'recipes');

export const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));

/* ------------------------------------------------------------------ escaping */

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// XML text/attribute content. Same five entities, kept separate so the two can
// diverge later without one silently changing the other.
export const xesc = esc;

/* ---------------------------------------------------------------------- urls */

/**
 * Site-relative path for a page in a given language.
 * English is the site root; every other language gets a prefix segment.
 */
export function langPath(lang, p = '/') {
  const clean = `/${String(p).replace(/^\/+/, '')}`;
  const prefixed = lang === DEFAULT_LANG ? clean : `/${lang}${clean}`;
  return prefixed.replace(/\/{2,}/g, '/');
}

/** Absolute-from-host URL including the base path, e.g. /sonmat-kitchen/ko/. */
export function url(lang, p = '/') {
  return `${cfg.base}${langPath(lang, p)}`.replace(/\/{2,}/g, '/');
}

/** Fully-qualified URL, for canonicals, hreflang, feeds and JSON-LD. */
export function absUrl(lang, p = '/') {
  return `${cfg.origin}${url(lang, p)}`;
}

/** Where a page's HTML lands inside dist/. */
export function outPath(lang, p = '/') {
  const rel = langPath(lang, p).replace(/^\//, '');
  return rel.endsWith('/') || rel === '' ? `${rel}index.html` : rel;
}

/* --------------------------------------------------------------------- dates */

const KST_OFFSET_MIN = 9 * 60;

/** "YYYY-MM-DD" for the current instant in Asia/Seoul. */
export function todayKst(now = new Date()) {
  const shifted = new Date(now.getTime() + KST_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** RFC-822 date for RSS, pinned to the site's publish time in KST (+0900). */
export function rfc822(ymd) {
  const [hh, mm] = String(cfg.publishHourKst || '07:10').split(':').map(Number);
  const [y, m, d] = ymd.split('-').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0) - KST_OFFSET_MIN * 60_000;
  const at = new Date(utcMs);
  const pad = (n) => String(n).padStart(2, '0');
  const k = new Date(utcMs + KST_OFFSET_MIN * 60_000);
  return `${DAYS[at.getUTCDay()]}, ${pad(k.getUTCDate())} ${MONTHS[k.getUTCMonth()]} ${k.getUTCFullYear()} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}:00 +0900`;
}

/** ISO-8601 instant for datePublished / <lastmod>. */
export function isoAt(ymd) {
  const [hh, mm] = String(cfg.publishHourKst || '07:10').split(':').map(Number);
  const [y, m, d] = ymd.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00+09:00`;
}

/** ISO-8601 duration for schema.org, e.g. 25 -> "PT25M". */
export function iso8601Duration(min) {
  const n = Number(min) || 0;
  if (n <= 0) return undefined;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
}

/* ------------------------------------------------------------------ loading */

export async function readJsonDir(dir) {
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

export async function emit(relPath, contents) {
  const dest = path.join(OUT, relPath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, contents);
}

export const EN_DIR = path.join(ROOT, 'data', 'en');

/**
 * Attach each recipe's English edition.
 *
 * The sidecar in data/en/<slug>.json is the source of truth and wins over any
 * inline "en" block, which matches what publish.mjs does when it promotes a
 * recipe. Early published files carry an inline copy and no sidecar had been
 * split out yet; later ones carry only the sidecar. Reading both here means the
 * build does not care which era a file comes from.
 */
export async function attachEnglish(recipes) {
  for (const r of recipes) {
    const sidecar = path.join(EN_DIR, `${r.slug}.json`);
    if (existsSync(sidecar)) {
      r.en = JSON.parse(await readFile(sidecar, 'utf8'));
    }
  }
  return recipes;
}

/* --------------------------------------------------------------- validation */

const REQUIRED = ['slug', 'title', 'summary', 'category', 'servings', 'ingredients', 'steps'];
const REQUIRED_EN = ['title', 'summary', 'ingredients', 'steps'];

export function validate(r, where) {
  const missing = REQUIRED.filter((k) => r[k] === undefined || r[k] === null || r[k] === '');
  if (missing.length) throw new Error(`${where}/${r._file}: missing ${missing.join(', ')}`);
  if (!Array.isArray(r.ingredients) || !r.ingredients.length)
    throw new Error(`${where}/${r._file}: ingredients must be a non-empty array`);
  if (!Array.isArray(r.steps) || !r.steps.length)
    throw new Error(`${where}/${r._file}: steps must be a non-empty array`);
  if (!/^[a-z0-9-]+$/.test(r.slug)) throw new Error(`${where}/${r._file}: slug "${r.slug}" must be lowercase a-z0-9-`);
}

/**
 * A published recipe must carry its English edition, and the two editions must
 * line up step for step. Without this the build would happily emit an English
 * tree with holes in it, which check.mjs would then report as a hreflang
 * failure — ten steps removed from the actual cause.
 */
export function validateBilingual(r, where) {
  const en = r.en;
  if (!en) throw new Error(`${where}/${r._file}: no "en" edition — add data/en/${r.slug}.json before publishing`);
  const missing = REQUIRED_EN.filter((k) => en[k] === undefined || en[k] === null || en[k] === '');
  if (missing.length) throw new Error(`${where}/${r._file}: "en" edition missing ${missing.join(', ')}`);
  if (en.steps.length !== r.steps.length)
    throw new Error(`${where}/${r._file}: ${r.steps.length} Korean steps but ${en.steps.length} English — the editions have drifted`);
  if (en.ingredients.length !== r.ingredients.length)
    throw new Error(`${where}/${r._file}: ${r.ingredients.length} Korean ingredient groups but ${en.ingredients.length} English`);
}

/* ------------------------------------------------------------- view models */

/**
 * Collapse a recipe record down to one language.
 *
 * Everything a page renders comes from here, so a page never has to ask "is
 * this the Korean field or the English one?". `categoryKo` is carried through
 * untouched because it is the key the image catalogue and the category grouping
 * are indexed by — display names come from i18n.
 */
export function localised(r, lang) {
  const en = r.en || {};
  const pick = (koVal, enVal) => (lang === 'ko' ? koVal : enVal ?? koVal);

  return {
    slug: r.slug,
    lang,
    categoryKo: r.category,
    category: categoryName(r.category, lang),
    categorySlug: categorySlug(r.category, lang),
    title: pick(r.title, en.title),
    summary: pick(r.summary, en.summary),
    intro: pick(r.intro, en.intro),
    difficulty: pick(r.difficulty, en.difficulty),
    tags: pick(r.tags, en.tags) || [],
    ingredients: pick(r.ingredients, en.ingredients),
    steps: pick(r.steps, en.steps),
    tips: pick(r.tips, en.tips) || [],
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    publishedAt: r.publishedAt,
    dateLabel: formatDate(r.publishedAt, lang),
    path: `/recipes/${r.slug}/`,
  };
}

/** Total time badge, or null when neither prep nor cook is recorded. */
export function timeLabel(r, lang) {
  const total = (Number(r.prepMinutes) || 0) + (Number(r.cookMinutes) || 0);
  return total ? t(lang, 'minutes', total) : null;
}
