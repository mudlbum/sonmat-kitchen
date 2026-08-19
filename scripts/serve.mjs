#!/usr/bin/env node
// Tiny preview server. Serves dist/ under the site's base path so local links
// behave exactly as they will on GitHub Pages.
//   node scripts/serve.mjs   →  http://localhost:4321/sonmat-kitchen/

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(await readFile(path.join(ROOT, 'site.config.json'), 'utf8'));
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === cfg.base) p = `${cfg.base}/`;
  if (!p.startsWith(`${cfg.base}/`)) {
    res.writeHead(302, { Location: `${cfg.base}/` });
    return res.end();
  }
  p = p.slice(cfg.base.length);
  if (p.endsWith('/')) p += 'index.html';

  try {
    const body = await readFile(path.join(DIST, p));
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(path.join(DIST, '404.html'));
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  }
}).listen(PORT, () => console.log(`preview → http://localhost:${PORT}${cfg.base}/`));
