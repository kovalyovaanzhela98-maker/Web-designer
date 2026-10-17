const E = require('../www/js/events.js');
let fail = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) { fail++; console.log('✗', name, '\n   ждали', JSON.stringify(exp), '\n   вышло', JSON.stringify(got)); } else console.log('✓', name); };
const ok = (name, c, info) => { if (!c) { fail++; console.log('✗', name, info || ''); } else console.log('✓', name); };
const today = new Date(2026, 9, 17);
const ev = (date, lead, extra = {}) => Object.assign({ id: 'a', title: 'День рождения', person: 'Аня', date, yearly: true, nid: 3, remind: { on: true, lead } }, extra);
const L = (kind, n, date = '') => ({ kind, n, date });
const f = d => E.ymd(d);

eq('ближайшая дата: позже в этом году', f(E.nextOccurrence(ev('1995-12-20', L('months', 1)), today)), '2026-12-20');
eq('ближайшая дата: уже прошла — в следующем году', f(E.nextOccurrence(ev('1995-03-08', L('months', 1)), today)), '2027-03-08');
eq('ближайшая дата: сегодня', f(E.nextOccurrence(ev('2000-10-17', L('months', 1)), today)), '2026-10-17');
eq('29 февраля в невисокосный год — 28 февраля', f(E.nextOccurrence(ev('2000-02-29', L('months', 1)), today)), '2027-02-28');
eq('разовый в прошлом — нет', E.nextOccurrence(ev('2026-01-01', L('months', 1), { yearly: false }), today), null);

eq('за месяц: 20 дек → 20 ноя', f(E.remindDate(ev('2000-12-20', L('months', 1)), today).rd), '2026-11-20');
eq('за 2 месяца: 20 дек → 20 окт', f(E.remindDate(ev('2000-12-20', L('months', 2)), today).rd), '2026-10-20');
eq('за 2 недели: 20 дек → 6 дек', f(E.remindDate(ev('2000-12-20', L('weeks', 2)), today).rd), '2026-12-06');
eq('31 марта за месяц — 28 февраля', f(E.addMonths(new Date(2027, 2, 31), -1)), '2027-02-28');
// дата напоминания уже прошла в этом году — следующий год
let r = E.remindDate(ev('2000-11-05', L('months', 1)), today);
eq('ежегодный: напоминание прошло — на год вперёд', [f(r.occ), f(r.rd)], ['2027-11-05', '2027-10-05']);
eq('разовый: напоминание прошло — нет', E.remindDate(ev('2026-11-05', L('months', 1), { yearly: false }), today), null);
// своя дата
r = E.remindDate(ev('2000-12-20', L('date', 1, '2026-12-01')), today);
eq('своя дата: 1 декабря', f(r.rd), '2026-12-01');
r = E.remindDate(ev('2000-01-10', L('date', 1, '2026-12-20')), today);
eq('своя дата: до праздника в январе — 20 декабря', [f(r.occ), f(r.rd)], ['2027-01-10', '2026-12-20']);
eq('выключено — нет', E.remindDate(ev('2000-12-20', L('months', 1), { remind: { on: false, lead: L('months', 1) } }), today), null);

let n = E.notification(ev('2000-12-20', L('months', 1)), today);
eq('уведомление: id и расписание', [n.id, n.schedule.on], [203, { month: 11, day: 20, hour: 10, minute: 0 }]);
ok('уведомление: текст', n.body === 'Через месяц: День рождения, Аня (20 декабря). Пора отложить деньги на подарок.', n.body);
n = E.notification(ev('2026-12-20', L('weeks', 2), { yearly: false }), today);
ok('разовое: at', n.schedule.at.getTime() === new Date(2026, 11, 6, 10, 0, 0).getTime() && /Через 2 недели/.test(n.body));
eq('подписи', [E.leadLabel(L('weeks', 2)), E.leadLabel(L('months', 1)), E.leadLabel(L('months', 2)), E.leadLabel(L('months', 5))], ['за 2 недели', 'за месяц', 'за 2 месяца', 'за 5 месяцев']);
eq('строка: напомню', E.reminderLine(ev('2000-12-20', L('months', 1)), today), 'Напомню 20 ноября');

const s = E.sanitize({ ask: false, list: [{ title: '  Свадьба  ', person: 'Петя', date: '2027-06-01', nid: 5, remind: { on: true, lead: { kind: 'x', n: 99 } } }, { title: '', person: '', date: '2027-06-01' }, { title: 'Битая', date: '2027-13-40' }, { title: 'Дубль', date: '2027-01-01', nid: 5 }] });
eq('санитайзер', [s.ask, s.list.length, s.list[0].title, s.list[0].remind.lead, s.list[0].nid, s.list[1].nid], [false, 2, 'Свадьба', { kind: 'months', n: 12, date: '' }, 5, 0]);
eq('свободный nid', E.freeNid([{ nid: 0 }, { nid: 1 }, { nid: 3 }]), 2);
eq('по порядку', E.upcoming([ev('2000-12-20', L('months', 1), { id: 'b' }), ev('2000-11-01', L('months', 1), { id: 'c' })], today).map(x => x.e.id), ['c', 'b']);
if (fail) { console.log(`\nПровалено: ${fail}`); process.exit(1); } else console.log('\nВсе тесты прошли');
