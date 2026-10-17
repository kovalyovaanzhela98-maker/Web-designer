(() => {
'use strict';
const MD = window.MD;
const cloud = MD.cloud;

/* ---------- Константы ---------- */
const STORE_KEY = 'moidengi_v1';
const UID_KEY = 'moidengi_uid';
const HIDE_KEY = 'moidengi_hide';
const CURRENCIES = { BYN: 'Br', RUB: '₽', USD: '$', EUR: '€' };

const CATS = MD.CATS, COLORS = MD.COLORS;
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_P = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WD_S = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const icon = MD.icon;
const cIcon = ci => icon(ci[1]);
/* Цвет значка категории: свой цвет человека побеждает общий зелёный */
const cs = ci => { const t = MD.toneOf(ci[2]), im = ci[3] && ci[3].custom ? '!important' : ''; return `--c:${t.solid}${im};--cbg:${t.bg};--ctx:${t.text};--ctd:${t.textDark}`; };
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

/* Поле с плавающей подписью. o: type, mode, ac, max, value, unit, cls, extra */
const fld = (id, label, o = {}) => `<label class="field${o.unit ? ' unit' : ''}${o.cls ? ' ' + o.cls : ''}"><input id="${id}" type="${o.type || 'text'}"${o.mode ? ` inputmode="${o.mode}"` : ''}${o.ac ? ` autocomplete="${o.ac}"` : ' autocomplete="off"'}${o.max ? ` maxlength="${o.max}"` : ''} placeholder=" " value="${esc(o.value || '')}"${o.extra ? ' ' + o.extra : ''}><span>${esc(label)}</span>${o.unit ? `<span class="u">${esc(o.unit)}</span>` : ''}</label>`;
const onColor = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#1F2B20' : '#FFFFFF'; };

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
const sym = c => CURRENCIES[c || state.currency];
const money = n => `${fmt(n)} ${sym()}`;
const signed = (n, type) => (type === 'income' ? '+' : '−') + fmt(n) + ' ' + sym();
const MASK = '••••••';
const splitMoney = n => { const t = fmt(n), i = t.lastIndexOf(','); return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i)]; };
const moneyH = n => { if (hide) return MASK; const [a, b] = splitMoney(n); return `${esc(a)}<small>${esc(b)} ${esc(sym())}</small>`; };
/* Плашка суммы: капсула, расход цветом своей категории, доход зелёный со знаком «+»; копейки и валюта мельче */
const pill = (n, type, ci) => { if (hide) return `<span class="pill neu">${MASK}</span>`; const [a, b] = splitMoney(n), inc = type === 'income'; return `<span class="pill ${inc ? 'inc' : 'cat'}"${inc ? '' : ` style="${cs(ci)}"`}>${inc ? '+' : '−'}${esc(a)}<small>${esc(b)} ${esc(sym())}</small></span>`; };
const maskT = s => (hide ? MASK : s);

/* ---------- Хранилище ---------- */
const R = MD.rec;
const freshState = () => ({ cats: [], name: '', currency: 'BYN', accounts: [], goals: [], tx: [], nudge: MD.nudges.defaultState(), fest: MD.events.defaultFest(), rec: R.defaultRec() });
let state = freshState();
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
  catch (e) { toast('Не получилось сохранить. Освободи место на телефоне и попробуй снова.', null, null, 'oops'); }
  pushCloud();
}

/* ---------- Облако: вход и синхронизация ---------- */
let cloudUid = null, synced = null, stopListen = null, me = null;
/* Предпросмотр: пока облако не подключено, профиль показан так, будто вход уже выполнен. Выключить: PREVIEW_ACCOUNT = false */
const PREVIEW_ACCOUNT = true;
const userName = () => (state.name || (me && me.name) || '').trim();
const previewMe = () => (!cloud.enabled && PREVIEW_ACCOUNT ? { name: '', phone: '+375 29 123-45-67', phoneLinked: '+375 29 123-45-67', emailLinked: '' } : null);
function pushCloud() {
  if (!cloudUid || !synced) return;
  const ops = cloud.diff(synced, state);
  if (!ops.length) return;
  const prev = synced;
  synced = cloud.snapshotOf(state);
  Promise.resolve(cloud.write(cloudUid, ops)).catch(() => { synced = prev; toast('Нет связи. Данные сохранятся на телефоне', null, null, 'oops'); });
}
const canon = st => JSON.stringify([st.currency, st.accounts, st.goals, st.nudge, st.fest, st.rec, st.tx.map(t => [t.id, t.type, t.amount, t.cat, t.acc, t.date, t.note]).sort()]);
function applyRemote(r) {
  document.body.classList.remove('skel');
  if (!r.exists) {                               // новый аккаунт: заливаем то, что уже есть на телефоне
    synced = { meta: '', tx: new Map() };
    pushCloud();
    return;
  }
  const st = sanitize({ name: state.name, cats: state.cats, currency: r.currency, accounts: r.accounts, goals: r.goals, nudge: r.nudge, fest: r.fest, rec: r.rec, tx: r.tx });
  if (!st) return;
  st.tx.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0)));
  synced = cloud.snapshotOf(st);
  if (guestMerge) {                              // вошли, а на телефоне уже были записи без входа: ничего не теряем
    guestMerge = false;
    const have = new Set(st.tx.map(t => t.id));
    state.tx.forEach(t => { if (!have.has(t.id)) st.tx.push(t); });
    const gid = new Set(st.goals.map(g => g.id)); state.goals.forEach(g => { if (!gid.has(g.id)) st.goals.push(g); });
    const pid = new Set(st.rec.list.map(p => p.id)); state.rec.list.forEach(p => { if (!pid.has(p.id) && st.rec.list.length < R.MAX) st.rec.list.push(p); });
    st.tx.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0)));
  }
  if (canon(st) === canon(state)) return;
  state = st;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  render();
  nudgeRefresh(true);
  afterDataChange();
  pushCloud();
}
function wipeLocal() {
  state = freshState();
  try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(UID_KEY); } catch (_) {}
}
/* Вход не обязателен: пока человек не вошёл, данные только на телефоне. После первой записи Фин предложит войти. */
let guestMerge = false;
function onSignedIn(u) {
  if (cloudUid === u.uid) { me = u; renderAccount(); return; }
  if (stopListen) stopListen();
  let prevUid = null;
  try { prevUid = localStorage.getItem(UID_KEY); } catch (_) {}
  if (prevUid && prevUid !== u.uid) wipeLocal();
  guestMerge = !prevUid && (state.tx.length > 0 || state.goals.length > 0 || state.rec.list.length > 0);
  try { localStorage.setItem(UID_KEY, u.uid); } catch (_) {}
  cloudUid = u.uid; me = u; synced = null;
  MD.authUI.hide();
  if (!state.tx.length) document.body.classList.add('skel');
  render();
  stopListen = cloud.listen(u.uid, { onData: applyRemote, onError: () => { document.body.classList.remove('skel'); toast('Нет связи. Данные сохранятся на телефоне', null, null, 'oops'); } });
}
function onSignedOut() {
  const was = !!cloudUid;                        // на старте без входа ничего не стираем: это гость со своими данными
  if (stopListen) stopListen();
  stopListen = null; cloudUid = null; synced = null; me = null; guestMerge = false;
  document.body.classList.remove('skel');
  if (was) { wipeLocal(); layers.slice().forEach(l => { l.hidden = true; }); layers.length = 0; showTab('home', true); }
  MD.authUI.hide(); render();
}
function askLogin() { if (cloud.enabled && !me) MD.authUI.show(); }
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
  const cats = (Array.isArray(o.cats) ? o.cats : []).slice(0, 80).filter(x => x && typeof x === 'object').map(x => ({ k: String(x.k || '').slice(0, 40), t: x.t === 'income' ? 'income' : 'expense', n: String(x.n || '').replace(/\s+/g, ' ').trim().slice(0, 24), i: MD.CAT_ICONS.includes(x.i) ? x.i : '', c: /^#[0-9A-Fa-f]{6}$/.test(x.c || '') ? x.c : '', custom: !!x.custom, isNew: !!x.isNew, ts: Number(x.ts) || 0 })).filter(x => x.k && (x.n || !x.custom));
  MD.applyCats(cats);
  const tx = [];
  for (const t of o.tx) {
    if (!t || (t.type !== 'expense' && t.type !== 'income')) continue;
    const amt = parseAmount(t.amount);
    if (!(amt > 0) || !ids.has(t.acc) || !parseYmd(t.date)) continue;
    const list = CATS[t.type].map(c => c[0]);
    tx.push({
      id: typeof t.id === 'string' && t.id ? t.id : uid(), type: t.type, amount: round2(amt),
      cat: list.includes(t.cat) ? t.cat : 'Другое', acc: t.acc, date: t.date,
      note: typeof t.note === 'string' ? t.note.slice(0, 120) : '', ts: Number(t.ts) || 0,
      orig: t.orig && CURRENCIES[t.orig.cur] && parseAmount(t.orig.a) > 0 ? { a: round2(parseAmount(t.orig.a)), cur: t.orig.cur, rate: Number(t.orig.rate) || 0, est: !!t.orig.est } : null
    });
  }
  const goals = [];
  for (const g of (Array.isArray(o.goals) ? o.goals : [])) {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) continue;
    const target = parseAmount(g.target); if (!(target > 0)) continue;
    const sv = parseAmount(g.saved, true), months = Math.max(1, Math.min(600, Math.round(Number(g.months)) || 1)), unit = g.unit === 'week' ? 'week' : 'month';
    goals.push({
      id: typeof g.id === 'string' && g.id ? g.id : uid(), name: g.name.trim().slice(0, 40), target: round2(target),
      saved: Number.isFinite(sv) && sv > 0 ? round2(sv) : 0, months, unit, cur: CURRENCIES[g.cur] ? g.cur : currency,
      deadline: parseYmd(g.deadline) ? g.deadline : MD.goals.ymdOf(MD.goals.addMonths(new Date(), months)),
      created: parseYmd(g.created) ? g.created : today(),
      nid: Math.max(0, Math.min(49, Math.floor(Number(g.nid)) || goals.length)),
      remind: { on: !!(g.remind && g.remind.on), day: Math.max(1, Math.min(unit === 'week' ? 7 : 28, Math.floor(Number(g.remind && g.remind.day)) || 5)), time: /^\d{2}:\d{2}$/.test(g.remind && g.remind.time) ? g.remind.time : '10:00' },
      log: (Array.isArray(g.log) ? g.log : []).slice(-400).map(x => ({ d: x && x.d, a: parseAmount(x && x.a) })).filter(x => parseYmd(x.d) && x.a > 0).map(x => ({ d: x.d, a: round2(x.a) }))
    });
  }
  return { cats, name: typeof o.name === 'string' ? o.name.replace(/\s+/g, ' ').trim().slice(0, 30) : '', currency, accounts, goals, tx, nudge: MD.nudges.sanitizeState(o.nudge), fest: MD.events.sanitize(o.fest), rec: R.sanitize(o.rec, CATS.expense.map(c => c[0])) };
}

/* ---------- UI-состояние ---------- */
let now0 = new Date();
let ym = { y: now0.getFullYear(), m: now0.getMonth() };
let statCat = null, filterAcc = null, tab = 'home', opsType = 'all', opsQuery = '', statType = 'expense';
let draft = [];
const catInfo = (type, name) => CATS[type].find(c => c[0] === name) || CATS[type][CATS[type].length - 1];
const accById = id => state.accounts.find(a => a.id === id);
const colorOf = hex => COLORS.find(c => c.bg === hex) || COLORS[0];
const monthKey = (y = ym.y, m = ym.m) => `${y}-${pad(m + 1)}`;

const totalBalance = () => round2(state.accounts.reduce((s, a) => s + accBalance(a), 0));
function accBalance(a) {
  let b = 0;
  for (const t of state.tx) if (t.acc === a.id) b += t.type === 'income' ? t.amount : -t.amount;
  return round2(b);
}
function monthTx(y = ym.y, m = ym.m) {
  const mk = monthKey(y, m), fa = filterAcc && accById(filterAcc);
  return state.tx.filter(t => t.date.startsWith(mk) && (!fa || t.acc === fa.id));
}
const sumOf = (list, type) => round2(list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0));

/* Счёт у человека один, общий. Внутри он по-прежнему лежит как единственная «карта», но экранов для неё нет. */
function ensureAccount() {
  if (!state.accounts.length) state.accounts.push({ id: 'main', name: 'Мой счёт', last4: '', balance: 0, color: COLORS[0].bg });
}

/* ---------- Отрисовка ---------- */
function setNum(el, html, value) { el._v = value; el.innerHTML = html(value); }
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
/* Пустые экраны: не «нет данных», а что делать дальше */
const emptyBox = (title, text, act) => `<div class="empty"><span class="emp-m" aria-hidden="true">${MD.mascot('sleepy', 96)}</span><b>${esc(title)}</b>${esc(text)}${act ? `<button class="btn primary" type="button" ${act.attr}>${esc(act.label)}</button>` : ''}</div>`;

const pluralN = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };

function render() {
  ensureAccount();
  MD.applyCats(state.cats);
  renderMonthBars();
  renderHome();
  renderNudge();
  if (tab === 'ops') renderOps();
  if (tab === 'stats') renderStats();
  if (tab === 'goals') renderGoals();
  if (tab === 'acc') renderAcc();
  if (tab === 'pay') renderPay();
  if (tab === 'chat' && MD.chat) MD.chat.render();
  if (tab === 'home' || tab === 'stats') nudgeRefresh(false);
}

function renderMonthBars() {
  const html = `<div class="monthbar"><button class="mb" data-mshift="-1" aria-label="Предыдущий месяц">${icon('left')}</button><button class="mlabel" data-mnow aria-label="Показан ${MONTHS[ym.m]} ${ym.y}. Нажми, чтобы вернуться к текущему месяцу">${MONTHS[ym.m]} ${ym.y}</button><button class="mb" data-mshift="1" aria-label="Следующий месяц">${icon('right')}</button></div>`;
  $$('.monthbar-slot').forEach(s => { s.innerHTML = html; });
}

/* Обязательные платежи на главной: «избранное», как в банке. Карточки по порядку: пора записать, ближайшие, оплаченные */
const rMoney = n => esc(maskT(money(n)));
function renderPays() {
  const blk = $('#paysBlock'), el = $('#paysStrip'), T = new Date(), mk = R.mkOfDate(T), list = state.rec.list;
  blk.hidden = false;
  if (!list.length) {
    el.innerHTML = `<button class="pcard add" type="button" data-go-pay><span class="pc-ic2" aria-hidden="true">${icon('plus')}</span><b>Добавить платёж</b></button>`;
    return;
  }
  let rows = R.monthRows(list, mk, T);
  if (!rows.length) { const n = R.nextDue(list, T); rows = n ? [{ p: n.p, date: n.date, status: 'wait', mk: n.mk }] : []; }
  const rank = r => (r.status === 'late' ? 0 : r.status === 'wait' ? 1 : 2);
  rows = rows.slice().sort((a, b) => rank(a) - rank(b) || a.date - b.date).slice(0, 8);
  const mid = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  el.innerHTML = rows.map(r => {
    const p = r.p, ci = catInfo('expense', p.cat), d = r.date, days = Math.round((mid(d) - mid(T)) / 864e5), key = r.mk || mk;
    const sub = r.status === 'paid' ? 'Оплачено' : esc(R.whenText(days));
    return `<div class="pcard ${r.status}"><button class="pc-main" type="button" data-go-pay aria-label="${esc(cap(p.name))}, ${esc(sub)}. Все обязательные платежи">
        <span class="pc-top"><span class="tx-ic" aria-hidden="true">${r.status === 'paid' ? icon('check') : cIcon(ci)}</span><b class="pc-n">${esc(cap(p.name))}</b></span>
        <span class="pc-bot"><span class="pc-a">${rMoney(p.amount)}</span><small class="pc-s">${sub}</small><small class="pc-d">${esc(R.scheduleText(p, d, true))}</small></span></button>
      ${r.status === 'late' ? `<button class="late-act" type="button" data-paywrite="${esc(p.id)}|${key}">Записать</button>` : ''}</div>`;
  }).join('');
}

/* Цели на главной: карточки в ряд, у каждой свой цвет */
function renderGoalsHome() {
  const el = $('#goalsStrip'), list = state.goals;
  el.innerHTML = list.map(g => `<button class="grow" type="button" data-goal="${esc(g.id)}" style="--gc:${gCol(g)}"><span class="gr-top"><b>${esc(g.name)}</b><span class="goal-pct">${goalPct(g)}%</span></span><span class="goal-bar"><i style="width:${goalPct(g)}%"></i></span><small>${esc(maskT(gm(g, g.saved)))} из ${esc(maskT(gm(g, g.target)))}</small></button>`).join('') +
    `<button class="grow add" type="button" data-newgoal><span class="pc-ic2" aria-hidden="true">${icon('plus')}</span><b>${list.length ? 'Ещё копилка' : 'Новая копилка'}</b></button>`;
}
/* Дни рождения и праздники: ближайшие, одной строкой */
function renderFestHome() {
  const el = $('#festStrip'), ups = MD.events.upcoming(festList(), new Date()).slice(0, 6);
  el.innerHTML = `<button class="fpill add" type="button" data-ev=""><span class="fp-ic" aria-hidden="true">${icon('plus')}</span><span class="fp-t"><b>Добавить</b></span></button>` +
    ups.map(u => { const d = MD.events.daysTo(u.occ, new Date()); return `<button class="fpill" type="button" data-ev="${esc(u.e.id)}"><span class="fp-ic" aria-hidden="true">${icon('gift')}</span><span class="fp-t"><b>${esc(MD.events.whatText(u.e))}</b><small>${d === 0 ? 'сегодня' : d === 1 ? 'завтра' : `через ${d} ${pluralN(d, 'день', 'дня', 'дней')}`}</small></span></button>`; }).join('');
}
$('#s-home').addEventListener('click', e => {
  const g = e.target.closest('[data-goal]'); if (g) { openGoal(g.dataset.goal); return; }
  if (e.target.closest('[data-newgoal]')) { startNewGoal(); return; }
  const v = e.target.closest('[data-ev]'); if (v) openEvent(v.dataset.ev || null);
});

/* Карточка «Пора отложить»: цель, в этом периоде ещё не откладывали. Или совет включить напоминание в лучший день */
function renderSaveCard() {
  const el = $('#saveCard'), c = G.homeCard(state.goals, state.tx, new Date());
  if (!c) { el.innerHTML = ''; return; }
  const g = c.goal, per = esc(maskT(gm(g, c.amount))), unit = g.unit === 'week' ? 'на этой неделе' : 'в этом месяце';
  el.innerHTML = c.kind === 'due'
    ? `<div class="save-card due">${MD.mascot('love', 56)}<span class="sc-t"><b>Отложи ${per} на «${esc(g.name)}»</b></span><button class="btn primary" type="button" data-savenow="${esc(g.id)}">Отложил</button></div>`
    : `<div class="save-card">${MD.mascot('think', 56)}<span class="sc-t"><b>«${esc(g.name)}»: напомнить откладывать ${esc(G.dayName(g.unit === 'week' ? 'week' : 'month', c.day))}?</b></span><button class="btn primary" type="button" data-remindgoal="${esc(g.id)}|${c.day}">Да</button></div>`;
}
/* Баннеры: пара наблюдений по записям */
function renderBanners() {
  const list = MD.insights.pick(MD.insights.build(state.tx, new Date(), n => maskT(money(n))), new Date(), 1);
  $('#banners').innerHTML = list.map(b => `<article class="banner tone-${b.tone}"><span class="bi" aria-hidden="true">${icon(b.icon)}</span><b>${esc(b.title)}</b><p>${esc(b.text)}</p></article>`).join('');
}
function renderHome() {
  { const n = userName(); $('#greetTitle').textContent = n ? `Привет, ${n}` : 'Привет'; }
  const total = totalBalance();
  setNum($('#heroSum'), moneyH, total);
  $('#btnEye').innerHTML = icon(hide ? 'eyeoff' : 'eye');
  $('#btnEye').setAttribute('aria-pressed', String(hide));
  $('#btnEye').setAttribute('aria-label', hide ? 'Показать суммы' : 'Скрыть суммы');

  const list = monthTx(ym.y, ym.m);
  const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense'), isNow = ym.y === now0.getFullYear() && ym.m === now0.getMonth();
  $('#heroMon').textContent = isNow ? MONTHS[ym.m] : `${MONTHS[ym.m]} ${ym.y}`; $('#tileIncL').textContent = ''; $('#tileExpL').textContent = '';
  $('#sumInc').innerHTML = hide ? MASK : (inc > 0 ? '+' : '') + moneyH(inc);
  $('#sumExp').innerHTML = hide ? MASK : (exp > 0 ? '−' : '') + moneyH(exp);
  if (MD.notify.supported()) MD.notify.pushSummary({ balance: hide ? '••••' : money(total), flow: hide ? '' : `+${fmt(inc)}  −${fmt(exp)}`, month: MONTHS[ym.m].toLowerCase() });
  { const pose = !state.tx.length ? 'hello' : inc > 0 && exp > inc ? 'love' : inc > 0 && exp / inc > 0.85 ? 'think' : inc > 0 && exp / inc < 0.5 ? 'joy' : exp === 0 ? 'happy' : 'rest', el = $('#heroFin'); if (el && el.dataset.pose !== pose) { el.dataset.pose = pose; el.innerHTML = MD.mascot(pose, 84); } }
  renderPays();
  renderGoalsHome();
  renderFestHome();
  renderSaveCard();
  renderBanners();

  const recent = state.tx.slice().sort(cmpTx).slice(0, 5);
  $('#recentList').innerHTML = recent.length
    ? `<div class="recent">${recent.map(txRow).join('')}</div>`
    : emptyBox('Пока пусто', 'Первые записи появятся здесь.');
}

/* Режим выбора в истории: отметить несколько операций и изменить сразу */
const sel = { on: false, ids: new Set() };
const cmpTx = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0));

