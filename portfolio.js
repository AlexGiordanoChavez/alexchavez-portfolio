// One entrance per section; gaps shrink down the list so it settles instead of ticking.
const delay = i => Math.round(260 * (1 - Math.pow(0.8, i)));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('on');
    e.target.querySelectorAll('.rv').forEach((el, i) => {
      el.style.transitionDelay = delay(i) + 'ms';
      el.classList.add('on');
    });
    io.unobserve(e.target);
  });
}, { threshold: 0.1 });
document.querySelectorAll('.sheet').forEach(s => io.observe(s));

// Moments: arrow buttons
const strip = document.getElementById('strip');
const [back, fwd] = document.querySelectorAll('.arrows button');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const syncArrows = () => {
  back.disabled = strip.scrollLeft < 8;
  fwd.disabled = strip.scrollLeft + strip.clientWidth > strip.scrollWidth - 8;
};
document.querySelectorAll('.arrows button').forEach(b => b.addEventListener('click', () => {
  strip.scrollBy({ left: Number(b.dataset.dir) * strip.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
}));
strip.addEventListener('scroll', syncArrows, { passive: true });
syncArrows();

// Moments: jump straight to a year
document.querySelectorAll('.strip .year span').forEach(sp => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = sp.textContent;
  b.addEventListener('click', () => {
    const pad = parseFloat(getComputedStyle(strip).paddingInlineStart) || 0;
    strip.scrollTo({ left: sp.closest('.year').offsetLeft - pad, behavior: reduce ? 'auto' : 'smooth' });
  });
  document.querySelector('.jumps').append(b);
});

// Moments: video pop-up
const dlg = document.getElementById('player');
const vid = document.getElementById('player-video');
document.querySelectorAll('[data-video]').forEach(btn => btn.addEventListener('click', () => {
  vid.src = btn.dataset.video;
  document.getElementById('player-link').href = btn.dataset.post;
  dlg.showModal();
  vid.play().catch(() => {});
}));
const closePlayer = () => dlg.close();
document.getElementById('player-close').addEventListener('click', closePlayer);
dlg.addEventListener('click', e => { if (e.target === dlg) closePlayer(); });
dlg.addEventListener('close', () => { vid.pause(); vid.removeAttribute('src'); vid.load(); });
