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
const sym = () => CURRENCIES[state.currency];
const money = n => `${fmt(n)} ${sym()}`;
const signed = (n, type) => (type === 'income' ? '+' : '−') + fmt(n) + ' ' + sym();
const MASK = '••••••';
const moneyH = n => hide ? MASK : `${esc(fmt(n))}<small>${esc(sym())}</small>`;
const maskT = s => (hide ? MASK : s);

/* ---------- Хранилище ---------- */
const R = MD.rec;
const freshState = () => ({ currency: 'BYN', accounts: [], goals: [], tx: [], nudge: MD.nudges.defaultState(), fest: MD.events.defaultFest(), rec: R.defaultRec() });
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
  const st = sanitize({ currency: r.currency, accounts: r.accounts, goals: r.goals, nudge: r.nudge, fest: r.fest, rec: r.rec, tx: r.tx });
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
  const goals = [];
  for (const g of (Array.isArray(o.goals) ? o.goals : [])) {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) continue;
    const target = parseAmount(g.target); if (!(target > 0)) continue;
    const sv = parseAmount(g.saved, true), months = Math.max(1, Math.min(600, Math.round(Number(g.months)) || 1));
    goals.push({
      id: typeof g.id === 'string' && g.id ? g.id : uid(), name: g.name.trim().slice(0, 40), target: round2(target),
      saved: Number.isFinite(sv) && sv > 0 ? round2(sv) : 0, months,
      deadline: parseYmd(g.deadline) ? g.deadline : MD.goals.ymdOf(MD.goals.addMonths(new Date(), months)),
      created: parseYmd(g.created) ? g.created : today()
    });
  }
  return { currency, accounts, goals, tx, nudge: MD.nudges.sanitizeState(o.nudge), fest: MD.events.sanitize(o.fest), rec: R.sanitize(o.rec, CATS.expense.map(c => c[0])) };
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
  let b = a.balance;
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

/* Фин говорит: одна реплика, по касанию сменяется другой */
let sayIdx = 0;
const pluralN = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
function finTips() {
  const seed = Math.floor(Date.now() / 864e5);
  const V = arr => arr[(sayIdx + seed) % arr.length];       // варианты реплик меняются по касанию и по дням
  const cur = monthTx(now0.getFullYear(), now0.getMonth());
  const inc = sumOf(cur, 'income'), exp = sumOf(cur, 'expense');
  const tips = [], M = n => esc(maskT(money(n)));
  const todayExp = round2(state.tx.filter(t => t.type === 'expense' && t.date === today()).reduce((s, t) => s + t.amount, 0));
  if (!state.tx.length) tips.push({ pose: 'hello', t: 'Привет, я <em>Фин</em>!<small>Нажми «+» или скажи в микрофон, например: «вчера кофе 6».</small>' });
  else if (!cur.length) tips.push({ pose: 'sleepy', t: V(['В этом месяце пока тихо<small>Скажи, на что ушли деньги, и я запишу.</small>', 'Пока ни одной записи за месяц<small>Нажми «+» или скажи: «кофе 5».</small>']) });
  else {
    tips.push(todayExp ? { pose: 'hello', t: V([`Сегодня ушло <em>${M(todayExp)}</em><small>Всё записано.</small>`, `Сегодня потрачено <em>${M(todayExp)}</em><small>Записал, ничего не потерялось.</small>`]) } : { pose: 'joy', t: V(['Сегодня без трат<small>Так держать!</small>', 'Сегодня трат нет<small>Хороший день для копилки.</small>']) });
    if (inc > 0 && exp > inc) tips.push({ pose: 'think', t: `Расходы обогнали доходы на <em>${M(round2(exp - inc))}</em><small>Загляни в «Аналитику»: там видно, куда уходит больше всего.</small>` });
    else if (inc > 0) tips.push({ pose: 'happy', t: `Ты в плюсе на <em>${M(round2(inc - exp))}</em><small>Столько осталось от дохода за месяц.</small>` });
    const pm = new Date(now0.getFullYear(), now0.getMonth() - 1, 1);
    const prev = sumOf(monthTx(pm.getFullYear(), pm.getMonth()), 'expense');
    if (prev > 0 && exp > 0) {
      const pct = Math.round((exp - prev) / prev * 100);
      if (pct <= -5) tips.push({ pose: 'joy', t: `Тратишь на <em>${-pct}%</em> меньше, чем в ${MONTHS_P[pm.getMonth()]}<small>Хороший темп.</small>` });
      else if (pct >= 15) tips.push({ pose: 'think', t: `На <em>${pct}%</em> больше, чем в ${MONTHS_P[pm.getMonth()]}<small>Посмотри в «Аналитике», что изменилось.</small>` });
    }
  }
  const gl = state.goals.filter(g => g.saved < g.target).sort((a, b) => goalPct(b) - goalPct(a))[0];
  if (gl) {
    const ml = G.monthsLeft(gl.deadline, new Date()), left = round2(gl.target - gl.saved);
    tips.push({ pose: 'love', t: `До «${esc(gl.name)}» осталось <em>${M(left)}</em><small>${ml ? `${ml} ${pluralN(ml, 'месяц', 'месяца', 'месяцев')} по ${M(Math.ceil(left / ml))}` : 'Срок вышел. Загляни в «Цели»'}</small>` });
  }
  tips.push({ pose: 'notify', t: V(['Можно просто сказать<small>Нажми на микрофон и скажи: «вчера кофе 6».</small>', 'Записать быстрее голосом<small>Скажи: «такси 12 и обед 9».</small>']) });
  return tips;
}
function renderSay() {
  const tips = finTips(), tip = tips[sayIdx % tips.length];
  const el = $('#homeSay');
  el.innerHTML = MD.say(tip.pose, tip.t, 64);
  el.setAttribute('aria-label', 'Фин говорит. Нажми, чтобы услышать другое');
}
$('#homeSay').addEventListener('click', () => { sayIdx++; renderSay(); buzz(8); });

