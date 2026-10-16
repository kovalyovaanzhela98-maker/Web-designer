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

  const api = { freeMoney, plan, addMonths, monthsWord, termLabel, monthsLeft, ymdOf };
  root.MD = root.MD || {};
  root.MD.goals = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
