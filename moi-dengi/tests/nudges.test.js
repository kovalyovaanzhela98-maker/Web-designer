const N = require('../www/js/nudges.js');
let fail = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) { fail++; console.log('✗', name, '\n   ждали', JSON.stringify(exp), '\n   вышло', JSON.stringify(got)); } else console.log('✓', name); };
const ok = (name, c, info) => { if (!c) { fail++; console.log('✗', name, info || ''); } else console.log('✓', name); };
const pad = n => String(n).padStart(2, '0');
const now = new Date(2026, 9, 17, 12);          // 17 октября 2026
const ago = n => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
let id = 0;
const ex = (cat, amount, daysAgo, note = '') => ({ id: 'x' + (++id), type: 'expense', cat, amount, date: ago(daysAgo), note });
const inc = (amount, daysAgo) => ({ id: 'i' + (++id), type: 'income', cat: 'Зарплата', amount, date: ago(daysAgo), note: '' });
const old = (st) => { st.installAt = now.getTime() - 40 * 864e5; return st; };
const M = n => `${n.toFixed(2).replace('.', ',')} Br`;
const ctx = { now, currency: 'BYN', canShow: true, money: M, dayName: d => `${d.getDate()}.${d.getMonth() + 1}` };
const filler = n => Array.from({ length: n }, (_, i) => ex('Другое', 20, 20 + (i % 8)));   // фон: продукты без паттернов
const run = (tx, st, c = ctx) => { const an = N.analyze(tx, st, c); const r = N.settle(st, an, c); return { an, r, st }; };

// 1. частота за 7 дней
let st = old(N.defaultState());
let tx = filler(8).concat([0, 1, 2, 3, 4, 5].map(d => ex('Кафе', 7, d, 'кофе')));
let o = run(tx, st);
eq('частота 7 дней: подсказка по Кафе', [o.st.active.cat, o.st.active.rule], ['Кафе', 'freq7']);
let d = N.describe(st, tx, Object.assign({ analysis: o.an }, ctx));
ok('текст: число, сумма, кофе', /6 трат на кофе на 42,00 Br/.test(d.text) && /сваришь дома/.test(d.text), d.text);
eq('одна подсказка за день', (() => { const s2 = o.st; s2.active = null; return N.settle(s2, o.an, ctx).changed; })(), false);

// частота за 30 дней
st = old(N.defaultState());
tx = filler(8).concat(Array.from({ length: 15 }, (_, i) => ex('Транспорт', 3, 8 + i)));
o = run(tx, st);
eq('частота 30 дней: Транспорт', [o.st.active.cat, o.st.active.rule], ['Транспорт', 'freq30']);

