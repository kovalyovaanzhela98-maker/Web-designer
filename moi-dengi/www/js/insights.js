/* Баннеры на главной: пара коротких наблюдений по твоим записям (статистика, привычки, интересные факты).
   Чистые функции, без экрана и без интернета: считаются из операций. MD.insights.build(tx, now, M) → [{ id, tone, icon, title, text }]
   M(n) — как показывать деньги («12,50 Br»). Показываем не больше двух, набор меняется по дням. */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const r2 = n => Math.round(n * 100) / 100;
  const DAY = 864e5;
  const WD = ['воскресеньям', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам'];
  const WD_ON = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
  const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONTHS_P = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  const pl = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
  const dnum = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY) : NaN; };
  const today = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
  const sum = l => r2(l.reduce((s, t) => s + t.amount, 0));

  function build(tx, now, M) {
    const T = today(now), mk = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1), pk = `${pm.getFullYear()}-${pad(pm.getMonth() + 1)}`;
    const exp = tx.filter(t => t.type === 'expense'), cur = exp.filter(t => t.date.startsWith(mk)), prev = exp.filter(t => t.date.startsWith(pk));
    const last30 = exp.filter(t => { const a = T - dnum(t.date); return a >= 0 && a <= 29; });
    const out = [];
    const add = (id, tone, icon, title, text, w = 1) => out.push({ id, tone, icon, title, text, w });

    // 1. в какой день недели тратишь больше всего (за 60 дней, не меньше 8 трат)
    const l60 = exp.filter(t => { const a = T - dnum(t.date); return a >= 0 && a <= 59; });
    if (l60.length >= 8) {
      const by = Array(7).fill(0), cnt = Array(7).fill(0);
      l60.forEach(t => { const w = new Date(t.date + 'T00:00:00').getDay(); by[w] += t.amount; cnt[w]++; });
      const w = by.indexOf(Math.max(...by)), share = Math.round(by[w] / sum(l60) * 100);
      if (share >= 20) add('weekday', 'lilac', 'calendar', `Чаще всего траты по ${WD[w]}`, `${share}% денег за два месяца уходит ${WD_ON[w]}. Знать свой день, значит, легче планировать.`);
    }
    // 2. главная категория месяца
    if (cur.length >= 3) {
      const by = {}; cur.forEach(t => { by[t.cat] = (by[t.cat] || 0) + t.amount; });
      const top = Object.keys(by).sort((a, b) => by[b] - by[a])[0], share = Math.round(by[top] / sum(cur) * 100);
      add('topcat', 'sun', 'chart', `«${top}» на первом месте`, `${share}% трат ${MONTHS_P[now.getMonth()]}: ${M(r2(by[top]))}.`);
    }
    // 3. средняя трата в день против прошлого месяца
    if (cur.length >= 3 && prev.length >= 3) {
      const d1 = Math.max(1, now.getDate()), dim = new Date(pm.getFullYear(), pm.getMonth() + 1, 0).getDate();
      const a = sum(cur) / d1, b = sum(prev) / dim, pct = Math.round((a - b) / b * 100);
      if (Math.abs(pct) >= 5) add('avgday', pct < 0 ? 'mint' : 'peach', 'wave', `${M(Math.round(a))} в день в среднем`, pct < 0 ? `На ${-pct}% меньше, чем в ${MONTHS_P[pm.getMonth()]}. Хороший темп.` : `На ${pct}% больше, чем в ${MONTHS_P[pm.getMonth()]}. Загляни в аналитику: что изменилось?`);
    }
    // 4. самая крупная трата за 30 дней
    if (last30.length >= 4) {
      const big = last30.slice().sort((a, b) => b.amount - a.amount)[0], d = new Date(big.date + 'T00:00:00');
      add('biggest', 'sky', 'cash', `Самая крупная трата: ${M(big.amount)}`, `${big.cat}${big.note ? `, ${big.note}` : ''}, ${d.getDate()} ${MONTHS_G[d.getMonth()]}. Остальные заметно меньше.`);
    }
    // 5. мелочи, которые складываются
    const small = last30.filter(t => t.amount <= 10);
    if (small.length >= 6) add('small', 'lime', 'spark', `${small.length} ${pl(small.length, 'мелкая трата', 'мелкие траты', 'мелких трат')} за месяц`, `По отдельности копейки, вместе ${M(sum(small))}.`);
    // 6. дни без трат в этом месяце
    if (cur.length >= 3) {
      const days = new Set(cur.map(t => t.date)), passed = now.getDate(), free = passed - days.size;
      if (free >= 3) add('nospend', 'mint', 'leaf', `${free} ${pl(free, 'день', 'дня', 'дней')} без трат`, `Из ${passed} ${pl(passed, 'прошедшего дня', 'прошедших дней', 'прошедших дней')} месяца в эти дни кошелёк отдыхал.`);
    }
    // 7. сколько осталось от дохода
    const inc = sum(tx.filter(t => t.type === 'income' && t.date.startsWith(mk)));
    if (inc > 0 && cur.length) { const left = Math.round((inc - sum(cur)) / inc * 100); if (left >= 0) add('left', 'mint', 'cash', `${left}% дохода осталось`, `Из ${M(inc)} в этом месяце потрачено ${M(sum(cur))}.`); else add('over', 'peach', 'cash', 'Расходы обгоняют доходы', `Потрачено на ${M(r2(sum(cur) - inc))} больше, чем пришло за месяц.`); }
    // 8. серия записей подряд
    const set = new Set(tx.map(t => dnum(t.date))); let n = 0, d = set.has(T) ? T : T - 1;
    while (set.has(d) && n < 400) { n++; d--; }
    if (n >= 3) add('streak', 'sun', 'flame', `${n} ${pl(n, 'день', 'дня', 'дней')} подряд с записями`, 'Так деньги под контролем. Не сбавляй.');
    // 9. привычка: сколько раз и на что
    const byNote = {}; last30.forEach(t => { const k = String(t.note || '').toLowerCase().trim(); if (k && k.length <= 20) (byNote[k] = byNote[k] || []).push(t); });
    const habit = Object.keys(byNote).sort((a, b) => byNote[b].length - byNote[a].length)[0];
    if (habit && byNote[habit].length >= 4) add('habit', 'lilac', 'cup', `«${habit}»: ${byNote[habit].length} ${pl(byNote[habit].length, 'раз', 'раза', 'раз')} за месяц`, `Вместе ${M(sum(byNote[habit]))}. Привычка стоит ${M(r2(sum(byNote[habit]) / byNote[habit].length))} в среднем.`);
    return out;
  }
  /* Выбор двух баннеров на сегодня: порядок слегка меняется по дням, чтобы не надоедало */
  function pick(list, now, n = 2) {
    if (list.length <= n) return list;
    const seed = Math.floor(now.getTime() / DAY), arr = list.slice();
    const k = seed % arr.length; return arr.slice(k).concat(arr.slice(0, k)).slice(0, n);
  }
  const api = { build, pick };
  root.MD = root.MD || {};
  root.MD.insights = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
