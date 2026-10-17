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
let state = { currency: 'BYN', accounts: [], goals: [], tx: [], nudge: MD.nudges.defaultState(), fest: MD.events.defaultFest() };
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
const canon = st => JSON.stringify([st.currency, st.accounts, st.goals, st.nudge, st.fest, st.tx.map(t => [t.id, t.type, t.amount, t.cat, t.acc, t.date, t.note]).sort()]);
function applyRemote(r) {
  if (!r.exists) {                               // новый аккаунт: заливаем то, что уже есть на телефоне
    synced = { meta: '', tx: new Map() };
    pushCloud();
    return;
  }
  const st = sanitize({ currency: r.currency, accounts: r.accounts, goals: r.goals, nudge: r.nudge, fest: r.fest, tx: r.tx });
  if (!st) return;
  st.tx.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0)));
  synced = cloud.snapshotOf(st);
  if (canon(st) === canon(state)) return;
  state = st;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  render();
  nudgeRefresh(true);
  MD.notify.applyEvents(state.fest.list);
}
function wipeLocal() {
  state = { currency: 'BYN', accounts: [], goals: [], tx: [], nudge: MD.nudges.defaultState(), fest: MD.events.defaultFest() };
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
  stopListen = cloud.listen(u.uid, { onData: applyRemote, onError: () => toast('Нет связи. Данные сохранятся на телефоне', null, null, 'oops') });
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
  return { currency, accounts, goals, tx, nudge: MD.nudges.sanitizeState(o.nudge), fest: MD.events.sanitize(o.fest) };
}

/* ---------- UI-состояние ---------- */
const now0 = new Date();
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

/* Фин комментирует месяц: первая реплика самая важная, по касанию листаем дальше */
let sayIdx = 0;
const pluralN = (n, a, b, c) => { const m = n % 100, k = n % 10; return m >= 11 && m <= 14 ? c : k === 1 ? a : k >= 2 && k <= 4 ? b : c; };
function finTips() {
  const seed = Math.floor(Date.now() / 864e5);
  const V = arr => arr[(sayIdx + seed) % arr.length];       // варианты реплик меняются по касанию и по дням
  const cur = monthTx(now0.getFullYear(), now0.getMonth());
  const inc = sumOf(cur, 'income'), exp = sumOf(cur, 'expense');
  const tips = [], M = n => esc(maskT(money(n)));
  if (state.nudge.on && state.tx.length > 0 && state.tx.length < 10) tips.push({ pose: 'think', t: esc(MD.nudges.t('few')) });
  const todayExp = round2(state.tx.filter(t => t.type === 'expense' && t.date === today()).reduce((s, t) => s + t.amount, 0));
  if (!state.tx.length) tips.push({ pose: 'hello', t: 'Привет, я <em>Фин</em>!<small>Нажми «+» или скажи в микрофон, например: «кофе 5».</small>' });
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
  tips.push({ pose: 'notify', t: V(['Можно просто сказать<small>Нажми «Голосом» и скажи: «вчера кофе 6».</small>', 'Записать быстрее голосом<small>Скажи: «такси 12 и обед 9».</small>', 'Спроси помощника<small>Например: «сколько я потратил на кофе».</small>']) });
  return tips;
}
function renderSay(pop) {
  const tips = finTips(), tip = tips[sayIdx % tips.length];
  const el = $('#homeSay');
  el.innerHTML = MD.say(tip.pose, tip.t, 72);
  el.setAttribute('aria-label', 'Фин говорит. Нажми, чтобы услышать другое');
  if (pop) { const m = $('.fin-say-m', el); m.classList.add('pop'); setTimeout(() => m.classList.remove('pop'), 600); }
}
$('#homeSay').addEventListener('click', () => { sayIdx++; renderSay(true); buzz(8); });

