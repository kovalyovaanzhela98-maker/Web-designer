/* Курсы валют: переводим операцию в основную валюту по курсу на её дату.
   Источник — Национальный банк Беларуси (api.nbrb.by). Курсы кладём в память телефона; без сети берём ближайший сохранённый
   или примерный и честно помечаем «≈». Чистая часть (convert) проверяется тестами. */
(function (root) {
  'use strict';
  const KEY = 'moidengi_rates';
  const FALLBACK = { BYN: 1, USD: 3.2, EUR: 3.5, RUB: 0.036 };   // BYN за единицу, примерно
  /* Защита от перевёрнутого или битого курса: за единицу валюты в BYN выходит в этих пределах, иначе берём запасной */
  const SANE = { USD: [1.5, 6], EUR: [1.5, 7], RUB: [0.01, 0.1] };
  const sane = (cur, r) => !SANE[cur] || (r >= SANE[cur][0] && r <= SANE[cur][1]);
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return {}; } };
  const write = m => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (_) {} };

  /* Курс cur к белорусскому рублю на дату: { rate, est } */
  async function toByn(cur, date) {
    if (cur === 'BYN') return { rate: 1, est: false };
    const m = read(), k = `${cur}|${date}`;
    if (m[k] && sane(cur, m[k])) return { rate: m[k], est: false };
    try {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), 3500) : null;
      const r = await fetch(`https://api.nbrb.by/exrates/rates/${cur}?parammode=2&ondate=${date}`, ctl ? { signal: ctl.signal } : {});
      if (t) clearTimeout(t);
      if (r.ok) {
        const d = await r.json();
        const rate = Number(d.Cur_OfficialRate) / (Number(d.Cur_Scale) || 1);
        if (rate > 0 && sane(cur, rate)) { m[k] = rate; m[`${cur}|last`] = rate; write(m); return { rate, est: false }; }
      }
    } catch (_) { /* нет сети: ниже запасной вариант */ }
    const last = m[`${cur}|last`];
    return { rate: last && sane(cur, last) ? last : FALLBACK[cur] || 1, est: true };
  }
  /* amount в валюте from → в валюте to: через курсы к BYN */
  async function convert(amount, from, to, date) {
    if (from === to) return { amount, rate: 1, est: false };
    const a = await toByn(from, date), b = await toByn(to, date);
    const rate = a.rate / b.rate;
    return { amount: Math.round(amount * rate * 100) / 100, rate, est: a.est || b.est };
  }
  const api = { convert, toByn, FALLBACK, sane };
  root.MD = root.MD || {};
  root.MD.rates = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
