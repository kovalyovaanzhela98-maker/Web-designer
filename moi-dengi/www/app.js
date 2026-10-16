(() => {
'use strict';

/* ---------- Константы ---------- */
const STORE_KEY = 'moidengi_v1';
const KEY_KEY = 'moidengi_apikey';
const CURRENCIES = { BYN: 'Br', RUB: '₽', USD: '$', EUR: '€' };
const MODEL = 'claude-haiku-5-5';

const CATS = {
  expense: [
    ['Продукты', '🛒', '#3B82F6'], ['Кафе', '☕', '#F59E0B'], ['Транспорт', '🚌', '#14B8A6'],
    ['Дом', '🏠', '#8B5CF6'], ['Здоровье', '💊', '#EF4444'], ['Одежда', '👕', '#EC4899'],
    ['Связь', '📱', '#06B6D4'], ['Подписки', '🔁', '#6366F1'], ['Подарки', '🎁', '#F97316'],
    ['Развлечения', '🎬', '#EAB308'], ['Другое', '📦', '#94A3B8']
  ],
  income: [
    ['Зарплата', '💼', '#1F8A5B'], ['Подработка', '🧰', '#14B8A6'], ['Подарок', '🎁', '#F97316'],
    ['Возврат', '↩️', '#3B82F6'], ['Другое', '📦', '#94A3B8']
  ]
};
const COLORS = [
  { bg: '#2F4AA8', fg: '#FFFFFF', name: 'Синий' },
  { bg: '#1F8A5B', fg: '#FFFFFF', name: 'Зелёный' },
  { bg: '#C2364B', fg: '#FFFFFF', name: 'Красный' },
  { bg: '#7A4FD0', fg: '#FFFFFF', name: 'Фиолетовый' },
  { bg: '#D9560F', fg: '#FFFFFF', name: 'Оранжевый' },
  { bg: '#F2C230', fg: '#1D2433', name: 'Жёлтый' },
  { bg: '#2B3345', fg: '#FFFFFF', name: 'Графитовый' }
];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WD_S = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/* ---------- Утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
function parseYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 9));
const round2 = n => Math.round(n * 100) / 100;

function parseAmount(v, allowNeg) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  let s = String(v ?? '').trim().replace(/[\s ]/g, '').replace(',', '.');
  const re = allowNeg ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/;
  if (!re.test(s)) return NaN;
  return Number(s);
}
function fmt(n) {
  const sign = n < -0.004 ? '−' : '';
  const s = Math.abs(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return sign + s;
}
const sym = () => CURRENCIES[state.currency];
const money = n => `${fmt(n)} ${sym()}`;
const signed = (n, type) => (type === 'income' ? '+' : '−') + fmt(n) + ' ' + sym();

/* ---------- Хранилище ---------- */
let state = { currency: 'BYN', accounts: [], tx: [] };
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const s = sanitize(JSON.parse(raw)); if (s) state = s; }
  } catch (e) { /* первый запуск или недоступное хранилище */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('Не удалось сохранить данные на устройстве'); }
}
const getKey = () => { try { return localStorage.getItem(KEY_KEY) || ''; } catch (e) { return ''; } };
const setKey = v => { try { v ? localStorage.setItem(KEY_KEY, v) : localStorage.removeItem(KEY_KEY); return true; } catch (e) { return false; } };

function sanitize(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  if (!Array.isArray(o.accounts) || !Array.isArray(o.tx)) return null;
  const currency = CURRENCIES[o.currency] ? o.currency : 'BYN';
  const accounts = [];
  for (const a of o.accounts) {
    if (!a || typeof a.name !== 'string' || !a.name.trim()) continue;
    const bal = parseAmount(a.balance, true);
    accounts.push({
      id: typeof a.id === 'string' && a.id ? a.id : uid(),
      name: a.name.trim().slice(0, 24),
      last4: /^\d{4}$/.test(String(a.last4 ?? '')) ? String(a.last4) : '',
      balance: Number.isFinite(bal) ? round2(bal) : 0,
      color: COLORS.some(c => c.bg === a.color) ? a.color : COLORS[0].bg
    });
  }
  const ids = new Set(accounts.map(a => a.id));
  const tx = [];
  for (const t of o.tx) {
    if (!t || (t.type !== 'expense' && t.type !== 'income')) continue;
    const amt = parseAmount(t.amount);
    if (!(amt > 0) || !ids.has(t.acc) || !parseYmd(t.date)) continue;
    const list = CATS[t.type].map(c => c[0]);
    tx.push({
      id: typeof t.id === 'string' && t.id ? t.id : uid(), type: t.type, amount: round2(amt),
      cat: list.includes(t.cat) ? t.cat : 'Другое', acc: t.acc, date: t.date,
      note: typeof t.note === 'string' ? t.note.slice(0, 100) : ''
    });
  }
  return { currency, accounts, tx };
}

