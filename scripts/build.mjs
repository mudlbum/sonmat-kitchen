#!/usr/bin/env node
// Static site generator for 손맛 키친 / Sonmat Kitchen.
//
// Deliberately zero-dependency: no npm install, no lockfile, no transitive
// supply chain. `node scripts/build.mjs` is the whole build. That matters for a
// site whose entire job is to publish unattended every morning — the smaller
// the build, the fewer ways the morning run can fail.
//
// This file is the orchestrator and nothing else. It loads and validates the
// data, then walks the languages emitting the same set of pages for each. All
// the rendering lives in scripts/lib:
//
//   site.mjs          config, escaping, locale-aware URLs, dates, view models
//   layout.mjs        the page shell — head, hreflang, header, footer
//   view.mjs          presentational fragments below <main>
//   pages.mjs         the data-driven pages: index, recipe, categories
//   static-pages.mjs  about, editorial policy, privacy, 404
//
// The reason for the split is the bilingual invariant: English at the root,
// Korean under /ko/, with the two trees structurally identical. One set of
// render functions parameterised by `lang` cannot drift; two hand-maintained
// copies inevitably would.

import { rm, mkdir } from 'node:fs/promises';
import {
  cfg, OUT, PUBLISHED_DIR, QUEUE_DIR,
  xesc, url, absUrl, isoAt, rfc822, todayKst,
  readJsonDir, emit, validate, validateBilingual, attachEnglish, localised, outPath,
} from './lib/site.mjs';
import { LANGS, DEFAULT_LANG, categorySlug, t } from './lib/i18n.mjs';
import { CSS } from './lib/styles.mjs';
import { imageFor, srcUrl, RATIOS } from './lib/images.mjs';
import { renderIndex, renderRecipe, renderCategoryIndex, renderCategory } from './lib/pages.mjs';
import { STATIC_KINDS, renderStaticPage, render404 } from './lib/static-pages.mjs';

/* ------------------------------------------------------------------ feeds */

const FEED_THUMB_W = 640;
const FEED_THUMB_H = Math.round(FEED_THUMB_W / RATIOS.card);

/**
 * One feed per language. A reader subscribed to the English feed should never
 * be handed a Korean item, so the two are built separately rather than one feed
 * carrying both editions.
 */
