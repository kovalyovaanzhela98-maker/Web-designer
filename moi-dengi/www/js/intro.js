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
  const FIN = root.FIN_BASE || 'img/fin/';
  const ic = n => (root.MD && root.MD.icon ? root.MD.icon(n) : '');
  const ci = (n, c) => `<span class="dm-ci" style="--c:${c}">${ic(n)}</span>`;
  /* У каждого экрана: картинка (art), заголовок, текст и маленькая живая демонстрация (demo) */
  const SLIDES = [
    { art: `url(${BASE}1.jpg) 50% 80%/cover no-repeat`, h: 'Ты записываешь, остальное делаю я', p: 'Скажи «кофе 6 и такси 12». Я разложу по категориям, посчитаю и покажу, куда уходят деньги.',
      demo: `<div class="dm-card"><div class="dm-say">${ic('mic')}<span class="dm-typed">кофе 6 и такси 12</span></div>
        <div class="dm-r" style="--d:1.9s">${ci('cup', '#F59E0B')}<b>Кафе</b><em>−6,00 Br</em></div>
        <div class="dm-r" style="--d:2.3s">${ci('bus', '#14B8A6')}<b>Транспорт</b><em>−12,00 Br</em></div></div>` },
    { art: `url(${BASE}2.jpg) 50% 78%/cover no-repeat`, h: 'Сводка без таблиц и калькулятора', p: 'Сколько потрачено за месяц и на что, в процентах и в суммах. Всё считается само.',
      demo: `<div class="dm-card"><div class="dm-head"><span>Октябрь, потрачено</span><b>1 240,00 Br</b></div>
        <div class="dm-bar" style="--w:38%;--c:#3B82F6;--d:.5s"><span>Продукты</span><em>38%</em><i></i></div>
        <div class="dm-bar" style="--w:27%;--c:#F59E0B;--d:.8s"><span>Кафе</span><em>27%</em><i></i></div>
        <div class="dm-bar" style="--w:14%;--c:#14B8A6;--d:1.1s"><span>Транспорт</span><em>14%</em><i></i></div></div>` },
    { art: `url(${BASE}3.jpg) 50% 74%/cover no-repeat`, h: 'Замечу привычки и подскажу', p: 'Если кофе стал ежедневным, скажу по-дружески и предложу, как сократить траты.',
      demo: `<div class="dm-card dm-nudge"><b>Фин заметил</b><p>За неделю 6 трат на кофе на 42,00 Br. Может, сваришь дома пару раз?</p>
        <div class="dm-btns"><span>Понятно</span><span class="p">Обсудить</span></div></div>` },
    { art: `url(${FIN}joy.png) 50% 22%/62% no-repeat, linear-gradient(165deg,#FBF1D2 0%,#E4EBC4 55%,#B7CF86 100%)`, h: 'Чек или выписка? Просто пришли', p: 'Сфотографируй чек или прикрепи файл из банка. Фин внесёт всё сам, тебе останется проверить.',
      demo: `<div class="dm-card"><div class="dm-file" style="--d:.5s">${ci('camera', '#3B82F6')}<span><b>Чек из магазина</b><small>Продукты · 34,20 Br</small></span></div>
        <div class="dm-file" style="--d:1s">${ci('file', '#8B5CF6')}<span><b>Выписка за октябрь</b><small>Найдено 24 операции</small></span></div></div>` }
  ];
  const el = document.createElement('div');
  el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Знакомство');
  el.innerHTML = `<div class="intro-art" aria-hidden="true">${SLIDES.map(s => `<i style="background:${s.art}"></i>`).join('')}
      <div class="demo-wrap">${SLIDES.map(s => `<div class="demo">${s.demo}</div>`).join('')}</div></div>
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
    el.querySelectorAll('.demo').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelector('[data-next]').textContent = last ? 'Начать' : 'Дальше';
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
