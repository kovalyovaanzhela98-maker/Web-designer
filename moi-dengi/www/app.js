(() => {
'use strict';
const MD = window.MD;
const cloud = MD.cloud;

/* ---------- Константы ---------- */
const STORE_KEY = 'moidengi_v1';
const UID_KEY = 'moidengi_uid';
const HIDE_KEY = 'moidengi_hide';
const CURRENCIES = { BYN: 'Br', RUB: '₽', USD: '$', EUR: '€' };
const MODEL = 'claude-haiku-5-5';

const CATS = MD.CATS, COLORS = MD.COLORS;
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_P = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WD_S = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const icon = MD.icon;
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
  pushCloud();
}

/* ---------- Облако: вход и синхронизация ---------- */
let cloudUid = null, synced = null, stopListen = null, me = null;
function pushCloud() {
  if (!cloudUid || !synced) return;
  const ops = cloud.diff(synced, state);
  if (!ops.length) return;
  const prev = synced;
  synced = cloud.snapshotOf(state);
  Promise.resolve(cloud.write(cloudUid, ops)).catch(() => { synced = prev; toast('Не получилось отправить в облако — повторю при следующем изменении'); });
}
const canon = st => JSON.stringify([st.currency, st.accounts, st.tx.map(t => [t.id, t.type, t.amount, t.cat, t.acc, t.date, t.note]).sort()]);
function applyRemote(r) {
  if (!r.exists) {                               // новый аккаунт: заливаем то, что уже есть на телефоне
    synced = { meta: '', tx: new Map() };
    pushCloud();
    return;
  }
  const st = sanitize({ currency: r.currency, accounts: r.accounts, tx: r.tx });
  if (!st) return;
  st.tx.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0)));
  synced = cloud.snapshotOf(st);
  if (canon(st) === canon(state)) return;
  state = st;
  if (editAcc) editAcc = accById(editAcc.id) || editAcc;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  render();
}
function wipeLocal() {
  state = { currency: 'BYN', accounts: [], tx: [] };
  filterAcc = null;
  try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(UID_KEY); } catch (_) {}
}
function gate(signedIn) {
  $('#app').hidden = !signedIn;
  $('.nav').hidden = !signedIn;
}
function onSignedIn(u) {
  if (cloudUid === u.uid) { me = u; return; }
  if (stopListen) stopListen();
  let prevUid = null;
  try { prevUid = localStorage.getItem(UID_KEY); } catch (_) {}
  if (prevUid && prevUid !== u.uid) wipeLocal();
  if (!prevUid && state.accounts.length) { try { localStorage.setItem('moidengi_legacy_backup', JSON.stringify(state)); } catch (_) {} }
  try { localStorage.setItem(UID_KEY, u.uid); } catch (_) {}
  cloudUid = u.uid; me = u; synced = null;
  MD.authUI.hide(); gate(true); showTab('home', true);
  stopListen = cloud.listen(u.uid, { onData: applyRemote, onError: () => toast('Нет связи с облаком. Всё сохранится на телефоне и отправится позже.') });
}
function onSignedOut() {
  if (stopListen) stopListen();
  stopListen = null; cloudUid = null; synced = null; me = null;
  wipeLocal();
  layers.forEach(l => { l.hidden = true; }); layers.length = 0;
  gate(false); MD.authUI.show();
}
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
      note: typeof t.note === 'string' ? t.note.slice(0, 120) : '', ts: Number(t.ts) || 0
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
    : `<div class="empty"><span class="emp-m" aria-hidden="true">${MD.mascot('sleepy', 92)}</span><b>Здесь будут твои траты и доходы</b>Добавь первую — кнопка «+» внизу</div>`;
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
    <div class="tx" role="button" tabindex="0" data-tx="${esc(t.id)}" aria-label="${esc(t.cat)}${t.note ? ', ' + esc(t.note) : ''}, ${esc(signed(t.amount, t.type))}. Нажми, чтобы изменить или удалить">
      <div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</div>
      <div class="tx-body"><div class="tx-t">${esc(t.cat)}</div>${t.note ? `<div class="tx-n">${esc(t.note)}</div>` : ''}</div>
      <div class="tx-r"><div class="tx-a ${t.type === 'income' ? 'inc' : 'exp'}">${esc(signed(t.amount, t.type))}</div><div class="tx-s">${esc(a ? a.name : '—')}</div></div>
    </div></div>`;
}

function renderOps() {
  const fa = filterAcc && accById(filterAcc);
  $('#opsFilterChip').innerHTML = fa ? `<span class="fchip">Карта: ${esc(fa.name)}<button id="chipX" aria-label="Сбросить фильтр по карте">${icon('close')}</button></span>` : '';
  $$('#s-ops [data-ft]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ft === opsType)));
  const q = opsQuery.trim().toLowerCase();
  const list = monthTx().filter(t => (opsType === 'all' || t.type === opsType) &&
    (!q || t.cat.toLowerCase().includes(q) || t.note.toLowerCase().includes(q) || ((accById(t.acc) || {}).name || '').toLowerCase().includes(q)));
  const el = $('#opsList');
  if (!list.length) {
    el.innerHTML = `<div class="empty"><span class="emp-m" aria-hidden="true">${MD.mascot(q ? 'think' : 'sleepy', 92)}</span><b>${q ? 'Ничего не нашлось' : `В ${MONTHS_P[ym.m]} пока тихо`}</b>${q ? 'Попробуй другое слово или часть названия' : 'Добавь операцию — и она появится здесь'}</div>`;
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
    card.innerHTML = `<div class="empty" style="border:0"><span class="emp-m" aria-hidden="true">${MD.mascot('sleepy', 92)}</span><b>${statType === 'expense' ? 'Трат' : 'Доходов'} в ${MONTHS_P[ym.m]} нет</b>Когда появятся — здесь будет разбивка по категориям</div>`;
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
  const rec = { type: tx.type, amount: round2(amt), cat: tx.cat, acc: tx.acc, date, note: $('#txNote').value.trim().slice(0, 120) };
  const ex = tx.editId && state.tx.find(t => t.id === tx.editId);
  if (ex) Object.assign(ex, rec); else state.tx.push({ id: uid(), ...rec, ts: Date.now() });
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

/* ---------- Помощник ---------- */
const setAiPose = p => { $('#aiMascot').innerHTML = MD.mascot(p, 96); };
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

function runAI() {
  const err = $('#aiErr'), text = $('#aiText').value.trim();
  hideErr(err);
  if (!text) { showErr(err, 'Пока пусто. Скажи или напиши, например: «вчера кофе 6 рублей».'); setAiPose('think'); $('#aiText').focus(); return; }
  if (!state.accounts.length) { showErr(err, 'Чтобы записывать, нужна хотя бы одна карта. Добавь её на главной.'); setAiPose('oops'); return; }
  const items = normalizeItems(MD.parseNotes(text, { today: new Date(), accounts: state.accounts }));
  if (!items.length) { showErr(err, 'Не нашлось трат и доходов. Назови, что куплено или получено и на какую сумму.'); setAiPose('oops'); return; }
  setAiPose('happy'); buzz(15);
  draft = items; renderDraft(); openLayer($('#lyDraft'));
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
      <div class="dr-b"><div class="dr-t">${esc(d.cat)}</div>${d.note ? `<div class="tx-n">${esc(d.note)}</div>` : ''}<div class="dr-s">${esc(a.name)} · ${esc(dayTitle(d.date))}</div></div>
      <div class="tx-a ${d.type === 'income' ? 'inc' : 'exp'}">${esc(signed(d.amount, d.type))}</div>
      <button class="dr-x" data-drop="${i}" aria-label="Убрать строку: ${esc(d.cat)}">${icon('close')}</button></div>`;
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
  draft.forEach((d, i) => state.tx.push({ id: uid(), ...d, ts: Date.now() + i }));
  draft = [];
  save();
  $('#aiText').value = ''; setAiPose('hello');
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
  setAiPose(on ? 'listen' : 'hello');
}
const HINT_IDLE = 'Нажми и говори: «вчера кофе 6 рублей»';
function voiceFail(msg) { setMic(false, msg); showErr($('#aiErr'), msg); setAiPose('oops'); }
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
  renderAccount();
  $('#bkText').value = ''; hideErr($('#bkErr'));
  openLayer($('#lySet'));
});
$('#setCur').addEventListener('click', e => {
  const b = e.target.closest('[data-cur]');
  if (!b) return;
  state.currency = b.dataset.cur; save(); renderSettings(); render();
});
function renderAccount() {
  $('#setFoot').textContent = cloud.enabled ? 'Твои данные хранятся в личном облаке и на этом телефоне.' : 'Данные лежат только на этом телефоне.';
  $('#acctMascot').innerHTML = MD.mascot('happy', 46);
  if (cloud.enabled && me) {
    $('#acctName').textContent = me.email || me.phone || me.name || 'Мой аккаунт';
    $('#acctSub').textContent = 'Данные в облаке — они есть на всех твоих устройствах';
    $('#btnSignOut').hidden = false;
  } else {
    $('#acctName').textContent = 'Без аккаунта';
    $('#acctSub').textContent = 'Вход ещё не подключён: данные лежат только на этом телефоне';
    $('#btnSignOut').hidden = true;
  }
}
$('#btnSignOut').addEventListener('click', async () => {
  const yes = await confirmDlg('Выйти из аккаунта?', 'Данные останутся в облаке. Войдёшь снова — и всё вернётся.', 'Выйти');
  if (!yes) return;
  closeLayer($('#lySet'));
  setTimeout(() => cloud.signOut(), 200);
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
$('#hdrMascot').innerHTML = MD.mascot('hello', 48);
setAiPose('hello');
if (cloud.enabled) {
  gate(false);
  cloud.onAuth(u => (u ? onSignedIn(u) : onSignedOut()));
} else {
  render();
}
if (history.state && (history.state.layer || history.state.tab)) history.replaceState(null, '');
})();
