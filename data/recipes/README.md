# The recipe queue

Every `.json` file here is an unpublished recipe. They go out **in filename
order**, one per morning, so the numeric prefix is the schedule.

Files move to `content/published/` when they publish — that is the only
difference between a queued recipe and a live one, plus the `publishedAt` stamp
the publisher adds.

## Schema

```jsonc
{
  "slug": "kimchi-jjigae",        // required · lowercase a-z 0-9 - · becomes the URL in both languages
  "title": "묵은지 김치찌개",       // required · Korean
  "titleEn": "Kimchi Jjigae",     // optional · kept in sync with en.title
  "summary": "한 문장 요약.",       // required · feed, cards, meta description
  "category": "찌개",              // required · must exist in scripts/lib/i18n.mjs
  "tags": ["김치", "돼지고기"],     // optional
  "servings": 2,                   // required
  "prepMinutes": 10,               // optional
  "cookMinutes": 30,               // optional
  "difficulty": "쉬움",            // optional · 쉬움 / 보통 / 어려움
  "intro": "두 문단까지.\n\n빈 줄로 나눕니다.",  // optional
  "ingredients": [                 // required · at least one group
    { "group": "주재료", "items": [ { "name": "묵은지", "amount": "400g" } ] }
  ],
  "steps": ["첫 단계.", "둘째 단계."],  // required
  "tips": ["알아두면 좋은 것."]         // optional
}
```

`publishedAt` is **not** set by hand — `scripts/publish.mjs` adds it.

### The English edition is not optional

The English lives in its own file, [`../en/<slug>.json`](../en), so a translator
edits one file without touching the Korean and the English never has to move
when a recipe publishes.

```jsonc
// data/en/kimchi-jjigae.json
{
  "title": "Kimchi Jjigae",
  "summary": "One-line summary.",
  "category": "Stews",          // must match the table in scripts/lib/i18n.mjs
  "difficulty": "Easy",         // Easy / Medium / Hard
  "tags": ["kimchi", "pork"],
  "intro": "Up to two paragraphs.\n\nSplit on a blank line.",
  "ingredients": [
    { "group": "Main", "items": [ { "name": "Aged kimchi (mugeunji)", "amount": "400 g (14 oz)" } ] }
  ],
  "steps": ["First step.", "Second step."],
  "tips": ["Worth knowing."]
}
```

`steps`, `tips` and `ingredients` must have the **same number of entries** as the
Korean, in the same order. Both `publish.mjs` and `build.mjs` refuse a recipe
where they disagree, because a step silently missing from one language is a
recipe that does not work.

### Photographs

A recipe does not need an entry in [`../images.json`](../images.json) — the
category pool covers it, and the caption is labelled as a reference photo.
Adding a hand-picked entry is better:

```jsonc
"kimchi-jjigae": {
  "id": 13774731,                    // the number in a pexels.com/photo/<id>/ URL
  "credit": "Shinshiakiiro",         // the photographer's name as Pexels shows it
  "match": "exact",                  // "exact" = this dish · "reference" = the right family of dish
  "alt": { "en": "...", "ko": "..." } // describe what is IN the photo, in both languages
}
```

Only write `"match": "exact"` when the photo really is the dish. The caption
changes wording based on this field, so mislabelling it puts a false claim on the
page.

## Adding one

1. Copy an existing file and renumber it past the highest current prefix.
2. Edit the Korean, then write the English at `data/en/<slug>.json`.
3. Optionally add a photo to `data/images.json`.
4. `node scripts/build.mjs && node scripts/check.mjs` — the build validates every
   queued recipe too, so a mistake surfaces immediately rather than at 07:10 some
   morning.

## House style

- Steps are imperative and specific. "중불에서 3분" beats "적당히 볶는다", and
  "Fry over medium heat for 3 minutes" beats "fry until done".
- Say *why* when it is not obvious. The reason a step exists is what makes a
  recipe reproducible.
- Amounts: 1큰술 = 15mL, 1작은술 = 5mL, 1컵 = 200mL. In English, metric first with
  the US equivalent in brackets — "600 mL (2 1/2 cups)".
- Korean ingredients that are hard to buy abroad get the romanisation in brackets
  on first use: "Korean chilli flakes (gochugaru)".
- `tips` is for the thing that goes wrong, the substitution that works, and how
  long it keeps.
