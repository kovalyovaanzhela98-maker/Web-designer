/* Фин Навсегда: одна разовая покупка, без подписки и без списаний по месяцам.
   Бесплатного приложения хватает для обычной жизни; покупка снимает мягкие ограничения (см. FREE и GATES).
   Платёж идёт через MD.sub.provider (Google Play Billing, одноразовый товар, см. docs/SUBSCRIPTION.md).
   Пока провайдера нет, это тестовая сборка: «покупка» только включает доступ и ничего не списывает. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const KEY = 'fin_plus';
  const PRODUCT = { id: 'fin_lifetime', title: 'Фин Навсегда', price: '29,99 Br' };
  const FREE = { goals: 1, remindTimes: 1, payments: 10 };

  const GATES = {
    payments: { h: 'Больше десяти платежей', p: 'В бесплатном Фине можно держать до десяти обязательных платежей. Фин Навсегда снимает этот предел.' },
    goals: { h: 'Больше одной цели', p: 'В бесплатном Фине одна цель. С Фин Навсегда их может быть сколько угодно.' },
    receipt: { h: 'Чеки и выписки', p: 'Сфотографируй чек или прикрепи выписку из банка, и Фин сам внесёт траты.' },
    remind: { h: 'Несколько напоминаний', p: 'С Фин Навсегда можно поставить до трёх напоминаний в день и выбрать дни недели.' },
    generic: { h: 'Фин Навсегда', p: 'Один раз и навсегда. Без подписки и без повторных списаний.' }
  };
  const BENEFITS = [
    ['Без подписки', 'Платишь один раз. Забыть отменить нечего'],
    ['Больше десяти платежей', 'В бесплатном Фине до десяти'],
    ['Чеки и выписки', 'Фото чека или файл из банка. Фин распознает и добавит записи'],
    ['Сколько угодно целей', 'В бесплатном Фине одна'],
    ['Несколько напоминаний', 'До трёх в день и свои дни недели']
  ];

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (_) { return {}; } };
  const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const api = {
    PRODUCT, GATES, FREE, provider: null,
    state: read,
    isPlus() { return !!read().lifetime; },
    /* Пределы бесплатной версии; с покупкой предела нет */
    limit(name) { return api.isPlus() ? Infinity : FREE[name]; },
    /* Вызови перед платной функцией: если покупки нет, покажет экран покупки */
    gate(feature, ok) { if (api.isPlus()) return ok(); api.open(feature, ok); },
    async buy() {
      if (api.provider) { const r = await api.provider.purchase(PRODUCT.id); if (r && r.ok) write({ lifetime: true, at: Date.now() }); return !!(r && r.ok); }
      write({ lifetime: true, at: Date.now(), demo: true });
      return true;
    },
    async restore() {
      if (api.provider && api.provider.restore) { const r = await api.provider.restore(); if (r && r.ok) { write({ lifetime: true, at: Date.now() }); return true; } }
      return api.isPlus();
    },
    revokeDemo() { write({}); },

    open(reason, after) {
      const app = MD.app; if (!app) return;
      const g = GATES[reason] || GATES.generic;
      const ly = document.getElementById('lyPlus');
      const draw = () => {
        const plus = api.isPlus(), demo = !api.provider, body = document.getElementById('plusBody');
        const list = `<ul class="benefits">${BENEFITS.map(b => `<li><span class="bi">${MD.icon('check')}</span><span>${esc(b[0])}<small>${esc(b[1])}</small></span></li>`).join('')}</ul>`;
        if (plus) {
          body.innerHTML = `<div class="pl-hero">${MD.mascot('joy', 84)}<div><b>Фин Навсегда включён</b><span>Спасибо! Платить больше не нужно</span></div></div>${list}
            ${read().demo ? '<button class="btn ghost wide" type="button" data-plus="off">Выключить тестовый доступ</button>' : ''}
            <button class="btn primary wide" type="button" data-close>Отлично</button>`;
          return;
        }
        body.innerHTML = `<div class="pl-hero">${MD.mascot('love', 84)}<div><b>${esc(g.h)}</b><span>${esc(g.p)}</span></div></div>${list}
          <div class="price-card"><span><b>${esc(PRODUCT.title)}</b><small>Разовая покупка, навсегда</small></span><span class="pr">${esc(PRODUCT.price)}</span></div>
          <button class="btn primary wide" type="button" data-plus="buy">Купить навсегда</button>
          <p class="fine">Платёж один. Подписки нет, повторных списаний не будет.${demo ? ' Тестовая сборка: оплата не списывается.' : ''}</p>
          ${api.provider ? '<button class="btn ghost wide" type="button" data-plus="restore">Восстановить покупку</button>' : ''}`;
      };
      if (!ly._bound) {
        ly._bound = true;
        ly.addEventListener('click', async e => {
          const a = e.target.closest('[data-plus]'); if (!a) return;
          if (a.dataset.plus === 'buy') {
            a.disabled = true;
            let ok = false; try { ok = await api.buy(); } catch (_) {}
            if (ok) { ly._draw(); app.toast('Фин Навсегда включён', null, null, 'joy'); app.refreshAll(); if (ly._after) { const f = ly._after; ly._after = null; app.closeLayer(ly); setTimeout(f, 250); } }
            else { a.disabled = false; app.toast('Не получилось. Попробуй ещё раз', null, null, 'oops'); }
          } else if (a.dataset.plus === 'restore') {
            const ok = await api.restore(); if (ok) { ly._draw(); app.refreshAll(); } else app.toast('Покупку не нашёл');
          } else if (a.dataset.plus === 'off') { api.revokeDemo(); ly._draw(); app.refreshAll(); }
        });
      }
      ly._after = after || null;
      ly._draw = draw;
      draw();
      if (ly.hidden) app.openLayer(ly);
    }
  };
  MD.sub = api;
})(typeof window !== 'undefined' ? window : globalThis);
