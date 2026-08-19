# 손맛 키친 (Sonmat Kitchen)

A Korean home-cooking blog that publishes one recipe every morning at **07:10 KST**,
served as a static site from GitHub Pages at
<https://mudlbum.github.io/sonmat-kitchen/>.

**Zero dependencies.** `node scripts/build.mjs` is the entire build — no `npm install`,
no lockfile, no transitive supply chain. That is deliberate: the site publishes
unattended every morning, and the smallest build is the one with the fewest ways to
fail at 07:10 while nobody is watching.

---

## First-time setup

1. **Push this repo** to `mudlbum/sonmat-kitchen`.
2. **Settings → Pages →** Build and deployment → Source: **GitHub Actions**.
3. **Settings → Actions → General → Workflow permissions →** **Read and write
   permissions**. The daily job needs this to commit the published recipe and to
   open the low-queue issue.
4. **Actions → "Publish daily recipe" → Run workflow.** Proves the chain end to end
   without waiting for the schedule. (It will report "already published today" if
   today's recipe went out — that is the guard working, not a failure.)

The site is live at `https://mudlbum.github.io/sonmat-kitchen/` a minute or two later.

---

## How publishing works

```
data/recipes/*.json      queue, published in filename order
        │
        │  scripts/publish.mjs  — stamps publishedAt, moves the file, commits
        ▼
content/published/*.json  published set — this is what the site renders from
        │
        │  scripts/build.mjs
        ▼
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

### The queue

`scripts/publish.mjs` opens a GitHub issue (label `queue-low`) once fewer than
**7** recipes remain, and comments on that same issue on later days instead of
filing a new one every morning. If the queue empties completely, the morning run
fails loudly and the Actions run goes red.

### Guards

- **Same-day re-run** — publishing twice on one date is refused unless you pass
  `--force`. A scheduled run plus a manual "Run workflow" click produces one
  recipe, not two.
- **Build gate** — the workflow rebuilds the site before committing. A malformed
  recipe fails the run instead of shipping a broken page.
- **Output checks** — `scripts/check.mjs` runs before deploy and fails on invalid
  feed/sitemap XML, unparsable JSON-LD, missing canonicals, or an internal link
  that does not resolve to a built file.

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
see [`data/recipes/README.md`](data/recipes/README.md) for the schema.

## Monitoring

`/health.json` is built on every deploy so a health check can read one request
instead of scraping the feed:

```json
{ "publishedCount": 5, "queueRemaining": 23, "queueHealthy": true,
  "latest": { "title": "된장찌개", "publishedAt": "2026-08-19" },
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

## Korean text

Any Korean template string that places a particle after an interpolated value
**must** go through `josa()` in `scripts/lib/korean.mjs`. Hard-coding a particle
produces 반찬이 / 찌개이 style errors, which is the single most visible sign that
Korean was assembled by a program.

## Still to do

- **Photos.** The biggest gap. Recipe rich results in Google effectively require
  an image, and there is currently no `image` field in the JSON-LD because
  shipping a placeholder would be worse than shipping nothing.
- Search Console + Naver Search Advisor registration; submit both `sitemap.xml`
  and `feed.xml` to Naver.
- Kitchen-test the queue and start setting verification flags.
