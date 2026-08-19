# Sonmat Kitchen / 손맛 키친

A Korean home-cooking blog that publishes one recipe every morning at **07:10 KST**,
in **English and Korean at the same moment**, served as a static site from GitHub
Pages.

- English — <https://mudlbum.github.io/sonmat-kitchen/>
- 한국어 — <https://mudlbum.github.io/sonmat-kitchen/ko/>

**Zero dependencies.** `node scripts/build.mjs` is the entire build — no `npm install`,
no lockfile, no transitive supply chain. That is deliberate: the site publishes
unattended every morning, and the smallest build is the one with the fewest ways to
fail at 07:10 while nobody is watching.

---

## First-time setup

1. **Push this repo** to `mudlbum/sonmat-kitchen`.
2. **Settings → Pages →** Build and deployment → Source: **GitHub Actions**.
   (Not "Deploy from a branch" — `deploy.yml` uses `actions/deploy-pages`, which
   only works with the Actions source. Choosing the branch option produces a
   blank site.)
3. **Settings → Actions → General → Workflow permissions → Read and write
   permissions.** The daily job cannot push its commit or open the low-queue
   issue without this, and the failure looks like a permissions error deep in the
   run rather than anything to do with recipes.
4. **Actions → "Publish daily recipe" → Run workflow.** Proves the whole chain
   without waiting for the schedule. It reports "already published today" if
   today's recipe has gone out — that is the guard working, not a failure.

---

## How publishing works

```
data/recipes/*.json      queue, published in filename order (Korean)
data/en/<slug>.json      the English edition, addressed by slug
data/images.json         which photograph each recipe gets
        │  scripts/publish.mjs  — stamps publishedAt, moves the file, commits
        ▼
content/published/*.json  published set — this is what the site renders from
        │
        │  scripts/build.mjs   — renders /en at the root and /ko/, from one set
        ▼                        of functions, plus feeds, sitemap, health.json
dist/                     static output uploaded to Pages
```

There is no database and no state file. What has been published is exactly what
sits in `content/published/`, and that is visible in git history.

| What | When | Where |
|---|---|---|
| Publish one recipe | 07:10 KST daily (`10 22 * * *` UTC) | `.github/workflows/publish.yml` |
| Build and deploy | after each publish, and on push to `main` | `.github/workflows/deploy.yml` |

GitHub's scheduled runs are best-effort and commonly run 5–20 minutes late under
load. Treat the posted time as "shortly after 07:10", not "at 07:10".

### One recipe, two languages, one photo — or nothing

Three things go out together every morning, and any one of them missing stops the
run before a file is moved:

- the Korean text,
- the English edition in `data/en/<slug>.json`, with the same number of steps,
  tips and ingredient groups,
- a photograph.

`publish.mjs` refuses first, with the filename in the message. `build.mjs`
refuses again independently. `check.mjs` then verifies the built output: equal
page counts in both trees, reciprocal `hreflang`, a hero photo and an `image`
array in the Recipe JSON-LD on every recipe page. There is no path by which an
English page ships without its Korean twin, or a recipe appears with a blank
hero.

### Photographs