function render() {
  ensureAccount();
  const d = new Date();
  const hr = d.getHours();
  $('#hello').textContent = hr < 5 ? 'Доброй ночи' : hr < 12 ? 'Доброе утро' : hr < 18 ? 'Добрый день' : 'Добрый вечер';
  const wd = WD[d.getDay()];
  $('#todayLabel').textContent = `${wd[0].toUpperCase()}${wd.slice(1)}, ${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  renderMonthBars();
  renderHome();
  renderSay();
  renderNudge();
  if (tab === 'ops') renderOps();
  if (tab === 'stats') renderStats();
  if (tab === 'goals') renderGoals();
  if (tab === 'acc') renderAcc();
  if (tab === 'chat' && MD.chat) MD.chat.render();
  if (tab === 'home' || tab === 'stats') nudgeRefresh(false);
}

function renderMonthBars() {
  const html = `<div class="monthbar"><button class="mb" data-mshift="-1" aria-label="Предыдущий месяц">${icon('left')}</button><button class="mlabel" data-mnow aria-label="Показан ${MONTHS[ym.m]} ${ym.y}. Нажми, чтобы вернуться к текущему месяцу">${MONTHS[ym.m]} ${ym.y}</button><button class="mb" data-mshift="1" aria-label="Следующий месяц">${icon('right')}</button></div>`;
  $$('.monthbar-slot').forEach(s => { s.innerHTML = html; });
}

function streakDays() {
  const days = new Set(state.tx.map(t => t.date));
  let d = new Date(); if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function quickCats() {
  const since = ymd(new Date(Date.now() - 60 * 864e5)), cnt = {};
  state.tx.filter(t => t.type === 'expense' && t.date >= since && t.cat !== 'Другое').forEach(t => { cnt[t.cat] = (cnt[t.cat] || 0) + 1; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  for (const c of ['Продукты', 'Кафе', 'Транспорт', 'Дом']) if (top.length < 3 && !top.includes(c)) top.push(c);
  return top.slice(0, 3);
}
function goalCard(g) {
  const pct = goalPct(g), done = g.saved >= g.target;
  return `<button class="gcard${done ? ' done' : ''}" data-goal="${esc(g.id)}" aria-label="Цель ${esc(g.name)}, ${pct}%"><span class="ring" style="--p:${pct}"><b>${pct}%</b></span><span class="gn">${esc(g.name)}</span><small><b>${esc(maskT(money(g.saved)))}</b> из ${esc(maskT(money(g.target)))}</small></button>`;
}
function renderHome() {
  const total = totalBalance();
  setNum($('#heroSum'), moneyH, total);
  $('#btnEye').innerHTML = icon(hide ? 'eyeoff' : 'eye');
  $('#btnEye').setAttribute('aria-pressed', String(hide));
  $('#btnEye').setAttribute('aria-label', hide ? 'Показать суммы' : 'Скрыть суммы');

  const list = monthTx();
  const inc = sumOf(list, 'income'), exp = sumOf(list, 'expense');
  $('#sumInc').innerHTML = hide ? MASK : (inc > 0 ? '+' : '') + moneyH(inc);
  $('#sumExp').innerHTML = hide ? MASK : (exp > 0 ? '−' : '') + moneyH(exp);

  const st = streakDays(), sb = $('#streak');
  sb.hidden = st < 2;
  $('#streakN').textContent = st;
  sb.setAttribute('aria-label', `Записываешь ${st} ${pluralN(st, 'день', 'дня', 'дней')} подряд`);

  $('#quickRow').innerHTML = `<button class="qk voice" type="button" data-quick="voice">${icon('mic')}<span>Голосом</span></button>` +
    quickCats().map(c => { const ci = catInfo('expense', c); return `<button class="qk" type="button" data-qcat="${esc(c)}"><span class="ci" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</span><span>${esc(c)}</span></button>`; }).join('');

  const gl = state.goals;
  $('#goalsAll').hidden = !gl.length;
  $('#goalStrip').innerHTML = gl.length
    ? gl.map(goalCard).join('') + `<button class="gcard new" type="button" data-newgoal><span class="gplus" aria-hidden="true">${icon('plus')}</span>Новая цель</button>`
    : `<button class="gcard wide" type="button" data-newgoal><span aria-hidden="true">${MD.mascot('think', 64)}</span><span class="gtxt"><b>Поставь цель</b><span>Фин посчитает, сколько откладывать в месяц</span></span></button>`;

  const recent = list.slice().sort(cmpTx).slice(0, 5);
  $('#recentList').innerHTML = recent.length
    ? `<div class="recent">${recent.map(txRow).join('')}</div>`
    : `<div class="empty"><span class="emp-m" aria-hidden="true">${MD.mascot('sleepy', 132)}</span><b>Пока пусто</b>Нажми +, чтобы добавить первую трату. Фин всё запишет.</div>`;
}

const cmpTx = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

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
  $('#opsFilterChip').innerHTML = fa ? `<span class="fchip">Карта: ${esc(fa.name)}<button id="chipX" aria-label="Сбросить фильтр по карте">${icon('close')}</button></span>` : '';
  $$('#s-ops [data-ft]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ft === opsType)));
  const q = opsQuery.trim().toLowerCase();
  const list = monthTx().filter(t => (opsType === 'all' || t.type === opsType) &&
    (!q || t.cat.toLowerCase().includes(q) || t.note.toLowerCase().includes(q) || ((accById(t.acc) || {}).name || '').toLowerCase().includes(q)));
  const el = $('#opsList');
  if (!list.length) {
    el.innerHTML = `<div class="empty"><span class="emp-m" aria-hidden="true">${MD.mascot(q ? 'think' : 'sleepy', 132)}</span><b>${q ? 'Ничего не нашлось' : `В ${MONTHS_P[ym.m]} пока пусто`}</b>${q ? 'Попробуй другое слово или часть названия.' : 'Нажми +, чтобы добавить запись. Фин подскажет.'}</div>`;
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
    card.innerHTML = `<div class="empty" style="border:0"><span class="emp-m" aria-hidden="true">${MD.mascot('sleepy', 132)}</span><b>Нет данных за этот месяц</b>Добавь операции, и Фин покажет, ${statType === 'expense' ? 'куда уходят деньги' : 'откуда приходят деньги'}.</div>`;
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
      <div class="top-cat">${statType === 'expense' ? 'Больше всего ушло на' : 'Главный источник'}<b>${esc(rows[0][0])}</b>${Math.round(rows[0][1] / total * 100)}% ${word} · ${esc(maskT(money(rows[0][1])))}</div>
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
    const top = esc(rows[0][0]);
    let tip;
    const topSum = esc(maskT(money(rows[0][1]))), share = Math.round(rows[0][1] / total * 100);
    if (statType === 'income') tip = { p: 'happy', t: `Главный источник: <em>${top}</em><small>${share}% дохода за месяц, ${topSum}.</small>` };
    else if (prev > 0 && total < prev) tip = { p: 'joy', t: `Расходы упали на <em>${Math.round((prev - total) / prev * 100)}%</em> против ${MONTHS_G[pm.getMonth()]}<small>Больше всего ушло на «${top}»: ${topSum}.</small>` };
    else if (prev > 0 && total > prev * 1.15) tip = { p: 'think', t: `Расходы выросли на <em>${Math.round((total - prev) / prev * 100)}%</em> против ${MONTHS_G[pm.getMonth()]}<small>Больше всего ушло на «${top}»: ${topSum}.</small>` };
    else tip = { p: 'hello', t: `Больше всего ушло на <em>${top}</em><small>${share}% расходов, ${topSum}.</small>` };
    $('#statSay').innerHTML = MD.say(tip.p, tip.t, 84);
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
let tabPushed = false;
function showTab(name, fromPop) {
  tab = name;
  $$('.screen').forEach(s => { s.hidden = s.dataset.screen !== name; });
  const navName = name === 'ops' || name === 'goals' ? 'home' : name;
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
  if (e.target.closest('[data-back]')) { showTab('home'); return; }
  const g = e.target.closest('[data-go]');
  if (g) showTab(g.dataset.go);
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
function toast(msg, actionLabel, action, pose) {
  const t = $('#toast');
  t.innerHTML = (pose ? `<span class="toast-m">${MD.mascot(pose, 28)}</span>` : '') + `<span>${esc(msg)}</span>` + (actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : '');
  if (actionLabel) $('button', t).onclick = () => { t.hidden = true; action(); };
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, actionLabel ? 5500 : 4000);
}
const showErr = (el, msg) => { el.textContent = msg; el.hidden = false; };
const hideErr = el => { el.hidden = true; };

/* ---------- Запись (добавление / правка) ---------- */
const tx = { type: 'expense', cat: 'Продукты', acc: null, editId: null };
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
  tx.type = t ? t.type : (opts.type || 'expense');
  tx.cat = t ? t.cat : (opts.cat && CATS[tx.type].some(c => c[0] === opts.cat) ? opts.cat : CATS[tx.type][0][0]);
  tx.acc = t ? t.acc : state.accounts[0].id;
  $('#txTitle').textContent = t ? 'Изменить запись' : tx.type === 'income' ? 'Новый доход' : 'Новая запись';
  $('#txAmount').value = t ? String(t.amount).replace('.', ',') : '';
  $('#txNote').value = t ? t.note : '';
  $('#txDate').value = t ? t.date : today();
  $('#txDelete').hidden = !t;
  hideErr($('#txAmountErr'));
  endTxVoice();
  renderTxForm();
  const ly = $('#lyTx');
  ly._onClose = () => { MD.voice.cancel(); endTxVoice(); };
  openLayer(ly);
  if (t) $('#txAmount').removeAttribute('data-autofocus'); else $('#txAmount').setAttribute('data-autofocus', '');
  if (opts.voice) setTimeout(startTxVoice, 220);
}
$('#lyTx').addEventListener('click', e => {
  const t = e.target.closest('[data-type],[data-cat]');
  if (!t) return;
  if (t.dataset.type) { tx.type = t.dataset.type; if (!CATS[tx.type].some(c => c[0] === tx.cat)) tx.cat = CATS[tx.type][0][0]; else if (tx.type === 'income' && tx.cat === 'Подарки') tx.cat = 'Подарок'; }
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
  if (!(amt > 0)) { showErr(err, 'Введи сумму, например 150.'); $('#txAmount').focus(); return; }
  hideErr(err);
  const note = $('#txNote').value.trim().slice(0, 120);
  if (tx.cat === OTHER && !note) {
    $('#txNoteF').classList.add('err'); showErr($('#txNoteErr'), 'Напиши, что именно: например, «ремонт часов».'); $('#txNote').focus(); return;
  }
  const date = parseYmd($('#txDate').value) ? $('#txDate').value : today();
  const rec = { type: tx.type, amount: round2(amt), cat: tx.cat, acc: tx.acc, date, note };
  const ex = tx.editId && state.tx.find(t => t.id === tx.editId);
  const first = !state.tx.length;
  if (ex) Object.assign(ex, rec); else state.tx.push({ id: uid(), ...rec, ts: Date.now() });
  lastAddAt = Date.now();
  save();
  const d = parseYmd(date); ym = { y: d.getFullYear(), m: d.getMonth() };
  closeLayer($('#lyTx'));
  buzz(15);
  render();
  if (!ex) showTab('home');
  toast(ex ? 'Изменения сохранены' : 'Записано', null, null, 'joy');
  if (first) confetti();
  if (!ex) maybeAskFest([rec]);
});
$('#txDelete').addEventListener('click', () => {
  const id = tx.editId;
  if (!id) return;
  confirmDlg('Удалить запись?', 'Её не получится вернуть.').then(ok => { if (!ok) return; closeLayer($('#lyTx')); deleteTx(id); });
});

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
  head.textContent = 'Включаю микрофон…'; live.textContent = 'Скажи, например: «кофе 6»'; live.classList.remove('has');
  MD.voice.start({
    onStart: () => { head.textContent = 'Слушаю'; buzz(12); },
    onPartial: t => { live.textContent = t; live.classList.add('has'); },
    onEnd: t => { endTxVoice(); applyVoiceText(t); },
    onError: code => { endTxVoice(); showErr($('#txAmountErr'), MD.voiceMessage(code)); }
  });
}
function applyVoiceText(text) {
  ensureAccount();
  const items = normalizeItems(MD.parseNotes(text, { today: new Date(), accounts: state.accounts }));
  if (!items.length) { showErr($('#txAmountErr'), `Не понял «${text}». Скажи, что и сколько: «такси 12».`); return; }
  buzz(15);
  if (items.length > 1) { draft = items; renderDraft(); openLayer($('#lyDraft')); return; }
  const it = items[0];
  tx.type = it.type; tx.cat = it.cat;
  $('#txAmount').value = String(it.amount).replace('.', ',');
  $('#txNote').value = it.note || '';
  $('#txDate').value = it.date;
  $('#txTitle').textContent = it.type === 'income' ? 'Новый доход' : 'Новая запись';
  renderTxForm();
  if (it.cat === OTHER && !it.note) setTimeout(() => $('#txNote').focus(), 60);
}
$('#txVoice').addEventListener('click', startTxVoice);
$('#txVoiceStop').addEventListener('click', () => MD.voice.stop());
$('#txVoiceCancel').addEventListener('click', () => { MD.voice.cancel(); endTxVoice(); });

function deleteTx(id) {
  const i = state.tx.findIndex(t => t.id === id);
  if (i < 0) { render(); return; }
  state.tx.splice(i, 1);
  save(); render(); buzz(15);
  nudgeRefresh(true);
  toast('Запись удалена');
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
    if (s.dx < -96) { s.el.style.transform = 'translateX(-110%)'; confirmDlg('Удалить запись?', 'Её не получится вернуть.').then(ok => { if (ok) deleteTx(s.id); else { s.el.style.transform = ''; } }); }
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
const goalLeft = g => {
  if (g.saved >= g.target) return 'Цель достигнута';
  const ml = G.monthsLeft(g.deadline, new Date());
  if (!ml) return 'Срок вышел';
  const dl = new Date(g.deadline + 'T00:00:00');
  return `${G.termLabel(ml)} · по ${maskT(money(Math.ceil((g.target - g.saved) / ml)))} · до ${MONTHS[dl.getMonth()].toLowerCase()} ${dl.getFullYear()}`;
};
function renderGoals() {
  const el = $('#goalsBody'), list = state.goals;
  if (!list.length) {
    el.innerHTML = `<div class="goal-empty"><span class="emp-m" aria-hidden="true">${MD.mascot('think', 170)}</span><h2>Пока нет целей</h2><p>Создай первую — Фин поможет посчитать, сколько откладывать в месяц.</p><button class="btn primary wide" data-newgoal>Добавить цель</button></div>`;
    return;
  }
  const sum = round2(list.reduce((s, g) => s + g.saved, 0));
  el.innerHTML = `<div class="say-wrap">${MD.say('happy', `Отложено <em>${esc(maskT(money(sum)))}</em><small>${list.filter(g => g.saved < g.target).length} ${pluralN(list.filter(g => g.saved < g.target).length, 'цель', 'цели', 'целей')} в работе</small>`, 84)}</div>` +
    list.map(g => `<button class="goal" data-goal="${esc(g.id)}">
      <span class="goal-top"><b>${esc(g.name)}</b><span class="goal-pct">${goalPct(g)}%</span></span>
      <span class="goal-bar"><i style="width:${goalPct(g)}%"></i></span>
      <span class="goal-sub"><span>${esc(maskT(money(g.saved)))} из ${esc(maskT(money(g.target)))}</span><span>${esc(goalLeft(g))}</span></span>
    </button>`).join('');
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
    <span class="goal-bar"><i style="width:${pct}%"></i></span>
    <span class="goal-sub"><span>Цель: ${esc(maskT(money(g.target)))}</span><span>${esc(goalLeft(g))}</span></span></div>
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
$('#goalStrip').addEventListener('click', goalClick);
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
  if (!was && g.saved >= g.target) confetti();
});
$('#goalDetail').addEventListener('click', async e => {
  if (!e.target.closest('#goalDel')) return;
  const g = state.goals.find(x => x.id === openGoalId); if (!g) return;
  const yes = await confirmDlg('Удалить цель?', `Цель «${g.name}» и отметка ${money(g.saved)} в ней пропадут. Записи в истории останутся.`, 'Удалить');
  if (!yes) return;
  state.goals = state.goals.filter(x => x.id !== g.id); save(); render();
  closeLayer($('#lyGoal'));
  toast('Цель удалена', null, null, 'think');
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
      say = ['think', 'Не вижу твоих трат и доходов. Сколько примерно остаётся свободным за месяц?'];
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
        ok: ['happy', `Реально, но впритык: <em>${esc(money(p.monthly))}</em> в месяц, срок ${T}.<small>Это почти всё твоё свободное.</small>`],
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
        ${p.free !== null ? `<div><span>Свободно в среднем</span><b>${esc(money(p.free))} в месяц</b></div>` : ''}
      </div>` + qBtn('accept', 'Согласен') +
        (p.verdict === 'hard' && p.altMonths ? qBtn('alt', `Растянуть до ${G.termLabel(p.altMonths)}`, 'soft') : '') +
        qBtn('reject', 'Не подходит', 'ghost');
      void cur;
      break;
    }
    case 'tune':
      say = ['think', 'Что поправим?'];
      html = `<div class="opts">
        <button type="button" data-qa="tuneMonthly">Слишком много в месяц</button>
        <button type="button" data-qa="tuneTerm">Хочу быстрее</button>
        <button type="button" data-qa="tuneTarget">Цель дороговата</button>
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
  showTab('home');
  toast('Цель добавлена. Пополняй, когда отложишь', null, null, 'joy');
}

$('#fab').addEventListener('click', () => { buzz(10); openTx(); });

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
    const ci = catInfo(d.type, d.cat), a = accById(d.acc);
    return `<div class="dr"><div class="tx-ic" style="--c:${ci[2]}" aria-hidden="true">${cIcon(ci)}</div>
      <div class="dr-b"><div class="dr-t">${esc(d.cat)}</div>${d.note ? `<div class="tx-n">${esc(d.note)}</div>` : ''}<div class="dr-s">${esc(dayTitle(d.date))}</div></div>
      <div class="tx-a ${d.type === 'income' ? 'inc' : 'exp'}">${esc(signed(d.amount, d.type))}</div>
      <button class="dr-x" data-drop="${i}" aria-label="Убрать строку: ${esc(d.cat)}">${icon('close')}</button></div>`;
  }).join('');
  const inc = sumOf(draft, 'income'), exp = sumOf(draft, 'expense');
  $('#draftSum').innerHTML = `<span>Записей: ${draft.length}</span><span class="i">Доход +${esc(money(inc))}</span><span class="e">Расход −${esc(money(exp))}</span>`;
  $('#draftOk').disabled = !draft.length;
  $('#draftOk').textContent = `Сохранить всё · ${draft.length}`;
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
  const n = draft.length, saved = draft.slice();
  const latest = draft.map(d => d.date).sort().pop(), ld = parseYmd(latest);
  draft.forEach((d, i) => state.tx.push({ id: uid(), ...d, ts: Date.now() + i }));
  draft = [];
  lastAddAt = Date.now();
  save();
  ym = { y: ld.getFullYear(), m: ld.getMonth() };
  closeLayer($('#lyDraft'));
  if (!$('#lyTx').hidden) closeLayer($('#lyTx'));
  buzz(20);
  showTab('home');
  toast(`Записал: ${n}`, null, null, 'happy');
  maybeAskFest(saved);
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
$('#evDelete').addEventListener('click', async () => {
  if (!ev || !ev.id) return;
  if (!(await confirmDlg('Удалить праздник?', 'Напоминание тоже пропадёт.', 'Удалить'))) return;
  state.fest.list = festList().filter(x => x.id !== ev.id);
  closeLayer($('#lyEvent')); ev = null; festSave(); toast('Праздник удалён');
});

/* ---------- Фин заметил: подсказки по привычкам ---------- */
const NG = MD.nudges;
let ngAnalysis = null, ngAt = 0, ngTimer = null, lastAddAt = 0;
const ngCtx = () => ({ now: new Date(), currency: state.currency, canShow: nudgeCanShow(), money: n => money(n), dayName: d => `${d.getDate()} ${MONTHS_G[d.getMonth()]}` });
/* Не мешаем вводу: подсказка появляется только на Главной, когда закрыты форма, «Всё верно?» и запись голоса */
function nudgeCanShow() { return tab === 'home' && layers.length === 0 && !MD.voice.active && Date.now() - lastAddAt > 8000 && (!cloud.enabled || !!me); }
/* Пересчёт паттернов не чаще раза в 10 минут (удаление и импорт считают сразу), выбор подсказки лёгкий */
function nudgeRefresh(force) {
  clearTimeout(ngTimer);
  ngTimer = setTimeout(() => {
    if (cloud.enabled && !me) return;
    const c = ngCtx();
    if (force || !ngAnalysis || Date.now() - ngAt > 10 * 60 * 1000 || (state.nudge.active && state.nudge.active.rule === 'limit')) { ngAnalysis = NG.analyze(state.tx, state.nudge, c); ngAt = Date.now(); }
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
  const sn = $('#statNudge'), isCur = ym.y === now0.getFullYear() && ym.m === now0.getMonth();
  sn.innerHTML = d && isCur && tab === 'stats' ? `<button class="nudge-mini" type="button" data-nudge="talk" aria-label="${esc(NG.t('aria.talk', { cat: d.cat }))}"><span aria-hidden="true">${MD.mascot('think', 44)}</span><span class="nm-t"><b>${esc(NG.t('title'))}</b><small>${esc(maskT(d.text))}</small></span>${icon('right')}</button>` : '';
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-nudge]'); if (!b) return;
  if (b.dataset.nudge === 'ack') {
    const r = NG.ack(state.nudge); save(); buzz(8); renderNudge();
    if (r.auto) toast(NG.t('muted'), null, null, 'hello');
  } else if (b.dataset.nudge === 'talk') openNudgeDlg();
});

/* Разговор «Обсудить»: две-три реплики по веткам */
let nd = null;
const ndSay = (pose, text) => MD.say(pose, esc(text), 76);
const ndBtn = (act, label, cls = 'soft') => `<button class="btn ${cls} wide" type="button" data-nd="${act}">${esc(label)}</button>`;
function openNudgeDlg() {
  const a = state.nudge.active; if (!a) return;
  NG.startTalk(state.nudge); save();
  nd = { cat: a.cat, step: a.rule === 'limit' ? 'amount' : 'q1' };
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
  const t = NG.t, c = nd.cat;
  let html = '';
  if (nd.step === 'q1') html = ndSay('think', t('q1')) + ndBtn('once', t('once')) + ndBtn('regular', t('regular')) + ndBtn('unknown', t('unknown'));
  else if (nd.step === 'once') html = ndSay('hello', t('onceMsg')) + ndBtn('hide', t('hide'), 'soft') + ndBtn('keep', t('keep'), 'primary');
  else if (nd.step === 'amount') html = ndSay('think', t('askLimit', { cat: c })) + fld('ndAmt', t('amount'), { mode: 'decimal', unit: sym(), value: state.nudge.limit[c] ? String(state.nudge.limit[c]).replace('.', ',') : '' }) + '<div class="msg err" id="ndErr" hidden></div>' + ndBtn('save', t('save'), 'primary');
  else if (nd.step === 'saved') html = ndSay('joy', t('saved')) + ndBtn('done', t('good'), 'primary');
  else if (nd.step === 'unknown') {
    const f = ndFacts();
    html = ndSay('think', `${t('look', { n: f.n, trata: NG.form(f.n, NG.forms('trata')), sum: money(f.sum) })}${f.cmp ? ' ' + t(f.cmp === 'more' ? 'more' : f.cmp === 'less' ? 'less' : 'same') : ''}`) + ndBtn('done', t('ok'), 'primary') + ndBtn('hideall', t('hideAll'), 'soft');
  }
  $('#nudgeBody').innerHTML = `<div class="quiz-in">${html}</div>`;
  const f = $('#ndAmt'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 80);
}
function ndFinish(msg) {
  NG.finishTalk(state.nudge); save();
  const ly = $('#lyNudge'); if (!ly.hidden) closeLayer(ly);
  nd = null; renderNudge();
  if (msg) toast(msg, null, null, 'happy');
}
$('#nudgeBody').addEventListener('click', e => {
  const b = e.target.closest('[data-nd]'); if (!b || !nd) return;
  const a = b.dataset.nd, c = nd.cat;
  if (a === 'once' || a === 'regular' || a === 'unknown') { NG.answer(state.nudge, c, a); save(); nd.step = a === 'once' ? 'once' : a === 'regular' ? 'amount' : 'unknown'; renderNudgeDlg(); return; }
  if (a === 'hide' || a === 'hideall') { NG.hideCat(state.nudge, c); return ndFinish(`Не буду подсказывать про «${c}». Вернуть можно в Профиле.`); }
  if (a === 'keep' || a === 'done') return ndFinish();
  if (a === 'save') {
    const v = parseAmount($('#ndAmt').value);
    if (!(v > 0)) { showErr($('#ndErr'), NG.t('amountErr')); return; }
    NG.setLimit(state.nudge, c, v); save(); nd.step = 'saved'; renderNudgeDlg(); buzz(12); nudgeRefresh(true);
  }
});
$('#nudgeBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ndAmt') { e.preventDefault(); const b = $('#nudgeBody [data-nd=save]'); if (b) b.click(); } });

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
  const on = loggedIn();
  $('#setFoot').textContent = cloud.enabled ? 'Данные хранятся на телефоне и в твоём облаке. Видны только тебе.' : 'Данные хранятся только на этом телефоне.';
  $('#acctMascot').innerHTML = MD.mascot('happy', 56);
  $('#btnSignOut').hidden = !on;
  if (on) {
    $('#acctName').textContent = me.email || me.phone || me.name || 'Мой профиль';
    $('#acctSub').textContent = 'Данные синхронизируются';
  } else {
    $('#acctName').textContent = 'Ты без входа';
    $('#acctSub').textContent = 'Данные только на этом телефоне.';
  }
  const ph = on && me.phoneLinked, em = on && me.emailLinked;
  setPlate('#plPhone', ph ? me.phoneLinked : on ? 'Не привязан' : 'Появится после входа', ph ? okIc() : on ? '<span class="pl-btn">Привязать</span>' : '', !on);
  setPlate('#plEmail', em ? me.emailLinked : on ? 'Не привязана' : 'Появится после входа', em ? okIc() : on ? '<span class="pl-btn">Привязать</span>' : '', !on);
  setPlate('#plBalance', maskT(money(startBal())), null, false);
  setPlate('#plCurrency', `${state.currency} ${CURRENCIES[state.currency]}`, null, false);
  const rc = MD.notify.cfg();
  setPlate('#plRemind', rc.on ? `Каждый день в ${rc.times.join(', ')}` : 'Выключены', null, false);
  setPlate('#plQuick', rc.quick ? 'Кнопки на экране блокировки включены' : 'Записывай, не открывая Фин', null, false);
  const up = MD.events.upcoming(festList(), new Date())[0];
  setPlate('#plFest', up ? `${MD.events.whatText(up.e)}, ${MD.events.daysTo(up.occ, new Date()) === 0 ? 'сегодня' : `через ${MD.events.daysTo(up.occ, new Date())} ${pluralN(MD.events.daysTo(up.occ, new Date()), 'день', 'дня', 'дней')}`}` : 'Дни рождения и праздники с напоминанием', null, false);
  const ng = state.nudge, onCats = MD.nudges.WATCH.filter(k => ng.cats[k] !== false).length;
  $('#plNudge').setAttribute('aria-checked', String(ng.on)); $('#plNudge .sw-t').setAttribute('aria-checked', String(ng.on));
  $('#plNudge small').textContent = ng.on ? NG.counter(ng) : NG.t('set.off');
  setPlate('#plNudgeCats', ng.on ? (onCats === MD.nudges.WATCH.length ? 'Все категории' : `Выбрано ${onCats} из ${MD.nudges.WATCH.length}`) : NG.t('set.off'), null, !ng.on);
  const plus = MD.sub.isPlus(), S = MD.sub.state();
  $('#acctPlus').hidden = !plus;
  $('#plusTitle').textContent = plus ? 'Фин Плюс включён' : 'Фин Плюс';
  $('#plusSub').textContent = plus ? (S.plan === 'trial' ? `Пробный период, осталось дней: ${MD.sub.daysLeft()}` : `Осталось дней: ${MD.sub.daysLeft()}`) : MD.sub.trialUsed() ? 'Чеки, выписки и цели без ограничений' : `${MD.sub.TRIAL_DAYS} дней бесплатно`;
  $('#plusGo').textContent = plus || MD.sub.trialUsed() ? 'Подробнее' : 'Попробовать';
}
$('#plusCard').addEventListener('click', () => MD.sub.open('generic'));

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
      html = cur(['Привязан номер', me.phoneLinked]) + pnBtn('phone-change', 'Изменить номер', 'soft') + pnBtn('phone-unlink', 'Отвязать', 'danger', onlyWay()) + (onlyWay() ? '<div class="note ctr">Это единственный способ входа</div>' : '');
    } else if (P.step === 'new') {
      say = ['hello', P.mode === 'change' ? 'Введи новый номер<small>Пришлю СМС с кодом.</small>' : 'Привяжем телефон<small>Пришлю СМС с кодом.</small>'];
      html = fld('pnPhone', P.mode === 'change' ? 'Новый номер, например +375 29 123-45-67' : 'Номер, например +375 29 123-45-67', { type: 'tel', mode: 'tel', ac: 'tel', value: P.raw || '' }) + e + pnBtn('phone-send', 'Получить код');
    } else {
      say = ['notify', `Введи код из СМС<small>${esc(P.phone)}</small>`];
      html = fld('pnCode', 'Код из СМС', { mode: 'numeric', ac: 'one-time-code', max: 6 }) + e + pnBtn('phone-confirm', 'Подтвердить') + pnBtn('phone-resend', 'Отправить код ещё раз', 'ghost');
    }
  } else if (P.kind === 'email') {
    if (P.step === 'main') {
      html = cur(['Привязана почта', me.emailLinked]) + pnBtn('email-change', 'Изменить почту', 'soft') + pnBtn('email-unlink', 'Отвязать', 'danger', onlyWay()) + (onlyWay() ? '<div class="note ctr">Это единственный способ входа</div>' : '');
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
    html = `<div class="chips" role="radiogroup" aria-label="Валюта">${Object.keys(CURRENCIES).map(c => `<button type="button" role="radio" class="chip" data-chcur="${c}" aria-checked="${c === sel}">${c} ${CURRENCIES[c]}</button>`).join('')}</div><div class="note">Меняется только знак, суммы не пересчитываются.</div>` + pnBtn('cur-apply', 'Применить', 'primary', sel === state.currency);
  } else if (P.kind === 'fest') {
    const ups = MD.events.upcoming(festList(), new Date());
    say = ups.length ? null : ['hello', 'Добавь чей-то день рождения или праздник<small>Напомню заранее отложить деньги на подарок.</small>'];
    html = (ups.length ? `<div class="grp flat">${ups.map(({ e, occ }) => `<button class="row" type="button" data-pn="ev-edit:${esc(e.id)}"><span class="rw-ic" aria-hidden="true"><i data-ic="gift"></i></span><span class="rw-t"><b>${esc(MD.events.whatText(e))}</b><small>${esc(MD.events.dayText(occ))}${e.yearly ? ', каждый год' : ''} · ${esc(MD.events.reminderLine(e, new Date()))}</small></span><span class="rw-r">${icon('right')}</span></button>`).join('')}</div>` : '') +
      pnBtn('ev-add', 'Добавить праздник', 'primary') +
      `<div class="grp flat"><button class="row" type="button" data-pn="ev-ask" role="switch" aria-checked="${state.fest.ask}"><span class="rw-ic" aria-hidden="true"><i data-ic="spark"></i></span><span class="rw-t"><b>Спрашивать о праздниках</b><small>Предлагать внести праздник</small></span><span class="sw-t" aria-checked="${state.fest.ask}"></span></button></div>`;
  } else if (P.kind === 'nudge') {
    const ng = state.nudge, lims = Object.keys(ng.limit);
    say = ['hello', `${NG.counter(ng)}<small>Выбери, по каким категориям Фин может подсказывать.</small>`];
    html = `<div class="grp flat">${MD.nudges.WATCH.map(k => { const ci = catInfo('expense', k), on = ng.cats[k] !== false; return `<button class="row" type="button" data-pn="ng-cat:${esc(k)}" role="switch" aria-checked="${on}"><span class="rw-ic" style="color:${ci[2]}" aria-hidden="true">${cIcon(ci)}</span><span class="rw-t"><b>${esc(k)}</b><small>${ng.limit[k] ? `Порог: ${esc(money(ng.limit[k]))} в месяц` : MD.nudges.PRIO.includes(k) ? 'Привычки и рост' : 'Только сильный рост'}</small></span><span class="sw-t" aria-checked="${on}"></span></button>`; }).join('')}</div>` +
      (lims.length ? pnBtn('ng-limits', 'Убрать пороги', 'soft') : '') + pnBtn('ng-reset', NG.t('set.reset'), 'ghost');
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
    html = `<div class="pn-sec"><b>Экспорт</b><small>Копия всех записей и целей.</small>${pnBtn('exp-copy', 'Скопировать', 'soft')}${pnBtn('exp-file', 'Сохранить в файл', 'soft')}</div>
      <div class="pn-sec"><b>Импорт</b><small>Всё текущее заменится копией.</small>${pnBtn('imp-file', 'Выбрать файл', 'soft')}<input id="pnFile" type="file" accept=".json,application/json,text/plain" hidden>
      <label class="fl sm" for="pnPaste">Или вставь копию</label><textarea id="pnPaste" rows="3" placeholder="Вставь сюда копию"></textarea>${e}${pnBtn('imp-paste', 'Восстановить')}</div>`;
  }
  $('#linkTitle').textContent = PN_TITLE[P.kind];
  $('#linkBody').innerHTML = (say ? MD.say(say[0], say[1], 76) : '') + html;
  paintIcons($('#linkBody'));
  const f = $('#linkBody input:not([type=file]):not([hidden]):not([type=time])'); if (f && P.kind !== 'data') setTimeout(() => f.focus({ preventScroll: true }), 80);
}
async function refreshMe() { try { const u = await cloud.refreshUser(); if (u) me = Object.assign({}, me, u); } catch (_) {} renderAccount(); }
$('#s-acc').addEventListener('click', e => {
  const b = e.target.closest('[data-plate]'); if (!b || b.disabled) return;
  const k = b.dataset.plate;
  if (k === 'nudge-on') { state.nudge.on = !state.nudge.on; if (!state.nudge.on) state.nudge.active = null; save(); renderAccount(); renderNudge(); nudgeRefresh(true); buzz(8); return; }
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
  if (a === 'ev-add') return openEvent();
  if (a.startsWith('ev-edit:')) return openEvent(a.slice(8));
  if (a === 'ev-ask') { state.fest.ask = !state.fest.ask; save(); renderPanel(); return; }
  if (a.startsWith('ng-cat:')) { const k = a.slice(7), ng = state.nudge; if (ng.cats[k] === false) delete ng.cats[k]; else ng.cats[k] = false; if (ng.active && ng.active.cat === k && ng.cats[k] === false) ng.active = null; save(); renderPanel(); renderAccount(); renderNudge(); nudgeRefresh(true); return; }
  if (a === 'ng-limits') { state.nudge.limit = {}; save(); renderPanel(); renderNudge(); return; }
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
  if (a === 'phone-unlink' || a === 'email-unlink') {
    const ph = a === 'phone-unlink';
    const yes = await confirmDlg(ph ? 'Отвязать телефон?' : 'Отвязать почту?', ph ? 'Войти по номеру будет нельзя.' : 'Войти по почте будет нельзя.', 'Отвязать');
    if (!yes) return;
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
    const yes = await confirmDlg('Сменить валюту?', 'Меняется только знак, суммы не пересчитываются.', 'Сменить');
    if (!yes) return;
    state.currency = P.cur; save(); render(); return pnDone(`Валюта: ${P.cur}`);
  }
  if (a === 'exp-copy') {
    const json = JSON.stringify(state);
    let ok = false;
    try { await navigator.clipboard.writeText(json); ok = true; } catch (_) {}
    if (!ok) { try { const ta = document.createElement('textarea'); ta.value = json; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (_) {} }
    return ok ? toast('Скопировано', null, null, 'happy') : renderPanel('Не получилось скопировать. Попробуй сохранить в файл.');
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
  if (a === 'imp-paste') { const raw = V('#pnPaste').trim(); if (!raw) return renderPanel('Вставь в поле копию данных.'); restoreFrom(raw); }
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
async function restoreFrom(raw) {
  let s = null;
  try { s = sanitize(JSON.parse(raw)); } catch (_) {}
  if (!s) return renderPanel('Не понял эту копию. Выбери файл или скопируй копию заново целиком.');
  const yes = await confirmDlg('Заменить данные?', `Всё текущее заменится копией: ${s.tx.length} ${pluralN(s.tx.length, 'запись', 'записи', 'записей')} и ${s.goals.length} ${pluralN(s.goals.length, 'цель', 'цели', 'целей')}.`, 'Заменить');
  if (!yes) return;
  state = s; save(); render();
  nudgeRefresh(true);
  pnDone('Данные восстановлены');
}
$('#btnSignOut').addEventListener('click', async () => {
  const yes = await confirmDlg('Выйти из аккаунта?', 'Данные останутся в облаке. Войдёшь снова, и всё вернётся.', 'Выйти');
  if (!yes) return;
  setTimeout(() => { cloud.signOut(); toast('Вы вышли'); }, 200);
});

/* ---------- Мелочи: конфетти, клавиатура, быстрые действия ---------- */
function confetti() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const fx = $('#fx'), cols = ['#4F6F34', '#9DB45A', '#F2C230', '#F6EBCB', '#F4B3AA', '#3B82F6'];
  const w = innerWidth;
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('i');
    p.style.left = (w * (0.15 + Math.random() * 0.7)) + 'px';
    p.style.background = cols[i % cols.length];
    p.style.setProperty('--dx', ((Math.random() - 0.5) * 220) + 'px');
    p.style.setProperty('--dy', (innerHeight * (0.45 + Math.random() * 0.4)) + 'px');
    p.style.setProperty('--rot', ((Math.random() - 0.5) * 900) + 'deg');
    p.style.animationDelay = (Math.random() * 0.15) + 's';
    fx.appendChild(p);
    setTimeout(() => p.remove(), 1900);
  }
}
if (window.visualViewport) {
  const base = innerHeight;
  const kb = () => document.body.classList.toggle('kb', visualViewport.height < Math.max(base, innerHeight) * 0.75);
  visualViewport.addEventListener('resize', kb);
}

/* Быстрые действия: чипы на главной, виджет, плитка, закреплённое уведомление, напоминание */
function quickAdd(kind) {
  if (cloud.enabled && !me) return;
  layers.slice().forEach(l => { if (l.id !== 'lyConfirm') closeLayer(l); });
  showTab('home', true);
  openTx(null, { type: kind === 'income' ? 'income' : 'expense', voice: kind === 'voice' });
}
$('#quickRow').addEventListener('click', e => {
  const q = e.target.closest('[data-quick]'), c = e.target.closest('[data-qcat]');
  if (q) { buzz(10); openTx(null, { voice: true }); }
  if (c) { buzz(8); openTx(null, { cat: c.dataset.qcat }); }
});
$('#streak').addEventListener('click', () => { const n = streakDays(); toast(`Записываешь ${n} ${pluralN(n, 'день', 'дня', 'дней')} подряд. Так держать!`, null, null, 'joy'); });

/* Что отдаём помощнику и подписке */
function addTx(items) {
  const list = normalizeItems(items, 500);
  if (!list.length) return 0;
  list.forEach((d, i) => state.tx.push({ id: uid(), ...d, ts: Date.now() + i }));
  const latest = parseYmd(list.map(d => d.date).sort().pop());
  ym = { y: latest.getFullYear(), m: latest.getMonth() };
  lastAddAt = Date.now();
  save(); render(); buzz(15);
  nudgeRefresh(true);
  maybeAskFest(list);
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
load();
paintIcons();
if (cloud.enabled) {
  gate(false);
  cloud.onAuth(u => (u ? onSignedIn(u) : onSignedOut()));
} else {
  render();
}
MD.notify.init(quickAdd);
MD.notify.applyEvents(state.fest.list);
if (history.state && (history.state.layer || history.state.tab)) history.replaceState(null, '');
})();