function dayTitle(s) {
  const d = parseYmd(s), t = parseYmd(today());
  const diff = Math.round((t - d) / 864e5);
  const base = `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  if (diff === 0) return `Сегодня, ${base}`;
  if (diff === 1) return `Вчера, ${base}`;
  return `${WD_S[d.getDay()]}, ${base}`;
}

function txRow(t) {
  const ci = catInfo(t.type, t.cat), a = accById(t.acc), on = sel.on && sel.ids.has(t.id);
  return `<div class="swipe${sel.on ? ' selmode' : ''}${on ? ' picked' : ''}" data-id="${esc(t.id)}"><div class="swipe-bg" aria-hidden="true">${icon('trash')}</div>
    <div class="tx" role="button" tabindex="0" data-tx="${esc(t.id)}" aria-label="${esc(t.cat)}${t.note ? ', ' + esc(t.note) : ''}, ${esc(signed(t.amount, t.type))}. Нажми, чтобы изменить">
      ${sel.on ? `<span class="sel-box" aria-hidden="true">${on ? icon('check') : ''}</span>` : ''}<div class="tx-ic" style="${cs(ci)}" aria-hidden="true">${cIcon(ci)}</div>
      <div class="tx-body"><div class="tx-t">${esc(t.cat === 'Другое' && t.note ? t.note : t.cat)}</div>${t.cat === 'Другое' && t.note ? '<div class="tx-n">Другое</div>' : t.note ? `<div class="tx-n">${esc(t.note)}</div>` : ''}${t.orig ? `<div class="tx-n tx-orig">${t.orig.est ? '≈ ' : ''}${esc(fmt(t.orig.a))} ${esc(sym(t.orig.cur))}</div>` : ''}</div>
      <div class="tx-r"><div class="tx-a ${t.type === 'income' ? 'inc' : 'exp'}">${pill(t.amount, t.type, ci)}</div></div>
    </div></div>`;
}

function renderOps() {
  const fa = filterAcc && accById(filterAcc);
  $('#opsFilterChip').innerHTML = '';
  $$('#s-ops [data-ft]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ft === opsType)));
  const q = opsQuery.trim().toLowerCase();
  const list = monthTx().filter(t => (opsType === 'all' || t.type === opsType) &&
    (!q || t.cat.toLowerCase().includes(q) || t.note.toLowerCase().includes(q) || ((accById(t.acc) || {}).name || '').toLowerCase().includes(q)));
  const el = $('#opsList');
  if (!list.length) {
    el.innerHTML = q ? emptyBox('Ничего не нашлось', 'Попробуй другое слово или часть названия.') : emptyBox(`В ${MONTHS_P[ym.m]} пока пусто`, 'Нажми +, чтобы добавить запись. Фин подскажет.', { attr: 'data-add', label: 'Добавить запись' });
    return;
  }
  const days = {};
  list.forEach(t => (days[t.date] = days[t.date] || []).push(t));
  el.innerHTML = Object.keys(days).sort().reverse().map(d => {
    const net = round2(days[d].reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
    return `<div class="day"><div class="day-h"><span>${esc(dayTitle(d))}</span><span>${net > 0 ? '+' : ''}${esc(fmt(net))}</span></div>${days[d].slice().reverse().map(txRow).join('')}</div>`;
  }).join('');
}

/* Период аналитики: неделя, месяц, год или свои даты. Сравниваем с предыдущим таким же периодом */
const per = { kind: 'month', anchor: new Date(), year: new Date().getFullYear(), from: '', to: '' };
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dd = d => `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
const daysBetween = (a, b) => Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
function periodInfo() {
  const T = new Date();
  let from, to, label, prevFrom, prevTo, prevPhrase, word;
  if (per.kind === 'week') {
    from = mondayOf(per.anchor); to = addD(from, 6); prevFrom = addD(from, -7); prevTo = addD(from, -1);
    label = `${dd(from)} — ${dd(to)}`; prevPhrase = 'на прошлой неделе'; word = 'за неделю';
  } else if (per.kind === 'year') {
    from = new Date(per.year, 0, 1); to = new Date(per.year, 11, 31); prevFrom = new Date(per.year - 1, 0, 1); prevTo = new Date(per.year - 1, 11, 31);
    label = String(per.year); prevPhrase = `в ${per.year - 1} году`; word = 'за год';
  } else if (per.kind === 'range') {
    to = parseYmd(per.to) || T; from = parseYmd(per.from) || addD(to, -29);
    if (from > to) [from, to] = [to, from];
    const n = daysBetween(from, to) + 1; prevTo = addD(from, -1); prevFrom = addD(prevTo, -(n - 1));
    label = `${dd(from)} — ${dd(to)}`; prevPhrase = 'в предыдущем периоде'; word = 'за период';
  } else {
    from = new Date(ym.y, ym.m, 1); to = new Date(ym.y, ym.m + 1, 0); prevFrom = new Date(ym.y, ym.m - 1, 1); prevTo = new Date(ym.y, ym.m, 0);
    label = `${MONTHS[ym.m]} ${ym.y}`; prevPhrase = `в ${MONTHS_P[prevFrom.getMonth()]}`; word = 'за месяц';
  }
  const days = daysBetween(from, to) + 1, end = to > T ? T : to, elapsed = Math.max(1, Math.min(days, daysBetween(from, end) + 1));
  return { from, to, label, prevFrom, prevTo, prevPhrase, word, days, elapsed, f: ymd(from), t: ymd(to), pf: ymd(prevFrom), pt: ymd(prevTo) };
}
const inPer = (t, a, b) => t.date >= a && t.date <= b;
function shiftPeriod(k) {
  if (per.kind === 'range') return;
  if (per.kind === 'week') per.anchor = addD(per.anchor, 7 * k); else if (per.kind === 'year') per.year += k; else { const d = new Date(ym.y, ym.m + k, 1); ym = { y: d.getFullYear(), m: d.getMonth() }; }
  buzz(6); statCat = null; renderStats();
}
function renderPeriodBar(P) {
  $$('#s-stats [data-pk]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.pk === per.kind)));
  const el = $('#periodBar');
  if (per.kind === 'range') {
    el.innerHTML = `<div class="range-row"><label class="field t"><input id="perFrom" type="date" value="${P.f}"><span>С</span></label><label class="field t"><input id="perTo" type="date" value="${P.t}"><span>По</span></label></div>`;
    return;
  }
  el.innerHTML = `<div class="period-bar"><button class="mb" data-pshift="-1" aria-label="Назад">${icon('left')}</button><button class="pl" data-pnow aria-label="${esc(P.label)}. Нажми, чтобы вернуться к текущему периоду">${esc(P.label)}</button><button class="mb" data-pshift="1" aria-label="Вперёд">${icon('right')}</button></div>`;
}
let chartScrub = null;
function renderStats() {
  const P = periodInfo();
  renderPeriodBar(P);
  $$('#s-stats [data-st]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.st === statType)));
  const list = state.tx.filter(t => t.type === statType && inPer(t, P.f, P.t));
  const total = sumOf(list, statType);
  const word = statType === 'expense' ? 'расходов' : 'доходов';
  const card = $('#catCard'), insEl = $('#insights'), dayCard = $('#dayCard'), catList = $('#catList');
  if (!list.length) {
    card.innerHTML = emptyBox('Здесь пока пусто', statType === 'expense' ? 'Нажми +, чтобы добавить трату, или выбери другой период. Фин покажет, куда уходят деньги.' : 'Нажми +, чтобы добавить доход, или выбери другой период. Фин покажет, откуда приходят деньги.', { attr: 'data-add', label: statType === 'expense' ? 'Добавить трату' : 'Добавить доход' });
    insEl.innerHTML = ''; dayCard.hidden = true; catList.hidden = true; $('#statSay').innerHTML = '';
    return;
  }
  dayCard.hidden = true; catList.hidden = false;
  const by = {};
  list.forEach(t => { by[t.cat] = round2((by[t.cat] || 0) + t.amount); });
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  if (statCat && by[statCat] == null) statCat = null;
  // Сравнение с прошлым таким же периодом, главная категория, среднее и самая крупная
  const prev = sumOf(state.tx.filter(t => t.type === statType && inPer(t, P.pf, P.pt)), statType);
  const big = list.slice().sort((a, b) => b.amount - a.amount)[0];
  {
    const top = esc(rows[0][0]), topSum = esc(maskT(money(rows[0][1]))), share = Math.round(rows[0][1] / total * 100);
    const main = statType === 'income' ? `Главный источник: <em>${top}</em>, ${share}% (${topSum}).` : `Больше всего ушло на <em>${top}</em>: ${share}% (${topSum}).`;
    let head, pose;
    if (prev > 0) {
      const pct = Math.round((total - prev) / prev * 100), good = statType === 'expense' ? pct <= 0 : pct >= 0;
      head = pct === 0 ? `Столько же, сколько ${P.prevPhrase}` : `${statType === 'expense' ? 'Расходы' : 'Доходы'} на <em>${Math.abs(pct)}%</em> ${pct < 0 ? 'меньше' : 'больше'}, чем ${P.prevPhrase}`;
      pose = pct === 0 ? 'hello' : good ? 'joy' : 'think';
    } else { head = `${cap(statType === 'expense' ? 'расходов' : 'доходов')} ${P.word}: <em>${esc(maskT(money(total)))}</em>`; pose = 'hello'; }
    $('#statSay').innerHTML = MD.say(pose, `${head}<small>${main}</small>`, 64);
  }
  insEl.innerHTML = `<div class="ins"><div><small>В среднем за день</small><b>${esc(maskT(money(round2(total / P.elapsed))))}</b></div><div><small>${statType === 'expense' ? 'Самая крупная трата' : 'Самый крупный доход'}</small><b>${esc(maskT(money(big.amount)))}</b></div></div>`;

  const shown = statCat ? list.filter(t => t.cat === statCat) : list, shownSum = sumOf(shown, statType);
  // Кривая: по дням (до двух месяцев), по неделям (длинный период) или по месяцам (год)
  let buckets = [];
  if (per.kind === 'year') {
    buckets = Array.from({ length: 12 }, (_, i) => ({ l: MONTHS[i].slice(0, 3), v: 0, now: per.year === now0.getFullYear() && i === now0.getMonth() }));
    shown.forEach(t => { buckets[Number(t.date.slice(5, 7)) - 1].v += t.amount; });
  } else if (P.days > 62) {
    const n = Math.ceil(P.days / 7); buckets = Array.from({ length: n }, (_, i) => ({ l: dd(addD(P.from, i * 7)), v: 0, now: false }));
    shown.forEach(t => { buckets[Math.min(n - 1, Math.floor(daysBetween(P.from, parseYmd(t.date)) / 7))].v += t.amount; });
  } else {
    buckets = Array.from({ length: P.days }, (_, i) => { const d = addD(P.from, i); return { l: per.kind === 'week' ? WD_S[d.getDay()] : String(d.getDate()), v: 0, now: ymd(d) === today() }; });
    shown.forEach(t => { const i = daysBetween(P.from, parseYmd(t.date)); if (buckets[i]) buckets[i].v += t.amount; });
  }
  // Накопительная линия: траты растут с начала периода; прошлый период — пунктир; будущее не рисуем
  const mk = (txs, base) => {
    const bk = buckets.map(() => 0), pb = parseYmd(base);
    txs.forEach(t => {
      let i;
      if (per.kind === 'year') i = Number(t.date.slice(5, 7)) - 1;
      else if (P.days > 62) i = Math.floor(daysBetween(pb, parseYmd(t.date)) / 7);
      else i = daysBetween(pb, parseYmd(t.date));
      if (i >= 0 && i < bk.length) bk[i] += t.amount;
    });
    let run = 0; return bk.map(v => (run += v));
  };
  const nb = buckets.length, W = 300, H = 150;
  const cum = mk(shown, P.f), prevCum = mk(state.tx.filter(t => t.type === statType && inPer(t, P.pf, P.pt) && (!statCat || t.cat === statCat)), P.pf);
  const nowI = buckets.findIndex(b => b.now), last = nowI >= 0 ? nowI : nb - 1;
  const mx = Math.max(cum[last] || 0, ...prevCum, 1), col = statType === 'expense' ? 'var(--negative)' : 'var(--positive)';
  const xAt = i => (nb === 1 ? W / 2 : 8 + i * (W - 16) / (nb - 1)), yAt = v => H - 8 - (v / mx) * (H - 22);
  const pts = []; for (let i = 0; i <= last; i++) pts.push([xAt(i), yAt(cum[i])]);
  const smooth = ps => { let d = `M${ps[0][0].toFixed(1)} ${ps[0][1].toFixed(1)}`; for (let i = 1; i < ps.length; i++) { const [x0, y0] = ps[i - 1], [x1, y1] = ps[i], m2 = (x0 + x1) / 2; d += ` C${m2.toFixed(1)} ${y0.toFixed(1)} ${m2.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`; } return d; };
  const path = smooth(pts.length > 1 ? pts : [pts[0], [pts[0][0] + 0.1, pts[0][1]]]);
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)} ${H - 8} L${pts[0][0].toFixed(1)} ${H - 8} Z`;
  const ppts = prevCum.map((v, i) => [xAt(i), yAt(v)]);
  const peak = buckets.reduce((m, b, i) => (i <= last && b.v > buckets[m].v ? i : m), 0), hi = buckets[peak];
  const grid = [0.25, 0.5, 0.75].map(f => `<line class="grid" x1="0" x2="${W}" y1="${yAt(f * mx).toFixed(1)}" y2="${yAt(f * mx).toFixed(1)}" stroke-width="1"/>`).join('');
  const tp = pts[pts.length - 1];
  const curve = `<defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${grid}
    ${prevCum.some(v => v > 0) ? `<path d="${smooth(ppts)}" fill="none" stroke="var(--muted)" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="4 4" stroke-linecap="round"/>` : ''}
    <path class="area" d="${area}"/><path d="${path}" fill="none" stroke="${col}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>
    <g id="scrubMark" hidden><line y1="6" y2="${H - 8}" stroke="${col}" stroke-opacity=".4" stroke-width="1"/><circle r="4" fill="var(--surface)" stroke="${col}" stroke-width="2.5"/></g>
    ${nowI >= 0 ? `<circle class="halo" cx="${tp[0].toFixed(1)}" cy="${tp[1].toFixed(1)}" r="10" style="fill:${col}"/><circle class="now-dot" cx="${tp[0].toFixed(1)}" cy="${tp[1].toFixed(1)}" r="4.5" style="stroke:${col}"/>` : ''}`;
  const step = nb <= 12 ? 1 : Math.ceil(nb / 6);
  const labels = buckets.map((b, i) => (i % step === 0 || i === nb - 1) && !(i === nb - 2 && step > 1) ? `<text x="${xAt(i).toFixed(1)}" y="${H + 16}" text-anchor="${i === 0 && nb > 1 ? 'start' : i === nb - 1 && nb > 1 ? 'end' : 'middle'}">${esc(b.l)}</text>` : '').join('');
  const nowTip = nowI >= 0 ? `<span class="pill neu now-tip" style="left:${(tp[0] / W * 100).toFixed(1)}%;top:${Math.max(0, tp[1] / (H + 22) * 100 - 2).toFixed(1)}%">${esc(maskT(money(cum[nowI])))}</span>` : '';
  card.innerHTML = `<div class="curve-h"><div><small class="muted">${statCat ? esc(statCat) : cap(word) + ' ' + P.word}</small><b class="curve-sum">${esc(maskT(money(shownSum)))}</b></div>${hi.v > 0 ? `<div class="curve-pk"><small class="muted">Пик</small><b>${esc(per.kind !== 'year' && P.days <= 62 ? dd(addD(P.from, peak)) : hi.l)}</b></div>` : ''}</div>
    <div class="curve-box" id="curveBox"><svg class="days" viewBox="0 0 ${W} ${H + 22}" role="img" aria-label="График ${word} ${P.word}: накопленная сумма, пунктир — ${P.prevPhrase}">${curve}${labels}</svg>${nowTip}<span class="pill cat scrub-tip" id="scrubTip" hidden></span></div>`;
  chartScrub = { nb, last, W, H, cum, buckets, xAt, yAt, per, P, col };
  dayCard.hidden = true; dayCard.innerHTML = '';

  const hashN = n => { let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const cloud = `<div class="cloud" aria-hidden="false">${rows.slice(0, 8).map(([name, sum]) => {
    const h = hashN(name), rot = (h % 25) - 12, dy = (h >> 3) % 9 - 4, ci = catInfo(statType, name);
    return `<button type="button" class="ctag" data-cat="${esc(name)}" style="--rot:${rot}deg;--dy:${dy}px;${cs(ci)}">${esc(name)}<b>${Math.round(sum / total * 100)}%</b></button>`;
  }).join('')}</div>`;
  catList.innerHTML = `${cloud}<h3>По категориям</h3><ul class="cats">${rows.map(([name, sum]) => {
    const ci = catInfo(statType, name), pc = sum / total * 100;
    return `<li class="${statCat === name ? 'on' : ''}" data-cat="${esc(name)}" role="button" tabindex="0" aria-pressed="${statCat === name}" style="${cs(ci)}"><div class="cat-top"><span class="cat-ico ci" aria-hidden="true">${cIcon(ci)}</span><span class="nm">${esc(name)}</span><span class="pc">${pc < 1 ? '<1' : Math.round(pc)}%</span>${pill(sum, statType, ci)}</div><div class="bar"><i style="width:${Math.max(pc, 2).toFixed(1)}%"></i></div></li>`;
  }).join('')}</ul>`;
}

/* ---------- Вкладки ---------- */
let tabPushed = false, payFrom = 'acc';
function showTab(name, fromPop) {
  if (name !== 'ops' && sel.on) { sel.on = false; sel.ids.clear(); $('#opsSel span').textContent = 'Выбрать'; }
  tab = name;
  $$('.screen').forEach(s => { s.hidden = s.dataset.screen !== name; });
  const navName = name === 'ops' ? 'home' : name === 'pay' ? payFrom : name;
  $$('.nav-b').forEach(b => { const on = b.dataset.tab === navName; if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); const i = $('i[data-ic]', b); if (i) i.innerHTML = on ? MD.iconFill(i.dataset.ic) : icon(i.dataset.ic); });
  if (!fromPop) {
    if (name !== 'home' && !tabPushed) { history.pushState({ tab: 1 }, ''); tabPushed = true; }
    else if (name === 'home' && tabPushed) { ignorePops++; history.back(); tabPushed = false; }
  }
  window.scrollTo(0, 0);
  render();
  renderBulkBar();
}
/* Смена месяца: короткий скелетон, потом данные */
let skelT = null;
function setMonth(y, m) {
  if (y === ym.y && m === ym.m) return;
  ym = { y, m };
  renderMonthBars();
  document.body.classList.add('skel');
  clearTimeout(skelT);
  skelT = setTimeout(() => { document.body.classList.remove('skel'); render(); }, 220);
}
function shiftMonth(d) { if (tab === 'stats') { shiftPeriod(d); return; } const dt = new Date(ym.y, ym.m + d, 1); setMonth(dt.getFullYear(), dt.getMonth()); buzz(6); }
(() => {
  let sx = null, sy = 0, zone = null;
  document.addEventListener('touchstart', e => {
    if (e.target.closest('.curve-box')) { zone = null; return; }
    zone = e.target.closest('.monthbar, .tiles, #catCard'); if (!zone) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (sx === null || !zone) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null; zone = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) shiftMonth(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
/* Скраббинг графика пальцем: плашка с суммой над пальцем, лёгкий отклик на каждом дне */
(() => {
  let down = false, lastI = -1;
  const upd = e => {
    const c = chartScrub, box = $('#curveBox'); if (!c || !box) return;
    const svg = $('svg.days', box), r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * c.W;
    let i = Math.round((x - 8) / ((c.W - 16) / Math.max(1, c.nb - 1))); i = Math.max(0, Math.min(c.last, i));
    const mark = $('#scrubMark', box), tip = $('#scrubTip', box), lab = c.per.kind !== 'year' && c.P.days <= 62 ? dd(addD(c.P.from, i)) : c.buckets[i].l;
    mark.hidden = false; mark.setAttribute('transform', `translate(${c.xAt(i).toFixed(1)} 0)`); mark.querySelector('circle').setAttribute('cy', c.yAt(c.cum[i]).toFixed(1));
    tip.hidden = false; tip.textContent = `${lab} · ${maskT(money(c.cum[i]))}`;
    tip.style.left = `${Math.min(86, Math.max(14, c.xAt(i) / c.W * 100))}%`; tip.style.top = `${Math.max(2, c.yAt(c.cum[i]) / (c.H + 22) * 100)}%`;
    const nt = $('.now-tip', box); if (nt) nt.hidden = true;
    if (i !== lastI) { lastI = i; buzz(4); }
  };
  const end = () => { down = false; lastI = -1; const box = $('#curveBox'); if (!box) return; const m = $('#scrubMark', box), t = $('#scrubTip', box), nt = $('.now-tip', box); if (m) m.hidden = true; if (t) t.hidden = true; if (nt) nt.hidden = false; };
  document.addEventListener('pointerdown', e => { if (e.target.closest('.curve-box')) { down = true; upd(e); } });
  document.addEventListener('pointermove', e => { if (down) upd(e); });
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();
$$('.nav-b').forEach(b => b.addEventListener('click', () => { buzz(8); showTab(b.dataset.tab); }));
document.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) { showTab(tab === 'pay' ? payFrom : 'home'); return; }
  const g = e.target.closest('[data-go]');
  if (g) showTab(g.dataset.go);
  if (e.target.closest('[data-go-pay]')) openPayScreen();
  const sn = e.target.closest('[data-savenow]');
  if (sn) { openGoal(sn.dataset.savenow); const g = state.goals.find(x => x.id === sn.dataset.savenow), per = g && G.perPeriodNow(g, new Date()); if (per && $('#goalAmt')) $('#goalAmt').value = String(per); }
  const rg = e.target.closest('[data-remindgoal]');
  if (rg) {
    const [id, day] = rg.dataset.remindgoal.split('|'), g = state.goals.find(x => x.id === id);
    if (g) { g.remind.on = true; g.remind.day = Number(day); save(); afterDataChange(); render(); toast(`Напомню откладывать ${G.dayName(gUnit(g), Number(day))}`, null, null, 'happy'); }
  }
  if (e.target.closest('[data-add]')) { buzz(10); openTx(); }
  const pw = e.target.closest('[data-paywrite]');
  if (pw) { const [id, mk] = pw.dataset.paywrite.split('|'); payWrite(id, mk); }
  if (e.target.closest('[data-newpay]')) startNewPay();
  const ms = e.target.closest('[data-mshift]');
  if (ms) shiftMonth(Number(ms.dataset.mshift));
  if (e.target.closest('[data-mnow]')) { const n = new Date(); setMonth(n.getFullYear(), n.getMonth()); }
});
$('#s-ops').addEventListener('click', e => {
  const f = e.target.closest('[data-ft]');
  if (f) { opsType = f.dataset.ft; renderOps(); }
});
$('#periodBar').addEventListener('change', e => { if (e.target.id === 'perFrom') per.from = e.target.value; if (e.target.id === 'perTo') per.to = e.target.value; renderStats(); });
$('#opsSearch').addEventListener('input', e => { opsQuery = e.target.value; renderOps(); });
$('#s-stats').addEventListener('click', e => {
  const pk = e.target.closest('[data-pk]');
  if (pk) { per.kind = pk.dataset.pk; if (per.kind === 'range' && !per.from) { per.to = today(); per.from = ymd(addD(new Date(), -29)); } statCat = null; renderStats(); return; }
  const ps = e.target.closest('[data-pshift]');
  if (ps) {
    shiftPeriod(Number(ps.dataset.pshift)); return;
  }
  if (e.target.closest('[data-pnow]')) { per.anchor = new Date(); per.year = new Date().getFullYear(); ym = { y: now0.getFullYear(), m: now0.getMonth() }; renderStats(); return; }
  const f = e.target.closest('[data-st]');
  if (f) { statType = f.dataset.st; statCat = null; renderStats(); }
  const c = e.target.closest('[data-cat]');
  if (c) { statCat = statCat === c.dataset.cat ? null : c.dataset.cat; buzz(6); renderStats(); }
});
document.addEventListener('click', e => { const hs = e.target.closest('[data-hshift]'); if (hs) shiftMonth(Number(hs.dataset.hshift)); });
{ // свайп по баланс-блоку меняет месяц
  let sx = null, sy = 0;
  const hero = document.querySelector('.hero');
  hero.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  hero.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftMonth(dx < 0 ? 1 : -1); }, { passive: true });
}
/* Имя в профиле: показывается в приветствии на главной */
$('#nameIn').addEventListener('input', e => { state.name = e.target.value.replace(/\s+/g, ' ').slice(0, 30); save(); renderHome(); });
$('#nameIn').addEventListener('blur', e => { state.name = state.name.trim(); e.target.value = state.name; save(); renderHome(); renderAccount(); });
$('#btnEye').addEventListener('click', () => {
  hide = !hide;
  try { localStorage.setItem(HIDE_KEY, hide ? '1' : '0'); } catch (_) {}
  render();
  toast(hide ? 'Суммы скрыты' : 'Суммы показаны');
});

/* ---------- Слои (листы/диалоги) + кнопка «Назад» ---------- */
const layers = [];
let ignorePops = 0;
function openLayer(el, tries = 0) {
  if (layers.includes(el)) return;                  // двойное нажатие на кнопку не открывает окно дважды
  /* Пока идёт возврат назад после закрытия другого слоя, историю не трогаем: иначе вернёмся на пустую страницу */
  if (ignorePops > 0 && tries < 20) { setTimeout(() => openLayer(el, tries + 1), 30); return; }
  $('#toast').hidden = true;
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
  setTimeout(() => nudgeRefresh(false), 700);
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

function confirmDlg(title, text, yes = 'Удалить', opts = {}) {
  return new Promise(res => {
    const l = $('#lyConfirm');
    $('#cfTitle').textContent = title; $('#cfText').textContent = text; $('#cfYes').textContent = yes;
    $('#cfYes').className = 'btn ' + (opts.tone === 'primary' ? 'primary' : 'danger-solid');
    $('#cfNo').textContent = opts.no || 'Отмена';
    const ex = $('#cfExtra'); ex.hidden = !opts.extra; ex.textContent = opts.extra || '';
    ex.onclick = () => { l._onClose = null; fin('extra'); closeLayer(l); };
    let done = false;
    const fin = v => { if (done) return; done = true; res(v); };
    l._onClose = () => fin(false);
    $('#cfYes').onclick = () => { l._onClose = null; fin(true); closeLayer(l); };
    $('#cfNo').onclick = () => closeLayer(l);
    openLayer(l);
  });
}

let toastT = null;
/* Тост снизу: 4 секунды, с действием («Вернуть», «Отметить») шесть и больше */
function toast(msg, actionLabel, action, pose, ms) {
  const t = $('#toast'), dur = ms || (actionLabel ? 6000 : 4000);
  t.hidden = true; void t.offsetWidth;
  t.style.transform = ''; t.style.opacity = ''; t.style.setProperty('--tms', dur + 'ms');
  t.innerHTML = (pose ? `<span class="toast-m">${MD.mascot(pose, msg.length > 60 ? 44 : 30)}</span>` : '') + `<span>${esc(msg.split('\n')[0])}${msg.indexOf('\n') > 0 ? `<small class="t2">${esc(msg.split('\n').slice(1).join(' '))}</small>` : ''}</span>` + (actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : '');
  if (actionLabel) $('button', t).onclick = () => { clearTimeout(toastT); t.hidden = true; action(); };
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, dur);
}
/* Смахнуть тост вправо */
{ const t = document.getElementById('toast'); let sx = null, dx = 0;
  t.addEventListener('touchstart', e => { sx = e.touches[0].clientX; dx = 0; t.style.transition = 'none'; }, { passive: true });
  t.addEventListener('touchmove', e => { if (sx === null) return; dx = Math.max(0, e.touches[0].clientX - sx); t.style.transform = `translateX(${dx}px)`; t.style.opacity = String(1 - Math.min(1, dx / 220)); }, { passive: true });
  t.addEventListener('touchend', () => { if (sx === null) return; sx = null; t.style.transition = ''; if (dx > 70) { clearTimeout(toastT); t.hidden = true; } t.style.transform = ''; t.style.opacity = ''; }, { passive: true }); }
const undoToast = (msg, undo) => toast(msg, 'Отмена', undo, null, 6000);
const showErr = (el, msg) => { el.textContent = msg; el.hidden = false; };
const hideErr = el => { el.hidden = true; };

/* ---------- Запись (добавление / правка) ---------- */
let txBusy = false;
/* Десятичный разделитель один: запятая. Точку заменяем при вводе */
document.addEventListener('input', e => { const t = e.target; if (t && t.matches && t.matches('input[inputmode=decimal]') && t.value.indexOf('.') >= 0) { const p = t.selectionStart; t.value = t.value.replace(/\./g, ','); try { t.setSelectionRange(p, p); } catch (_) {} } }, true);
const tx = { cur: null, orig: null, last: null, type: 'expense', cat: '', acc: null, editId: null, pay: null, draftIdx: null, catOpen: false, noteOpen: false };
const OTHER = 'Другое';
function renderTxForm() {
  $$('#lyTx .seg-b').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === tx.type)));
  $('#txCur').textContent = sym(tx.cur || state.currency);
  renderCurRow();
  /* При правке интерфейс короче: категория одной строкой («Изменить» раскрывает сетку), а не пустая форма заново */
  const editing = !!tx.editId || tx.draftIdx != null, open = !editing || tx.catOpen || !tx.cat;
  $('#txCats').hidden = !open;
  $('#txCats').innerHTML = CATS[tx.type].map(c =>
    `<button type="button" role="radio" class="cat-tile" data-cat="${esc(c[0])}" aria-checked="${c[0] === tx.cat}"><span class="ci" style="${cs(c)};--on:${onColor(c[2])}" aria-hidden="true">${cIcon(c)}<span class="tick">${icon('check')}</span></span><span>${esc(c[0])}${c[3] && c[3].isNew ? '<em class="newb">new</em>' : ''}</span></button>`).join('');
  const cc = $('#txCatCur'), ci = tx.cat ? catInfo(tx.type, tx.cat) : null;
  cc.hidden = open;
  if (ci) cc.innerHTML = `<span class="ci" style="${cs(ci)}" aria-hidden="true">${cIcon(ci)}</span><b>${esc(tx.cat)}</b><span class="ch">Изменить</span>`;
  const other = tx.cat === OTHER, showNote = other || tx.noteOpen || !!$('#txNote').value;
  $('#txNoteF').hidden = !showNote; $('#txNoteBtn').hidden = showNote;
  $('#txNoteL').textContent = other ? 'Что именно? (обязательно)' : 'Заметка (необязательно)';
  $('#txNoteF').classList.toggle('err', false);
  hideErr($('#txNoteErr'));
  $('#txSaveT').textContent = editing && tx.editId ? 'Сохранить изменения' : 'Сохранить';
  syncSave();
  syncDateChips();
  $('#txNoteX').hidden = !$('#txNote').value;
}
$('#txCatCur').addEventListener('click', () => { tx.catOpen = true; renderTxForm(); });
$('#txNoteBtn').addEventListener('click', () => { tx.noteOpen = true; renderTxForm(); setTimeout(() => $('#txNote').focus(), 40); });
/* Валюта операции: подписка в долларах, евро или рублях пересчитывается в основную валюту по курсу на дату */
function renderCurRow() {
  const cur = tx.cur || state.currency;
  $('#txCurRow').innerHTML = Object.keys(CURRENCIES).map(c => `<button type="button" role="radio" class="chip" data-txcur="${c}" aria-checked="${c === cur}">${c}</button>`).join('');
  updateCurNote();
}
let curNoteSeq = 0;
async function updateCurNote() {
  const cur = tx.cur || state.currency, el = $('#txCurNote'), a = parseAmount($('#txAmount').value), seq = ++curNoteSeq;
  if (cur === state.currency || !(a > 0)) { el.hidden = true; return; }
  const date = parseYmd($('#txDate').value) ? $('#txDate').value : today();
  const r = await MD.rates.convert(a, cur, state.currency, date);
  if (seq !== curNoteSeq) return;
  el.hidden = false; el.textContent = `${r.est ? '≈ ' : ''}${money(r.amount)} по курсу на ${parseYmd(date).getDate()} ${MONTHS_G[parseYmd(date).getMonth()]}${r.est ? ' (курс примерный)' : ''}`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-txcur]'); if (!b) return; tx.cur = b.dataset.txcur; $('#txCur').textContent = sym(tx.cur); renderCurRow(); });
function syncSave() { $('#txSave').disabled = !(parseAmount($('#txAmount').value) > 0 && tx.cat); }
$('#txAmount').addEventListener('input', e => {
  let v = e.target.value.replace(/[^\d.,]/g, '');
  const i = v.search(/[.,]/);
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/[.,]/g, '').slice(0, 2);
  if (v !== e.target.value) e.target.value = v;
  hideErr($('#txAmountErr')); syncSave(); updateCurNote();
});
$('#txNote').addEventListener('input', () => { $('#txNoteF').classList.remove('err'); hideErr($('#txNoteErr')); $('#txNoteX').hidden = !$('#txNote').value; });
$('#txNoteX').addEventListener('click', () => { $('#txNote').value = ''; $('#txNoteX').hidden = true; $('#txNote').focus(); renderTxForm(); });
$('#dOther').addEventListener('click', () => { const d = $('#txDate'); try { d.showPicker(); } catch (_) { d.focus(); d.click(); } });
/* Быстрые даты: те, что вносят чаще всего, и выбранная вручную, в начале списка */
function freqDates() {
  const t0 = today(), y = new Date(); y.setDate(y.getDate() - 1); const y0 = ymd(y);
  const lim = new Date(); lim.setDate(lim.getDate() - 120); const l0 = ymd(lim);
  const cnt = {};
  state.tx.forEach(t => { if (t.date >= l0 && t.date <= t0 && t.date !== t0 && t.date !== y0) cnt[t.date] = (cnt[t.date] || 0) + 1; });
  const list = Object.keys(cnt).filter(d => cnt[d] >= 2).sort((a, b) => cnt[b] - cnt[a] || (a < b ? 1 : -1)).slice(0, 2);
  const v = $('#txDate').value;
  if (v && v !== t0 && v !== y0 && !list.includes(v) && parseYmd(v) && tx.picked) list.unshift(v);
  return list.slice(0, 3);
}
function renderDateQuick() {
  const v = $('#txDate').value;
  $('#dQuick').innerHTML = freqDates().map(d => { const dt = parseYmd(d); return `<button type="button" class="chip" data-dq="${d}" aria-checked="${v === d}">${dt.getDate()} ${MONTHS_G[dt.getMonth()]}</button>`; }).join('');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-dq]'); if (b) { $('#txDate').value = b.dataset.dq; syncDateChips(); } });
function syncDateChips() {
  const v = $('#txDate').value, y = new Date(); y.setDate(y.getDate() - 1);
  renderDateQuick();
  const quick = freqDates(), isT = v === today(), isY = v === ymd(y), other = !isT && !isY && !!parseYmd(v) && !quick.includes(v);
  $('#dToday').setAttribute('aria-checked', String(isT));
  $('#dYest').setAttribute('aria-checked', String(isY));
  $('#dOther').setAttribute('aria-checked', String(other));
  $('#dOther').textContent = other ? `${parseYmd(v).getDate()} ${MONTHS_G[parseYmd(v).getMonth()]}` : 'Другая дата';
}
function openTx(id, opts = {}) {
  ensureAccount();
  const t = id && state.tx.find(x => x.id === id);
  tx.editId = t ? t.id : null;
  tx.draftIdx = opts.draftIdx == null ? null : opts.draftIdx;
  tx.pay = opts.pay || null; tx.catOpen = false; tx.picked = !!opts.keepDate; tx.cur = t && t.orig ? t.orig.cur : null;
  $('#txDone').hidden = true; $('#txForm').hidden = false;
  tx.type = t ? t.type : (opts.type || 'expense');
  tx.cat = t ? t.cat : (opts.cat && CATS[tx.type].some(c => c[0] === opts.cat) ? opts.cat : '');   // категорию выбирает человек: без неё «Сохранить» не активна
  tx.acc = t ? t.acc : state.accounts[0].id;
  $('#txTitle').textContent = t || tx.draftIdx != null ? 'Изменить запись' : tx.type === 'income' ? 'Новый доход' : 'Новая запись';
  $('#txAmount').value = t ? String(t.orig ? t.orig.a : t.amount).replace('.', ',') : opts.amount ? String(opts.amount).replace('.', ',') : '';
  $('#txNote').value = t ? t.note : opts.note || ''; tx.noteOpen = !!$('#txNote').value;
  $('#txDate').value = t ? t.date : parseYmd(opts.date) ? opts.date : today();
  $('#txDelete').hidden = !t;
  hideErr($('#txAmountErr'));
  endTxVoice();
  renderTxForm();
  const ly = $('#lyTx');
  ly._onClose = () => {
    MD.voice.cancel(); endTxVoice();
    if (tx.draftIdx != null) { tx.draftIdx = null; setTimeout(() => { if (draft.length) { renderDraft(); openLayer($('#lyDraft')); } }, 0); }   // закрыл правку строки: возвращаемся к «Всё верно?»
  };
  openLayer(ly);
  if (opts.voice) setTimeout(startTxVoice, 220);
}
$('#lyTx').addEventListener('click', e => {
  const t = e.target.closest('[data-type],[data-cat]');
  if (!t) return;
  if (t.dataset.type) { tx.type = t.dataset.type; if (!CATS[tx.type].some(c => c[0] === tx.cat)) tx.cat = ''; else if (tx.type === 'income' && tx.cat === 'Подарки') tx.cat = 'Подарок'; }
  if (t.dataset.cat) { tx.cat = t.dataset.cat; if (tx.editId || tx.draftIdx != null) tx.catOpen = false; }
  buzz(6);
  renderTxForm();
  if (t.dataset.cat === OTHER) setTimeout(() => $('#txNote').focus(), 60);
});
$('#dToday').addEventListener('click', () => { $('#txDate').value = today(); syncDateChips(); });
$('#dYest').addEventListener('click', () => { const y = new Date(); y.setDate(y.getDate() - 1); $('#txDate').value = ymd(y); syncDateChips(); });
$('#txDate').addEventListener('input', () => { tx.picked = true; syncDateChips(); });
$('#txForm').addEventListener('submit', async e => {
  e.preventDefault();
  const amt = parseAmount($('#txAmount').value);
  const err = $('#txAmountErr');
  if (!(amt > 0)) { showErr(err, 'Впиши сумму, например 150.'); $('#txAmount').focus(); return; }
  if (!tx.cat) { showErr(err, 'Выбери категорию, и сохраним.'); return; }
  hideErr(err);
  const note = $('#txNote').value.trim().slice(0, 120);
  if (tx.cat === OTHER && !note) {
    $('#txNoteF').classList.add('err'); showErr($('#txNoteErr'), 'Напиши, что именно: например, «ремонт часов».'); $('#txNote').focus(); return;
  }
  const date = parseYmd($('#txDate').value) ? $('#txDate').value : today();
  if (txBusy) return; txBusy = true; setTimeout(() => { txBusy = false; }, 600);   // второе нажатие «Сохранить» подряд игнорируем
  const cur = tx.cur || state.currency;
  let amountBase = round2(amt), orig = null;
  if (cur !== state.currency) {
    const keep = tx.editId && state.tx.find(t => t.id === tx.editId);
    if (keep && keep.orig && keep.orig.cur === cur && keep.date === date && keep.orig.rate) { amountBase = round2(amt * keep.orig.rate); orig = { a: round2(amt), cur, rate: keep.orig.rate, est: keep.orig.est }; }
    else { const r = await MD.rates.convert(amt, cur, state.currency, date); amountBase = r.amount; orig = { a: round2(amt), cur, rate: r.rate, est: r.est }; }
  }
  const rec = { type: tx.type, amount: amountBase, cat: tx.cat, acc: tx.acc, date, note, orig };
  if (tx.draftIdx != null) {                       // правка строки в «Всё верно?»: возвращаемся туда
    draft[tx.draftIdx] = rec; tx.draftIdx = null;
    closeLayer($('#lyTx')); renderDraft(); openLayer($('#lyDraft')); return;
  }
  const ex = tx.editId && state.tx.find(t => t.id === tx.editId);
  const first = !state.tx.length, pay = tx.pay;
  let added = null;
  if (ex) Object.assign(ex, rec); else { added = { id: uid(), ...rec, ts: Date.now() }; state.tx.push(added); }
  lastAddAt = Date.now();
  if (added && pay) markPaid(pay.id, pay.mk, added.id);
  save();
  const d = parseYmd(date); ym = { y: d.getFullYear(), m: d.getMonth() };
  buzz(15);
  if (added && !pay) {                             // остаёмся в окне: можно добавить ещё на это же число
    showTab('home');
    const lab = `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
    tx.firstAdd = first;
    $('#txForm').hidden = true; $('#txDone').hidden = false;
    $('#txDoneT').textContent = 'Записано'; $('#txDoneD').textContent = lab;
    $('#moreExp').textContent = `Ещё расход на ${lab}`; $('#moreInc').textContent = `Ещё доход на ${lab}`;
    afterAdd([added], false, null, true);
    return;
  }
  closeLayer($('#lyTx'));
  if (!ex) showTab('home'); else render();
  if (added) afterAdd([added], first, pay); else toast('Изменения сохранены', null, null, 'joy');
});
document.addEventListener('click', e => {
  const m = e.target.closest('[data-more]');
  if (m) {
    tx.type = m.dataset.more; tx.cat = ''; tx.editId = null; tx.pay = null; tx.cur = null; tx.catOpen = false; tx.noteOpen = false;
    $('#txAmount').value = ''; $('#txNote').value = ''; hideErr($('#txAmountErr'));
    $('#txTitle').textContent = tx.type === 'income' ? 'Новый доход' : 'Новая запись';
    $('#txDone').hidden = true; $('#txForm').hidden = false; $('#txDelete').hidden = true;
    renderTxForm(); setTimeout(() => $('#txAmount').focus(), 60); return;
  }
  if (e.target.closest('#txDoneOk')) { closeLayer($('#lyTx')); if (tx.firstAdd) { tx.firstAdd = false; setTimeout(offerLogin, 700); } }
});
$('#txDelete').addEventListener('click', () => {
  const id = tx.editId;
  if (!id) return;
  closeLayer($('#lyTx')); deleteTx(id);
});

