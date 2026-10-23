const G = require('../www/js/goals.js');
let fail = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) { fail++; console.log('✗', name, '\n   ждали', exp, '\n   вышло', got); } else console.log('✓', name); };
const now = new Date(2026, 9, 16);
const tx = [
  { type: 'income', amount: 2000, date: '2026-09-05' }, { type: 'expense', amount: 1200, date: '2026-09-10' },
  { type: 'income', amount: 2000, date: '2026-08-05' }, { type: 'expense', amount: 1000, date: '2026-08-20' },
  { type: 'income', amount: 5000, date: '2026-10-01' }
];
eq('свободно: среднее по двум полным месяцам', G.freeMoney(tx, now), 900);
eq('свободно: нет данных', G.freeMoney([], now), null);
eq('свободно: только текущий месяц', G.freeMoney([{ type: 'income', amount: 700, date: '2026-10-02' }, { type: 'expense', amount: 200, date: '2026-10-03' }], now), 500);
eq('план: легко', G.plan({ target: 1200, months: 6, free: 900 }).verdict, 'easy');
eq('план: посильно', G.plan({ target: 5000, saved: 0, months: 8, free: 900 }).verdict, 'ok');
const hard = G.plan({ target: 6000, saved: 0, months: 3, free: 900 });
eq('план: не хватает', [hard.verdict, hard.monthly, hard.altMonths], ['hard', 2000, 7]);
eq('план: уже накоплено', G.plan({ target: 1000, saved: 1000, months: 3, free: 100 }).verdict, 'done');
eq('план: нет данных о свободных', G.plan({ target: 3000, months: 3 }).verdict, 'unknown');
eq('план: свободных нет совсем', G.plan({ target: 3000, months: 3, free: -50 }).verdict, 'hard');
eq('срок: слова', [G.termLabel(1), G.termLabel(3), G.termLabel(11), G.termLabel(12), G.termLabel(15), G.termLabel(24), G.termLabel(30)], ['1 месяц', '3 месяца', '11 месяцев', '1 год', '1 год 3 месяца', '2 года', '2 года 6 месяцев']);
eq('осталось месяцев', G.monthsLeft('2027-04-16', now), 6);
// сроки в неделях, взносы, календарь, напоминания
eq('срок: слова', [G.unitLabel(2, 'week'), G.unitLabel(1, 'week'), G.unitLabel(5, 'week'), G.unitLabel(3, 'month')], ['2 недели', '1 неделя', '5 недель', '3 месяца']);
const wk = G.planTerm({ target: 600, saved: 0, n: 2, unit: 'week', free: 2000 });
eq('план на 2 недели', [wk.perPeriod, wk.monthlyEq, wk.verdict], [300, 1300, 'ok']);
eq('план на 2 недели: тяжеловато и совет', [G.planTerm({ target: 3000, n: 2, unit: 'week', free: 900 }).verdict, G.planTerm({ target: 3000, n: 2, unit: 'week', free: 900 }).altN], ['hard', 15]);
eq('план в месяцах как раньше', [G.planTerm({ target: 1200, n: 6, unit: 'month', free: 900 }).perPeriod, G.planTerm({ target: 1200, n: 6, unit: 'month', free: 900 }).verdict], [200, 'easy']);
eq('срок + 2 недели', G.ymdOf(G.addTerm(new Date(2026, 9, 16), 2, 'week')), '2026-10-30');
const g = { unit: 'week', created: '2026-10-05', deadline: '2026-11-02', target: 400, saved: 100, log: [{ d: '2026-10-06', a: 100 }], remind: { on: true, day: 5, time: '09:00' } };
const n1 = new Date(2026, 9, 21);
eq('периодов осталось', G.periodsLeft(g, n1), 2);
eq('в неделю нужно', G.perPeriodNow(g, n1), 150);
const st = G.strip(g, n1);
eq('календарь: сделано, пропущено, сейчас, впереди', st.cells.map(c => c.status), ['done', 'miss', 'now', 'next']);
eq('календарь: пропущена одна неделя', [st.missed, st.done], [1, 1]);
eq('лучший день: по доходам (пятница)', G.suggestDay([{ type: 'income', date: '2026-10-09' }, { type: 'income', date: '2026-10-02' }, { type: 'income', date: '2026-10-16' }], 'week'), { day: 5, fromIncome: true });
eq('лучший день: нет доходов', G.suggestDay([], 'month'), { day: 5, fromIncome: false });
eq('напоминания: пятницы до дедлайна', G.reminderDates(g, new Date(2026, 9, 21, 12), 3).map(d => G.ymdOf(d)), ['2026-10-23', '2026-10-30']);
eq('главная: пора отложить', (G.homeCard([g], [], new Date(2026, 9, 23)) || {}).kind, 'due');
eq('главная: до пятницы ещё рано', G.homeCard([g], [], new Date(2026, 9, 21)), null);
eq('главная: уже откладывал на этой неделе', G.homeCard([Object.assign({}, g, { log: g.log.concat([{ d: '2026-10-20', a: 150 }]) })], [], new Date(2026, 9, 21)), null);
eq('главная: совет включить напоминание', (G.homeCard([Object.assign({}, g, { remind: { on: false } })], [], new Date(2026, 9, 21)) || {}).kind, 'suggest');
console.log(fail ? `\nПровалено: ${fail}` : '\nВсе тесты прошли');
process.exit(fail ? 1 : 0);
