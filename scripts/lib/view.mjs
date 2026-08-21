// Presentational fragments — the pieces of a page below <main>.
//
// Every function here takes an already-localised recipe (see site.mjs) plus a
// language, and returns a string. None of them read config, touch the file
// system, or decide which language they are in. That makes them the layer where
// the EN and KO trees are guaranteed to have the same shape: same elements,
// same classes, same order, different words.

import { esc, url, timeLabel } from './site.mjs';
import { t } from './i18n.mjs';
import { heroImage, cardImage, credit } from './images.mjs';

/* ------------------------------------------------------------- photography */

/**
 * The hero photograph and its credit line.
 *
 * check.mjs requires `figure.shot` on every recipe page: a recipe that lost its
 * photo still renders perfectly well, so the hole is invisible to a human
 * reading the page and has to be caught structurally.
 */
export function shot(img, lang, { eager = false } = {}) {
  if (!img) return '';
  return `<figure class="shot">
${heroImage(img, lang, { eager })}
${credit(img, lang, t)}
</figure>`;
}

/* -------------------------------------------------------------------- cards */

export function recipeCard(r, img) {
  const { lang } = r;
  return `<li class="card">
${img ? `<a class="thumb" href="${esc(url(lang, r.path))}" tabindex="-1" aria-hidden="true">${cardImage(img, lang)}</a>` : ''}
  <h3><a href="${esc(url(lang, r.path))}">${esc(r.title)}</a></h3>
  <p>${esc(r.summary)}</p>
  <time datetime="${esc(r.publishedAt)}">${esc(r.dateLabel)}</time>
</li>`;
}

export function cardGrid(list, imageOf) {
  return `<ul class="cards">
${list.map((r) => recipeCard(r, imageOf(r))).join('\n')}
</ul>`;
}

/* --------------------------------------------------------------------- hero */

export function heroBlock(latest, img, lang, publishHour) {
  if (!latest) {
    return `<section class="hero">
  <p class="kicker">${esc(t(lang, 'comingSoonKicker'))}</p>
  <h2>${esc(t(lang, 'comingSoonTitle'))}</h2>
  <p>${esc(t(lang, 'comingSoonBody', publishHour))}</p>
</section>`;
  }
  const time = timeLabel(latest, lang);
  return `<section class="hero">
  <p class="kicker">${esc(t(lang, 'kickerToday'))}</p>
${shot(img, lang, { eager: true })}
  <h2><a href="${esc(url(lang, latest.path))}">${esc(latest.title)}</a></h2>
  <p>${esc(latest.summary)}</p>
  <ul class="meta">
    <li>${esc(latest.category)}</li>
    ${time ? `<li>${esc(time)}</li>` : ''}
    <li>${esc(t(lang, 'recipeYield', latest.servings))}</li>
    <li><time datetime="${esc(latest.publishedAt)}">${esc(latest.dateLabel)}</time></li>
  </ul>
</section>`;
}

/* ------------------------------------------------------------ recipe pieces */

export function factsList(r) {
  const { lang } = r;
  const facts = [
    [t(lang, 'factCategory'), r.category],
    [t(lang, 'factYield'), t(lang, 'servings', r.servings)],
    r.prepMinutes ? [t(lang, 'factPrep'), t(lang, 'minutes', r.prepMinutes)] : null,
    r.cookMinutes ? [t(lang, 'factCook'), t(lang, 'minutes', r.cookMinutes)] : null,
    r.difficulty ? [t(lang, 'factDifficulty'), r.difficulty] : null,
  ].filter(Boolean);

  return `<dl class="facts">
${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('\n')}
</dl>`;
}

export function prose(text) {
  if (!text) return '';
  return `<div class="prose">${text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('\n')}</div>`;
}

export function ingredientsBlock(r) {
  const groups = r.ingredients.map((g) => {
    const items = g.items
      .map((i) => `<li><span>${esc(i.name)}</span><span>${esc(i.amount)}</span></li>`)
      .join('\n');
    return `${g.group ? `<h3>${esc(g.group)}</h3>` : ''}\n<ul>\n${items}\n</ul>`;
  });
  return `<h2>${esc(t(r.lang, 'hIngredients'))}</h2>
<div class="ing">
${groups.join('\n')}
</div>`;
}

export function stepsList(r) {
  return `<h2>${esc(t(r.lang, 'hSteps'))}</h2>
<ol class="steps">
${r.steps.map((s) => `<li>${esc(s)}</li>`).join('\n')}
</ol>`;
}

export function tipsBlock(r) {
  if (!Array.isArray(r.tips) || !r.tips.length) return '';
  return `<div class="tips">
<h3>${esc(t(r.lang, 'hTips'))}</h3>
<ul>
${r.tips.map((x) => `<li>${esc(x)}</li>`).join('\n')}
</ul>
</div>`;
}

export function tagsList(r) {
  if (!Array.isArray(r.tags) || !r.tags.length) return '';
  const href = url(r.lang, `/categories/${r.categorySlug}/`);
  return `<ul class="tags">
${r.tags.map((x) => `<li><a href="${esc(href)}">#${esc(x)}</a></li>`).join('\n')}
</ul>`;
}

export function disclosure(lang) {
  return `<div class="disclosure">
  <strong>${esc(t(lang, 'disclosureLabel'))}</strong> ${esc(t(lang, 'disclosureBody'))}
</div>`;
}

export function pager(older, newer, lang) {
  if (!older && !newer) return '';
  return `<nav class="tags" aria-label="${esc(t(lang, 'otherRecipes'))}" style="margin-top:2rem">
${older ? `<li><a href="${esc(url(lang, older.path))}">← ${esc(older.title)}</a></li>` : ''}
${newer ? `<li><a href="${esc(url(lang, newer.path))}">${esc(newer.title)} →</a></li>` : ''}
</nav>`;
}
