(() => {
'use strict';

/* ---------- Константы ---------- */
const STORE_KEY = 'moidengi_v1';
const KEY_KEY = 'moidengi_apikey';
const HIDE_KEY = 'moidengi_hide';
const CURRENCIES = { BYN: 'Br', RUB: '₽', USD: '$', EUR: '€' };
const MODEL = 'claude-haiku-5-5';

const CATS = {
  expense: [
    ['Продукты', 'cart', '#3B82F6'], ['Кафе', 'cup', '#F59E0B'], ['Транспорт', 'bus', '#14B8A6'],
    ['Дом', 'sofa', '#8B5CF6'], ['Здоровье', 'heart', '#EF4444'], ['Одежда', 'shirt', '#EC4899'],
    ['Связь', 'phone', '#06B6D4'], ['Подписки', 'repeat', '#6366F1'], ['Подарки', 'gift', '#F97316'],
    ['Развлечения', 'ticket', '#EAB308'], ['Другое', 'grid', '#94A3B8']
  ],
  income: [
    ['Зарплата', 'cash', '#1F8A5B'], ['Подработка', 'case', '#14B8A6'], ['Подарок', 'gift', '#F97316'],
    ['Возврат', 'undo', '#3B82F6'], ['Другое', 'grid', '#94A3B8']
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
const MONTHS_P = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WD_S = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const IC = {
  home: '<path class="a" d="M5 11.2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7.8L12 5.6z"/><path d="M12 3.1 2.9 10.9a1.1 1.1 0 0 0 1.4 1.7L12 6l7.7 6.6a1.1 1.1 0 0 0 1.4-1.7z"/><path d="M9.6 21v-4.2a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2V21z"/>',
  list: '<rect x="3.5" y="5" width="17" height="3.4" rx="1.7"/><rect class="a" x="3.5" y="10.3" width="11" height="3.4" rx="1.7"/><rect x="3.5" y="15.6" width="14" height="3.4" rx="1.7"/>',
  chart: '<rect class="a" x="3.8" y="12" width="4.4" height="8" rx="1.6"/><rect x="9.8" y="4" width="4.4" height="16" rx="1.6"/><rect class="a" x="15.8" y="8.5" width="4.4" height="11.5" rx="1.6"/>',
  spark: '<circle class="a" cx="12" cy="12" r="9.6"/><path d="M12 5.6l1.6 4.2 4.2 1.6-4.2 1.6L12 17.2l-1.6-4.2L6.2 11.4l4.2-1.6z"/>',
  plus: '<rect x="10.8" y="4.5" width="2.4" height="15" rx="1.2"/><rect x="4.5" y="10.8" width="15" height="2.4" rx="1.2"/>',
  mic: '<rect x="8.8" y="2.8" width="6.4" height="12" rx="3.2"/><path class="a" d="M4.8 11h2.2a5 5 0 0 0 10 0h2.2a7.2 7.2 0 0 1-6.1 7.1V21h-2.4v-2.9A7.2 7.2 0 0 1 4.8 11z"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="3"/>',
  gear: '<rect class="a" x="3" y="6" width="18" height="2.4" rx="1.2"/><circle cx="8.5" cy="7.2" r="3.1"/><rect class="a" x="3" y="15.6" width="18" height="2.4" rx="1.2"/><circle cx="15.5" cy="16.8" r="3.1"/>',
  eye: '<path class="a" d="M12 5c5 0 8.6 4.1 9.7 6.2a1.6 1.6 0 0 1 0 1.6C20.6 14.9 17 19 12 19S3.4 14.9 2.3 12.8a1.6 1.6 0 0 1 0-1.6C3.4 9.1 7 5 12 5z"/><circle cx="12" cy="12" r="3.3"/>',
  eyeoff: '<path class="a" d="M12 5c5 0 8.6 4.1 9.7 6.2a1.6 1.6 0 0 1 0 1.6C20.6 14.9 17 19 12 19S3.4 14.9 2.3 12.8a1.6 1.6 0 0 1 0-1.6C3.4 9.1 7 5 12 5z"/><circle cx="12" cy="12" r="3.3"/><path class="s" d="M4.5 4.5l15 15" style="stroke-width:2.6"/>',
  down: '<path d="M12 20.5l-7.2-7.6h4.7V4h5v8.9h4.7z"/>',
  up: '<path d="M12 3.5l7.2 7.6h-4.7V20h-5v-8.9H4.8z"/>',
  close: '<path class="s" d="M6.5 6.5l11 11M17.5 6.5l-11 11" style="stroke-width:2.4"/>',
  search: '<circle class="a" cx="10.5" cy="10.5" r="6.5"/><circle class="s" cx="10.5" cy="10.5" r="6.5"/><path class="s" d="M15.5 15.5 20 20"/>',
  trash: '<path class="a" d="M6 8.4h12l-.9 10.7a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8z"/><path d="M4 6.4a1 1 0 0 1 1-1h3.4l.7-1.4h5.8l.7 1.4H19a1 1 0 0 1 0 2H5a1 1 0 0 1-1-1z"/>',
  left: '<path class="s" d="M14.5 5.5 8 12l6.5 6.5" style="stroke-width:2.6"/>',
  right: '<path class="s" d="M9.5 5.5 16 12l-6.5 6.5" style="stroke-width:2.6"/>',
  check: '<path class="s" d="M5.5 12.5l4.2 4.2L18.5 8" style="stroke-width:2.8"/>',
  dots: '<circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/>',
  /* категории */
  cart: '<path class="a" d="M5.6 8.2h14a1 1 0 0 1 1 1.25l-1.5 6a2 2 0 0 1-1.95 1.5H9.1a2 2 0 0 1-1.95-1.55z"/><path class="s" d="M2.8 4.2h2.1l1.5 10.2"/><circle cx="9.4" cy="19.7" r="1.7"/><circle cx="16.6" cy="19.7" r="1.7"/>',
  cup: '<path d="M4.2 9.5h11.6v5.3A5.2 5.2 0 0 1 10.6 20H9.4a5.2 5.2 0 0 1-5.2-5.2z"/><path class="s" d="M15.8 11h1.2a2.6 2.6 0 0 1 0 5.2h-1.2"/><path class="s a" d="M8 3.2v3M12 3.2v3"/>',
  bus: '<path fill-rule="evenodd" d="M5 5.5A3.2 3.2 0 0 1 8.2 2.3h7.6A3.2 3.2 0 0 1 19 5.5V16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM7.6 5.4v5h8.8v-5zM7.4 14.2a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0zm7 0a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0z"/><rect x="5.8" y="18.6" width="3" height="2.6" rx="1.1"/><rect x="15.2" y="18.6" width="3" height="2.6" rx="1.1"/>',
  sofa: '<path class="a" d="M6 8.2A3 3 0 0 1 9 5.2h6a3 3 0 0 1 3 3V12H6z"/><path d="M3 12.8a2 2 0 0 1 4 0V14h10v-1.2a2 2 0 0 1 4 0V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/><rect x="5" y="19.4" width="1.8" height="2" rx=".9"/><rect x="17.2" y="19.4" width="1.8" height="2" rx=".9"/>',
  heart: '<path fill-rule="evenodd" d="M12 20.6S3 15.2 3 9A4.9 4.9 0 0 1 12 6.4 4.9 4.9 0 0 1 21 9c0 6.2-9 11.6-9 11.6zM11 9.6v1.9H9.1v2H11v1.9h2v-1.9h1.9v-2H13V9.6z"/>',
  shirt: '<path d="M8.6 3.4 3 6.1l1.9 4.6 2.6-1V20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9.7l2.6 1L21 6.1l-5.6-2.7a3.5 3.5 0 0 1-6.8 0z"/>',
  phone: '<path fill-rule="evenodd" d="M9.8 2.5h4.4a2.8 2.8 0 0 1 2.8 2.8v13.4a2.8 2.8 0 0 1-2.8 2.8H9.8A2.8 2.8 0 0 1 7 18.7V5.3a2.8 2.8 0 0 1 2.8-2.8zM9.2 5.2v10.4h5.6V5.2zm2.8 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>',
  repeat: '<path class="s" d="M5 11.5a7 7 0 0 1 11.7-4.7M19 12.5a7 7 0 0 1-11.7 4.7"/><path d="M18.6 3.2v4.8h-4.8zM5.4 20.8V16h4.8z"/>',
  gift: '<path d="M4 11h6.8v10H6.2A2.2 2.2 0 0 1 4 18.8zM13.2 11H20v7.8a2.2 2.2 0 0 1-2.2 2.2h-4.6z"/><path class="a" d="M3 7.6A1.6 1.6 0 0 1 4.6 6h6.2v3.6H3zM13.2 6h6.2A1.6 1.6 0 0 1 21 7.6v2H13.2z"/><path class="s" d="M12 6C10.4 2.8 7.2 3.2 7.6 5.2c.3 1.2 2.6.8 4.4.8zM12 6c1.6-3.2 4.8-2.8 4.4-.8-.3 1.2-2.6.8-4.4.8z" style="stroke-width:1.8"/>',
  ticket: '<path fill-rule="evenodd" d="M3 8.2A2.2 2.2 0 0 1 5.2 6h13.6A2.2 2.2 0 0 1 21 8.2v1.9a1.9 1.9 0 0 1 0 3.8v1.9a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 15.8v-1.9a1.9 1.9 0 0 1 0-3.8zM10.2 9v6l5-3z"/>',
  grid: '<rect x="3.8" y="3.8" width="7.4" height="7.4" rx="2.2"/><rect class="a" x="12.8" y="3.8" width="7.4" height="7.4" rx="2.2"/><rect class="a" x="3.8" y="12.8" width="7.4" height="7.4" rx="2.2"/><rect x="12.8" y="12.8" width="7.4" height="7.4" rx="2.2"/>',
  cash: '<path fill-rule="evenodd" d="M5.2 5.5h13.6A2.2 2.2 0 0 1 21 7.7v8.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 16.3V7.7a2.2 2.2 0 0 1 2.2-2.2zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zM5.9 11.1a1 1 0 1 0 0 1.8 1 1 0 0 0 0-1.8zM18.1 11.1a1 1 0 1 0 0 1.8 1 1 0 0 0 0-1.8z"/>',
  case: '<path fill-rule="evenodd" d="M3 9.2A2.2 2.2 0 0 1 5.2 7h13.6A2.2 2.2 0 0 1 21 9.2v8.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 17.8zM10.6 12v2h2.8v-2z"/><path class="s" d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"/>',
  undo: '<path class="s" d="M8.5 5.5 4 10l4.5 4.5"/><path class="s" d="M4.6 10h9.4a5.2 5.2 0 0 1 0 10.4H10.5"/>'
};
const icon = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const cIcon = ci => icon(ci[1]);
function paintIcons(root = document) { $$('i[data-ic]', root).forEach(i => { i.innerHTML = icon(i.dataset.ic); }); }

/* ---------- Утилиты ---------- */
function $(s, r = document) { return r.querySelector(s); }
function $$(s, r = document) { return [...r.querySelectorAll(s)]; }
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
const buzz = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };

function parseAmount(v, allowNeg) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const s = String(v ?? '').trim().replace(/[\s ]/g, '').replace(',', '.');
  const re = allowNeg ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/;
  return re.test(s) ? Number(s) : NaN;
}
function fmt(n) {
  const sign = n < -0.004 ? '−' : '';
  return sign + Math.abs(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const sym = () => CURRENCIES[state.currency];
const money = n => `${fmt(n)} ${sym()}`;
const signed = (n, type) => (type === 'income' ? '+' : '−') + fmt(n) + ' ' + sym();
const MASK = '••••••';
const moneyH = n => hide ? MASK : `${esc(fmt(n))}<small>${esc(sym())}</small>`;
const maskT = s => (hide ? MASK : s);

/* ---------- Хранилище ---------- */
let state = { currency: 'BYN', accounts: [], tx: [] };
let hide = false;
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const s = sanitize(JSON.parse(raw)); if (s) state = s; }
    hide = localStorage.getItem(HIDE_KEY) === '1';
  } catch (e) { /* первый запуск */ }
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
let filterAcc = null, tab = 'home', opsType = 'all', opsQuery = '', statType = 'expense';
let draft = [];
const catInfo = (type, name) => CATS[type].find(c => c[0] === name) || CATS[type][CATS[type].length - 1];
const accById = id => state.accounts.find(a => a.id === id);
const colorOf = hex => COLORS.find(c => c.bg === hex) || COLORS[0];
const monthKey = (y = ym.y, m = ym.m) => `${y}-${pad(m + 1)}`;

function accBalance(a) {
  let b = a.balance;
  for (const t of state.tx) if (t.acc === a.id) b += t.type === 'income' ? t.amount : -t.amount;
  return round2(b);
}
function monthTx(y = ym.y, m = ym.m) {
  const mk = monthKey(y, m), fa = filterAcc && accById(filterAcc);
  return state.tx.filter(t => t.date.startsWith(mk) && (!fa || t.acc === fa.id));
}
const sumOf = (list, type) => round2(list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0));

/* ---------- Отрисовка ---------- */
function setNum(el, html, value) {
  const prev = el._v;
  el._v = value;
  if (hide || prev === undefined || prev === value || matchMedia('(prefers-reduced-motion:reduce)').matches) { el.innerHTML = html(value); return; }
  const t0 = performance.now(), dur = 450;
  cancelAnimationFrame(el._raf);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.innerHTML = html(prev + (value - prev) * e);
    if (k < 1) el._raf = requestAnimationFrame(step); else el.innerHTML = html(value);
  };
  el._raf = requestAnimationFrame(step);
}

