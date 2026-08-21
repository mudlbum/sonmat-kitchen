// The prose pages: about, editorial policy, privacy, and 404.
//
// These are the pages nobody looks at until they matter — the editorial policy
// when a recipe turns out to be wrong, the privacy page when someone asks what
// the site collects. They are kept out of pages.mjs because they are the only
// place where the two languages carry genuinely different text rather than a
// translation of the same generated sentence, and mixing them in with the
// data-driven pages made both harder to read.

import { cfg, esc, url } from './site.mjs';
import { LANGS, t } from './i18n.mjs';
import { layout } from './layout.mjs';

const samePath = (p) => Object.fromEntries(LANGS.map((l) => [l, p]));

/* ------------------------------------------------------------------ about */

const about = {
  ko: (lang) => `
<p>${esc(t(lang, 'siteTitle'))}는 집 부엌에서 만들 수 있는 한식 레시피를 매일 아침 ${esc(cfg.publishHourKst)}에 한 가지씩 올리는 곳입니다.</p>
<p>특별한 장비나 구하기 어려운 재료는 쓰지 않습니다. 대형마트나 동네 시장에서 살 수 있는 재료, 일반 가정용 가스레인지, 그리고 냄비 하나로 끝나는 것을 기준으로 삼습니다.</p>
<p>분량은 계량컵과 계량스푼 기준입니다. 1큰술은 15mL, 1작은술은 5mL, 1컵은 200mL로 씁니다. 간은 지역과 집마다 다르니, 처음에는 적힌 양의 8할만 넣고 마지막에 맞추시길 권합니다.</p>
<h2>레시피를 어떻게 쓰는가</h2>
<p>레시피는 표준적인 한식 조리법을 바탕으로 작성합니다. 각 레시피 하단에는 편집자가 직접 만들어 검증했는지 여부를 표시합니다. 검증하지 않은 레시피를 검증한 것처럼 표시하지 않습니다.</p>
<p>자세한 내용은 <a href="${esc(url(lang, '/editorial/'))}">편집 방침</a>을 봐 주세요.</p>`,

  en: (lang) => `
<p>${esc(t(lang, 'siteTitle'))} publishes one Korean home recipe every morning at ${esc(cfg.publishHourKst)} Korea time.</p>
<p>No special equipment, and nothing you cannot buy in an ordinary supermarket. The benchmark is a recipe you can finish with one pot on a normal domestic hob.</p>
<p>Quantities are given by weight in grams wherever it matters, with cup and spoon equivalents alongside: 1 Tbsp is 15 mL, 1 tsp is 5 mL, 1 cup is 200 mL. Seasoning varies by region and by household, so start with about four-fifths of what is written and adjust at the end.</p>
<h2>How these recipes are written</h2>
<p>Each recipe is written from standard Korean method. Every recipe page says whether the editor has cooked and checked it. A recipe that has not been tested is never presented as though it has.</p>
<p>The <a href="${esc(url(lang, '/editorial/'))}">editorial policy</a> sets this out in full.</p>`,
};

/* -------------------------------------------------------------- editorial */

