/* Обязательные платежи: аренда, подписка, кредит. Фин напоминает и помогает записать, сам ничего не списывает
   и операций сам не создаёт: человек подтверждает.
   Чистые функции (без экрана), проверяются тестами: npm test.
   rec = { list: [ { id, name, amount, cat, days: [{from:'YYYY-MM', day}], remind: 'off'|'0'|'1'|'3', time:'HH:MM',
                     start:'YYYY-MM', paid: { 'YYYY-MM': 'txId' | 'manual' }, nid } ] }
   День платежа меняется с нового месяца: старые отметки (paid) сохраняются, новый день берётся из days. */
(function (root) {
  'use strict';
  const FREE_LIMIT = 10, MAX = 40, TOL = 2;
  const pad = n => String(n).padStart(2, '0');
  const mkOf = (y, m) => `${y}-${pad(m + 1)}`;
  const mkOfDate = d => mkOf(d.getFullYear(), d.getMonth());
  const parseYmd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const shiftMk = (mk, n) => { const [y, m] = mk.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return mkOf(d.getFullYear(), d.getMonth()); };
  const r2 = n => Math.round(n * 100) / 100;

  const REMIND = [
    { id: 'off', label: 'Не напоминать', lead: null },
    { id: '0', label: 'В день платежа', lead: 0 },
    { id: '1', label: 'За 1 день', lead: 1 },
    { id: '3', label: 'За 3 дня', lead: 3 },
    { id: 'custom', label: 'Свой срок', lead: 7 }
  ];
  const PRESETS = [['Аренда', 'Дом'], ['Подписка', 'Подписки'], ['Кредит', 'Кредиты'], ['Связь', 'Связь']];

  const defaultRec = () => ({ list: [] });
  const str = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
  function sanitize(o, cats) {
    const rec = defaultRec();
    if (!o || typeof o !== 'object') return rec;
    const used = new Set();
    for (const p of Array.isArray(o.list) ? o.list.slice(0, MAX) : []) {
      if (!p || typeof p !== 'object') continue;
      const name = str(p.name, 30), amount = Number(p.amount);
      if (!name || !(amount > 0)) continue;
      const once = parseYmd(p.once) ? p.once : '';
      const days = once ? [{ from: '0000-00', day: Number(once.slice(8)) }] : (Array.isArray(p.days) ? p.days : []).map(d => ({ from: /^\d{4}-\d{2}$/.test(d && d.from) ? d.from : '0000-00', day: Math.max(1, Math.min(31, Math.floor(Number(d && d.day)) || 0)) })).filter(d => d.day >= 1).sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
      if (!days.length) continue;
      let nid = Math.floor(Number(p.nid)); if (!(nid >= 0 && nid < MAX) || used.has(nid)) { nid = 0; while (used.has(nid)) nid++; } used.add(nid);
      const paid = {};
      Object.keys(p.paid && typeof p.paid === 'object' ? p.paid : {}).sort().slice(-36).forEach(k => { if (/^\d{4}-\d{2}$/.test(k)) paid[k] = str(p.paid[k], 60) || 'manual'; });
      const okR = id => REMIND.some(r => r.id === id) && id !== 'off';
      const rl = (Array.isArray(p.remind) ? p.remind : [p.remind]).filter((id, i, a) => okR(id) && a.indexOf(id) === i).slice(0, 4);
      const remind = !rl.length ? 'off' : rl.length === 1 ? rl[0] : rl;        // одно значение остаётся строкой, несколько — массив
      rec.list.push({
        once,
        id: typeof p.id === 'string' && p.id ? p.id.slice(0, 40) : 'p' + nid + Date.now().toString(36),
        name, amount: r2(amount), cat: cats && !cats.includes(p.cat) ? 'Другое' : str(p.cat, 30) || 'Другое', days,
        remind, leadN: p.leadN == null || !Number.isFinite(Number(p.leadN)) ? 7 : Math.max(0, Math.min(60, Math.floor(Number(p.leadN)))), time: /^\d{2}:\d{2}$/.test(p.time) ? p.time : '10:00',
        start: once ? once.slice(0, 7) : /^\d{4}-\d{2}$/.test(p.start) ? p.start : '0000-00', paid, nid
      });
    }
    return rec;
  }
  const freeNid = list => { const used = new Set(list.map(p => p.nid)); let n = 0; while (used.has(n)) n++; return n; };

  /* Платёж действует в месяце mk: ежемесячный с начала, разовый только в месяце своей даты */
  const active = (p, mk) => p.start <= mk && (!p.once || p.once.slice(0, 7) === mk);
  /* День платежа в нужном месяце: 31-е в коротком месяце уходит на последний день */
  function dayFor(p, mk) { let d = p.days[0].day; for (const x of p.days) if (x.from <= mk) d = x.day; return d; }
  const curDay = p => p.days[p.days.length - 1].day;
  function dateOf(p, mk) { if (p.once) return parseYmd(p.once); const [y, m] = mk.split('-').map(Number); return new Date(y, m - 1, Math.min(dayFor(p, mk), daysIn(y, m - 1))); }
  const isPaid = (p, mk) => !!p.paid[mk];
  const dayDiff = (a, b) => Math.round((midnight(a) - midnight(b)) / 864e5);

  /* С какого месяца платёж действует: если день этого месяца уже прошёл, ждём следующий */
  function startMonth(day, today) {
    const mk = mkOfDate(today);
    return day >= today.getDate() ? mk : shiftMk(mk, 1);
  }
  /* Смена дня: новый день действует со следующего месяца, прошлые отметки остаются */
  function setDay(p, day, today) {
    const from = shiftMk(mkOfDate(today), 1), last = p.days[p.days.length - 1];
    if (last.day === day) return;
    if (last.from === from) last.day = day; else p.days.push({ from, day });
  }

  /* Статус в месяце: paid | late (день прошёл, операции нет) | wait */
  function statusOf(p, mk, today) {
    if (isPaid(p, mk)) return 'paid';
    const d = dateOf(p, mk), cur = mkOfDate(today);
    return mk === cur && dayDiff(d, today) < 0 ? 'late' : 'wait';
  }
  /* Строки списка на месяц (платежи, которые в этом месяце уже действуют), по дате */
  function monthRows(list, mk, today) {
    return list.filter(p => active(p, mk)).map(p => ({ p, date: dateOf(p, mk), status: statusOf(p, mk, today) })).sort((a, b) => a.date - b.date || a.p.name.localeCompare(b.p.name));
  }
  /* Ближайший: сначала то, что в этом месяце ещё не закрыто (в том числе вчерашнее), потом следующий месяц */
  function nextDue(list, today) {
    const cur = mkOfDate(today), nxt = shiftMk(cur, 1), out = [];
    for (const p of list) {
      if (active(p, cur) && !isPaid(p, cur)) out.push({ p, mk: cur, date: dateOf(p, cur) });
      else if (active(p, nxt) && !isPaid(p, nxt)) out.push({ p, mk: nxt, date: dateOf(p, nxt) });
    }
    out.sort((a, b) => a.date - b.date);
    const f = out[0]; if (!f) return null;
    const days = dayDiff(f.date, today);
    return Object.assign(f, { days, late: days < 0 });
  }

  /* Совпала ли новая операция с неоплаченным платежом: та же категория и сумма, дата в пределах ±2 дней */
  function matchTx(list, t) {
    if (!t || t.type !== 'expense') return null;
    const td = parseYmd(t.date); if (!td) return null;
    const base = mkOfDate(td);
    let best = null;
    for (const p of list) {
      if (p.cat !== t.cat || Math.abs(p.amount - t.amount) > 0.005) continue;
      for (const mk of [shiftMk(base, -1), base, shiftMk(base, 1)]) {
        if (!active(p, mk) || isPaid(p, mk)) continue;
        const diff = Math.abs(dayDiff(dateOf(p, mk), td));
        if (diff <= TOL && (!best || diff < best.diff)) best = { p, mk, diff };
      }
    }
    return best;
  }

  /* Похоже ли на обязательный платёж, но сумма другая (больше или меньше обычной) */
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
  function similar(list, t) {
    if (!t || t.type !== 'expense') return null;
    const td = parseYmd(t.date); if (!td) return null;
    const base = mkOfDate(td), note = norm(t.note), cat = norm(t.cat);
    let best = null;
    for (const p of list) {
      const nm = norm(p.name), byName = nm.length >= 3 && (note.includes(nm) || nm.includes(note) && note.length >= 4 || cat.includes(nm));
      const byCat = p.cat === t.cat && t.amount >= p.amount * 0.5 && t.amount <= p.amount * 4;
      if (!byName && !byCat) continue;
      for (const mk of [base, shiftMk(base, -1)]) {
        if (!active(p, mk) || isPaid(p, mk)) continue;
        const diff = Math.abs(dayDiff(dateOf(p, mk), td));
        if (diff <= 20 && (!best || diff < best.diff)) best = { p, mk, diff, extra: r2(t.amount - p.amount), more: t.amount > p.amount + 0.005 };
      }
    }
    return best;
  }
  const isLoan = p => /(кредит|ипотек|займ|рассрочк|лизинг)/.test(norm(p.name) + ' ' + norm(p.cat));
  /* На сколько раньше закроется кредит, если внести лишнее: лишнее делим на обычный взнос = «сколько взносов сэкономили» */
  function earlier(p, extra) {
    const months = extra / p.amount, days = Math.round(months * 30);
    if (days < 1) return 'меньше чем на день';
    if (days < 14) return `примерно на ${days} ${pl(days, 'день', 'дня', 'дней')}`;
    if (days < 60) { const w = Math.round(days / 7); return `примерно на ${w} ${pl(w, 'неделю', 'недели', 'недель')}`; }
    const m = Math.round(months * 10) / 10; const mm = String(m).replace('.', ',');
    return `примерно на ${mm} ${Number.isInteger(m) ? pl(m, 'месяц', 'месяца', 'месяцев') : 'месяца'}`;
  }
  /* Все платежи и праздники в один день: список для вопроса «не забыл ли?» */
  const dueOn = (list, date, today) => monthRows(list, mkOfDate(date), today).filter(r => r.status !== 'paid' && dayDiff(r.date, date) === 0);

  const pl = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
  /* «сегодня», «завтра», «через 3 дня», «вчера», «5 дней назад» */
  function whenText(days) {
    if (days === 0) return 'сегодня';
    if (days === 1) return 'завтра';
    if (days === -1) return 'вчера';
    return days > 0 ? `через ${days} ${pl(days, 'день', 'дня', 'дней')}` : `${-days} ${pl(-days, 'день', 'дня', 'дней')} назад`;
  }
  const lowerFirst = s => (/^[А-ЯЁ][а-яё\s]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  /* «Аренда 500 Br через 3 дня» */
  const dueLine = (p, days, money) => `${cap(p.name)} ${money(p.amount)} ${whenText(days)}`;
  /* Текст уведомления: «Завтра аренда 500 Br, записать» */
  function pushBody(p, lead, money) {
    const w = lead === 0 ? 'Сегодня' : lead === 1 ? 'Завтра' : `Через ${lead} ${pl(lead, 'день', 'дня', 'дней')}`;
    return `${w} ${lowerFirst(p.name)} ${money(p.amount)}, записать`;
  }
  /* Набор включённых напоминаний платежа: строка (одно значение) или массив */
  const remindIds = p => (Array.isArray(p.remind) ? p.remind : [p.remind]).filter(id => id && id !== 'off' && REMIND.some(r => r.id === id));
  /* Локальные уведомления вперёд: только для включённых напоминаний и неоплаченных месяцев. Номера 1000…1999 */
  function notifications(list, now, money) {
    const out = [], cur = mkOfDate(now);
    for (const p of list) {
      const ids = remindIds(p), mpr = ids.length <= 2 ? 12 : 6;
      ids.forEach((rid, k) => {
        const r0 = REMIND.find(x => x.id === rid); if (!r0 || r0.lead === null) return;
        const r = r0.id === 'custom' ? { lead: Math.max(0, Math.min(60, Number(p.leadN) || 0)) } : r0;
        const [h, mi] = p.time.split(':').map(Number);
        for (let i = 0; i < mpr; i++) {
          const mk = shiftMk(cur, i);
          if (!active(p, mk) || isPaid(p, mk)) continue;
          const d = dateOf(p, mk), at = new Date(d.getFullYear(), d.getMonth(), d.getDate() - r.lead, h, mi, 0);
          if (at <= now) continue;
          out.push({ id: 1000 + p.nid * 24 + k * mpr + i, title: 'Фин', body: pushBody(p, r.lead, money), at, pid: p.id, mk });
        }
      });
    }
    return out;
  }
  /* Подпись в карточке: «каждое 5-е · 5 окт» или «15 ноября 2026» */
  const MG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function scheduleText(p, date, short) {
    if (p.once) { const d = parseYmd(p.once); return `${d.getDate()} ${MG[d.getMonth()]} ${d.getFullYear()}`; }
    if (short) return `каждое ${curDay(p)}-е`;
    const dd = date || dateOf(p, mkOfDate(new Date()));
    return `каждое ${curDay(p)}-е · ${dd.getDate()} ${MG[dd.getMonth()]}`;
  }
  const summary = (list, mk, today) => {
    const rows = monthRows(list, mk, today), paid = rows.filter(r => r.status === 'paid');
    return { n: rows.length, paid: paid.length, total: r2(rows.reduce((s, r) => s + r.p.amount, 0)), left: r2(rows.filter(r => r.status !== 'paid').reduce((s, r) => s + r.p.amount, 0)) };
  };

  const api = { FREE_LIMIT, MAX, REMIND, remindIds, PRESETS, defaultRec, sanitize, freeNid, dayFor, curDay, dateOf, isPaid, active, startMonth, setDay, statusOf, monthRows, nextDue, matchTx, scheduleText, similar, isLoan, earlier, dueOn, whenText, dueLine, pushBody, notifications, summary, mkOf, mkOfDate, shiftMk };
  root.MD = root.MD || {};
  root.MD.rec = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