function render() {
  if (filterAcc && !accById(filterAcc)) filterAcc = null;
  const d = new Date();
  const hr = d.getHours();
  $('#hello').textContent = hr < 5 ? 'Доброй ночи' : hr < 12 ? 'Доброе утро' : hr < 18 ? 'Добрый день' : 'Добрый вечер';
  const wd = WD[d.getDay()];
  $('#todayLabel').textContent = `${wd[0].toUpperCase()}${wd.slice(1)}, ${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  renderMonthBars();
  renderHome();
  if (tab === 'ops') renderOps();
  if (tab === 'stats') renderStats();
}

function renderMonthBars() {
  const html = `<div class="monthbar"><button class="mb" data-mshift="-1" aria-label="Предыдущий месяц">${icon('left')}</button><button class="mlabel" data-mnow aria-label="Показан ${MONTHS[ym.m]} ${ym.y}. Нажми, чтобы вернуться к текущему месяцу">${MONTHS[ym.m]} ${ym.y}</button><button class="mb" data-mshift="1" aria-label="Следующий месяц">${icon('right')}</button></div>`;
  $$('.monthbar-slot').forEach(s => { s.innerHTML = html; });
}

function renderHome() {
  const fa = filterAcc && accById(filterAcc);
  const total = fa ? accBalance(fa) : round2(state.accounts.reduce((s, a) => s + accBalance(a), 0));
  $('#heroLabel').textContent = fa ? `На карте «${fa.name}»` : 'Всего денег';
  setNum($('#heroSum'), moneyH, total);
  $('#filterReset').hidden = !fa;
  $('#btnEye').innerHTML = icon(hide ? 'eyeoff' : 'eye');
  $('#btnEye').setAttribute('aria-pressed', String(hide));
  $('#btnEye').setAttribute('aria-label', hide ? 'Показать суммы' : 'Скрыть суммы');

  const list = monthTx();
  const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense');
  $('#sumInc').innerHTML = hide ? MASK : (inc > 0 ? '+' : '') + moneyH(inc);
  $('#sumExp').innerHTML = hide ? MASK : (exp > 0 ? '−' : '') + moneyH(exp);

  renderStrip();
  const recent = list.slice().sort(cmpTx).slice(0, 5);
  $('#recentList').innerHTML = recent.length
    ? `<div class="recent">${recent.map(txRow).join('')}</div>`
    : `<div class="empty"><span class="big" aria-hidden="true">${icon('list')}</span><b>Здесь будут твои траты и доходы</b>Добавь первую — кнопка «+» внизу</div>`;
}

const cmpTx = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

function renderStrip() {
  const el = $('#strip');
  $('#stripHint').hidden = state.accounts.length < 2;
  if (!state.accounts.length) {
    el.innerHTML = `<button class="acc-add big" data-add-acc>${icon('plus')}<span>Добавить первую карту или счёт</span></button>`;
    return;
  }
  el.innerHTML = state.accounts.map(a => {
    const c = colorOf(a.color), sel = a.id === filterAcc;
    return `<div class="acc ${sel ? 'sel' : ''}" data-acc="${esc(a.id)}" role="button" tabindex="0" aria-pressed="${sel}" aria-label="${esc(a.name)}, на карте ${esc(hide ? 'сумма скрыта' : money(accBalance(a)))}. Нажми, чтобы увидеть только её операции">
      <span class="acc-dot" style="background:${c.bg}"></span>
      <span class="acc-txt"><span class="acc-name">${esc(a.name)}${a.last4 ? `<em>·${esc(a.last4)}</em>` : ''}</span><span class="acc-bal">${moneyH(accBalance(a))}</span></span>
      <button class="acc-more" data-edit="${esc(a.id)}" aria-label="Изменить карту ${esc(a.name)}">${icon('dots')}</button>
    </div>`;
  }).join('') + `<button class="acc-add" data-add-acc aria-label="Добавить карту">${icon('plus')}</button>`;
}

function dayTitle(s) {
  const d = parseYmd(s), t = parseYmd(today());
  const diff = Math.round((t - d) / 864e5);
  const base = `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  if (diff === 0) return `Сегодня, ${base}`;
  if (diff === 1) return `Вчера, ${base}`;
  return `${WD_S[d.getDay()]}, ${base}`;
}