/* ---------- Категории: переименовать, значок, цвет, свои; сами заводятся из повторяющихся названий ---------- */
const catNorm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const catExists = (type, name) => CATS[type].some(c => catNorm(c[0]) === catNorm(name));
function catCfgFor(type, key, custom) {
  let o = state.cats.find(x => x.t === type && x.k === key && !!x.custom === !!custom);
  if (!o) { o = { k: key, t: type, n: '', i: '', c: '', custom: !!custom, isNew: false, ts: 0 }; state.cats.push(o); }
  return o;
}
function renameInData(type, from, to) {
  if (from === to) return;
  state.tx.forEach(t => { if (t.type === type && t.cat === from) t.cat = to; });
  if (type === 'expense') state.rec.list.forEach(p => { if (p.cat === from) p.cat = to; });
}
/* patch: { n, i, c } для встроенной или своей категории; возвращает текст ошибки или '' */
function saveCat(type, entry, patch) {
  const meta = entry[3] || {}, old = entry[0];
  const name = (patch.n || old).replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!name) return 'Впиши название.';
  if (catNorm(name) !== catNorm(old) && catExists(type, name)) return 'Такая категория уже есть.';
  if (name === 'Другое' && old !== 'Другое') return 'Название занято.';
  const o = catCfgFor(type, meta.key, !!meta.custom);
  if (meta.custom) { o.n = name; } else { o.n = name === meta.key ? '' : name; }
  if (patch.i) o.i = patch.i; if (patch.c) o.c = patch.c;
  renameInData(type, old, name);
  save(); MD.applyCats(state.cats); render(); return '';
}
function addCat(type, name, iconName, color, isNew) {
  const nm = name.replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!nm || catExists(type, nm)) return null;
  const o = { k: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: type, n: nm, i: iconName || 'grid', c: color || MD.CAT_PALETTE[state.cats.filter(x => x.custom).length % MD.CAT_PALETTE.length], custom: true, isNew: !!isNew, ts: Date.now() };
  state.cats.push(o); MD.applyCats(state.cats); return o;
}
function removeCat(type, entry) {
  const meta = entry[3] || {};
  state.tx.forEach(t => { if (t.type === type && t.cat === entry[0]) { if (!t.note) t.note = entry[0]; t.cat = OTHER; } });
  if (type === 'expense') state.rec.list.forEach(p => { if (p.cat === entry[0]) p.cat = OTHER; });
  state.cats = state.cats.filter(x => !(x.t === type && x.k === meta.key && !!x.custom === !!meta.custom));
  save(); MD.applyCats(state.cats); render();
}
function resetCat(type, entry) {
  const meta = entry[3] || {}; if (meta.custom) return;
  renameInData(type, entry[0], meta.key);
  state.cats = state.cats.filter(x => !(x.t === type && x.k === meta.key && !x.custom));
  save(); MD.applyCats(state.cats); render();
}
/* «new» гаснет, когда категорию впервые выбрали */
function markCatUsed(type, name) {
  const o = state.cats.find(x => x.custom && x.t === type && x.n === name && x.isNew);
  if (o) { o.isNew = false; save(); MD.applyCats(state.cats); }
}
/* Одинаковые названия в «Другом» два раза и больше: Фин заводит из них категорию */
function autoCategory(items) {
  let made = null;
  for (const it of items) {
    if (it.cat !== OTHER || !it.note) continue;
    const key = catNorm(it.note); if (key.length < 3) continue;
    const same = state.tx.filter(t => t.type === it.type && t.cat === OTHER && catNorm(t.note) === key);
    if (same.length < 2 || catExists(it.type, it.note)) continue;
    const name = it.note.replace(/\s+/g, ' ').trim(); const nm = name.charAt(0).toUpperCase() + name.slice(1);
    const o = addCat(it.type, nm, 'grid', null, true); if (!o) continue;
    same.forEach(t => { t.cat = o.n; });
    save(); made = o;
  }
  return made;
}

