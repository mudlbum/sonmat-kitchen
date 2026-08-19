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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_DIR = path.join(ROOT, 'data', 'recipes');
const PUBLISHED_DIR = path.join(ROOT, 'content', 'published');

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

for (const file of take) {
  const src = path.join(QUEUE_DIR, file);
  const recipe = JSON.parse(await readFile(src, 'utf8'));

  if (!recipe.slug) {
    console.error(`${file}: missing slug — refusing to publish`);
    process.exit(1);
  }
  if (publishedFiles.includes(file)) {
    console.error(`${file}: already exists in content/published — refusing to overwrite`);
    process.exit(1);
  }

  recipe.publishedAt = date;
  publishedTitles.push(recipe.title);

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
  console.log(`published ${recipe.title}  (${file})`);
}

const remaining = (await listJson(QUEUE_DIR)).length;
const needIssue = remaining < cfg.queueWarnThreshold;

await setOutput('published_count', dryRun ? 0 : take.length);
await setOutput('published_titles', publishedTitles.join(', '));
await setOutput('queue_remaining', remaining);
await setOutput('need_issue', needIssue);

await summary(
  `### 오늘 발행\n\n` +
    take.map((f, i) => `- **${publishedTitles[i]}** \`${f}\``).join('\n') +
    `\n\n대기열 **${remaining}개** 남음 (경고 기준 ${cfg.queueWarnThreshold}개)` +
    (needIssue ? '\n\n⚠ 기준 아래입니다 — 이슈를 엽니다.' : ''),
);

console.log(`queue: ${remaining} remaining${needIssue ? '  ⚠ below threshold — issue will be opened' : ''}`);
