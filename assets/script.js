/* CAMVISUALS – gemeinsames Skript für alle Seiten */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);
let currentLang = 'de';

/* ── META (Title/Description je Seite und Sprache) ── */
function updateMeta() {
  const m = window.PAGE_META;
  if (!m) return;
  const t = m[currentLang] || m.de;
  document.title = t[0];
  const d = document.querySelector('meta[name="description"]');
  if (d) d.setAttribute('content', t[1]);
}

/* ── TEXT: letzte zwei Wörter eines Satzes zusammenhalten (keine einzelnen Wörter in der letzten Zeile) ── */
function tidyText() {
  document.querySelectorAll('.intro, .svc-card p, .steps p, .contact-hint, .faq p, .legal p, .team-sub').forEach(el => {
    const nodes = [...el.childNodes];
    nodes.forEach((n, i) => {
      if (n.nodeType !== 3) return;
      const next = nodes[i + 1];
      if (next && !(next.nodeType === 1 && next.tagName === 'BR')) return;
      n.nodeValue = n.nodeValue.replace(/\s+(\S+)\s*$/, '\u00A0$1');
    });
  });
}

/* ── SPRACH-STEUERUNG ── */
function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  try { localStorage.setItem('camvisuals_lang', lang); } catch (e) {}

  document.querySelectorAll('.lang-btn').forEach(btn => {
    const on = btn.textContent.trim().toLowerCase() === lang;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  document.querySelectorAll('[data-de]').forEach(el => {
    const text = el.getAttribute('data-' + lang);
    if (text) el.innerHTML = text;
  });

  updateMeta();
  tidyText();
  const tt = document.getElementById('toTop');
  if (tt) tt.setAttribute('aria-label', lang === 'de' ? 'Nach oben' : 'Back to top');

  const activeFilterBtn = document.querySelector('.filter-btn.on');
  if (activeFilterBtn) {
    const match = (activeFilterBtn.getAttribute('onclick') || '').match(/filterWork\('([^']+)'/);
    if (match) filterWork(match[1], activeFilterBtn);
  }
}

function chooseLanguage(lang) { setLanguage(lang); closeLangPopup(); }

function closeLangPopup() {
  const popup = document.getElementById('langPopup');
  if (popup) popup.classList.remove('show');
  try { sessionStorage.setItem('camvisuals_popup_seen', '1'); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  let savedLang = null, popupSeen = null;
  try { savedLang = localStorage.getItem('camvisuals_lang'); } catch (e) {}
  try { popupSeen = sessionStorage.getItem('camvisuals_popup_seen'); } catch (e) {}

  if (savedLang === 'de' || savedLang === 'en') {
    setLanguage(savedLang);
  } else {
    setLanguage('de');
    const popup = document.getElementById('langPopup');
    if (popup && !popupSeen) setTimeout(() => popup.classList.add('show'), 600);
  }

  document.querySelectorAll('.wi').forEach(w => {
    const t = w.querySelector('.wo-title');
    if (t) w.setAttribute('aria-label', t.textContent.trim() + ' – Video abspielen');
  });
});

/* ── CURSOR (nur Geräte mit Maus) ── */
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.documentElement.classList.add('has-cursor');
  const cur = document.getElementById('cur');
  const curR = document.getElementById('curR');
  let mx = 0, my = 0, rx = 0, ry = 0, raf = null;

  const tick = () => {
    rx += (mx - rx) * .1;
    ry += (my - ry) * .1;
    curR.style.left = rx + 'px';
    curR.style.top = ry + 'px';
    raf = (Math.abs(mx - rx) > .1 || Math.abs(my - ry) > .1) ? requestAnimationFrame(tick) : null;
  };

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + 'px';
    cur.style.top = my + 'px';
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  const big = () => { cur.style.width = cur.style.height = '14px'; curR.style.width = curR.style.height = '50px'; };
  const small = () => { cur.style.width = cur.style.height = '6px'; curR.style.width = curR.style.height = '28px'; };
  document.querySelectorAll('.wi, .contact-email, .nav-links a, .nav-logo, .btn, .team-link, .filter-btn, .lang-btn').forEach(el => {
    el.addEventListener('mouseenter', big);
    el.addEventListener('mouseleave', small);
  });
}

/* ── FADE-IN ON SCROLL ── */
const fadeIO = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('vis'), i * 70);
      fadeIO.unobserve(e.target);
    }
  });
}, { threshold: .08 });

function initFades() {
  document.querySelectorAll('.fade-up:not(.vis)').forEach(el => {
    // Sichtbarer Inhalt sofort einblenden, der Rest beim Scrollen
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.95 && r.bottom > 0) { el.classList.add('vis'); return; }
    fadeIO.observe(el);
  });
}
initFades();

/* ── HERO-VIDEO (nur Startseite) ── */
const heroVideo = document.getElementById('heroVideo');
function heroPlay() { if (heroVideo) heroVideo.play().catch(() => {}); }