/* После новой записи: тост «Записано». Если она похожа на платёж, Фин предлагает отметить одним нажатием. Первая запись: предложить войти */
function afterAdd(items, first, pay, quiet) {
  let m = null, hit = null;
  items.forEach(it => markCatUsed(it.type, it.cat));
  const madeCat = autoCategory(items);
  if (pay) { if (!askClash(pay.id, items[0].date)) toast('Записано, платёж отмечен', null, null, 'joy'); }
  else {
    for (const it of items) { m = R.matchTx(state.rec.list, it); if (m) { hit = it; break; } }
    const sim = !m && items.length === 1 ? R.similar(state.rec.list, items[0]) : null;
    if (sim && sim.more) {
      markPaid(sim.p.id, sim.mk, items[0].id); save(); render();
      toast(`Класс, в этом месяце ты вносишь платёж за «${cap(sim.p.name)}» больше, чем нужно. Так держать!` + (R.isLoan(sim.p) ? `\nЕсли вносить больше нужного, кредит выплатится быстрее ${R.earlier(sim.p, sim.extra)}.` : ''), null, null, 'joy', 7000);
    } else if (m) toast(`Записано. Это оплата «${cap(m.p.name)}»?`, 'Отметить', () => { markPaid(m.p.id, m.mk, hit.id); save(); render(); if (!askClash(m.p.id, hit.date)) toast(`Отмечено: ${cap(m.p.name)}`, null, null, 'happy'); }, 'joy', 8000);
    else if (!quiet || madeCat) toast(madeCat ? `Записано. Завёл категорию «${madeCat.n}»` : items.length > 1 ? `Записано: ${items.length}` : 'Записано', null, null, 'joy');
  }
  maybeAskFest(items);
  if (first) setTimeout(offerLogin, 1800);
}
function offerLogin() {
  if (!cloud.enabled || me || layers.length) return;
  let asked = false; try { asked = localStorage.getItem('moidengi_loginask') === '1'; localStorage.setItem('moidengi_loginask', '1'); } catch (_) {}
  if (!asked) MD.authUI.show();
}

/* Голос прямо в форме: ни перехода на другой экран, ни зависшей записи */
function endTxVoice() {
  $('#txForm').classList.remove('rec');
  $('#txVoiceLive').hidden = true;
}
function startTxVoice() {
  if (MD.voice.active) return;
  hideErr($('#txAmountErr'));
  if (!MD.voice.supported()) { showErr($('#txAmountErr'), MD.voiceMessage('unsupported')); return; }
  const live = $('#txVoiceText'), head = $('#txVoiceH');
  $('#txForm').classList.add('rec');
  $('#txVoiceLive').hidden = false;
  head.textContent = 'Включаю микрофон…'; live.textContent = 'Скажи, например: «вчера такси 12»'; live.classList.remove('has');
  MD.voice.start({
    onStart: () => { head.textContent = 'Слушаю'; buzz(12); },
    onPartial: t => { live.textContent = t; live.classList.add('has'); },
    onEnd: t => { endTxVoice(); spoken(t, true); },
    onError: code => { endTxVoice(); showErr($('#txAmountErr'), MD.voiceMessage(code)); }
  });
}
const HINT = 'Не разобрал. Попробуй так: «вчера такси 12».';
/* Сказанное или написанное: после разбора всегда экран «Всё верно?», где любую строку можно изменить */
function spoken(text, fromSheet) {
  ensureAccount();
  const items = normalizeItems(MD.parseNotes(String(text || ''), { today: new Date(), accounts: state.accounts }));
  if (!items.length) { if (fromSheet) showErr($('#txAmountErr'), HINT); else toast(HINT, null, null, 'oops'); return false; }
  buzz(15);
  draft = items; renderDraft();
  if (!$('#lyTx').hidden) closeLayer($('#lyTx'));
  openLayer($('#lyDraft'));
  return true;
}
$('#txVoice').addEventListener('click', startTxVoice);
$('#txVoiceStop').addEventListener('click', () => MD.voice.stop());
$('#txVoiceCancel').addEventListener('click', () => { MD.voice.cancel(); endTxVoice(); });

/* Быстрая запись на главной: поле «скажи или напиши» и микрофон */


/* Удаление без вопросов: «Удалено» и «Вернуть» не меньше пяти секунд */
function deleteTx(id) {
  const i = state.tx.findIndex(t => t.id === id);
  if (i < 0) { render(); return; }
  const [gone] = state.tx.splice(i, 1);
  save(); render(); buzz(15);
  nudgeRefresh(true);
  undoToast('Запись удалена', () => { state.tx.push(gone); save(); render(); nudgeRefresh(true); });
}

function toggleSel(id) { if (sel.ids.has(id)) sel.ids.delete(id); else sel.ids.add(id); buzz(6); renderOps(); renderBulkBar(); }
function setSelMode(on) {
  sel.on = on; sel.ids.clear();
  $('#opsSel span').textContent = on ? 'Готово' : 'Выбрать';
  renderOps(); renderBulkBar();
}
function renderBulkBar() {
  const n = sel.ids.size;
  $('#bulkBar').hidden = !(sel.on && tab === 'ops');
  $('#bulkCount').textContent = n ? `Выбрано: ${n}` : 'Отметь записи';
  $$('#bulkBar [data-bulk]').forEach(b => { b.disabled = !n; });
}
$('#opsSel').addEventListener('click', () => setSelMode(!sel.on));
document.addEventListener('click', e => {
  const b = e.target.closest('[data-bulk]'); if (!b || b.disabled || !sel.ids.size) return;
  const kind = b.dataset.bulk, ids = [...sel.ids], rows = state.tx.filter(t => sel.ids.has(t.id));
  if (kind === 'del') {
    const gone = rows.map(t => ({ ...t })); state.tx = state.tx.filter(t => !sel.ids.has(t.id));
    save(); setSelMode(false); render(); nudgeRefresh(true);
    undoToast(`Удалено записей: ${gone.length}`, () => { gone.forEach(t => state.tx.push(t)); save(); render(); });
    return;
  }
  const types = new Set(rows.map(t => t.type)), body = $('#bulkBody');
  const apply = patch => {
    const before = rows.map(t => ({ ...t }));
    rows.forEach(t => Object.assign(t, patch(t)));
    save(); setSelMode(false); closeLayer($('#lyBulk')); render();
    undoToast(`Изменено записей: ${rows.length}`, () => { before.forEach(o => { const t = state.tx.find(x => x.id === o.id); if (t) Object.assign(t, o); }); save(); render(); });
  };
  if (kind === 'date') {
    $('#bulkTitle').textContent = 'Новая дата';
    body.innerHTML = `<label class="field t"><input id="bulkDate" type="date" value="${today()}"><span>Дата для всех выбранных</span></label><div class="msg err" id="bulkErr" hidden></div><button class="btn primary wide" type="button" id="bulkOk">Применить</button>`;
    $('#bulkOk').onclick = () => { const v = $('#bulkDate').value; if (!parseYmd(v)) { showErr($('#bulkErr'), 'Выбери дату.'); return; } apply(() => ({ date: v })); };
  } else if (kind === 'cat') {
    $('#bulkTitle').textContent = 'Новая категория';
    const tp = types.size === 1 ? [...types][0] : null;
    body.innerHTML = tp ? `<div class="cat-grid" id="bulkCats">${CATS[tp].map(c => `<button type="button" class="cat-tile" data-bcat="${esc(c[0])}"><span class="ci" style="${cs(c)}">${cIcon(c)}</span><span>${esc(c[0])}</span></button>`).join('')}</div>`
      : '<div class="note">В выборе и расходы, и доходы. Выбери записи одного вида, чтобы поменять категорию.</div>';
    $('#bulkBody').onclick = ev => { const c = ev.target.closest('[data-bcat]'); if (c) apply(t => ({ cat: c.dataset.bcat })); };
  } else if (kind === 'note') {
    $('#bulkTitle').textContent = 'Новая заметка';
    body.innerHTML = `<label class="field"><input id="bulkNote" type="text" maxlength="120" placeholder=" " autocomplete="off"><span>Заметка для всех выбранных</span></label><button class="btn primary wide" type="button" id="bulkOk">Применить</button><button class="btn ghost wide" type="button" id="bulkClear">Очистить заметки</button>`;
    $('#bulkOk').onclick = () => apply(() => ({ note: $('#bulkNote').value.trim().slice(0, 120) }));
    $('#bulkClear').onclick = () => apply(() => ({ note: '' }));
  }
  openLayer($('#lyBulk'));
});

// Тап — правка, свайп влево — удаление
(() => {
  let sw = null, swiped = false;
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('.swipe .tx');
    if (!t || sel.on) return;
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
    if (s.dx < -96) deleteTx(s.id);
    else s.el.style.transform = '';
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  const open = e => { const t = e.target.closest('.swipe .tx'); if (!t || swiped) return; if (sel.on) { toggleSel(t.dataset.tx); return; } openTx(t.dataset.tx); };
  document.addEventListener('click', open);
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.swipe .tx')) { e.preventDefault(); if (sel.on) toggleSel(e.target.dataset.tx); else openTx(e.target.dataset.tx); } });
})();

/* ---------- Цели ---------- */
const G = MD.goals;
const GCOL = ['#5C8A3C', '#4A7FA8', '#B58A45', '#8A78AE', '#B8697F', '#4B9A97'];
const rampCol = i => `var(--r${Math.min(i + 1, 6)})`;
const gCol = g => GCOL[(g.nid || 0) % GCOL.length];
const gm = (g, n) => `${fmt(n)} ${sym(g.cur)}`;
const qm = n => `${fmt(n)} ${sym(quiz.cur)}`;
const goalPct = g => Math.min(100, Math.round(g.saved / g.target * 100));
/* Карточка цели: прогресс, остаток, взнос за период (неделя или месяц) и дедлайн */
const gUnit = g => (g.unit === 'week' ? 'week' : 'month');
function goalFacts(g) {
  const done = g.saved >= g.target, left = round2(Math.max(0, g.target - g.saved)), pl = G.periodsLeft(g, new Date());
  const dl = new Date(g.deadline + 'T00:00:00');
  return { done, left, monthly: done ? 0 : G.perPeriodNow(g, new Date()), dlText: `${dl.getDate()} ${MONTHS_G[dl.getMonth()]} ${dl.getFullYear()}`, over: !done && !pl };
}
const goalLeft = g => { const f = goalFacts(g); return f.done ? 'Копилка собрана' : f.over ? `Срок был ${f.dlText}` : `Дедлайн ${f.dlText}`; };
/* Сколько ещё внести в этом периоде (месяце или неделе): взнос минус то, что уже отложено сейчас */
function periodAsk(g) {
  const per = G.perPeriodNow(g, new Date()), T = new Date(), wk = gUnit(g) === 'week';
  const from = wk ? ymd(mondayOf(T)) : `${T.getFullYear()}-${pad(T.getMonth() + 1)}-01`, to = wk ? ymd(addD(mondayOf(T), 6)) : `${T.getFullYear()}-${pad(T.getMonth() + 1)}-31`;
  const did = round2((g.log || []).filter(x => x.d >= from && x.d <= to).reduce((s, x) => s + x.a, 0)), need = Math.max(0, round2(per - did));
  const when = wk ? 'на этой неделе' : 'в этом месяце';
  return need > 0 ? `Внести ${when}: ${gm(g, need)}` : `${cap(when)} уже отложено ${gm(g, did)}. Так держать!`;
}
const goalRows = (g, full) => {
  const f = goalFacts(g);
  return `<span class="goal-sub"><span>${esc(maskT(gm(g, g.saved)))} из ${esc(maskT(gm(g, g.target)))}</span><span>${f.done ? 'Готово' : esc(f.dlText)}</span></span>` +
    (full && !f.done ? `<span class="goal-sub"><span>${esc(cap(G.perWord(gUnit(g))))} ${esc(maskT(gm(g, f.monthly)))}</span><span>Осталось ${esc(maskT(gm(g, f.left)))}</span></span>` : '');
};
function renderGoals() {
  const el = $('#goalsBody'), list = state.goals;
  if (!list.length) {
    el.innerHTML = `<div class="goal-empty"><span class="emp-m" aria-hidden="true">${MD.mascot('think', 140)}</span><h2>Пока пусто</h2><p>Нажми «Новая копилка»: Фин спросит, на что копим, посчитает, сколько откладывать в месяц, и скажет, легко это или тяжеловато.</p><button class="btn primary" type="button" data-newgoal>Новая копилка</button></div>`;
    return;
  }
  const byCur = {}; list.forEach(g => { const c = g.cur || state.currency; byCur[c] = round2((byCur[c] || 0) + g.saved); });
  const sumTxt = Object.entries(byCur).map(([c, v]) => `${fmt(v)} ${sym(c)}`).join(' + '), act = list.filter(g => g.saved < g.target).length;
  el.innerHTML = `<div class="goal-rows">${list.map(g => `<button class="goal" data-goal="${esc(g.id)}" style="--gc:${gCol(g)}">
      <span class="goal-top"><span class="goal-dot" aria-hidden="true"></span><b>${esc(g.name)}</b><span class="goal-pct">${goalPct(g)}%</span></span>
      <span class="goal-bar"><i style="width:${goalPct(g)}%"></i></span>${goalRows(g)}
    </button>`).join('')}</div><div class="say-wrap">${MD.say('happy', `Отложено <em>${esc(maskT(sumTxt))}</em><small>${act} ${pluralN(act, 'копилка', 'копилки', 'копилок')} в работе</small>`, 64)}</div>`;
}
let openGoalId = null;
const WD_CH = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
/* Календарь взносов: полоса из девяти дней, сегодня всегда посередине. Ниже недели или месяцы цели квадратиками */
function goalCalendar(g) {
  const U = gUnit(g), st = G.strip(g, new Date()), T = new Date();
  const had = new Set((g.log || []).map(x => x.d)), from = g.created || '';
  const days = Array.from({ length: 9 }, (_, k) => {
    const d = addD(T, k - 4), key = ymd(d), cls = k === 4 ? 'td' : k > 4 ? 'fut' : '';
    const on = had.has(key);
    return `<span class="dsq ${cls}${on ? ' on' : ''}${!on && k < 4 && key >= from ? ' no' : ''}" aria-label="${d.getDate()} ${MONTHS_G[d.getMonth()]}${on ? ', откладывал' : ''}">${d.getDate()}</span>`;
  }).join('');
  const cells = st.cells.map(c => `<span class="pcell ${c.status}${c.full ? ' full' : ''}" title="${esc(maskT(money(c.sum)))}">${c.i + 1}</span>`).join('');
  return `<section class="gblock"><h3>Дни</h3><div class="dstrip" role="img" aria-label="Дни вокруг сегодняшнего. Закрашены дни, когда ты откладывал">${days}</div></section>
    <section class="gblock"><div class="h2-row"><h3>${U === 'week' ? 'Недели' : 'Месяцы'}</h3>${st.missed ? `<small class="muted">Пропущено: ${st.missed}</small>` : ''}</div><div class="pstrip">${cells}</div></section>`;
}
function remindBlock(g) {
  const r = g.remind, U = gUnit(g), on = r && r.on, sd = G.suggestDay(state.tx, U);
  const days = U === 'week' ? WD_CH.map((d, i) => `<button type="button" class="chip" data-gday="${i + 1}" aria-checked="${r.day === i + 1}">${d}</button>`).join('') : `<label class="field t"><input id="gDay" type="text" inputmode="numeric" maxlength="2" value="${r.day}"><span>Число месяца</span></label>`;
  return `<section class="gblock remind"><button class="rem-head" type="button" data-gremind="toggle" role="switch" aria-checked="${!!on}"><span class="rem-t"><b>Напоминать откладывать</b><small>Лучше ${esc(G.dayName(U, sd.day))}${sd.fromIncome ? ', когда приходят деньги' : ''}</small></span><span class="sw-t" aria-checked="${!!on}"></span></button>
    ${on ? `<div class="${U === 'week' ? 'day-chips' : 'chips'}" role="group" aria-label="${U === 'week' ? 'День недели' : 'День месяца'}">${days}</div><label class="field t"><input id="gTime" type="time" value="${esc(r.time)}"><span>Во сколько</span></label>` : ''}</section>`;
}
function drawGoal(g) {
  const done = g.saved >= g.target, pct = goalPct(g), per = G.perPeriodNow(g, new Date());
  const say = done ? ['joy', 'Копилка собрана! Можно собираться']
    : pct >= 50 ? ['happy', `Больше половины пути. Осталось ${esc(maskT(gm(g, round2(g.target - g.saved))))}`]
      : pct > 0 ? ['hello', `Начало положено. Осталось ${esc(maskT(gm(g, round2(g.target - g.saved))))}`]
        : ['think', 'Пока ноль. Отложи первую сумму'];
  const el = $('#goalDetail'); el.style.setProperty('--gc', gCol(g));
  el.innerHTML = `${MD.say(say[0], say[1], 64)}
    <div class="goal big"><span class="goal-top"><b>${esc(maskT(gm(g, g.saved)))}</b><span class="goal-pct">${pct}%</span></span>
    <span class="goal-bar"><i style="width:${pct}%"></i></span>${goalRows(g, true)}</div>
    ${done ? '' : `<form id="goalAdd" class="gblock key" novalidate>
      <div class="bal-row">${fld('goalAmt', 'Сколько отложил', { mode: 'decimal', unit: sym(g.cur) })}<button class="btn primary" type="submit">Отложить</button></div>
      ${per ? `<div class="note">${esc(periodAsk(g))}</div>` : ''}
      <div class="msg err" id="goalErr" hidden></div>
    </form>`}
    ${goalCalendar(g)}
    ${done ? '' : remindBlock(g)}
    <button class="btn danger" type="button" id="goalDel">Удалить копилку</button>`;
  paintIcons(el);
}
function openGoal(id) {
  const g = state.goals.find(x => x.id === id); if (!g) return;
  openGoalId = id;
  $('#goalTitle').textContent = g.name;
  drawGoal(g);
  openLayer($('#lyGoal'));
}
function startNewGoal() {
  const active = state.goals.filter(g => g.saved < g.target).length;
  if (active >= MD.sub.limit('goals')) return MD.sub.open('goals', openQuiz);
  openQuiz();
}
const goalClick = e => {
  const g = e.target.closest('[data-goal]');
  if (g) openGoal(g.dataset.goal);
  if (e.target.closest('[data-newgoal]')) startNewGoal();
};
$('#goalsBody').addEventListener('click', goalClick);
$('#goalNew').addEventListener('click', startNewGoal);

/* Пополнение цели вручную. Отложил больше, чем планировалось: Фин радуется */
function topUp(g, v) {
  const planned = G.perPeriodNow(g, new Date()), was = g.saved >= g.target;
  g.saved = round2(g.saved + v); (g.log = g.log || []).push({ d: today(), a: round2(v) });
  save(); render(); buzz(15); afterDataChange();
  const doneNow = !was && g.saved >= g.target;
  if (doneNow) toast(`Копилка собрана! Собрано ${gm(g, g.target)}`, null, null, 'joy', 6000);
  else if (planned > 0 && v > planned * 1.0001) toast(`Ты большой молодец! Отложил на ${gm(g, round2(v - planned))} больше плана. Надеюсь, это не навредит твоим финансам.`, null, null, 'joy', 6500);
  else toast('Отложено', null, null, 'happy');
}
$('#goalDetail').addEventListener('submit', e => {
  e.preventDefault();
  const g = state.goals.find(x => x.id === openGoalId); if (!g) return;
  const v = parseAmount($('#goalAmt').value), err = $('#goalErr');
  if (!(v > 0)) { showErr(err, 'Впиши сумму, например 150.'); return; }
  closeLayer($('#lyGoal'));
  topUp(g, v);
});
/* Напоминание о взносе: переключатель, день и время прямо в карточке цели */
$('#goalDetail').addEventListener('click', e => {
  const g = state.goals.find(x => x.id === openGoalId); if (!g) return;
  if (e.target.closest('[data-gremind]')) { g.remind.on = !g.remind.on; save(); afterDataChange(); openGoalKeep(g); return; }
  const d = e.target.closest('[data-gday]');
  if (d) { g.remind.day = Number(d.dataset.gday); save(); afterDataChange(); openGoalKeep(g); }
});
$('#goalDetail').addEventListener('change', e => {
  const g = state.goals.find(x => x.id === openGoalId); if (!g) return;
  if (e.target.id === 'gTime' && /^\d{2}:\d{2}$/.test(e.target.value)) { g.remind.time = e.target.value; save(); afterDataChange(); }
  if (e.target.id === 'gDay') { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= 28) { g.remind.day = v; save(); afterDataChange(); } }
});
function openGoalKeep(g) { const sh = $('#lyGoal .sheet'), y = sh.scrollTop; drawGoal(g); sh.scrollTop = y; }

$('#goalDetail').addEventListener('click', e => {
  if (!e.target.closest('#goalDel')) return;
  const i = state.goals.findIndex(x => x.id === openGoalId); if (i < 0) return;
  const [gone] = state.goals.splice(i, 1);
  save(); render(); closeLayer($('#lyGoal'));
  undoToast('Копилка удалена', () => { state.goals.splice(Math.min(i, state.goals.length), 0, gone); save(); render(); });
});

