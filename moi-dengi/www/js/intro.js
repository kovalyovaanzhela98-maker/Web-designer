/* Знакомство с Фином: три экрана при самом первом запуске, до всякого входа.
   Картинка с Фином на фоне, снизу панель с текстом и живая демонстрация. На каждом экране сразу видны «Пропустить» и «Далее».
   1. Привет, я Фин. 2. Записывай голосом: «вчера кофе 6,5 и такси 12». 3. Замечаю привычки, подсказки без нотаций.
   Показывается один раз; тем, у кого уже есть данные, не показывается. После него приложение показывает короткий тур по экрану (js/tour.js). */
(function (root) {
  'use strict';
  const KEY = 'moidengi_intro';
  let seen = true;
  try { seen = localStorage.getItem(KEY) === '1' || !!localStorage.getItem('moidengi_v1'); } catch (_) {}
  if (document.getElementById('splash')) {
    root.addEventListener('fin:splash-finished', bootIntro, { once: true });
    return;
  }
  bootIntro();
  function bootIntro() {
  if (seen) return;
  const BASE = root.INTRO_BASE || 'img/onboard/';
  const ic = n => (root.MD && root.MD.icon ? root.MD.icon(n) : '');
  const ci = (n, c) => `<span class="dm-ci" style="--c:${c}">${ic(n)}</span>`;
  const SLIDES = [
    { art: `url(${BASE}1.jpg) 50% 70%/cover no-repeat`, h: 'Привет, я Фин', p: 'Я помогаю вести деньги: ты рассказываешь, куда они ушли, а я записываю и считаю.', demo: '' },
    { art: `url(${BASE}2.jpg) 50% 78%/cover no-repeat`, h: 'Записывай голосом', p: 'Просто скажи, как другу. Я разберу сумму, категорию и день.',
      demo: `<div class="dm-card"><div class="dm-say">${ic('mic')}<span>Вчера кофе 6,5 и такси 12</span></div>
        <div class="dm-r">${ci('cup', '#F59E0B')}<b>Кафе · вчера</b><em>−6,50 Br</em></div>
        <div class="dm-r">${ci('bus', '#14B8A6')}<b>Транспорт · вчера</b><em>−12,00 Br</em></div></div>` },
    { art: `url(${BASE}3.jpg) 50% 74%/cover no-repeat`, h: 'Я замечаю привычки', p: 'Подсказываю по-дружески и коротко, без нотаций. Не нравится: одно нажатие, и скрыто.',
      demo: `<div class="dm-card dm-nudge"><b>Фин заметил</b><p>За неделю 6 трат на кофе на 42,00 Br. Может, сваришь дома пару раз?</p>
        <div class="dm-btns"><span>Понятно</span><span class="p">Обсудить</span></div></div>` }
  ];
  const el = document.createElement('div');
  el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Знакомство');
  el.innerHTML = `<div class="intro-art" aria-hidden="true">${SLIDES.map(s => `<i style="background:${s.art}"></i>`).join('')}
      <div class="demo-wrap">${SLIDES.map(s => `<div class="demo">${s.demo}</div>`).join('')}</div></div>
    <button class="intro-skip" data-skip type="button">Пропустить</button>
    <div class="intro-panel">
      <div class="intro-text" aria-live="polite">${SLIDES.map(s => `<div class="intro-t"><h1>${s.h}</h1><p>${s.p}</p></div>`).join('')}</div>
      <div class="intro-dots" aria-hidden="true">${SLIDES.map(() => '<i></i>').join('')}</div>
      <div class="intro-btns"><button class="btn primary" data-next type="button">Далее</button></div>
    </div>`;
  document.body.appendChild(el);
  let i = 0, pushed = 0;
  const done = () => {
    try { localStorage.setItem(KEY, '1'); } catch (_) {}
    window.removeEventListener('popstate', onPop);
    if (pushed > 0) history.go(-pushed);
    el.remove();
    if (root.MD && root.MD.tour && !document.body.classList.contains('welcome')) setTimeout(() => root.MD.tour.start(), 400);
  };
  function draw() {
    el.querySelectorAll('.intro-art i').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelectorAll('.intro-dots i').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelectorAll('.intro-t').forEach((n, k) => { n.classList.toggle('on', k === i); n.setAttribute('aria-hidden', String(k !== i)); });
    el.querySelectorAll('.demo').forEach((n, k) => n.classList.toggle('on', k === i));
  }
  function next() { if (i >= SLIDES.length - 1) return done(); i++; history.pushState({ intro: i }, ''); pushed++; draw(); }
  function prev() { if (i > 0) history.back(); }
  function onPop() { if (i > 0) { i--; pushed = Math.max(0, pushed - 1); draw(); } }
  window.addEventListener('popstate', onPop);
  el.addEventListener('click', e => {
    if (e.target.closest('[data-skip]')) return done();
    if (e.target.closest('[data-next]')) next();
  });
  let sx = null;
  el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (dx < -50) next(); else if (dx > 50) prev(); }, { passive: true });
  draw();
  }
})(typeof window !== 'undefined' ? window : globalThis);