if (heroVideo) {
  if (reduceMotion || saveData) {
    heroVideo.pause();
    heroVideo.removeAttribute('autoplay');
    heroVideo.querySelectorAll('source').forEach(s => s.remove());
    heroVideo.load();
  } else {
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    heroPlay();
    heroVideo.addEventListener('loadedmetadata', heroPlay);
    heroVideo.addEventListener('canplay', heroPlay);
    heroVideo.addEventListener('playing', () => heroVideo.classList.add('is-playing'));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) heroPlay(); });
    document.addEventListener('touchstart', heroPlay, { once: true, passive: true });
  }
}

/* ── THUMBNAILS (nur Arbeiten): erst laden, wenn sichtbar ── */
const thumbs = document.querySelectorAll('.wi-thumb');
if (thumbs.length) {
  const thumbIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.getAttribute('src')) {
          v.setAttribute('src', v.dataset.src);
          v.preload = reduceMotion || saveData ? 'metadata' : 'auto';
        }
        if (!reduceMotion && !saveData) v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { rootMargin: '200px' });

  thumbs.forEach(v => {
    v.muted = true;
    v.addEventListener('timeupdate', () => { if (v.currentTime > 5) v.currentTime = 0; });
    thumbIO.observe(v);
  });
}

/* ── FILTER (nur Arbeiten) ── */
function filterWork(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');

  const items = document.querySelectorAll('#workGrid .wi');
  let visibleCount = 0;
  items.forEach(w => {
    const isVisible = (type === 'all' || w.classList.contains(type));
    w.classList.toggle('hide', !isVisible);
    if (isVisible) visibleCount++;
  });

  const msgEl = document.getElementById('noWorkMsg');
  if (msgEl) {
    if (visibleCount === 0) {
      const categoryName = btn.textContent.trim();
      msgEl.textContent = currentLang === 'de'
        ? `UPS, DIE CAM HAT NOCH KEINE "${categoryName}" ERFASST`
        : `UPS, THE CAM HASN'T REGISTERED ANY "${categoryName}" YET`;
      msgEl.style.display = 'block';
    } else {
      msgEl.style.display = 'none';
    }
  }
}

/* ── LIGHTBOX (nur Arbeiten) ── */
let lastFocus = null;

function openLB(el) {
  const lb = document.getElementById('lb');
  if (!lb) return;
  lastFocus = document.activeElement;
  const meta = el.querySelector('.wo');
  document.getElementById('lbTag').textContent = meta.querySelector('.wo-tag')?.textContent || '';
  document.getElementById('lbTitle').textContent = meta.querySelector('.wo-title')?.textContent || '';
  document.getElementById('lbSub').textContent = meta.querySelector('.wo-sub')?.textContent || '';

  const ytId = el.dataset.yt;
  if (ytId) {
    // YouTube erst beim Klick laden, datenschutzfreundliche Domain
    const title = (meta.querySelector('.wo-title')?.textContent || 'Video').replace(/"/g, '');
    const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?autoplay=1&rel=0&modestbranding=1`;
    document.getElementById('lbMedia').innerHTML =
      `<div class="lb-yt"><iframe src="${src}" title="${title}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  }

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('lbClose').focus();
}

function closeLB() {
  const lb = document.getElementById('lb');
  if (!lb || !lb.classList.contains('open')) return;
  lb.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { document.getElementById('lbMedia').innerHTML = ''; }, 400);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

const workGrid = document.getElementById('workGrid');
if (workGrid) {
  workGrid.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const w = e.target.closest('.wi');
      if (w) { e.preventDefault(); openLB(w); }
    }
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLB(); closeMenu(); }
  const lb = document.getElementById('lb');
  if (lb && lb.classList.contains('open') && e.key === 'Tab' &&
      !document.getElementById('lbBox').contains(document.activeElement)) {
    e.preventDefault();
    document.getElementById('lbClose').focus();
  }
});

/* ── MOBILE MENU ── */
function toggleMenu() {
  const h = document.getElementById('hamburger');
  const m = document.getElementById('mobileMenu');
  h.classList.toggle('open');
  m.classList.toggle('open');
  const isOpen = m.classList.contains('open');
  h.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMenu() {
  const m = document.getElementById('mobileMenu');
  if (m && m.classList.contains('open')) toggleMenu();
}

/* ── FAQ: es ist immer nur eine Frage offen ── */
const faqItems = document.querySelectorAll('.faq details');
faqItems.forEach(d => {
  d.addEventListener('toggle', () => {
    if (!d.open) return;
    faqItems.forEach(o => { if (o !== d) o.open = false; });
  });
});

/* ── NACH OBEN ── */
const toTop = document.getElementById('toTop');
if (toTop) {
  const toggleTop = () => toTop.classList.toggle('show', window.scrollY > 400);
  window.addEventListener('scroll', toggleTop, { passive: true });
  toggleTop();
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
}

/* ── Header-Unschärfe erst nach dem Scrollen ── */
(function () {
  const upd = () => document.body.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', upd, { passive: true });
  upd();
})();
