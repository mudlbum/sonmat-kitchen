// The page shell — everything outside <main>.
//
// One function renders the chrome for both languages. That is deliberate: the
// header, footer, theme toggle and hreflang block are exactly the places where
// two hand-maintained language templates would quietly drift apart, and the
// drift would only surface as a check failure weeks later.
//
// Two invariants are enforced here rather than left to callers:
//   1. Every page emits hreflang for en, ko and x-default, always in that
//      attribute order, because that is the shape check.mjs parses.
//   2. Nothing ever writes data-theme onto <html> at build time. Light is the
//      served default; the boot script upgrades a returning visitor to dark
//      before first paint.

import { cfg, esc, absUrl, url } from './site.mjs';
import { HTML_LANG, OG_LOCALE, LANGS, DEFAULT_LANG, t } from './i18n.mjs';
import { THEME_BOOT, THEME_JS, SUN_ICON, MOON_ICON } from './styles.mjs';
import { IMAGE_ORIGIN, socialImage, socialAlt } from './images.mjs';

const otherLang = (lang) => (lang === 'en' ? 'ko' : 'en');

/**
 * @param {object} o
 * @param {string} o.lang            language of this page
 * @param {string} o.title           page title, unbranded
 * @param {string} o.description     meta description
 * @param {object} o.paths           { en, ko } site-relative paths, unprefixed
 * @param {string} o.body            inner HTML for <main>
 * @param {object} [o.jsonld]        structured data
 * @param {string} [o.ogType]        og:type, defaults by path
 * @param {boolean} [o.alternates]   emit hreflang (false only for 404)
 */
export function layout({
  lang,
  title,
  description,
  paths,
  body,
  jsonld,
  ogType,
  extraHead = '',
  alternates = true,
}) {
  const siteTitle = t(lang, 'siteTitle');
  const self = paths[lang];
  const fullTitle = title === siteTitle ? `${siteTitle} — ${t(lang, 'tagline')}` : `${title} — ${siteTitle}`;
  const canonical = absUrl(lang, self);

  // hreflang. x-default points at the default-language edition, which is what
  // a search engine should serve when it has no better signal.
  const hreflang = alternates
    ? [
        ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(absUrl(l, paths[l]))}">`),
        `<link rel="alternate" hreflang="x-default" href="${esc(absUrl(DEFAULT_LANG, paths[DEFAULT_LANG]))}">`,
      ].join('\n')
    : '';

  const other = otherLang(lang);
  const switchHref = url(other, paths[other]);

  return `<!doctype html>
<html lang="${HTML_LANG[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${hreflang}
<meta property="og:type" content="${ogType || (self.startsWith('/recipes/') ? 'article' : 'website')}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="${esc(siteTitle)}">
<meta property="og:locale" content="${OG_LOCALE[lang]}">
<meta property="og:image" content="${esc(socialImage())}">
<meta property="og:image:alt" content="${esc(socialAlt(lang))}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="${IMAGE_ORIGIN}" crossorigin>
<link rel="alternate" type="application/rss+xml" title="${esc(siteTitle)}" href="${esc(absUrl(lang, '/feed.xml'))}">
<link rel="stylesheet" href="${esc(url(DEFAULT_LANG, '/assets/site.css'))}">
<script>${THEME_BOOT}</script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
${extraHead}
</head>
<body>
<a class="skip" href="#main">${esc(t(lang, 'skip'))}</a>
<header class="site">
  <div class="wrap">
    <a class="brand" href="${esc(url(lang, '/'))}">${esc(siteTitle)}<span>${esc(t(lang, 'siteSub'))}</span></a>
    <nav class="site" aria-label="${esc(t(lang, 'navAll'))}">
      <a href="${esc(url(lang, '/'))}">${esc(t(lang, 'navAll'))}</a>
      <a href="${esc(url(lang, '/categories/'))}">${esc(t(lang, 'navCategories'))}</a>
      <a href="${esc(url(lang, '/about/'))}">${esc(t(lang, 'navAbout'))}</a>
      <a href="${esc(absUrl(lang, '/feed.xml'))}">${esc(t(lang, 'navRss'))}</a>
    </nav>
    <div class="tools">
      <a class="langswitch" href="${esc(switchHref)}" hreflang="${other}" title="${esc(t(lang, 'langSwitchTitle'))}">${esc(t(lang, 'langSwitch'))}</a>
      <button type="button" class="themebtn" data-theme-toggle
        data-to-dark="${esc(t(lang, 'themeToDark'))}" data-to-light="${esc(t(lang, 'themeToLight'))}"
        aria-label="${esc(t(lang, 'themeToggle'))}" aria-pressed="false">${SUN_ICON}${MOON_ICON}</button>
    </div>
  </div>
</header>
<main id="main"><div class="wrap">
${body}
</div></main>
<footer class="site">
  <div class="wrap">
    <p style="margin:0">© ${new Date().getUTCFullYear()} ${esc(siteTitle)}</p>
    <nav aria-label="${esc(t(lang, 'navAbout'))}">
      <a href="${esc(url(lang, '/about/'))}">${esc(t(lang, 'navAbout'))}</a>
      <a href="${esc(url(lang, '/editorial/'))}">${esc(t(lang, 'navEditorial'))}</a>
      <a href="${esc(url(lang, '/privacy/'))}">${esc(t(lang, 'navPrivacy'))}</a>
    </nav>
  </div>
</footer>
<script>${THEME_JS}</script>
</body>
</html>
`;
}
