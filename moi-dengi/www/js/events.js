/* Праздники и подарки: чей-то день рождения или праздник, и напоминание заранее отложить деньги.
   Чистые функции (без экрана), проверяются тестами: npm test.
   fest = { ask: true, list: [ { id, title, person, date: 'YYYY-MM-DD', yearly: true,
            remind: { on, lead: { kind: 'weeks' | 'months' | 'date', n, date } }, nid } ] }
   nextOccurrence(ev, today) → Date | null        ближайшая дата праздника
   remindDate(ev, today)     → { occ, rd } | null  когда напомнить (не в прошлом; для ежегодных — в следующем году)
   notification(ev, now)     → { id, title, body, schedule } | null   готовое локальное уведомление Android */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null; };
  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  /* месяц назад с учётом коротких месяцев: 31 марта минус месяц = 28/29 февраля */
  function addMonths(d, n) {
    const t = new Date(d.getFullYear(), d.getMonth() + n, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
  }
  /* день и месяц в нужном году; 29 февраля в невисокосный год становится 28 февраля */
  function inYear(d, y) { const last = new Date(y, d.getMonth() + 1, 0).getDate(); return new Date(y, d.getMonth(), Math.min(d.getDate(), last)); }

  const LEADS = [
    { id: 'w2', kind: 'weeks', n: 2, label: 'За 2 недели' },
    { id: 'm1', kind: 'months', n: 1, label: 'За месяц' },
    { id: 'm2', kind: 'months', n: 2, label: 'За 2 месяца' }
  ];
  const defaultLead = () => ({ kind: 'months', n: 1, date: '' });
  const defaultFest = () => ({ ask: true, list: [] });

  /* Режим праздника по названию: «things» — на что отложить (Новый год), «people» — кому дарим (8 Марта, 23 Февраля), «person» — один человек */
  function modeOf(title) {
    const t = String(title || '').toLowerCase().replace(/ё/g, 'е');
    if (/нов(ый|ого)\s*год|рождеств/.test(t)) return 'things';
    if (/8\s*март|23\s*феврал|14\s*феврал|валентин|женск|мужск|день\s+(матери|отца|учителя|защитник)/.test(t)) return 'people';
    return 'person';
  }
  const itemsOf = list => (Array.isArray(list) ? list : []).slice(0, 30).map(x => ({ n: String(x && x.n || '').replace(/\s+/g, ' ').trim().slice(0, 30), a: Math.max(0, Math.min(1e9, Math.round((Number(String(x && x.a).replace(',', '.')) || 0) * 100) / 100)) })).filter(x => x.n || x.a);
  const itemsTotal = e => Math.round((e.items || []).reduce((s, x) => s + (x.a || 0), 0) * 100) / 100;
  const str = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
  function sanitize(o) {
    const f = defaultFest();
    if (!o || typeof o !== 'object') return f;
    f.ask = o.ask !== false;
    const used = new Set();
    for (const e of Array.isArray(o.list) ? o.list.slice(0, 60) : []) {
      if (!e || typeof e !== 'object') continue;
      const date = parse(e.date) ? e.date : null; if (!date) continue;
      const title = str(e.title, 40), person = str(e.person, 30);
      const items = itemsOf(e.items);
      if (!title && !person && !items.length) continue;
      const l = e.remind && e.remind.lead || {}, kind = ['weeks', 'months', 'date'].includes(l.kind) ? l.kind : 'months';
      let nid = Math.floor(Number(e.nid)); if (!(nid >= 0 && nid < 100) || used.has(nid)) { nid = 0; while (used.has(nid)) nid++; } used.add(nid);
      f.list.push({
        id: typeof e.id === 'string' && e.id ? e.id.slice(0, 40) : 'e' + nid + Date.now().toString(36), title, person, items, date, yearly: e.yearly !== false, nid,
        remind: { on: !!(e.remind && e.remind.on), lead: { kind, n: Math.max(1, Math.min(12, Math.floor(Number(l.n)) || 1)), date: parse(l.date) ? l.date : '' } }
      });
    }
    return f;
  }
  function freeNid(list) { const used = new Set(list.map(e => e.nid)); let n = 0; while (used.has(n)) n++; return n; }

  function nextOccurrence(ev, today) {
    const d = parse(ev.date), t = midnight(today); if (!d) return null;
    if (!ev.yearly) return d >= t ? d : null;
    let o = inYear(d, t.getFullYear());
    if (o < t) o = inYear(d, t.getFullYear() + 1);
    return o;
  }
  function leadDate(ev, occ) {
    const l = ev.remind.lead;
    if (l.kind === 'weeks') return addDays(occ, -7 * l.n);
    if (l.kind === 'months') return addMonths(occ, -l.n);
    const c = parse(l.date); if (!c) return addMonths(occ, -1);
    let r = inYear(c, occ.getFullYear()); if (r > occ) r = inYear(c, occ.getFullYear() - 1);
    return r;
  }
  function remindDate(ev, today) {
    if (!ev.remind || !ev.remind.on) return null;
    const t = midnight(today);
    let occ = nextOccurrence(ev, t); if (!occ) return null;
    let rd = leadDate(ev, occ);
    if (rd < t) {
      if (!ev.yearly) return null;
      occ = inYear(parse(ev.date), occ.getFullYear() + 1); rd = leadDate(ev, occ);
    }
    return { occ, rd };
  }

  const dayText = d => `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  function leadLabel(lead) {
    if (lead.kind === 'weeks') return lead.n === 1 ? 'за неделю' : `за ${lead.n} ${lead.n < 5 ? 'недели' : 'недель'}`;
    if (lead.kind === 'months') return lead.n === 1 ? 'за месяц' : `за ${lead.n} ${lead.n < 5 ? 'месяца' : 'месяцев'}`;
    return 'в выбранный день';
  }
  const whatText = ev => {
    const m = modeOf(ev.title), names = (ev.items || []).map(x => x.n).filter(Boolean);
    if (m === 'people' && names.length) return `${ev.title}: ${names.join(', ')}`;
    return [ev.title, ev.person].filter(Boolean).join(', ');
  };
  function reminderLine(ev, today) {
    const r = remindDate(ev, today);
    if (!ev.remind.on) return 'Без напоминания';
    return r ? `Напомню ${dayText(r.rd)}` : 'Дата напоминания уже прошла';
  }

  /* Уведомление: ежегодное (месяц и день, каждый год) или разовое */
  function notification(ev, now) {
    const r = remindDate(ev, now); if (!r) return null;
    const l = ev.remind.lead;
    const lead = l.kind === 'weeks' ? (l.n === 1 ? 'Через неделю' : `Через ${l.n} ${l.n < 5 ? 'недели' : 'недель'}`) : l.kind === 'months' ? (l.n === 1 ? 'Через месяц' : `Через ${l.n} ${l.n < 5 ? 'месяца' : 'месяцев'}`) : 'Скоро';
    const body = `${lead}: ${whatText(ev)} (${dayText(r.occ)}). ${modeOf(ev.title) === 'things' ? 'Пора отложить деньги.' : 'Пора отложить деньги на подарок.'}`;
    const schedule = ev.yearly
      ? { on: { month: r.rd.getMonth() + 1, day: r.rd.getDate(), hour: 10, minute: 0 }, allowWhileIdle: true }
      : { at: new Date(r.rd.getFullYear(), r.rd.getMonth(), r.rd.getDate(), 10, 0, 0), allowWhileIdle: true };
    return { id: 200 + ev.nid, title: 'Фин', body, schedule };
  }

  function upcoming(list, today) {
    return list.map(e => ({ e, occ: nextOccurrence(e, today) })).filter(x => x.occ).sort((a, b) => a.occ - b.occ);
  }
  const daysTo = (occ, today) => Math.round((midnight(occ) - midnight(today)) / 864e5);

  const api = { modeOf, itemsTotal, sanitize, defaultFest, defaultLead, freeNid, nextOccurrence, remindDate, notification, leadLabel, reminderLine, whatText, dayText, upcoming, daysTo, addMonths, LEADS, parse, ymd };
  root.MD = root.MD || {};
  root.MD.events = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
