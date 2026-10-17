/* Цели: расчёт плана накопления. Чистые функции, без экрана — их можно проверить тестами (npm test).
   Фин считает, сколько откладывать в месяц, сравнивает с тем, сколько в среднем остаётся свободных денег,
   и предлагает вариант. Человек соглашается или уточняет — тогда план пересчитывается. */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const r2 = n => Math.round(n * 100) / 100;

  /* Сколько в среднем остаётся свободным в месяц: доходы минус расходы за последние полные месяцы (до трёх).
     Если полных месяцев с операциями нет — берём текущий. Нет данных вообще — null. */
  function freeMoney(tx, now) {
    const sums = [];
    for (let k = 1; k <= 3; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1), mk = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const list = tx.filter(t => t.date.startsWith(mk));
      if (list.length) sums.push(list.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
    }
    if (!sums.length) {
      const mk = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const list = tx.filter(t => t.date.startsWith(mk));
      if (!list.length) return null;
      sums.push(list.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
    }
    return r2(sums.reduce((a, b) => a + b, 0) / sums.length);
  }

  /* План: target — сумма цели, saved — уже отложено, months — срок, free — свободно в месяц (или null) */
  function plan({ target, saved = 0, months, free = null }) {
    const need = Math.max(r2(target - saved), 0);
    const m = Math.max(1, Math.round(months));
    const monthly = Math.ceil(need / m);
    let verdict = 'unknown', altMonths = null, ratio = null;
    if (need === 0) verdict = 'done';
    else if (free !== null) {
      ratio = free > 0 ? monthly / free : Infinity;
      verdict = ratio <= 0.6 ? 'easy' : ratio <= 1 ? 'ok' : 'hard';
      if (verdict === 'hard' && free > 0) altMonths = Math.ceil(need / free);
    }
    return { need, months: m, monthly, free, ratio, verdict, altMonths };
  }

  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), 28)); }
  function monthsWord(n) {
    const a = n % 100, b = n % 10;
    if (a >= 11 && a <= 14) return 'месяцев';
    return b === 1 ? 'месяц' : b >= 2 && b <= 4 ? 'месяца' : 'месяцев';
  }
  /* «1 год 3 месяца» для длинных сроков */
  function termLabel(n) {
    if (n < 12) return `${n} ${monthsWord(n)}`;
    const y = Math.floor(n / 12), r = n % 12, yw = y % 10 === 1 && y % 100 !== 11 ? 'год' : (y % 10 >= 2 && y % 10 <= 4 && (y % 100 < 12 || y % 100 > 14)) ? 'года' : 'лет';
    return r ? `${y} ${yw} ${r} ${monthsWord(r)}` : `${y} ${yw}`;
  }
  /* Сколько месяцев осталось у сохранённой цели (по дате окончания) */
  function monthsLeft(deadline, now) {
    const d = new Date(deadline + 'T00:00:00');
    return Math.max(0, (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth());
  }
  const ymdOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;


  /* ---------- Срок в неделях или месяцах, взносы, напоминания, календарь пропусков ---------- */
  const DAYMS = 864e5;
  const ymdP = x => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const mid = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const monday = d => { const x = mid(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };   // понедельник той же недели
  const pl = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
  const weeksWord = n => pl(n, 'неделя', 'недели', 'недель');
  /* «2 недели», «3 месяца», «1 год» */
  function unitLabel(n, unit) { return unit === 'week' ? `${n} ${weeksWord(n)}` : termLabel(n); }
  const perWord = unit => (unit === 'week' ? 'в неделю' : 'в месяц');
  function addTerm(d, n, unit) { return unit === 'week' ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * n) : addMonths(d, n); }

  /* План по сроку {n, unit}. Сравниваем с тем, сколько в среднем остаётся за месяц (вес недели = 12/52 месяца) */
  function planTerm({ target, saved = 0, n, unit = 'month', free = null }) {
    const need = Math.max(r2(target - saved), 0), k = Math.max(1, Math.round(n));
    const perPeriod = Math.ceil(need / k), monthlyEq = unit === 'week' ? perPeriod * 52 / 12 : perPeriod;
    let verdict = 'unknown', altN = null, ratio = null;
    if (need === 0) verdict = 'done';
    else if (free !== null) {
      ratio = free > 0 ? monthlyEq / free : Infinity;
      verdict = ratio <= 0.6 ? 'easy' : ratio <= 1 ? 'ok' : 'hard';
      if (verdict === 'hard' && free > 0) altN = unit === 'week' ? Math.ceil(need / (free * 12 / 52)) : Math.ceil(need / free);
    }
    return { need, n: k, unit, perPeriod, monthlyEq: Math.round(monthlyEq), free, ratio, verdict, altN };
  }
  /* Сколько периодов осталось у цели, и сколько нужно отложить в каждый из оставшихся */
  function periodsLeft(g, now) {
    const unit = g.unit === 'week' ? 'week' : 'month', d = ymdP(g.deadline); if (!d) return 0;
    if (unit === 'week') return Math.max(0, Math.ceil((mid(d) - mid(now)) / (7 * DAYMS)));
    return monthsLeft(g.deadline, now);
  }
  function perPeriodNow(g, now) {
    const left = Math.max(0, r2(g.target - g.saved)), k = periodsLeft(g, now);
    return left === 0 ? 0 : k ? Math.ceil(left / k) : left;
  }
  /* Номер периода даты относительно начала цели: недели считаем от понедельника, месяцы календарные */
  function periodIndex(date, g) {
    const c = ymdP(g.created) || date;
    return g.unit === 'week' ? Math.round((monday(date) - monday(c)) / (7 * DAYMS)) : (date.getFullYear() - c.getFullYear()) * 12 + date.getMonth() - c.getMonth();
  }
  const sumLog = (g, idx) => (g.log || []).reduce((s, x) => { const d = ymdP(x.d); return d && periodIndex(d, g) === idx ? s + x.a : s; }, 0);
  /* Полоска периодов: сделано, пропущено, сейчас, впереди. Не больше 24 клеток, окно держится вокруг «сейчас» */
  function strip(g, now) {
    const total = Math.max(1, g.unit === 'week' ? Math.ceil(((ymdP(g.deadline) || now) - monday(ymdP(g.created) || now)) / (7 * DAYMS)) : Math.max(1, (() => { const c = ymdP(g.created) || now, d = ymdP(g.deadline) || now; return (d.getFullYear() - c.getFullYear()) * 12 + d.getMonth() - c.getMonth(); })()));
    const cur = Math.min(Math.max(periodIndex(now, g), 0), total - 1);
    const per = perPeriodNow({ ...g, saved: 0 }, ymdP(g.created) || now) || 0;
    let from = 0, to = total;
    if (total > 24) { from = Math.max(0, Math.min(cur - 12, total - 24)); to = from + 24; }
    const cells = [];
    for (let i = from; i < to; i++) {
      const sum = sumLog(g, i);
      cells.push({ i, sum, status: i > cur ? 'next' : i === cur ? (sum > 0 ? 'done' : 'now') : (sum > 0 ? 'done' : 'miss'), full: per > 0 && sum >= per });
    }
    return { cells, total, cur, from, to, missed: cells.filter(c => c.status === 'miss').length, done: cells.filter(c => c.status === 'done').length };
  }
  /* Лучший день откладывать: когда обычно приходят деньги (день недели или число месяца), иначе пятница или 5-е */
  function suggestDay(tx, unit) {
    const inc = tx.filter(t => t.type === 'income').slice(-30), cnt = {};
    for (const t of inc) { const d = ymdP(t.date); if (!d) continue; const k = unit === 'week' ? ((d.getDay() + 6) % 7) + 1 : Math.min(d.getDate(), 28); cnt[k] = (cnt[k] || 0) + 1; }
    const best = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    return best ? { day: Number(best), fromIncome: true } : { day: unit === 'week' ? 5 : 5, fromIncome: false };
  }
  const WD_FULL = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];
  const dayName = (unit, day) => (unit === 'week' ? `в ${WD_FULL[day - 1]}` : `${day}-го числа`);
  /* Ближайшие даты напоминаний цели (для уведомлений): remind = { on, day, time:'HH:MM' } */
  function reminderDates(g, now, count = 12) {
    const r = g.remind; if (!r || !r.on) return [];
    const [h, mi] = String(r.time || '10:00').split(':').map(Number), out = [];
    const end = ymdP(g.deadline); let d = mid(now);
    for (let guard = 0; guard < 800 && out.length < count; guard++, d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      if (end && d > end) break;
      const hit = g.unit === 'week' ? ((d.getDay() + 6) % 7) + 1 === r.day : d.getDate() === Math.min(r.day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi, 0);
      if (hit && at > now) out.push(at);
    }
    return out;
  }
  /* Что показать на главной: пора отложить (напоминание включено, день наступил, в этом периоде ещё не откладывали)
     или совет включить напоминание. Одна карточка за раз. */
  function homeCard(goals, tx, now) {
    for (const g of goals) {
      if (g.saved >= g.target) continue;
      const idx = periodIndex(now, g), done = sumLog(g, idx) > 0, per = perPeriodNow(g, now);
      if (!per || done) continue;
      const r = g.remind;
      if (r && r.on) {
        const dueDay = g.unit === 'week' ? ((now.getDay() + 6) % 7) + 1 >= r.day : now.getDate() >= Math.min(r.day, 28);
        if (dueDay) return { kind: 'due', goal: g, amount: per };
      } else {
        const s = suggestDay(tx, g.unit === 'week' ? 'week' : 'month');
        return { kind: 'suggest', goal: g, amount: per, day: s.day, fromIncome: s.fromIncome };
      }
    }
    return null;
  }

  const api = { freeMoney, plan, addMonths, monthsWord, termLabel, monthsLeft, ymdOf, planTerm, unitLabel, perWord, addTerm, weeksWord, periodsLeft, perPeriodNow, periodIndex, sumLog, strip, suggestDay, dayName, reminderDates, homeCard };
  root.MD = root.MD || {};
  root.MD.goals = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
