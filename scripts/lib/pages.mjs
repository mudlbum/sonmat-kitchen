// The four page types that come from recipe data: the front page, a recipe,
// the category index, and a single category.
//
// Each render function returns { paths, html }. `paths` carries the
// site-relative path of this page in BOTH languages, because that is what the
// layout needs to emit reciprocal hreflang. Deriving it here — where the
// category slug for each language is already known — is what stops the English
// page pointing at a Korean URL that was never built.

import { cfg, esc, url, absUrl, isoAt, iso8601Duration, localised, timeLabel } from './site.mjs';
import { LANGS, categoryName, categorySlug, t } from './i18n.mjs';
import { josa } from './korean.mjs';
import { layout } from './layout.mjs';
import { schemaImages } from './images.mjs';
import {
  shot, cardGrid, heroBlock, factsList, prose,
  ingredientsBlock, stepsList, tipsBlock, tagsList, disclosure, pager,
} from './view.mjs';

/** Same path in both languages — true for everything except category pages. */
const samePath = (p) => Object.fromEntries(LANGS.map((l) => [l, p]));

/** Category paths differ per language: /categories/stews/ vs /categories/찌개/. */
const categoryPaths = (koName) =>
  Object.fromEntries(LANGS.map((l) => [l, `/categories/${categorySlug(koName, l)}/`]));

/* ---------------------------------------------------------------- index */

export function renderIndex(recipes, lang, imageOf) {
  const [latest, ...rest] = recipes;
  const body = `<h1>${esc(t(lang, 'siteTitle'))}</h1>
<p class="lede">${esc(t(lang, 'description'))}</p>
${heroBlock(latest, latest ? imageOf(latest) : null, lang, cfg.publishHourKst)}
${rest.length ? `<h2>${esc(t(lang, 'pastRecipes'))}</h2>\n${cardGrid(rest, imageOf)}` : ''}
<div class="adslot" data-slot="index-footer"></div>`;

  return {
    paths: samePath('/'),
    html: layout({
      lang,
      title: t(lang, 'siteTitle'),
      description: t(lang, 'description'),
      paths: samePath('/'),
      body,
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: t(lang, 'siteTitle'),
        alternateName: t(lang, 'siteSub'),
        description: t(lang, 'description'),
        url: absUrl(lang, '/'),
        inLanguage: lang,
      },
    }),
  };
}

/* --------------------------------------------------------------- recipe */

export function renderRecipe(r, all, img) {
  const { lang } = r;
  const idx = all.findIndex((x) => x.slug === r.slug);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const body = `<article class="recipe">
<h1>${esc(r.title)}</h1>
<p class="summary">${esc(r.summary)}</p>
<p style="font-size:.85rem;color:var(--ink-faint);margin:0 0 1rem">
  <time datetime="${esc(r.publishedAt)}">${esc(t(lang, 'byline', r.dateLabel))}</time>
</p>
${shot(img, lang, { eager: true })}
${factsList(r)}
${prose(r.intro)}
${ingredientsBlock(r)}
${stepsList(r)}
${tipsBlock(r)}
${tagsList(r)}
${disclosure(lang)}
${pager(older, newer, lang)}
<div class="adslot" data-slot="recipe-footer"></div>
</article>`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.title,
    description: r.summary,
    image: schemaImages(img),
    author: { '@type': 'Organization', name: t(lang, 'siteTitle') },
    datePublished: isoAt(r.publishedAt),
    recipeCategory: r.category,
    recipeCuisine: lang === 'ko' ? '한식' : 'Korean',
    recipeYield: t(lang, 'recipeYield', r.servings),
    inLanguage: lang,
    url: absUrl(lang, r.path),
    prepTime: iso8601Duration(r.prepMinutes),
    cookTime: iso8601Duration(r.cookMinutes),
    totalTime: iso8601Duration((Number(r.prepMinutes) || 0) + (Number(r.cookMinutes) || 0)),
    recipeIngredient: r.ingredients.flatMap((g) => g.items.map((i) => `${i.name} ${i.amount}`.trim())),
    recipeInstructions: r.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
    keywords: Array.isArray(r.tags) && r.tags.length ? r.tags.join(', ') : undefined,
  };
  for (const k of Object.keys(jsonld)) if (jsonld[k] === undefined) delete jsonld[k];

  return {
    paths: samePath(r.path),
    html: layout({
      lang,
      title: r.title,
      description: r.summary,
      paths: samePath(r.path),
      body,
      jsonld,
    }),
  };
}

/* ----------------------------------------------------------- categories */

export function renderCategoryIndex(byCategory, lang) {
  const entries = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);
  const body = `<h1>${esc(t(lang, 'hCategories'))}</h1>
<p class="lede">${esc(t(lang, 'categoriesLede'))}</p>
<ul class="cards">
${entries
  .map(
    ([koName, list]) => `<li class="card">
  <h3><a href="${esc(url(lang, `/categories/${categorySlug(koName, lang)}/`))}">${esc(categoryName(koName, lang))}</a></h3>
  <p>${esc(t(lang, 'recipeCount', list.length))}</p>
</li>`,
  )
  .join('\n')}
</ul>`;

  const paths = samePath('/categories/');
  return {
    paths,
    html: layout({
      lang,
      title: t(lang, 'hCategories'),
      description: t(lang, 'categoriesLede'),
      paths,
      body,
    }),
  };
}

export function renderCategory(koName, list, lang, imageOf) {
  const name = categoryName(koName, lang);
  const lede = t(lang, 'categoryLede', name, list.length);
  // `josa` keeps the Korean description from reading "찌개이" / "반찬가".
  const description =
    lang === 'ko'
      ? `${t(lang, 'siteTitle')}의 ${name} 레시피 모음. ${name}${josa(name, '이')} ${list.length}가지 올라와 있습니다.`
      : `Every ${name.toLowerCase()} recipe on ${t(lang, 'siteTitle')} — ${lede}`;

  const body = `<h1>${esc(name)}</h1>
<p class="lede">${esc(lede)}</p>
${cardGrid(list, imageOf)}`;

  const paths = categoryPaths(koName);
  return {
    paths,
    html: layout({ lang, title: name, description, paths, body }),
  };
}