// 2. рост
st = old(N.defaultState());
const pmDay = n => { const d = new Date(2026, 8, n); return Math.round((now - d) / 864e5); };
tx = filler(8).concat([ex('Кафе', 30, 5), ex('Кафе', 30, 9), ex('Кафе', 30, 12), ex('Кафе', 20, pmDay(5)), ex('Кафе', 20, pmDay(10)), ex('Кафе', 20, pmDay(15))]);
o = run(tx, st);
eq('рост: Кафе +50%', [o.st.active.rule, o.an.hits.find(h => h.rule === 'growth').pct], ['growth', 50]);
d = N.describe(st, tx, Object.assign({ analysis: o.an }, ctx));
ok('рост: текст с цифрами и копилкой', /на 50% больше/.test(d.text) && /90,00 Br против 60,00 Br/.test(d.text) && /копилку на разницу/.test(d.text), d.text);
// рост ниже порога и мало операций
tx = filler(8).concat([ex('Кафе', 25, 5), ex('Кафе', 25, 9), ex('Кафе', 25, 12), ex('Кафе', 20, pmDay(5)), ex('Кафе', 20, pmDay(10)), ex('Кафе', 20, pmDay(15))]);
ok('рост 25%: нет', !run(tx, old(N.defaultState())).an.hits.some(h => h.rule === 'growth'));
tx = filler(8).concat([ex('Кафе', 90, 5), ex('Кафе', 90, 9), ex('Кафе', 20, pmDay(5)), ex('Кафе', 20, pmDay(10)), ex('Кафе', 20, pmDay(15))]);
ok('рост при 2 операциях в этом месяце: нет', !run(tx, old(N.defaultState())).an.hits.some(h => h.rule === 'growth'));
// ложный рост: одна крупная операция больше 60%
tx = filler(8).concat([ex('Продукты', 300, 5), ex('Продукты', 10, 9), ex('Продукты', 10, 12), ex('Продукты', 20, pmDay(5)), ex('Продукты', 20, pmDay(10)), ex('Продукты', 20, pmDay(15))]);
ok('одна разовая закупка больше 60%: нет', !run(tx, old(N.defaultState())).an.hits.some(h => h.rule === 'growth' && h.cat === 'Продукты'));
// Продукты: сильный рост подсказывает, но по частоте — нет
tx = filler(8).concat([ex('Продукты', 60, 5), ex('Продукты', 60, 9), ex('Продукты', 60, 12), ex('Продукты', 20, pmDay(5)), ex('Продукты', 20, pmDay(10)), ex('Продукты', 20, pmDay(15))]);
o = run(tx, old(N.defaultState()));
eq('Продукты: только рост', [o.st.active && o.st.active.rule, o.st.active && o.st.active.cat], ['growth', 'Продукты']);
d = N.describe(o.st, tx, Object.assign({ analysis: o.an }, ctx));
ok('Продукты: без цели в тексте', !/цель/.test(d.text) && /Аналитику/.test(d.text), d.text);
tx = filler(30).concat(Array.from({ length: 6 }, (_, i) => ex('Продукты', 15, i)));
ok('Продукты: частота не подсказывает', !run(tx, old(N.defaultState())).st.active);