/* Разговор с Фином: вопросы, план, согласие или уточнения */
const KINDS = [['Отпуск', 'Билеты, отель'], ['Подушка безопасности', 'Запас на 3–6 месяцев'], ['Техника', 'Телефон, ноутбук'], ['Ремонт', 'Или переезд'], ['Подарок', 'Себе или близким'], ['Своя копилка', 'Назову сам']];
const STEP_NO = { kind: 1, custom: 1, target: 2, saved: 3, term: 4, free: 5, think: 5, plan: 6, tune: 6, tuneMonthly: 6, tuneTerm: 6, tuneTarget: 6, tuneIncome: 6 };
let quiz = null;
function openQuiz() {
  quiz = { cur: state.currency, deadline: null, step: 'kind', stack: [], name: '', target: 0, saved: 0, term: null, free: G.freeMoney(state.tx, new Date()), extra: 0, hadFree: false };
  quiz.hadFree = quiz.free !== null;
  renderQuiz();
  openLayer($('#lyQuiz'));
}
const qGo = step => { quiz.stack.push(quiz.step); quiz.step = step; renderQuiz(); };
const qIn = (id, label, unit) => `${fld(id, label, { mode: 'decimal', unit })}<div class="msg err" id="qErr" hidden></div>`;
const qBtn = (act, label, cls = 'primary', dis = false) => `<button class="btn ${cls} wide" type="button" data-qa="${act}" ${dis ? 'disabled' : ''}>${esc(label)}</button>`;
function planOf() { return G.planTerm({ target: quiz.target, saved: quiz.saved, n: quiz.term.n, unit: quiz.term.unit, free: quiz.cur === state.currency ? quiz.free : null }); }
/* Срок: быстрые варианты от двух недель до года и свой (число и неделя или месяц) */
const TERMS = [[2, 'week', '2 недели'], [1, 'month', '1 месяц'], [3, 'month', '3 месяца'], [6, 'month', '6 месяцев'], [12, 'month', '1 год'], [24, 'month', '2 года']];
function termHtml(act) {
  const q = quiz, u = q.termUnit || 'month';
  return `<div class="term-grid" role="radiogroup" aria-label="Срок">${TERMS.map(t => `<button type="button" role="radio" class="kind term" data-term="${t[0]}:${t[1]}" aria-checked="${q.termPick === t[0] + ':' + t[1]}"><b>${t[2]}</b></button>`).join('')}</div>
    <div class="fl">Или свой срок</div>
    <div class="term-custom">${fld('qNum', 'Сколько', { mode: 'numeric' })}<div class="seg unit-seg" role="radiogroup" aria-label="Единица срока"><button type="button" role="radio" class="seg-b" data-tunit="week" aria-checked="${u === 'week'}">неделя</button><button type="button" role="radio" class="seg-b" data-tunit="month" aria-checked="${u === 'month'}">месяц</button><button type="button" role="radio" class="seg-b" data-tunit="year" aria-checked="${u === 'year'}">год</button></div></div>
    <div class="fl">Или выбери дату</div>
    <label class="field t"><input id="qDate" type="date" min="${ymd(addD(new Date(), 1))}"><span>День, месяц и год</span></label>
    <div class="msg err" id="qErr" hidden></div>${qBtn(act, act === 'doTerm' ? 'Пересчитать' : 'Далее')}`;
}
function renderQuiz() {
  const q = quiz, body = $('#quizBody');
  $('#quizBar').style.width = (STEP_NO[q.step] || 1) / 6 * 100 + '%';
  const back = q.stack.length ? `<button class="quiz-back" type="button" data-qa="back">${icon('left')}<span>Назад</span></button>` : '';
  const nm = esc(q.name);
  let say, html = '';
  switch (q.step) {
    case 'kind':
      say = ['hello', 'На что копим?'];
      html = `<div class="kind-grid" role="radiogroup" aria-label="На что копим">${KINDS.map(k => `<button type="button" role="radio" class="kind" data-kind="${esc(k[0])}" aria-checked="${q.pick === k[0]}"><b>${esc(k[0])}</b><small>${esc(k[1])}</small></button>`).join('')}</div>${qBtn('kind', 'Далее', 'primary', !q.pick)}`;
      break;
    case 'custom':
      say = ['hello', 'Как назовём копилку?'];
      html = `${fld('qText', 'Название, например: велосипед', { max: 40 })}<div class="msg err" id="qErr" hidden></div>${qBtn('custom', 'Далее')}`;
      break;
    case 'target':
      say = ['think', `Сколько нужно на «${nm}»?`];
      html = `<div class="chips" role="radiogroup" aria-label="Валюта копилки">${Object.keys(CURRENCIES).map(c => `<button type="button" role="radio" class="chip" data-qcur="${c}" aria-checked="${c === q.cur}">${c}</button>`).join('')}</div>` + qIn('qNum', 'Сумма', sym(q.cur)) + qBtn('target', 'Далее');
      break;
    case 'saved':
      say = ['hello', 'Сколько уже есть?'];
      html = qIn('qNum', 'Сколько уже есть', sym(q.cur)) + qBtn('saved', 'Далее') + qBtn('saved0', 'Пока ноль', 'soft');
      break;
    case 'term':
      say = ['notify', 'За сколько хочешь накопить? Хоть за две недели.'];
      html = termHtml('term');
      break;
    case 'free':
      say = ['think', 'Пока мало записей. Сколько примерно остаётся свободным за месяц?'];
      html = qIn('qNum', 'Свободно в месяц', sym()) + qBtn('free', 'Далее') + qBtn('free0', 'Не знаю', 'soft');
      break;
    case 'think':
      say = ['think', 'Считаю…'];
      html = '<div class="dots-load" aria-hidden="true"><i></i><i></i><i></i></div>';
      break;
    case 'plan': {
      const p = planOf(), U = p.unit, per = G.perWord(U);
      const until = G.addTerm(new Date(), p.n, U), untilTxt = `${until.getDate()} ${MONTHS_G[until.getMonth()]} ${until.getFullYear()}`;
      const T = G.unitLabel(p.n, U);
      const txt = {
        easy: ['joy', `Легко. По <em>${esc(qm(p.perPeriod))}</em> ${per}, и через ${T} на «${nm}» будет ${esc(qm(q.target))}.<small>Останется запас.</small>`],
        ok: ['happy', `Посильно: <em>${esc(qm(p.perPeriod))}</em> ${per}, срок ${T}.`],
        hard: ['think', `Тяжеловато: нужно <em>${esc(qm(p.perPeriod))}</em> ${per}.${p.altN ? `<small>Могу растянуть до ${G.unitLabel(p.altN, U)}.</small>` : '<small>Давай подберём другой срок или сумму.</small>'}`],
        unknown: ['hello', `План: <em>${esc(qm(p.perPeriod))}</em> ${per}, срок ${T}.`],
        done: ['joy', 'Нужная сумма уже есть!<small>Сохрани копилку, чтобы следить за ней.</small>']
      }[p.verdict];
      say = txt;
      html = `<div class="plan">
        <div><span>Копилка</span><b>${nm}</b></div>
        <div><span>Нужно</span><b>${esc(qm(q.target))}</b></div>
        <div><span>Уже есть</span><b>${esc(qm(q.saved))}</b></div>
        <div class="hl"><span>${esc(cap(per))}</span><b>${esc(qm(p.perPeriod))}</b></div>
        <div><span>Срок</span><b>${T}, до ${untilTxt}</b></div>
      </div>` + qBtn('accept', 'Согласен') +
        (p.verdict === 'hard' && p.altN ? qBtn('alt', `Растянуть до ${G.unitLabel(p.altN, U)}`, 'soft') : '') +
        qBtn('reject', 'Не подходит', 'ghost');
      break;
    }
    case 'tune':
      say = ['think', 'Давай пересчитаем. Что поправим?'];
      html = `<div class="opts">
        <button type="button" data-qa="tuneMonthly">Много откладывать в месяц</button>
        <button type="button" data-qa="tuneTerm">Хочу быстрее</button>
        <button type="button" data-qa="tuneTarget">Подойдёт другая сумма</button>
        <button type="button" data-qa="tuneIncome">Есть доход вне приложения</button>
        <button type="button" data-qa="restart">Начать заново</button></div>`;
      break;
    case 'tuneMonthly':
      say = ['think', `Сколько откладывать ${G.perWord(quiz.term.unit)} комфортно?`];
      html = qIn('qNum', 'Сколько за раз', sym()) + qBtn('doMonthly', 'Пересчитать');
      break;
    case 'tuneTerm':
      say = ['notify', 'На какой срок поменяем?'];
      html = termHtml('doTerm');
      break;
    case 'tuneTarget':
      say = ['think', 'Какая сумма подойдёт?'];
      html = qIn('qNum', 'Сумма', sym()) + qBtn('doTarget', 'Пересчитать');
      break;
    case 'tuneIncome':
      say = ['think', 'Сколько ещё приходит в месяц вне приложения?'];
      html = qIn('qNum', 'Доход в месяц', sym()) + qBtn('doIncome', 'Пересчитать');
      break;
  }
  body.innerHTML = `${back}${MD.say(say[0], say[1], 84)}<div class="quiz-in">${html}</div>`;
  const f = body.querySelector('input'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 80);
}
function quizNum(allowZero) {
  const v = parseAmount(($('#qNum') || {}).value, allowZero), err = $('#qErr');
  hideErr(err);
  return { v, fail: m => { showErr(err, m); return null; } };
}
$('#quizBody').addEventListener('click', e => {
  const q = quiz; if (!q) return;
  const k = e.target.closest('[data-kind]');
  if (k) { q.pick = k.dataset.kind; buzz(6); renderQuiz(); return; }
  const qc = e.target.closest('[data-qcur]');
  if (qc) { const v = ($('#qNum') || {}).value; q.cur = qc.dataset.qcur; renderQuiz(); if ($('#qNum')) $('#qNum').value = v || ''; buzz(6); return; }
  const tm = e.target.closest('[data-term]');
  if (tm) { q.termPick = tm.dataset.term; const inp = $('#qNum'); if (inp) inp.value = ''; buzz(6); $$('#quizBody [data-term]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.term === q.termPick))); return; }
  if (e.target.id === 'qDate') { /* выбор даты снимает быстрые варианты */ }
  const tu = e.target.closest('[data-tunit]');
  if (tu) { q.termUnit = tu.dataset.tunit; q.termPick = null; $$('#quizBody [data-term]').forEach(x => x.setAttribute('aria-checked', 'false')); $$('#quizBody [data-tunit]').forEach(x => x.setAttribute('aria-checked', String(x === tu))); return; }
  const b = e.target.closest('[data-qa]'); if (!b) return;
  const a = b.dataset.qa;
  if (a === 'back') { q.step = q.stack.pop(); renderQuiz(); return; }
  if (a === 'kind') { if (!q.pick) return; q.name = q.pick === 'Своя копилка' ? '' : q.pick; qGo(q.name ? 'target' : 'custom'); return; }
  if (a === 'custom') {
    const v = ($('#qText').value || '').trim();
    if (!v) { showErr($('#qErr'), 'Напиши, на что копим.'); return; }
    q.name = v.slice(0, 40); qGo('target'); return;
  }
  if (a === 'target' || a === 'doTarget') {
    const n = quizNum(false); if (!(n.v > 0)) return n.fail('Введи сумму, например 3000.');
    q.target = n.v; if (a === 'doTarget') { if (q.saved > q.target) q.saved = q.target; toPlan(true); } else qGo('saved'); return;
  }
  if (a === 'saved' || a === 'saved0') {
    if (a === 'saved0') q.saved = 0;
    else { const n = quizNum(true); if (!Number.isFinite(n.v) || n.v < 0) return n.fail('Введи сумму, например 500, или нажми «Пока ноль».'); q.saved = n.v; }
    qGo('term'); return;
  }
  if (a === 'term' || a === 'doTerm') {
    const typed = ($('#qNum').value || '').trim(), dateV = ($('#qDate') || {}).value || '';
    let term = null; q.deadline = null;
    if (parseYmd(dateV) && parseYmd(dateV) > new Date()) {
      const days = Math.max(1, Math.ceil((parseYmd(dateV) - new Date()) / 864e5));
      term = days <= 120 ? { n: Math.max(1, Math.ceil(days / 7)), unit: 'week' } : { n: Math.max(1, Math.round(days / 30.44)), unit: 'month' };
      q.deadline = dateV;
    } else if (typed) {
      const v = Math.round(Number(typed.replace(',', '.'))), u = q.termUnit || 'month';
      if (v >= 1 && v <= (u === 'week' ? 520 : u === 'year' ? 50 : 600)) term = u === 'year' ? { n: v * 12, unit: 'month' } : { n: v, unit: u };
    } else if (q.termPick) { const [n, u] = q.termPick.split(':'); term = { n: Number(n), unit: u }; }
    if (!term) return showErr($('#qErr'), 'Выбери срок, впиши свой, например 2 недели, или выбери дату.');
    q.term = term; toPlan(a === 'doTerm'); return;
  }
  if (a === 'free' || a === 'free0') {
    if (a === 'free0') q.free = null;
    else { const n = quizNum(true); if (!Number.isFinite(n.v)) return n.fail('Введи сумму или нажми «Не знаю».'); q.free = n.v; q.hadFree = true; }
    toPlan(); return;
  }
  if (a === 'accept') { saveGoal(); return; }
  if (a === 'alt') { q.term = { n: planOf().altN, unit: q.term.unit }; q.stack.push(q.step); thinkThen(); return; }
  if (a === 'reject') { qGo('tune'); return; }
  if (a === 'restart') { q.stack = []; q.step = 'kind'; renderQuiz(); return; }
  if (a === 'tuneMonthly' || a === 'tuneTerm' || a === 'tuneTarget' || a === 'tuneIncome') { qGo(a); return; }
  if (a === 'doMonthly') {
    const n = quizNum(false); if (!(n.v > 0)) return n.fail('Введи сумму, например 200.');
    const need = Math.max(q.target - q.saved, 0), m = Math.max(1, Math.ceil(need / n.v));
    if (m > 600) return n.fail('Так выйдет больше 50 лет. Давай откладывать побольше.');
    q.term = { n: m, unit: q.term.unit }; toPlan(true); return;
  }
  if (a === 'doIncome') {
    const n = quizNum(false); if (!(n.v > 0)) return n.fail('Введи сумму, например 300.');
    q.extra += n.v; q.free = round2((q.free || 0) + n.v); toPlan(true); return;
  }
});
$('#quizBody').addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  e.preventDefault();
  const b = $('#quizBody [data-qa]:not(.ghost):not(.soft):not([data-qa=back])'); if (b) b.click();
});
function toPlan(replace) {
  if (quiz.free === null && !quiz.hadFree && quiz.step !== 'free' && !replace && quiz.cur === state.currency) { qGo('free'); return; }
  if (replace) quiz.stack.push(quiz.step);
  thinkThen();
}
function thinkThen() {
  quiz.step = 'think'; renderQuiz();
  const q = quiz;
  setTimeout(() => { if (quiz !== q || q.step !== 'think') return; q.step = 'plan'; q.stack = q.stack.filter(s => s !== 'think'); renderQuiz(); buzz(10); }, 900);
}
function saveGoal() {
  const q = quiz, p = planOf(), now = new Date();
  const unit = p.unit, months = unit === 'week' ? Math.max(1, Math.round(p.n * 12 / 52)) : p.n;
  const used = new Set(state.goals.map(g => g.nid)); let nid = 0; while (used.has(nid) && nid < 49) nid++;
  const sd = G.suggestDay(state.tx, unit);
  state.goals.push({ id: uid(), name: q.name, target: round2(q.target), saved: round2(q.saved), months, unit, deadline: q.deadline || G.ymdOf(G.addTerm(now, p.n, unit)), cur: q.cur, created: today(), nid, remind: { on: false, day: sd.day, time: '10:00' }, log: q.saved > 0 ? [{ d: today(), a: round2(q.saved) }] : [] });
  save(); closeLayer($('#lyQuiz')); quiz = null; buzz(20);
  showTab('goals'); afterDataChange();
  toast('Копилка добавлена. Откладывай и отмечай, а я напомню', null, null, 'joy');
}

/* ---------- Черновик: несколько записей сразу ---------- */
function normalizeItems(items, max = 30) {
  const res = [];
  for (const it of items.slice(0, max)) {
    if (!it || (it.type !== 'expense' && it.type !== 'income')) continue;
    const amount = parseAmount(it.amount);
    if (!(amount > 0)) continue;
    const names = CATS[it.type].map(c => c[0]), al = MD.catAlias(it.type, it.cat, state.cats);
    const cat = names.includes(al) ? al : names.includes(it.cat) ? it.cat : 'Другое';
    const q = String(it.acc ?? '').trim().toLowerCase();
    const acc = (q && state.accounts.find(a => a.name.toLowerCase() === q)) ||
      (q && state.accounts.find(a => a.name.toLowerCase().includes(q) || (q.length >= 3 && q.includes(a.name.toLowerCase())))) ||
      (q && /^\d{4}$/.test(q) && state.accounts.find(a => a.last4 === q)) || state.accounts[0];
    res.push({ type: it.type, amount: round2(amount), cat, acc: acc.id, date: parseYmd(it.date) ? it.date : today(), note: typeof it.note === 'string' ? it.note.trim().slice(0, 80) : '' });
  }
  return res;
}

function renderDraft() {
  $('#draftList').innerHTML = draft.map((d, i) => {
    const ci = catInfo(d.type, d.cat);
    return `<div class="draft-row"><button class="dr" type="button" data-edit="${i}" aria-label="Изменить: ${esc(d.cat)}, ${esc(signed(d.amount, d.type))}"><div class="tx-ic" style="${cs(ci)}" aria-hidden="true">${cIcon(ci)}</div>
      <div class="dr-b"><div class="dr-t">${esc(d.cat)}</div>${d.note ? `<div class="tx-n">${esc(d.note)}</div>` : ''}<div class="dr-s">${esc(dayTitle(d.date))}</div></div>
      <div class="tx-a ${d.type === 'income' ? 'inc' : 'exp'}">${esc(signed(d.amount, d.type))}</div></button>
      <button class="dr-x" type="button" data-drop="${i}" aria-label="Убрать строку: ${esc(d.cat)}">${icon('close')}</button></div>`;
  }).join('');
  const inc = sumOf(draft, 'income'), exp = sumOf(draft, 'expense');
  $('#draftSum').innerHTML = `<span>Записей: ${draft.length}</span>${inc ? `<span class="i">Доход +${esc(money(inc))}</span>` : ''}${exp ? `<span class="e">Расход −${esc(money(exp))}</span>` : ''}`;
  $('#draftOk').disabled = !draft.length;
  $('#draftOk').textContent = draft.length > 1 ? `Всё верно · ${draft.length}` : 'Всё верно';
}
$('#draftList').addEventListener('click', e => {
  const x = e.target.closest('[data-drop]');
  if (x) {
    draft.splice(Number(x.dataset.drop), 1);
    if (!draft.length) { closeLayer($('#lyDraft')); return; }
    renderDraft(); return;
  }
  const ed = e.target.closest('[data-edit]');
  if (ed) {                                         // изменить строку: то же окно записи, потом обратно сюда
    const i = Number(ed.dataset.edit), d = draft[i];
    closeLayer($('#lyDraft'));
    openTx(null, { draftIdx: i, type: d.type, cat: d.cat, amount: d.amount, note: d.note, date: d.date });
  }
});
$('#draftCancel').addEventListener('click', () => closeLayer($('#lyDraft')));
let draftBusy = false;
$('#draftOk').addEventListener('click', () => {
  if (!draft.length) return;
  if (draftBusy) return; draftBusy = true; setTimeout(() => { draftBusy = false; }, 600);
  const first = !state.tx.length;
  const added = draft.map((d, i) => ({ id: uid(), ...d, ts: Date.now() + i }));
  const latest = draft.map(d => d.date).sort().pop(), ld = parseYmd(latest);
  added.forEach(t => state.tx.push(t));
  draft = [];
  lastAddAt = Date.now();
  save();
  ym = { y: ld.getFullYear(), m: ld.getMonth() };
  closeLayer($('#lyDraft'));
  buzz(20);
  showTab('home');
  afterAdd(added, first, null);
});

/* ---------- Импорт выписки: список «Всё верно?» с группировкой по дням ---------- */
let imp = null;
function openImport(items, o = {}) {
  ensureAccount();
  const list = items.map((it, i) => Object.assign({ id: i }, it, { skip: false }));
  // уже записанные операции в основной валюте не предлагаем второй раз
  const exist = new Map(); state.tx.forEach(t => { const k = `${t.date}|${t.type}|${round2(t.amount)}`; exist.set(k, (exist.get(k) || 0) + 1); });
  let dup = 0;
  list.forEach(it => { if (it.cur === state.currency) { const k = `${it.date}|${it.type}|${round2(it.amount)}`; if (exist.get(k) > 0) { exist.set(k, exist.get(k) - 1); it.skip = true; it.known = true; dup++; } } });
  imp = { items: list, hints: (MD.statement.hints(list) || []).map(h => Object.assign({}, h, { done: false })), dup, source: o.source || 'выписка', onDone: o.onDone || null };
  renderImport(); openLayer($('#lyImport'));
}
function renderImport() {
  if (!imp) return;
  const live = imp.items.filter(i => !i.skip), body = $('#impBody');
  const inc = round2(live.filter(i => i.type === 'income' && i.cur === state.currency).reduce((s, i) => s + i.amount, 0)), exp = round2(live.filter(i => i.type === 'expense' && i.cur === state.currency).reduce((s, i) => s + i.amount, 0));
  const reps = imp.items.filter(i => i.rep && !i.skip).length;
  const groups = MD.statement.byDay(imp.items);
  const catOpts = (type, cur) => CATS[type].map(c => `<option value="${esc(c[0])}"${c[0] === cur ? ' selected' : ''}>${esc(c[0])}</option>`).join('');
  body.innerHTML = `<div class="imp-sum"><b>${live.length}</b> из ${imp.items.length}<span>${inc ? `<i class="i">+${esc(fmt(inc))}</i>` : ''}${exp ? `<i class="e">−${esc(fmt(exp))}</i>` : ''}<em>${esc(sym())}</em></span></div>` +
    (imp.dup ? `<div class="note top0">Уже записанные пропустил: ${imp.dup}.</div>` : '') +
    (reps ? `<button class="btn soft wide" type="button" data-imp="merge">Объединить повторы (${reps})</button>` : '') +
    imp.hints.filter(h => !h.done).map((h, k) => `<div class="imp-hint"><span class="ih-t"><b>${esc(h.name)}</b><small>${esc(money(h.amount))}, ${h.day}-го числа${h.sure ? '' : ' · похоже на регулярный'}</small></span><button class="btn primary" type="button" data-imp="pay:${imp.hints.indexOf(h)}">Создать платёж</button><button class="icon-btn sm" type="button" data-imp="nopay:${imp.hints.indexOf(h)}" aria-label="Не нужно"><i data-ic="close"></i></button></div>`).join('') +
    groups.map(g => `<div class="day"><div class="day-h"><span>${esc(dayTitle(g.date))}</span><span>${g.items.length}</span></div>${g.items.map(it => { const ci = catInfo(it.type, it.cat);
      return `<div class="imp-row${it.skip ? ' skip' : ''}"><span class="tx-ic" style="${cs(ci)}" aria-hidden="true">${cIcon(ci)}</span>
        <span class="imp-b"><b>${esc(it.name)}</b><small>${esc([it.time, it.check ? 'чек ' + it.check : '', it.procDate && it.procDate !== it.date ? 'обработана ' + it.procDate.slice(8) + '.' + it.procDate.slice(5, 7) : '', it.rep ? 'повтор' : '', it.known ? 'уже записана' : ''].filter(Boolean).join(' · '))}</small>
        <select class="cat-sel" data-icat="${it.id}" aria-label="Категория">${catOpts(it.type, it.cat)}</select></span>
        <span class="imp-r"><b class="${it.type === 'income' ? 'inc' : 'exp'}">${it.type === 'income' ? '+' : '−'}${esc(fmt(it.amount))} ${esc(sym(it.cur))}</b><span class="imp-act">${it.rep ? `<button type="button" data-imp="rep:${it.id}">${it.skip ? 'Это не повтор' : 'Это повтор'}</button>` : ''}<button type="button" data-imp="rm:${it.id}" aria-label="Убрать">Убрать</button></span></span></div>`; }).join('')}</div>`).join('') +
    `<button class="btn primary wide" type="button" data-imp="ok" ${live.length ? '' : 'disabled'}>Записать${live.length ? ` (${live.length})` : ''}</button><button class="btn ghost wide" type="button" data-imp="cancel">Отмена</button>`;
  paintIcons(body);
}
$('#impBody').addEventListener('change', e => { const s = e.target.closest('[data-icat]'); if (!s || !imp) return; const it = imp.items.find(x => x.id === Number(s.dataset.icat)); if (it) { it.cat = s.value; renderImport(); } });
$('#impBody').addEventListener('click', async e => {
  const b = e.target.closest('[data-imp]'); if (!b || !imp) return;
  const a = b.dataset.imp;
  if (a === 'cancel') { closeLayer($('#lyImport')); imp = null; return; }
  if (a === 'merge') { imp.items.forEach(i => { if (i.rep) i.skip = true; }); renderImport(); return; }
  if (a.startsWith('rm:')) { imp.items = imp.items.filter(x => x.id !== Number(a.slice(3))); renderImport(); return; }
  if (a.startsWith('rep:')) { const it = imp.items.find(x => x.id === Number(a.slice(4))); if (it) it.skip = !it.skip; renderImport(); return; }
  if (a.startsWith('nopay:')) { imp.hints[Number(a.slice(6))].done = true; renderImport(); return; }
  if (a.startsWith('pay:')) {
    const h = imp.hints[Number(a.slice(4))]; if (!h) return;
    if (state.rec.list.length >= MD.sub.limit('payments')) return MD.sub.open('payments', () => {});
    const T = new Date(), nm = h.name.slice(0, 30);
    state.rec.list.push({ id: 'p' + uid().slice(0, 8), name: nm, amount: round2(h.amount), cat: h.cat, once: '', days: [{ from: '0000-00', day: h.day }], remind: 'off', time: '10:00', start: R.startMonth(h.day, T), paid: {}, nid: R.freeNid(state.rec.list) });
    h.done = true; save(); afterDataChange(); render(); renderImport(); toast(`Платёж «${nm}» создан`, null, null, 'happy'); return;
  }
  if (a === 'ok') {
    const live = imp.items.filter(i => !i.skip); if (!live.length) return;
    b.disabled = true; b.textContent = 'Записываю…';
    const added = [];
    for (let k = 0; k < live.length; k++) {
      const it = live[k]; let amount = it.amount, orig = null;
      if (it.cur !== state.currency) { const r = await MD.rates.convert(it.amount, it.cur, state.currency, it.date); amount = r.amount; orig = { a: it.amount, cur: it.cur, rate: r.rate, est: r.est }; }
      const ts = it.time ? new Date(`${it.date}T${it.time}:00`).getTime() || Date.now() + k : Date.now() + k;
      const note = [it.name, it.check ? `чек ${it.check}` : ''].filter(Boolean).join(' · ').slice(0, 120);
      added.push({ id: uid(), type: it.type, amount, cat: it.cat, acc: state.accounts[0].id, date: it.date, note, ts, orig });
    }
    added.forEach(t => state.tx.push(t));
    added.forEach(t => { const m = t.type === 'expense' ? R.matchTx(state.rec.list, t) : null; if (m) m.p.paid[m.mk] = t.id; });
    lastAddAt = Date.now(); save(); closeLayer($('#lyImport'));
    const done = imp.onDone; imp = null;
    render(); afterDataChange(); nudgeRefresh(true);
    toast(`Записано: ${added.length}`, null, null, 'joy'); if (done) done(added.length);
  }
});

