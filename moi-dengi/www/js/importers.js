/* Разбор чеков и банковских выписок. Чистые функции: без экрана и без сети, проверяются тестами (npm test).
   MD.importers.parseReceiptText(text, { today })  → { ok, item?, reason? }      (текст чека после распознавания)
   MD.importers.parseStatementCSV(text, { today }) → { items, skipped }          (выписка CSV или текст из таблицы)
   MD.importers.parseStatementLines(text, { today }) → { items, skipped }        (текст из PDF: строки «дата … сумма»)
   MD.importers.dedupe(items, existingTx) → items без тех, что уже записаны
   item = { type: 'expense' | 'income', amount, cat, date: 'YYYY-MM-DD', note } */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const round2 = n => Math.round(n * 100) / 100;
  let pick = root.MD && root.MD.pickCategory;
  if (!pick && typeof require === 'function') pick = require('./parser.js').pickCategory;
  const category = (text, type) => (pick ? pick(text, type) : 'Другое');

  /* ---------- Числа и даты ---------- */
  function toNum(s) {
    if (s == null) return NaN;
    let t = String(s).replace(/[  ]/g, ' ').trim();
    if (!t) return NaN;
    const neg = /^[-−–—(]/.test(t) || /-\s*$/.test(t) || /^\(.*\)$/.test(t);
    t = t.replace(/[^\d.,]/g, '');
    if (!/\d/.test(t)) return NaN;
    const idx = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'));
    if (idx >= 0 && t.length - idx - 1 <= 2) t = t.slice(0, idx).replace(/[.,]/g, '') + '.' + t.slice(idx + 1);
    else t = t.replace(/[.,]/g, '');
    const v = Number(t);
    return Number.isFinite(v) ? (neg ? -v : v) : NaN;
  }

  function toDate(s, today) {
    const str = String(s || '');
    let y, m, d, mm;
    if ((mm = str.match(/(\d{4})-(\d{2})-(\d{2})/))) { y = +mm[1]; m = +mm[2]; d = +mm[3]; }
    else if ((mm = str.match(/(?<!\d)(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})(?!\d)/))) { d = +mm[1]; m = +mm[2]; y = +mm[3]; if (y < 100) y += 2000; }
    else return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    const t = today || new Date();
    const limit = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    if (dt > limit) return null;
    return ymd(dt);
  }

  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const tidy = (s, n = 60) => cap(String(s || '').replace(/\s+/g, ' ').replace(/^[\s,.;:\-–—*#№]+|[\s,.;:\-–—*#]+$/g, '').slice(0, n).trim());

  /* ---------- Чек ---------- */
  const SKIP_LINE = /(сдач|налич|ндс|скидк|бонус|получен|безнал|карт[аы]\s*\d|баллы|округл|кассир|смена|ккм|фн\b|фд\b|фп\b|унп|инн|сно|рн ккт)/i;
  const TOTAL_STRONG = /(к\s*оплате|итого|итог\b|всего\s*к\s*оплате|total|сумма\s*к\s*оплате)/i;
  const TOTAL_WEAK = /(сумма|всего|оплата|оплачено|total|sum)/i;
  const NOT_SHOP = /^(кассовый|товарный|чек|фискальн|добро|спасибо|приход|продажа|№|n\s?\d|тел|адрес|г\.|ул\.|пр-т|дата|время|www|http|кассир|смена|операция)/i;

  function parseReceiptText(text, ctx) {
    const today = (ctx && ctx.today) || new Date();
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return { ok: false, reason: 'empty' };
    const money = l => {
      const out = []; const re = /(?<![\d])(\d{1,3}(?:[  ]\d{3})+|\d+)[.,](\d{2})(?!\d)/g; let m;
      while ((m = re.exec(l))) out.push(toNum(m[1] + '.' + m[2]));
      if (!out.length) { const re2 = /(?<![\d.,])(\d{1,6})(?![\d.,])\s*(?:br|byn|руб|р\.?|₽)?\s*$/i; const m2 = l.match(re2); if (m2) out.push(Number(m2[1])); }
      return out.filter(v => v > 0 && v < 1e7);
    };
    let amount = 0;
    for (const re of [TOTAL_STRONG, TOTAL_WEAK]) {
      const cands = [];
      for (const l of lines) { if (re.test(l) && !SKIP_LINE.test(l)) cands.push(...money(l)); }
      if (cands.length) { amount = re === TOTAL_STRONG ? cands[cands.length - 1] : Math.max(...cands); break; }
    }
    if (!amount) {
      const all = []; for (const l of lines) { if (!SKIP_LINE.test(l)) all.push(...money(l)); }
      if (all.length) amount = Math.max(...all);
    }
    if (!(amount > 0)) return { ok: false, reason: 'no-amount' };
    let date = null;
    for (const l of lines) { date = toDate(l, today); if (date) break; }
    let shop = '';
    for (const l of lines.slice(0, 8)) {
      if (NOT_SHOP.test(l) || SKIP_LINE.test(l)) continue;
      const letters = (l.match(/[A-Za-zА-Яа-яЁё]/g) || []).length;
      if (letters < 3 || letters < l.replace(/\s/g, '').length * 0.5) continue;
      shop = l.replace(/^(ооо|оао|зао|ип|одо|чуп|уп|чтуп|тчуп|ao|llc|ltd)\s+/i, '').replace(/[«»"“”„]/g, '').replace(/\s{2,}/g, ' ');
      break;
    }
    const cat = category(`${shop} ${lines.join(' ')}`.toLowerCase().replace(/ё/g, 'е'), 'expense');
    let time = '', check = '';
    for (const l of lines) { if (!time) { const tm = l.match(/(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)/); if (tm) time = tm[1].padStart(2, '0') + ':' + tm[2]; } if (!check) { const cm = l.match(/(?:чек|документ|операци[яи])\s*(?:№|#|n)?\s*:?\s*(\d{3,})/i) || l.match(/№\s*(\d{3,})/); if (cm) check = cm[1]; } }
    return { ok: true, item: { type: 'expense', amount: round2(amount), cat, date: date || ymd(today), note: tidy(shop, 40), time, check, guessedDate: !date } };
  }

  /* ---------- Выписка: таблица ---------- */
  function splitCSV(text, delim) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim()));
  }
  function detectDelim(text) {
    const head = text.split(/\r?\n/).slice(0, 6).join('\n');
    const cnt = ch => (head.match(new RegExp(ch === '\t' ? '\\t' : '\\' + ch, 'g')) || []).length;
    const c = { ';': cnt(';'), '\t': cnt('\t'), ',': cnt(',') };
    if (c[';'] > 0 && c[';'] >= c['\t']) return ';';
    if (c['\t'] > 0) return '\t';
    return ',';
  }

  const H_DATE = /(дата|date|время|проведен)/i;
  const H_DESC = /(описан|назначен|операц|детал|details|description|merchant|получател|контрагент|наимен|комментар|мсс|место|магазин)/i;
  const H_AMT = /^(сумма|amount|sum|сумма операции|сумма в валюте)/i;
  const H_OUT = /(расход|списан|debit|снят|дебет)/i;
  const H_IN = /(приход|зачисл|credit|кредит|поступл)/i;

  function makeItem(dateStr, desc, signed, today, hint) {
    const date = toDate(dateStr, today); if (!date) return null;
    if (!Number.isFinite(signed) || signed === 0) return null;
    let type = signed < 0 ? 'expense' : 'income';
    if (hint === 'expense' || hint === 'income') type = hint;
    const d = String(desc || '').toLowerCase().replace(/ё/g, 'е');
    return { type, amount: round2(Math.abs(signed)), cat: category(d, type), date, note: tidy(String(desc || '').replace(/\d{4,}[\d*xх ]*/g, '').replace(/\s{2,}/g, ' '), 50) };
  }

  function parseStatementCSV(text, ctx) {
    const today = (ctx && ctx.today) || new Date();
    const clean = String(text || '').replace(/^﻿/, '');
    const rows = splitCSV(clean, detectDelim(clean));
    if (rows.length < 1) return { items: [], skipped: 0 };
    let hi = rows.slice(0, 15).findIndex(r => r.some(c => H_DATE.test(c)) && r.some(c => H_AMT.test(c.trim()) || H_OUT.test(c) || H_IN.test(c)));
    let iDate = -1, iDesc = -1, iAmt = -1, iOut = -1, iIn = -1, body;
    if (hi >= 0) {
      const h = rows[hi];
      iDate = h.findIndex(c => H_DATE.test(c));
      iDesc = h.findIndex((c, i) => i !== iDate && H_DESC.test(c));
      iOut = h.findIndex(c => H_OUT.test(c));
      iIn = h.findIndex(c => H_IN.test(c));
      iAmt = h.findIndex(c => H_AMT.test(c.trim()));
      body = rows.slice(hi + 1);
    } else {
      body = rows;
      const probe = rows.slice(0, 8);
      const cols = Math.max(...probe.map(r => r.length));
      for (let c = 0; c < cols; c++) {
        const col = probe.map(r => r[c] || '');
        if (iDate < 0 && col.filter(v => toDate(v, today)).length >= Math.ceil(probe.length / 2)) iDate = c;
      }
      for (let c = cols - 1; c >= 0; c--) {
        if (c === iDate) continue;
        const col = probe.map(r => r[c] || '');
        if (col.filter(v => Number.isFinite(toNum(v)) && /\d/.test(v) && !toDate(v, today)).length >= Math.ceil(probe.length / 2)) { iAmt = c; break; }
      }
      let bestLen = 0;
      for (let c = 0; c < cols; c++) { if (c === iDate || c === iAmt) continue; const len = probe.reduce((s, r) => s + (r[c] || '').length, 0); if (len > bestLen) { bestLen = len; iDesc = c; } }
    }
    if (iDate < 0 || (iAmt < 0 && iOut < 0 && iIn < 0)) return { items: [], skipped: body.length };
    const items = []; let skipped = 0;
    for (const r of body) {
      let signed = NaN, hint = null;
      if (iOut >= 0 || iIn >= 0) {
        const o = iOut >= 0 ? toNum(r[iOut]) : NaN, i = iIn >= 0 ? toNum(r[iIn]) : NaN;
        if (Number.isFinite(o) && Math.abs(o) > 0) { signed = -Math.abs(o); hint = 'expense'; }
        else if (Number.isFinite(i) && Math.abs(i) > 0) { signed = Math.abs(i); hint = 'income'; }
      }
      if (!Number.isFinite(signed) && iAmt >= 0) signed = toNum(r[iAmt]);
      const it = makeItem(r[iDate], iDesc >= 0 ? r[iDesc] : '', signed, today, hint);
      if (it) items.push(it); else skipped++;
    }
    return { items, skipped };
  }

  /* ---------- Выписка: строки текста (из PDF) ---------- */
  const EXP_W = /(покупк|оплат|списан|снят|перевод на|платеж|расход|commission|комисси|purchase|withdraw)/i;
  const INC_W = /(пополн|зачисл|поступл|зарплат|возврат|кэшбэк|кешбэк|получен|перевод от|salary|refund|cashback|deposit)/i;
  function parseStatementLines(text, ctx) {
    const today = (ctx && ctx.today) || new Date();
    const items = []; let skipped = 0;
    for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
      const line = raw.replace(/[  ]/g, ' ').trim();
      const dm = line.match(/(?<!\d)(\d{1,2}[./]\d{1,2}[./](?:\d{4}|\d{2})|\d{4}-\d{2}-\d{2})(?!\d)/);
      if (!dm) continue;
      const date = toDate(dm[1], today);
      const rest = line.replace(dm[0], ' ').replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ');
      const nums = [...rest.matchAll(/([-−–+]?\s?\d{1,3}(?:[ ]\d{3})*[.,]\d{2}|[-−–+]?\d+[.,]\d{2})/g)];
      if (!date || !nums.length) { skipped++; continue; }
      const tok = nums[0][1];
      const val = toNum(tok.replace(/\s/g, ''));
      if (!Number.isFinite(val) || val === 0) { skipped++; continue; }
      const desc = rest.replace(/[-−–+]?\s?\d{1,3}(?:[ ]\d{3})*[.,]\d{2}/g, ' ').replace(/\b(BYN|RUB|USD|EUR|Br|₽|€|\$)\b/gi, ' ').replace(/\s{2,}/g, ' ');
      const explicitSign = /^[-−–+]/.test(tok.trim());
      let signed = val;
      if (!explicitSign) {
        if (INC_W.test(desc) && !EXP_W.test(desc)) signed = Math.abs(val); else signed = -Math.abs(val);
      }
      const it = makeItem(dm[1], desc, signed, today);
      if (it) items.push(it); else skipped++;
    }
    return { items, skipped };
  }

  /* ---------- Повторы ---------- */
  function dedupe(items, existing) {
    const left = new Map();
    for (const t of existing || []) { const k = `${t.date}|${t.type}|${round2(t.amount)}`; left.set(k, (left.get(k) || 0) + 1); }
    const out = []; let dup = 0;
    for (const it of items) {
      const k = `${it.date}|${it.type}|${round2(it.amount)}`;
      if (left.get(k) > 0) { left.set(k, left.get(k) - 1); dup++; } else out.push(it);
    }
    return { items: out, duplicates: dup };
  }

  const api = { parseReceiptText, parseStatementCSV, parseStatementLines, dedupe, toNum, toDate };
  root.MD = root.MD || {};
  root.MD.importers = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