function txRow(t) {
  const ci = catInfo(t.type, t.cat), a = accById(t.acc);
  return `<div class="swipe" data-id="${esc(t.id)}"><div class="swipe-bg" aria-hidden="true">${icon('trash')}</div>
    <div class="tx" role="button" tabindex="0" data-tx="${esc(t.id)}" aria-label="${esc(t.note || t.cat)}, ${esc(signed(t.amount, t.type))}. Нажми, чтобы изменить или удалить">
      <div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</div>
      <div class="tx-body"><div class="tx-t">${esc(t.note || t.cat)}</div><div class="tx-s">${esc(t.cat)} · ${esc(a ? a.name : '—')}</div></div>
      <div class="tx-a ${t.type === 'income' ? 'inc' : 'exp'}">${esc(signed(t.amount, t.type))}</div>
    </div></div>`;
}

function renderOps() {
  const fa = filterAcc && accById(filterAcc);
  $('#opsFilterChip').innerHTML = fa ? `<span class="fchip">Карта: ${esc(fa.name)}<button id="chipX" aria-label="Сбросить фильтр по карте">${icon('close')}</button></span>` : '';
  $$('#s-ops [data-ft]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ft === opsType)));
  const q = opsQuery.trim().toLowerCase();
  const list = monthTx().filter(t => (opsType === 'all' || t.type === opsType) &&
    (!q || t.cat.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)));
  const el = $('#opsList');
  if (!list.length) {
    el.innerHTML = `<div class="empty"><span class="big" aria-hidden="true">${icon(q ? 'search' : 'list')}</span><b>${q ? 'Ничего не нашлось' : `В ${MONTHS_P[ym.m]} пока тихо`}</b>${q ? 'Попробуй другое слово или часть названия' : 'Добавь операцию — и она появится здесь'}</div>`;
    return;
  }
  const days = {};
  list.forEach(t => (days[t.date] = days[t.date] || []).push(t));
  el.innerHTML = Object.keys(days).sort().reverse().map(d => {
    const net = round2(days[d].reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
    return `<div class="day"><div class="day-h"><span>${esc(dayTitle(d))}</span><span>${net > 0 ? '+' : ''}${esc(fmt(net))}</span></div>${days[d].slice().reverse().map(txRow).join('')}</div>`;
  }).join('');
}

function renderStats() {
  $$('#s-stats [data-st]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.st === statType)));
  const list = monthTx().filter(t => t.type === statType);
  const total = sumOf(list, statType);
  const word = statType === 'expense' ? 'расходов' : 'доходов';
  const card = $('#catCard'), insEl = $('#insights'), dayCard = $('#dayCard'), catList = $('#catList');
  if (!list.length) {
    card.innerHTML = `<div class="empty" style="border:0"><span class="big" aria-hidden="true">${icon('chart')}</span><b>${statType === 'expense' ? 'Трат' : 'Доходов'} в ${MONTHS_P[ym.m]} нет</b>Когда появятся — здесь будет разбивка по категориям</div>`;
    insEl.innerHTML = ''; dayCard.hidden = true; catList.hidden = true;
    return;
  }
  dayCard.hidden = false; catList.hidden = false;
  const by = {};
  list.forEach(t => { by[t.cat] = round2((by[t.cat] || 0) + t.amount); });
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const R = 56, C = 2 * Math.PI * R;
  let off = 0;
  const segs = rows.map(([name, sum]) => {
    const frac = sum / total, len = Math.max(frac * C - (rows.length > 1 ? 3 : 0), 0.5);
    const s = `<circle cx="75" cy="75" r="${R}" fill="none" stroke="${catInfo(statType, name)[2]}" stroke-width="20" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"/>`;
    off += frac * C;
    return s;
  }).join('');
  card.innerHTML = `<div class="cat-wrap">
      <div class="donut" role="img" aria-label="Всего ${word} за месяц: ${esc(hide ? 'скрыто' : money(total))}">
        <svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="${R}" fill="none" stroke="var(--field)" stroke-width="20"/>${segs}</svg>
        <div class="donut-c"><b>${esc(maskT(fmt(total)))}</b><span>${esc(sym())} всего</span></div>
      </div>
      <div class="top-cat">${statType === 'expense' ? 'Больше всего ушло на' : 'Главный источник'}<b>${esc(rows[0][0])}</b>${Math.round(rows[0][1] / total * 100)}% ${word}</div>
    </div>`;

  // Сравнение, среднее, максимум
  const pm = new Date(ym.y, ym.m - 1, 1);
  const prev = sumOf(monthTx(pm.getFullYear(), pm.getMonth()).filter(t => t.type === statType), statType);
  const isCur = ym.y === now0.getFullYear() && ym.m === now0.getMonth();
  const dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const daysN = isCur ? now0.getDate() : dim;
  const big = list.slice().sort((a, b) => b.amount - a.amount)[0];
  let cmp = '';
  if (prev > 0) {
    const pct = Math.round((total - prev) / prev * 100);
    const better = statType === 'expense' ? pct <= 0 : pct >= 0;
    cmp = `<div class="wide"><small>Сравнение с ${MONTHS[pm.getMonth()].toLowerCase().replace(/ь$/, 'я').replace(/т$/, 'та').replace(/й$/, 'я')}</small><b class="${better ? 'good' : 'bad'}">${pct === 0 ? `Столько же, сколько в ${MONTHS_P[pm.getMonth()]}` : `На ${Math.abs(pct)}% ${pct < 0 ? 'меньше' : 'больше'}, чем в ${MONTHS_P[pm.getMonth()]}`}</b></div>`;
  }
  insEl.innerHTML = `<div class="ins">${cmp}<div><small>В среднем за день</small><b>${esc(maskT(money(round2(total / daysN))))}</b></div><div><small>${statType === 'expense' ? 'Самая крупная трата' : 'Самый крупный доход'}</small><b>${esc(maskT(money(big.amount)))}</b></div></div>`;

  // Столбики по дням
  const perDay = Array(dim).fill(0);
  list.forEach(t => { perDay[Number(t.date.slice(8)) - 1] += t.amount; });
  const mx = Math.max(...perDay), W = 300, H = 90, bw = W / dim;
  const bars = perDay.map((v, i) => {
    const h = v > 0 ? Math.max(4, v / mx * H) : 2, isT = isCur && i + 1 === now0.getDate();
    return `<rect x="${(i * bw + bw * 0.14).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${(bw * 0.72).toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3, bw * 0.3).toFixed(1)}" fill="${v > 0 ? (statType === 'expense' ? 'var(--exp)' : 'var(--inc)') : 'var(--line)'}" opacity="${v > 0 ? (isT ? 1 : .8) : 1}"/>`;
  }).join('');
  const labels = [1, 8, 15, 22, dim].map(d => `<text x="${((d - 0.5) * bw).toFixed(1)}" y="${H + 16}" text-anchor="middle">${d}</text>`).join('');
  dayCard.innerHTML = `<h3>По дням</h3><svg class="days" viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="Столбики ${word} по дням месяца">${bars}${labels}</svg>`;

  catList.innerHTML = `<h3>По категориям</h3><ul class="cats">${rows.map(([name, sum]) => {
    const ci = catInfo(statType, name), pc = sum / total * 100;
    return `<li><div class="cat-top"><span class="dot" style="background:${ci[2]}"></span><span class="nm">${esc(name)}</span><span class="pc">${pc < 1 ? '<1' : Math.round(pc)}%</span><span class="am">${esc(maskT(fmt(sum)))}</span></div><div class="bar"><i style="--c:${ci[2]};width:${Math.max(pc, 2).toFixed(1)}%"></i></div></li>`;
  }).join('')}</ul>`;
}

/* ---------- Вкладки ---------- */
let tabPushed = false;
function showTab(name, fromPop) {
  tab = name;
  $$('.screen').forEach(s => { s.hidden = s.dataset.screen !== name; });
  $$('.nav-b').forEach(b => { if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (!fromPop) {
    if (name !== 'home' && !tabPushed) { history.pushState({ tab: 1 }, ''); tabPushed = true; }
    else if (name === 'home' && tabPushed) { ignorePops++; history.back(); tabPushed = false; }
  }
  window.scrollTo(0, 0);
  render();
}
$$('.nav-b').forEach(b => b.addEventListener('click', () => { buzz(8); showTab(b.dataset.tab); }));
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) showTab(g.dataset.go);
  const ms = e.target.closest('[data-mshift]');
  if (ms) { const dt = new Date(ym.y, ym.m + Number(ms.dataset.mshift), 1); ym = { y: dt.getFullYear(), m: dt.getMonth() }; render(); }
  if (e.target.closest('[data-mnow]')) { const n = new Date(); ym = { y: n.getFullYear(), m: n.getMonth() }; render(); }
});
$('#s-ops').addEventListener('click', e => {
  const f = e.target.closest('[data-ft]');
  if (f) { opsType = f.dataset.ft; renderOps(); }
  if (e.target.closest('#chipX')) { filterAcc = null; render(); }
});
$('#opsSearch').addEventListener('input', e => { opsQuery = e.target.value; renderOps(); });
$('#s-stats').addEventListener('click', e => {
  const f = e.target.closest('[data-st]');
  if (f) { statType = f.dataset.st; renderStats(); }
});
$('#btnEye').addEventListener('click', () => {
  hide = !hide;
  try { localStorage.setItem(HIDE_KEY, hide ? '1' : '0'); } catch (_) {}
  render();
});

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
  if (top) { top.hidden = true; if (top._onClose) { const f = top._onClose; top._onClose = null; f(); } return; }
  if (tabPushed) { tabPushed = false; showTab('home', true); }
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

/* ---------- Операция (добавление / правка) ---------- */
const tx = { type: 'expense', cat: 'Продукты', acc: null, editId: null };
function renderTxForm() {
  $$('#lyTx .seg-b').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === tx.type)));
  $('#txCur').textContent = sym();
  $('#txCats').innerHTML = CATS[tx.type].map(c =>
    `<button type="button" role="radio" class="cat-tile" data-cat="${esc(c[0])}" aria-checked="${c[0] === tx.cat}"><span class="ci" style="--c:${c[2]}" aria-hidden="true">${cIcon(c)}</span><span>${esc(c[0])}</span></button>`).join('');
  $('#txAccs').innerHTML = state.accounts.map(a =>
    `<button type="button" role="radio" class="chip" data-acc-pick="${esc(a.id)}" aria-checked="${a.id === tx.acc}"><span class="dot" style="background:${colorOf(a.color).bg}"></span>${esc(a.name)}${a.last4 ? ' ·' + esc(a.last4) : ''}</button>`).join('');
  syncDateChips();
}
function syncDateChips() {
  const v = $('#txDate').value, y = new Date(); y.setDate(y.getDate() - 1);
  $('#dToday').setAttribute('aria-checked', String(v === today()));
  $('#dYest').setAttribute('aria-checked', String(v === ymd(y)));
}
function openTx(id) {
  if (!state.accounts.length) { toast('Сначала добавь хотя бы одну карту'); openAcc(null); return; }
  const t = id && state.tx.find(x => x.id === id);
  tx.editId = t ? t.id : null;
  tx.type = t ? t.type : 'expense';
  tx.cat = t ? t.cat : CATS.expense[0][0];
  tx.acc = t ? t.acc : ((filterAcc && accById(filterAcc)) ? filterAcc : state.accounts[0].id);
  $('#txTitle').textContent = t ? 'Изменить операцию' : 'Новая операция';
  $('#txAmount').value = t ? String(t.amount).replace('.', ',') : '';
  $('#txNote').value = t ? t.note : '';
  $('#txDate').value = t ? t.date : today();
  $('#txDelete').hidden = !t;
  hideErr($('#txAmountErr'));
  renderTxForm();
  openLayer($('#lyTx'));
  if (t) $('#txAmount').removeAttribute('data-autofocus'); else $('#txAmount').setAttribute('data-autofocus', '');
}
$('#lyTx').addEventListener('click', e => {
  const t = e.target.closest('[data-type],[data-cat],[data-acc-pick]');
  if (!t) return;
  if (t.dataset.type) { tx.type = t.dataset.type; if (!CATS[tx.type].some(c => c[0] === tx.cat)) tx.cat = CATS[tx.type][0][0]; else if (tx.type === 'income' && tx.cat === 'Подарки') tx.cat = 'Подарок'; }
  if (t.dataset.cat) tx.cat = t.dataset.cat;
  if (t.dataset.accPick) tx.acc = t.dataset.accPick;
  buzz(6);
  renderTxForm();
});
$('#dToday').addEventListener('click', () => { $('#txDate').value = today(); syncDateChips(); });
$('#dYest').addEventListener('click', () => { const y = new Date(); y.setDate(y.getDate() - 1); $('#txDate').value = ymd(y); syncDateChips(); });
$('#txDate').addEventListener('input', syncDateChips);
$('#txForm').addEventListener('submit', e => {
  e.preventDefault();
  const amt = parseAmount($('#txAmount').value);
  const err = $('#txAmountErr');
  if (!(amt > 0)) { showErr(err, 'Введи сумму, например 12,50'); $('#txAmount').focus(); return; }
  hideErr(err);
  const date = parseYmd($('#txDate').value) ? $('#txDate').value : today();
  const rec = { type: tx.type, amount: round2(amt), cat: tx.cat, acc: tx.acc, date, note: $('#txNote').value.trim().slice(0, 80) };
  const ex = tx.editId && state.tx.find(t => t.id === tx.editId);
  if (ex) Object.assign(ex, rec); else state.tx.push({ id: uid(), ...rec });
  save();
  const d = parseYmd(date); ym = { y: d.getFullYear(), m: d.getMonth() };
  closeLayer($('#lyTx'));
  buzz(15);
  render();
  toast(ex ? 'Сохранено' : 'Готово, записано');
});
$('#txDelete').addEventListener('click', () => {
  const id = tx.editId;
  closeLayer($('#lyTx'));
  if (id) deleteTx(id);
});

