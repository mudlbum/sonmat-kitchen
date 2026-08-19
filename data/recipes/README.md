# The recipe queue

Every `.json` file here is an unpublished recipe. They go out **in filename
order**, one per morning, so the numeric prefix is the schedule.

Files move to `content/published/` when they publish — that is the only
difference between a queued recipe and a live one, plus the `publishedAt` stamp
the publisher adds.

## Schema

```jsonc
{
  "slug": "kimchi-jjigae",        // required · lowercase a-z 0-9 - · becomes the URL
  "title": "묵은지 김치찌개",       // required
  "titleEn": "Kimchi Jjigae",     // optional
  "summary": "한 문장 요약.",       // required · used in the feed, cards and meta description
  "category": "찌개",              // required · groups the category pages
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
  "tips": ["알아두면 좋은 것."]          // optional
}
```

`publishedAt` is **not** set by hand — `scripts/publish.mjs` adds it.

## Adding one

1. Copy an existing file and renumber it past the highest current prefix.
2. Edit it.
3. `node scripts/build.mjs` — the build validates every queued recipe too, so a
   mistake surfaces immediately rather than at 07:10 some morning.

## House style

- Steps are imperative and specific. "중불에서 3분" beats "적당히 볶는다".
- Say *why* when it is not obvious. The reason a step exists is what makes a
  recipe reproducible.
- Amounts: 1큰술 = 15mL, 1작은술 = 5mL, 1컵 = 200mL.
- `tips` is for the thing that goes wrong, the substitution that works, and how
  long it keeps.