/* ---------- UI-состояние ---------- */
const now0 = new Date();
let ym = { y: now0.getFullYear(), m: now0.getMonth() };
let filterAcc = null;
let draft = [];
const catInfo = (type, name) => CATS[type].find(c => c[0] === name) || CATS[type][CATS[type].length - 1];
const accById = id => state.accounts.find(a => a.id === id);
const colorOf = hex => COLORS.find(c => c.bg === hex) || COLORS[0];

function accBalance(a) {
  let b = a.balance;
  for (const t of state.tx) if (t.acc === a.id) b += t.type === 'income' ? t.amount : -t.amount;
  return round2(b);
}

/* ---------- Отрисовка ---------- */
function render() {
  if (filterAcc && !accById(filterAcc)) filterAcc = null;
  $('#monthLabel').textContent = `${MONTHS[ym.m]} ${ym.y}`;
  const fa = filterAcc && accById(filterAcc);

  // Баланс
  const total = fa ? accBalance(fa) : round2(state.accounts.reduce((s, a) => s + accBalance(a), 0));
  $('#heroLabel').textContent = fa ? `Баланс · ${fa.name}` : 'Общий баланс';
  $('#heroSum').textContent = money(total);
  $('#filterReset').hidden = !fa;

  // Операции месяца
  const mk = `${ym.y}-${pad(ym.m + 1)}`;
  const list = state.tx.filter(t => t.date.startsWith(mk) && (!fa || t.acc === fa.id));
  const inc = round2(list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
  const exp = round2(list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  $('#sumInc').textContent = (inc > 0 ? '+' : '') + money(inc);
  $('#sumExp').textContent = (exp > 0 ? '−' : '') + money(exp);

  renderStrip();
  renderCats(list.filter(t => t.type === 'expense'), exp);
  renderTx(list);
}

function renderStrip() {
  const el = $('#strip');
  if (!state.accounts.length) {
    el.innerHTML = `<button class="acc-add big" data-add-acc><b>+</b><span>Добавить первую карту или счёт</span></button>`;
    return;
  }
  el.innerHTML = state.accounts.map(a => {
    const c = colorOf(a.color), sel = a.id === filterAcc;
    return `<div class="acc ${sel ? 'sel' : ''} ${filterAcc && !sel ? 'dim' : ''}" data-acc="${esc(a.id)}" style="--bg-c:${c.bg};--fg:${c.fg}" role="button" tabindex="0" aria-pressed="${sel}" aria-label="${esc(a.name)}, баланс ${esc(money(accBalance(a)))}. Нажмите, чтобы показать только эту карту">
      <button class="acc-more" data-edit="${esc(a.id)}" aria-label="Изменить карту ${esc(a.name)}">⋯</button>
      <div><div class="acc-name">${esc(a.name)}</div><div class="acc-num">${a.last4 ? '•••• ' + esc(a.last4) : '&nbsp;'}</div></div>
      <div class="acc-bal">${esc(money(accBalance(a)))}</div>
    </div>`;
  }).join('') + `<button class="acc-add" data-add-acc><b>+</b><span>Добавить</span></button>`;
}

function renderCats(expList, expTotal) {
  const el = $('#catCard');
  if (!expList.length) {
    el.innerHTML = `<div class="empty" style="border:0;padding:10px"><b>Расходов пока нет</b>В этом месяце ещё ничего не потрачено</div>`;
    return;
  }
  const by = {};
  expList.forEach(t => { by[t.cat] = round2((by[t.cat] || 0) + t.amount); });
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const R = 56, C = 2 * Math.PI * R;
  let off = 0;
  const segs = rows.map(([name, sum]) => {
    const frac = sum / expTotal, len = Math.max(frac * C - (rows.length > 1 ? 3 : 0), 0.5);
    const s = `<circle cx="75" cy="75" r="${R}" fill="none" stroke="${catInfo('expense', name)[2]}" stroke-width="20" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"/>`;
    off += frac * C;
    return s;
  }).join('');
  const topName = rows[0][0];
  el.innerHTML = `
    <div class="cat-wrap">
      <div class="donut" role="img" aria-label="Расходы за месяц ${esc(money(expTotal))}">
        <svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="${R}" fill="none" stroke="var(--field)" stroke-width="20"/>${segs}</svg>
        <div class="donut-c"><b>${esc(fmt(expTotal))}</b><span>${esc(sym())} всего</span></div>
      </div>
      <div class="top-cat">Больше всего ушло на<b>${catInfo('expense', topName)[1]} ${esc(topName)}</b>${Math.round(rows[0][1] / expTotal * 100)}% расходов</div>
    </div>
    <ul class="cats">${rows.map(([name, sum]) => {
      const ci = catInfo('expense', name), pc = sum / expTotal * 100;
      return `<li><div class="cat-top"><span class="dot" style="background:${ci[2]}"></span><span class="nm">${esc(name)}</span><span class="pc">${pc < 1 ? '<1' : Math.round(pc)}%</span><span class="am">${esc(fmt(sum))}</span></div><div class="bar"><i style="--c:${ci[2]};width:${Math.max(pc, 2).toFixed(1)}%"></i></div></li>`;
    }).join('')}</ul>`;
}

function dayTitle(s) {
  const d = parseYmd(s), t = parseYmd(today());
  const diff = Math.round((t - d) / 864e5);
  const base = `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  if (diff === 0) return `Сегодня, ${base}`;
  if (diff === 1) return `Вчера, ${base}`;
  return `${WD_S[d.getDay()]}, ${base}`;
}

function renderTx(list) {
  const el = $('#txList');
  if (!list.length) {
    el.innerHTML = `<div class="empty"><b>Операций нет</b>Нажми «Добавить операцию» или напиши помощнику</div>`;
    return;
  }
  const days = {};
  list.forEach(t => (days[t.date] = days[t.date] || []).push(t));
  el.innerHTML = Object.keys(days).sort().reverse().map(d => {
    const items = days[d];
    const net = round2(items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
    return `<div class="day"><div class="day-h"><span>${esc(dayTitle(d))}</span><span>${net > 0 ? '+' : ''}${esc(fmt(net))}</span></div>` +
      items.slice().reverse().map(t => {
        const ci = catInfo(t.type, t.cat), a = accById(t.acc);
        return `<div class="tx"><div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${ci[1]}</div>
          <div class="tx-body"><div class="tx-t">${esc(t.note || t.cat)}</div><div class="tx-s">${esc(t.cat)} · ${esc(a ? a.name : '—')}</div></div>
          <div class="tx-a ${t.type === 'income' ? 'inc' : 'exp'}">${esc(signed(t.amount, t.type))}</div>
          <button class="tx-del" data-del="${esc(t.id)}" aria-label="Удалить операцию: ${esc(t.note || t.cat)}, ${esc(signed(t.amount, t.type))}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
      }).join('') + `</div>`;
  }).join('');
}

