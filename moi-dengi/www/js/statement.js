/* Банковская выписка (текст из PDF или распознанный со скриншота) → список операций.
   Достаёт: дату и время операции, дату и время обработки, наименование, сумму, валюту, номер чека, вид (расход или доход),
   предлагает категорию. Помечает повторы и находит похожее на регулярный платёж.
   Чистые функции, без экрана и без сети, проверяются тестами (npm test).
   MD.statement.parse(text, { today, baseCur }) → { items, skipped }
   item = { type, amount, cur, cat, date, time, procDate, procTime, name, check, rep: ''|'same'|'maybe' }
   MD.statement.hints(items) → [{ name, amount, day, cat, count, key }]  (кандидаты в обязательные платежи) */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const r2 = n => Math.round(n * 100) / 100;
  let pick = root.MD && root.MD.pickCategory;
  if (!pick && typeof require === 'function') pick = require('./parser.js').pickCategory;
  const CUR = { BYN: 'BYN', BR: 'BYN', BYR: 'BYN', 'БЕЛ': 'BYN', RUB: 'RUB', 'РУБ': 'BYN', '₽': 'RUB', 'РОС': 'RUB', USD: 'USD', '$': 'USD', ДОЛЛ: 'USD', EUR: 'EUR', '€': 'EUR', ЕВРО: 'EUR' };

  const DT = /(?<!\d)(\d{1,2}[./]\d{1,2}[./](?:\d{4}|\d{2})|\d{4}-\d{2}-\d{2})(?:[ T,]+(\d{1,2}:\d{2}(?::\d{2})?))?/g;
  const AMT = /([-−–+]?\s?\d{1,3}(?:[  ]\d{3})*[.,]\d{1,2}|[-−–+]?\d+[.,]\d{1,2})(?!\d)\s*(BYN|BYR|RUB|USD|EUR|Br|BR|руб\.?|р\.|₽|\$|€)?/g;
  const CHECK = /(?:чек|№\s*чека|номер\s*чека|квитанц|check|rrn|арн|ref)[^0-9A-Za-z]{0,4}([0-9A-Za-z]{5,})/i;
  const INC = /(пополн|зачисл|поступл|возврат|кэшбэк|кешбэк|начислен|получен|перевод\s*от|входящ|на\s*вашу\s*карту|заработн|стипенд|salary|refund|cashback|deposit)/i;
  const NOISE = /^(выписк|период|остаток|итого|всего|баланс|номер\s*счёта|номер\s*счета|клиент|страница|дата\s*операции|дата\s*обработки|наименование|описание|сумма|валюта|исходящий|входящий|оборот|iban|bic|унп)/i;

  function iso(s, today) {
    let y, m, d, mm;
    if ((mm = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/))) { y = +mm[1]; m = +mm[2]; d = +mm[3]; }
    else if ((mm = String(s).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})$/))) { d = +mm[1]; m = +mm[2]; y = +mm[3]; if (y < 100) y += 2000; }
    else return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    const t = today || new Date();
    if (dt > new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  }
  const hm = s => { if (!s) return ''; const [h, m] = s.split(':'); return `${pad(+h)}:${m}`; };
  const toNum = s => { const t = String(s).replace(/[−–]/g, '-').replace(/[\s  +]/g, '').replace(',', '.'); const v = Number(t); return Number.isFinite(v) ? v : NaN; };
  const tidy = s => String(s || '').replace(/[()«»"“”]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,.;:\-–—*#№)]+|[\s,.;:\-–—*#(]+$/g, '').trim();
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const curOf = w => { if (!w) return null; const k = String(w).toUpperCase().replace(/\./g, ''); return CUR[k] || CUR[k.slice(0, 3)] || null; };

  function parse(text, ctx) {
    const today = (ctx && ctx.today) || new Date();
    const items = []; let skipped = 0, last = null;
    for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
      let line = raw.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!line) continue;
      const dts = [...line.matchAll(DT)];
      if (!dts.length) {
        // продолжение названия на следующей строке
        if (last && !NOISE.test(line) && /[A-Za-zА-Яа-я]/.test(line) && !/\d[.,]\d{2}/.test(line) && last.name.length < 70) last.name = tidy(last.name + ' ' + line);
        continue;
      }
      const op = dts[0], pr = dts[1] || null;
      const date = iso(op[1], today); if (!date) { skipped++; continue; }
      let rest = line;
      [...dts].reverse().forEach(m => { rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length); });
      const ck = rest.match(CHECK); let check = '';
      if (ck) { check = ck[1]; rest = rest.replace(ck[0], ' '); }
      const amts = [...rest.matchAll(AMT)];
      if (!amts.length) { skipped++; last = null; continue; }
      const a = amts[0], signedRaw = a[1].replace(/[−–]/g, '-').trim(), val = toNum(signedRaw);
      if (!Number.isFinite(val) || val === 0) { skipped++; continue; }
      let cur = curOf(a[2]);
      amts.forEach(m => { rest = rest.replace(m[0], ' '); });
      rest = rest.replace(/\b(BYN|BYR|RUB|USD|EUR|Br)\b|₽|€|\$/gi, ' ');
      if (!check) { const long = rest.match(/(?<![\d*•.])(\d{8,})(?![\d])/); if (long) { check = long[1]; rest = rest.replace(long[0], ' '); } }
      rest = rest.replace(/(?:\*{1,}|•{1,}|\.{3,})\s*\d{4}/g, ' ').replace(/карт[аыу]?\s*\d{4}/gi, ' ');
      const name = tidy(rest);
      const explicit = /^[-]/.test(signedRaw) ? 'expense' : /^\+/.test(signedRaw.replace(/\s/g, '')) || /^\+/.test(a[1].trim()) ? 'income' : '';
      const type = explicit || (INC.test(name) ? 'income' : 'expense');
      const low = name.toLowerCase().replace(/ё/g, 'е');
      const cat = pick ? pick(low, type) : 'Другое';
      const it = { type, amount: r2(Math.abs(val)), cur: cur || (ctx && ctx.baseCur) || 'BYN', cat, date, time: hm(op[2]), procDate: pr ? iso(pr[1], today) || '' : '', procTime: pr ? hm(pr[2]) : '', name: cap(name) || cap(cat), check, rep: '', curGuess: !cur };
      items.push(it); last = it;
    }
    markRepeats(items);
    return { items, skipped };
  }

  /* Повторы: одинаковый чек или время — это одна и та же операция дважды; та же сумма в тот же день — возможный повтор */
  function markRepeats(items) {
    const seen = new Map();
    for (const it of items) {
      const k1 = `${it.date}|${it.amount}|${it.name.toLowerCase()}`;
      const prev = seen.get(k1);
      if (prev) {
        const same = (it.check && prev.check && it.check === prev.check) || (it.time && prev.time && it.time === prev.time);
        it.rep = same ? 'same' : 'maybe';
      } else seen.set(k1, it);
    }
    return items;
  }

  /* Похоже на регулярный платёж: то же название и близкая сумма в разных месяцах, или «кредит», «коммунальные» и им подобное */
  const REGULAR = /(кредит|ипотек|рассрочк|коммунал|электроэнерг|квартплат|аренд|интернет|life|лайф|мтс|а1|подписк|netflix|spotify|налог|страхов)/i;
  function hints(items) {
    const groups = new Map();
    for (const it of items) {
      if (it.type !== 'expense' || it.rep === 'same') continue;
      const key = it.name.toLowerCase().replace(/[\d.,]+/g, '').replace(/\s+/g, ' ').trim(); if (!key) continue;
      (groups.get(key) || groups.set(key, []).get(key)).push(it);
    }
    const out = [];
    for (const [key, list] of groups) {
      const months = new Set(list.map(i => i.date.slice(0, 7)));
      const amounts = list.map(i => i.amount).sort((a, b) => a - b), med = amounts[Math.floor(amounts.length / 2)];
      const close = list.filter(i => Math.abs(i.amount - med) <= med * 0.1).length >= 2;
      const regularWord = REGULAR.test(key);
      if ((months.size >= 2 && close) || regularWord) {
        const days = list.map(i => Number(i.date.slice(8))), day = days.sort((a, b) => a - b)[Math.floor(days.length / 2)];
        out.push({ key, name: list[0].name, amount: med, day, cat: list[0].cat, count: list.length, sure: months.size >= 2 && close });
      }
    }
    return out;
  }

  const byDay = items => { const m = {}; items.forEach(i => (m[i.date] = m[i.date] || []).push(i)); return Object.keys(m).sort().reverse().map(d => ({ date: d, items: m[d] })); };

  const api = { parse, hints, markRepeats, byDay };
  root.MD = root.MD || {};
  root.MD.statement = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
