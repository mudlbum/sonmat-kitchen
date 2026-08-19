// Every user-facing string on the site, in both languages.
//
// Why one table instead of two page sets: the EN and KO trees are rendered by
// the SAME functions in build.mjs, parameterised by `lang`. That is the
// GamePulse rule — pages are thin wrappers over shared views so the two
// languages cannot drift structurally. If a string is missing here the build
// fails loudly rather than shipping a half-translated page.

export const LANGS = ['en', 'ko'];
export const DEFAULT_LANG = 'en'; // English is the site root; Korean lives at /ko/

/** URL prefix for a language. English is the root, so it has none. */
export const langPrefix = (lang) => (lang === DEFAULT_LANG ? '' : `/${lang}`);

/** BCP-47 tags, for <html lang>, hreflang and og:locale. */
export const HTML_LANG = { en: 'en', ko: 'ko' };
export const OG_LOCALE = { en: 'en_US', ko: 'ko_KR' };

/* ------------------------------------------------------------- categories */
// The Korean name is the key because that is what the recipe JSON stores.
// `slug` is per-language so the English tree gets readable English URLs
// instead of percent-encoded Hangul.

export const CATEGORIES = {
  '찌개': { en: 'Stews',       slug: { en: 'stews',        ko: '찌개' } },
  '국':   { en: 'Soups',       slug: { en: 'soups',        ko: '국' } },
  '반찬': { en: 'Side Dishes', slug: { en: 'side-dishes',  ko: '반찬' } },
  '볶음': { en: 'Stir-fries',  slug: { en: 'stir-fries',   ko: '볶음' } },
  '밥':   { en: 'Rice',        slug: { en: 'rice',         ko: '밥' } },
  '구이': { en: 'Grilled',     slug: { en: 'grilled',      ko: '구이' } },
  '면':   { en: 'Noodles',     slug: { en: 'noodles',      ko: '면' } },
  '전':   { en: 'Pancakes',    slug: { en: 'pancakes',     ko: '전' } },
};

export function categoryName(koName, lang) {
  const c = CATEGORIES[koName];
  if (!c) throw new Error(`unknown category "${koName}" — add it to CATEGORIES in scripts/lib/i18n.mjs`);
  return lang === 'ko' ? koName : c.en;
}

export function categorySlug(koName, lang) {
  const c = CATEGORIES[koName];
  if (!c) throw new Error(`unknown category "${koName}" — add it to CATEGORIES in scripts/lib/i18n.mjs`);
  return c.slug[lang];
}

/* ------------------------------------------------------------------ dates */

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDate(ymd, lang) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return lang === 'ko' ? `${y}년 ${m}월 ${d}일` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

/* ---------------------------------------------------------------- strings */