/* ---------- Праздники и подарки ---------- */
const FEST_PRESETS = ['День рождения', 'Новый год', '8 Марта', '23 Февраля', 'Свадьба', 'Юбилей'];
let ev = null;
const festList = () => state.fest.list;
const evById = id => festList().find(e => e.id === id);
function festSave() { save(); MD.notify.applyEvents(festList()); renderAccount(); renderFestHome(); if (panel && panel.kind === 'fest' && !$('#lyLink').hidden) renderPanel(); }
/* Записали подарок: предлагаем внести чей-то праздник, чтобы заранее откладывать деньги */
function maybeAskFest(items) {
  if (!state.fest.ask || !items.some(i => i.type === 'expense' && i.cat === 'Подарки')) return;
  setTimeout(async () => {
    if (layers.length) return;
    const r = await confirmDlg('Внести праздник?', 'Подарок записан. Хочешь внести чей-то день рождения или праздник? Напомню заранее отложить деньги.', 'Добавить', { tone: 'primary', no: 'Не сейчас', extra: 'Больше не спрашивать' });
    if (r === true) openEvent();
    else if (r === 'extra') { state.fest.ask = false; save(); toast('Хорошо, больше не спрашиваю. Включить можно в Профиле.'); }
  }, 1100);
}
const evDefaultDate = () => { const d = new Date(); d.setDate(d.getDate() + 30); return ymd(d); };
function openEvent(id) {
  const e = id && evById(id);
  ev = e ? { id: e.id, nid: e.nid, yearly: e.yearly, on: e.remind.on, lead: Object.assign({}, e.remind.lead) } : { id: null, nid: MD.events.freeNid(festList()), yearly: true, on: true, lead: MD.events.defaultLead() };
  $('#evHead').textContent = e ? 'Праздник' : 'Новый праздник';
  $('#evTitle').value = e ? e.title : ''; $('#evPerson').value = e ? e.person : ''; $('#evDate').value = e ? e.date : evDefaultDate();
  $('#evCustom').value = ev.lead.date || '';
  $('#evDelete').hidden = !e; hideErr($('#evErr'));
  renderEvent();
  $('#lyEvent')._onClose = () => { ev = null; };
  openLayer($('#lyEvent'));
  if (!e) setTimeout(() => $('#evTitle').focus({ preventScroll: true }), 120);
}
function evObj() {
  return { id: ev.id || ('e' + Date.now().toString(36)), title: $('#evTitle').value.trim(), person: $('#evPerson').value.trim(), date: $('#evDate').value, yearly: ev.yearly, nid: ev.nid, remind: { on: ev.on, lead: ev.lead } };
}
function renderEvent() {
  const cur = $('#evTitle').value.trim();
  $('#evPresets').innerHTML = FEST_PRESETS.map(p => `<button type="button" class="chip" data-evp="${esc(p)}" aria-checked="${cur === p}">${esc(p)}</button>`).join('');
  const sw = (id, on) => { $(id).setAttribute('aria-checked', String(on)); $(id + ' .sw-t').setAttribute('aria-checked', String(on)); };
  sw('#evYearly', ev.yearly); sw('#evRemind', ev.on);
  $('#evLeadBox').hidden = !ev.on;
  const L = ev.lead, isDate = L.kind === 'date';
  $('#evLeads').innerHTML = MD.events.LEADS.map(x => `<button type="button" role="radio" class="chip" data-evl="${x.id}" aria-checked="${!isDate && x.kind === L.kind && x.n === L.n}">${esc(x.label)}</button>`).join('') +
    `<button type="button" role="radio" class="chip" data-evl="date" aria-checked="${isDate}">Своя дата</button>`;
  $('#evCustomF').hidden = !isDate;
  const o = evObj(), d = MD.events.parse(o.date);
  let hint = '';
  if (ev.on && d) {
    if (isDate && !MD.events.parse(L.date)) hint = 'Выбери дату, когда напомнить.';
    else { const r = MD.events.remindDate(o, new Date()); hint = r ? `Напомню ${MD.events.dayText(r.rd)} в 10:00. Само событие: ${MD.events.dayText(r.occ)}.` : 'Эта дата напоминания уже прошла. Выбери другую.'; }
  }
  $('#evHint').textContent = hint;
}
$('#evPresets').addEventListener('click', e => { const b = e.target.closest('[data-evp]'); if (!b) return; $('#evTitle').value = b.dataset.evp; buzz(6); renderEvent(); if (!$('#evPerson').value && b.dataset.evp !== 'Новый год') $('#evPerson').focus(); });
$('#evForm').addEventListener('input', e => { hideErr($('#evErr')); if (e.target.id === 'evCustom') ev.lead.date = e.target.value; renderEvent(); });
$('#evYearly').addEventListener('click', () => { ev.yearly = !ev.yearly; renderEvent(); });
$('#evRemind').addEventListener('click', () => { ev.on = !ev.on; renderEvent(); });
$('#evLeads').addEventListener('click', e => {
  const b = e.target.closest('[data-evl]'); if (!b) return;
  const x = MD.events.LEADS.find(l => l.id === b.dataset.evl);
  ev.lead = x ? { kind: x.kind, n: x.n, date: '' } : { kind: 'date', n: 1, date: $('#evCustom').value };
  renderEvent(); if (!x) setTimeout(() => { try { $('#evCustom').showPicker(); } catch (_) { $('#evCustom').focus(); } }, 60);
});
$('#evForm').addEventListener('submit', async e => {
  e.preventDefault();
  const o = evObj(), err = $('#evErr');
  if (!o.title && !o.person) { showErr(err, 'Напиши название или имя, например «День рождения» и «Аня».'); $('#evTitle').focus(); return; }
  if (!MD.events.parse(o.date)) { showErr(err, 'Выбери дату праздника.'); return; }
  if (o.remind.on && o.remind.lead.kind === 'date' && !MD.events.parse(o.remind.lead.date)) { showErr(err, 'Выбери дату напоминания или другой срок.'); return; }
  const clean = MD.events.sanitize({ ask: true, list: [o] }).list[0];
  const i = festList().findIndex(x => x.id === clean.id);
  if (i >= 0) festList()[i] = clean; else festList().push(clean);
  const r = clean.remind.on ? await MD.notify.applyEvents(festList()) : (MD.notify.applyEvents(festList()), { ok: true });
  save(); closeLayer($('#lyEvent')); ev = null; buzz(15); renderAccount(); renderFestHome();
  if (panel && panel.kind === 'fest' && !$('#lyLink').hidden) renderPanel();
  if (r && r.reason === 'denied') toast('Праздник записан, но уведомления выключены. Включи их в настройках телефона.', null, null, 'oops');
  else toast(clean.remind.on && MD.notify.supported() ? 'Праздник записан, напомню заранее' : 'Праздник записан', null, null, 'happy');
});
$('#evDelete').addEventListener('click', () => {
  if (!ev || !ev.id) return;
  const i = festList().findIndex(x => x.id === ev.id); if (i < 0) return;
  const gone = festList()[i];
  state.fest.list = festList().filter(x => x.id !== ev.id);
  closeLayer($('#lyEvent')); ev = null; festSave();
  undoToast('Праздник удалён', () => { state.fest.list.splice(Math.min(i, state.fest.list.length), 0, gone); festSave(); });
});

/* ---------- Фин заметил: подсказки по привычкам ---------- */
const NG = MD.nudges;
let ngAnalysis = null, ngAt = 0, ngTimer = null, lastAddAt = 0;
const ngCtx = () => ({ now: new Date(), currency: state.currency, canShow: nudgeCanShow(), money: n => money(n), dayName: d => `${d.getDate()} ${MONTHS_G[d.getMonth()]}` });
/* Не мешаем вводу: подсказка появляется только на Главной, когда закрыты форма, «Всё верно?» и запись голоса */
function nudgeCanShow() { return tab === 'home' && layers.length === 0 && !MD.voice.active && Date.now() - lastAddAt > 8000; }
/* Пересчёт паттернов не чаще раза в 10 минут (удаление и импорт считают сразу), выбор подсказки лёгкий */
function nudgeRefresh(force) {
  clearTimeout(ngTimer);
  ngTimer = setTimeout(() => {
    const c = ngCtx();
    if (force || !ngAnalysis || Date.now() - ngAt > 10 * 60 * 1000) { ngAnalysis = NG.analyze(state.tx, state.nudge, c); ngAt = Date.now(); }
    const r = NG.settle(state.nudge, ngAnalysis, c);
    if (r.changed) save();
    renderNudge();
  }, force ? 0 : 250);
}
function nudgeInfo() {
  const n = state.nudge; if (!n.active || !n.on) return null;
  const d = NG.describe(n, state.tx, Object.assign(ngCtx(), { analysis: ngAnalysis || NG.analyze(state.tx, n, ngCtx()) }));
  return d;
}
function renderNudge() {
  const box = $('#nudgeBox'), d = nudgeInfo();
  if (state.nudge.active && !d) { state.nudge.active = null; save(); }
  box.innerHTML = d ? `<section class="nudge" role="region" aria-label="${esc(NG.t('aria.region'))}">
      <div class="nudge-top"><span class="nudge-m" aria-hidden="true">${MD.mascot('think', 68)}</span><div class="nudge-t"><b>${esc(NG.t('title'))}</b><p>${esc(maskT(d.text))}</p></div></div>
      <div class="nudge-act"><button class="btn ghost" type="button" data-nudge="ack" aria-label="${esc(NG.t('aria.ok'))}">${esc(NG.t('ok'))}</button><button class="btn primary" type="button" data-nudge="talk" aria-label="${esc(NG.t('aria.talk', { cat: d.cat }))}">${esc(d.primary)}</button></div>
    </section>` : '';
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-nudge]'); if (!b) return;
  if (b.dataset.nudge === 'ack') {
    const r = NG.ack(state.nudge); save(); buzz(8); renderNudge();
    if (r.auto) toast(NG.t('muted'), null, null, 'hello');
  } else if (b.dataset.nudge === 'talk') openNudgeDlg();
});

/* Разговор «Обсудить»: ровно два шага, по веткам, без ИИ. Первый ответ запоминается и больше не спрашивается */
let nd = null;
const ndSay = (pose, text) => MD.say(pose, esc(text), 64);
const ndBtn = (act, label, cls = 'soft') => `<button class="btn ${cls} wide" type="button" data-nd="${act}">${esc(label)}</button>`;
function openNudgeDlg() {
  const a = state.nudge.active; if (!a) return;
  NG.startTalk(state.nudge); save();
  const known = state.nudge.answers[a.cat];               // уже отвечал: сразу второй шаг
  nd = { cat: a.cat, step: known === 'once' ? 'once' : known === 'regular' ? 'regular' : 'q1' };
  renderNudgeDlg();
  openLayer($('#lyNudge'));
}
function ndFacts() {
  const T = new Date(), from = ymd(new Date(T.getFullYear(), T.getMonth(), T.getDate() - 29));
  const list = state.tx.filter(t => t.type === 'expense' && t.cat === nd.cat && t.date >= from);
  const sum = round2(list.reduce((s, t) => s + t.amount, 0));
  const pm = new Date(T.getFullYear(), T.getMonth() - 1, 1), pk = monthKey(pm.getFullYear(), pm.getMonth());
  const prev = round2(state.tx.filter(t => t.type === 'expense' && t.cat === nd.cat && t.date.startsWith(pk)).reduce((s, t) => s + t.amount, 0));
  return { n: list.length, sum, cmp: prev ? (sum > prev * 1.03 ? 'more' : sum < prev * 0.97 ? 'less' : 'same') : null };
}
function renderNudgeDlg() {
  if (!nd) return;
  const t = NG.t;
  let html = '';
  if (nd.step === 'q1') html = ndSay('think', t('q1')) + ndBtn('once', t('once')) + ndBtn('regular', t('regular')) + ndBtn('unknown', t('unknown'));
  else if (nd.step === 'once') html = ndSay('hello', t('onceMsg')) + ndBtn('hide', t('hide')) + ndBtn('keep', t('keep'), 'primary');
  else if (nd.step === 'regular') html = ndSay('hello', t('regularMsg')) + ndBtn('goal', t('toGoal'), 'primary') + ndBtn('later', t('notNeeded'));
  else {
    const f = ndFacts();
    html = ndSay('think', `${t('look', { n: f.n, trata: NG.form(f.n, NG.forms('trata')), sum: money(f.sum) })}${f.cmp ? ' ' + t(f.cmp) : ''}`) + ndBtn('done', t('ok'), 'primary') + ndBtn('hideall', t('hideAll'));
  }
  $('#nudgeBody').innerHTML = `<div class="quiz-in">${html}</div>`;
}
function ndFinish(msg, then) {
  NG.finishTalk(state.nudge); save();
  const ly = $('#lyNudge'); if (!ly.hidden) closeLayer(ly);
  nd = null; renderNudge();
  if (msg) toast(msg, null, null, 'happy');
  if (then) setTimeout(then, 350);
}
$('#nudgeBody').addEventListener('click', e => {
  const b = e.target.closest('[data-nd]'); if (!b || !nd) return;
  const a = b.dataset.nd, c = nd.cat, key = state.nudge.active && state.nudge.active.key;
  if (a === 'once' || a === 'regular' || a === 'unknown') { NG.answer(state.nudge, c, a); save(); nd.step = a; renderNudgeDlg(); return; }
  if (a === 'hide' || a === 'hideall') { NG.hideCat(state.nudge, c); return ndFinish(`Не буду подсказывать про «${c}». Вернуть можно в Профиле.`); }
  if (a === 'keep' || a === 'done') return ndFinish();
  if (a === 'later') { if (key) NG.snooze(state.nudge, key, 30); return ndFinish(NG.t('regularDone')); }
  if (a === 'goal') { if (key) NG.snooze(state.nudge, key, 30); return ndFinish(null, () => startNewGoal()); }
});

/* ---------- Обязательные платежи ---------- */
/* Фин не тратит деньги и не создаёт операций сам: он напоминает, предлагает отметить, а человек подтверждает */
const payById = id => state.rec.list.find(p => p.id === id);
function afterDataChange() {
  MD.notify.applyEvents(state.fest.list);
  MD.notify.applyGoals(state.goals, n => money(n));
  return MD.notify.applyPayments(state.rec.list, n => money(n));
}
function markPaid(id, mk, txId) { const p = payById(id); if (p) p.paid[mk] = txId || 'manual'; afterDataChange(); }
/* ---------- Совпадение дат: «не забыл ли внести ещё и это?» ---------- */
const clashKey = 'moidengi_clash';
const clashState = () => { try { return JSON.parse(localStorage.getItem(clashKey) || '{}') || {}; } catch (_) { return {}; } };
const clashSave = o => { try { localStorage.setItem(clashKey, JSON.stringify(o)); } catch (_) {} };
function clashItems(dateStr, exceptId) {
  const d = parseYmd(dateStr) || new Date(), T = new Date(), st = clashState(), muted = new Set(st.mute || []);
  const pays = R.dueOn(state.rec.list, d, T).filter(r => r.p.id !== exceptId && !muted.has(r.p.id)).map(r => ({ kind: 'pay', id: r.p.id, mk: R.mkOfDate(d), label: `${cap(r.p.name)} ${money(r.p.amount)}` }));
  const evs = MD.events.upcoming(festList(), d).filter(u => MD.events.daysTo(u.occ, d) === 0 && !muted.has(u.e.id)).map(u => ({ kind: 'ev', id: u.e.id, label: MD.events.whatText(u.e) }));
  return pays.concat(evs);
}
let clash = null;
/* Возвращает true, если вопрос показан */
function askClash(exceptId, dateStr, minItems = 1) {
  if (layers.length) return false;
  const items = clashItems(dateStr || today(), exceptId);
  if (items.length < minItems) return false;
  const st = clashState(); if (st.day === today() && exceptId === undefined) return false;
  clash = { items };
  $('#clSay').innerHTML = MD.say('think', `Не забыл ли ты внести ещё: ${esc(items.map(i => i.label).join(', '))}?<small id="clTitle">Эти платежи приходятся на ту же дату.</small>`, 64);
  openLayer($('#lyClash'));
  return true;
}
$('#lyClash').addEventListener('click', e => {
  const b = e.target.closest('[data-cl]'); if (!b || !clash) return;
  const a = b.dataset.cl, items = clash.items, st = clashState(); clash = null;
  closeLayer($('#lyClash'));
  if (a === 'now') { const f = items[0]; setTimeout(() => { if (f.kind === 'pay') payWrite(f.id, f.mk); else openEvent(f.id); }, 280); }
  else if (a === 'details') setTimeout(() => { items[0].kind === 'pay' ? openPayScreen() : openEvent(items[0].id); }, 280);
  else if (a === 'later') { st.day = today(); clashSave(st); }
  else if (a === 'mute') { st.mute = Array.from(new Set((st.mute || []).concat(items.map(i => i.id)))); clashSave(st); toast('Хорошо, больше не напоминаю об этом', null, null, 'happy'); }
});
function openPayScreen() { if (tab !== 'pay') payFrom = tab === 'chat' ? 'acc' : tab; showTab('pay'); }
function payWrite(id, mk) {
  const p = payById(id); if (!p) return;
  openTx(null, { type: 'expense', cat: p.cat, amount: p.amount, note: cap(p.name), date: today(), pay: { id, mk } });
}
function startNewPay() {
  if (state.rec.list.length >= MD.sub.limit('payments')) return MD.sub.open('payments', () => openPaySheet());
  openPaySheet();
}
function payRowHtml(r, mk) {
  const p = r.p, ci = catInfo('expense', p.cat), d = r.date, late = r.status === 'late';
  const st = r.status === 'paid' ? `<span class="st paid">${icon('check')}Оплачено</span>` : late ? `<span class="st late">Записать</span>` : '<span class="st">Ожидает</span>';
  return `<div class="pay-row${late ? ' late' : ''}"><button class="pr-main" type="button" data-payedit="${esc(p.id)}" aria-label="Изменить платёж ${esc(p.name)}"><span class="tx-ic" style="${cs(ci)}" aria-hidden="true">${cIcon(ci)}</span>
    <span class="pr-b"><b>${esc(cap(p.name))}</b><small>${esc(R.scheduleText(p, d))} · ${esc(p.cat)}</small></span>
    <span class="pr-r"><b>${esc(maskT(money(p.amount)))}</b>${st}</span></button>${late ? `<button class="late-act" type="button" data-paywrite="${esc(p.id)}|${mk}">Записать</button>` : ''}</div>`;
}
function renderPay() {
  const el = $('#payBody'), list = state.rec.list, T = new Date(), mk = R.mkOfDate(T);
  if (!list.length) {
    el.innerHTML = emptyBox('Пока пусто', 'Добавь первый платёж: аренду, подписку или кредит. Фин напомнит и поможет записать, но сам ничего не спишет.', { attr: 'data-newpay', label: 'Добавить платёж' });
    return;
  }
  const rows = R.monthRows(list, mk, T), sm = R.summary(list, mk, T), later = list.filter(p => p.start > mk);
  const lim = MD.sub.limit('payments');
  el.innerHTML = `<div class="card pay-sum"><span>Оплачено ${sm.paid} из ${sm.n}</span><b>${sm.left > 0 ? `Осталось ${esc(maskT(money(sm.left)))}` : 'Всё закрыто'}</b></div>
    <div class="block"><div class="h2-row"><h2 class="h2">${esc(MONTHS[T.getMonth()])}</h2></div><div class="card" style="padding:0 12px">${rows.length ? rows.map(r => payRowHtml(r, mk)).join('') : '<div class="note ctr" style="margin:16px 0">В этом месяце платежей нет</div>'}</div></div>
    ${later.length ? `<div class="block"><div class="h2-row"><h2 class="h2">Со следующего месяца</h2></div><div class="card" style="padding:0 12px">${later.map(p => payRowHtml({ p, date: R.dateOf(p, R.shiftMk(mk, 1)), status: 'wait' }, mk)).join('')}</div></div>` : ''}
    ${(() => { const past = list.filter(p => p.once && p.once.slice(0, 7) < mk); return past.length ? `<div class="block"><div class="h2-row"><h2 class="h2">Прошедшие</h2></div><div class="card" style="padding:0 12px">${past.map(p => payRowHtml({ p, date: R.dateOf(p, p.once.slice(0, 7)), status: R.isPaid(p, p.once.slice(0, 7)) ? 'paid' : 'wait' }, p.once.slice(0, 7))).join('')}</div></div>` : ''; })()}
    ${lim !== Infinity ? `<div class="note ctr">Платежей: ${list.length} из ${lim}. Больше с Фин Навсегда, без подписки.</div>` : ''}
    <div class="note ctr">Фин напоминает и помогает записать. Деньги он не списывает.</div>`;
}
$('#payBody').addEventListener('click', e => { const ed = e.target.closest('[data-payedit]'); if (ed) openPaySheet(ed.dataset.payedit); });