function renderFeed(recipes, lang, imageOf) {
  const items = recipes.slice(0, 30);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>${xesc(t(lang, 'siteTitle'))}</title>
  <link>${xesc(absUrl(lang, '/'))}</link>
  <description>${xesc(t(lang, 'description'))}</description>
  <language>${lang}</language>
  <atom:link href="${xesc(absUrl(lang, '/feed.xml'))}" rel="self" type="application/rss+xml"/>
${items[0] ? `  <lastBuildDate>${xesc(rfc822(items[0].publishedAt))}</lastBuildDate>` : ''}
${items
  .map((r) => {
    const img = imageOf(r);
    const link = absUrl(lang, r.path);
    return `  <item>
    <title>${xesc(r.title)}</title>
    <link>${xesc(link)}</link>
    <guid isPermaLink="true">${xesc(link)}</guid>
    <pubDate>${xesc(rfc822(r.publishedAt))}</pubDate>
    <category>${xesc(r.category)}</category>
    <description>${xesc(r.summary)}</description>${
      img
        ? `\n    <media:thumbnail url="${xesc(srcUrl(img.id, FEED_THUMB_W, FEED_THUMB_H))}" width="${FEED_THUMB_W}" height="${FEED_THUMB_H}"/>`
        : ''
    }
  </item>`;
  })
  .join('\n')}
</channel>
</rss>
`;
}

/** One sitemap for the whole site, both languages. */
function renderSitemap(recipes, categoriesKo) {
  const urls = [];
  for (const lang of LANGS) {
    urls.push({ loc: absUrl(lang, '/'), lastmod: recipes[0] ? isoAt(recipes[0].publishedAt) : undefined, priority: '1.0' });
    urls.push({ loc: absUrl(lang, '/categories/'), priority: '0.5' });
    for (const ko of categoriesKo) {
      urls.push({ loc: absUrl(lang, `/categories/${categorySlug(ko, lang)}/`), priority: '0.5' });
    }
    for (const r of recipes) {
      urls.push({ loc: absUrl(lang, `/recipes/${r.slug}/`), lastmod: isoAt(r.publishedAt), priority: '0.8' });
    }
    urls.push({ loc: absUrl(lang, '/about/'), priority: '0.3' });
    urls.push({ loc: absUrl(lang, '/editorial/'), priority: '0.3' });
    urls.push({ loc: absUrl(lang, '/privacy/'), priority: '0.2' });
  }

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

/* ------------------------------------------------------------------- main */

async function main() {
  const published = await readJsonDir(PUBLISHED_DIR);
  const queued = await readJsonDir(QUEUE_DIR);

  published.forEach((r) => validate(r, 'content/published'));
  queued.forEach((r) => validate(r, 'data/recipes'));
  // Only published recipes must carry their English edition — a queued recipe is
  // still being written, and publish.mjs is what refuses to promote one without.
  await attachEnglish(published);
  published.forEach((r) => validateBilingual(r, 'content/published'));

  for (const r of published) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.publishedAt || '')) {
      throw new Error(`content/published/${r._file}: publishedAt must be YYYY-MM-DD, got ${r.publishedAt}`);
    }
  }

  const dupes = published.map((r) => r.slug).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupes.length) throw new Error(`duplicate slugs published: ${[...new Set(dupes)].join(', ')}`);

  // Newest first. Same-day publishes fall back to filename order (reversed, so
  // the later file in a batch reads as the newer post).
  const ordered = [...published].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || b._file.localeCompare(a._file),
  );

  // Photographs are resolved once, from the Korean record, and shared by both
  // editions — the same recipe must not show a different picture per language.
  const images = new Map(ordered.map((r) => [r.slug, imageFor(r)]));
  const imageOf = (r) => images.get(r.slug) ?? null;

  const categoriesKo = [];
  for (const r of ordered) if (!categoriesKo.includes(r.category)) categoriesKo.push(r.category);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  await emit('.nojekyll', '');
  await emit('assets/site.css', CSS);

  for (const lang of LANGS) {
    const recipes = ordered.map((r) => localised(r, lang));

    const byCategory = new Map();
    for (const r of recipes) {
      if (!byCategory.has(r.categoryKo)) byCategory.set(r.categoryKo, []);
      byCategory.get(r.categoryKo).push(r);
    }

    const index = renderIndex(recipes, lang, imageOf);
    await emit(outPath(lang, index.paths[lang]), index.html);

    for (const r of recipes) {
      const page = renderRecipe(r, recipes, imageOf(r));
      await emit(outPath(lang, page.paths[lang]), page.html);
    }

    const catIndex = renderCategoryIndex(byCategory, lang);
    await emit(outPath(lang, catIndex.paths[lang]), catIndex.html);

    for (const [ko, list] of byCategory) {
      const page = renderCategory(ko, list, lang, imageOf);
      await emit(outPath(lang, page.paths[lang]), page.html);
    }

    for (const kind of STATIC_KINDS) {
      const page = renderStaticPage(kind, lang);
      await emit(outPath(lang, page.paths[lang]), page.html);
    }

    await emit(outPath(lang, '/feed.xml'), renderFeed(recipes, lang, imageOf));
  }

  // GitHub Pages serves a single 404 document for the whole site and cannot
  // choose one by path, so it exists once, in the default language.
  await emit('404.html', render404(DEFAULT_LANG));

  await emit('sitemap.xml', renderSitemap(ordered, categoriesKo));
  await emit(
    'robots.txt',
    `User-agent: *\nAllow: /\n\n# Naver\nUser-agent: Yeti\nAllow: /\n\nSitemap: ${absUrl(DEFAULT_LANG, '/sitemap.xml')}\n`,
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
        languages: LANGS,
        publishedCount: ordered.length,
        queueRemaining: queued.length,
        queueWarnThreshold: cfg.queueWarnThreshold,
        queueHealthy: queued.length >= cfg.queueWarnThreshold,
        latest: ordered[0]
          ? { slug: ordered[0].slug, title: ordered[0].title, titleEn: ordered[0].en?.title ?? null, publishedAt: ordered[0].publishedAt }
          : null,
        daysSinceLatest: ordered[0]
          ? Math.floor((Date.parse(`${todayKst()}T00:00:00Z`) - Date.parse(`${ordered[0].publishedAt}T00:00:00Z`)) / 86_400_000)
          : null,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `built ${ordered.length} recipe page(s) × ${LANGS.length} language(s), ` +
      `${categoriesKo.length} categor(y/ies) → dist/\n` +
      `  ${url(DEFAULT_LANG, '/')}  and  ${url('ko', '/')}\n` +
      `queue: ${queued.length} remaining${queued.length < cfg.queueWarnThreshold ? '  ⚠ below threshold' : ''}`,
  );
}

main().catch((err) => {
  console.error(`build failed: ${err.message}`);
  process.exit(1);
});