export const T = {
  en: {
    siteTitle: 'Sonmat Kitchen',
    siteSub: '손맛 키친',
    tagline: 'One Korean recipe every morning, cooked at home',
    description:
      'Korean home cooking explained properly. One recipe every morning — real ratios from Korean home kitchens, weighed in grams, with substitutions that actually work.',

    skip: 'Skip to content',
    navAll: 'All recipes',
    navCategories: 'Categories',
    navAbout: 'About',
    navRss: 'RSS',
    navEditorial: 'Editorial policy',
    navPrivacy: 'Privacy',
    navContact: 'Contact',
    navTerms: 'Terms',

    themeToggle: 'Switch theme',
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    langSwitch: '한국어',
    langSwitchTitle: 'Read this page in Korean',

    kickerToday: "Today's recipe",
    pastRecipes: 'Earlier recipes',
    comingSoonKicker: 'Getting ready',
    comingSoonTitle: 'The first recipe is on its way',
    comingSoonBody: (t) => `A new one goes up every morning at ${t} Korea time.`,

    byline: (d) => `Published ${d}`,
    factCategory: 'Category',
    factYield: 'Serves',
    factPrep: 'Prep',
    factCook: 'Cook',
    factDifficulty: 'Difficulty',
    minutes: (n) => `${n} min`,
    servings: (n) => `${n}`,
    // schema.org recipeYield wants a countable phrase, not a bare number.
    recipeYield: (n) => `${n} serving${n === 1 ? '' : 's'}`,
    recipeCount: (n) => `${n} recipe${n === 1 ? '' : 's'}`,

    hIngredients: 'Ingredients',
    hSteps: 'Method',
    hTips: 'Worth knowing',
    hCategories: 'Categories',
    categoriesLede: 'Everything published so far, grouped by type.',
    categoryLede: (name, n) => `${n} ${n === 1 ? 'recipe' : 'recipes'} in ${name}.`,

    disclosureLabel: 'About this recipe.',
    disclosureBody:
      'This recipe is written from standard Korean method and has not yet been cooked and checked by the editor. Once it has been, a verification date appears here. For any step involving heat, hot oil or raw meat, trust your own judgement first.',

    photoCreditExact: (who) => `Photo: ${who} / Pexels`,
    photoCreditRef: (who) => `Reference photo: ${who} / Pexels — a stock image of this dish, not a photograph of this recipe`,

    otherRecipes: 'Other recipes',
    notFoundTitle: 'Page not found',
    notFoundBody: 'The address may have changed, or the recipe may not have gone up yet.',
    backToAll: 'Browse all recipes',

    aboutTitle: 'About',
    editorialTitle: 'Editorial policy',
    privacyTitle: 'Privacy',
    contactTitle: 'Contact',
    termsTitle: 'Terms',

    homeCrumb: 'Home',
  },

  ko: {
    siteTitle: '손맛 키친',
    siteSub: 'Sonmat Kitchen',
    tagline: '매일 아침 한 가지, 집에서 만드는 한식',
    description:
      '복잡한 장비 없이 집 부엌에서 만들 수 있는 한식 레시피를 매일 아침 한 가지씩 올립니다.',

    skip: '본문으로 건너뛰기',
    navAll: '전체 레시피',
    navCategories: '분류',
    navAbout: '소개',
    navRss: 'RSS',
    navEditorial: '편집 방침',
    navPrivacy: '개인정보 처리방침',
    navContact: '문의',
    navTerms: '이용약관',

    themeToggle: '테마 전환',
    themeToLight: '밝은 테마로 전환',
    themeToDark: '어두운 테마로 전환',
    langSwitch: 'English',
    langSwitchTitle: 'Read this page in English',

    kickerToday: '오늘의 레시피',
    pastRecipes: '지난 레시피',
    comingSoonKicker: '준비 중',
    comingSoonTitle: '첫 레시피를 기다리는 중입니다',
    comingSoonBody: (t) => `매일 아침 ${t}에 한 가지씩 올라갑니다.`,

    byline: (d) => `${d} 공개`,
    factCategory: '분류',
    factYield: '분량',
    factPrep: '준비',
    factCook: '조리',
    factDifficulty: '난이도',
    minutes: (n) => `${n}분`,
    servings: (n) => `${n}인분`,
    recipeYield: (n) => `${n}인분`,
    recipeCount: (n) => `${n}가지 레시피`,

    hIngredients: '재료',
    hSteps: '만드는 법',
    hTips: '알아두면 좋은 것',
    hCategories: '분류',
    categoriesLede: '지금까지 올라온 레시피를 종류별로 모았습니다.',
    categoryLede: (name, n) => `${name} 레시피 ${n}가지가 올라와 있습니다.`,

    disclosureLabel: '이 레시피에 대해.',
    disclosureBody:
      '이 레시피는 표준적인 한식 조리법을 바탕으로 작성했고, 아직 편집자가 직접 만들어 검증하지는 않았습니다. 검증을 마치면 이 자리에 검증 날짜가 표시됩니다. 불·기름·생고기를 다루는 단계는 본인의 판단을 우선해 주세요.',

    photoCreditExact: (who) => `사진: ${who} / Pexels`,
    photoCreditRef: (who) => `참고 사진: ${who} / Pexels — 이 요리를 보여 주는 스톡 이미지이며, 이 레시피로 만든 사진은 아닙니다`,

    otherRecipes: '다른 레시피',
    notFoundTitle: '페이지를 찾을 수 없습니다',
    notFoundBody: '주소가 바뀌었거나 아직 올라오지 않은 레시피일 수 있습니다.',
    backToAll: '전체 레시피 보기',

    aboutTitle: '소개',
    editorialTitle: '편집 방침',
    privacyTitle: '개인정보 처리방침',
    contactTitle: '문의',
    termsTitle: '이용약관',

    homeCrumb: '홈',
  },
};

/** Fetch a string, failing loudly rather than rendering `undefined` on a page. */
export function t(lang, key, ...args) {
  const table = T[lang];
  if (!table) throw new Error(`unknown language "${lang}"`);
  const v = table[key];
  if (v === undefined) throw new Error(`missing i18n string "${key}" for "${lang}"`);
  return typeof v === 'function' ? v(...args) : v;
}