function render() {
  ensureAccount();
  renderMonthBars();
  renderHome();
  renderSay();
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

/* Ближайший обязательный платёж. Не оплачен и день прошёл: плашка краснеет и предлагает записать, без лишних слов */
const rMoney = n => esc(maskT(money(n)));
function renderPayNext() {
  const el = $('#payNext'), n = R.nextDue(state.rec.list, new Date());
  if (!n) { el.hidden = true; el.innerHTML = ''; return; }
  const p = n.p, d = n.date, dt = `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  el.hidden = false; el.classList.toggle('late', n.late);
  const main = n.late
    ? `<span class="pn-ic" aria-hidden="true">${icon('calendar')}</span><span class="pn-t"><small>Пора записать</small><b>${esc(cap(p.name))} ${rMoney(p.amount)} · ${dt}</b></span>`
    : `<span class="pn-ic" aria-hidden="true">${icon('calendar')}</span><span class="pn-t"><small>Ближайший платёж</small><b>${esc(R.dueLine(p, n.days, a => maskT(money(a))))}</b></span><span class="rw-r">${icon('right')}</span>`;
  el.innerHTML = `<button class="pn-main" type="button" data-go-pay aria-label="Все обязательные платежи">${main}</button>` +
    (n.late ? `<button class="late-act" type="button" data-paywrite="${esc(p.id)}|${n.mk}">Записать</button>` : '');
}

function renderHome() {
  const total = totalBalance();
  setNum($('#heroSum'), moneyH, total);
  $('#btnEye').innerHTML = icon(hide ? 'eyeoff' : 'eye');
  $('#btnEye').setAttribute('aria-pressed', String(hide));
  $('#btnEye').setAttribute('aria-label', hide ? 'Показать суммы' : 'Скрыть суммы');

  const list = monthTx(now0.getFullYear(), now0.getMonth());
  const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense'), mn = MONTHS_P[now0.getMonth()]; void mn;
  $('#tileIncL').textContent = `за ${MONTHS[now0.getMonth()].toLowerCase()}`; $('#tileExpL').textContent = `за ${MONTHS[now0.getMonth()].toLowerCase()}`;
  $('#sumInc').innerHTML = hide ? MASK : (inc > 0 ? '+' : '') + moneyH(inc);
  $('#sumExp').innerHTML = hide ? MASK : (exp > 0 ? '−' : '') + moneyH(exp);
  renderPayNext();

  const recent = state.tx.slice().sort(cmpTx).slice(0, 5);
  $('#recentList').innerHTML = recent.length
    ? `<div class="recent">${recent.map(txRow).join('')}</div>`
    : emptyBox('Пока пусто', 'Нажми +, чтобы добавить первую трату. Фин всё запишет.', { attr: 'data-add', label: 'Добавить трату' });
}

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
  const ci = catInfo(t.type, t.cat), a = accById(t.acc);
  return `<div class="swipe" data-id="${esc(t.id)}"><div class="swipe-bg" aria-hidden="true">${icon('trash')}</div>
    <div class="tx" role="button" tabindex="0" data-tx="${esc(t.id)}" aria-label="${esc(t.cat)}${t.note ? ', ' + esc(t.note) : ''}, ${esc(signed(t.amount, t.type))}. Нажми, чтобы изменить">
      <div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</div>
      <div class="tx-body"><div class="tx-t">${esc(t.cat === 'Другое' && t.note ? t.note : t.cat)}</div>${t.cat === 'Другое' && t.note ? '<div class="tx-n">Другое</div>' : t.note ? `<div class="tx-n">${esc(t.note)}</div>` : ''}</div>
      <div class="tx-r"><div class="tx-a ${t.type === 'income' ? 'inc' : 'exp'}">${esc(signed(t.amount, t.type))}</div></div>
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

function renderStats() {
  $$('#s-stats [data-st]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.st === statType)));
  const list = monthTx().filter(t => t.type === statType);
  const total = sumOf(list, statType);
  const word = statType === 'expense' ? 'расходов' : 'доходов';
  const card = $('#catCard'), insEl = $('#insights'), dayCard = $('#dayCard'), catList = $('#catList');
  if (!list.length) {
    card.innerHTML = emptyBox(`В ${MONTHS_P[ym.m]} пока пусто`, statType === 'expense' ? 'Нажми +, чтобы добавить первую трату, и Фин покажет, куда уходят деньги.' : 'Нажми +, чтобы добавить доход, и Фин покажет, откуда приходят деньги.', { attr: 'data-add', label: statType === 'expense' ? 'Добавить трату' : 'Добавить доход' });
    insEl.innerHTML = ''; dayCard.hidden = true; catList.hidden = true; $('#statSay').innerHTML = '';
    return;
  }
  dayCard.hidden = false; catList.hidden = false;
  const by = {};
  list.forEach(t => { by[t.cat] = round2((by[t.cat] || 0) + t.amount); });
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  if (statCat && by[statCat] == null) statCat = null;
  const R = 56, C = 2 * Math.PI * R;
  let off = 0;
  const segs = rows.map(([name, sum]) => {
    const frac = sum / total, len = Math.max(frac * C - (rows.length > 1 ? 3 : 0), 0.5);
    const s = `<circle class="seg${statCat && statCat !== name ? ' dim' : ''}${statCat === name ? ' on' : ''}" cx="75" cy="75" r="${R}" fill="none" stroke="${catInfo(statType, name)[2]}" stroke-width="${statCat === name ? 24 : 20}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"/>`;
    off += frac * C;
    return s;
  }).join('');
  card.innerHTML = `<div class="cat-wrap">
      <div class="donut" role="img" aria-label="Всего ${word} за месяц: ${esc(hide ? 'скрыто' : money(total))}">
        <svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="${R}" fill="none" stroke="var(--field)" stroke-width="20"/>${segs}</svg>
        <div class="donut-c"><b>${esc(maskT(fmt(by[statCat] != null ? by[statCat] : total)))}</b><span>${by[statCat] != null ? esc(statCat) : 'всего'}</span></div>
      </div>
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
  {
    const top = esc(rows[0][0]), topSum = esc(maskT(money(rows[0][1]))), share = Math.round(rows[0][1] / total * 100);
    const main = statType === 'income' ? `Главный источник: <em>${top}</em>, ${share}% за месяц (${topSum}).` : `Больше всего ушло на <em>${top}</em>: ${share}% (${topSum}).`;
    let head, pose;
    if (prev > 0) {
      const pct = Math.round((total - prev) / prev * 100), mon = MONTHS_P[pm.getMonth()];
      const good = statType === 'expense' ? pct <= 0 : pct >= 0;
      head = pct === 0 ? `Столько же, сколько в ${mon}` : `${statType === 'expense' ? 'Расходы' : 'Доходы'} на <em>${Math.abs(pct)}%</em> ${pct < 0 ? 'меньше' : 'больше'}, чем в ${mon}`;
      pose = pct === 0 ? 'hello' : good ? 'joy' : 'think';
    } else { head = `${cap(MONTHS_P[ym.m] === MONTHS_P[now0.getMonth()] ? 'в этом месяце' : 'в ' + MONTHS_P[ym.m])} ${statType === 'expense' ? 'расходов' : 'доходов'} <em>${esc(maskT(money(total)))}</em>`; pose = 'hello'; }
    $('#statSay').innerHTML = MD.say(pose, `${head}<small>${main}</small>`, 64);
  }
  cmp = '';
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
    return `<li class="${statCat === name ? 'on' : ''}" data-cat="${esc(name)}" role="button" tabindex="0" aria-pressed="${statCat === name}"><div class="cat-top"><span class="dot" style="background:${ci[2]}"></span><span class="nm">${esc(name)}</span><span class="pc">${pc < 1 ? '<1' : Math.round(pc)}%</span><span class="am">${esc(maskT(fmt(sum)))}</span></div><div class="bar"><i style="--c:${ci[2]};width:${Math.max(pc, 2).toFixed(1)}%"></i></div></li>`;
  }).join('')}</ul>`;
}

/* ---------- Вкладки ---------- */
let tabPushed = false, payFrom = 'acc';
function showTab(name, fromPop) {
  tab = name;
  $$('.screen').forEach(s => { s.hidden = s.dataset.screen !== name; });
  const navName = name === 'ops' ? 'home' : name === 'chat' ? 'acc' : name === 'pay' ? payFrom : name;
  $$('.nav-b').forEach(b => { if (b.dataset.tab === navName) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (!fromPop) {
    if (name !== 'home' && !tabPushed) { history.pushState({ tab: 1 }, ''); tabPushed = true; }
    else if (name === 'home' && tabPushed) { ignorePops++; history.back(); tabPushed = false; }
  }
  window.scrollTo(0, 0);
  render();
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
function shiftMonth(d) { const dt = new Date(ym.y, ym.m + d, 1); setMonth(dt.getFullYear(), dt.getMonth()); buzz(6); }
(() => {
  let sx = null, sy = 0, zone = null;
  document.addEventListener('touchstart', e => {
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
$$('.nav-b').forEach(b => b.addEventListener('click', () => { buzz(8); showTab(b.dataset.tab); }));
document.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) { showTab(tab === 'pay' ? payFrom : tab === 'chat' ? 'acc' : 'home'); return; }
  const g = e.target.closest('[data-go]');
  if (g) showTab(g.dataset.go);
  if (e.target.closest('[data-go-pay]')) openPayScreen();
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
$('#opsSearch').addEventListener('input', e => { opsQuery = e.target.value; renderOps(); });
$('#s-stats').addEventListener('click', e => {
  const f = e.target.closest('[data-st]');
  if (f) { statType = f.dataset.st; statCat = null; renderStats(); }
  const c = e.target.closest('[data-cat]');
  if (c) { statCat = statCat === c.dataset.cat ? null : c.dataset.cat; buzz(6); renderStats(); }
});
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
  const t = $('#toast');
  t.hidden = true; void t.offsetWidth;
  t.innerHTML = (pose ? `<span class="toast-m">${MD.mascot(pose, 28)}</span>` : '') + `<span>${esc(msg)}</span>` + (actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : '');
  if (actionLabel) $('button', t).onclick = () => { clearTimeout(toastT); t.hidden = true; action(); };
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, ms || (actionLabel ? 6000 : 4000));
}
const undoToast = (msg, undo) => toast(msg, 'Вернуть', undo, null, 6000);
const showErr = (el, msg) => { el.textContent = msg; el.hidden = false; };
const hideErr = el => { el.hidden = true; };

/* ---------- Запись (добавление / правка) ---------- */
const tx = { type: 'expense', cat: '', acc: null, editId: null, pay: null, draftIdx: null };
const OTHER = 'Другое';
function renderTxForm() {
  $$('#lyTx .seg-b').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === tx.type)));
  $('#txCur').textContent = sym();
  $('#txCats').innerHTML = CATS[tx.type].map(c =>
    `<button type="button" role="radio" class="cat-tile" data-cat="${esc(c[0])}" aria-checked="${c[0] === tx.cat}"><span class="ci" style="--c:${c[2]};--on:${onColor(c[2])}" aria-hidden="true">${cIcon(c)}<span class="tick">${icon('check')}</span></span><span>${esc(c[0])}</span></button>`).join('');
  const other = tx.cat === OTHER;
  $('#txNoteL').textContent = other ? 'Что именно? (обязательно)' : 'Заметка (необязательно)';
  $('#txNoteF').classList.toggle('err', false);
  hideErr($('#txNoteErr'));
  $('#txSaveT').textContent = tx.editId ? 'Сохранить изменения' : 'Сохранить';
  syncSave();
  syncDateChips();
}
function syncSave() { $('#txSave').disabled = !(parseAmount($('#txAmount').value) > 0 && tx.cat); }
$('#txAmount').addEventListener('input', e => {
  let v = e.target.value.replace(/[^\d.,]/g, '');
  const i = v.search(/[.,]/);
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/[.,]/g, '').slice(0, 2);
  if (v !== e.target.value) e.target.value = v;
  hideErr($('#txAmountErr')); syncSave();
});
$('#txNote').addEventListener('input', () => { $('#txNoteF').classList.remove('err'); hideErr($('#txNoteErr')); });
$('#dOther').addEventListener('click', () => { const d = $('#txDate'); try { d.showPicker(); } catch (_) { d.focus(); d.click(); } });
function syncDateChips() {
  const v = $('#txDate').value, y = new Date(); y.setDate(y.getDate() - 1);
  const isT = v === today(), isY = v === ymd(y), other = !isT && !isY && !!parseYmd(v);
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
  tx.pay = opts.pay || null;
  tx.type = t ? t.type : (opts.type || 'expense');
  tx.cat = t ? t.cat : (opts.cat && CATS[tx.type].some(c => c[0] === opts.cat) ? opts.cat : '');   // категорию выбирает человек: без неё «Сохранить» не активна
  tx.acc = t ? t.acc : state.accounts[0].id;
  $('#txTitle').textContent = t || tx.draftIdx != null ? 'Изменить запись' : tx.type === 'income' ? 'Новый доход' : 'Новая запись';
  $('#txAmount').value = t ? String(t.amount).replace('.', ',') : opts.amount ? String(opts.amount).replace('.', ',') : '';
  $('#txNote').value = t ? t.note : opts.note || '';
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
  if (t || opts.amount) $('#txAmount').removeAttribute('data-autofocus'); else $('#txAmount').setAttribute('data-autofocus', '');
  if (opts.voice) setTimeout(startTxVoice, 220);
}
$('#lyTx').addEventListener('click', e => {
  const t = e.target.closest('[data-type],[data-cat]');
  if (!t) return;
  if (t.dataset.type) { tx.type = t.dataset.type; if (!CATS[tx.type].some(c => c[0] === tx.cat)) tx.cat = ''; else if (tx.type === 'income' && tx.cat === 'Подарки') tx.cat = 'Подарок'; }
  if (t.dataset.cat) tx.cat = t.dataset.cat;
  buzz(6);
  renderTxForm();
  if (t.dataset.cat === OTHER) setTimeout(() => $('#txNote').focus(), 60);
});
$('#dToday').addEventListener('click', () => { $('#txDate').value = today(); syncDateChips(); });
$('#dYest').addEventListener('click', () => { const y = new Date(); y.setDate(y.getDate() - 1); $('#txDate').value = ymd(y); syncDateChips(); });
$('#txDate').addEventListener('input', syncDateChips);
$('#txForm').addEventListener('submit', e => {
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
  const rec = { type: tx.type, amount: round2(amt), cat: tx.cat, acc: tx.acc, date, note };
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
  closeLayer($('#lyTx'));
  buzz(15);
  if (!ex) showTab('home'); else render();
  if (added) afterAdd([added], first, pay); else toast('Изменения сохранены', null, null, 'joy');
});
$('#txDelete').addEventListener('click', () => {
  const id = tx.editId;
  if (!id) return;
  closeLayer($('#lyTx')); deleteTx(id);
});

/* После новой записи: тост «Записано». Если она похожа на платёж, Фин предлагает отметить одним нажатием. Первая запись: предложить войти */
function afterAdd(items, first, pay) {
  let m = null, hit = null;
  if (pay) toast('Записано, платёж отмечен', null, null, 'joy');
  else {
    for (const it of items) { m = R.matchTx(state.rec.list, it); if (m) { hit = it; break; } }
    if (m) toast(`Записано. Это оплата «${cap(m.p.name)}»?`, 'Отметить', () => { markPaid(m.p.id, m.mk, hit.id); save(); render(); toast(`Отмечено: ${cap(m.p.name)}`, null, null, 'happy'); }, 'joy', 8000);
    else toast(items.length > 1 ? `Записано: ${items.length}` : 'Записано', null, null, 'joy');
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
const HINT = 'Не расслышал. Попробуй так: «вчера такси 12».';
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
$('#qaInput').addEventListener('input', e => { $('#qaGo').hidden = !e.target.value.trim(); });
$('#qaForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#qaInput').value.trim(); if (!v) return;
  if (spoken(v, false)) { $('#qaInput').value = ''; $('#qaGo').hidden = true; }
});
$('#qaMic').addEventListener('click', () => { buzz(10); openTx(null, { voice: true }); });

/* Удаление без вопросов: «Удалено» и «Вернуть» не меньше пяти секунд */
function deleteTx(id) {
  const i = state.tx.findIndex(t => t.id === id);
  if (i < 0) { render(); return; }
  const [gone] = state.tx.splice(i, 1);
  save(); render(); buzz(15);
  nudgeRefresh(true);
  undoToast('Удалено', () => { state.tx.push(gone); save(); render(); nudgeRefresh(true); });
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
    if (s.dx < -96) deleteTx(s.id);
    else s.el.style.transform = '';
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  const open = e => { const t = e.target.closest('.swipe .tx'); if (t && !swiped) openTx(t.dataset.tx); };
  document.addEventListener('click', open);
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.swipe .tx')) { e.preventDefault(); openTx(e.target.dataset.tx); } });
})();

/* ---------- Цели ---------- */
const G = MD.goals;
const goalPct = g => Math.min(100, Math.round(g.saved / g.target * 100));
/* Карточка цели: прогресс, остаток, ежемесячный платёж и дедлайн */
function goalFacts(g) {
  const done = g.saved >= g.target, left = round2(Math.max(0, g.target - g.saved)), ml = G.monthsLeft(g.deadline, new Date());
  const dl = new Date(g.deadline + 'T00:00:00');
  return { done, left, monthly: done ? 0 : ml ? Math.ceil(left / ml) : left, dlText: `${dl.getDate()} ${MONTHS_G[dl.getMonth()]} ${dl.getFullYear()}`, over: !done && !ml };
}
const goalLeft = g => { const f = goalFacts(g); return f.done ? 'Цель достигнута' : f.over ? `Срок был ${f.dlText}` : `Дедлайн ${f.dlText}`; };
const goalRows = g => {
  const f = goalFacts(g);
  return `<span class="goal-sub"><span>Отложено ${esc(maskT(money(g.saved)))} из ${esc(maskT(money(g.target)))}</span><span>${f.done ? 'Готово' : `Осталось ${esc(maskT(money(f.left)))}`}</span></span>
    <span class="goal-sub"><span>${f.done ? '' : `В месяц ${esc(maskT(money(f.monthly)))}`}</span><span>${esc(goalLeft(g))}</span></span>`;
};
function renderGoals() {
  const el = $('#goalsBody'), list = state.goals;
  if (!list.length) {
    el.innerHTML = `<div class="goal-empty"><span class="emp-m" aria-hidden="true">${MD.mascot('think', 140)}</span><h2>Пока пусто</h2><p>Нажми «Новая цель»: Фин спросит, на что копим, посчитает, сколько откладывать в месяц, и скажет, легко это или тяжеловато.</p><button class="btn primary" type="button" data-newgoal>Новая цель</button></div>`;
    return;
  }
  const sum = round2(list.reduce((s, g) => s + g.saved, 0)), act = list.filter(g => g.saved < g.target).length;
  el.innerHTML = `<div class="goal-rows">${list.map(g => `<button class="goal" data-goal="${esc(g.id)}" style="margin-bottom:16px">
      <span class="goal-top"><b>${esc(g.name)}</b><span class="goal-pct">${goalPct(g)}%</span></span>
      <span class="goal-bar"><i style="width:${goalPct(g)}%"></i></span>${goalRows(g)}
    </button>`).join('')}</div><div class="say-wrap">${MD.say('happy', `Отложено <em>${esc(maskT(money(sum)))}</em><small>${act} ${pluralN(act, 'цель', 'цели', 'целей')} в работе</small>`, 64)}</div>`;
}
let openGoalId = null;
function openGoal(id) {
  const g = state.goals.find(x => x.id === id); if (!g) return;
  openGoalId = id;
  $('#goalTitle').textContent = g.name;
  const done = g.saved >= g.target, pct = goalPct(g);
  const say = done ? ['joy', 'Цель достигнута! Можно собираться']
    : pct >= 50 ? ['happy', `Больше половины пути. Осталось ${esc(maskT(money(round2(g.target - g.saved))))}`]
      : pct > 0 ? ['hello', `Начало положено. Осталось ${esc(maskT(money(round2(g.target - g.saved))))}`]
        : ['think', 'Пока ноль. Отложи первую сумму'];
  $('#goalDetail').innerHTML = `${MD.say(say[0], say[1], 84)}
    <div class="goal big"><span class="goal-top"><b>${esc(maskT(money(g.saved)))}</b><span class="goal-pct">${pct}%</span></span>
    <span class="goal-bar"><i style="width:${pct}%"></i></span>${goalRows(g)}</div>
    <form id="goalAdd" novalidate>
      <div class="bal-row">${fld('goalAmt', 'Сколько отложил', { mode: 'decimal', unit: sym() })}<button class="btn primary" type="submit">Пополнить</button></div>
      <div class="note">Пополнение цели — это отметка. Баланс не меняется.</div>
      <div class="msg err" id="goalErr" hidden></div>
    </form>
    <button class="btn danger wide" type="button" id="goalDel">Удалить цель</button>`;
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
$('#goalDetail').addEventListener('submit', e => {
  e.preventDefault();
  const g = state.goals.find(x => x.id === openGoalId); if (!g) return;
  const v = parseAmount($('#goalAmt').value), err = $('#goalErr');
  if (!(v > 0)) { showErr(err, 'Введи сумму, например 150.'); return; }
  const was = g.saved >= g.target;
  g.saved = round2(g.saved + v); save(); render(); buzz(15);
  closeLayer($('#lyGoal'));
  toast(!was && g.saved >= g.target ? `Цель достигнута! Собрано ${money(g.target)}` : 'Добавлено', null, null, !was && g.saved >= g.target ? 'joy' : 'happy');
});
$('#goalDetail').addEventListener('click', e => {
  if (!e.target.closest('#goalDel')) return;
  const i = state.goals.findIndex(x => x.id === openGoalId); if (i < 0) return;
  const [gone] = state.goals.splice(i, 1);
  save(); render(); closeLayer($('#lyGoal'));
  undoToast('Цель удалена', () => { state.goals.splice(Math.min(i, state.goals.length), 0, gone); save(); render(); });
});

/* Разговор с Фином: вопросы, план, согласие или уточнения */
const KINDS = [['Отпуск', 'Билеты, отель'], ['Подушка безопасности', 'Запас на 3–6 месяцев'], ['Техника', 'Телефон, ноутбук'], ['Ремонт', 'Или переезд'], ['Подарок', 'Себе или близким'], ['Своя цель', 'Назову сам']];
const STEP_NO = { kind: 1, custom: 1, target: 2, saved: 3, term: 4, free: 5, think: 5, plan: 6, tune: 6, tuneMonthly: 6, tuneTerm: 6, tuneTarget: 6, tuneIncome: 6 };
let quiz = null;
function openQuiz() {
  quiz = { step: 'kind', stack: [], name: '', target: 0, saved: 0, months: 0, free: G.freeMoney(state.tx, new Date()), extra: 0, hadFree: false };
  quiz.hadFree = quiz.free !== null;
  renderQuiz();
  openLayer($('#lyQuiz'));
}
const qGo = step => { quiz.stack.push(quiz.step); quiz.step = step; renderQuiz(); };
const qIn = (id, label, unit) => `${fld(id, label, { mode: 'decimal', unit })}<div class="msg err" id="qErr" hidden></div>`;
const qBtn = (act, label, cls = 'primary', dis = false) => `<button class="btn ${cls} wide" type="button" data-qa="${act}" ${dis ? 'disabled' : ''}>${esc(label)}</button>`;
function planOf() { return G.plan({ target: quiz.target, saved: quiz.saved, months: quiz.months, free: quiz.free }); }
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
      say = ['hello', 'Как назовём цель?'];
      html = `${fld('qText', 'Название, например: велосипед', { max: 40 })}<div class="msg err" id="qErr" hidden></div>${qBtn('custom', 'Далее')}`;
      break;
    case 'target':
      say = ['think', `Сколько нужно на «${nm}»?`];
      html = qIn('qNum', 'Сумма', sym()) + qBtn('target', 'Далее');
      break;
    case 'saved':
      say = ['hello', 'Сколько уже есть?'];
      html = qIn('qNum', 'Сколько уже есть', sym()) + qBtn('saved', 'Далее') + qBtn('saved0', 'Пока ноль', 'soft');
      break;
    case 'term':
      say = ['notify', 'За сколько хочешь накопить?'];
      html = `<div class="term-grid" role="radiogroup" aria-label="Срок">${[[3, '3 месяца'], [6, '6 месяцев'], [12, '1 год'], [24, '2 года']].map(t => `<button type="button" role="radio" class="kind term" data-term="${t[0]}" aria-checked="${q.termPick === t[0]}"><b>${t[1]}</b></button>`).join('')}</div>
        ${qIn('qNum', 'Другой срок, месяцев')}${qBtn('term', 'Далее')}`;
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
      const p = planOf(), cur = sym();
      const until = G.addMonths(new Date(), p.months), untilTxt = `${MONTHS[until.getMonth()].toLowerCase()} ${until.getFullYear()}`;
      const T = G.termLabel(p.months);
      const fm = p.free !== null ? esc(money(p.free)) : '';
      const txt = {
        easy: ['joy', `Легко. По <em>${esc(money(p.monthly))}</em> в месяц, и через ${T} на «${nm}» будет ${esc(money(q.target))}.<small>Останется запас.</small>`],
        ok: ['happy', `Посильно: <em>${esc(money(p.monthly))}</em> в месяц, срок ${T}.<small>Это заметная часть твоего свободного остатка.</small>`],
        hard: ['think', `Тяжеловато: нужно <em>${esc(money(p.monthly))}</em> в месяц, а свободно в среднем ${p.free > 0 ? fm : 'меньше нуля'}.${p.altMonths ? `<small>Могу растянуть до ${G.termLabel(p.altMonths)}.</small>` : '<small>Давай подберём другой срок или сумму.</small>'}`],
        unknown: ['hello', `План: <em>${esc(money(p.monthly))}</em> в месяц, срок ${T}.<small>Твоих доходов я не знаю, поэтому не скажу, посильно ли это.</small>`],
        done: ['joy', 'Нужная сумма уже есть!<small>Сохрани цель, чтобы следить за ней.</small>']
      }[p.verdict];
      say = txt;
      html = `<div class="plan">
        <div><span>Цель</span><b>${nm}</b></div>
        <div><span>Нужно</span><b>${esc(money(q.target))}</b></div>
        <div><span>Уже есть</span><b>${esc(money(q.saved))}</b></div>
        <div class="hl"><span>В месяц</span><b>${esc(money(p.monthly))}</b></div>
        <div><span>Срок</span><b>${T}, до ${untilTxt}</b></div>
        ${p.free !== null ? `<div><span>Средний остаток</span><b>${esc(money(p.free))} в месяц</b></div>` : ''}
      </div>` + qBtn('accept', 'Согласен') +
        (p.verdict === 'hard' && p.altMonths ? qBtn('alt', `Растянуть до ${G.termLabel(p.altMonths)}`, 'soft') : '') +
        qBtn('reject', 'Не подходит', 'ghost');
      void cur;
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
      say = ['think', 'Сколько в месяц откладывать комфортно?'];
      html = qIn('qNum', 'Сколько в месяц', sym()) + qBtn('doMonthly', 'Пересчитать');
      break;
    case 'tuneTerm':
      say = ['notify', 'За сколько месяцев?'];
      html = qIn('qNum', 'Месяцев') + qBtn('doTerm', 'Пересчитать');
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
  const tm = e.target.closest('[data-term]');
  if (tm) { q.termPick = Number(tm.dataset.term); const inp = $('#qNum'); if (inp) inp.value = ''; buzz(6); $$('#quizBody [data-term]').forEach(x => x.setAttribute('aria-checked', String(Number(x.dataset.term) === q.termPick))); return; }
  const b = e.target.closest('[data-qa]'); if (!b) return;
  const a = b.dataset.qa;
  if (a === 'back') { q.step = q.stack.pop(); renderQuiz(); return; }
  if (a === 'kind') { if (!q.pick) return; q.name = q.pick === 'Своя цель' ? '' : q.pick; qGo(q.name ? 'target' : 'custom'); return; }
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
    const typed = ($('#qNum').value || '').trim();
    const n = quizNum(false); let m = typed ? Math.round(n.v) : (a === 'term' ? q.termPick : NaN);
    if (!(m >= 1 && m <= 600)) return n.fail(a === 'term' ? 'Выбери срок или введи свой в месяцах, например 6.' : 'Введи срок в месяцах, например 6.');
    q.months = m; toPlan(a === 'doTerm'); return;
  }
  if (a === 'free' || a === 'free0') {
    if (a === 'free0') q.free = null;
    else { const n = quizNum(true); if (!Number.isFinite(n.v)) return n.fail('Введи сумму или нажми «Не знаю».'); q.free = n.v; q.hadFree = true; }
    toPlan(); return;
  }
  if (a === 'accept') { saveGoal(); return; }
  if (a === 'alt') { q.months = planOf().altMonths; q.stack.push(q.step); thinkThen(); return; }
  if (a === 'reject') { qGo('tune'); return; }
  if (a === 'restart') { q.stack = []; q.step = 'kind'; renderQuiz(); return; }
  if (a === 'tuneMonthly' || a === 'tuneTerm' || a === 'tuneTarget' || a === 'tuneIncome') { qGo(a); return; }
  if (a === 'doMonthly') {
    const n = quizNum(false); if (!(n.v > 0)) return n.fail('Введи сумму, например 200.');
    const need = Math.max(q.target - q.saved, 0), m = Math.max(1, Math.ceil(need / n.v));
    if (m > 600) return n.fail('Так выйдет больше 50 лет. Давай откладывать побольше.');
    q.months = m; toPlan(true); return;
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
  if (quiz.free === null && !quiz.hadFree && quiz.step !== 'free' && !replace) { qGo('free'); return; }
  if (replace) quiz.stack.push(quiz.step);
  thinkThen();
}
function thinkThen() {
  quiz.step = 'think'; renderQuiz();
  const q = quiz;
  setTimeout(() => { if (quiz !== q || q.step !== 'think') return; q.step = 'plan'; q.stack = q.stack.filter(s => s !== 'think'); renderQuiz(); buzz(10); }, 900);
}
function saveGoal() {
  const q = quiz, p = planOf();
  state.goals.push({ id: uid(), name: q.name, target: round2(q.target), saved: round2(q.saved), months: p.months, deadline: G.ymdOf(G.addMonths(new Date(), p.months)), created: today() });
  save(); closeLayer($('#lyQuiz')); quiz = null; buzz(20);
  showTab('goals');
  toast('Цель добавлена. Пополняй, когда отложишь', null, null, 'joy');
}

/* ---------- Черновик: несколько записей сразу ---------- */
function normalizeItems(items, max = 30) {
  const res = [];
  for (const it of items.slice(0, max)) {
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

function renderDraft() {
  $('#draftList').innerHTML = draft.map((d, i) => {
    const ci = catInfo(d.type, d.cat);
    return `<div class="draft-row"><button class="dr" type="button" data-edit="${i}" aria-label="Изменить: ${esc(d.cat)}, ${esc(signed(d.amount, d.type))}"><div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</div>
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
$('#draftOk').addEventListener('click', () => {
  if (!draft.length) return;
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

/* ---------- Праздники и подарки ---------- */
const FEST_PRESETS = ['День рождения', 'Новый год', '8 Марта', '23 Февраля', 'Свадьба', 'Юбилей'];
let ev = null;
const festList = () => state.fest.list;
const evById = id => festList().find(e => e.id === id);
function festSave() { save(); MD.notify.applyEvents(festList()); renderAccount(); if (panel && panel.kind === 'fest' && !$('#lyLink').hidden) renderPanel(); }
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
  save(); closeLayer($('#lyEvent')); ev = null; buzz(15); renderAccount();
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
  const box = $('#nudgeBox'), say = $('#homeSay'), d = nudgeInfo();
  if (state.nudge.active && !d) { state.nudge.active = null; save(); }
  say.hidden = !!d;
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
  return MD.notify.applyPayments(state.rec.list, n => money(n));
}
function markPaid(id, mk, txId) { const p = payById(id); if (p) p.paid[mk] = txId || 'manual'; afterDataChange(); }
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
  const st = r.status === 'paid' ? `<span class="st paid">${icon('check')}Оплачено</span>` : late ? `<span class="st late">Пора записать</span>` : '<span class="st">Ожидает</span>';
  return `<div class="pay-row${late ? ' late' : ''}"><button class="pr-main" type="button" data-payedit="${esc(p.id)}" aria-label="Изменить платёж ${esc(p.name)}"><span class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</span>
    <span class="pr-b"><b>${esc(cap(p.name))}</b><small>${d.getDate()} ${MONTHS_G[d.getMonth()]} · ${esc(p.cat)}</small></span>
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
    ${lim !== Infinity ? `<div class="note ctr">Платежей: ${list.length} из ${lim}. Больше с Фин Навсегда, без подписки.</div>` : ''}
    <div class="note ctr">Фин напоминает и помогает записать. Деньги он не списывает.</div>`;
}
$('#payBody').addEventListener('click', e => { const ed = e.target.closest('[data-payedit]'); if (ed) openPaySheet(ed.dataset.payedit); });

/* Одно окно: создание и правка. Три тапа: «Добавить», название, «Сохранить» (сумму вводим на клавиатуре) */
let pm = null;
const payDefaultDay = () => new Date().getDate();
function openPaySheet(id) {
  const p = id && payById(id);
  pm = p ? { id: p.id, name: p.name, amount: p.amount, day: R.curDay(p), cat: p.cat, remind: p.remind, time: p.time }
    : { id: null, name: '', amount: '', day: payDefaultDay(), cat: '', remind: 'off', time: '10:00' };
  $('#payHead').textContent = p ? 'Платёж' : 'Новый платёж';
  $('#payName').value = pm.name; $('#payAmount').value = pm.amount ? String(pm.amount).replace('.', ',') : ''; $('#payDay').value = pm.day; $('#payTime').value = pm.time;
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
  $('#payCats').innerHTML = CATS.expense.map(c => `<button type="button" role="radio" class="cat-tile" data-pcat="${esc(c[0])}" aria-checked="${c[0] === pm.cat}"><span class="ci" style="--c:${c[2]};--on:${onColor(c[2])}" aria-hidden="true">${cIcon(c)}<span class="tick">${icon('check')}</span></span><span>${esc(c[0])}</span></button>`).join('');
  $('#payRemind').innerHTML = R.REMIND.map(r => `<button type="button" role="radio" class="chip" data-pr="${r.id}" aria-checked="${r.id === pm.remind}">${esc(r.label)}</button>`).join('');
  $('#payTimeF').hidden = pm.remind === 'off';
}
$('#lyPay').addEventListener('click', e => {
  if (!pm) return;
  const pp = e.target.closest('[data-pp]'), pc = e.target.closest('[data-pcat]'), pr = e.target.closest('[data-pr]');
  if (pp) {
    pm.name = pp.dataset.pp; $('#payName').value = pm.name;
    const pre = R.PRESETS.find(x => x[0] === pm.name); if (pre && !pm.cat) pm.cat = pre[1];
    renderPaySheet(); buzz(6); if (!$('#payAmount').value) setTimeout(() => $('#payAmount').focus(), 60);
  } else if (pc) { pm.cat = pc.dataset.pcat; renderPaySheet(); buzz(6); }
  else if (pr) { pm.remind = pr.dataset.pr; renderPaySheet(); buzz(6); }
});
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
  const name = $('#payName').value.trim().replace(/\s+/g, ' ').slice(0, 30), amount = parseAmount($('#payAmount').value), day = parseInt($('#payDay').value, 10), err = $('#payErr');
  if (!name) { showErr(err, 'Назови платёж, например «аренда».'); $('#payName').focus(); return; }
  if (!(amount > 0)) { showErr(err, 'Впиши сумму, например 500.'); $('#payAmount').focus(); return; }
  if (!(day >= 1 && day <= 31)) { showErr(err, 'Впиши день месяца от 1 до 31.'); $('#payDay').focus(); return; }
  if (!pm.cat) { showErr(err, 'Выбери категорию, и сохраним.'); return; }
  const time = /^\d{2}:\d{2}$/.test($('#payTime').value) ? $('#payTime').value : '10:00', T = new Date();
  let p = pm.id && payById(pm.id);
  if (p) {
    Object.assign(p, { name, amount: round2(amount), cat: pm.cat, remind: pm.remind, time });
    R.setDay(p, day, T);                          // новый день со следующего месяца, прошлые отметки остаются
  } else {
    p = { id: 'p' + uid().slice(0, 8), name, amount: round2(amount), cat: pm.cat, days: [{ from: '0000-00', day }], remind: pm.remind, time, start: R.startMonth(day, T), paid: {}, nid: R.freeNid(state.rec.list) };
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
const startBal = () => (state.accounts[0] ? state.accounts[0].balance : 0);
const okIc = () => `<span class="pl-ok" role="img" aria-label="Привязано">${icon('check')}</span>`;
function setPlate(sel, sub, right, disabled) {
  const el = $(sel);
  $('small', el).textContent = sub;
  if (right !== null) $('.rw-r', el).innerHTML = right;
  el.disabled = !!disabled;
}
function renderAcc() { renderAccount(); }
function renderAccount() {
  const on = loggedIn(), canLogin = cloud.enabled && !me;
  $('#setFoot').textContent = on ? 'Данные хранятся на телефоне и в твоём облаке. Видны только тебе.' : 'Данные хранятся только на этом телефоне.';
  $('#acctMascot').innerHTML = MD.mascot('happy', 48);
  $('#btnSignOut').hidden = !on;
  $('#loginCard').hidden = !canLogin;
  if (on) {
    $('#acctName').textContent = me.email || me.phone || me.name || 'Мой профиль';
    $('#acctSub').textContent = 'Данные синхронизируются';
  } else {
    $('#acctName').textContent = 'Ты без входа';
    $('#acctSub').textContent = 'Данные только на этом телефоне';
  }
  const ph = on && me.phoneLinked, em = on && me.emailLinked;
  setPlate('#plPhone', ph ? me.phoneLinked : on ? 'Не привязан' : 'Появится после входа', ph ? okIc() : on ? '<span class="pl-btn">Привязать</span>' : '', !cloud.enabled);
  setPlate('#plEmail', em ? me.emailLinked : on ? 'Не привязана' : 'Появится после входа', em ? okIc() : on ? '<span class="pl-btn">Привязать</span>' : '', !cloud.enabled);
  setPlate('#plBalance', maskT(money(startBal())), null, false);
  setPlate('#plCurrency', `${state.currency} ${CURRENCIES[state.currency]}`, null, false);
  const nd = R.nextDue(state.rec.list, new Date());
  setPlate('#plPay', state.rec.list.length ? `${state.rec.list.length} ${pluralN(state.rec.list.length, 'платёж', 'платежа', 'платежей')}${nd ? (nd.late ? `, пора записать: ${nd.p.name.toLowerCase()}` : `, ближайший: ${nd.p.name.toLowerCase()} ${R.whenText(nd.days)}`) : ''}` : 'Аренда, подписка, кредит с напоминанием', null, false);
  const rc = MD.notify.cfg();
  setPlate('#plRemind', rc.on ? `Каждый день в ${rc.times.join(', ')}` : 'Выключены', null, false);
  setPlate('#plQuick', rc.quick ? 'Кнопки на экране блокировки включены' : 'Записывай, не открывая Фин', null, false);
  const up = MD.events.upcoming(festList(), new Date())[0];
  setPlate('#plFest', up ? `${MD.events.whatText(up.e)}, ${MD.events.daysTo(up.occ, new Date()) === 0 ? 'сегодня' : `через ${MD.events.daysTo(up.occ, new Date())} ${pluralN(MD.events.daysTo(up.occ, new Date()), 'день', 'дня', 'дней')}`}` : 'Дни рождения и праздники с напоминанием', null, false);
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
const PN_TITLE = { fest: 'Праздники и подарки', nudge: 'Подсказки Фина', phone: 'Телефон', email: 'Почта', balance: 'Стартовый баланс', currency: 'Валюта', data: 'Экспорт и импорт', remind: 'Напоминания', quick: 'Виджет и экран блокировки' };
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
  } else if (P.kind === 'quick') {
    const c = MD.notify.cfg(), nat = MD.notify.supported();
    say = ['hello', 'Записывай, не открывая приложение<small>Виджет, плитка в шторке и кнопки на экране блокировки.</small>'];
    html = `<div class="grp flat"><button class="row" type="button" data-pn="quick-toggle" role="switch" aria-checked="${c.quick}" ${nat ? '' : 'disabled'}><span class="rw-ic" aria-hidden="true"><i data-ic="lock"></i></span><span class="rw-t"><b>Кнопки на экране блокировки</b><small>${nat ? 'Расход, Доход, Голосом' : 'Работает только в приложении'}</small></span><span class="sw-t" aria-checked="${c.quick}"></span></button></div>
      <div class="fl">Как добавить</div>
      <ol class="step-list">
        <li><b>Виджет.</b> Удерживай пустое место на главном экране, выбери «Виджеты», найди «Фин».</li>
        <li><b>Плитка.</b> Потяни шторку вниз, нажми карандаш и перетащи «Запись в Фин».</li>
        <li><b>Экран блокировки.</b> Включи переключатель выше. Там, где есть виджеты на экране блокировки (Samsung One UI 7, Android 16), добавь тот же виджет «Фин».</li>
      </ol>
      <div class="note">С заблокированного экрана Фин откроется после разблокировки.</div>${e}`;
  } else if (P.kind === 'data') {
    html = `<div class="pn-sec"><b>Экспорт</b><small>Копия всех записей, целей и платежей одним файлом.</small>${pnBtn('exp-file', 'Сохранить в файл', 'soft')}</div>
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
  if (a === 'ng-reset') { NG.resetHidden(state.nudge); save(); renderPanel(); renderAccount(); toast(NG.t('set.resetDone'), null, null, 'happy'); nudgeRefresh(true); return; }
  if (a === 'rm-toggle') {
    const c = MD.notify.cfg(); c.on = !c.on; MD.notify.save(c);
    renderPanel(); renderAccount();
    if (c.on) { const r = await MD.notify.apply(); if (r && r.reason === 'denied') { c.on = false; MD.notify.save(c); renderPanel('Нужен доступ к уведомлениям. Включи их в настройках телефона: Приложения → Фин → Уведомления.'); renderAccount(); } }
    else MD.notify.apply();
    return;
  }
  if (a === 'rm-add') { return MD.sub.gate('remind', () => { const c = MD.notify.cfg(); const [h, m] = (c.times[c.times.length - 1] || '21:00').split(':').map(Number); c.times.push(`${pad((h + 1) % 24)}:${pad(m)}`); MD.notify.save(c); MD.notify.apply(); renderPanel(); renderAccount(); }); }
  if (a.startsWith('rm-del:')) { const c = MD.notify.cfg(); c.times.splice(Number(a.slice(7)), 1); MD.notify.save(c); MD.notify.apply(); renderPanel(); renderAccount(); return; }
  if (a.startsWith('rm-day:')) {
    const d = Number(a.slice(7)), c = MD.notify.cfg();
    return MD.sub.gate('remind', () => {
      const i = c.days.indexOf(d);
      if (i >= 0) { if (c.days.length > 1) c.days.splice(i, 1); } else c.days.push(d);
      c.days.sort(); MD.notify.save(c); MD.notify.apply(); renderPanel();
    });
  }
  if (a === 'quick-toggle') {
    const c = MD.notify.cfg(), want = !c.quick;
    const r = await MD.notify.setQuick(want);
    if (!r.ok) { renderPanel(r.reason === 'denied' ? 'Нужен доступ к уведомлениям. Включи их в настройках телефона: Приложения → Фин → Уведомления.' : 'Не получилось включить. Попробуй ещё раз.'); }
    else renderPanel();
    renderAccount(); return;
  }
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
  if (a === 'exp-file') {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const file = new File([blob], 'fin-копия.json', { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Копия данных Фина' }); return; }
    } catch (_) { return; }
    const url = URL.createObjectURL(blob), l = document.createElement('a');
    l.href = url; l.download = 'fin-копия.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    return toast('Файл сохранён', null, null, 'happy');
  }
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
MD.app = {
  get state() { return state; },
  ctx() { ensureAccount(); return { now: new Date(), tx: state.tx, goals: state.goals, sym: sym(), startBalance: startBal(), freeMoney: MD.goals.freeMoney(state.tx, new Date()), accounts: state.accounts }; },
  addTx, openTx, openQuiz: startNewGoal, showTab, toast, confirmDlg, openLayer, closeLayer, confetti, buzz,
  refreshAll: () => { render(); },
  normalizeItems, esc, icon, money, fmt, paintIcons, quickAdd,
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
