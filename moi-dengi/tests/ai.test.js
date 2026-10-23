/* ИИ-Фин: запрос, разбор ответа, проверка операций. Сеть подменена, настоящий ключ не нужен. */
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const ai = require('../www/js/ai.js');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? '✓ ' : '✗ ') + name); if (!cond) fail++; };
const ctx = { cats: { expense: ['Продукты', 'Связь', 'Дом', 'Другое'], income: ['Зарплата', 'Переводы', 'Другое'] }, cur: 'BYN', today: '2026-10-17', summary: 'потрачено 700 BYN' };

ok('ключа нет — ИИ недоступен', !ai.available());
ai.setKey('sk-ant-test-1234567890abcdefghij');
ok('ключ сохранён — ИИ доступен', ai.available());
ai.setKey(''); ok('ключ убран', !ai.available());

const items = ai.normalize([
  { type: 'expense', amount: '12,50', currency: 'usd', category: 'связь', date: '2026-10-03', time: '14:05', name: 'Life', check: '123456789' },
  { type: 'expense', amount: -40, currency: 'XXX', category: 'Космос', date: '2026-02-31', name: 'Что-то' },
  { type: 'income', amount: 1000, currency: 'BYN', category: 'Зарплата', date: '2026-10-01' },
  { type: 'expense', amount: 0, currency: 'BYN', category: 'Дом', date: '2026-10-01' },
  null, 'мусор'
], ctx);
ok('мусор и нулевые суммы отброшены', items.length === 3);
ok('сумма с запятой и валюта', items[0].amount === 12.5 && items[0].cur === 'USD');
ok('категория сверена со списком без учёта регистра', items[0].cat === 'Связь');
ok('неизвестная категория → Другое', items[1].cat === 'Другое');
ok('минус в сумме убран, валюта по умолчанию', items[1].amount === 40 && items[1].cur === 'BYN');
ok('несуществующая дата → сегодня', items[1].date === '2026-10-17');
ok('время и чек сохранены', items[0].time === '14:05' && items[0].check === '123456789');
ok('доход распознан', items[2].type === 'income');

const sys = ai.system(ctx);
ok('в системном запросе есть список категорий и дата', /Продукты, Связь/.test(sys) && /2026-10-17/.test(sys));
ok('в системном запросе нет запретных слов в советах', !/слишком плохо/.test(sys));

(async () => {
  const content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAA' } }, { type: 'text', text: 'что тут' }];
  const req = ai.buildRequest({ ctx, content, history: [{ role: 'user', text: 'привет' }, { role: 'assistant', text: 'Привет!' }] });
  ok('запрос: модель, инструмент, история', req.model === ai.MODEL && req.tool_choice.name === 'reply' && req.messages.length === 3);
  ok('запрос: картинка уходит блоком image', req.messages[2].content[0].type === 'image');

  ai.setKey('sk-ant-test-1234567890abcdefghij');
  let seen = null;
  const fetchOk = async (url, init) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'tool_use', name: 'reply', input: { text: 'Нашёл <em>2</em> операции', transactions: [{ type: 'expense', amount: 5, currency: 'BYN', category: 'Продукты', date: '2026-10-16', name: 'Евроопт' }, { type: 'expense', amount: 7, currency: 'BYN', category: 'Дом', date: '2026-10-16' }] } }] }) }; };
  const r = await ai.ask({ text: 'запиши', files: [], history: [], ctx, fetch: fetchOk });
  ok('ответ разобран: текст и две операции', /Нашёл/.test(r.text) && r.items.length === 2);
  ok('ключ и заголовок для браузера отправлены', seen.init.headers['x-api-key'].startsWith('sk-ant') && seen.init.headers['anthropic-dangerous-direct-browser-access'] === 'true');
  ok('адрес API', /api\.anthropic\.com/.test(seen.url));

  const e401 = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'x' } }) });
  try { await ai.ask({ text: 'a', files: [], ctx, fetch: e401 }); ok('401 → ошибка', false); } catch (e) { ok('401 → понятная ошибка про ключ', /ключ/.test(e.message) && e.status === 401); }
  const eNet = async () => { throw new TypeError('Failed to fetch'); };
  try { await ai.ask({ text: 'a', files: [], ctx, fetch: eNet }); ok('нет сети → ошибка', false); } catch (e) { ok('нет сети → code offline', e.code === 'offline'); }

  const plainReply = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'Просто текст' }] }) });
  const r2 = await ai.ask({ text: 'a', files: [], ctx, fetch: plainReply });
  ok('ответ без инструмента тоже читается', r2.text === 'Просто текст' && r2.items.length === 0);
  if (fail) { console.log('Провалено: ' + fail); process.exit(1); }
  console.log('Все тесты прошли');
})();
