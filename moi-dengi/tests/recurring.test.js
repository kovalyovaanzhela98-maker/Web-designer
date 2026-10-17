const R = require('../www/js/recurring.js');
let fail = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) { fail++; console.log('✗', name, '\n   ждали', JSON.stringify(exp), '\n   вышло', JSON.stringify(got)); } else console.log('✓', name); };
const f = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const money = n => `${n} Br`;
const today = new Date(2026, 9, 17);                       // 17 октября 2026
const mk = (o = {}) => Object.assign({ id: 'a', name: 'Аренда', amount: 500, cat: 'Дом', days: [{ from: '0000-00', day: 20 }], remind: 'off', time: '10:00', start: '0000-00', paid: {}, nid: 0 }, o);

eq('ближайший: через 3 дня', (() => { const n = R.nextDue([mk()], today); return [f(n.date), n.days, n.late]; })(), ['2026-10-20', 3, false]);
eq('текст: через 3 дня', R.dueLine(mk(), 3, money), 'Аренда 500 Br через 3 дня');
eq('текст: сегодня и завтра', [R.whenText(0), R.whenText(1), R.whenText(5), R.whenText(21)], ['сегодня', 'завтра', 'через 5 дней', 'через 21 день']);
eq('день прошёл, операции нет: late', (() => { const n = R.nextDue([mk({ days: [{ from: '0000-00', day: 15 }] })], today); return [n.late, n.days]; })(), [true, -2]);
eq('оплачено в этом месяце: следующий месяц', (() => { const n = R.nextDue([mk({ paid: { '2026-10': 'x' } })], today); return [f(n.date), n.late]; })(), ['2026-11-20', false]);
eq('31-е в коротком месяце: последний день', f(R.dateOf(mk({ days: [{ from: '0000-00', day: 31 }] }), '2026-02')), '2026-02-28');

// смена дня: старые отметки сохраняются, новый день со следующего месяца
const p = mk({ paid: { '2026-09': 't1' } });
R.setDay(p, 5, today);
eq('смена дня: этот месяц прежний', f(R.dateOf(p, '2026-10')), '2026-10-20');
eq('смена дня: со следующего месяца новый', f(R.dateOf(p, '2026-11')), '2026-11-05');
eq('смена дня: отметка сентября осталась', R.isPaid(p, '2026-09'), true);
R.setDay(p, 7, today);
eq('смена дня дважды в месяц: одна запись', p.days.length, 2);
eq('текущий день', R.curDay(p), 7);

// совпадение операции: сумма, категория, ±2 дня
const tx = (o = {}) => Object.assign({ type: 'expense', amount: 500, cat: 'Дом', date: '2026-10-19' }, o);
eq('совпало: на 1 день раньше', (R.matchTx([mk()], tx()) || {}).mk, '2026-10');
eq('совпало: ровно ±2 дня', [!!R.matchTx([mk()], tx({ date: '2026-10-22' })), !!R.matchTx([mk()], tx({ date: '2026-10-18' }))], [true, true]);
eq('не совпало: 3 дня', R.matchTx([mk()], tx({ date: '2026-10-23' })), null);
eq('не совпало: другая сумма', R.matchTx([mk()], tx({ amount: 499 })), null);
eq('не совпало: другая категория', R.matchTx([mk()], tx({ cat: 'Кафе' })), null);
eq('не совпало: доход', R.matchTx([mk()], tx({ type: 'income' })), null);
eq('не совпало: уже отмечен', R.matchTx([mk({ paid: { '2026-10': 'x' } })], tx()), null);
eq('граница месяцев: платёж 1-го, операция 30-го', (R.matchTx([mk({ days: [{ from: '0000-00', day: 1 }] })], tx({ date: '2026-09-30' })) || {}).mk, '2026-10');

// статусы и список на месяц
eq('статусы', R.monthRows([mk({ id: 'a', days: [{ from: '0000-00', day: 20 }] }), mk({ id: 'b', nid: 1, days: [{ from: '0000-00', day: 10 }] }), mk({ id: 'c', nid: 2, days: [{ from: '0000-00', day: 12 }], paid: { '2026-10': 't' } })], '2026-10', today).map(r => [r.p.id, r.status]), [['b', 'late'], ['c', 'paid'], ['a', 'wait']]);
eq('новый платёж: день ещё не наступил — с этого месяца', R.startMonth(20, today), '2026-10');
eq('новый платёж: день прошёл — со следующего', R.startMonth(10, today), '2026-11');
eq('сводка', R.summary([mk(), mk({ id: 'b', nid: 1, amount: 100, paid: { '2026-10': 't' } })], '2026-10', today), { n: 2, paid: 1, total: 600, left: 500 });

// уведомления: только если включено, не для оплаченного, текст как в ТЗ
const now = new Date(2026, 9, 17, 12, 0);
eq('напоминание выключено — уведомлений нет', R.notifications([mk()], now, money), []);
const ns = R.notifications([mk({ remind: '1', days: [{ from: '0000-00', day: 20 }], paid: { '2026-10': 't' } })], now, money);
eq('октябрь оплачен — первое на ноябрь, за день', [f(ns[0].at), ns[0].at.getHours(), ns[0].body, ns.length], ['2026-11-19', 10, 'Завтра аренда 500 Br, записать', 12 - 1]);
eq('номера уведомлений в своём диапазоне', ns.every(n => n.id >= 1000 && n.id < 1480), true);
eq('в день платежа и за 3 дня', [R.pushBody(mk(), 0, money), R.pushBody(mk(), 3, money)], ['Сегодня аренда 500 Br, записать', 'Через 3 дня аренда 500 Br, записать']);
eq('Netflix не ломаем', R.pushBody(mk({ name: 'Netflix' }), 1, money), 'Завтра Netflix 500 Br, записать');

// санитайзер
const s = R.sanitize({ list: [{ name: '  Кредит ', amount: '1200.5', cat: 'Другое', days: [{ from: '2026-10', day: 40 }, { from: '0000-00', day: 3 }], remind: '3', time: '09:30', paid: { '2026-09': 't', bad: 1 }, nid: 4 }, { name: '', amount: 5, days: [{ day: 1 }] }, { name: 'Без дня', amount: 5 }, { name: 'Дубль', amount: 9, days: [{ day: 2 }], nid: 4 }] }, ['Дом', 'Другое']);
eq('санитайзер', [s.list.length, s.list[0].name, s.list[0].amount, s.list[0].days, s.list[0].remind, s.list[0].paid, s.list[1].nid], [2, 'Кредит', 1200.5, [{ from: '0000-00', day: 3 }, { from: '2026-10', day: 31 }], '3', { '2026-09': 't' }, 0]);
eq('свободный nid', R.freeNid([{ nid: 0 }, { nid: 1 }, { nid: 3 }]), 2);
if (fail) { console.log(`\nПровалено: ${fail}`); process.exit(1); } else console.log('\nВсе тесты прошли');
