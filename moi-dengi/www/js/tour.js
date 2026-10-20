/* Первый заход: четыре подсказки, по одной. Экран затемняется, нужное место подсвечено, рядом белый пузырь с хвостиком.
   MD.tour.start() вызывает знакомство после последнего экрана; MD.tour.reset() (для проверки) запускает заново. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const KEY = 'moidengi_tour';
  const STEPS = [
    { sel: ['.bal'], t: 'Ваши свободные деньги', p: 'Здесь показано, сколько вы можете безопасно потратить. Мы уже вычли из этой суммы обязательные платежи, чтобы вы не ушли в минус.', pos: 'below' },
    { sel: ['#fab'], t: 'Добавление трат в один клик', p: 'Нажмите сюда, чтобы записать расход. Можно ввести сумму вручную, написать текстом (например, «Кофе 5 Br») или сфотографировать чек.', pos: 'above', round: true, pulse: true },
    { sel: ['#homeMain .block .h2-row'], t: 'Вся история под рукой', p: 'Здесь появляются все ваши записи. Нажмите «Все», чтобы найти старые траты, отфильтровать или изменить их. А в карточке выше можно откладывать деньги на цели.', pos: 'above' },
    { sel: ['.nav-item[data-tab=stats]', '.nav-item[data-tab=acc]'], t: 'Статистика и настройки', p: 'Во вкладке «Статистика» графики, категории, копилки и счета. А нажав на аватар вверху, можно настроить Face ID, выгрузить данные и многое другое.', pos: 'above', tail: 0 }
  ];
  let el = null, i = 0, steps = [];
  const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (_) {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vis = sel => { const t = document.querySelector(sel); return t && t.offsetParent !== null ? t : null; };

  function close() { if (el) { el.remove(); el = null; } mark(); window.removeEventListener('resize', draw); }
  function draw() {
    if (!el) return;
    const s = steps[i], W = window.innerWidth, H = window.innerHeight;
    const rs = s.sel.map(q => { const t = vis(q); return t && t.getBoundingClientRect(); }).filter(Boolean);
    if (!rs.length) { next(); return; }
    const pad = 6, holes = rs.map(r => ({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2, r: s.round ? (r.width + pad * 2) / 2 : 14 }));
    el.querySelector('svg').setAttribute('viewBox', `0 0 ${W} ${H}`);
    el.querySelector('svg').innerHTML = `<defs><mask id="tourMask"><rect width="${W}" height="${H}" fill="white"/>${holes.map(h => `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="${h.r}" fill="black"/>`).join('')}</mask></defs><rect width="${W}" height="${H}" fill="rgba(0,0,0,.4)" mask="url(#tourMask)"/>`;
    const ring = el.querySelector('.tour-ring'); ring.hidden = !s.pulse;
    if (s.pulse) Object.assign(ring.style, { left: rs[0].left + 'px', top: rs[0].top + 'px', width: rs[0].width + 'px', height: rs[0].height + 'px' });
    const card = el.querySelector('.tour-card');
    card.innerHTML = `<b>${esc(s.t)}</b><p>${esc(s.p)}</p><div class="tour-btns"><button class="tk" type="button" data-tour="skip">Пропустить</button><span class="tn">${i + 1} из ${steps.length}</span><button class="tx" type="button" data-tour="next">${i === steps.length - 1 ? 'Понятно' : 'Далее'}</button></div><span class="tour-tail"></span>`;
    const t0 = holes[s.tail || 0], cw = Math.min(W - 32, 340);
    card.style.width = cw + 'px'; card.style.left = Math.round((W - cw) / 2) + 'px';
    const ch = card.offsetHeight, below = s.pos === 'below';
    card.style.top = (below ? Math.min(H - ch - 16, t0.y + t0.h + 16) : Math.max(16, t0.y - ch - 16)) + 'px';
    const tail = card.querySelector('.tour-tail'), cx = t0.x + t0.w / 2 - (W - cw) / 2;
    tail.style.left = Math.max(20, Math.min(cw - 36, cx - 8)) + 'px';
    tail.style[below ? 'top' : 'bottom'] = '-7px';
  }
  function next() { if (i >= steps.length - 1) return close(); i++; draw(); }
  function start(force) {
    if (el || (!force && seen())) return;
    steps = STEPS.filter(s => s.sel.some(vis));
    if (!steps.length) return;
    i = 0;
    el = document.createElement('div');
    el.className = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Как пользоваться Фином');
    el.innerHTML = '<svg aria-hidden="true"></svg><span class="tour-ring" hidden></span><div class="tour-card"></div>';
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
