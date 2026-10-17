/* Фин Плюс: подписка. Здесь всё про доступ и экран оплаты.
   Что платное — в GATES. Цены — в PLANS (в магазине цену задаёшь в Google Play Console, здесь — подпись на экране).
   Платёж идёт через MD.sub.provider (Google Play Billing, см. docs/SUBSCRIPTION.md).
   Пока провайдера нет, это тестовая сборка: «оплата» только открывает доступ на период и ничего не списывает. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const KEY = 'fin_plus';
  const DAY = 864e5;
  const TRIAL_DAYS = 7;

  const PLANS = [
    { id: 'month', title: 'Месяц', price: '4,99 Br', per: 'в месяц', days: 30 },
    { id: 'year', title: 'Год', price: '39,99 Br', per: 'в год', days: 365, tag: '−33%', note: 'около 3,33 Br в месяц' }
  ];
  const GATES = {
    goals: { h: 'Больше одной цели', p: 'На бесплатном тарифе одна цель. С Плюсом их может быть сколько угодно.' },
    receipt: { h: 'Чеки и выписки', p: 'Сфотографируй чек или прикрепи выписку из банка, и Фин сам внесёт траты.' },
    remind: { h: 'Несколько напоминаний', p: 'С Плюсом можно поставить до трёх напоминаний и выбрать дни недели.' },
    generic: { h: 'Фин Плюс', p: 'Больше возможностей, чтобы деньги были под контролем.' }
  };
  const BENEFITS = [
    ['Чеки и выписки', 'Фото чека или файл из банка. Фин распознает и добавит записи'],
    ['Сколько угодно целей', 'На бесплатном тарифе одна'],
    ['Несколько напоминаний', 'До трёх в день и свои дни недели'],
    ['Новое первым', 'Все будущие функции Плюса']
  ];

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (_) { return {}; } };
  const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const api = {
    PLANS, GATES, TRIAL_DAYS, provider: null,
    state: read,
    isPlus() { return (read().until || 0) > Date.now(); },
    daysLeft() { return Math.max(0, Math.ceil(((read().until || 0) - Date.now()) / DAY)); },
    trialUsed() { return !!read().trialUsed; },
    free: { goals: 1, remindTimes: 1 },
    /* Вызови перед платной функцией: если доступа нет — покажет экран Плюса */
    gate(feature, ok) { if (api.isPlus()) return ok(); api.open(feature, ok); },
    limit(name) { return api.isPlus() ? Infinity : api.free[name]; },
    grant(plan, trial) {
      const days = trial ? TRIAL_DAYS : (PLANS.find(p => p.id === plan) || PLANS[0]).days;
      const cur = Math.max(read().until || 0, Date.now());
      write({ plan: trial ? 'trial' : plan, until: cur + days * DAY, trialUsed: read().trialUsed || !!trial });
    },
    async buy(planId) {
      if (api.provider) { const r = await api.provider.purchase(planId); if (r && r.until) write({ plan: planId, until: r.until, trialUsed: read().trialUsed }); return !!(r && r.until); }
      const trial = !api.trialUsed();
      api.grant(planId, trial);
      return true;
    },
    async restore() {
      if (api.provider && api.provider.restore) { const r = await api.provider.restore(); if (r && r.until) { write({ plan: r.plan || 'month', until: r.until, trialUsed: read().trialUsed }); return true; } }
      return api.isPlus();
    },
    cancelDemo() { const s = read(); s.until = 0; write(s); },

    open(reason, after) {
      const app = MD.app; if (!app) return;
      const g = GATES[reason] || GATES.generic;
      let sel = 'year';
      const draw = () => {
        const plus = api.isPlus(), st = read();
        const trialFirst = !api.trialUsed() && !api.provider;
        const demo = !api.provider;
        const body = document.getElementById('plusBody');
        const plan = PLANS.find(p => p.id === sel);
        if (plus) {
          body.innerHTML = `<div class="pl-hero">${MD.mascot('joy', 84)}<div><b>Плюс включён</b><span>${st.plan === 'trial' ? `Пробный период, осталось дней: ${api.daysLeft()}` : `Действует ещё дней: ${api.daysLeft()}`}</span></div></div>
            <ul class="benefits">${BENEFITS.map(b => `<li><span class="bi">${MD.icon('check')}</span><span>${esc(b[0])}<small>${esc(b[1])}</small></span></li>`).join('')}</ul>
            ${demo ? '<button class="btn ghost wide" type="button" data-plus="off">Выключить тестовый доступ</button>' : ''}
            <button class="btn primary wide" type="button" data-close>Отлично</button>`;
          return;
        }
        body.innerHTML = `<div class="pl-hero">${MD.mascot('love', 84)}<div><b>${esc(g.h)}</b><span>${esc(g.p)}</span></div></div>
          <ul class="benefits">${BENEFITS.map(b => `<li><span class="bi">${MD.icon('check')}</span><span>${esc(b[0])}<small>${esc(b[1])}</small></span></li>`).join('')}</ul>
          <div class="plans" role="radiogroup" aria-label="Тариф">${PLANS.map(p => `<button type="button" role="radio" class="plan-c" data-plan="${p.id}" aria-checked="${p.id === sel}">${p.tag ? `<span class="tag">${p.tag}</span>` : ''}<b>${esc(p.title)}</b><span class="pr">${esc(p.price)}</span><small>${esc(p.note || p.per)}</small></button>`).join('')}</div>
          <button class="btn primary wide" type="button" data-plus="buy">${trialFirst ? `Попробовать ${TRIAL_DAYS} дней бесплатно` : `Оформить за ${esc(plan.price)}`}</button>
          <p class="fine">${trialFirst ? `Первые ${TRIAL_DAYS} дней бесплатно, потом ${esc(plan.price)} ${esc(plan.per)}. ` : ''}Продлевается автоматически, отменить можно в Google Play в любой момент.${demo ? ' Тестовая сборка: оплата не списывается.' : ''}</p>
          ${api.provider ? '<button class="btn ghost wide" type="button" data-plus="restore">Восстановить покупки</button>' : ''}`;
      };
      const ly = document.getElementById('lyPlus');
      if (!ly._bound) {
        ly._bound = true;
        ly.addEventListener('click', async e => {
          const pl = e.target.closest('[data-plan]'); if (pl) { ly._sel(pl.dataset.plan); return; }
          const a = e.target.closest('[data-plus]'); if (!a) return;
          if (a.dataset.plus === 'buy') {
            a.disabled = true;
            let ok = false; try { ok = await api.buy(ly._plan()); } catch (_) {}
            if (ok) { ly._draw(); app.confetti(); app.toast('Фин Плюс включён', null, null, 'joy'); app.refreshAll(); if (ly._after) { const f = ly._after; ly._after = null; app.closeLayer(ly); setTimeout(f, 250); } }
            else { a.disabled = false; app.toast('Не получилось оформить. Попробуй ещё раз', null, null, 'oops'); }
          } else if (a.dataset.plus === 'restore') {
            const ok = await api.restore(); if (ok) { ly._draw(); app.refreshAll(); } else app.toast('Подписки не нашлось');
          } else if (a.dataset.plus === 'off') { api.cancelDemo(); ly._draw(); app.refreshAll(); }
        });
      }
      ly._after = after || null;
      ly._sel = id => { sel = id; draw(); };
      ly._plan = () => sel;
      ly._draw = draw;
      draw();
      if (ly.hidden) app.openLayer(ly);
    }
  };
  MD.sub = api;
})(typeof window !== 'undefined' ? window : globalThis);
