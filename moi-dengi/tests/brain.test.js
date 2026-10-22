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
const text = r => r.blocks.filter(b => b.t === 'text').map(b => b.html).join(' ').replace(/\u00A0/g, ' ');

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
ok('непонятно: честный ответ и кнопки', /пока не умею/.test(text(r)) && r.quick.length > 0 && r.fallback === true);
r = R('сводка', { tx: [] });
ok('пусто', /записей нет/.test(text(r)));
eq('период: вчера', B.periodOf('что вчера', now).from, '2026-10-16');
eq('период: сентябрь', B.periodOf('в сентябре', now).from, '2026-09-01');
eq('период: прошлый месяц', B.periodOf('в прошлом месяце', now).to, '2026-09-30');
if (fail) { console.log(`\nПровалено: ${fail}`); process.exit(1); } else 
r = R('что такое инфляция'); ok('разговор: инфляция', r.blocks.some(b => b.t === 'text' && /дешевеют/.test(b.html)));
r = R('который час'); ok('разговор: дата', r.blocks.some(b => b.t === 'text' && /Сегодня/.test(b.html)));
r = R('вчера кофе пять рублей и такси двенадцать'); ok('запись словами без цифр', r.blocks.some(b => b.t === 'draft' && b.items.length === 2), r.blocks.map(b => b.t));
r = R('расскажи про космос'); ok('другая тема: честный ответ и кнопки', r.blocks.some(b => b.t === 'text' && /пока не умею/.test(b.html)) && r.fallback === true);
/* ---------- Что должен уметь чат (аналитика, поиск, сравнения, уточнения) ---------- */
r = R('Потратил 100'); ok('уточнение: «На что?» и кнопки категорий', /На что потратил/.test(text(r)) && r.quick.includes('Кафе') && r.last && r.last.intent === 'ask-cat', text(r));
r = R('Кафе', { last: r.last }); ok('уточнение: ответ кнопкой даёт карточку на подтверждение', r.blocks[0].t === 'draft' && r.blocks[0].items[0].cat === 'Кафе' && r.blocks[0].items[0].amount === 100);
r = R('а еще кофе 4'); ok('продолжение: «а ещё кофе 4» записывается', r.blocks[0].t === 'draft' && r.blocks[0].items[0].amount === 4);
r = R('Сколько я потратил в этом месяце?'); ok('сумма за период + сравнение с прошлым', /потратил/.test(text(r)) && /больше|меньше/.test(text(r)), text(r));
r = R('Топ 3 категории за месяц'); ok('топ-3: карточка из трёх строк', r.blocks.some(b => b.t === 'card' && b.rows.length === 3), JSON.stringify(r.blocks.map(b => b.t)));
r = R('Сколько раз я ходил в кафе?'); ok('счёт операций по категории', /2 записи/.test(text(r)), text(r));
r = R('Когда я последний раз покупал в Евроопте?'); ok('последняя покупка: дата и сумма', /14 октября/.test(text(r)) && /45,90/.test(text(r)), text(r));
r = R('Покажи все траты на бензин в сентябре'); ok('поиск без совпадений: честное «не нашёл»', /не нашёл/.test(text(r)) && /бензин/.test(text(r)), text(r));
r = R('Какой у меня средний чек в кафе?'); ok('средний чек по категории', /Средний чек/.test(text(r)) && /6,25/.test(text(r)), text(r));
r = R('Какая самая большая трата за месяц?'); ok('самая крупная трата', /300,00/.test(text(r)) && /Аренд/i.test(text(r)), text(r));
r = R('На что я трачу больше: на такси или на кафе?'); ok('сравнение двух категорий', /Дороже обходится/.test(text(r)) && /Кафе/.test(text(r)), text(r));
r = R('Мои траты на кофе растут?'); ok('тренд по категории: карточка динамики', r.blocks.some(b => b.t === 'card' && b.title === 'Динамика'), text(r));
r = R('Я трачу больше, чем в прошлом месяце?'); ok('сравнение с прошлым месяцем в процентах', /%/.test(text(r)), text(r));
r = R('Сравни траты на кофе с сентябрем'); ok('сравнение категории с другим месяцем', /%/.test(text(r)) && /сентябр/.test(text(r)), text(r));
r = R('Сколько осталось от бюджета на кафе?'); ok('лимитов нет: честный ответ, без выдуманных цифр', /Лимитов по категориям у меня нет/.test(text(r)), text(r));
r = R('Хватит ли мне денег до конца месяца?'); ok('прогноз: свободные деньги и сумма в день', /Свободных денег 900,00/.test(text(r)) && /в день/.test(text(r)), text(r));
r = R('Удали последнюю запись'); ok('удаление: превью и кнопки, без молчаливого удаления', r.blocks.some(b => b.t === 'card' && b.title === 'Удалить запись?' && b.actions.some(a => a.kind === 'deltx') && b.actions.some(a => a.kind === 'edittx')), text(r));
r = R('Измени вчерашнее такси на 20 рублей', { now: new Date(2026, 9, 17) }); ok('изменение суммы: превью с кнопкой', r.blocks.some(b => b.t === 'card' && b.actions.some(a => a.kind === 'setamt' && a.amount === 20)), text(r));
r = R('Какие платежи скоро?'); ok('платежи: ответ без выдумки', /платеж/i.test(text(r)));
r = R('Привет'); ok('приветствие остаётся коротким', /Привет/.test(text(r)));
r = R('Посмотреть статистику'); ok('кнопка «Посмотреть статистику» ведёт к сводке', r.blocks.some(b => b.t === 'card'));
console.log('\nВсе тесты прошли');
