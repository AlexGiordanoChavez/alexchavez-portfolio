// Refreshes LinkedIn reaction and comment counts for the posts in the Moments section.
// Usage: node scripts/refresh-counts.mjs data/posts.json
//
// - Reads each post's public LinkedIn embed page (no login, no API key, no AI).
// - Updates reactions/comments in data/posts.json only when they changed.
// - A post that can't be read keeps its previous numbers.
// - Exits with an error only if every post failed (e.g. LinkedIn blocked the request),
//   so a scheduled run that achieved nothing shows up as failed on GitHub.
import { readFile, writeFile } from 'node:fs/promises';

const path = process.argv[2] ?? 'data/posts.json';
const posts = JSON.parse(await readFile(path, 'utf8'));
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' };
const PAUSE_MS = 400; // be polite: one request at a time with a short gap
const sleep = ms => new Promise(r => setTimeout(r, ms));

let changed = 0, failed = 0;
for (const p of posts) {
  try {
    const res = await fetch(`https://www.linkedin.com/embed/feed/update/urn:li:${p.urn}`, { headers: UA });
    const html = (await res.text()).replace(/\n/g, ' ');
    const r = html.match(/data-num-reactions="(\d+)"/)?.[1];
    const c = html.match(/(\d+)\s+Comments?/)?.[1];
    if (!res.ok || r === undefined) throw new Error(`HTTP ${res.status}`);
    const reactions = +r, comments = c === undefined ? 0 : +c;
    if (reactions !== p.reactions || comments !== p.comments) {
      console.log(`${p.date}  ${p.reactions}→${reactions} reactions, ${p.comments}→${comments} comments`);
      p.reactions = reactions; p.comments = comments; changed++;
    }
  } catch (e) {
    failed++;
    console.log(`${p.date}  could not read (${e.message}); keeping previous numbers`);
  }
  await sleep(PAUSE_MS);
}

if (changed) await writeFile(path, JSON.stringify(posts, null, 2) + '\n');
console.log(`\n${posts.length} posts checked, ${changed} changed, ${failed} could not be read`);
if (failed === posts.length) { console.error('Every post failed; LinkedIn may be blocking this server.'); process.exit(1); }