/* ---------- Слои (листы/диалоги) + кнопка «Назад» ---------- */
const layers = [];
let ignorePops = 0;
function openLayer(el) {
  el.hidden = false;
  layers.push(el);
  history.pushState({ layer: layers.length }, '');
  setTimeout(() => {
    if (el !== layers[layers.length - 1]) return;
    const t = $('[data-autofocus]', el) || (el.id === 'lyConfirm' ? $('#cfNo') : $('.btn.primary', el));
    if (t) t.focus({ preventScroll: true });
  }, 60);
}
function closeLayer(el) {
  const i = layers.indexOf(el);
  if (i < 0) return;
  layers.splice(i, 1);
  el.hidden = true;
  ignorePops++;
  history.back();
  if (el._onClose) { const f = el._onClose; el._onClose = null; f(); }
}
window.addEventListener('popstate', () => {
  if (ignorePops > 0) { ignorePops--; return; }
  const top = layers.pop();
  if (top) { top.hidden = true; if (top._onClose) { const f = top._onClose; top._onClose = null; f(); } }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && layers.length) closeLayer(layers[layers.length - 1]);
});
$$('.layer').forEach(l => l.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeLayer(l);
}));

function confirmDlg(title, text, yes = 'Удалить') {
  return new Promise(res => {
    const l = $('#lyConfirm');
    $('#cfTitle').textContent = title; $('#cfText').textContent = text; $('#cfYes').textContent = yes;
    let done = false;
    const fin = v => { if (done) return; done = true; res(v); };
    l._onClose = () => fin(false);
    $('#cfYes').onclick = () => { l._onClose = null; fin(true); closeLayer(l); };
    $('#cfNo').onclick = () => closeLayer(l);
    openLayer(l);
  });
}