Photos come from [Pexels](https://www.pexels.com) and are declared in
[`data/images.json`](data/images.json). They are **served from the Pexels CDN,
not committed here** — which is what keeps the build dependency-free and the repo
small, and lets `srcset` work without ever running an image pipeline.

Each entry is labelled `exact` or `reference`:

- **exact** — the photo shows this dish. The caption credits the photographer.
- **reference** — the photo shows the right family of dish or the main
  ingredient, but not that exact recipe. The caption says so, in both languages.

Never relabel a reference photo as exact. It is the same rule as the
not-yet-kitchen-tested disclosure: the page does not imply something it cannot
support.

`byCategory` in the same file is the safety net. A recipe added later with no
entry of its own still gets a photo, picked from its category pool by a hash of
the slug — deterministic, so it never changes between builds, and spread across
the pool so consecutive recipes do not repeat. That is what makes "a new photo
every day" hold without anyone curating one first.

To self-host the images later, `srcUrl()` in `scripts/lib/images.mjs` is the only
function that has to change.

### Themes

Light is the default, always — a first-time visitor gets the light site whatever
their OS is set to. The header toggle switches to dark and stores the choice in
`localStorage` under `sk-theme`. A tiny script in `<head>` applies it before the
body paints, so returning visitors get no flash of the wrong theme. `check.mjs`
fails the build if any page ships with `data-theme` already set, which would make
dark the default by accident.

### The queue

`scripts/publish.mjs` opens a GitHub issue (label `queue-low`) once fewer than
**7** recipes remain, and comments on that same issue on later days instead of
filing a new one every morning. If the queue empties completely, the morning run
fails loudly and the Actions run goes red.

### Guards

- **Same-day re-run** — publishing twice on one date is refused unless you pass
  `--force`. A scheduled run plus a manual "Run workflow" click produces one
  recipe, not two.
- **Unknown category** — refused before the file is moved, since a category with
  no entry in `scripts/lib/i18n.mjs` has no English name and no photo pool.
- **Build gate** — the workflow rebuilds the site before committing. A malformed
  recipe fails the run instead of shipping a broken page.
- **Output checks** — `scripts/check.mjs` runs before deploy and fails on invalid
  feed/sitemap XML, unparsable JSON-LD, missing canonicals, duplicate titles or
  descriptions, more or fewer than one `<h1>`, an image without `alt` or without
  width/height, a non-reciprocal `hreflang`, or an internal link that does not
  resolve to a built file.

### Keeping the schedule alive

GitHub disables scheduled workflows on public repos after **60 days without
repository activity**. This job commits on every publish, so it keeps itself
alive as long as it keeps publishing. If everything stops at once, check
**Actions** first — a disabled schedule is the usual cause.

---

## Local use

```bash
node scripts/build.mjs        # build to dist/
node scripts/check.mjs        # validate dist/
node scripts/serve.mjs        # preview → http://localhost:4321/sonmat-kitchen/

node scripts/publish.mjs --dry-run          # what would go out today
node scripts/publish.mjs --count 3          # publish three at once
node scripts/publish.mjs --date 2026-09-01  # publish under a specific date
```

## Adding recipes

Drop a new `.json` file into `data/recipes/`. Filenames set the publish order —
see [`data/recipes/README.md`](data/recipes/README.md) for the schema. Every
recipe also needs an English file at `data/en/<slug>.json`.

## Monitoring

`/health.json` is built on every deploy so a health check can read one request
instead of scraping the feed:

```json
{ "languages": ["en", "ko"], "publishedCount": 5, "pageCount": 30,
  "queueRemaining": 23, "queueHealthy": true, "imagesAssigned": 5,
  "latest": { "title": "된장찌개", "titleEn": "Doenjang Jjigae",
              "publishedAt": "2026-08-19", "image": "https://images.pexels.com/..." },
  "daysSinceLatest": 0 }
```

`daysSinceLatest` ≥ 2 means publishing has stalled.

---

## Editorial honesty

Every recipe page carries a disclosure saying it was written from standard Korean
cooking method and **has not yet been kitchen-tested by a person**. That is true
today. There is no automated path that flips a recipe to "verified" — a person
has to cook it and set the flag by hand. See `/editorial/` on the live site.

Do not remove or soften that notice without actually testing the recipes. For a
food site the claim matters more than it does for most content.

The photo labelling follows from the same principle, and so does the translation
note on `/editorial/`: the English edition is a translation of the Korean, and
says so.

## Korean text

Any Korean template string that places a particle after an interpolated value
**must** go through `josa()` in `scripts/lib/korean.mjs`. Hard-coding a particle
produces 반찬이 / 찌개이 style errors, which is the single most visible sign that
Korean was assembled by a program.

## Still to do

- Search Console (URL-prefix property for `/sonmat-kitchen/`) and Naver Search
  Advisor; submit **both** `sitemap.xml` and the two `feed.xml` files to Naver.
- Kitchen-test the queue and start setting verification flags.
- Replace `reference` photos with `exact` ones as better stock images appear, or
  with your own photographs — which would let the captions say so.
- AdSense: `site.config.json` has an `adsense` block and the ad slots render
  nothing until `clientId` is set. There is no `ads.txt` on purpose; a
  placeholder publisher ID is worse than no file. Apply once there is a real
  posting history behind the site, not before.
