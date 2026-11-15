// Usage: node build-moments.mjs <posts.json> <page.html> <mediaPrefix> <localVideoIds|all>
// Rewrites everything between <!--MOMENTS-START--> and <!--MOMENTS-END--> in page.html.
import { readFile, writeFile } from 'node:fs/promises';

const [postsPath, pagePath, prefix, localArg] = process.argv.slice(2);
const posts = JSON.parse(await readFile(postsPath, 'utf8'));
const localVideos = localArg === 'all' ? null : new Set(localArg.split(','));

// id suffix -> [title, caption, alt, object-position, thumbnail-second]
const C = {
  '089664': ['Industry panellist', 'Back at BCU on a Women in STEM panel: degree vs experience, AI as threat or opportunity, and why networking matters.', 'Alex speaking on an industry panel at BCU, gesturing as he answers', '78% 70%'],
  '480769': ['Birmingham Tech Week', 'The Engineering & Developer Conference with fellow KTP Associates. The big theme: how AI is changing the way we work.', 'Alex holding his Birmingham Tech Week badge reading Alex Chavez Gamarra, ECAM Engineering', '58% 50%'],
  '241152': ["CombiLive on Lima's streets", 'The Seed Fund took CombiLive home to Lima, to test it with a real combi driver.', 'Video: testing CombiLive in Lima, shown by the CombiLive logo', '50% 50%', 3],
  '551616': ['Training at Ashorne Hill', 'Four days of project management and leadership training with KTP Associates from across the UK.', 'Alex with a fellow KTP Associate at Ashorne Hill', '60% 50%'],
  '592320': ['Two months at ECAM', 'A new city, a new role, and settling into my KTP as Digital Transformation & AI Integration Engineer.', 'Alex with a colleague in front of the ECAM Engineering sign', '50% 30%'],
  '208512': ['My first LMC', 'My first Local Management Committee, where ECAM and BCU review how the KTP is going.', 'Alex with the ECAM and BCU KTP team', '52% 50%'],
  '505856': ['Graduation day', 'Graduating alongside friends, with academics and friends cheering in the audience.', 'Alex in his graduation gown by the canal in Birmingham', '50% 30%'],
  '257537': ['First Class Honours', '78.48%, after four years of juggling university with work.', "Alex's BSc Computer Science First Class Honours certificate", '50% 45%'],
  '655040': ['Two awards, one night', '1st place for my final year poster, then called up again as a Cal Henderson Seed Fund winner.', 'Alex on stage at BCU Innovation Fest 2026 receiving first place', '50% 62%'],
  '694016': ['The BCU film', "BCU's marketing team made a short film about CombiLive.", 'Video: the BCU film about CombiLive', '50% 50%', 6],
  '460354': ['Meeting Cal Henderson', "Presenting my poster as a Seed Fund winner during Cal Henderson's visit to BCU.", 'Alex smiling beside Cal Henderson during his visit to BCU', '45% 40%'],
  '302272': ['1 of 3 Seed Fund winners', '£5,000 from the Cal Henderson Innovation Seed Fund. This is my pitch video.', 'Video: the CombiLive pitch for the Cal Henderson Innovation Seed Fund', '20% 50%', 2],
  '505730': ['Talking placements', 'Telling Business IT students what a placement year at BCU is really like.', 'Alex presenting to students in a BCU classroom', '50% 45%'],
  '527616': ['Exhibitly', 'A UX design project: an app connecting West Midlands artists with local venues.', 'The Exhibitly app welcome screen, a robin on autumn leaves', '50% 22%'],
  '692736': ['Last day of placement', 'A year as a systems developer: the Assessment Health Check App, Innovation Fest and AI projects.', 'Alex with BCU colleagues at the end of his placement', '0% 50%'],
  '605376': ['Innovation Fest 2025', 'Back as a placement student, supporting friends and coaching teams for the boardroom pitch.', 'Alex and a friend at BCU Innovation Fest 2025', '60% 40%'],
  '528579': ['A day in my life', 'A short film with BCU Careers+ about my placement year.', 'Video: a day in the life of a placement student at BCU', '50% 50%', 4],
  '034049': ['Six months in', 'Building tools for staff and students with Power Apps, SharePoint and Python.', 'Birmingham City University campus building', '30% 55%'],
  '136704': ['AI Symposium', "Helping organise BCU's AI Symposium, and learning from every talk.", 'Alex with the AI Symposium organising team holding certificates', '50% 30%'],
  '506560': ['Engineering micro-placement', 'Testing carbon-fibre composites on an Instron machine at Penta Pattern & Model.', 'An Instron universal testing machine', '35% 50%'],
  '940416': ['Placement begins', 'Starting as a Teaching and Learning Systems Developer, building a submissions tracker in Power Apps.', 'Birmingham City University logo', '50% 50%'],
  '705729': ['Innovation Fest in Wuhan', 'Representing BCU at the Innovation Fest at BIFCA in Wuhan, China.', 'Alex with students in Wuhan, China, behind a large sign', '50% 50%'],
  '124736': ['Santander pitch', '4th place in Stage 4 and 3rd in Stage 3 of the Santander pitch contest.', 'Alex receiving an award at BCU Innovation Fest 2024', '0% 50%'],
};