const editorial = {
  ko: (lang) => `
<p>이 페이지는 ${esc(t(lang, 'siteTitle'))}가 무엇을 하고 무엇을 하지 않는지 적어 둔 곳입니다.</p>
<h2>발행</h2>
<p>레시피는 매일 아침 ${esc(cfg.publishHourKst)}(한국 시간)에 자동으로 한 가지가 공개됩니다. 대기열에 미리 작성해 둔 레시피에서 순서대로 나갑니다. 대기열이 ${cfg.queueWarnThreshold}개 미만으로 줄면 저장소에 이슈가 자동으로 열립니다.</p>
<h2>두 가지 언어</h2>
<p>모든 레시피는 한국어와 영어로 함께 공개됩니다. 한쪽만 있는 레시피는 발행되지 않습니다. 영어판은 번역이 아니라 같은 조리법을 영어권 부엌 기준으로 다시 쓴 것입니다.</p>
<h2>검증 표시</h2>
<p>레시피에는 세 가지 상태 중 하나가 표시됩니다.</p>
<ul>
<li><strong>미검증</strong> — 표준 조리법을 바탕으로 작성했으나 아직 직접 만들어 보지 않았습니다. 기본 상태입니다.</li>
<li><strong>검증됨</strong> — 편집자가 적힌 그대로 만들어 결과를 확인했습니다. 날짜가 함께 표시됩니다.</li>
<li><strong>수정됨</strong> — 만들어 본 뒤 분량이나 순서를 고쳤습니다. 무엇을 고쳤는지 함께 적습니다.</li>
</ul>
<p>이 표시는 사람이 손으로 바꿉니다. 자동으로 "검증됨"이 되는 경로는 없습니다.</p>
<h2>사진</h2>
<p>사진은 Pexels의 이미지를 씁니다. 그 요리를 정확히 보여 주는 사진이 아닐 때는 "참고 사진"이라고 밝힙니다.</p>
<h2>고치기</h2>
<p>레시피가 틀렸거나 재현되지 않으면 <a href="https://github.com/${esc(cfg.repo)}/issues" rel="nofollow">저장소 이슈</a>로 알려 주세요. 고친 레시피에는 무엇을 언제 고쳤는지 남깁니다.</p>
<h2>광고</h2>
<p>현재 이 사이트에는 광고가 없습니다. 넣게 되면 이 문단을 먼저 고치고, 광고와 본문을 시각적으로 구분해 표시합니다.</p>`,

  en: (lang) => `
<p>This page records what ${esc(t(lang, 'siteTitle'))} does and does not do.</p>
<h2>Publishing</h2>
<p>One recipe goes up automatically every morning at ${esc(cfg.publishHourKst)} Korea time, taken in order from a queue written in advance. When the queue falls below ${cfg.queueWarnThreshold} an issue is opened on the repository automatically.</p>
<h2>Two languages</h2>
<p>Every recipe is published in Korean and English together. A recipe that exists in only one language is not published at all. The English edition is not a machine translation — it is the same method rewritten for a kitchen outside Korea, with substitutions that actually work.</p>
<h2>Verification status</h2>
<p>Every recipe carries one of three states.</p>
<ul>
<li><strong>Not yet tested</strong> — written from standard method but not yet cooked by the editor. This is the default.</li>
<li><strong>Tested</strong> — the editor cooked it exactly as written and confirmed the result. A date is shown alongside.</li>
<li><strong>Revised</strong> — cooked, then corrected. What changed is recorded with it.</li>
</ul>
<p>This status is set by hand. There is no code path that marks a recipe tested on its own.</p>
<h2>Photographs</h2>
<p>Photographs come from Pexels. Where the image is not a picture of this exact dish it is labelled a reference photo.</p>
<h2>Corrections</h2>
<p>If a recipe is wrong or does not reproduce, say so on the <a href="https://github.com/${esc(cfg.repo)}/issues" rel="nofollow">repository issues</a>. Corrected recipes record what changed and when.</p>
<h2>Advertising</h2>
<p>There are no adverts on this site. If that changes, this paragraph is edited first, and advertising is marked off visually from the writing.</p>`,
};

/* ---------------------------------------------------------------- privacy */

