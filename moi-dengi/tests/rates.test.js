const R = require('../www/js/rates.js');
let fail = 0; const ok = (n, c, i) => { if (!c) { fail++; console.log('✗', n, i === undefined ? '' : i); } else console.log('✓', n); };
(async () => {
  global.fetch = async url => { const cur = /rates\/([A-Z]{3})/.exec(url)[1]; return { ok: true, json: async () => (cur === 'USD' ? { Cur_OfficialRate: 3.25, Cur_Scale: 1 } : cur === 'RUB' ? { Cur_OfficialRate: 3.6, Cur_Scale: 100 } : { Cur_OfficialRate: 3.5, Cur_Scale: 1 }) }; };
  const m = {}; global.localStorage = { getItem: k => m[k] || null, setItem: (k, v) => { m[k] = v; } };
  let r = await R.convert(10, 'USD', 'BYN', '2026-10-01'); ok('USD → BYN по курсу', r.amount === 32.5 && !r.est, r);
  r = await R.convert(100, 'RUB', 'BYN', '2026-10-01'); ok('RUB → BYN с масштабом 100', r.amount === 3.6, r);
  r = await R.convert(10, 'USD', 'EUR', '2026-10-01'); ok('USD → EUR через BYN', Math.abs(r.amount - 9.29) < 0.01, r);
  r = await R.convert(5, 'BYN', 'BYN', '2026-10-01'); ok('та же валюта без пересчёта', r.amount === 5);
  global.fetch = async () => { throw new Error('offline'); };
  r = await R.convert(10, 'USD', 'BYN', '2026-11-01'); ok('без сети: последний сохранённый курс и пометка «примерно»', r.amount === 32.5 && r.est === true, r);
  console.log(fail ? `Провалено: ${fail}` : 'Все тесты прошли'); process.exit(fail ? 1 : 0);
})();
