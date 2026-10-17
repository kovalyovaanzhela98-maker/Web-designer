/* «Фин заметил»: мягкие подсказки по повторяющимся тратам. Без нейросетей и внешних API, только правила.
   Движок чистый (без экрана), проверяется тестами: npm test.
   analyze(tx, st, ctx)  → { hits, lim }      тяжёлая часть: считает паттерны по операциям
   settle(st, an, ctx)   → { changed }         лёгкая часть: проверяет активную подсказку и выбирает новую
   describe(st, tx, ctx) → { text, cat, primary } | null    текст из свежих цифр, с текущей валютой
   ack / answer / snooze / resetHidden         действия человека
   Состояние st хранится в данных приложения (и в облаке): только счётчики и флаги, никаких лишних персональных данных. */
(function (root) {
  'use strict';
  const DAY = 864e5;
  const PRIO = ['Кафе', 'Транспорт', 'Развлечения', 'Одежда', 'Подписки'];
  const GROWTH_ONLY = ['Продукты', 'Дом', 'Здоровье', 'Связь'];
  const WATCH = PRIO.concat(GROWTH_ONLY);
  const RULE_ORDER = ['freq7', 'freq30', 'growth', 'small', 'note'];
  const SMALL_LIMIT = { BYN: 10, RUB: 300, USD: 3, EUR: 3 };       // «до 10 BYN или эквивалент»
  const pad = n => String(n).padStart(2, '0');
  const r2 = n => Math.round(n * 100) / 100;

  /* ---------- Тексты (RU и заготовка EN) ---------- */
  const STR = {
    ru: {
      'forms.trata': ['трата', 'траты', 'трат'], 'forms.meloch': ['мелкая трата', 'мелкие траты', 'мелких трат'], 'forms.raz': ['раз', 'раза', 'раз'],
      'tip.freq7': 'За неделю {n} {trata} на {what} на {sum}. {sug}',
      'tip.freq30': 'За 30 дней {n} {trata} на {what} на {sum}. {sug}',
      'tip.growth': 'На «{cat}» ушло на {pct}% больше, чем в прошлом месяце: {sum} против {prev}. {sug}',
      'tip.small': '{n} {meloch} в «{cat}» за 30 дней, вместе {sum}. По отдельности мелочь, а вместе заметная сумма.',
      'tip.note': '«{note}» записано {n} {raz} за 14 дней. Это привычка или так вышло?',
      'sug.Кафе': 'Может, сваришь дома пару раз?', 'sug.Транспорт': 'Часть поездок можно объединить или пройти пешком. Попробуешь на этой неделе?',
      'sug.Развлечения': 'Хочешь отложить часть в копилку?', 'sug.Одежда': 'Подожди сутки перед следующей покупкой: часто желание проходит.',
      'sug.Подписки': 'Проверь, всеми ли ты пользуешься.',
      'sug.growth': 'Хочешь, заведём копилку на разницу?', 'sug.growthPlain': 'Загляни в «Аналитику», что изменилось.',
      'title': 'Фин заметил', 'ok': 'Понятно', 'talk': 'Обсудить',
      'aria.ok': 'Понятно, скрыть подсказку', 'aria.talk': 'Обсудить подсказку про {cat}', 'aria.region': 'Подсказка Фина',
      'few': 'Записывай траты, и я начну замечать закономерности.',
      'q1': 'Это разовые траты или так выходит регулярно?', 'once': 'Разово', 'regular': 'Регулярно', 'unknown': 'Не знаю',
      'onceMsg': 'Понял, тогда просто держу в курсе. Хочешь скрыть такие подсказки по этой категории?', 'hide': 'Скрыть', 'keep': 'Оставить',
      'regularMsg': 'Понял, это часть жизни. Хочешь откладывать часть этой суммы в копилку?', 'toGoal': 'Создать цель', 'notNeeded': 'Не нужно',
      'regularDone': 'Хорошо, до конца месяца про это молчу.',
      'look': 'Давай посмотрим. За 30 дней {n} {trata} на сумму {sum}.', 'more': 'Это больше, чем в прошлом месяце.', 'less': 'Это меньше, чем в прошлом месяце.', 'same': 'Это столько же, сколько в прошлом месяце.',
      'hideAll': 'Скрыть подсказки', 'muted': 'Больше не буду про это.',
      'set.title': 'Подсказки Фина', 'set.counter': 'Фин подсказал {shown} {raz}, ты скрыл {hidden}', 'set.cats': 'По каким категориям', 'set.reset': 'Сбросить скрытые подсказки', 'set.resetDone': 'Скрытые подсказки сброшены',
      'set.off': 'Выключены', 'set.catsSub': 'Выбери, о чём напоминать'
    },
    en: {
      'forms.trata': ['purchase', 'purchases'], 'forms.meloch': ['small purchase', 'small purchases'], 'forms.raz': ['time', 'times'],
      'tip.freq7': '{n} {trata} on {what} this week, {sum}. {sug}', 'tip.freq30': '{n} {trata} on {what} in 30 days, {sum}. {sug}',
      'tip.growth': '"{cat}" is up {pct}% on last month: {sum} vs {prev}. {sug}',
      'tip.small': '{n} {meloch} in "{cat}" in 30 days, {sum} together. Small on their own, noticeable together.',
      'tip.note': '"{note}" logged {n} {raz} in 14 days. A habit, or just how it went?',
      'sug.Кафе': 'Maybe brew at home a couple of times?', 'sug.Транспорт': 'Some trips could be combined or walked. Try this week?',
      'sug.Развлечения': 'Want to put part of it towards a goal?', 'sug.Одежда': 'Wait a day before the next purchase: the urge often passes.',
      'sug.Подписки': 'Check that you use all of them.', 'sug.growth': 'Want to set a goal for the difference?', 'sug.growthPlain': 'Open Analytics to see what changed.',
      'title': 'Fin noticed', 'ok': 'Got it', 'talk': 'Discuss',
      'aria.ok': 'Got it, hide the tip', 'aria.talk': 'Discuss the tip about {cat}', 'aria.region': 'Fin tip',
      'few': 'Keep logging spending and I will start to notice patterns.',
      'q1': 'Is this a one-off, or does it happen regularly?', 'once': 'One-off', 'regular': 'Regularly', 'unknown': 'Not sure',
      'onceMsg': 'Got it, I will just keep you posted. Hide these tips for this category?', 'hide': 'Hide', 'keep': 'Keep',
      'regularMsg': 'Got it, that is part of life. Want to put part of it towards a goal?', 'toGoal': 'Create a goal', 'notNeeded': 'No need',
      'regularDone': 'Okay, I will stay quiet about this until the end of the month.',
      'look': 'Let us look. {n} {trata} totalling {sum} in 30 days.', 'more': 'That is more than last month.', 'less': 'That is less than last month.', 'same': 'That is the same as last month.',
      'hideAll': 'Hide tips', 'muted': 'I will not mention this again.',
      'set.title': 'Fin tips', 'set.counter': 'Fin tipped {shown} {raz}, you hid {hidden}', 'set.cats': 'Categories', 'set.reset': 'Reset hidden tips', 'set.resetDone': 'Hidden tips reset',
      'set.off': 'Off', 'set.catsSub': 'Choose what to tip about'
    }
  };
  let lang = 'ru';
  const form = (n, forms) => {
    if (lang === 'ru') { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? forms[2] : k === 1 ? forms[0] : k >= 2 && k <= 4 ? forms[1] : forms[2]; }
    return n === 1 ? forms[0] : forms[1] || forms[0];
  };
  const raw = k => (STR[lang] && STR[lang][k]) || STR.ru[k] || k;
  const t = (k, v) => String(raw(k)).replace(/\{(\w+)\}/g, (m, name) => (v && v[name] != null ? v[name] : m));
  const forms = k => raw('forms.' + k);

  /* ---------- Состояние ---------- */
  const defaultState = () => ({ on: true, cats: {}, hide: {}, keyShown: {}, catShown: {}, lastDay: '', shown: 0, hidden: 0, ack: { cat: '', n: 0 }, mute: {}, answers: {}, active: null, installAt: 0 });
  const obj = o => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  const numMap = (o, keep) => { const r = {}; for (const [k, v] of Object.entries(obj(o))) { const n = Number(v); if (Number.isFinite(n) && n >= 0 && (!keep || keep(k))) r[String(k).slice(0, 40)] = n; } return r; };
  function sanitizeState(o) {
    const s = defaultState(); o = obj(o);
    s.on = o.on !== false;
    for (const [k, v] of Object.entries(obj(o.cats))) if (WATCH.includes(k) && v === false) s.cats[k] = false;
    s.hide = numMap(o.hide); s.keyShown = numMap(o.keyShown); s.mute = numMap(o.mute, k => WATCH.includes(k));
    s.catShown = numMap(o.catShown, k => WATCH.includes(k));
    s.lastDay = /^\d{4}-\d{2}-\d{2}$/.test(o.lastDay) ? o.lastDay : '';
    s.shown = Math.max(0, Math.floor(Number(o.shown)) || 0); s.hidden = Math.max(0, Math.floor(Number(o.hidden)) || 0);
    const a = obj(o.ack); s.ack = { cat: WATCH.includes(a.cat) ? a.cat : '', n: Math.max(0, Math.min(9, Math.floor(Number(a.n)) || 0)) };
    for (const [k, v] of Object.entries(obj(o.answers))) if (WATCH.includes(k) && ['once', 'regular', 'unknown'].includes(v)) s.answers[k] = v;
    const ac = obj(o.active);
    if (WATCH.includes(ac.cat) && typeof ac.key === 'string' && typeof ac.rule === 'string') s.active = { cat: ac.cat, rule: ac.rule, key: ac.key.slice(0, 80), level: Number(ac.level) || 0, at: Number(ac.at) || 0 };
    s.installAt = Number(o.installAt) > 0 ? Number(o.installAt) : 0;
    return s;
  }

  /* ---------- Даты ---------- */
  const dayNum = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY) : NaN; };
  const todayNum = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = (y, m) => `${y}-${pad(m + 1)}`;
  /* Праздники и декабрь: порог роста выше, чтобы не раздражать */
  function holidayWindow(now) {
    if (now.getMonth() === 11) return true;
    const fixed = [[0, 1], [0, 7], [2, 8], [4, 1], [6, 3], [10, 7], [11, 25]];
    return fixed.some(([m, d]) => Math.abs(todayNum(now) - Math.floor(Date.UTC(now.getFullYear(), m, d) / DAY)) <= 3);
  }

  /* Нормализация заметки и расстояние Левенштейна: «кофе» и «Кофе » считаются одной заметкой */
  const normNote = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  const maxDist = len => (len >= 6 ? 2 : len >= 4 ? 1 : 0);

  /* ---------- Паттерны ---------- */
  function analyze(tx, st, ctx) {
    const now = ctx.now || new Date(), T = todayNum(now), mk0 = monthKey(now.getFullYear(), now.getMonth());
    const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1), mk1 = monthKey(pm.getFullYear(), pm.getMonth());
    const small = SMALL_LIMIT[ctx.currency] || SMALL_LIMIT.BYN;
    const B = {}, notes = [];
    let first = Infinity;
    for (const x of tx) {
      if (x.ts > 0 && x.ts < first) first = x.ts;     // когда запись создана, а не дата траты: так импорт старой выписки не считается давним знакомством
      if (x.type !== 'expense') continue;
      const age = T - dayNum(x.date);
      if (!(age >= 0)) continue;
      const mk = x.date.slice(0, 7), inMonth = mk === mk0 || mk === mk1;
      if (age > 29 && !inMonth) continue;
      if (age <= 13 && x.note) { const n = normNote(x.note); if (n) notes.push({ n, cat: x.cat, ymd: x.date }); }
      if (!WATCH.includes(x.cat)) continue;
      const b = B[x.cat] || (B[x.cat] = { d7: [], d30: [], m0: [], m1: [] });
      if (age <= 6) b.d7.push(x);
      if (age <= 29) b.d30.push(x);
      if (mk === mk0) b.m0.push(x); else if (mk === mk1) b.m1.push(x);
    }
    const sum = l => r2(l.reduce((s, x) => s + x.amount, 0));
    const thr = holidayWindow(now) ? 0.5 : 0.3;
    const hits = [];
    const hit = (cat, rule, data) => hits.push(Object.assign({ cat, rule, key: `${cat}|${rule === 'freq7' || rule === 'freq30' ? 'freq' : rule}` }, data));
    for (const cat of Object.keys(B)) {
      const b = B[cat];
      if (b.d7.length >= 5) hit(cat, 'freq7', { n: b.d7.length, sum: sum(b.d7), list: b.d7 });
      else if (b.d30.length >= 15) hit(cat, 'freq30', { n: b.d30.length, sum: sum(b.d30), list: b.d30 });
      if (b.m0.length >= 3 && b.m1.length >= 3) {
        const s0 = sum(b.m0), s1 = sum(b.m1), biggest = Math.max(...b.m0.map(x => x.amount));
        if (s1 > 0 && s0 >= s1 * (1 + thr) - 1e-9 && biggest / s0 <= 0.6) hit(cat, 'growth', { pct: Math.round((s0 - s1) / s1 * 100), sum: s0, prev: s1 });
      }
      const sm = b.d30.filter(x => x.amount <= small);
      if (sm.length >= 7) hit(cat, 'small', { n: sm.length, sum: sum(sm), limit: small });
    }
    // повтор заметки: группируем похожие
    const groups = [];
    for (const x of notes) {
      let g = groups.find(q => lev(q.rep, x.n, maxDist(Math.min(q.rep.length, x.n.length))) <= maxDist(Math.min(q.rep.length, x.n.length)));
      if (!g) { g = { rep: x.n, items: [], cats: {} }; groups.push(g); }
      g.items.push(x); g.cats[x.cat] = (g.cats[x.cat] || 0) + 1;
    }
    for (const g of groups) {
      if (g.items.length < 4) continue;
      const cat = Object.keys(g.cats).sort((a, c) => g.cats[c] - g.cats[a])[0];
      if (!WATCH.includes(cat)) continue;
      hit(cat, 'note', { n: g.items.length, note: g.rep });
    }
    return { hits, at: now.getTime(), total: tx.length, first: first === Infinity ? 0 : first };
  }

  /* ---------- Выбор подсказки ---------- */
  const prioOf = c => { const i = PRIO.indexOf(c); return i >= 0 ? i : 100 + GROWTH_ONLY.indexOf(c); };
  function isNewUser(st, now) { return !st.installAt || now.getTime() - st.installAt < 14 * DAY; }
  function eligible(an, st, now) {
    const ms = now.getTime();
    if (isNewUser(st, now)) return [];                 // первые 14 дней подсказок нет совсем
    const out = an.hits.filter(h => {
      if (!PRIO.includes(h.cat) && h.rule !== 'growth') return false;
      if (st.cats[h.cat] === false) return false;
      if ((st.mute[h.cat] || 0) > ms) return false;
      if ((st.hide[h.key] || 0) > ms) return false;
      if (st.hide[h.key] !== undefined && ms - (st.keyShown[h.key] || 0) < 30 * DAY) return false;
      if (ms - (st.catShown[h.cat] || 0) < 14 * DAY) return false;
      return true;
    });
    out.sort((a, b) => prioOf(a.cat) - prioOf(b.cat) || RULE_ORDER.indexOf(a.rule) - RULE_ORDER.indexOf(b.rule));
    return out;
  }
  function settle(st, an, ctx) {
    const now = ctx.now || new Date(), res = { changed: false }, day = ymd(now);
    if (!st.installAt) { st.installAt = Math.min(now.getTime(), an.first || now.getTime()); res.changed = true; }
    const clear = () => { if (st.active) { st.active = null; res.changed = true; } };
    if (!st.on) { clear(); return res; }
    if (st.active && (isNewUser(st, now) || !an.hits.some(h => h.key === st.active.key) || st.cats[st.active.cat] === false)) clear();
    if (!st.active && ctx.canShow && st.lastDay !== day) {          // одна подсказка, не чаще раза в день
      const c = eligible(an, st, now)[0];
      if (c) {
        const ms = now.getTime();
        st.active = { cat: c.cat, rule: c.rule, key: c.key, level: 0, at: ms };
        st.shown++; st.lastDay = day; st.catShown[c.cat] = ms; st.keyShown[c.key] = ms;
        res.changed = true;
      }
    }
    return res;
  }

  /* ---------- Текст подсказки ---------- */
  function describe(st, tx, ctx) {
    const a = st.active; if (!a) return null;
    const an = ctx.analysis || analyze(tx, st, ctx), M = ctx.money || (n => String(n));
    const trata = n => form(n, forms('trata'));
    let h, text;
    h = an.hits.find(x => x.key === a.key); if (!h) return null;
    const sug = t('sug.' + a.cat);
    const dominant = () => {
      const c = {}; (h.list || []).forEach(x => { const n = normNote(x.note); if (n) c[n] = (c[n] || 0) + 1; });
      const top = Object.keys(c).sort((x, y) => c[y] - c[x])[0];
      return top && c[top] / h.list.length >= 0.6 && top.length <= 20 ? top : '';
    };
    if (h.rule === 'freq7' || h.rule === 'freq30') text = t('tip.' + h.rule, { n: h.n, trata: trata(h.n), what: dominant() || `«${a.cat}»`, sum: M(h.sum), sug });
    else if (h.rule === 'growth') text = t('tip.growth', { cat: a.cat, pct: h.pct, sum: M(h.sum), prev: M(h.prev), sug: PRIO.includes(a.cat) ? t('sug.growth') : t('sug.growthPlain') });
    else if (h.rule === 'small') text = t('tip.small', { n: h.n, meloch: form(h.n, forms('meloch')), cat: a.cat, sum: M(h.sum) });
    else text = t('tip.note', { note: h.note, n: h.n, raz: form(h.n, forms('raz')) });
    return { text: text.trim(), cat: a.cat, rule: h.rule, primary: t('talk') };
  }

  /* ---------- Действия человека ---------- */
  function ack(st, now) {
    const a = st.active; if (!a) return {};
    const ms = (now || new Date()).getTime();
    st.hide[a.key] = ms + 14 * DAY;
    st.hidden++;
    st.ack = st.ack.cat === a.cat ? { cat: a.cat, n: st.ack.n + 1 } : { cat: a.cat, n: 1 };
    st.active = null;
    let auto = false;
    if (st.ack.n >= 3) { st.mute[a.cat] = ms + 30 * DAY; st.ack = { cat: '', n: 0 }; auto = true; }
    return { auto, cat: a.cat };
  }
  function startTalk(st) { st.ack = { cat: '', n: 0 }; }
  function finishTalk(st) { st.active = null; }
  function hideCat(st, cat) { st.cats[cat] = false; st.hidden++; }
  function answer(st, cat, kind) { if (['once', 'regular', 'unknown'].includes(kind)) st.answers[cat] = kind; }
  /* Тишина по правилу на несколько дней (например, после «Регулярно»: больше не спрашиваем до конца месяца) */
  function snooze(st, key, days, now) { st.hide[key] = (now || new Date()).getTime() + days * DAY; st.keyShown[key] = (now || new Date()).getTime(); }
  function resetHidden(st) { st.hide = {}; st.mute = {}; st.cats = {}; st.ack = { cat: '', n: 0 }; st.keyShown = {}; }
  const counter = st => t('set.counter', { shown: st.shown, raz: form(st.shown, forms('raz')), hidden: st.hidden });
  const setLang = l => { if (STR[l]) lang = l; };

  const api = { analyze, settle, describe, ack, startTalk, finishTalk, hideCat, answer, snooze, resetHidden, counter, defaultState, sanitizeState, setLang, t, form, forms, WATCH, PRIO, STR, normNote, lev, holidayWindow, isNewUser };
  root.MD = root.MD || {};
  root.MD.nudges = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
