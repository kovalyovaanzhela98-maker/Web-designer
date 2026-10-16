/* Знакомство с Фином: три экрана при самом первом запуске, до входа в аккаунт.
   Показывается один раз. Тем, у кого уже есть данные, не показывается. */
(function (root) {
  'use strict';
  const KEY = 'moidengi_intro';
  let seen = true;
  try { seen = localStorage.getItem(KEY) === '1' || !!localStorage.getItem('moidengi_v1'); } catch (_) {}
  if (seen || !root.MD || !root.MD.mascot) return;
  const SLIDES = [
    { pose: 'hello', h: 'Привет, я Фин', p: 'Помогу следить за деньгами так, чтобы это не было скучной таблицей.' },
    { pose: 'notify', h: 'Говори, как другу', p: '«Вчера кофе 6 рублей». Я пойму, разложу по категориям и покажу, что получилось. В учёт попадёт только то, что ты подтвердишь.' },
    { pose: 'love', h: 'Всё на месте', p: 'Войди один раз, и траты не потеряются, даже если сменишь телефон.' }
  ];
  const el = document.createElement('div');
  el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Знакомство');
  document.body.appendChild(el);
  let i = 0;
  const done = () => { try { localStorage.setItem(KEY, '1'); } catch (_) {} el.remove(); };
  function draw() {
    const s = SLIDES[i], last = i === SLIDES.length - 1;
    el.innerHTML = `<button class="intro-skip" data-skip${last ? ' hidden' : ''}>Пропустить</button>
      <div class="intro-body"><div class="intro-slide" key="${i}">${root.MD.mascot(s.pose, 250)}<h1>${s.h}</h1><p>${s.p}</p></div></div>
      <div class="intro-dots" aria-hidden="true">${SLIDES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn primary wide" data-next>${last ? 'Поехали' : 'Дальше'}</button>`;
  }
  el.addEventListener('click', e => {
    if (e.target.closest('[data-skip]')) return done();
    if (e.target.closest('[data-next]')) { if (i >= SLIDES.length - 1) return done(); i++; draw(); }
  });
  draw();
})(typeof window !== 'undefined' ? window : globalThis);