// декабрь: порог роста 50%
const dec = new Date(2026, 11, 10, 12), decAgo = n => { const x = new Date(2026, 11, 10 - n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const dx = (cat, a, n) => ({ id: 'd' + (++id), type: 'expense', cat, amount: a, date: decAgo(n), note: '' });
const nov = n => `2026-11-${pad(n)}`;
tx = Array.from({ length: 8 }, (_, i) => dx('Другое', 20, 5 + i)).concat([dx('Кафе', 36, 1), dx('Кафе', 36, 3), dx('Кафе', 36, 5), { id: 'n1', type: 'expense', cat: 'Кафе', amount: 20, date: nov(5), note: '' }, { id: 'n2', type: 'expense', cat: 'Кафе', amount: 20, date: nov(10), note: '' }, { id: 'n3', type: 'expense', cat: 'Кафе', amount: 20, date: nov(15), note: '' }]);
const dctx = Object.assign({}, ctx, { now: dec });
ok('декабрь: +80%, порог 50% — есть', N.analyze(tx, old(N.defaultState()), dctx).hits.some(h => h.rule === 'growth'));
tx[8].amount = tx[9].amount = tx[10].amount = 28;   // +40%
ok('декабрь: +40% ниже порога 50%', !N.analyze(tx, old(N.defaultState()), dctx).hits.some(h => h.rule === 'growth'));

// 3. мелкие частые
st = old(N.defaultState());
tx = filler(8).concat(Array.from({ length: 7 }, (_, i) => ex('Развлечения', 4, 3 + i * 3)));
o = run(tx, st);
eq('мелкие частые: Развлечения', [o.st.active.cat, o.st.active.rule], ['Развлечения', 'small']);
ok('мелкие частые: текст', /7 мелких трат в «Развлечения» за 30 дней, вместе 28,00 Br/.test(N.describe(st, tx, Object.assign({ analysis: o.an }, ctx)).text));
// порог в другой валюте
tx = filler(8).concat(Array.from({ length: 7 }, (_, i) => ex('Развлечения', 150, 3 + i * 3)));
ok('RUB: 150 — мелочь', N.analyze(tx, old(N.defaultState()), Object.assign({}, ctx, { currency: 'RUB' })).hits.some(h => h.rule === 'small'));
ok('BYN: 150 — не мелочь', !N.analyze(tx, old(N.defaultState()), ctx).hits.some(h => h.rule === 'small'));

// три траты за день сами по себе подсказку не вызывают (такого правила нет)
tx = filler(8).concat([ex('Одежда', 50, 2), ex('Одежда', 60, 2), ex('Одежда', 70, 2)]);
ok('три за день: подсказки нет', !run(tx, old(N.defaultState())).st.active);

// 5. повтор заметки и опечатки
tx = filler(8).concat([ex('Транспорт', 12, 1, 'Такси'), ex('Транспорт', 14, 3, 'такси '), ex('Транспорт', 9, 6, 'такси'), ex('Транспорт', 15, 10, 'таксси')]);
o = run(tx, old(N.defaultState()));
eq('заметка: такси ×4 с опечаткой', [o.st.active.cat, o.st.active.rule, o.an.hits.find(h => h.rule === 'note').n], ['Транспорт', 'note', 4]);
ok('заметка: текст', /«такси» записано 4 раза за 14 дней/.test(N.describe(o.st, tx, Object.assign({ analysis: o.an }, ctx)).text));
eq('Левенштейн', [N.lev('кофе', 'кофэ', 2), N.lev('чай', 'чат', 1)], [1, 1]);

// мало данных и новый пользователь
tx = [0, 1, 2, 3, 4].map(d => ex('Кафе', 7, d));
ok('пять трат за неделю даже без фона: работает', !!run(tx, old(N.defaultState())).st.active);
st = N.defaultState();
tx = filler(8).concat([ex('Кафе', 30, 5), ex('Кафе', 30, 9), ex('Кафе', 30, 12), ex('Кафе', 20, pmDay(5)), ex('Кафе', 20, pmDay(10)), ex('Кафе', 20, pmDay(15))]);
ok('первые 14 дней: рост молчит', !run(tx, st).st.active, JSON.stringify(st.active));
st = N.defaultState();
tx = filler(8).concat([0, 1, 2, 3, 4, 5].map(d => ex('Кафе', 7, d)));
ok('первые 14 дней: молчим совсем, и по частоте тоже', !run(tx, st).st.active);
st = N.defaultState(); st.installAt = now.getTime() - 13 * 864e5;
ok('13-й день: ещё тихо', !run(tx, st).st.active);
st = N.defaultState(); st.installAt = now.getTime() - 14 * 864e5;
ok('14-й день: можно', !!run(tx, st).st.active);
st = N.defaultState(); tx = filler(8).concat([0, 1, 2, 3, 4, 5].map(d => ex('Кафе', 7, d))).concat([Object.assign(ex('Другое', 5, 40), { ts: now.getTime() - 40 * 864e5 })]);
run(tx, st); ok('первый запуск: срок считаем от первой созданной записи', st.installAt <= now.getTime() - 39 * 864e5);

// мьют, скрытие, окно 14 дней, ack×3
st = old(N.defaultState()); tx = filler(8).concat([0, 1, 2, 3, 4, 5].map(d => ex('Кафе', 7, d)));
st.cats['Кафе'] = false; ok('категория выключена в настройках', !run(tx, st).st.active);
st = old(N.defaultState()); st.on = false; ok('мастер-переключатель выключен', !run(tx, st).st.active);
st = old(N.defaultState()); st.catShown['Кафе'] = now.getTime() - 5 * 864e5; ok('по категории была подсказка 5 дней назад', !run(tx, st).st.active);
st = old(N.defaultState()); st.catShown['Кафе'] = now.getTime() - 15 * 864e5; ok('по категории была 15 дней назад — можно', !!run(tx, st).st.active);
st = old(N.defaultState()); run(tx, st); let r = N.ack(st, now);
eq('«Понятно»: скрыто, счётчик', [st.active, st.hidden, Object.keys(st.hide)], [null, 1, ['Кафе|freq']]);
let later = new Date(now.getTime() + 15 * 864e5);
st.catShown = {}; ok('после 14 дней, но раньше месяца — нельзя', !N.settle(st, N.analyze(tx.map(x => x), st, Object.assign({}, ctx, { now: later })), Object.assign({}, ctx, { now: later })).changed || !st.active);
st = old(N.defaultState());
for (let i = 0; i < 3; i++) { st.active = { cat: 'Кафе', rule: 'freq7', key: 'Кафе|freq', level: 0, at: 1 }; r = N.ack(st, now); }
eq('три «Понятно» подряд: мьют на 30 дней', [r.auto, st.mute['Кафе'] > now.getTime() + 29 * 864e5], [true, true]);

// удаление: подсказка уходит
st = old(N.defaultState()); tx = filler(8).concat([0, 1, 2, 3, 4, 5].map(d => ex('Кафе', 7, d)));
o = run(tx, st); ok('подсказка есть', !!st.active);
const fewer = tx.slice(0, tx.length - 3), an2 = N.analyze(fewer, st, ctx);
N.settle(st, an2, ctx); ok('после удаления операций подсказка снята', !st.active);

// не показывать, пока открыт ввод
st = old(N.defaultState()); tx = filler(8).concat([0, 1, 2, 3, 4, 5].map(d => ex('Кафе', 7, d)));
ok('canShow=false: не выбираем', !run(tx, st, Object.assign({}, ctx, { canShow: false })).st.active);

// «Регулярно» -> ответ запоминается, правило молчит до конца месяца
st = old(N.defaultState()); tx = filler(8).concat([0, 1, 2, 3, 4, 5].map(d => ex('Кафе', 7, d)));
run(tx, st); N.answer(st, 'Кафе', 'regular'); N.snooze(st, st.active.key, 30, now); N.finishTalk(st);
eq('ответ сохранён', st.answers['Кафе'], 'regular');
st.lastDay = ''; ok('после «Регулярно» то же правило молчит', !run(tx, st).st.active);
ok('бюджетов по категориям нет', !('limit' in N.defaultState()) && typeof N.setLimit === 'undefined');

// тексты: без запретных слов и эмодзи, EN полный
const bad = /(слишком|плохо|нарушени)/i, emo = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const ruKeys = Object.keys(N.STR.ru), enKeys = Object.keys(N.STR.en);
ok('RU: нет запретных слов и эмодзи', ruKeys.every(k => !bad.test(String(N.STR.ru[k])) && !emo.test(String(N.STR.ru[k]))));
eq('EN: те же ключи', ruKeys.filter(k => !enKeys.includes(k)), []);

// санитайзер
const dirty = N.sanitizeState({ on: 'x', cats: { Кафе: false, Чужая: false }, limit: { Кафе: '150' }, shown: '3', active: { cat: 'Кафе', key: 'Кафе|freq', rule: 'freq7' }, hide: { 'Кафе|freq': 'abc' } });
eq('санитайзер', [dirty.on, dirty.cats, dirty.limit, dirty.shown, dirty.active.cat, dirty.hide], [true, { Кафе: false }, undefined, 3, 'Кафе', {}]);

// скорость: 90 дней, 20 000 операций
const big = []; for (let i = 0; i < 20000; i++) big.push(ex(['Кафе', 'Продукты', 'Транспорт', 'Дом'][i % 4], 5 + (i % 30), i % 90, i % 3 ? 'кофе' : 'обед'));
const t0 = Date.now(); N.analyze(big, old(N.defaultState()), ctx); const ms = Date.now() - t0;
ok(`скорость: ${ms} мс на 20 000 операций (нужно < 200)`, ms < 200);
if (fail) { console.log(`\nПровалено: ${fail}`); process.exit(1); } else console.log('\nВсе тесты прошли');
