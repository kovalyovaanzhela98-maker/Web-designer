/* Знакомство с Фином: три экрана при самом первом запуске, до входа в аккаунт.
   Фон каждого экрана — картинка img/onboard/N.jpg (Фин уже нарисован на ней), снизу панель с текстом.
   Показывается один раз. Тем, у кого уже есть данные, не показывается. */
(function (root) {
  'use strict';
  const KEY = 'moidengi_intro';
  let seen = true;
  try { seen = localStorage.getItem(KEY) === '1' || !!localStorage.getItem('moidengi_v1'); } catch (_) {}
  if (seen) return;
  const BASE = root.INTRO_BASE || 'img/onboard/';
  const SLIDES = [
    { img: '1.jpg', pos: '50% 80%', h: 'Привет, я Фин', p: 'Помогу следить за деньгами так, чтобы это не было скучной таблицей.' },
    { img: '2.jpg', pos: '50% 78%', h: 'Говори, как другу', p: '«Вчера кофе 6 рублей». Я пойму, разложу по категориям и покажу, что получилось. В учёт попадёт только то, что ты подтвердишь.' },
    { img: '3.jpg', pos: '50% 74%', h: 'Спи спокойно', p: 'Войди один раз, и траты не потеряются, даже если сменишь телефон.' }
  ];
  const el = document.createElement('div');
  el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Знакомство');
  el.innerHTML = `<div class="intro-art" aria-hidden="true">${SLIDES.map((s, k) => `<i style="background-image:url(${BASE + s.img});background-position:${s.pos}" data-k="${k}"></i>`).join('')}</div>
    <button class="intro-skip" data-skip>Пропустить</button>
    <div class="intro-panel">
      <div class="intro-text" id="introText" aria-live="polite"></div>
      <div class="intro-dots" aria-hidden="true">${SLIDES.map(() => '<i></i>').join('')}</div>
      <button class="btn primary wide" data-next></button>
    </div>`;
  document.body.appendChild(el);
  let i = 0;
  const done = () => { try { localStorage.setItem(KEY, '1'); } catch (_) {} el.classList.add('out'); setTimeout(() => el.remove(), 350); };
  function draw(dir) {
    const s = SLIDES[i], last = i === SLIDES.length - 1;
    el.querySelectorAll('.intro-art i').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelectorAll('.intro-dots i').forEach((n, k) => n.classList.toggle('on', k === i));
    const t = el.querySelector('#introText');
    t.innerHTML = `<h1>${s.h}</h1><p>${s.p}</p>`;
    t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    el.querySelector('[data-next]').textContent = last ? 'Поехали' : 'Дальше';
    el.querySelector('[data-skip]').hidden = last;
  }
  const go = d => { const n = i + d; if (n < 0) return; if (n >= SLIDES.length) return done(); i = n; draw(); };
  el.addEventListener('click', e => {
    if (e.target.closest('[data-skip]')) return done();
    if (e.target.closest('[data-next]')) go(1);
  });
  let sx = null;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }, { passive: true });
  draw();
})(typeof window !== 'undefined' ? window : globalThis);
