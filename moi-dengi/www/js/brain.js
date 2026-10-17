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
  const COLORS = { Продукты: '#3B82F6', Кафе: '#F59E0B', Транспорт: '#14B8A6', Дом: '#8B5CF6', Здоровье: '#EF4444', Одежда: '#EC4899', Связь: '#06B6D4', Подписки: '#6366F1', Подарки: '#F97316', Развлечения: '#EAB308', Другое: '#94A3B8', Зарплата: '#1F8A5B', Подработка: '#14B8A6', Подарок: '#F97316', Возврат: '#3B82F6' };
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
      const rows = byCat(list, 'expense').slice(0, 6).map(([c, s]) => ({ l: c, v: M(s), color: COLORS[c], pct: Math.round(s / exp * 100) }));
      return { blocks: [T(`Больше всего ушло на <em>${esc(rows[0].l)}</em>: ${rows[0].pct}% расходов.`), { t: 'card', title: 'Куда уходят деньги', sub: `${p.label}, всего ${M(exp)}`, rows, bars: true, split: 0 }], quick: ['Сравни с прошлым месяцем', 'Совет'] };
    };

    H.balance = () => {
      const bal = r2((ctx.startBalance || 0) + sumOf(all, 'income') - sumOf(all, 'expense'));
      const cur = monthP(now.getFullYear(), now.getMonth(), false, true), list = inP(all, cur);
      return { blocks: [T(`Сейчас на счёте <em>${esc(M(bal))}</em>.<small>В этом месяце пришло ${esc(M(sumOf(list, 'income')))}, потрачено ${esc(M(sumOf(list, 'expense')))}.</small>`)], quick: ['Сколько можно тратить в день', 'Сводка за месяц'] };
    };

    H.daily = () => {
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

    return H;
  };

  /* ---------- Распознавание намерения ---------- */
  const Q = /^(сколько|что|как|куда|почему|когда|покажи|расскажи|дай|сделай|сравни|посчитай|где|на что|можно ли|хватит ли|какой|какая|какие|скажи|подскажи|есть ли|а\s)/;
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
    const text = norm(input);
    ctx = Object.assign({ now: new Date(), tx: [], goals: [], sym: 'Br', startBalance: 0, freeMoney: null, last: null, accounts: [] }, ctx);
    const H = make(ctx);
    if (!text) return { blocks: [T('Напиши, что записать или о чём спросить.')], quick: [] };
    const p = periodOf(text, ctx.now), hasP = !p.isDefault;
    const isQ = Q.test(text) || /\?\s*$/.test(text);

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
      if (items.length) {
        const inc = items.filter(i => i.type === 'income').length;
        return { blocks: [{ t: 'draft', items, intro: items.length === 1 ? `Записать ${inc ? 'доход' : 'трату'}?` : `Нашёл записей: ${items.length}. Сохранить?` }], quick: [] };
      }
    }

    for (const [re, fn] of SMALL) if (re.test(text) && text.length < 60 && !/сколько|потрат/.test(text)) return fn(ctx);

    const L = (intent, r) => { r.last = r.last || { intent }; return r; };
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
    return { blocks: [T('Об этом у меня нет готового ответа: я считаю твои деньги, а не нейросеть. Могу поговорить о тратах и накоплениях. Спроси: «сколько потратил на кофе», «сводка за месяц», «куда уходят деньги». Или скажи, что записать: «такси 12».')], quick: ['Сводка за месяц', 'Куда уходят деньги', 'Что ты умеешь'] };
  }

  const api = { reply, periodOf };
  root.MD = root.MD || {};
  root.MD.brain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