/* Одно окно: создание и правка. Три тапа: «Добавить», название, «Сохранить» (сумму вводим на клавиатуре) */
let pm = null;
const payDefaultDay = () => new Date().getDate();
function openPaySheet(id) {
  const p = id && payById(id);
  pm = p ? { id: p.id, name: p.name, amount: p.amount, day: R.curDay(p), mode: p.once ? 'once' : 'monthly', once: p.once || '', cat: p.cat, remind: p.remind, time: p.time, catOpen: false }
    : { id: null, name: '', amount: '', day: payDefaultDay(), mode: 'monthly', once: '', cat: '', remind: 'off', time: '10:00' };
  $('#payHead').textContent = p ? 'Платёж' : 'Новый платёж';
  $('#payName').value = pm.name; $('#payAmount').value = pm.amount ? String(pm.amount).replace('.', ',') : ''; $('#payDay').value = pm.day; $('#payTime').value = pm.time; $('#payOnce').value = pm.once || today();
  $('#payCur').textContent = sym();
  $('#payDelete').hidden = !p;
  hideErr($('#payErr'));
  renderPaySheet();
  const mk = R.mkOfDate(new Date()), pb = $('#payMark');
  pb.hidden = !p || p.start > mk;
  if (p) pb.textContent = R.isPaid(p, mk) ? 'Снять отметку «оплачено»' : 'Отметить оплаченным';
  $('#lyPay')._onClose = () => { pm = null; };
  $('#payAmount').removeAttribute('data-autofocus'); $('#payName').removeAttribute('data-autofocus');
  (p ? $('#payAmount') : $('#payName')).setAttribute('data-autofocus', '');
  openLayer($('#lyPay'));
}
function renderPaySheet() {
  $('#payPresets').innerHTML = R.PRESETS.map(x => `<button type="button" class="chip" data-pp="${esc(x[0])}" aria-checked="${pm.name === x[0]}">${esc(x[0])}</button>`).join('');
  const editing = !!pm.id, open = !editing || pm.catOpen || !pm.cat;      // при правке: короче, без быстрых названий, категория одной строкой
  $('#payPresets').hidden = editing; $('#payCats').hidden = !open; $('#payCatCur').hidden = open;
  if (!open) { const ci = catInfo('expense', pm.cat); $('#payCatCur').innerHTML = `<span class="ci" style="${cs(ci)}" aria-hidden="true">${cIcon(ci)}</span><b>${esc(pm.cat)}</b><span class="ch">Изменить</span>`; }
  $('#payCats').innerHTML = CATS.expense.map(c => `<button type="button" role="radio" class="cat-tile" data-pcat="${esc(c[0])}" aria-checked="${c[0] === pm.cat}"><span class="ci" style="${cs(c)};--on:${onColor(c[2])}" aria-hidden="true">${cIcon(c)}<span class="tick">${icon('check')}</span></span><span>${esc(c[0])}</span></button>`).join('');
  $('#payRemind').innerHTML = R.REMIND.map(r => `<button type="button" role="radio" class="chip" data-pr="${r.id}" aria-checked="${r.id === pm.remind}">${esc(r.label)}</button>`).join('');
  $('#payTimeF').hidden = pm.remind === 'off';
  $$('#payMode [data-pmode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.pmode === pm.mode)));
  $('#payDayF').hidden = pm.mode === 'once'; $('#payOnceF').hidden = pm.mode !== 'once';
}
$('#payMode').addEventListener('click', e => { const b = e.target.closest('[data-pmode]'); if (!b || !pm) return; pm.mode = b.dataset.pmode; renderPaySheet(); buzz(6); });
$('#lyPay').addEventListener('click', e => {
  if (!pm) return;
  const pp = e.target.closest('[data-pp]'), pc = e.target.closest('[data-pcat]'), pr = e.target.closest('[data-pr]');
  if (pp) {
    pm.name = pp.dataset.pp; $('#payName').value = pm.name;
    const pre = R.PRESETS.find(x => x[0] === pm.name); if (pre && !pm.cat) pm.cat = pre[1];
    renderPaySheet(); buzz(6); if (!$('#payAmount').value) setTimeout(() => $('#payAmount').focus(), 60);
  } else if (pc) { pm.cat = pc.dataset.pcat; if (pm.id) pm.catOpen = false; renderPaySheet(); buzz(6); }
  else if (pr) { pm.remind = pr.dataset.pr; renderPaySheet(); buzz(6); }
});
$('#payCatCur').addEventListener('click', () => { if (pm) { pm.catOpen = true; renderPaySheet(); } });
$('#payName').addEventListener('input', e => { pm.name = e.target.value; hideErr($('#payErr')); });
$('#payAmount').addEventListener('input', e => {
  let v = e.target.value.replace(/[^\d.,]/g, ''); const i = v.search(/[.,]/);
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/[.,]/g, '').slice(0, 2);
  if (v !== e.target.value) e.target.value = v; hideErr($('#payErr'));
});
$('#payDay').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2); hideErr($('#payErr')); });
$('#payForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!pm) return;
  const name = $('#payName').value.trim().replace(/\s+/g, ' ').slice(0, 30), amount = parseAmount($('#payAmount').value), day = parseInt($('#payDay').value, 10), err = $('#payErr'), once = $('#payOnce').value;
  if (!name) { showErr(err, 'Назови платёж, например «аренда».'); $('#payName').focus(); return; }
  if (!(amount > 0)) { showErr(err, 'Впиши сумму, например 500.'); $('#payAmount').focus(); return; }
  if (pm.mode === 'once') { if (!parseYmd(once)) { showErr(err, 'Выбери дату платежа.'); return; } }
  else if (!(day >= 1 && day <= 31)) { showErr(err, 'Впиши число месяца от 1 до 31.'); $('#payDay').focus(); return; }
  if (!pm.cat) { showErr(err, 'Выбери категорию, и сохраним.'); return; }
  const time = /^\d{2}:\d{2}$/.test($('#payTime').value) ? $('#payTime').value : '10:00', T = new Date();
  let p = pm.id && payById(pm.id);
  if (p) {
    Object.assign(p, { name, amount: round2(amount), cat: pm.cat, remind: pm.remind, time });
    if (pm.mode === 'once') { p.once = once; p.days = [{ from: '0000-00', day: Number(once.slice(8)) }]; p.start = once.slice(0, 7); }
    else if (p.once) { p.once = ''; p.days = [{ from: '0000-00', day }]; p.start = R.startMonth(day, T); }
    else R.setDay(p, day, T);                          // новый день со следующего месяца, прошлые отметки остаются
  } else {
    p = pm.mode === 'once'
      ? { id: 'p' + uid().slice(0, 8), name, amount: round2(amount), cat: pm.cat, once, days: [{ from: '0000-00', day: Number(once.slice(8)) }], remind: pm.remind, time, start: once.slice(0, 7), paid: {}, nid: R.freeNid(state.rec.list) }
      : { id: 'p' + uid().slice(0, 8), name, amount: round2(amount), cat: pm.cat, once: '', days: [{ from: '0000-00', day }], remind: pm.remind, time, start: R.startMonth(day, T), paid: {}, nid: R.freeNid(state.rec.list) };
    state.rec.list.push(p);
  }
  const edit = !!pm.id, remind = pm.remind !== 'off';
  save(); closeLayer($('#lyPay')); buzz(15); render();
  const r = await afterDataChange();
  if (remind && r && r.reason === 'denied') toast('Платёж сохранён, но уведомления выключены. Включи их в настройках телефона.', null, null, 'oops');
  else toast(edit ? 'Изменения сохранены' : 'Платёж добавлен', null, null, 'happy');
});
$('#payMark').addEventListener('click', () => {
  const p = pm && payById(pm.id); if (!p) return;
  const mk = R.mkOfDate(new Date()), was = R.isPaid(p, mk);
  if (was) delete p.paid[mk]; else p.paid[mk] = 'manual';
  save(); afterDataChange(); closeLayer($('#lyPay')); render();
  toast(was ? 'Отметка снята' : `Отмечено: ${cap(p.name)}`, null, null, 'happy');
});
$('#payDelete').addEventListener('click', () => {
  const i = pm ? state.rec.list.findIndex(x => x.id === pm.id) : -1; if (i < 0) return;
  const [gone] = state.rec.list.splice(i, 1);
  save(); afterDataChange(); closeLayer($('#lyPay')); render();
  undoToast('Платёж удалён', () => { state.rec.list.splice(Math.min(i, state.rec.list.length), 0, gone); save(); afterDataChange(); render(); });
});