let toastT = null;
function toast(msg, actionLabel, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>` + (actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : '');
  if (actionLabel) $('button', t).onclick = () => { t.hidden = true; action(); };
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, actionLabel ? 6000 : 3000);
}
const showErr = (el, msg) => { el.textContent = msg; el.hidden = false; };
const hideErr = el => { el.hidden = true; };

/* ---------- Операция ---------- */
const tx = { type: 'expense', cat: 'Продукты', acc: null };
function renderTxForm() {
  $$('#lyTx .seg-b').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === tx.type)));
  $('#txCur').textContent = sym();
  $('#txCats').innerHTML = CATS[tx.type].map(c =>
    `<button type="button" role="radio" class="chip" data-cat="${esc(c[0])}" aria-checked="${c[0] === tx.cat}"><span aria-hidden="true">${c[1]}</span>${esc(c[0])}</button>`).join('');
  $('#txAccs').innerHTML = state.accounts.map(a =>
    `<button type="button" role="radio" class="chip" data-acc-pick="${esc(a.id)}" aria-checked="${a.id === tx.acc}"><span class="dot" style="background:${colorOf(a.color).bg}"></span>${esc(a.name)}${a.last4 ? ' ·' + esc(a.last4) : ''}</button>`).join('');
}
function openTx() {
  if (!state.accounts.length) { toast('Сначала добавь карту или счёт'); openAcc(null); return; }
  tx.type = 'expense'; tx.cat = CATS.expense[0][0];
  tx.acc = (filterAcc && accById(filterAcc)) ? filterAcc : state.accounts[0].id;
  $('#txAmount').value = ''; $('#txNote').value = ''; $('#txDate').value = today();
  hideErr($('#txAmountErr'));
  renderTxForm();
  openLayer($('#lyTx'));
  $('#txAmount').setAttribute('data-autofocus', '');
}
$('#lyTx').addEventListener('click', e => {
  const t = e.target.closest('[data-type],[data-cat],[data-acc-pick]');
  if (!t) return;
  if (t.dataset.type) { tx.type = t.dataset.type; tx.cat = CATS[tx.type][0][0]; }
  if (t.dataset.cat) tx.cat = t.dataset.cat;
  if (t.dataset.accPick) tx.acc = t.dataset.accPick;
  renderTxForm();
});
$('#txForm').addEventListener('submit', e => {
  e.preventDefault();
  const amt = parseAmount($('#txAmount').value);
  const err = $('#txAmountErr');
  if (!(amt > 0)) { showErr(err, 'Введи сумму больше нуля, например 12,50'); $('#txAmount').focus(); return; }
  hideErr(err);
  const date = parseYmd($('#txDate').value) ? $('#txDate').value : today();
  state.tx.push({ id: uid(), type: tx.type, amount: round2(amt), cat: tx.cat, acc: tx.acc, date, note: $('#txNote').value.trim().slice(0, 80) });
  save();
  const d = parseYmd(date); ym = { y: d.getFullYear(), m: d.getMonth() };
  closeLayer($('#lyTx'));
  render();
  toast('Операция добавлена');
});

function deleteTx(id) {
  const i = state.tx.findIndex(t => t.id === id);
  if (i < 0) return;
  const [t] = state.tx.splice(i, 1);
  save(); render();
  toast('Операция удалена', 'Отменить', () => { state.tx.splice(Math.min(i, state.tx.length), 0, t); save(); render(); });
}
$('#txList').addEventListener('click', e => {
  const b = e.target.closest('[data-del]');
  if (b) deleteTx(b.dataset.del);
});

/* ---------- Карты ---------- */
let editAcc = null, accColor = COLORS[0].bg;
function renderSwatches() {
  $('#accColors').innerHTML = COLORS.map(c =>
    `<button type="button" role="radio" class="sw" data-color="${c.bg}" style="--c:${c.bg};--fg:${c.fg}" aria-checked="${c.bg === accColor}" aria-label="${c.name}">${c.bg === accColor ? '✓' : ''}</button>`).join('');
}
function openAcc(id) {
  editAcc = id ? accById(id) : null;
  $('#accTitle').textContent = editAcc ? 'Изменить карту' : 'Новая карта';
  $('#accName').value = editAcc ? editAcc.name : '';
  $('#accLast4').value = editAcc ? editAcc.last4 : '';
  $('#accBal').value = editAcc ? String(editAcc.balance).replace('.', ',') : '';
  $$('#lyAcc .curAcc').forEach(c => { c.textContent = sym(); });
  accColor = editAcc ? editAcc.color : COLORS[state.accounts.length % COLORS.length].bg;
  ['#accNameErr', '#accLast4Err', '#accBalErr'].forEach(s => hideErr($(s)));
  $('#accDelete').hidden = !editAcc;
  renderSwatches();
  $('#accName').setAttribute('data-autofocus', '');
  openLayer($('#lyAcc'));
}
$('#accColors').addEventListener('click', e => {
  const b = e.target.closest('[data-color]');
  if (b) { accColor = b.dataset.color; renderSwatches(); }
});
$('#accLast4').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });
$('#accForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#accName').value.trim(), l4 = $('#accLast4').value.trim(), balRaw = $('#accBal').value.trim();
  let ok = true;
  hideErr($('#accNameErr')); hideErr($('#accLast4Err')); hideErr($('#accBalErr'));
  if (!name) { showErr($('#accNameErr'), 'Введи название карты'); ok = false; }
  if (l4 && !/^\d{4}$/.test(l4)) { showErr($('#accLast4Err'), 'Нужно ровно 4 цифры или оставь поле пустым'); ok = false; }
  const bal = balRaw === '' ? 0 : parseAmount(balRaw, true);
  if (!Number.isFinite(bal)) { showErr($('#accBalErr'), 'Введи число, например 250,00'); ok = false; }
  if (!ok) return;
  if (editAcc) Object.assign(editAcc, { name, last4: l4, balance: round2(bal), color: accColor });
  else state.accounts.push({ id: uid(), name, last4: l4, balance: round2(bal), color: accColor });
  save();
  closeLayer($('#lyAcc'));
  render();
});
$('#accDelete').addEventListener('click', async () => {
  const a = editAcc; if (!a) return;
  const n = state.tx.filter(t => t.acc === a.id).length;
  const yes = await confirmDlg(`Удалить «${a.name}»?`, n ? `Вместе с картой удалятся её операции (${n}). Это нельзя отменить.` : 'Это нельзя отменить.');
  if (!yes) return;
  state.accounts = state.accounts.filter(x => x.id !== a.id);
  state.tx = state.tx.filter(t => t.acc !== a.id);
  if (filterAcc === a.id) filterAcc = null;
  save();
  closeLayer($('#lyAcc'));
  render();
  toast('Карта удалена');
});

// Лента карт: тап — фильтр, долгое нажатие — редактирование
(() => {
  const strip = $('#strip');
  let timer = null, fired = false, sx = 0, sy = 0;
  const stop = () => { clearTimeout(timer); timer = null; };
  strip.addEventListener('pointerdown', e => {
    const c = e.target.closest('[data-acc]');
    if (!c || e.target.closest('[data-edit]')) return;
    fired = false; sx = e.clientX; sy = e.clientY;
    stop();
    timer = setTimeout(() => { fired = true; if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) {} openAcc(c.dataset.acc); }, 520);
  });
  strip.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) stop(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => strip.addEventListener(n, stop));
  strip.addEventListener('contextmenu', e => e.preventDefault());
  strip.addEventListener('click', e => {
    if (e.target.closest('[data-add-acc]')) { openAcc(null); return; }
    const ed = e.target.closest('[data-edit]');
    if (ed) { openAcc(ed.dataset.edit); return; }
    const c = e.target.closest('[data-acc]');
    if (!c) return;
    if (fired) { fired = false; return; }
    filterAcc = filterAcc === c.dataset.acc ? null : c.dataset.acc;
    render();
  });
  strip.addEventListener('keydown', e => {
    const c = e.target.closest('[data-acc]');
    if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); }
  });
})();
$('#filterReset').addEventListener('click', () => { filterAcc = null; render(); });

/* ---------- Месяц, FAB ---------- */
function shiftMonth(d) { const dt = new Date(ym.y, ym.m + d, 1); ym = { y: dt.getFullYear(), m: dt.getMonth() }; render(); }
$('#monthPrev').addEventListener('click', () => shiftMonth(-1));
$('#monthNext').addEventListener('click', () => shiftMonth(1));
$('#monthLabel').addEventListener('click', () => { const n = new Date(); ym = { y: n.getFullYear(), m: n.getMonth() }; render(); });
$('#fab').addEventListener('click', openTx);

/* ---------- ИИ-помощник ---------- */
function buildSystem() {
  const t = new Date(), lines = [];
  for (let i = 0; i < 14; i++) { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i); lines.push(`${ymd(d)} — ${WD[d.getDay()]}${i === 0 ? ' (сегодня)' : i === 1 ? ' (вчера)' : i === 2 ? ' (позавчера)' : ''}`); }
  return `Ты разбираешь записи о личных финансах для приложения учёта. Пользователь пишет по-русски, что потратил или получил. Верни ТОЛЬКО JSON без пояснений и без markdown:
{"items":[{"type":"expense"|"income","amount":число,"cat":"категория","acc":"название карты","date":"YYYY-MM-DD","note":"коротко"}]}
Правила:
- type: "expense" — расход, "income" — доход.
- amount: положительное число без валюты и пробелов (десятичная точка).
- cat расхода — одна из: ${CATS.expense.map(c => c[0]).join(', ')}. cat дохода — одна из: ${CATS.income.map(c => c[0]).join(', ')}. Если не подходит — «Другое».
- acc — название одной из карт: ${state.accounts.map(a => a.name).join(', ')}. Если карта не названа — "${state.accounts[0].name}".
- date: если даты нет — сегодня. «Вчера», «позавчера» и дни недели переводи в дату по таблице (день недели без уточнения — ближайший прошедший или сегодняшний):
${lines.join('\n')}
- note: 1–4 слова, что именно купили или за что получили.
- Одна фраза может содержать несколько операций. Если операций нет — {"items":[]}.`;
}

function aiError(e) {
  if (e && e.kind) return e.msg;
  if (e && e.name === 'AbortError') return 'ИИ слишком долго отвечает. Проверь интернет и попробуй ещё раз.';
  if (!navigator.onLine) return 'Нет подключения к интернету. Подключись и попробуй снова.';
  return 'Не удалось связаться с сервером ИИ. Проверь интернет и попробуй снова.';
}
async function askAI(text) {
  const key = getKey();
  if (!key) throw { kind: 1, msg: 'Сначала добавь API-ключ: шестерёнка → «API-ключ Anthropic».' };
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 30000);
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: buildSystem(), messages: [{ role: 'user', content: text }] })
    });
  } finally { clearTimeout(to); }
  if (!res.ok) {
    let m = ''; try { m = ((await res.json()).error || {}).message || ''; } catch (_) {}
    if (res.status === 401 || res.status === 403) throw { kind: 1, msg: 'Неверный API-ключ. Проверь его в настройках (шестерёнка).' };
    if (res.status === 429) throw { kind: 1, msg: 'Слишком много запросов или исчерпан лимит. Подожди минуту и повтори.' };
    if (res.status === 400 && /credit|balance/i.test(m)) throw { kind: 1, msg: 'На счёте Anthropic не хватает средств. Пополни баланс в консоли Anthropic.' };
    if (res.status >= 500) throw { kind: 1, msg: 'Сервис ИИ сейчас перегружен. Попробуй через минуту.' };
    throw { kind: 1, msg: `Запрос не удался (код ${res.status}). Попробуй ещё раз.` };
  }
  const data = await res.json();
  const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return parseItems(out);
}
function parseItems(out) {
  const a = out.indexOf('{'), b = out.lastIndexOf('}');
  let obj;
  try { obj = JSON.parse(out.slice(a, b + 1)); } catch (e) { throw { kind: 1, msg: 'Не получилось разобрать ответ ИИ. Переформулируй фразу и попробуй снова.' }; }
  const items = Array.isArray(obj && obj.items) ? obj.items : [];
  return normalizeItems(items);
}
function normalizeItems(items) {
  const res = [];
  for (const it of items.slice(0, 30)) {
    if (!it || (it.type !== 'expense' && it.type !== 'income')) continue;
    const amount = parseAmount(it.amount);
    if (!(amount > 0)) continue;
    const names = CATS[it.type].map(c => c[0]);
    const cat = names.includes(it.cat) ? it.cat : 'Другое';
    const q = String(it.acc ?? '').trim().toLowerCase();
    const acc = (q && state.accounts.find(a => a.name.toLowerCase() === q)) ||
      (q && state.accounts.find(a => a.name.toLowerCase().includes(q) || (q.length >= 3 && q.includes(a.name.toLowerCase())))) ||
      (q && /^\d{4}$/.test(q) && state.accounts.find(a => a.last4 === q)) || state.accounts[0];
    res.push({ type: it.type, amount: round2(amount), cat, acc: acc.id, date: parseYmd(it.date) ? it.date : today(), note: typeof it.note === 'string' ? it.note.trim().slice(0, 80) : '' });
  }
  return res;
}

$('#aiGo').addEventListener('click', async () => {
  const err = $('#aiErr'), btn = $('#aiGo'), text = $('#aiText').value.trim();
  hideErr(err);
  if (!text) { showErr(err, 'Напиши, что потратила или получила — например: «вчера кофе 6 руб.»'); $('#aiText').focus(); return; }
  if (!state.accounts.length) { showErr(err, 'Сначала добавь карту или счёт — туда помощник запишет операции.'); return; }
  btn.disabled = true; btn.classList.add('loading'); $('.aiGoText', btn).textContent = 'Думаю…';
  try {
    const items = await askAI(text);
    if (!items.length) { showErr(err, 'Не нашла в тексте операций. Укажи, что и на какую сумму.'); return; }
    draft = items; renderDraft(); openLayer($('#lyDraft'));
  } catch (e) { showErr(err, aiError(e)); }
  finally { btn.disabled = false; btn.classList.remove('loading'); $('.aiGoText', btn).textContent = 'Разобрать'; }
});

function renderDraft() {
  $('#draftList').innerHTML = draft.map((d, i) => {
    const ci = catInfo(d.type, d.cat), a = accById(d.acc);
    return `<div class="dr"><div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${ci[1]}</div>
      <div class="dr-b"><div class="dr-t">${esc(d.note || d.cat)}</div><div class="dr-s">${esc(d.cat)} · ${esc(a.name)} · ${esc(dayTitle(d.date).replace(/^(Сегодня|Вчера), /, '$1, '))}</div></div>
      <div class="tx-a ${d.type === 'income' ? 'inc' : 'exp'}">${esc(signed(d.amount, d.type))}</div>
      <button class="tx-del" data-drop="${i}" aria-label="Убрать строку: ${esc(d.note || d.cat)}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
  }).join('');
  const inc = round2(draft.filter(d => d.type === 'income').reduce((s, d) => s + d.amount, 0));
  const exp = round2(draft.filter(d => d.type === 'expense').reduce((s, d) => s + d.amount, 0));
  $('#draftSum').innerHTML = `<span>Записей: ${draft.length}</span><span class="i">Доход +${esc(money(inc))}</span><span class="e">Расход −${esc(money(exp))}</span>`;
  $('#draftOk').disabled = !draft.length;
}
$('#draftList').addEventListener('click', e => {
  const b = e.target.closest('[data-drop]');
  if (!b) return;
  draft.splice(Number(b.dataset.drop), 1);
  if (!draft.length) { closeLayer($('#lyDraft')); return; }
  renderDraft();
});
$('#draftCancel').addEventListener('click', () => closeLayer($('#lyDraft')));
$('#draftOk').addEventListener('click', () => {
  if (!draft.length) return;
  const n = draft.length;
  const latest = draft.map(d => d.date).sort().pop(), ld = parseYmd(latest);
  draft.forEach(d => state.tx.push({ id: uid(), ...d }));
  draft = [];
  save();
  $('#aiText').value = '';
  ym = { y: ld.getFullYear(), m: ld.getMonth() };
  closeLayer($('#lyDraft'));
  render();
  toast(`Добавлено записей: ${n}`);
});