// still images that replace the default thumbnail (first photo, poster or video frame)
const THUMB = {
  '694016': { file: 'combilive-cover.jpg', style: 'object-position:58% 50%;transform:scale(1.34)' },
  '241152': { file: 'combilive-logo.png', style: 'object-fit:contain;background:#000', poster: true },
  '480769': { file: '480769-badge.jpg', style: 'object-position:50% 30%' },
  '302272': { file: '302272-poster.jpg', style: 'object-position:20% 50%' },
};
// video files that replace the downloaded LinkedIn copy
const VIDEO = {};
// videos owned by someone else: never hosted here, the card links to the original post instead
const LINK_ONLY = new Set(['694016']); // BCU's CombiLive film (BCU copyright)

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const month = d => new Date(d + 'T12:00:00Z').toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

let html = '\n', year = null;
for (const p of posts) {
  const key = p.id.slice(-6);
  const [title, caption, alt, pos, t] = C[key] ?? ['Post', '', 'LinkedIn post photo', '50% 50%'];
  const y = p.date.slice(0, 4);
  if (y !== year) { html += `    <div class="year" aria-hidden="true"><span>${y}</span></div>\n`; year = y; }

  const th = THUMB[key];
  const videoFile = VIDEO[key] ?? p.videoFile;
  const local = videoFile && !LINK_ONLY.has(key) && (localVideos === null || localVideos.has(key));
  const playCls = th?.poster ? 'play low' : 'play';
  const still = (fallback, altText) => th
    ? `<img src="${prefix}${th.file}" alt="${esc(altText)}" loading="lazy" style="${th.style}">`
    : `<img src="${prefix}${fallback}" alt="${esc(altText)}" loading="lazy" style="object-position:${pos}">`;

  let frame;
  if (local) {
    const src = `${prefix}${videoFile}`;
    frame = `<button class="frame press" type="button" data-video="${src}" data-post="${p.url}" aria-label="Play video: ${esc(title)}">`
      + (th ? still(null, '') : `<video muted playsinline preload="metadata" src="${src}#t=${t ?? 3}" tabindex="-1" aria-hidden="true"></video>`)
      + `<span class="kind">Video</span><span class="${playCls}"></span></button>`;
  } else if (videoFile) {
    frame = `<a class="frame press" href="${p.url}" target="_blank" rel="noopener" aria-label="Watch on LinkedIn: ${esc(title)}">`
      + still(p.posterFile ?? p.imageFile, alt) + `<span class="kind">Video</span><span class="${playCls}"></span></a>`;
  } else {
    frame = `<a class="frame press" href="${p.url}" target="_blank" rel="noopener" aria-label="Open post: ${esc(title)}">`
      + still(p.imageFile, alt) + `</a>`;
  }

  html += `    <article class="moment">
      ${frame}
      <div class="row-meta"><span class="label">${month(p.date)}</span><span class="react"><b>${p.reactions}</b> reactions · ${plural(p.comments, 'comment')}</span></div>
      <h3>${esc(title)}</h3>
      <p>${esc(caption)}</p>
      <a class="go" href="${p.url}" target="_blank" rel="noopener">${p.videoFile ? 'Watch on LinkedIn' : 'Read the post'} ↗</a>
    </article>\n`;
}

const page = await readFile(pagePath, 'utf8');
const MARKERS = /<!--MOMENTS-START-->[\s\S]*?<!--MOMENTS-END-->/;
if (!MARKERS.test(page)) { console.error('MOMENTS-START/END markers not found in ' + pagePath); process.exit(1); }
const out = page.replace(MARKERS, `<!--MOMENTS-START-->${html}  <!--MOMENTS-END-->`);
if (out === page) { console.log(`${posts.length} moments, page already up to date`); process.exit(0); }
await writeFile(pagePath, out);
console.log(`wrote ${posts.length} moments`);
