const B = require('../www/js/brain.js');
let fail = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) { fail++; console.log('✗', name, '\n   ждали', JSON.stringify(exp), '\n   вышло', JSON.stringify(got)); } else console.log('✓', name); };
const ok = (name, cond, info) => { if (!cond) { fail++; console.log('✗', name, info || ''); } else console.log('✓', name); };
const now = new Date(2026, 9, 17);
const mk = (type, amount, cat, date, note = '') => ({ id: Math.random().toString(36).slice(2), type, amount, cat, date, note, acc: 'main' });
const tx = [
  mk('income', 2500, 'Зарплата', '2026-10-05'), mk('expense', 45.9, 'Продукты', '2026-10-14', 'Евроопт'), mk('expense', 6.5, 'Кафе', '2026-10-15', 'Кофе'),
  mk('expense', 12, 'Транспорт', '2026-10-16', 'Такси'), mk('expense', 6, 'Кафе', '2026-10-16', 'Кофе'), mk('expense', 300, 'Дом', '2026-10-02', 'Аренда'),
  mk('expense', 15, 'Подписки', '2026-10-03', 'Netflix'),
  mk('income', 2400, 'Зарплата', '2026-09-05'), mk('expense', 500, 'Продукты', '2026-09-12'), mk('expense', 30, 'Кафе', '2026-09-20', 'Кофе')
];
const ctx = { now, tx, goals: [{ name: 'Отпуск', target: 3000, saved: 600 }], sym: 'Br', startBalance: 100, freeMoney: 900 };
const R = (s, extra) => B.reply(s, Object.assign({}, ctx, extra || {}));
const text = r => r.blocks.filter(b => b.t === 'text').map(b => b.html).join(' ');

let r = R('кофе 6 и такси 12');
eq('запись: черновик из двух', [r.blocks[0].t, r.blocks[0].items.length], ['draft', 2]);
r = R('вчера зарплата 2000');
eq('запись: доход', [r.blocks[0].t, r.blocks[0].items[0].type, r.blocks[0].items[0].amount, r.blocks[0].items[0].date], ['draft', 'income', 2000, '2026-10-16']);
r = R('Сводка за месяц');
ok('сводка: есть карточка', r.blocks.some(b => b.t === 'card'));
ok('сводка: плюс', /в плюсе на <em>2[\s\u00A0\u202F]?114,60/.test(text(r)), text(r));
r = R('сколько я потратил на кофе в октябре');
ok('кофе: 12,50', /12,50 Br/.test(text(r)) && /2 записи/.test(text(r)), text(r));
r = R('а в сентябре?', { last: r.last });
ok('уточнение: сентябрь, кофе 30', /30,00 Br/.test(text(r)) && /сентябре/.test(text(r)), text(r));
r = R('куда уходят деньги');
ok('топ: Дом первым', r.blocks[1].rows[0].l === 'Дом', JSON.stringify(r.blocks[1]));
r = R('сколько можно тратить в день');
ok('в день: считает', /в день/.test(text(r)) && /Br/.test(text(r)), text(r));
r = R('какой у меня баланс');
ok('баланс: 100 + 4900 − 915,4', /4[\s\u00A0\u202F]?084,60/.test(text(r)), text(r));
r = R('сравни с прошлым месяцем');
ok('сравнение: есть проценты', /%/.test(text(r)), text(r));
r = R('самые крупные траты');
ok('крупные: аренда', /300,00/.test(text(r)), text(r));
r = R('как мои цели');
ok('цели: Отпуск 20%', r.blocks.some(b => b.t === 'card' && b.rows[0].v === '20%'), JSON.stringify(r.blocks));
r = R('хочу накопить 3000 за 6 месяцев');
ok('накопить: 500 в месяц', /500,00 Br/.test(text(r)) && r.blocks.some(b => b.t === 'action'), text(r));
r = R('дай совет');
ok('совет: есть пункты', /1\./.test(text(r)), text(r));
r = R('привет');
ok('привет', /Фин/.test(text(r)));
r = R('кто ты?');
ok('кто ты', /помощник/.test(text(r)));
r = R('что ты умеешь');
ok('помощь', /Записывать/.test(text(r)));
r = R('абракадабра хыв');
ok('непонятно: подсказки', /Пока не понял/.test(text(r)) && r.quick.length > 0);
r = R('сводка', { tx: [] });
ok('пусто', /записей нет/.test(text(r)));
eq('период: вчера', B.periodOf('что вчера', now).from, '2026-10-16');
eq('период: сентябрь', B.periodOf('в сентябре', now).from, '2026-09-01');
eq('период: прошлый месяц', B.periodOf('в прошлом месяце', now).to, '2026-09-30');
if (fail) { console.log(`\nПровалено: ${fail}`); process.exit(1); } else console.log('\nВсе тесты прошли');
