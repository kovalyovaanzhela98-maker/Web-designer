/* Напоминания и быстрая запись вне приложения.
   • Ежедневные напоминания — локальные уведомления Android (@capacitor/local-notifications).
   • Закреплённое уведомление «Быстрая запись» с кнопками на экране блокировки, виджет и плитка быстрых настроек — нативный код (patch-android.js).
   • Нажатия приходят сюда как fin://add/expense | income | voice и превращаются в MD.notify.onAction(kind).
   В браузере ничего из этого нет: настройки сохраняются, но не срабатывают. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const KEY = 'fin_remind';
  const DEF = { on: false, times: ['21:00'], days: [1, 2, 3, 4, 5, 6, 7], quick: false };
  const cap = root.Capacitor;
  const isNative = () => !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const cache = {};
  const plug = name => { if (!isNative()) return null; if (!cache[name]) { try { cache[name] = cap.registerPlugin(name); } catch (_) { cache[name] = null; } } return cache[name]; };
  const PHRASES = [
    'Что сегодня потратили? Запиши за 5 секунд',
    'Загляни в Фин: день почти закончился, всё записано?',
    'Чек в кармане? Скажи Фину, на что ушли деньги',
    'Минутка для денег: добавь сегодняшние траты'
  ];

  function cfg() { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { return Object.assign({}, DEF); } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (_) {} }

  async function ensurePermission() {
    const L = plug('LocalNotifications'); if (!L) return false;
    let p = await L.checkPermissions();
    if (p.display !== 'granted') p = await L.requestPermissions();
    return p.display === 'granted';
  }

  /* Расписание напоминаний: идентификаторы 100…199 */
  async function apply() {
    const L = plug('LocalNotifications'); if (!L) return { ok: false, reason: 'web' };
    const c = cfg();
    try {
      const pend = await L.getPending();
      const mine = (pend.notifications || []).filter(n => n.id >= 100 && n.id < 200);
      if (mine.length) await L.cancel({ notifications: mine.map(n => ({ id: n.id })) });
      if (!c.on || !c.times.length) return { ok: true };
      if (!(await ensurePermission())) return { ok: false, reason: 'denied' };
      await L.createChannel({ id: 'fin_remind', name: 'Напоминания', description: 'Напоминание записать траты', importance: 3, visibility: 1 });
      const list = [];
      c.times.forEach((t, ti) => {
        const [h, m] = t.split(':').map(Number);
        const base = { title: 'Фин', body: PHRASES[ti % PHRASES.length], channelId: 'fin_remind', smallIcon: 'ic_stat_fin', iconColor: '#4F6F34' };
        if (c.days.length >= 7) list.push(Object.assign({ id: 100 + ti * 10, schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } }, base));
        else c.days.forEach(d => list.push(Object.assign({ id: 100 + ti * 10 + d, schedule: { on: { weekday: (d % 7) + 1, hour: h, minute: m }, allowWhileIdle: true } }, base)));   // 1 = Пн … 7 = Вс → у Android 1 = воскресенье
      });
      if (list.length) await L.schedule({ notifications: list });
      return { ok: true };
    } catch (e) { return { ok: false, reason: 'fail' }; }
  }

  /* Закреплённое уведомление с кнопками: делает нативный плагин FinNative */
  async function setQuick(on) {
    const c = cfg(); c.quick = !!on; save(c);
    const F = plug('FinNative'); if (!F) return { ok: false, reason: 'web' };
    try {
      if (on && !(await ensurePermission())) { c.quick = false; save(c); return { ok: false, reason: 'denied' }; }
      await F.setQuickPin({ on: !!on });
      return { ok: true };
    } catch (e) { c.quick = false; save(c); return { ok: false, reason: 'fail' }; }
  }

  /* Праздники и подарки: уведомления с номерами 200…299 */
  async function applyEvents(list) {
    const L = plug('LocalNotifications'); if (!L) return { ok: false, reason: 'web' };
    try {
      const pend = await L.getPending();
      const mine = (pend.notifications || []).filter(x => x.id >= 200 && x.id < 300);
      if (mine.length) await L.cancel({ notifications: mine.map(x => ({ id: x.id })) });
      const now = new Date();
      const items = (list || []).map(e => MD.events.notification(e, now)).filter(Boolean);
      if (!items.length) return { ok: true };
      if (!(await ensurePermission())) return { ok: false, reason: 'denied' };
      await L.createChannel({ id: 'fin_gifts', name: 'Праздники и подарки', description: 'Напоминание отложить деньги на подарок', importance: 3, visibility: 1 });
      await L.schedule({ notifications: items.map(i => ({ id: i.id, title: i.title, body: i.body, schedule: i.schedule, channelId: 'fin_gifts', smallIcon: 'ic_stat_fin', iconColor: '#4F6F34' })) });
      return { ok: true };
    } catch (e) { return { ok: false, reason: 'fail' }; }
  }

  /* Обязательные платежи: уведомления с номерами 1000…1479. Только для платежей с включённым напоминанием, оплаченные месяцы пропускаем */
  async function applyPayments(list, money) {
    const L = plug('LocalNotifications'); if (!L) return { ok: false, reason: 'web' };
    try {
      const pend = await L.getPending();
      const mine = (pend.notifications || []).filter(x => x.id >= 1000 && x.id < 1500);
      if (mine.length) await L.cancel({ notifications: mine.map(x => ({ id: x.id })) });
      const items = MD.rec.notifications(list || [], new Date(), money);
      if (!items.length) return { ok: true };
      if (!(await ensurePermission())) return { ok: false, reason: 'denied' };
      await L.createChannel({ id: 'fin_pay', name: 'Обязательные платежи', description: 'Напоминание записать обязательный платёж', importance: 3, visibility: 1 });
      await L.schedule({ notifications: items.map(i => ({ id: i.id, title: i.title, body: i.body, schedule: { at: i.at, allowWhileIdle: true }, channelId: 'fin_pay', extra: { pay: i.pid }, smallIcon: 'ic_stat_fin', iconColor: '#4F6F34' })) });
      return { ok: true };
    } catch (e) { return { ok: false, reason: 'fail' }; }
  }

  /* Напоминания откладывать на цель: номера 2000…2999, до 12 ближайших дат на цель */
  async function applyGoals(goals, money) {
    const L = plug('LocalNotifications'); if (!L) return { ok: false, reason: 'web' };
    try {
      const pend = await L.getPending();
      const mine = (pend.notifications || []).filter(x => x.id >= 2000 && x.id < 3000);
      if (mine.length) await L.cancel({ notifications: mine.map(x => ({ id: x.id })) });
      const now = new Date(), items = [];
      (goals || []).forEach(g => {
        if (g.saved >= g.target) return;
        const per = MD.goals.perPeriodNow(g, now), body = `Пора отложить на «${g.name}»${per ? `: ${money(per)}` : ''}`;
        MD.goals.reminderDates(g, now, 12).forEach((at, i) => items.push({ id: 2000 + (g.nid || 0) * 20 + i, title: 'Фин', body, schedule: { at, allowWhileIdle: true } }));
      });
      if (!items.length) return { ok: true };
      if (!(await ensurePermission())) return { ok: false, reason: 'denied' };
      await L.createChannel({ id: 'fin_goals', name: 'Копилки', description: 'Напоминание отложить деньги на цель', importance: 3, visibility: 1 });
      await L.schedule({ notifications: items.map(i => ({ id: i.id, title: i.title, body: i.body, schedule: i.schedule, channelId: 'fin_goals', smallIcon: 'ic_stat_fin', iconColor: '#0E8A4F' })) });
      return { ok: true };
    } catch (e) { return { ok: false, reason: 'fail' }; }
  }

  function kindOfUrl(url) {
    const m = String(url || '').match(/^fin:\/\/add\/(expense|income|voice)/);
    return m ? m[1] : null;
  }

  function init(onAction) {
    api.onAction = onAction;
    const L = plug('LocalNotifications');
    if (L) {
      L.addListener('localNotificationActionPerformed', e => {
        const id = e && e.actionId;
        if (e && e.notification && e.notification.extra && e.notification.extra.pay) { onAction('pay'); return; }
        onAction(id === 'income' ? 'income' : id === 'voice' ? 'voice' : 'expense');
      });
    }
    const A = plug('App');
    if (A) {
      A.addListener('appUrlOpen', e => { const k = kindOfUrl(e && e.url); if (k) onAction(k); });
      A.getLaunchUrl().then(r => { const k = kindOfUrl(r && r.url); if (k) onAction(k); }).catch(() => {});
    }
    const c = cfg();
    if (c.on) apply();
    if (c.quick) { const F = plug('FinNative'); if (F) F.setQuickPin({ on: true }).catch(() => {}); }
  }

  const api = { cfg, save, apply, applyEvents, applyPayments, applyGoals, setQuick, init, ensurePermission, supported: isNative, onAction: null, PHRASES };
  MD.notify = api;
})(typeof window !== 'undefined' ? window : globalThis);