function deleteTx(id) {
  const i = state.tx.findIndex(t => t.id === id);
  if (i < 0) { render(); return; }
  const [t] = state.tx.splice(i, 1);
  save(); render(); buzz(15);
  toast('Удалено', 'Вернуть', () => { state.tx.splice(Math.min(i, state.tx.length), 0, t); save(); render(); });
}

// Тап — правка, свайп влево — удаление
(() => {
  let sw = null, swiped = false;
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('.swipe .tx');
    if (!t) return;
    sw = { el: t, id: t.closest('.swipe').dataset.id, x: e.clientX, y: e.clientY, dx: 0, drag: false };
  });
  document.addEventListener('pointermove', e => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.drag) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) { sw.drag = true; sw.el.style.transition = 'none'; }
      else if (Math.abs(dy) > 10) { sw = null; return; }
    }
    if (sw.drag) { sw.dx = Math.min(0, Math.max(-170, dx)); sw.el.style.transform = `translateX(${sw.dx}px)`; }
  });
  const end = () => {
    if (!sw) return;
    const s = sw; sw = null;
    if (!s.drag) return;
    s.el.style.transition = '';
    swiped = true; setTimeout(() => { swiped = false; }, 80);
    if (s.dx < -96) { s.el.style.transform = 'translateX(-110%)'; setTimeout(() => deleteTx(s.id), 160); }
    else s.el.style.transform = '';
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  const open = e => { const t = e.target.closest('.swipe .tx'); if (t && !swiped) openTx(t.dataset.tx); };
  document.addEventListener('click', open);
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.swipe .tx')) { e.preventDefault(); openTx(e.target.dataset.tx); } });
})();

