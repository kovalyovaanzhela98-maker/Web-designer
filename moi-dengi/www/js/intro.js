/* Знакомство: три экрана при самом первом запуске, до всякого входа.
   Тёмный фон с цветным свечением, заголовок с цветным словом, стеклянная карточка-иллюстрация, полоска шагов, «Пропустить» и «Далее».
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
    const ic = n => (root.MD && root.MD.icon ? root.MD.icon(n) : '');
    const bars = [34, 52, 40, 66, 48, 78, 58, 92, 70, 100].map((h, i) => `<i style="height:${h}%;--d:${i * 40}ms"></i>`).join('');
    const row = (icon, name, sum, tone) => `<div class="ob-row" style="--tone:${tone}"><span class="ob-ico">${ic(icon)}</span><b>${name}</b><em>${sum}</em><span class="ob-chev">${ic('right')}</span></div>`;
    const SLIDES = [
      { hue: 'blue', h: 'Управляй своими', w: 'финансами', p: 'Записывай траты, ставь цели и вырабатывай привычки. Всё в одном месте.',
        art: `<div class="ob-card ob-balance"><div class="ob-card-h"><span>Свободные деньги</span><i class="ob-dots"></i></div>
          <div class="ob-sum"><b>649</b><small>,30 Br</small><span class="ob-up">↑ 12%</span></div><div class="ob-bars" aria-hidden="true">${bars}</div></div>` },
      { hue: 'pink', h: 'Понимай свои', w: 'траты', p: 'Смотри, куда уходят деньги, и находи, на чём можно сэкономить.',
        art: `<div class="ob-list">${row('cart', 'Продукты', '320 Br', '#FF8A5B')}${row('cup', 'Кафе', '240 Br', '#C86BFF')}${row('bus', 'Транспорт', '120 Br', '#6F7BFF')}${row('home', 'Дом', '450 Br', '#4C8DFF')}</div>` },
      { hue: 'green', h: 'Достигай целей', w: 'быстрее', p: 'Ставь цели накоплений и смотри, как растёт прогресс.',
        art: `<div class="ob-goal"><div class="ob-card ob-vac"><span class="ob-leaf">${ic('goal')}</span><b>Отпуск</b><small>1 200 / 3 000 Br</small><span class="ob-bar"><i></i></span></div><div class="ob-card ob-ghost"><span>+</span></div></div>` }
    ];
    const el = document.createElement('div');
    el.className = 'ob'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Знакомство');
    el.innerHTML = `<div class="ob-glow" aria-hidden="true"><i></i><i></i></div>
      <button class="ob-skip" data-skip type="button">Пропустить</button>
      <div class="ob-text" aria-live="polite">${SLIDES.map(s => `<div class="ob-t"><h1>${s.h}<br><span class="ob-w ob-w-${s.hue}">${s.w}</span></h1><p>${s.p}</p></div>`).join('')}</div>
      <div class="ob-art" aria-hidden="true">${SLIDES.map(s => `<div class="ob-slide">${s.art}</div>`).join('')}</div>
      <div class="ob-foot">
        <div class="ob-steps" aria-hidden="true">${SLIDES.map(() => '<i></i>').join('')}</div>
        <button class="ob-next" data-next type="button"><span></span><i aria-hidden="true">${ic('right')}</i></button>
      </div>`;
    document.body.appendChild(el);
    let i = 0, pushed = 0;
    const done = () => {
      try { localStorage.setItem(KEY, '1'); } catch (_) {}
      window.removeEventListener('popstate', onPop);
      if (pushed > 0) history.go(-pushed);
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 260);
      if (root.MD && root.MD.tour && !document.body.classList.contains('welcome')) setTimeout(() => root.MD.tour.start(), 500);
    };
    function draw() {
      el.dataset.hue = SLIDES[i].hue;
      el.querySelectorAll('.ob-t').forEach((n, k) => { n.classList.toggle('on', k === i); n.setAttribute('aria-hidden', String(k !== i)); });
      el.querySelectorAll('.ob-slide').forEach((n, k) => n.classList.toggle('on', k === i));
      el.querySelectorAll('.ob-steps i').forEach((n, k) => n.classList.toggle('on', k === i));
      el.querySelector('.ob-next span').textContent = i === SLIDES.length - 1 ? 'Начать' : 'Далее';
      el.querySelector('.ob-skip').style.visibility = i === SLIDES.length - 1 ? 'hidden' : 'visible';
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
