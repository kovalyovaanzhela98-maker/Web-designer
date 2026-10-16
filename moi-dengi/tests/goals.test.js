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
console.log(fail ? `\nПровалено: ${fail}` : '\nВсе тесты прошли');
process.exit(fail ? 1 : 0);
