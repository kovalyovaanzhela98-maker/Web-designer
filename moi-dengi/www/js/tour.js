/* Первый заход: Фин коротко показывает подсветкой, как пользоваться приложением. Один раз, можно пропустить.
   MD.tour.start() вызывает знакомство после последнего экрана; MD.tour.reset() (для проверки) запускает заново. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const KEY = 'moidengi_tour';
  const STEPS = [
    { sel: '.bal', t: 'Здесь твои деньги', p: 'Весь баланс одной суммой. Глаз справа прячет суммы, когда рядом люди.', pose: 'hello' },
    { sel: '#fab', t: 'Главная кнопка', p: 'Нажми «+»: выбери дату, впиши сумму, выбери категорию, готово. Голос включается микрофоном справа от суммы.', pose: 'notify' },
    { sel: '#qaForm', t: 'Или просто напиши', p: 'Фраза вроде «вчера такси 12» тоже сработает: я сам разберу сумму, категорию и день.', pose: 'think' },
    { sel: '[data-tab=stats]', t: 'Куда уходят деньги', p: 'В аналитике выбирай период: неделя, месяц, год или свои даты. Там категории, средние траты и дни.', pose: 'happy' },
    { sel: '[data-tab=goals]', t: 'Копилки и цели', p: 'Скажи, на что копишь и за какой срок, хоть за две недели. Фин посчитает взнос и напомнит отложить.', pose: 'love' },
    { sel: '[data-tab=acc]', t: 'Платежи и настройки', p: 'В профиле обязательные платежи с напоминанием, валюта и копия данных.', pose: 'joy' }
  ];
  let el = null, i = 0, steps = [];
  const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (_) {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function close() { if (el) { el.remove(); el = null; } mark(); window.removeEventListener('resize', draw); }
  function draw() {
    if (!el) return;
    const s = steps[i], t = document.querySelector(s.sel);
    if (!t) { next(); return; }
    const r = t.getBoundingClientRect(), pad = 6, H = window.innerHeight, W = window.innerWidth;
    const hole = el.querySelector('.tour-hole'), card = el.querySelector('.tour-card');
    Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    card.innerHTML = `<div class="tour-top">${MD.mascot ? MD.mascot(s.pose, 56) : ''}<div><b>${esc(s.t)}</b><p>${esc(s.p)}</p></div></div>
      <div class="tour-dots" aria-hidden="true">${steps.map((_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>
      <div class="tour-btns"><button class="btn ghost" type="button" data-tour="skip">Пропустить</button><button class="btn primary" type="button" data-tour="next">${i === steps.length - 1 ? 'Понятно' : 'Далее'}</button></div>`;
    const below = r.top + r.height / 2 < H * 0.55;
    card.style.top = below ? Math.min(H - card.offsetHeight - 16, r.bottom + 16) + 'px' : Math.max(16, r.top - card.offsetHeight - 16) + 'px';
    card.style.left = '16px'; card.style.right = '16px'; card.style.maxWidth = Math.min(W - 32, 420) + 'px';
  }
  function next() { if (i >= steps.length - 1) return close(); i++; draw(); }
  function start(force) {
    if (el || (!force && seen())) return;
    steps = STEPS.filter(s => { const t = document.querySelector(s.sel); return t && t.offsetParent !== null; });
    if (!steps.length) return;
    i = 0;
    el = document.createElement('div');
    el.className = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Как пользоваться Фином');
    el.innerHTML = '<div class="tour-hole"></div><div class="tour-card"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-tour]'); if (!b) return;
      if (b.dataset.tour === 'skip') close(); else next();
    });
    window.addEventListener('resize', draw);
    draw();
  }
  MD.tour = { start, reset() { try { localStorage.removeItem(KEY); } catch (_) {} start(true); } };
})(typeof window !== 'undefined' ? window : globalThis);
