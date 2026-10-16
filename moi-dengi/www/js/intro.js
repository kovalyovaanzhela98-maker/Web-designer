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
    { img: '1.jpg', pos: '50% 80%', h: 'Деньги под контролем за 5 секунд', p: 'Я Фин. Скажи вслух или напиши, на что ушли деньги, а остальное сделаю я.' },
    { img: '2.jpg', pos: '50% 78%', h: 'Говори, как другу', p: '«Вчера кофе 6 рублей». Я пойму, разложу по категориям и покажу, что получилось. В учёт попадёт только то, что ты подтвердишь.' },
    { img: '3.jpg', pos: '50% 74%', h: 'Данные не пропадут', p: 'Создай аккаунт один раз, и траты сохранятся, даже если сменишь телефон.' }
  ];
  const el = document.createElement('div');
  el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Знакомство');
  el.innerHTML = `<div class="intro-art" aria-hidden="true">${SLIDES.map((s, k) => `<i style="background-image:url(${BASE + s.img});background-position:${s.pos}"></i>`).join('')}</div>
    <button class="intro-back" data-back aria-label="Назад" hidden><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
    <button class="intro-skip" data-skip>Пропустить</button>
    <div class="intro-panel">
      <div class="intro-text" aria-live="polite">${SLIDES.map(s => `<div class="intro-t"><h1>${s.h}</h1><p>${s.p}</p></div>`).join('')}</div>
      <div class="intro-dots" aria-hidden="true">${SLIDES.map(() => '<i></i>').join('')}</div>
      <button class="btn primary wide" data-next></button>
    </div>`;
  document.body.appendChild(el);
  let i = 0, pushed = 0;
  const done = () => {
    try { localStorage.setItem(KEY, '1'); } catch (_) {}
    window.removeEventListener('popstate', onPop);
    if (pushed > 0) history.go(-pushed);
    el.classList.add('out'); setTimeout(() => el.remove(), 350);
  };
  function draw() {
    const last = i === SLIDES.length - 1;
    el.querySelectorAll('.intro-art i').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelectorAll('.intro-dots i').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelectorAll('.intro-t').forEach((n, k) => { n.classList.toggle('on', k === i); n.setAttribute('aria-hidden', String(k !== i)); });
    el.querySelector('[data-next]').textContent = last ? 'Войти' : 'Дальше';
    el.querySelector('[data-skip]').hidden = last;
    el.querySelector('[data-back]').hidden = i === 0;
  }
  function next() { if (i >= SLIDES.length - 1) return done(); i++; history.pushState({ intro: i }, ''); pushed++; draw(); }
  function prev() { if (i > 0) history.back(); }
  function onPop() { if (i > 0) { i--; pushed = Math.max(0, pushed - 1); draw(); } }
  window.addEventListener('popstate', onPop);
  el.addEventListener('click', e => {
    if (e.target.closest('[data-skip]')) return done();
    if (e.target.closest('[data-back]')) return prev();
    if (e.target.closest('[data-next]')) next();
  });
  let sx = null;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (dx < -50) next(); else if (dx > 50) prev(); }, { passive: true });
  draw();
})(typeof window !== 'undefined' ? window : globalThis);