/* ---------- Карты ---------- */
let editAcc = null, accColor = COLORS[0].bg;
function renderSwatches() {
  $('#accColors').innerHTML = COLORS.map(c =>
    `<button type="button" role="radio" class="sw" data-color="${c.bg}" style="--c:${c.bg};--fg:${c.fg}" aria-checked="${c.bg === accColor}" aria-label="${c.name}">${c.bg === accColor ? icon('check') : ''}</button>`).join('');
  syncPreview();
}
function syncPreview() {
  const c = colorOf(accColor), p = $('#accPreview');
  $('.acc-dot', p).style.background = c.bg;
  const name = $('#accName').value.trim() || 'Название';
  const l4 = $('#accLast4').value.trim();
  $('#pvName').innerHTML = esc(name) + (/^\d{1,4}$/.test(l4) ? `<em>·${esc(l4)}</em>` : '');
  const b = parseAmount($('#accBal').value.trim() || '0', true);
  $('#pvBal').textContent = Number.isFinite(b) ? money(b) : '';
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
$('#accLast4').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); syncPreview(); });
$('#accName').addEventListener('input', syncPreview);
$('#accBal').addEventListener('input', syncPreview);
$('#accForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#accName').value.trim(), l4 = $('#accLast4').value.trim(), balRaw = $('#accBal').value.trim();
  let ok = true;
  hideErr($('#accNameErr')); hideErr($('#accLast4Err')); hideErr($('#accBalErr'));
  if (!name) { showErr($('#accNameErr'), 'Как назвать карту?'); ok = false; }
  if (l4 && !/^\d{4}$/.test(l4)) { showErr($('#accLast4Err'), 'Здесь ровно 4 цифры — или оставь пустым'); ok = false; }
  const bal = balRaw === '' ? 0 : parseAmount(balRaw, true);
  if (!Number.isFinite(bal)) { showErr($('#accBalErr'), 'Введи сумму, например 250,00'); ok = false; }
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
    timer = setTimeout(() => { fired = true; buzz(20); openAcc(c.dataset.acc); }, 520);
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
    buzz(8);
    render();
  });
  strip.addEventListener('keydown', e => {
    const c = e.target.closest('[data-acc]');
    if (c && e.target === c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); }
  });
})();
$('#filterReset').addEventListener('click', () => { filterAcc = null; render(); });
$('#fab').addEventListener('click', () => { buzz(10); openTx(); });