/* ---------- Настройки ---------- */
function renderSettings() {
  $('#setCur').innerHTML = Object.keys(CURRENCIES).map(c =>
    `<button type="button" role="radio" class="chip" data-cur="${c}" aria-checked="${c === state.currency}">${c} ${CURRENCIES[c]}</button>`).join('');
}
$('#btnSettings').addEventListener('click', () => {
  renderSettings();
  $('#setKey').value = getKey(); $('#setKey').type = 'password'; $('#keyShow').textContent = 'Показать'; $('#keyShow').setAttribute('aria-pressed', 'false');
  $('#bkText').value = ''; hideErr($('#bkErr'));
  openLayer($('#lySet'));
});
$('#setCur').addEventListener('click', e => {
  const b = e.target.closest('[data-cur]');
  if (!b) return;
  state.currency = b.dataset.cur; save(); renderSettings(); render();
});
$('#keyShow').addEventListener('click', () => {
  const i = $('#setKey'), show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  $('#keyShow').textContent = show ? 'Скрыть' : 'Показать';
  $('#keyShow').setAttribute('aria-pressed', String(show));
});
$('#keySave').addEventListener('click', () => {
  const v = $('#setKey').value.trim();
  toast(setKey(v) ? (v ? 'Ключ сохранён' : 'Ключ удалён') : 'Не удалось сохранить ключ');
});
$('#bkCopy').addEventListener('click', async () => {
  const json = JSON.stringify(state);
  let ok = false;
  try { await navigator.clipboard.writeText(json); ok = true; } catch (_) {}
  if (!ok) {
    const ta = $('#bkText'); ta.value = json; ta.focus(); ta.select();
    try { ok = document.execCommand('copy'); } catch (_) {}
    if (!ok) { toast('Скопируй текст из поля ниже вручную'); return; }
    ta.value = '';
  }
  toast('Копия в буфере обмена');
});
$('#bkRestore').addEventListener('click', async () => {
  const err = $('#bkErr'); hideErr(err);
  const raw = $('#bkText').value.trim();
  if (!raw) { showErr(err, 'Вставь в поле текст резервной копии.'); return; }
  let s = null;
  try { s = sanitize(JSON.parse(raw)); } catch (_) {}
  if (!s) { showErr(err, 'Это не похоже на резервную копию «Мои деньги». Скопируй её заново целиком.'); return; }
  const yes = await confirmDlg('Заменить все данные?', `Текущие данные будут заменены копией: карт — ${s.accounts.length}, операций — ${s.tx.length}.`, 'Заменить');
  if (!yes) return;
  state = s; filterAcc = null; save();
  closeLayer($('#lySet'));
  render();
  toast('Данные восстановлены');
});

/* ---------- Старт ---------- */
load();
render();
if (history.state && history.state.layer) history.replaceState(null, '');
})();
