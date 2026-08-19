#!/usr/bin/env node
// Move the next recipe(s) out of the queue and into the published set.
//
// The queue is data/recipes/*.json, published in filename order. Publishing is
// a file move plus a publishedAt stamp — there is no database and no state file
// to drift out of sync with git.
//
//   node scripts/publish.mjs                 publish one, for today (KST)
//   node scripts/publish.mjs --count 5       seed several at once
//   node scripts/publish.mjs --dry-run       show what would happen
//   node scripts/publish.mjs --force         publish even if today already has one
//   node scripts/publish.mjs --date 2026-08-20   override the date

import { readFile, readdir, writeFile, unlink, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageFor } from './lib/images.mjs';
import { CATEGORIES } from './lib/i18n.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_DIR = path.join(ROOT, 'data', 'recipes');
const PUBLISHED_DIR = path.join(ROOT, 'content', 'published');
const EN_DIR = path.join(ROOT, 'data', 'en');

const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));

/* ------------------------------------------------------------------- args */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const count = Math.max(1, Number(value('count', '1')) || 1);
const dryRun = flag('dry-run');
const force = flag('force');

const KST_OFFSET_MIN = 9 * 60;
const todayKst = () => new Date(Date.now() + KST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
const date = value('date', todayKst());

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`--date must be YYYY-MM-DD, got "${date}"`);
  process.exit(1);
}

/* ------------------------------------------------------------ ci plumbing */

async function setOutput(key, val) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, `${key}=${String(val).replace(/\n/g, ' ')}\n`);
}

async function summary(md) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
}

const listJson = async (dir) =>
  existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith('.json')).sort() : [];

/* ------------------------------------------------------------------- main */

await mkdir(PUBLISHED_DIR, { recursive: true });

const queue = await listJson(QUEUE_DIR);
const publishedFiles = await listJson(PUBLISHED_DIR);

// Guard against a manual re-run double-publishing. A scheduled run and a
// "Run workflow" click on the same morning should produce one recipe, not two.
if (!force) {
  for (const f of publishedFiles) {
    const r = JSON.parse(await readFile(path.join(PUBLISHED_DIR, f), 'utf8'));
    if (r.publishedAt === date) {
      console.log(`already published on ${date}: ${r.title} (${f})`);
      console.log('nothing to do — pass --force to publish another anyway');
      await setOutput('published_count', 0);
      await setOutput('queue_remaining', queue.length);
      await setOutput('need_issue', queue.length < cfg.queueWarnThreshold);
      await summary(`### 발행 없음\n\n${date}에 이미 **${r.title}**이(가) 나갔습니다. 대기열 ${queue.length}개.`);
      process.exit(0);
    }
  }
}

if (!queue.length) {
  console.error('QUEUE EMPTY — no recipes left in data/recipes/');
  await setOutput('published_count', 0);
  await setOutput('queue_remaining', 0);
  await setOutput('need_issue', true);
  await summary('### ⚠ 대기열이 비었습니다\n\n`data/recipes/`에 남은 레시피가 없어 오늘은 발행하지 못했습니다.');
  process.exit(1);
}

const take = queue.slice(0, count);
const publishedTitles = [];
const publishedTitlesEn = [];
const photos = [];

for (const file of take) {
  const src = path.join(QUEUE_DIR, file);
  const recipe = JSON.parse(await readFile(src, 'utf8'));

  // The English edition lives in data/en/<slug>.json and stays there when the
  // Korean file moves. It wins over any inline "en" block left in the recipe.
  if (recipe.slug) {
    const enPath = path.join(EN_DIR, `${recipe.slug}.json`);
    if (existsSync(enPath)) recipe.en = JSON.parse(await readFile(enPath, 'utf8'));
  }

  if (!recipe.slug) {
    console.error(`${file}: missing slug — refusing to publish`);
    process.exit(1);
  }
  if (publishedFiles.includes(file)) {
    console.error(`${file}: already exists in content/published — refusing to overwrite`);
    process.exit(1);
  }
  // A category with no entry in i18n.mjs has no English name and no photo pool,
  // so it would break the build one step later — after this file had already
  // been moved. Catch it before anything on disk changes.
  if (!CATEGORIES[recipe.category]) {
    console.error(`${file}: unknown category "${recipe.category}"`);
    console.error(`  known: ${Object.keys(CATEGORIES).join(", ")}`);
    console.error("  add it to CATEGORIES in scripts/lib/i18n.mjs and give it a pool in data/images.json");
    process.exit(1);
  }

  // Both editions publish together or neither does. The build enforces this too,
  // but failing here names the file and stops before anything is moved — much
  // easier to read at 07:10 than a build error three steps later.
  const enOk =
    recipe.en &&
    recipe.en.title &&
    Array.isArray(recipe.en.steps) &&
    recipe.en.steps.length === recipe.steps.length &&
    Array.isArray(recipe.en.ingredients) &&
    recipe.en.ingredients.length === recipe.ingredients.length;
  if (!enOk) {
    console.error(`${file}: no usable English edition — the English must publish with the Korean`);
    console.error(`  add data/en/${recipe.slug}.json with title, summary, intro, ingredients and steps, matching the Korean counts`);
    process.exit(1);
  }

  // Every recipe gets its own photograph. A hand-picked entry in
  // data/images.json is preferred; failing that the category pool supplies one,
  // chosen deterministically by slug so it never changes between builds.
  const photo = imageFor(recipe);
  if (!photo) {
    console.error(`${file}: no photograph — add "${recipe.slug}" to data/images.json,`);
    console.error(`  or add a byCategory pool for "${recipe.category}"`);
    process.exit(1);
  }
  photos.push(`${photo.id}${photo.assigned ? "" : " (category pool)"}`);

  recipe.publishedAt = date;
  publishedTitles.push(recipe.title);
  publishedTitlesEn.push(recipe.en.title);

  if (dryRun) {
    console.log(`[dry-run] ${file} → content/published/${file}  (publishedAt: ${date})`);
    continue;
  }

  // Write the stamped copy first, then drop the queue original. If the process
  // dies between the two, the recipe is published twice-listed rather than lost.
  // Note: this is deliberately write-then-unlink, NOT rename. A rename onto the
  // destination would clobber the freshly stamped file with the unstamped
  // original, and the build would then reject it for a missing publishedAt.
  await writeFile(path.join(PUBLISHED_DIR, file), `${JSON.stringify(recipe, null, 2)}\n`);
  await unlink(src);
  console.log(`published ${recipe.title} / ${recipe.en.title}  (${file}, photo ${photo.id})`);
}

const remaining = (await listJson(QUEUE_DIR)).length;
const needIssue = remaining < cfg.queueWarnThreshold;

await setOutput('published_count', dryRun ? 0 : take.length);
await setOutput('published_titles', publishedTitles.map((t, i) => `${t} / ${publishedTitlesEn[i]}`).join(', '));
await setOutput('queue_remaining', remaining);
await setOutput('need_issue', needIssue);

await summary(
  `### 오늘 발행\n\n` +
    take.map((f, i) => `- **${publishedTitles[i]}** / **${publishedTitlesEn[i]}** · 사진 ${photos[i]} · \`${f}\``).join('\n') +
    `\n\n대기열 **${remaining}개** 남음 (경고 기준 ${cfg.queueWarnThreshold}개)` +
    (needIssue ? '\n\n⚠ 기준 아래입니다 — 이슈를 엽니다.' : ''),
);

console.log(`queue: ${remaining} remaining${needIssue ? '  ⚠ below threshold — issue will be opened' : ''}`);