const privacy = {
  ko: (lang) => `
<p>${esc(t(lang, 'siteTitle'))}는 GitHub Pages로 운영되는 정적 사이트입니다.</p>
<h2>수집하는 정보</h2>
<p>이 사이트는 방문자에게서 직접 정보를 수집하지 않습니다. 회원가입, 로그인, 댓글, 문의 양식이 없고 쿠키를 심지 않습니다.</p>
<h2>브라우저에 저장되는 것</h2>
<p>테마(밝게/어둡게) 설정만 브라우저의 localStorage에 남습니다. 이 값은 방문자의 기기를 벗어나지 않으며 운영자가 볼 수 없습니다.</p>
<h2>호스팅 사업자</h2>
<p>사이트는 GitHub, Inc.의 GitHub Pages에서 제공됩니다. GitHub은 보안 및 서비스 유지 목적으로 방문자의 IP 주소를 포함한 접속 기록을 남길 수 있습니다. 이 기록은 GitHub이 보관하며 운영자는 접근할 수 없습니다. 자세한 내용은 <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement" rel="nofollow">GitHub 개인정보 보호정책</a>을 참고하세요.</p>
<h2>사진</h2>
<p>레시피 사진은 Pexels의 CDN에서 직접 불러옵니다. 따라서 페이지를 열면 브라우저가 images.pexels.com에 요청을 보내고, 그 과정에서 IP 주소가 Pexels에 전달됩니다.</p>
<h2>분석 도구와 광고</h2>
<p>현재 분석 도구와 광고 스크립트를 쓰지 않습니다. 도입하면 이 페이지를 먼저 고치고, 어떤 사업자의 어떤 도구인지 밝힙니다.</p>
<h2>문의</h2>
<p><a href="https://github.com/${esc(cfg.repo)}/issues" rel="nofollow">저장소 이슈</a>로 연락할 수 있습니다.</p>`,

  en: (lang) => `
<p>${esc(t(lang, 'siteTitle'))} is a static site served from GitHub Pages.</p>
<h2>What is collected</h2>
<p>This site collects nothing from you directly. There are no accounts, no logins, no comments, no contact form, and no cookies are set.</p>
<h2>What your browser stores</h2>
<p>Your theme choice — light or dark — is kept in your browser's localStorage. That value never leaves your device and cannot be read by the site's operator.</p>
<h2>Hosting</h2>
<p>The site is served by GitHub Pages, operated by GitHub, Inc. GitHub may keep access logs including visitor IP addresses for security and service maintenance. Those logs are held by GitHub and the operator of this site cannot reach them. See the <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement" rel="nofollow">GitHub privacy statement</a> for details.</p>
<h2>Photographs</h2>
<p>Recipe photographs are loaded directly from the Pexels CDN. Opening a page therefore makes a request to images.pexels.com, which discloses your IP address to Pexels.</p>
<h2>Analytics and advertising</h2>
<p>No analytics and no advertising scripts are in use. If either is introduced, this page is edited first, naming the provider and the tool.</p>
<h2>Contact</h2>
<p>Reach the operator through the <a href="https://github.com/${esc(cfg.repo)}/issues" rel="nofollow">repository issues</a>.</p>`,
};

/* ----------------------------------------------------------------- render */

const PAGES = {
  about: {
    path: '/about/',
    titleKey: 'aboutTitle',
    body: about,
    description: {
      ko: (lang) => `${t(lang, 'siteTitle')}는 어떤 곳이고 레시피를 어떤 기준으로 쓰는지 적어 둔 페이지입니다.`,
      en: (lang) => `What ${t(lang, 'siteTitle')} is, and the standards its recipes are written to.`,
    },
  },
  editorial: {
    path: '/editorial/',
    titleKey: 'editorialTitle',
    body: editorial,
    description: {
      ko: (lang) => `${t(lang, 'siteTitle')}의 발행 주기, 두 언어 원칙, 검증 표시, 정정 방침.`,
      en: (lang) => `Publishing schedule, the both-languages rule, verification status and corrections policy for ${t(lang, 'siteTitle')}.`,
    },
  },
  privacy: {
    path: '/privacy/',
    titleKey: 'privacyTitle',
    body: privacy,
    description: {
      ko: (lang) => `${t(lang, 'siteTitle')}의 개인정보 처리방침. 무엇을 수집하지 않는지, 브라우저에 무엇이 남는지.`,
      en: (lang) => `The privacy policy for ${t(lang, 'siteTitle')} — what is not collected, and what your browser keeps.`,
    },
  },
};

export const STATIC_KINDS = Object.keys(PAGES);

export function renderStaticPage(kind, lang) {
  const spec = PAGES[kind];
  if (!spec) throw new Error(`unknown static page "${kind}"`);
  const title = t(lang, spec.titleKey);
  const paths = samePath(spec.path);
  return {
    paths,
    html: layout({
      lang,
      title,
      description: spec.description[lang](lang),
      paths,
      body: `<h1>${esc(title)}</h1>\n<div class="prose">${spec.body[lang](lang)}</div>`,
    }),
  };
}

/**
 * The 404 page.
 *
 * It lives only at the site root: GitHub Pages serves one 404 document for the
 * whole site and cannot pick a language from the requested path. It therefore
 * carries no hreflang — there is no counterpart for it to point at.
 */
export function render404(lang) {
  return layout({
    lang,
    title: t(lang, 'notFoundTitle'),
    description: t(lang, 'notFoundBody'),
    paths: samePath('/'),
    alternates: false,
    body: `<h1>${esc(t(lang, 'notFoundTitle'))}</h1>
<div class="prose"><p>${esc(t(lang, 'notFoundBody'))}
<a href="${esc(url(lang, '/'))}">${esc(t(lang, 'backToAll'))}</a></p></div>`,
  });
}
