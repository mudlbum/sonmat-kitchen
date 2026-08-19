// Photography.
//
// Images are served from the Pexels CDN rather than committed to the repo.
// Two reasons: the build stays zero-dependency (no image pipeline, nothing to
// install on the morning run), and the repo does not grow by ~40 MB of JPEG.
// Pexels' CDN resizes on demand, which is what makes a real srcset possible
// without ever running sharp.
//
// The trade-off, stated plainly: the photos are hotlinked, so they depend on
// Pexels staying up, and a visitor's browser makes a request to Pexels. The
// privacy page says so. If you later want them self-hosted, `srcUrl()` is the
// only function that needs to change.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const CATALOGUE = JSON.parse(await readFile(path.join(ROOT, 'data', 'images.json'), 'utf8'));

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/* ------------------------------------------------------------------ urls */

/**
 * A Pexels CDN URL at an exact pixel size.
 * `fit=crop` guarantees the returned image matches the box we reserved in CSS,
 * which is what keeps CLS at zero — the browser never has to reflow because a
 * photo came back a different shape than the aspect-ratio box predicted.
 */
export function srcUrl(id, w, h) {
  return `${CATALOGUE.cdn}/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}&dpr=1`;
}

export const photoPage = (id) => `https://www.pexels.com/photo/${id}/`;

/* ------------------------------------------------------------- selection */

/** Stable 32-bit hash. Same slug always picks the same fallback photo. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Resolve the photo for a recipe.
 *
 * A recipe added later with no entry in images.json still gets a picture: the
 * category pool is indexed by a hash of the slug, so the choice is deterministic
 * (the same recipe never changes photo between builds) and spread across the
 * pool (consecutive recipes in one category do not all land on the same image).
 *
 * This is the guarantee that matters for the daily publish — a morning run can
 * never put a recipe on the front page with an empty hero.
 */
export function imageFor(recipe) {
  const direct = CATALOGUE.recipes[recipe.slug];
  if (direct) return { ...direct, assigned: true };

  const pool = CATALOGUE.byCategory[recipe.category];
  if (!pool || !pool.length) return null;
  const pick = pool[hash(recipe.slug) % pool.length];
  // A pooled photo is a category image, never a photo of this specific dish.
  return { ...pick, match: 'reference', assigned: false };
}

/* --------------------------------------------------------------- render */

export const RATIOS = { hero: 16 / 9, card: 4 / 3 };
const HERO_WIDTHS = [640, 960, 1280, 1600];
const CARD_WIDTHS = [320, 480, 640];

const heightFor = (w, ratio) => Math.round(w / ratio);

function srcset(id, widths, ratio) {
  return widths.map((w) => `${srcUrl(id, w, heightFor(w, ratio))} ${w}w`).join(', ');
}

/**
 * The hero image on a recipe page.
 *
 * `eager` + `fetchpriority="high"` on the LCP image, lazy everywhere else.
 * width/height are always emitted so the box is reserved before the bytes land.
 */
export function heroImage(img, lang, { eager = false } = {}) {
  if (!img) return '';
  const ratio = RATIOS.hero;
  const w = 1280;
  const h = heightFor(w, ratio);
  return `<img src="${esc(srcUrl(img.id, w, h))}"
  srcset="${esc(srcset(img.id, HERO_WIDTHS, ratio))}"
  sizes="(min-width: 64rem) 60rem, 100vw"
  width="${w}" height="${h}"
  alt="${esc(img.alt[lang])}"
  ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
}

/** The thumbnail on an index or category card. Always lazy — never the LCP. */
export function cardImage(img, lang) {
  if (!img) return '';
  const ratio = RATIOS.card;
  const w = 640;
  const h = heightFor(w, ratio);
  return `<img src="${esc(srcUrl(img.id, w, h))}"
  srcset="${esc(srcset(img.id, CARD_WIDTHS, ratio))}"
  sizes="(min-width: 60rem) 20rem, (min-width: 40rem) 45vw, 92vw"
  width="${w}" height="${h}"
  alt="${esc(img.alt[lang])}"
  loading="lazy" decoding="async">`;
}

/**
 * The credit line under a hero.
 *
 * A "reference" photo says so, in both languages. This is the same rule as the
 * not-yet-kitchen-tested disclosure: the page never implies the photo is a
 * picture of the food this recipe produces when it isn't.
 */
export function credit(img, lang, t) {
  if (!img) return '';
  const who = `<a href="${esc(photoPage(img.id))}" rel="nofollow noopener">${esc(img.credit)}</a>`;
  const line = img.match === 'exact' ? t(lang, 'photoCreditExact', who) : t(lang, 'photoCreditRef', who);
  return `<figcaption class="credit">${line}</figcaption>`;
}

/** Absolute URLs for og:image and Recipe JSON-LD. Google wants several ratios. */
export function schemaImages(img) {
  if (!img) return undefined;
  return [
    srcUrl(img.id, 1200, 1200), // 1x1
    srcUrl(img.id, 1200, 900),  // 4x3
    srcUrl(img.id, 1200, 675),  // 16x9
  ];
}

export const socialImage = () => srcUrl(CATALOGUE.social.id, 1200, 630);
export const socialAlt = (lang) => CATALOGUE.social.alt[lang];

/** Hosts the browser will talk to. Used to emit preconnect hints. */
export const IMAGE_ORIGIN = 'https://images.pexels.com';
