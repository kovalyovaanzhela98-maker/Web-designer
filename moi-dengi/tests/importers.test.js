const I = require('../www/js/importers.js');
let fail = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) { fail++; console.log('✗', name, '\n   ждали', JSON.stringify(exp), '\n   вышло', JSON.stringify(got)); } else console.log('✓', name); };
const today = new Date(2026, 9, 17);

const receipt = `ООО "Евроторг"
Евроопт
УНП 800013274
КАССОВЫЙ ЧЕК № 123
Хлеб 1.20
Молоко 2.30
ИТОГО 3.50
НАЛИЧНЫЕ 5.00
СДАЧА 1.50
14.10.2026 18:32`;
const r = I.parseReceiptText(receipt, { today });
eq('чек: сумма, категория, дата, магазин', [r.ok, r.item.amount, r.item.cat, r.item.date, r.item.note], [true, 3.5, 'Продукты', '2026-10-14', 'Евроторг']);

const r2 = I.parseReceiptText('Кафе «Пицца Темпо»\nПицца 18,90\nКофе 4,50\nК ОПЛАТЕ 23,40\nВСЕГО 23,40\n2026-10-16', { today });
eq('чек: к оплате с запятой', [r2.item.amount, r2.item.cat, r2.item.date], [23.4, 'Кафе', '2026-10-16']);
const rt = I.parseReceiptText('ООО «Евроопт»\nг. Минск, пр. Независимости 10\nЧек № 004517\nДата: 14.10.2026 18:42\nМолоко 3,2% 2,89\nИТОГО BYN 17,36\nКарта **** 4412', { today });
eq('чек: время и номер', [rt.item.amount, rt.item.date, rt.item.time, rt.item.check, rt.item.note], [17.36, '2026-10-14', '18:42', '004517', 'Евроопт']);
eq('чек: пустой', I.parseReceiptText('', { today }).ok, false);
eq('чек: без суммы', I.parseReceiptText('Привет\nмир', { today }).reason, 'no-amount');
eq('чек: без даты — сегодня', I.parseReceiptText('Аптека\nИТОГО 12.00', { today }).item.date, '2026-10-17');
eq('чек: тысячи', I.parseReceiptText('Магазин\nИТОГО 1 234,50', { today }).item.amount, 1234.5);

const csv = 'Дата операции;Описание;Сумма;Валюта\n14.10.2026;Оплата EVROOPT MINSK;-45,90;BYN\n15.10.2026;Зарплата;2 500,00;BYN\n16.10.2026;Такси Яндекс;-12,00;BYN\nitog;;;\n';
const c = I.parseStatementCSV(csv, { today });
eq('csv: строки', c.items.map(x => [x.date, x.type, x.amount, x.cat]), [['2026-10-14', 'expense', 45.9, 'Продукты'], ['2026-10-15', 'income', 2500, 'Зарплата'], ['2026-10-16', 'expense', 12, 'Транспорт']]);
eq('csv: пропущено', c.skipped, 1);

const csv2 = 'Date,Description,Debit,Credit\n2026-10-10,"Coffee, Costa",5.50,\n2026-10-11,Salary,,1000.00\n';
const c2 = I.parseStatementCSV(csv2, { today });
eq('csv: дебет и кредит', c2.items.map(x => [x.type, x.amount]), [['expense', 5.5], ['income', 1000]]);

const csv3 = '01.10.2026\tАптека Радуга\t-23.40\n02.10.2026\tВозврат покупки\t10.00\n';
const c3 = I.parseStatementCSV(csv3, { today });
eq('csv: без заголовка, табуляция', c3.items.map(x => [x.date, x.type, x.amount, x.cat]), [['2026-10-01', 'expense', 23.4, 'Здоровье'], ['2026-10-02', 'income', 10, 'Возврат']]);

const pdf = '12.10.2026 Покупка MAXI Минск 34,20 BYN\n13.10.2026 Пополнение счёта +500,00\nИтого по счёту 1000,00';
const p = I.parseStatementLines(pdf, { today });
eq('pdf: строки', p.items.map(x => [x.date, x.type, x.amount]), [['2026-10-12', 'expense', 34.2], ['2026-10-13', 'income', 500]]);

const d = I.dedupe([{ date: '2026-10-14', type: 'expense', amount: 45.9 }, { date: '2026-10-15', type: 'income', amount: 10 }], [{ date: '2026-10-14', type: 'expense', amount: 45.9 }]);
eq('повторы', [d.items.length, d.duplicates], [1, 1]);
eq('число: тысячи точкой', I.toNum('1.234'), 1234);
eq('число: минус', I.toNum('−12,5'), -12.5);
if (fail) { console.log(`\nПровалено: ${fail}`); process.exit(1); } else console.log('\nВсе тесты прошли');
