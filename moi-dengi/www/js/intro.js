/* Знакомство с Фином: три экрана при самом первом запуске, до всякого входа.
   На каждом экране сразу видны «Пропустить» и «Далее». Показывается один раз, тем, у кого уже есть данные, не показывается.
   1. Привет, я Фин. 2. Записывай голосом: «вчера кофе 6,5 и такси 12». 3. Замечаю привычки, подсказки без нотаций. */
(function (root) {
  'use strict';
  const KEY = 'moidengi_intro';
  let seen = true;
  try { seen = localStorage.getItem(KEY) === '1' || !!localStorage.getItem('moidengi_v1'); } catch (_) {}
  if (seen) return;
  const MD = root.MD || {};
  const ic = n => (MD.icon ? MD.icon(n) : '');
  const ci = (n, c) => `<span class="ci" style="--c:${c};flex:0 0 40px;width:40px;height:40px">${ic(n)}</span>`;
  const SLIDES = [
    { pose: 'hello', h: 'Привет, я Фин', p: 'Помогаю вести деньги: ты рассказываешь, куда они ушли, а я записываю и считаю.',
      demo: '' },
    { pose: 'notify', h: 'Записывай голосом', p: 'Просто скажи, как другу. Я разберу сумму, категорию и день.',
      demo: `<div class="intro-ex"><div class="intro-quote">${ic('mic')}<span>Вчера кофе 6,5 и такси 12</span></div>
        <div class="intro-row">${ci('cup', '#F59E0B')}<b>Кафе · вчера</b><em>−6,50</em></div>
        <div class="intro-row">${ci('bus', '#14B8A6')}<b>Транспорт · вчера</b><em>−12,00</em></div></div>` },
    { pose: 'think', h: 'Я замечаю привычки', p: 'Подсказываю по-дружески и коротко, без нотаций. Не нравится — одним нажатием скрыть.',
      demo: `<div class="intro-ex"><div class="intro-tip"><b>Фин заметил</b>За неделю шесть трат на кофе. Может, сваришь дома пару раз?</div></div>` }
  ];
  const el = document.createElement('div');
  el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Знакомство');
  el.innerHTML = `<div class="intro-top"><button class="intro-skip" data-skip type="button">Пропустить</button></div>
    <div class="intro-art">${SLIDES.map(s => `<div>${MD.mascot ? MD.mascot(s.pose, s.demo ? 96 : 200) : ''}${s.demo}</div>`).join('')}</div>
    <div class="intro-text" aria-live="polite">${SLIDES.map(s => `<div class="intro-t"><h1>${s.h}</h1><p>${s.p}</p></div>`).join('')}</div>
    <div class="intro-dots" aria-hidden="true">${SLIDES.map(() => '<i></i>').join('')}</div>
    <div class="intro-btns"><button class="btn primary wide" data-next type="button">Далее</button></div>`;
  document.body.appendChild(el);
  let i = 0, pushed = 0;
  const done = () => {
    try { localStorage.setItem(KEY, '1'); } catch (_) {}
    window.removeEventListener('popstate', onPop);
    if (pushed > 0) history.go(-pushed);
    el.remove();
  };
  function draw() {
    el.querySelectorAll('.intro-art > div').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelectorAll('.intro-dots i').forEach((n, k) => n.classList.toggle('on', k === i));
    el.querySelectorAll('.intro-t').forEach((n, k) => { n.classList.toggle('on', k === i); n.setAttribute('aria-hidden', String(k !== i)); });
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
})(typeof window !== 'undefined' ? window : globalThis);