/* ---------- Профиль ---------- */
const loggedIn = () => !!(cloud.enabled && me);
const startBal = () => 0;
const okIc = () => `<span class="pl-ok" role="img" aria-label="Привязано">${icon('check')}</span>`;
function setPlate(sel, sub, right, disabled) {
  const el = $(sel);
  $('small', el).textContent = sub;
  if (right !== null) $('.rw-r', el).innerHTML = right;
  el.disabled = !!disabled;
}
/* Тема: как в телефоне, светлая или тёмная. Выбор помнится на этом телефоне */
const themePref = () => { try { const t = localStorage.getItem('fin_theme'); return t === 'light' || t === 'dark' ? t : 'auto'; } catch (_) { return 'auto'; } };
function applyTheme(t) {
  const el = document.documentElement;
  if (t === 'auto') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', t);
  try { if (t === 'auto') localStorage.removeItem('fin_theme'); else localStorage.setItem('fin_theme', t); } catch (_) {}
}
function renderTheme() {
  const t = themePref();
  $$('#themeSeg [data-theme-pick]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.themePick === t)));
  $('#themeNote').textContent = t === 'auto' ? 'Подстраивается под телефон' : t === 'dark' ? 'Всегда тёмная' : 'Всегда светлая';
}
$('#themeSeg').addEventListener('click', e => { const b = e.target.closest('[data-theme-pick]'); if (!b) return; applyTheme(b.dataset.themePick); renderTheme(); });
function renderAcc() { renderAccount(); renderTheme(); }
function renderAccount() {
  const u = me || previewMe(), on = loggedIn() || !!previewMe(), canLogin = cloud.enabled && !me;
  $('#setFoot').textContent = on ? 'Данные хранятся на телефоне и в твоём облаке. Видны только тебе.' : 'Данные хранятся только на этом телефоне.';
  $('#acctMascot').innerHTML = MD.mascot('happy', 48);
  if (document.activeElement !== $('#nameIn')) $('#nameIn').value = state.name || '';
  $('#btnSignOut').hidden = !on;
  $('#loginCard').hidden = !canLogin;
  if (on) {
    const nm = userName(); $('#acctName').textContent = nm || (u && (u.email || u.phone)) || 'Мой профиль';
    $('#acctSub').textContent = nm && u && (u.phone || u.email) ? (u.phone || u.email) : 'Данные в облаке';
  } else {
    $('#acctName').textContent = userName() || 'Ты без входа';
    $('#acctSub').textContent = 'Данные только на этом телефоне';
  }
  const ph = on && u && u.phoneLinked, em = on && u && u.emailLinked, off = !cloud.enabled && !previewMe();
  setPlate('#plPhone', ph ? u.phoneLinked : on ? 'Не привязан' : 'Появится после входа', ph ? okIc() : on ? '<span class="pl-btn">Привязать</span>' : '', off);
  setPlate('#plEmail', em ? u.emailLinked : on ? 'Не привязана' : 'Появится после входа', em ? okIc() : on ? '<span class="pl-btn">Привязать</span>' : '', off);
  { const el = $('#plAiS'); if (el) el.textContent = MD.ai.available() ? 'Подключён' : 'Понимает любые фото и вопросы'; }
  setPlate('#plCurrency', `${state.currency} ${CURRENCIES[state.currency]}`, null, false);
  const rc = MD.notify.cfg();
  setPlate('#plRemind', rc.on ? `Каждый день в ${rc.times.join(', ')}` : 'Выключены', null, false);
  setPlate('#plQuick', rc.quick ? 'Кнопки на экране блокировки включены' : 'Записывай, не открывая Фин', null, false);
  const up = MD.events.upcoming(festList(), new Date())[0];
  const ng = state.nudge, onCats = MD.nudges.WATCH.filter(k => ng.cats[k] !== false).length;
  $('#plNudge').setAttribute('aria-checked', String(ng.on)); $('#plNudge .sw-t').setAttribute('aria-checked', String(ng.on));
  $('#plNudge small').textContent = ng.on ? NG.counter(ng) : NG.t('set.off');
  setPlate('#plNudgeCats', ng.on ? (onCats === MD.nudges.WATCH.length ? 'Все категории' : `Выбрано ${onCats} из ${MD.nudges.WATCH.length}`) : NG.t('set.off'), null, !ng.on);
  const plus = MD.sub.isPlus();
  $('#acctPlus').hidden = !plus;
  $('#plusTitle').textContent = plus ? 'Фин Навсегда включён' : 'Фин Навсегда';
  $('#plusSub').textContent = plus ? 'Спасибо! Платить больше не нужно' : `Разовая покупка ${MD.sub.PRODUCT.price}, без подписки`;
}
$('#plPlus').addEventListener('click', () => MD.sub.open('generic'));
$('#loginCard').addEventListener('click', askLogin);

/* Одна шторка для всего в профиле: телефон, почта, стартовый баланс, валюта, копия данных */
let panel = null;
const PN_TITLE = { cats: 'Категории', fest: 'Праздники и подарки', nudge: 'Подсказки Фина', phone: 'Телефон', email: 'Почта', balance: 'Стартовый баланс', currency: 'Валюта', data: 'Экспорт и импорт', remind: 'Напоминания', quick: 'Виджет и экран блокировки', ai: 'Фин-ИИ' };
const pnBtn = (act, label, cls = 'primary', dis = false) => `<button class="btn ${cls} wide" type="button" data-pn="${act}" ${dis ? 'disabled' : ''}><span class="spin" aria-hidden="true"></span><span>${esc(label)}</span></button>`;
const onlyWay = () => ((me && me.providers) || []).length <= 1;
const normPhone = v => { let t = String(v).replace(/[\s\-()]/g, ''); if (/^8\d{10}$/.test(t)) t = '+7' + t.slice(1); return /^\+\d{9,15}$/.test(t) ? t : null; };
const pnErr = (e, ctx) => {
  const l = (((e && e.code) || '') + ' ' + ((e && e.message) || '')).toLowerCase();
  if (/invalid-phone/.test(l)) return 'Не понял номер. Введи с кодом страны: +375…';
  if (/invalid-verification|invalid-code/.test(l)) return 'Неверный код. Попробуй ещё раз';
  if (/expired/.test(l)) return 'Код устарел. Запроси новый.';
  if (/already-in-use|credential-already|provider-already/.test(l)) return 'Это уже привязано к другому профилю. Попробуй другое.';
  if (/weak-password/.test(l)) return 'Пароль короткий. Нужно хотя бы 6 символов.';
  if (/invalid-email/.test(l)) return 'Не понял почту. Проверь адрес.';
  if (/requires-recent-login/.test(l)) return 'Для этого нужно войти заново. Выйди и войди через Google или Apple.';
  if (ctx === 'send') return 'Не удалось отправить код. Проверь связь';
  if (ctx === 'code') return 'Неверный код. Попробуй ещё раз';
  return 'Не получилось. Проверь связь и попробуй снова.';
};
/* Окно покупки не открываем поверх окна профиля: сначала закрываем его, после покупки возвращаем и делаем то, что хотели */
function gateFromPanel(feature, ok) {
  if (MD.sub.isPlus()) return ok();
  const kind = panel && panel.kind;
  closeLayer($('#lyLink')); panel = null;
  setTimeout(() => MD.sub.open(feature, () => { openPanel(kind || 'remind'); ok(); }), 80);
}
function openPanel(kind, extra = {}) { panel = Object.assign({ kind, step: 'main' }, extra); renderPanel(); openLayer($('#lyLink')); }
function renderPanel(err) {
  const P = panel; if (!P) return;
  const e = err ? `<div class="msg err" role="alert">${esc(err)}</div>` : '';
  let say = null, html = '';
  const cur = k => `<div class="pn-cur"><small>${k[0]}</small><b>${esc(k[1])}</b></div>`;
  if (P.kind === 'phone') {
    if (P.step === 'main') {
      html = cur(['Привязан номер', me.phoneLinked]) + pnBtn('phone-change', 'Изменить номер', 'soft') + (P.confirm ? `<p class="note">Войти по номеру будет нельзя. Отвязать?</p>${pnBtn('phone-unlink-yes', 'Да, отвязать', 'danger')}${pnBtn('unlink-no', 'Оставить', 'ghost')}` : pnBtn('phone-unlink', 'Отвязать', 'danger', onlyWay())) + (onlyWay() ? '<div class="note ctr">Это единственный способ входа</div>' : '');
    } else if (P.step === 'new') {
      say = ['hello', P.mode === 'change' ? 'Введи новый номер<small>Пришлю СМС с кодом.</small>' : 'Привяжем телефон<small>Пришлю СМС с кодом.</small>'];
      html = fld('pnPhone', P.mode === 'change' ? 'Новый номер, например +375 29 123-45-67' : 'Номер, например +375 29 123-45-67', { type: 'tel', mode: 'tel', ac: 'tel', value: P.raw || '' }) + e + pnBtn('phone-send', 'Получить код');
    } else {
      say = ['notify', `Введи код из СМС<small>${esc(P.phone)}</small>`];
      html = fld('pnCode', 'Код из СМС', { mode: 'numeric', ac: 'one-time-code', max: 6 }) + e + pnBtn('phone-confirm', 'Подтвердить') + pnBtn('phone-resend', 'Отправить код ещё раз', 'ghost');
    }
  } else if (P.kind === 'email') {
    if (P.step === 'main') {
      html = cur(['Привязана почта', me.emailLinked]) + pnBtn('email-change', 'Изменить почту', 'soft') + (P.confirm ? `<p class="note">Войти по почте будет нельзя. Отвязать?</p>${pnBtn('email-unlink-yes', 'Да, отвязать', 'danger')}${pnBtn('unlink-no', 'Оставить', 'ghost')}` : pnBtn('email-unlink', 'Отвязать', 'danger', onlyWay())) + (onlyWay() ? '<div class="note ctr">Это единственный способ входа</div>' : '');
    } else if (P.step === 'sent') {
      say = ['happy', `Отправил письмо на ${esc(P.email)}<small>Открой его и нажми на ссылку, чтобы подтвердить адрес.</small>`];
      html = pnBtn('email-done', 'Готово');
    } else if (P.mode === 'change') {
      say = ['hello', 'Введи новую почту<small>Пришлю письмо со ссылкой.</small>'];
      html = fld('pnEmail', 'Новая почта', { type: 'email', mode: 'email', ac: 'email', extra: 'autocapitalize="off"' }) + e + pnBtn('email-save', 'Изменить почту');
    } else {
      say = ['hello', 'Добавим почту<small>Нужна, чтобы вернуть доступ.</small>'];
      html = fld('pnEmail', 'Почта', { type: 'email', mode: 'email', ac: 'email', extra: 'autocapitalize="off"' }) + fld('pnPw', 'Пароль, не короче 6 символов', { type: 'password', ac: 'new-password' }) + e + pnBtn('email-link', 'Привязать');
    }
  } else if (P.kind === 'balance') {
    say = ['hello', 'С чего начинаем?<small>Сколько денег было до первой записи. Дальше баланс считается сам.</small>'];
    html = fld('pnBal', 'Сумма', { mode: 'decimal', unit: sym(), value: String(startBal()).replace('.', ',') }) + e + pnBtn('bal-save', 'Сохранить');
  } else if (P.kind === 'currency') {
    const sel = P.cur || state.currency;
    html = `<div class="chips" role="radiogroup" aria-label="Валюта">${Object.keys(CURRENCIES).map(c => `<button type="button" role="radio" class="chip" data-chcur="${c}" aria-checked="${c === sel}">${c} ${CURRENCIES[c]}</button>`).join('')}</div><div class="note">Меняется только знак валюты. Суммы не пересчитываются по курсу: 100 Br станут 100 $.</div>` + pnBtn('cur-apply', 'Применить', 'primary', sel === state.currency);
  } else if (P.kind === 'fest') {
    const ups = MD.events.upcoming(festList(), new Date());
    say = ups.length ? null : ['hello', 'Добавь чей-то день рождения или праздник<small>Напомню заранее отложить деньги на подарок.</small>'];
    html = (ups.length ? `<div class="grp flat">${ups.map(({ e, occ }) => `<button class="row" type="button" data-pn="ev-edit:${esc(e.id)}"><span class="rw-ic" aria-hidden="true"><i data-ic="gift"></i></span><span class="rw-t"><b>${esc(MD.events.whatText(e))}</b><small>${esc(MD.events.dayText(occ))}${e.yearly ? ', каждый год' : ''} · ${esc(MD.events.reminderLine(e, new Date()))}</small></span><span class="rw-r">${icon('right')}</span></button>`).join('')}</div>` : '') +
      pnBtn('ev-add', 'Добавить праздник', 'primary') +
      `<div class="grp flat"><button class="row" type="button" data-pn="ev-ask" role="switch" aria-checked="${state.fest.ask}"><span class="rw-ic" aria-hidden="true"><i data-ic="spark"></i></span><span class="rw-t"><b>Спрашивать о праздниках</b><small>Предлагать внести праздник</small></span><span class="sw-t" aria-checked="${state.fest.ask}"></span></button></div>`;
  } else if (P.kind === 'nudge') {
    const ng = state.nudge;
    say = ['hello', `${NG.counter(ng)}<small>Выбери, по каким категориям Фин может подсказывать.</small>`];
    html = `<div class="grp flat">${MD.nudges.WATCH.map(k => { const ci = catInfo('expense', k), on = ng.cats[k] !== false; return `<button class="row" type="button" data-pn="ng-cat:${esc(k)}" role="switch" aria-checked="${on}"><span class="rw-ic" style="color:${ci[2]}" aria-hidden="true">${cIcon(ci)}</span><span class="rw-t"><b>${esc(k)}</b><small>${MD.nudges.PRIO.includes(k) ? 'Привычки и рост' : 'Только сильный рост'}</small></span><span class="sw-t" aria-checked="${on}"></span></button>`; }).join('')}</div>` +
      pnBtn('ng-reset', NG.t('set.reset'), 'ghost');
  } else if (P.kind === 'remind') {
    const c = MD.notify.cfg(), plus = MD.sub.isPlus();
    const DN = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    say = ['notify', 'Напомню записать траты<small>Придёт уведомление, даже если приложение закрыто.</small>'];
    html = `<div class="grp flat"><button class="row" type="button" data-pn="rm-toggle" role="switch" aria-checked="${c.on}"><span class="rw-ic" aria-hidden="true"><i data-ic="bell"></i></span><span class="rw-t"><b>Каждый день</b><small>${MD.notify.supported() ? (c.on ? 'Включено' : 'Выключено') : 'Работает только в приложении'}</small></span><span class="sw-t" aria-checked="${c.on}"></span></button></div>`;
    if (c.on) {
      html += `<div class="fl">Время</div>` + c.times.map((t, i) => `<div class="time-row"><label class="field t"><input type="time" data-time="${i}" value="${esc(t)}" aria-label="Время напоминания ${i + 1}"><span>Напоминание ${i + 1}</span></label>${c.times.length > 1 ? `<button class="time-x" type="button" data-pn="rm-del:${i}" aria-label="Убрать время">${icon('close')}</button>` : ''}</div>`).join('');
      if (c.times.length < 3) html += pnBtn('rm-add', plus ? 'Добавить время' : 'Добавить время · Плюс', 'soft');
      html += `<div class="fl">Дни</div><div class="day-chips" role="group" aria-label="Дни недели">${DN.map((d, i) => `<button type="button" class="chip" data-pn="rm-day:${i + 1}" aria-checked="${c.days.includes(i + 1)}" aria-pressed="${c.days.includes(i + 1)}">${d}</button>`).join('')}</div>`;
      if (!plus) html += '<div class="note">Свои дни недели и несколько напоминаний — в Фин Плюс.</div>';
    }
    html += e;
  } else if (P.kind === 'ai') {
    const on = MD.ai.available();
    say = [on ? 'happy' : 'think', on ? 'ИИ подключён<small>Фин понимает любые вопросы, фото, скриншоты и PDF.</small>' : 'Подключим ИИ<small>Тогда Фин поймёт любой вопрос и прочитает любую картинку.</small>'];
    html = `${fld('pnAiKey', on ? 'Ключ сохранён, чтобы заменить, введи новый' : 'Ключ Anthropic API (sk-ant-…)', { type: 'password', ac: 'off' })}
      <p class="note">Ключ хранится только на этом телефоне. В запрос уходят твоё сообщение, прикреплённые файлы и короткая сводка: категории, суммы за месяц, копилки и платежи. Остальные записи не отправляются. Запросы оплачиваются с твоего ключа.</p>
      ${e}${pnBtn('ai-save', 'Сохранить ключ')}${on ? pnBtn('ai-clear', 'Отключить ИИ', 'ghost') : ''}`;
  } else if (P.kind === 'quick') {
    const c = MD.notify.cfg(), nat = MD.notify.supported();
    say = ['hello', 'Записывай, не открывая приложение'];
    html = `<div class="grp flat"><button class="row" type="button" data-pn="quick-toggle" role="switch" aria-checked="${c.quick}" ${nat ? '' : 'disabled'}><span class="rw-ic" aria-hidden="true"><i data-ic="lock"></i></span><span class="rw-t"><b>Кнопки на экране блокировки</b><small>${nat ? 'Расход, Доход, Голосом' : 'Работает только в приложении'}</small></span><span class="sw-t" aria-checked="${c.quick}"></span></button></div>
      <div class="fl">Виджет на главный экран</div>
      <div class="wsel">${[['small', 'Малый', '2×1', 'Одна кнопка записи'], ['medium', 'Средний', '4×1', 'Расход, доход, голос'], ['large', 'Большой', '4×2', 'Баланс и кнопки']].map(w => `<button class="wopt" type="button" data-pn="widget:${w[0]}" ${nat ? '' : 'disabled'}><span class="wpv wpv-${w[0]}" aria-hidden="true"></span><b>${w[1]}</b><small>${w[2]}</small></button>`).join('')}</div>
      <div class="note">Нажми размер, и телефон предложит поставить виджет.</div>
      ${e}`;
  } else if (P.kind === 'cats') {
    const t = P.t || 'expense', list = CATS[t];
    if (P.edit) {
      const E = P.edit;
      html = fld('pnCatName', 'Название', { max: 24, value: E.name }) + e +
        `<div class="fl">Значок</div><div class="pick-grid" role="radiogroup" aria-label="Значок">${MD.CAT_ICONS.map(n => `<button type="button" role="radio" class="pk" data-pn="cat-icon:${n}" aria-checked="${E.icon === n}" aria-label="${n}"><span style="--c:${E.color};color:${E.color}">${icon(n)}</span></button>`).join('')}</div>` +
        `<div class="fl">Цвет</div><div class="pick-grid pal" role="radiogroup" aria-label="Цвет">${MD.CAT_PALETTE.map(c => `<button type="button" role="radio" class="pk sw" data-pn="cat-col:${c}" aria-checked="${E.color === c}" aria-label="${c}"><i style="background:${c}"></i></button>`).join('')}</div>` +
        pnBtn('cat-save', 'Сохранить') + (E.custom ? pnBtn('cat-del', 'Удалить категорию', 'danger') : E.changed ? pnBtn('cat-reset', 'Вернуть как было', 'ghost') : '') + pnBtn('cat-back', 'Назад', 'ghost');
    } else {
      html = `<div class="seg" role="radiogroup" aria-label="Тип">${[['expense', 'Расходы'], ['income', 'Доходы']].map(x => `<button type="button" role="radio" class="seg-b" data-pn="cat-t:${x[0]}" aria-checked="${t === x[0]}">${x[1]}</button>`).join('')}</div>
        <div class="grp flat">${list.filter(c => c[0] !== OTHER).map((c, i) => `<button class="row" type="button" data-pn="cat-edit:${i}"><span class="rw-ic ci" style="${cs(c)}" aria-hidden="true">${cIcon(c)}</span><span class="rw-t"><b>${esc(c[0])}${c[3] && c[3].isNew ? '<em class="newb">new</em>' : ''}</b></span><span class="rw-r"><i data-ic="pencil"></i></span></button>`).join('')}</div>` + pnBtn('cat-add', 'Новая категория', 'soft');
    }
  } else if (P.kind === 'data' && P.done) {
    say = ['happy', 'Файл сохранён'];
    html = `<div class="pn-cur"><small>Где лежит файл</small><b>${esc(P.done.path)}</b></div>` + pnBtn('exp-share', 'Поделиться', 'primary') + (P.done.uri ? pnBtn('exp-open', 'Открыть файл', 'soft') : '') + pnBtn('exp-done', 'Готово', 'ghost');
  } else if (P.kind === 'data') {
    html = `<div class="pn-sec"><b>Экспорт</b><small>Копия всех записей, копилок и платежей одним файлом.</small>${pnBtn('exp-file', 'Сохранить в файл…', 'soft')}</div>
      <div class="pn-sec"><b>Импорт</b><small>Выбери файл с копией. Текущие данные заменятся, а вернуть их можно сразу после.</small>${pnBtn('imp-file', 'Выбрать файл', 'soft')}<input id="pnFile" type="file" accept=".json,application/json,text/plain" hidden>${e}</div>`;
  }
  $('#linkTitle').textContent = PN_TITLE[P.kind];
  $('#linkBody').innerHTML = (say ? MD.say(say[0], say[1], 76) : '') + html;
  paintIcons($('#linkBody'));
  const f = $('#linkBody input:not([type=file]):not([hidden]):not([type=time])'); if (f && P.kind !== 'data') setTimeout(() => f.focus({ preventScroll: true }), 80);
}
async function refreshMe() { try { const u = await cloud.refreshUser(); if (u) me = Object.assign({}, me, u); } catch (_) {} renderAccount(); }
$('#s-acc').addEventListener('click', e => {
  const b = e.target.closest('[data-plate]'); if (!b || (b.disabled && !(me === null && cloud.enabled))) return;
  const k = b.dataset.plate;
  if (k === 'nudge-on') { state.nudge.on = !state.nudge.on; if (!state.nudge.on) state.nudge.active = null; save(); renderAccount(); renderNudge(); nudgeRefresh(true); buzz(8); return; }
  if (k === 'phone' || k === 'email') { if (!me) return askLogin(); }
  if (k === 'phone') me.phoneLinked ? openPanel('phone') : openPanel('phone', { step: 'new', mode: 'link' });
  else if (k === 'email') me.emailLinked ? openPanel('email') : openPanel('email', { step: 'new', mode: 'link' });
  else openPanel(k);
});
async function pnRun(btn, ctx, fn) {
  btn.classList.add('loading'); btn.disabled = true;
  try { await fn(); } catch (err) { renderPanel(pnErr(err, ctx)); }
  finally { if (btn.isConnected) { btn.classList.remove('loading'); btn.disabled = false; } }
}
function pnDone(msg, pose = 'happy') { closeLayer($('#lyLink')); panel = null; toast(msg, null, null, pose); }
$('#linkBody').addEventListener('click', async ev => {
  const chip = ev.target.closest('[data-chcur]');
  if (chip) { panel.cur = chip.dataset.chcur; renderPanel(); return; }
  const b = ev.target.closest('[data-pn]'); if (!b || b.disabled || !panel) return;
  const a = b.dataset.pn, P = panel, V = id => ($(id) || {}).value || '';
  if (a === 'ev-add' || a.startsWith('ev-edit:')) { const id = a.startsWith('ev-edit:') ? a.slice(8) : undefined; closeLayer($('#lyLink')); panel = null; setTimeout(() => openEvent(id), 60); return; }
  if (a === 'ev-ask') { state.fest.ask = !state.fest.ask; save(); renderPanel(); return; }
  if (a.startsWith('ng-cat:')) { const k = a.slice(7), ng = state.nudge; if (ng.cats[k] === false) delete ng.cats[k]; else ng.cats[k] = false; if (ng.active && ng.active.cat === k && ng.cats[k] === false) ng.active = null; save(); renderPanel(); renderAccount(); renderNudge(); nudgeRefresh(true); return; }
  if (P.kind === 'cats') {
    const t = P.t || 'expense';
    if (a.startsWith('cat-t:')) { P.t = a.slice(6); P.edit = null; renderPanel(); return; }
    if (a.startsWith('cat-edit:')) { const c = CATS[t].filter(x => x[0] !== OTHER)[Number(a.slice(9))]; if (!c) return; P.edit = { entry: c, name: c[0], icon: c[1], color: c[2], custom: !!(c[3] && c[3].custom), changed: !!(c[3] && !c[3].custom && (c[0] !== c[3].key || c[3].custom || state.cats.some(x => !x.custom && x.t === t && x.k === c[3].key))) }; renderPanel(); return; }
    if (a === 'cat-add') { P.edit = { entry: null, name: '', icon: 'grid', color: MD.CAT_PALETTE[4], custom: true, fresh: true }; renderPanel(); return; }
    if (a === 'cat-back') { P.edit = null; renderPanel(); return; }
    if (a.startsWith('cat-icon:')) { P.edit.name = ($('#pnCatName') || {}).value || P.edit.name; P.edit.icon = a.slice(9); renderPanel(); return; }
    if (a.startsWith('cat-col:')) { P.edit.name = ($('#pnCatName') || {}).value || P.edit.name; P.edit.color = a.slice(8); renderPanel(); return; }
    if (a === 'cat-save') {
      const E = P.edit, name = V('#pnCatName').trim();
      let err = '';
      if (E.fresh) { if (!name) err = 'Впиши название.'; else if (!addCat(t, name, E.icon, E.color, false)) err = 'Такая категория уже есть.'; else { save(); render(); } }
      else err = saveCat(t, E.entry, { n: name, i: E.icon, c: E.color });
      if (err) { P.edit.name = name; renderPanel(err); return; }
      P.edit = null; renderPanel(); toast('Категория сохранена', null, null, 'happy'); return;
    }
    if (a === 'cat-del') { removeCat(t, P.edit.entry); P.edit = null; renderPanel(); toast('Категория удалена, записи перенесены в «Другое»'); return; }
    if (a === 'cat-reset') { resetCat(t, P.edit.entry); P.edit = null; renderPanel(); return; }
  }
  if (a === 'ng-reset') { NG.resetHidden(state.nudge); save(); renderPanel(); renderAccount(); toast(NG.t('set.resetDone'), null, null, 'happy'); nudgeRefresh(true); return; }
  if (a === 'rm-toggle') {
    const c = MD.notify.cfg(); c.on = !c.on; MD.notify.save(c);
    renderPanel(); renderAccount();
    if (c.on) { const r = await MD.notify.apply(); if (r && r.reason === 'denied') { c.on = false; MD.notify.save(c); renderPanel('Нужен доступ к уведомлениям. Включи их в настройках телефона: Приложения → Фин → Уведомления.'); renderAccount(); } }
    else MD.notify.apply();
    return;
  }
  if (a === 'rm-add') { return gateFromPanel('remind', () => { const c = MD.notify.cfg(); const [h, m] = (c.times[c.times.length - 1] || '21:00').split(':').map(Number); c.times.push(`${pad((h + 1) % 24)}:${pad(m)}`); MD.notify.save(c); MD.notify.apply(); renderPanel(); renderAccount(); }); }
  if (a.startsWith('rm-del:')) { const c = MD.notify.cfg(); c.times.splice(Number(a.slice(7)), 1); MD.notify.save(c); MD.notify.apply(); renderPanel(); renderAccount(); return; }
  if (a.startsWith('rm-day:')) {
    const d = Number(a.slice(7)), c = MD.notify.cfg();
    return gateFromPanel('remind', () => {
      const i = c.days.indexOf(d);
      if (i >= 0) { if (c.days.length > 1) c.days.splice(i, 1); } else c.days.push(d);
      c.days.sort(); MD.notify.save(c); MD.notify.apply(); renderPanel();
    });
  }
  if (a.startsWith('widget:')) {
    const r = await MD.notify.pinWidget(a.slice(7));
    toast(r.ok ? 'Подтверди добавление на экране телефона' : 'Не получилось добавить сам. Удерживай пустое место на главном экране, «Виджеты», «Фин»', null, null, r.ok ? 'happy' : 'oops');
    return;
  }
  if (a === 'quick-toggle') {
    const c = MD.notify.cfg(), want = !c.quick;
    const r = await MD.notify.setQuick(want);
    if (!r.ok) { renderPanel(r.reason === 'denied' ? 'Нужен доступ к уведомлениям. Включи их в настройках телефона: Приложения → Фин → Уведомления.' : 'Не получилось включить. Попробуй ещё раз.'); }
    else renderPanel();
    renderAccount(); return;
  }
  if (a === 'ai-save') { const k = V('#pnAiKey').trim(); if (!/^sk-[\w-]{20,}$/.test(k)) return renderPanel('Ключ выглядит иначе. Он начинается с sk-ant- и длинный, скопируй его целиком.'); MD.ai.setKey(k); renderAccount(); if (MD.chat) MD.chat.render(true); pnDone('ИИ подключён', 'happy'); return; }
  if (a === 'ai-clear') { MD.ai.setKey(''); renderAccount(); if (MD.chat) MD.chat.render(true); pnDone('ИИ отключён', 'think'); return; }
  if (a === 'phone-change') { P.step = 'new'; P.mode = 'change'; renderPanel(); return; }
  if (a === 'email-change') { P.step = 'new'; P.mode = 'change'; renderPanel(); return; }
  if (a === 'phone-send' || a === 'phone-resend') {
    const raw = a === 'phone-send' ? V('#pnPhone') : P.phone, n = normPhone(raw); P.raw = raw;
    if (!n) return renderPanel('Не понял номер. Введи с кодом страны: +375…');
    return pnRun(b, 'send', async () => {
      if (P.mode === 'change' && !P.unlinked) { await cloud.unlink('phone'); P.unlinked = true; await refreshMe(); }
      await cloud.linkPhoneSend(n); P.phone = n; P.step = 'code'; renderPanel();
    });
  }
  if (a === 'phone-confirm') {
    const c = V('#pnCode').replace(/\D/g, '');
    if (c.length < 6) return renderPanel('Неверный код. Попробуй ещё раз');
    return pnRun(b, 'code', async () => { await cloud.linkPhoneConfirm(c); await refreshMe(); pnDone(P.mode === 'change' ? 'Номер обновлён' : 'Телефон привязан'); });
  }
  if (a === 'phone-unlink' || a === 'email-unlink') { P.confirm = true; renderPanel(); return; }
  if (a === 'unlink-no') { P.confirm = false; renderPanel(); return; }
  if (a === 'phone-unlink-yes' || a === 'email-unlink-yes') {
    const ph = a === 'phone-unlink-yes';
    return pnRun(b, 'x', async () => { await cloud.unlink(ph ? 'phone' : 'password'); await refreshMe(); pnDone(ph ? 'Телефон отвязан' : 'Почта отвязана', 'think'); });
  }
  if (a === 'email-link' || a === 'email-save') {
    const em = V('#pnEmail').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return renderPanel('Не понял почту. Проверь адрес.');
    if (a === 'email-link') {
      const pw = V('#pnPw'); if (pw.length < 6) return renderPanel('Пароль короткий. Нужно хотя бы 6 символов.');
      return pnRun(b, 'x', async () => { await cloud.linkEmail(em, pw); await refreshMe(); pnDone('Почта привязана'); });
    }
    return pnRun(b, 'x', async () => { await cloud.updateEmail(em); await refreshMe(); P.step = 'sent'; P.email = em; renderPanel(); });
  }
  if (a === 'email-done') return pnDone('Почта обновлена');
  if (a === 'bal-save') {
    const v = parseAmount(V('#pnBal'), true);
    if (!Number.isFinite(v)) return renderPanel('Введи сумму цифрами, например 1250,50.');
    ensureAccount(); state.accounts[0].balance = round2(v); save(); render(); buzz(12);
    return pnDone('Баланс обновлён');
  }
  if (a === 'cur-apply') {
    state.currency = P.cur; save(); render(); return pnDone(`Валюта: ${P.cur}`);
  }
  if (a === 'exp-file' || a === 'exp-share') {
    const json = JSON.stringify(state), name = `fin-копия-${today()}.json`, F = MD.notify.native && MD.notify.native('FinNative');
    if (F && a === 'exp-share') { try { await F.shareFile({ name, data: json, mime: 'application/json' }); } catch (_) { renderPanel('Не получилось поделиться файлом.'); } return; }
    if (F && F.saveFile) {                             // системное окно «Сохранить как»: человек выбирает место сам
      try {
        const r = await F.saveFile({ name, data: json, mime: 'application/json' });
        if (r && r.ok) { P.done = { path: r.path || name, uri: r.uri || '' }; renderPanel(); }
      } catch (_) { renderPanel('Не получилось сохранить файл. Попробуй ещё раз или выбери другую папку.'); }
      return;
    }
    const blob = new Blob([json], { type: 'application/json' }), file = new File([blob], name, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Копия данных Фина' }); P.done = { path: 'Отправлено через «Поделиться»' }; renderPanel(); return; } }
    catch (err) { if (err && err.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob), l = document.createElement('a');
    l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    P.done = { path: `Загрузки / ${name}` }; renderPanel(); return;
  }
  if (a === 'exp-open') { const F = MD.notify.native && MD.notify.native('FinNative'); try { await F.openFile({ uri: P.done.uri, mime: 'application/json' }); } catch (_) { renderPanel('Нет приложения, которое открывает такие файлы. Файл лежит по указанному пути.'); } return; }
  if (a === 'exp-done') { P.done = null; renderPanel(); return; }
  if (a === 'imp-file') { $('#pnFile').click(); return; }
});
$('#linkBody').addEventListener('change', ev => {
  const ti = ev.target.dataset && ev.target.dataset.time;
  if (ti !== undefined && ev.target.value) { const c = MD.notify.cfg(); c.times[Number(ti)] = ev.target.value; MD.notify.save(c); MD.notify.apply(); renderAccount(); return; }
  if (ev.target.id !== 'pnFile' || !ev.target.files[0]) return;
  const r = new FileReader();
  r.onload = () => restoreFrom(String(r.result || '').trim());
  r.onerror = () => renderPanel('Не получилось прочитать файл.');
  r.readAsText(ev.target.files[0]);
});
function restoreFrom(raw) {
  let st = null;
  try { st = sanitize(JSON.parse(raw)); } catch (_) {}
  if (!st) return renderPanel('Не получилось прочитать этот файл. Выбери файл копии, который сохранил Фин.');
  const before = state;
  state = st; save(); render(); nudgeRefresh(true); afterDataChange();
  closeLayer($('#lyLink')); panel = null;
  undoToast(`Данные заменены: ${st.tx.length} ${pluralN(st.tx.length, 'запись', 'записи', 'записей')}`, () => { state = before; save(); render(); nudgeRefresh(true); afterDataChange(); });
}
$('#btnSignOut').addEventListener('click', async () => {
  const yes = await confirmDlg('Выйти из аккаунта?', 'Данные останутся в облаке. Войдёшь снова, и всё вернётся.', 'Выйти');
  if (!yes) return;
  if (!cloud.enabled) { toast('Это предпросмотр аккаунта'); return; }
  setTimeout(() => { cloud.signOut(); toast('Вы вышли'); }, 200);
});

/* ---------- Мелочи: клавиатура, быстрые действия ---------- */
const confetti = () => {};                       // праздничных эффектов нет: движение только по делу
if (window.visualViewport) {
  const base = innerHeight;
  const kb = () => document.body.classList.toggle('kb', visualViewport.height < Math.max(base, innerHeight) * 0.75);
  visualViewport.addEventListener('resize', kb);
}

/* Быстрые действия: виджет, плитка, закреплённое уведомление, напоминание, уведомление о платеже */
function quickAdd(kind) {
  layers.slice().forEach(l => { if (l.id !== 'lyConfirm') closeLayer(l); });
  if (kind === 'pay') { payFrom = 'home'; showTab('pay'); return; }
  showTab('home', true);
  openTx(null, { type: kind === 'income' ? 'income' : 'expense', voice: kind === 'voice' });
}
$('#fab').addEventListener('click', () => { buzz(10); openTx(); });

/* Что отдаём помощнику и подписке */
function addTx(items) {
  const list = normalizeItems(items, 500);
  if (!list.length) return 0;
  const first = !state.tx.length;
  list.forEach((d, i) => state.tx.push({ id: uid(), ...d, ts: Date.now() + i }));
  const latest = parseYmd(list.map(d => d.date).sort().pop());
  ym = { y: latest.getFullYear(), m: latest.getMonth() };
  lastAddAt = Date.now();
  save(); render(); buzz(15);
  nudgeRefresh(true);
  maybeAskFest(list);
  if (first) setTimeout(offerLogin, 1800);
  return list.length;
}
setTimeout(() => { if (!document.querySelector('#auth').hidden) return; const st = clashState(); if (st.day !== today()) { if (askClash(undefined, today(), 2)) { st.day = today(); clashSave(st); } } }, 3500);
MD.app = {
  get state() { return state; },
  ctx() { ensureAccount(); return { cur: state.currency, now: new Date(), tx: state.tx, goals: state.goals, sym: sym(), startBalance: startBal(), freeMoney: MD.goals.freeMoney(state.tx, new Date()), accounts: state.accounts }; },
  openAiPanel() { openPanel('ai'); },
  addTx, openTx, openQuiz: startNewGoal, showTab, toast, confirmDlg, openLayer, closeLayer, confetti, buzz,
  refreshAll: () => { render(); },
  normalizeItems, esc, icon, money, fmt, paintIcons, quickAdd, spoken, openImport,
  loggedIn: () => !cloud.enabled || !!me
};

/* ---------- Старт ---------- */
document.addEventListener('visibilitychange', () => { if (!document.hidden) { now0 = new Date(); afterDataChange(); render(); } });
load();
paintIcons();
render();
if (cloud.enabled) cloud.onAuth(u => (u ? onSignedIn(u) : onSignedOut()));
MD.notify.init(quickAdd);
afterDataChange();
if (history.state && (history.state.layer || history.state.tab)) history.replaceState(null, '');
})();