/* ---------- Помощник: ИИ ---------- */
function buildSystem() {
  const t = new Date(), lines = [];
  for (let i = 0; i < 14; i++) { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i); lines.push(`${ymd(d)} — ${WD[d.getDay()]}${i === 0 ? ' (сегодня)' : i === 1 ? ' (вчера)' : i === 2 ? ' (позавчера)' : ''}`); }
  return `Ты разбираешь записи о личных финансах для приложения учёта. Пользователь пишет или диктует по-русски, что потратил или получил (речь может быть без знаков препинания). Верни ТОЛЬКО JSON без пояснений и без markdown:
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
  if (e && e.name === 'AbortError') return 'Помощник слишком долго думает. Проверь интернет и попробуй ещё раз.';
  if (!navigator.onLine) return 'Нет интернета. Подключись к сети и попробуй ещё раз.';
  return 'Не получилось связаться с помощником. Проверь интернет и попробуй ещё раз.';
}
async function askAI(text) {
  const key = getKey();
  if (!key) throw { kind: 1, msg: 'Помощнику нужен ключ Anthropic. Вставь его в настройках — значок справа вверху на главной.' };
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
    if (res.status === 401 || res.status === 403) throw { kind: 1, msg: 'Ключ не подошёл. Проверь в настройках, что он вставлен целиком.' };
    if (res.status === 429) throw { kind: 1, msg: 'Слишком много запросов за короткое время. Подожди минутку и повтори.' };
    if (res.status === 400 && /credit|balance/i.test(m)) throw { kind: 1, msg: 'На счёте Anthropic закончились средства. Пополни его в консоли Anthropic.' };
    if (res.status >= 500) throw { kind: 1, msg: 'Помощник сейчас перегружен. Попробуй через минуту.' };
    throw { kind: 1, msg: `Что-то пошло не так (код ${res.status}). Попробуй ещё раз.` };
  }
  const data = await res.json();
  return parseItems((data.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
}
function parseItems(out) {
  const a = out.indexOf('{'), b = out.lastIndexOf('}');
  let obj;
  try { obj = JSON.parse(out.slice(a, b + 1)); } catch (e) { throw { kind: 1, msg: 'Не получилось понять ответ. Скажи то же самое другими словами.' }; }
  return normalizeItems(Array.isArray(obj && obj.items) ? obj.items : []);
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

async function runAI() {
  const err = $('#aiErr'), btn = $('#aiGo'), text = $('#aiText').value.trim();
  hideErr(err);
  if (!text) { showErr(err, 'Пока пусто. Скажи или напиши, например: «вчера кофе 6 рублей».'); $('#aiText').focus(); return; }
  if (!state.accounts.length) { showErr(err, 'Чтобы записывать, нужна хотя бы одна карта. Добавь её на главной.'); return; }
  btn.disabled = true; btn.classList.add('loading'); $('.aiGoText', btn).textContent = 'Думаю…';
  try {
    const items = await askAI(text);
    if (!items.length) { showErr(err, 'Не нашлось трат и доходов. Назови, что куплено или получено и на какую сумму.'); return; }
    draft = items; renderDraft(); openLayer($('#lyDraft'));
  } catch (e) { showErr(err, aiError(e)); }
  finally { btn.disabled = false; btn.classList.remove('loading'); $('.aiGoText', btn).textContent = 'Разобрать'; }
}
$('#aiGo').addEventListener('click', runAI);
$('#examples').addEventListener('click', e => {
  const c = e.target.closest('[data-ex]');
  if (c) { $('#aiText').value = c.dataset.ex; $('#aiText').focus(); }
});

function renderDraft() {
  $('#draftList').innerHTML = draft.map((d, i) => {
    const ci = catInfo(d.type, d.cat), a = accById(d.acc);
    return `<div class="dr"><div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</div>
      <div class="dr-b"><div class="dr-t">${esc(d.note || d.cat)}</div><div class="dr-s">${esc(d.cat)} · ${esc(a.name)} · ${esc(dayTitle(d.date))}</div></div>
      <div class="tx-a ${d.type === 'income' ? 'inc' : 'exp'}">${esc(signed(d.amount, d.type))}</div>
      <button class="dr-x" data-drop="${i}" aria-label="Убрать строку: ${esc(d.note || d.cat)}">${icon('close')}</button></div>`;
  }).join('');
  const inc = sumOf(draft, 'income'), exp = sumOf(draft, 'expense');
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
  buzz(20);
  showTab('home');
  toast(`Добавлено: ${n}`);
});

/* ---------- Голосовой ввод ---------- */
const voice = { on: false, base: '', native: null, web: null, text: '' };
const capPlugin = () => {
  const c = window.Capacitor;
  return c && c.isNativePlatform && c.isNativePlatform() ? (c.Plugins && c.Plugins.SpeechRecognition) : null;
};
function setMic(on, hint, live) {
  voice.on = on;
  const b = $('#micBtn');
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Остановить запись' : 'Голосовой ввод');
  const h = $('#micHint');
  h.textContent = hint;
  h.classList.toggle('live', !!live);
}
const HINT_IDLE = 'Нажми и говори: «вчера кофе 6 рублей»';
function voiceFail(msg) { setMic(false, msg); showErr($('#aiErr'), msg); }
function voiceText(t) {
  voice.text = t;
  $('#aiText').value = (voice.base ? voice.base + ' ' : '') + t;
}
async function finishVoice() {
  if (!voice.on) return;
  setMic(false, HINT_IDLE);
  if (voice.text.trim()) { buzz(15); runAI(); }
  else voiceFail('Не расслышалось. Поднеси телефон поближе и попробуй ещё раз.');
}
async function startVoice() {
  hideErr($('#aiErr'));
  voice.base = $('#aiText').value.trim(); voice.text = '';
  const P = capPlugin();
  if (P) {
    try {
      const av = await P.available();
      if (!av.available) return voiceFail('На этом телефоне нет распознавания речи. Нажми на поле ниже и продиктуй через значок микрофона на клавиатуре.');
      let perm = await P.checkPermissions();
      if (perm.speechRecognition !== 'granted') perm = await P.requestPermissions();
      if (perm.speechRecognition !== 'granted') return voiceFail('Нет доступа к микрофону. Разреши его в настройках телефона: Приложения → Мои деньги → Разрешения.');
      await P.removeAllListeners();
      await P.addListener('partialResults', d => { if (d && d.matches && d.matches[0]) voiceText(d.matches[0]); });
      await P.addListener('listeningState', d => { if (d && d.status === 'stopped') finishVoice(); });
      setMic(true, 'Слушаю. Когда договоришь — нажми ещё раз.', true);
      buzz(15);
      await P.start({ language: 'ru-RU', maxResults: 1, partialResults: true, popup: false });
    } catch (e) { voiceFail('Микрофон не включился. Попробуй ещё раз или продиктуй через клавиатуру.'); }
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return voiceFail('Голосовой ввод здесь не работает. Нажми на поле и продиктуй через микрофон на клавиатуре.');
  const r = new SR();
  r.lang = 'ru-RU'; r.interimResults = true; r.continuous = false;
  r.onresult = ev => { let s = ''; for (const x of ev.results) s += x[0].transcript; voiceText(s.trim()); };
  r.onerror = ev => {
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') voiceFail('Нет доступа к микрофону. Разреши его в настройках браузера.');
    else if (ev.error === 'no-speech') voiceFail('Не расслышалось. Попробуй ещё раз.');
    else if (ev.error === 'network') voiceFail('Для распознавания речи нужен интернет.');
    else if (ev.error !== 'aborted') voiceFail('Не получилось распознать речь. Попробуй ещё раз.');
    voice.web = null;
  };
  r.onend = () => { if (voice.web) { voice.web = null; finishVoice(); } };
  voice.web = r;
  setMic(true, 'Слушаю. Когда договоришь — нажми ещё раз.', true);
  buzz(15);
  try { r.start(); } catch (e) { voice.web = null; voiceFail('Микрофон не включился.'); }
}
async function stopVoice() {
  const P = capPlugin();
  if (P) { try { await P.stop(); } catch (_) {} setTimeout(() => { if (voice.on) finishVoice(); }, 600); }
  else if (voice.web) { try { voice.web.stop(); } catch (_) {} }
}
$('#micBtn').addEventListener('click', () => { voice.on ? stopVoice() : startVoice(); });
$('#homeMic').addEventListener('click', () => { showTab('ai'); setTimeout(startVoice, 120); });

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
  toast('Копия скопирована');
});
$('#bkRestore').addEventListener('click', async () => {
  const err = $('#bkErr'); hideErr(err);
  const raw = $('#bkText').value.trim();
  if (!raw) { showErr(err, 'Вставь в поле скопированный текст.'); return; }
  let s = null;
  try { s = sanitize(JSON.parse(raw)); } catch (_) {}
  if (!s) { showErr(err, 'Не похоже на копию из этого приложения. Скопируй её заново целиком.'); return; }
  const yes = await confirmDlg('Заменить все данные?', `Всё, что сейчас в приложении, заменится копией: карт — ${s.accounts.length}, операций — ${s.tx.length}.`, 'Заменить');
  if (!yes) return;
  state = s; filterAcc = null; save();
  closeLayer($('#lySet'));
  render();
  toast('Всё восстановлено');
});

/* ---------- Старт ---------- */
load();
paintIcons();
render();
if (history.state && (history.state.layer || history.state.tab)) history.replaceState(null, '');
})();
