/* Помощник «Фин»: понимает вопросы про деньги и отвечает цифрами из записей. Работает на телефоне, без ключей.
   MD.brain.reply(text, ctx) → { blocks, quick, last }
   ctx: { now: Date, tx: [], goals: [], sym: 'Br', startBalance: 0, freeMoney: number|null, last: {intent, ...}, accounts: [] }
   blocks: { t:'text', html } | { t:'card', title, sub, rows:[{l, v, cls, color, pct}], bars:boolean } | { t:'draft', items, intro } | { t:'action', kind }
   Больше ничего не знает про экран: всё проверяется тестами (npm test). */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const r2 = n => Math.round(n * 100) / 100;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (n < -0.004 ? '−' : '') + Math.abs(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const MONTHS_P = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  const STEMS = ['январ', 'феврал', 'март', 'апрел', 'мая', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
  const plural = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
  const has = (t, re) => re.test(t);
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

  let parser = root.MD && root.MD.parseNotes ? { parseNotes: root.MD.parseNotes, pickCategory: root.MD.pickCategory } : null;
  let goalsLib = root.MD && root.MD.goals;
  if (!parser && typeof require === 'function') parser = require('./parser.js');
  if (!goalsLib && typeof require === 'function') goalsLib = require('./goals.js');

  /* ---------- Период ---------- */
  function periodOf(text, now) {
    const t = norm(text);
    const day = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const y = now.getFullYear(), m = now.getMonth();
    if (has(t, /(?<![а-я])позавчера/)) { const d = day(now, -2); return { from: ymd(d), to: ymd(d), label: 'позавчера', key: 'd2', kind: 'day' }; }
    if (has(t, /(?<![а-я])вчера/)) { const d = day(now, -1); return { from: ymd(d), to: ymd(d), label: 'вчера', key: 'd1', kind: 'day' }; }
    if (has(t, /(?<![а-я])сегодня/)) return { from: ymd(now), to: ymd(now), label: 'сегодня', key: 'd0', kind: 'day' };
    if (has(t, /прошл[а-яёa-z0-9]+ недел/)) return { from: ymd(day(now, -13)), to: ymd(day(now, -7)), label: 'на прошлой неделе', key: 'pw', kind: 'week' };
    if (has(t, /(недел)/)) return { from: ymd(day(now, -6)), to: ymd(now), label: 'за 7 дней', key: 'w', kind: 'week' };
    if (has(t, /(прошл\w+ месяц|в прошлом|за прошлый)/)) { const d = new Date(y, m - 1, 1); return monthP(d.getFullYear(), d.getMonth(), true); }
    if (has(t, /(этом году|за год|за весь год|в году)/)) return { from: `${y}-01-01`, to: `${y}-12-31`, label: 'в этом году', key: 'y', kind: 'year' };
    for (let i = 0; i < 12; i++) {
      if (new RegExp('(?<![а-я])' + STEMS[i]).test(t)) { const yy = i > m ? y - 1 : y; return monthP(yy, i, false); }
    }
    return monthP(y, m, false, true);
  }
  function monthP(y, m, prev, isDefault) {
    const last = new Date(y, m + 1, 0).getDate();
    return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}`, label: prev ? 'в прошлом месяце' : isDefault ? 'в этом месяце' : `в ${MONTHS_P[m]}`, name: MONTHS[m], key: `m${y}-${m}`, kind: 'month', y, m, isDefault: !!isDefault };
  }
  const explicitPeriod = (text, now) => { const p = periodOf(text, now); return p.isDefault ? null : p; };
  const inP = (list, p) => list.filter(t => t.date >= p.from && t.date <= p.to);
  const sumOf = (list, type) => r2(list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0));
  const byCat = (list, type) => { const o = {}; list.filter(t => t.type === type).forEach(t => { o[t.cat] = r2((o[t.cat] || 0) + t.amount); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const COLORS = { Продукты: '#FF9466', Кафе: '#FF9466', Транспорт: '#4F8CF5', Дом: '#FF9466', Здоровье: '#F25C6E', Одежда: '#4F8CF5', Связь: '#8A6BEF', Подписки: '#EE6CAF', Подарки: '#F25C6E', Развлечения: '#F5B82E', Другое: '#8A6BEF', Зарплата: '#58BB3C', Подработка: '#4F8CF5', Подарок: '#F25C6E', Возврат: '#F5B82E' };
  const cnt = n => `${n} ${plural(n, 'запись', 'записи', 'записей')}`;

  /* ---------- Ответы ---------- */
  const T = html => ({ t: 'text', html });
  const make = (ctx) => {
    const M = n => `${fmt(n)} ${ctx.sym}`;
    const now = ctx.now, all = ctx.tx;
    const sumCard = (p, list) => {
      const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense'), net = r2(inc - exp);
      const top = byCat(list, 'expense').slice(0, 3);
      const rows = [{ l: 'Пришло', v: '+' + M(inc), cls: 'i' }, { l: 'Потрачено', v: '−' + M(exp), cls: 'e' }, { l: net >= 0 ? 'Осталось' : 'Минус', v: M(net) }];
      top.forEach(([c, s]) => rows.push({ l: c, v: M(s), color: COLORS[c], pct: exp ? Math.round(s / exp * 100) : 0 }));
      return { t: 'card', title: p.kind === 'month' ? (p.name[0].toUpperCase() + p.name.slice(1)) : p.label[0].toUpperCase() + p.label.slice(1), sub: cnt(list.length), rows, bars: true, split: 3 };
    };
    const H = {};

    H.summary = (text, p) => {
      const list = inP(all, p);
      if (!list.length) return { blocks: [T(`За этот период записей нет. Добавь первую: нажми «+» или скажи: «кофе 5».`)], quick: ['Что ты умеешь'] };
      const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense'), net = r2(inc - exp);
      const lead = inc > 0 ? (net >= 0 ? `Ты в плюсе на <em>${esc(M(net))}</em>.` : `Расходы больше доходов на <em>${esc(M(-net))}</em>.`) : `Потрачено <em>${esc(M(exp))}</em>, доходов не записано.`;
      const top = byCat(list, 'expense')[0];
      const tail = top ? ` Больше всего ушло на «${esc(top[0])}»: ${Math.round(top[1] / (exp || 1) * 100)}%.` : '';
      return { blocks: [T(`${lead}${tail}`), sumCard(p, list)], quick: ['Сравни с прошлым месяцем', 'Самые крупные траты', 'Совет'] };
    };

    H.top = (text, p) => {
      const list = inP(all, p).filter(t => t.type === 'expense'), exp = sumOf(list, 'expense');
      if (!list.length) return { blocks: [T(`Расходов ${esc(p.label)} нет.`)], quick: ['Сводка за месяц'] };
      const topN = (/топ[ -]?(\d)/.exec(text) || [])[1], rows = byCat(list, 'expense').slice(0, topN ? +topN : 6).map(([c, s]) => ({ l: c, v: M(s), color: COLORS[c], pct: Math.round(s / exp * 100) }));
      return { blocks: [T(`Больше всего ушло на <em>${esc(rows[0].l)}</em>: ${rows[0].pct}% расходов.`), { t: 'card', title: 'Куда уходят деньги', sub: `${p.label}, всего ${M(exp)}`, rows, bars: true, split: 0 }], quick: ['Сравни с прошлым месяцем', 'Совет'] };
    };

    H.balance = () => {
      const bal = r2((ctx.startBalance || 0) + sumOf(all, 'income') - sumOf(all, 'expense'));
      const cur = monthP(now.getFullYear(), now.getMonth(), false, true), list = inP(all, cur);
      return { blocks: [T(`Сейчас на счёте <em>${esc(M(bal))}</em>.<small>В этом месяце пришло ${esc(M(sumOf(list, 'income')))}, потрачено ${esc(M(sumOf(list, 'expense')))}.</small>`)], quick: ['Сколько можно тратить в день', 'Сводка за месяц'] };
    };

    H.daily = () => ctx.freeMoney != null ? H.forecast() : H.dailyByIncome();
    H.dailyByIncome = () => {
      const cur = monthP(now.getFullYear(), now.getMonth(), false, true), list = inP(all, cur);
      const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense');
      const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), left = dim - now.getDate() + 1;
      if (inc <= 0) return { blocks: [T('Не вижу доходов за этот месяц, поэтому не могу посчитать. Добавь приход, и я скажу, сколько можно тратить в день.')], quick: ['Сводка за месяц'] };
      const rest = r2(inc - exp);
      if (rest <= 0) return { blocks: [T(`Расходы уже больше доходов на <em>${esc(M(-rest))}</em>. До конца месяца лучше тратить только необходимое.`)], quick: ['Куда уходят деньги', 'Совет'] };
      const per = Math.floor(rest / left * 100) / 100;
      return { blocks: [T(`Можно тратить около <em>${esc(M(per))}</em> в день.<small>Осталось ${esc(M(rest))} от дохода за месяц, дней до конца: ${left}.</small>`)], quick: ['Куда уходят деньги', 'Совет'] };
    };

    H.compare = (text) => {
      const y = now.getFullYear(), m = now.getMonth();
      const cur = monthP(y, m, false, true), pd = new Date(y, m - 1, 1), prev = monthP(pd.getFullYear(), pd.getMonth(), true);
      const a = inP(all, cur), b = inP(all, prev);
      const ea = sumOf(a, 'expense'), eb = sumOf(b, 'expense');
      if (!eb) return { blocks: [T('В прошлом месяце расходов нет, сравнивать пока не с чем.')], quick: ['Сводка за месяц'] };
      const pct = Math.round((ea - eb) / eb * 100);
      const lead = pct === 0 ? 'Расходы такие же, как в прошлом месяце.' : `Расходы ${pct < 0 ? 'меньше' : 'больше'} на <em>${Math.abs(pct)}%</em>, чем в прошлом месяце: ${esc(M(ea))} против ${esc(M(eb))}.`;
      const ca = Object.fromEntries(byCat(a, 'expense')), cb = Object.fromEntries(byCat(b, 'expense'));
      const diffs = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].map(c => [c, r2((ca[c] || 0) - (cb[c] || 0))]).sort((x, y2) => Math.abs(y2[1]) - Math.abs(x[1])).slice(0, 3);
      const rows = diffs.map(([c, d]) => ({ l: c, v: (d > 0 ? '+' : d < 0 ? '−' : '') + M(Math.abs(d)), cls: d > 0 ? 'e' : 'i' }));
      return { blocks: [T(lead), { t: 'card', title: 'Что изменилось', sub: 'по категориям', rows }], quick: ['Совет', 'Куда уходят деньги'] };
    };

    H.biggest = (text, p) => {
      const list = inP(all, p).filter(t => t.type === 'expense').sort((x, y2) => y2.amount - x.amount).slice(0, 3);
      if (!list.length) return { blocks: [T(`Расходов ${esc(p.label)} нет.`)], quick: ['Сводка за месяц'] };
      const rows = list.map(t => ({ l: `${t.note || t.cat}, ${t.date.slice(8)}.${t.date.slice(5, 7)}`, v: M(t.amount), color: COLORS[t.cat] }));
      return { blocks: [T(`Самая крупная трата ${esc(p.label)}: <em>${esc(M(list[0].amount))}</em>, «${esc(list[0].note || list[0].cat)}».`), { t: 'card', title: 'Крупные траты', sub: p.label, rows }], quick: ['Куда уходят деньги', 'Совет'] };
    };

    H.average = (text, p) => {
      const list = inP(all, p).filter(t => t.type === 'expense');
      if (!list.length) return { blocks: [T(`Расходов ${esc(p.label)} нет.`)], quick: [] };
      const days = p.kind === 'day' ? 1 : p.kind === 'week' ? 7 : p.kind === 'year' ? Math.max(1, Math.round((now - new Date(now.getFullYear(), 0, 1)) / 864e5) + 1) : (p.y === now.getFullYear() && p.m === now.getMonth() ? now.getDate() : new Date(p.y, p.m + 1, 0).getDate());
      return { blocks: [T(`В среднем <em>${esc(M(r2(sumOf(list, 'expense') / days)))}</em> в день ${esc(p.kind === 'day' ? p.label : p.label)}.`)], quick: ['Сколько можно тратить в день', 'Совет'] };
    };

    H.category = (text, p, ex) => {
      const list = inP(all, p).filter(t => t.type === 'expense');
      const kw = ex && ex.kw, cat = ex && ex.cat;
      let sub = list, label;
      if (kw) { sub = list.filter(t => norm(t.note).includes(kw) || norm(t.cat).includes(kw)); label = `«${kw}»`; }
      else { sub = list.filter(t => t.cat === cat); label = `«${cat}»`; }
      const total = sumOf(list, 'expense');
      if (!sub.length) return { blocks: [T(`На ${esc(label)} ${esc(p.label)} трат не нашёл.`)], quick: ['Куда уходят деньги'], last: { intent: 'category', ex } };
      const s = sumOf(sub, 'expense');
      return { blocks: [T(`На ${esc(label)} ${esc(p.label)} ушло <em>${esc(M(s))}</em>.<small>${cnt(sub.length)}, это ${total ? Math.round(s / total * 100) : 0}% всех расходов.</small>`)], quick: ['Куда уходят деньги', 'Сравни с прошлым месяцем'], last: { intent: 'category', ex } };
    };

    H.goals = (text) => {
      const wantPlan = /накопи|копить|отложить|собрать/.test(text) && /\d/.test(text);
      if (wantPlan) {
        const amtM = text.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(тыс\w*|к(?![а-я]))?/);
        let target = amtM ? Number(amtM[1].replace(/\s/g, '').replace(',', '.')) : 0;
        if (amtM && amtM[2]) target *= 1000;
        const tm = text.match(/(\d+)\s*(месяц\w*|мес\w*|год\w*|лет)/);
        let months = tm ? Number(tm[1]) * (/^(год|лет)/.test(tm[2]) ? 12 : 1) : 0;
        if (target > 0 && months > 0 && goalsLib) {
          const p = goalsLib.plan({ target, saved: 0, months, free: ctx.freeMoney == null ? null : ctx.freeMoney });
          const verdict = { easy: 'Это посильно, останется запас.', ok: 'Реально, но впритык.', hard: 'Тяжеловато для твоих доходов.', unknown: 'Твоих доходов я не знаю, поэтому не скажу, посильно ли это.', done: 'Нужная сумма уже есть.' }[p.verdict];
          return { blocks: [T(`Чтобы накопить <em>${esc(M(target))}</em> за ${esc(goalsLib.termLabel(p.months))}, нужно откладывать <em>${esc(M(p.monthly))}</em> в месяц.<small>${verdict}</small>`), { t: 'action', kind: 'newgoal', label: 'Создать цель' }], quick: [] };
        }
      }
      if (!ctx.goals.length) return { blocks: [T('Копилок пока нет. Заведи первую на главном экране: «Новая копилка». Я посчитаю, сколько откладывать в месяц.'), { t: 'action', kind: 'newgoal', label: 'Создать цель' }], quick: [] };
      const rows = ctx.goals.map(g => ({ l: g.name, v: `${Math.min(100, Math.round(g.saved / g.target * 100))}%`, pct: Math.min(100, Math.round(g.saved / g.target * 100)), color: '#4F6F34', sub: `${M(g.saved)} из ${M(g.target)}` }));
      const g0 = ctx.goals.filter(g => g.saved < g.target)[0];
      const tail = g0 ? `До «${esc(g0.name)}» осталось <em>${esc(M(r2(g0.target - g0.saved)))}</em>.` : 'Все копилки собраны.';
      return { blocks: [T(tail), { t: 'card', title: 'Копилки', sub: `${ctx.goals.length} ${plural(ctx.goals.length, 'копилка', 'копилки', 'копилок')}`, rows, bars: true, split: 0 }], quick: ['Сколько можно тратить в день'] };
    };

    H.advice = () => {
      const cur = monthP(now.getFullYear(), now.getMonth(), false, true), list = inP(all, cur);
      const exp = sumOf(list, 'expense'), inc = sumOf(list, 'income');
      if (list.length < 3) return { blocks: [T('Пока мало данных. Запиши траты за неделю, и я подскажу, где можно сэкономить.')], quick: [] };
      const tips = [], top = byCat(list, 'expense');
      if (inc > 0 && exp > inc) tips.push(`Расходы больше доходов на ${esc(M(r2(exp - inc)))}. Начни с самой крупной категории.`);
      if (top[0] && exp && top[0][1] / exp > 0.35) tips.push(`На «${esc(top[0][0])}» уходит ${Math.round(top[0][1] / exp * 100)}% расходов. Попробуй поставить лимит на неделю.`);
      const subs = list.filter(t => t.cat === 'Подписки' && t.type === 'expense');
      if (subs.length) tips.push(`Подписки: ${esc(M(sumOf(subs, 'expense')))} за месяц. Проверь, всеми ли пользуешься.`);
      const cafe = list.filter(t => t.cat === 'Кафе' && t.type === 'expense');
      if (cafe.length >= 5) tips.push(`Кафе: ${cnt(cafe.length)} на ${esc(M(sumOf(cafe, 'expense')))}. Три обеда из дома в неделю сэкономят заметную сумму.`);
      if (inc > 0 && exp < inc && (inc - exp) / inc < 0.1) tips.push(`Откладывай хотя бы 10% с прихода: это ${esc(M(r2(inc * 0.1)))} в месяц. Можно завести цель.`);
      if (!tips.length) tips.push('Всё выглядит ровно. Продолжай записывать, а я замечу, если что-то выбьется.');
      return { blocks: [T(`<em>Что я вижу</em><small>${tips.slice(0, 3).map((x, i) => `${i + 1}. ${x}`).join('<br>')}</small>`)], quick: ['Куда уходят деньги', 'Сравни с прошлым месяцем'] };
    };

    H.help = () => ({
      blocks: [T(`Я умею:<small>1. Записывать: «кофе 5 и такси 12», «вчера зарплата 2000»<br>2. Считать: «сколько потратил на кофе в октябре»<br>3. Делать сводки и сравнивать месяцы<br>4. Подсказывать, сколько можно тратить в день<br>5. Разбирать фото чека и выписку из банка: нажми скрепку</small>`)],
      quick: ['Сводка за месяц', 'Куда уходят деньги', 'Сколько можно тратить в день']
    });

    /* ---------- Поиск, счёт, тренды, сравнения: только цифры из записей ---------- */
    const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const dd = d => `${+d.slice(8)} ${MONTHS_G[+d.slice(5, 7) - 1]}`;
    const upper = x => x.charAt(0).toUpperCase() + x.slice(1);
    const pct = (a, b) => Math.round((a - b) / b * 100);
    const matcher = stem => t => norm(t.note).includes(stem) || norm(t.cat).includes(stem);
    const labelOf = (ent, sub) => { if (sub && sub.length) { const n = sub.slice().sort((x, y) => (y.date > x.date ? 1 : -1))[0]; const same = sub.every(t => t.cat === n.cat); return `«${upper(norm(n.note) && norm(n.note).includes(ent.stem) ? n.note : (same ? n.cat : ent.stem))}»`; } return `«${ent.word || ent.stem}»`; };
    const monthsBack = n => Array.from({ length: n }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1); return monthP(d.getFullYear(), d.getMonth(), false, i === n - 1); });
    const exps = list => list.filter(t => t.type === 'expense');

    H.count = (text, p, ent) => {
      const list = exps(inP(all, p)), sub = ent ? list.filter(matcher(ent.stem)) : list;
      if (!sub.length) return { blocks: [T(ent ? `Я не нашёл трат на ${esc(labelOf(ent))} ${esc(p.label)}.` : `Расходов ${esc(p.label)} нет.`)], quick: ['Сводка за месяц'] };
      return { blocks: [T(`${ent ? `По ${esc(labelOf(ent, sub))}` : 'Всего'} ${esc(p.label)}: <em>${cnt(sub.length)}</em>.<small>На сумму ${esc(M(sumOf(sub, 'expense')))}.</small>`)], quick: ['Куда уходят деньги', 'Сравни с прошлым месяцем'], last: { intent: 'count', ex: ent } };
    };
    H.lastOne = (text, ent) => {
      const sub = ent ? all.filter(matcher(ent.stem)) : all;
      if (!sub.length) return { blocks: [T(`Я не нашёл трат на ${esc(labelOf(ent || { stem: 'это' }))}.`)], quick: ['Сводка за месяц'] };
      const t = sub.slice().sort((x, y) => (y.date > x.date ? 1 : -1))[0];
      return { blocks: [T(`Последний раз ${esc(labelOf(ent, sub))}: <em>${esc(dd(t.date))}</em>, ${esc(M(t.amount))}.<small>Всего записей: ${sub.length}, на ${esc(M(sumOf(sub, t.type)))}.</small>`)], quick: ['Куда уходят деньги'] };
    };
    H.list = (text, p, ent) => {
      const sub = exps(inP(all, p)).filter(matcher(ent.stem)).sort((x, y) => (y.date > x.date ? 1 : -1));
      if (!sub.length) return { blocks: [T(`Я не нашёл трат на ${esc(labelOf(ent))} ${esc(p.label)}.`)], quick: ['Сводка за месяц', 'Куда уходят деньги'] };
      const rows = sub.slice(0, 6).map(t => ({ l: `${t.note || t.cat}, ${dd(t.date)}`, v: M(t.amount), color: COLORS[t.cat] }));
      return { blocks: [T(`На ${esc(labelOf(ent, sub))} ${esc(p.label)} ушло <em>${esc(M(sumOf(sub, 'expense')))}</em>.`), { t: 'card', title: upper(esc(labelOf(ent, sub)).replace(/[«»]/g, '')), sub: `${p.label}, ${cnt(sub.length)}`, rows }], quick: ['Куда уходят деньги'] };
    };
    H.avgCheck = (text, p, ent) => {
      const list = exps(inP(all, p)), sub = ent ? list.filter(matcher(ent.stem)) : list;
      if (!sub.length) return { blocks: [T(ent ? `Я не нашёл трат на ${esc(labelOf(ent))} ${esc(p.label)}.` : `Расходов ${esc(p.label)} нет.`)], quick: [] };
      const s = sumOf(sub, 'expense');
      return { blocks: [T(`Средний чек${ent ? ' ' + esc(labelOf(ent, sub)) : ''} ${esc(p.label)}: <em>${esc(M(r2(s / sub.length)))}</em>.<small>${cnt(sub.length)}, всего ${esc(M(s))}.</small>`)], quick: ['Куда уходят деньги', 'Сколько можно тратить в день'] };
    };
    H.vs = (text, p) => {
      const parts = norm(text).replace(/[?!.,:]/g, ' ').split(/\sили\s/);
      if (parts.length < 2) return null;
      const lastWord = side => { const ws = side.split(/\s+/).filter(w => w.length >= 4 && !/^(больше|меньше|чаще|дороже|трачу|тратишь|потратил[а-яёa-z0-9]*|сколько|что|на|или)$/.test(w)); const w = ws[ws.length - 1]; return w ? (w.length > 5 ? w.slice(0, w.length - 2) : w) : null; };
      const a = lastWord(parts[0]), b = lastWord(parts[1]);
      if (!a || !b || a === b) return null;
      const list = exps(inP(all, p)), A = list.filter(matcher(a)), B = list.filter(matcher(b));
      const sa = sumOf(A, 'expense'), sb = sumOf(B, 'expense');
      if (!sa && !sb) return { blocks: [T(`Я не нашёл трат на «${esc(a)}» и «${esc(b)}» ${esc(p.label)}.`)], quick: ['Куда уходят деньги'] };
      const la = labelOf({ stem: a }, A), lb = labelOf({ stem: b }, B);
      const big = sa >= sb ? [la, sa, lb, sb] : [lb, sb, la, sa];
      const lead = sa === sb ? `На ${esc(la)} и ${esc(lb)} ушло поровну: ${esc(M(sa))}.` : `На ${esc(la)} ушло ${esc(M(sa))}, а на ${esc(lb)} — ${esc(M(sb))}. Дороже обходится ${esc(big[0])}: на ${esc(M(r2(big[1] - big[3])))}.`;
      return { blocks: [T(lead)], quick: ['Куда уходят деньги', 'Сравни с прошлым месяцем'] };
    };
    H.trend = (text, ent) => {
      const nm = (text.match(/(\d)\s*(месяц|мес)/) || [])[1], n = Math.min(6, Math.max(3, nm ? +nm : 3)), ms = monthsBack(n);
      const sub = ent ? exps(all).filter(matcher(ent.stem)) : exps(all);
      const vals = ms.map(m => sumOf(inP(sub, m), 'expense'));
      if (!vals.some(v => v > 0)) return { blocks: [T(`Я не нашёл трат${ent ? ' на ' + esc(labelOf(ent)) : ''} за последние ${n} ${plural(n, 'месяц', 'месяца', 'месяцев')}.`)], quick: ['Сводка за месяц'] };
      const up = vals.every((v, i) => !i || v > vals[i - 1]), down = vals.every((v, i) => !i || v < vals[i - 1]);
      const what = ent ? `Траты на ${esc(labelOf(ent, sub))}` : 'Расходы';
      const lead = up ? `${what} растут ${n}-й месяц подряд.` : down ? `${what} снижаются ${n}-й месяц подряд.` : `${what} меняются неровно: то больше, то меньше.`;
      const rows = ms.map((m, i) => ({ l: upper(m.name), v: M(vals[i]) }));
      return { blocks: [T(lead), { t: 'card', title: 'Динамика', sub: `за ${n} ${plural(n, 'месяц', 'месяца', 'месяцев')}`, rows }], quick: ['Куда уходят деньги', 'Совет'], last: { intent: 'trend', ex: ent } };
    };
    H.compareCat = (text, p, ent) => {
      const y = now.getFullYear(), m = now.getMonth(), cur = monthP(y, m, false, true);
      const ex = periodOf(text, now), other = !ex.isDefault && ex.key !== cur.key && ex.kind === 'month' ? ex : (() => { const d = new Date(y, m - 1, 1); return monthP(d.getFullYear(), d.getMonth(), true); })();
      const sub = exps(all).filter(matcher(ent.stem)), a = sumOf(inP(sub, cur), 'expense'), b = sumOf(inP(sub, other), 'expense');
      const lb = labelOf(ent, sub);
      if (!a && !b) return { blocks: [T(`Я не нашёл трат на ${esc(lb)} за эти месяцы.`)], quick: ['Куда уходят деньги'] };
      if (!b) return { blocks: [T(`На ${esc(lb)} ${esc(other.label)} трат не было, сравнивать не с чем. Сейчас ${esc(M(a))}.`)], quick: ['Куда уходят деньги'] };
      const pc = pct(a, b), diff = r2(Math.abs(a - b));
      return { blocks: [T(pc === 0 ? `На ${esc(lb)} трачу столько же, как ${esc(other.label)}: ${esc(M(a))}.` : `На ${esc(lb)} ${esc(cur.label)} ${pc > 0 ? 'ушло больше' : 'ушло меньше'} на <em>${Math.abs(pc)}%</em> (${pc > 0 ? '+' : '−'}${esc(M(diff))}) чем ${esc(other.label)}.<small>${esc(M(a))} против ${esc(M(b))}.</small>`)], quick: ['Куда уходят деньги', 'Совет'] };
    };
    H.total = (text, p, type) => {
      const list = inP(all, p), s = sumOf(list, type);
      const verb = type === 'income' ? 'заработал' : 'потратил';
      if (!s) return { blocks: [T(`${upper(p.label)} ${type === 'income' ? 'доходов' : 'расходов'} нет.`)], quick: ['Сводка за месяц'] };
      let tail = '';
      if (p.kind === 'month') { const d = new Date(p.y, p.m - 1, 1), prev = monthP(d.getFullYear(), d.getMonth(), true), ps = sumOf(inP(all, prev), type); if (ps) { const pc = pct(s, ps); tail = pc === 0 ? ' Столько же, как в прошлом месяце.' : ` Это на ${Math.abs(pc)}% ${pc < 0 ? 'меньше' : 'больше'}, чем в ${MONTHS_P[d.getMonth()]}.`; } }
      return { blocks: [T(`${upper(p.label)} ты ${verb} <em>${esc(M(s))}</em>.${tail}`)], quick: ['Куда уходят деньги', 'Сравни с прошлым месяцем'], last: { intent: 'summary' } };
    };
    H.budget = (text, ent) => {
      const cur = monthP(now.getFullYear(), now.getMonth(), false, true), sub = ent ? exps(inP(all, cur)).filter(matcher(ent.stem)) : exps(inP(all, cur));
      const lb = ent ? labelOf(ent, sub) : 'расходам';
      return { blocks: [T(`Лимитов по категориям у меня нет, поэтому сказать «остаток от бюджета» честно не смогу.<small>Зато по ${esc(lb)} ${esc(cur.label)} потрачено ${esc(M(sumOf(sub, 'expense')))}. Могу посчитать, сколько можно тратить в день.</small>`)], quick: ['Сколько можно тратить в день', 'Куда уходят деньги'] };
    };
    H.forecast = () => {
      const cur = monthP(now.getFullYear(), now.getMonth(), false, true), list = inP(all, cur);
      const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), left = dim - now.getDate() + 1;
      const base = ctx.freeMoney != null ? ctx.freeMoney : r2(sumOf(list, 'income') - sumOf(list, 'expense'));
      if (ctx.freeMoney == null && !list.length) return { blocks: [T('Пока не вижу записей за этот месяц, поэтому прогноз не посчитать. Запиши приход и траты, и я скажу, хватит ли денег.')], quick: ['Что ты умеешь'] };
      if (base <= 0) return { blocks: [T(`Свободных денег до конца месяца нет: ${esc(M(base))}. Дней осталось: ${left}. Лучше тратить только необходимое.`)], quick: ['Куда уходят деньги', 'Совет'] };
      const per = Math.floor(base / left * 100) / 100;
      return { blocks: [T(`До конца месяца ${left} ${plural(left, 'день', 'дня', 'дней')}. Свободных денег ${esc(M(base))}.<small>Можно тратить по <em>${esc(M(per))}</em> в день, чтобы не уйти в минус.</small>`)], quick: ['Куда уходят деньги', 'Совет'], last: { intent: 'daily' } };
    };
    H.payments = () => {
      const R = root.MD && root.MD.recurring, list = ctx.rec || [];
      if (!R || !list.length) return { blocks: [T('Обязательных платежей пока нет. Добавь их на главном экране: «Обязательные платежи».')], quick: ['Что ты умеешь'] };
      const mk = R.mkOfDate(now), rows = R.monthRows(list, mk, now).filter(r => r.status !== 'paid');
      if (!rows.length) return { blocks: [T('В этом месяце все платежи оплачены.')], quick: ['Сводка за месяц'] };
      const total = r2(rows.reduce((a, r) => a + r.p.amount, 0));
      return { blocks: [T(`Осталось оплатить: ${rows.length} на <em>${esc(M(total))}</em>.`), { t: 'card', title: 'Платежи', sub: 'в этом месяце', rows: rows.slice(0, 6).map(r => ({ l: `${upper(r.p.name)}, ${dd(ymd(r.date))}`, v: M(r.p.amount), cls: r.status === 'late' ? 'e' : '' })) }], quick: ['Сколько можно тратить в день'] };
    };
    H.delLast = () => {
      const t = all.length ? all[all.length - 1] : null;
      if (!t) return { blocks: [T('Записей пока нет, удалять нечего.')], quick: [] };
      return { blocks: [T(`Последняя запись: <em>${esc(t.note || t.cat)}</em>, ${esc(M(t.amount))}, ${esc(dd(t.date))}. Удалить?`), { t: 'action', kind: 'deltx', label: 'Удалить запись', id: t.id }, { t: 'action', kind: 'edittx', label: 'Изменить', id: t.id }], quick: [] };
    };
    H.editAmt = (text) => {
      const ent = wordOf(text);
      const am = text.match(/на\s+(\d+(?:[.,]\d+)?)\s*(?:br|руб|р\b|byn|₽)?\s*$/) || text.match(/(\d+(?:[.,]\d+)?)\s*(?:br|руб[а-я]*|р|byn|₽)?\s*$/);
      if (!am) return null;
      const amount = Number(am[1].replace(',', '.')), p = periodOf(text, now);
      let sub = all.slice(); if (!p.isDefault) sub = inP(sub, p);
      if (ent && ent.stem !== am[1]) sub = sub.filter(matcher(ent.stem));
      sub = sub.sort((x, y) => (y.date > x.date ? 1 : -1));
      if (!sub.length) return { blocks: [T('Я не нашёл такую запись. Уточни, что именно изменить, или открой её в «Операциях».')], quick: [] };
      const t = sub[0];
      return { blocks: [T(`Нашёл: <em>${esc(t.note || t.cat)}</em>, ${esc(dd(t.date))}, сейчас ${esc(M(t.amount))}. Изменить сумму на ${esc(M(amount))}?`), { t: 'action', kind: 'setamt', label: `Изменить на ${M(amount)}`, id: t.id, amount }, { t: 'action', kind: 'edittx', label: 'Открыть запись', id: t.id }], quick: [] };
    };

    return H;
  };

  /* ---------- Распознавание намерения ---------- */
  const Q = /^(топ|траты|расходы|доходы|мои|удали|убери|измени|исправь|поменяй|последн|сколько|что|как|куда|почему|когда|покажи|расскажи|дай|сделай|сравни|посчитай|где|на что|можно ли|хватит ли|какой|какая|какие|скажи|подскажи|есть ли|а\s)/;
  const GENERIC = new Set(['сколько', 'потратил', 'потратила', 'потратили', 'трачу', 'тратил', 'потрачено', 'расходов', 'расходы', 'трат', 'траты', 'деньги', 'денег', 'месяц', 'месяце', 'прошлом', 'этом', 'октябре', 'сентябре', 'вчера', 'сегодня', 'неделю', 'неделе', 'году', 'было', 'есть', 'ушло', 'мне', 'мои', 'моих', 'всего', 'вообще', 'итого']);

  function keywordOf(text, list) {
    const toks = norm(text).replace(/[^а-яa-z0-9\s]/g, ' ').split(' ').filter(w => w.length >= 4 && !GENERIC.has(w));
    let best = null, bestN = 0;
    for (const w of toks) {
      const stem = w.length > 5 ? w.slice(0, w.length - 2) : w;
      const n = list.filter(t => norm(t.note).includes(stem)).length;
      if (n > bestN) { best = stem; bestN = n; }
    }
    return best;
  }

  const STOPW = /^(сколько|потратил[а-яёa-z0-9]*|трачу|тратил[а-яёa-z0-9]*|покупал[а-яёa-z0-9]*|ходил[а-яёa-z0-9]*|покажи|найди|последний|последн[а-яёa-z0-9]+|траты|трата|покупк[а-яёa-z0-9]*|расход[а-яёa-z0-9]*|деньги|денег|больше|меньше|чем|что|мои|мне|все|всё|этом|прошл[а-яёa-z0-9]+|месяц[а-яёa-z0-9]*|недел[а-яёa-z0-9]*|год[а-яёa-z0-9]*|дня|дней|оплат[а-яёa-z0-9]*|которые|самая|самый|большая|большой|средний|среднем|можно|осталось|лимит|бюджет|бюджета|лимиты|меня|себя|нас|тебя|него|нее|неё)$/;
  function wordOf(text) {
    const t = norm(text).replace(/[^а-яa-z0-9\s]/g, ' '), re = /(?:^|\s)(?:на|в|во|у|по|за)\s+([а-яa-z]{4,})/g;
    let m; while ((m = re.exec(t))) { const w = m[1]; if (STOPW.test(w) || STEMS.some(x => w.startsWith(x))) continue; return { stem: w.length > 5 ? w.slice(0, w.length - 2) : w, word: w }; }
    return null;
  }

  const SMALL = [
    [/^(привет|здравств|добр(ое|ый|ого)|хай|хей|hello|hi\b|салют)/, ctx => ({ blocks: [T(`Привет! Я Фин. Спроси про свои траты или просто скажи, что записать: «кофе 5».`)], quick: ['Сводка за месяц', 'Что ты умеешь'] })],
    [/(спасибо|благодарю|супер|отлично|класс)/, () => ({ blocks: [T('Рад помочь. Если что, я рядом.')], quick: ['Сводка за месяц'] })],
    [/(как дела|как ты|как жизнь|как настроен)/, ctx => ({ blocks: [T('Отлично! Считаю чужие деньги и ничего не трачу. А у тебя как с бюджетом?')], quick: ['Сводка за месяц', 'Совет'] })],
    [/(кто ты|ты кто|как тебя зовут|твоё имя|твое имя|ты робот|ты человек|ты бот|ты нейросеть)/, () => ({ blocks: [T('Я Фин, помощник по личным деньгам. Работаю прямо на твоём телефоне: считаю траты, делаю сводки и записываю по голосу.')], quick: ['Что ты умеешь'] })],
    [/(шутк|анекдот|рассмеши)/, () => ({ blocks: [T('Бюджет как диета: все знают, что надо, но записывать боятся. Давай начнём с одной записи?')], quick: ['Сводка за месяц'] })],
    [/(пока|до свидания|до встречи|удачи)(?![а-я])/, () => ({ blocks: [T('До встречи! Не забывай записывать траты.')], quick: [] })],
    [/(который час|сколько времени|какое сегодня число|какой сегодня день|какая сегодня дата)/, ctx => { const d = ctx.now, W = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']; return { blocks: [T(`Сегодня ${esc(W[d.getDay()])}, ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`)], quick: ['Сводка за месяц'] }; }],
    [/(погод|дожд|снег|жарко|холодно)/, () => ({ blocks: [T('Погоду я не знаю, у меня нет интернета. Зато знаю, сколько ты тратишь на зонтики.')], quick: ['Куда уходят деньги'] })],
    [/(что нового|чем занимаешься|что делаешь|скучно)/, () => ({ blocks: [T('Слежу за твоими цифрами. Если скучно, можем завести копилку на мечту или разобрать выписку.')], quick: ['Что ты умеешь'] })],
    [/(люблю тебя|ты мне нравишься|ты классный|ты молодец|ты умница)/, () => ({ blocks: [T('Спасибо, мне приятно. Давай вместе сделаем твои деньги спокойнее.')], quick: ['Сводка за месяц'] })],
    [/(сколько тебе лет|где ты живёшь|где ты живешь|откуда ты)/, () => ({ blocks: [T('Я живу в твоём телефоне и никуда не ухожу. Возраст не считаю, считаю только деньги.')], quick: [] })],
    [/(что такое )?инфляци/, () => ({ blocks: [T('Инфляция — это когда деньги дешевеют: на ту же сумму со временем можно купить меньше. Поэтому важно не только копить, но и следить, куда уходят траты.')], quick: ['Куда уходят деньги'] })],
    [/(что такое )?(депозит|вклад)/, () => ({ blocks: [T('Депозит — это деньги, которые ты отдаёшь банку на срок, а он платит проценты. Подходит для копилки, когда деньги точно не нужны раньше срока.')], quick: [] })],
    [/(что такое )?кредит(?![а-я])/, () => ({ blocks: [T('Кредит — деньги в долг у банка с процентами. Если вносить больше обязательного платежа, он закроется быстрее. Заведи его в обязательные платежи, и я напомню.')], quick: [] })],
    [/(что такое )?подушк[аи] безопасн/, () => ({ blocks: [T('Подушка безопасности — запас на 3–6 месяцев обычной жизни. Заведи под неё копилку, и я посчитаю взнос.')], quick: [] })],
    [/(что такое )?кэшбэк|кешбэк/, () => ({ blocks: [T('Кэшбэк — возврат части потраченного на карту. Запиши его как приход «Возврат», чтобы баланс был честным.')], quick: [] })],
    [/(грустно|плохо|устал|тяжело|денег нет|нет денег|на мели)/, () => ({ blocks: [T('Понимаю. Давай посмотрим на цифры спокойно: часто становится яснее. Могу показать, куда уходят деньги, и подсказать, где выдохнуть.')], quick: ['Куда уходят деньги', 'Совет'] })]
  ];

  function reply(input, ctx) {
    const text = norm(input).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    ctx = Object.assign({ now: new Date(), tx: [], goals: [], sym: 'Br', startBalance: 0, freeMoney: null, last: null, accounts: [] }, ctx);
    const H = make(ctx), M = n => `${fmt(n)} ${ctx.sym}`;
    if (!text) return { blocks: [T('Напиши, что записать или о чём спросить.')], quick: [] };
    // Ответ на «На что?»
    if (ctx.last && ctx.last.intent === 'ask-cat' && ctx.last.item && !/\d/.test(text) && text.length <= 30 && parser) {
      const it = ctx.last.item, names = (root.MD && root.MD.CATS ? root.MD.CATS[it.type].map(c => c[0]) : []).concat(['Другое']);
      const hit = names.find(n => norm(n) === text), cat = hit || parser.pickCategory(text, it.type);
      return { blocks: [{ t: 'draft', items: [Object.assign({}, it, { cat, note: hit || cat === 'Другое' ? '' : (it.note || '') })], intro: `Понял так: ${hit || cat === 'Другое' ? cat : (it.note || cat)}, ${M(it.amount)}, ${cat}` }], quick: [] };
    }
    if (/^записать трату$/.test(text)) return { blocks: [T('Напиши, что и сколько: «кофе 5» или «вчера такси 12». Можно сразу несколько: «50 на продукты и 15 на такси».')], quick: [] };
    if (/^записать доход$/.test(text)) return { blocks: [T('Напиши, что пришло: «зарплата 2000» или «вчера подработка 150».')], quick: [] };
    if (/^посмотреть статистику$/.test(text)) return { ...H.summary(text, periodOf('этот месяц', ctx.now)), last: { intent: 'summary' } };
    if (/^создать копилку$/.test(text)) return { blocks: [T('Скажи, на что и сколько копишь: «хочу накопить 1000 на наушники за 4 месяца». Я посчитаю взнос.'), { t: 'action', kind: 'newgoal', label: 'Создать цель' }], quick: [] };
    const p = periodOf(text, ctx.now), hasP = !p.isDefault;
    const isQ = (Q.test(text) && !/^а (еще|ещё|и) /.test(text)) || /\?\s*$/.test(text);

    // Уточнение к прошлому вопросу: «а в сентябре?»
    if (ctx.last && /^а\s/.test(text) && hasP && H[ctx.last.intent]) {
      const r = H[ctx.last.intent](text, p, ctx.last.ex);
      r.last = r.last || { intent: ctx.last.intent, ex: ctx.last.ex };
      return r;
    }

    // «Хочу накопить 3000 за 6 месяцев» — это про цель, а не про запись
    if (/(накопи|копить|накоплю|отложить|собрать на)/.test(text) && /\d/.test(text)) return { ...H.goals(text), last: { intent: 'goals' } };

    // Запись: есть сумма, это не вопрос
    if (!isQ && /(\d|ноль|один|одну|два|две|три|четыр|пят|шест|сем|восем|девят|десят|сто|двест|тысяч|полтор)/.test(text) && parser) {
      const items = parser.parseNotes(input, { today: ctx.now, accounts: ctx.accounts && ctx.accounts.length ? ctx.accounts : [{ id: 'main', name: 'Основной', last4: '' }] });
      if (items.length === 1 && items[0].cat === 'Другое' && !items[0].note) {
        const it = items[0], cats = root.MD && root.MD.CATS ? root.MD.CATS[it.type].map(c => c[0]).filter(n => n !== 'Другое').slice(0, 3) : ['Продукты', 'Кафе', 'Транспорт'];
        return { blocks: [T(it.type === 'income' ? `Что за доход на ${esc(M(it.amount))}?` : `На что потратил ${esc(M(it.amount))}?`)], quick: cats.concat(['Другое']), last: { intent: 'ask-cat', item: it } };
      }
      if (items.length) {
        const inc = items.filter(i => i.type === 'income').length;
        return { blocks: [{ t: 'draft', items, intro: items.length === 1 ? `Понял так: ${items[0].note || items[0].cat}, ${M(items[0].amount)}, ${items[0].cat}` : `Понял так: операций ${items.length}` }], quick: [] };
      }
    }

    for (const [re, fn] of SMALL) if (re.test(text) && text.length < 60 && !/сколько|потрат/.test(text)) return fn(ctx);

    const L = (intent, r) => { r.last = r.last || { intent }; return r; };
    const is = re => re.test(text);
    const ent = wordOf(text);
    if (is(/(удали|удалить|убери)\s.*(запис|трат|операци)/)) return H.delLast();
    if (is(/(измени|исправь|поменяй)\s/) && /\d/.test(text)) { const r = H.editAmt(text); if (r) return r; }
    if (is(/(какие|что за|мои).*(платеж|оплат)|(платеж[а-яёa-z0-9]*|оплат[а-яёa-z0-9]*)\s(скоро|ближайш)/)) return H.payments();
    if (is(/(сколько раз|как часто|сколько (покупок|операций|записей))/)) return L('count', H.count(text, p, ent));
    if (is(/(когда.*последн|последний раз)/)) return H.lastOne(text, ent);
    if (ent && is(/(покажи|найди|выведи|список).*(трат|покупк|операц|расход)/)) return H.list(text, p, ent);
    if (is(/ или /) && is(/(больше|дороже|чаще|меньше)/)) { const r = H.vs(text, p); if (r) return r; }
    if (is(/(раст[уё]т|падают|падает|снижа|тренд|менялись|динамик)/)) return L('trend', H.trend(text, ent));
    if (ent && is(/(сравни|больше чем|меньше чем|чем в )/)) return H.compareCat(text, p, ent);
    if (is(/(бюджет|лимит)/) && !is(/(в день|на день)/)) return H.budget(text, ent);
    if (is(/(хватит ли|до конца месяца|до зарплаты|еще смогу|ещё смогу|смогу потратить|сколько осталось)/)) return L('forecast', H.forecast());
    if (is(/средн[а-яёa-z0-9]+ чек/)) return H.avgCheck(text, p, ent);
    if (is(/(трачу|тратил[а-яёa-z0-9]*|траты|расход[а-яёa-z0-9]*).*(в день|на день)/) && !is(/можно/)) return L('average', H.average(text, p));
    if (is(/(топ[ -]?\d|куда ушл)/)) return L('top', H.top(text, p));
    if (!ent && is(/(сколько|мои|покажи).*(потратил|трат|расход)|^(траты|расходы)/) && !is(/(сводк|итог|совет|крупн)/)) return H.total(text, p, 'expense');
    if (!ent && is(/(сколько|мои).*(заработал|доход|пришло|получил)/)) return H.total(text, p, 'income');
    if (/(что ты умеешь|что умеешь|помощь|помоги мне|как пользоваться|твои возможности|что можешь)/.test(text)) return L('help', H.help());
    if (/(сводк|итог|как мои дела|как прошел|как прошла|обзор|отчет|отчёт|подведи)/.test(text)) return L('summary', H.summary(text, p));
    if (/(сравни|по сравнению|против прошл|динамик|стало больше|стало меньше|меньше чем|больше чем)/.test(text)) return L('compare', H.compare(text));
    if (/(в день|на день|бюджет на|хватит ли|можно тратить|сколько можно|дневной лимит|лимит на день)/.test(text)) return L('daily', H.daily());
    if (/(баланс|сколько у меня (денег|осталось)|остаток|сколько денег)/.test(text)) return L('balance', H.balance());
    if (/(накопи|копить|копл|цел[иья]|отложить|отпуск)/.test(text)) return L('goals', H.goals(text));
    if (/(совет|сэконом|экономи|подскаж|как тратить меньше|где сократить|оптимиз)/.test(text)) return L('advice', H.advice());
    if (/(крупн|самая больш|самый больш|дорог)/.test(text) && /(трат|покупк|расход)/.test(text)) return L('biggest', H.biggest(text, p));
    if (/(в среднем|средн)/.test(text)) return L('average', H.average(text, p));
    if (/(куда (уходят|ушли|деваются)|на что (трачу|тратил|ушло|уходит)|больше всего|структур|топ )/.test(text)) return L('top', H.top(text, p));
    if (/(сколько|потрат|трачу|расход)/.test(text)) {
      const list = inP(ctx.tx, p).filter(t => t.type === 'expense');
      const kw = keywordOf(text, ctx.tx);
      const cat = parser ? parser.pickCategory(text, 'expense') : 'Другое';
      if (kw) return H.category(text, p, { kw });
      if (cat !== 'Другое') return H.category(text, p, { cat });
      if (/(доход|получил|заработал|пришло)/.test(text)) {
        const inc = sumOf(inP(ctx.tx, p), 'income');
        return { blocks: [T(`Доходов ${esc(p.label)}: <em>${esc(`${fmt(inc)} ${ctx.sym}`)}</em>.`)], quick: ['Сводка за месяц'], last: { intent: 'summary' } };
      }
      return L('summary', list.length ? H.summary(text, p) : H.summary(text, p));
    }
    if (/(доход|зарплат|заработал)/.test(text)) {
      const inc = sumOf(inP(ctx.tx, p), 'income');
      return { blocks: [T(`Доходов ${esc(p.label)}: <em>${esc(`${fmt(inc)} ${ctx.sym}`)}</em>.`)], quick: ['Сводка за месяц'] };
    }
    return { blocks: [T('Я пока не умею отвечать на такие вопросы. Но я могу: посчитать траты за месяц, найти самую крупную покупку, сравнить расходы с прошлым месяцем или показать, сколько осталось до конца месяца. Что выбрать?')], quick: ['Записать трату', 'Посмотреть статистику', 'Создать копилку', 'Самая крупная покупка'], fallback: true };
  }

  const api = { reply, periodOf };
  root.MD = root.MD || {};
  root.MD.brain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
