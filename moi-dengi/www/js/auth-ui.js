/* Экран входа «Мои деньги»: Google, Apple (iCloud), номер телефона, почта.
   Показывается поверх приложения, пока человек не вошёл. Сами входы — в cloud.js. */
(function (root) {
  'use strict';
  const MD = root.MD;
  const host = document.getElementById('auth');
  if (!host) return;
  const cloud = MD.cloud;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const GOOGLE = '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const APPLE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>';

  let step = 'menu', mode = 'in', busy = false, pose = 'hello', error = '', info = '', phone = '', timer = null, cooldown = 0, draft = { email: '', pw: '' };

  function friendly(e) {
    const l = (((e && e.code) || '') + ' ' + ((e && e.message) || '')).toLowerCase();
    if (/12501|cancel|popup-closed|user-cancelled|canceled/.test(l)) return null;
    if (/network|unavailable|timeout|interrupted|unreachable/.test(l)) return 'Нет интернета. Подключись к сети и попробуй ещё раз.';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(l)) return 'Почта или пароль не подходят. Проверь и попробуй ещё раз.';
    if (/email-already-in-use/.test(l)) return 'Эта почта уже зарегистрирована. Выбери «Войти» и введи пароль.';
    if (/weak-password/.test(l)) return 'Пароль слишком короткий — нужно хотя бы 6 символов.';
    if (/invalid-email/.test(l)) return 'Проверь почту — в адресе опечатка.';
    if (/too-many-requests|quota|blocked/.test(l)) return 'Слишком много попыток. Подожди немного и повтори.';
    if (/invalid-phone-number/.test(l)) return 'Номер не подошёл. Введи его с кодом страны, например +375291234567.';
    if (/invalid-verification|invalid-code/.test(l)) return 'Код не подошёл. Проверь цифры из СМС.';
    if (/expired/.test(l)) return 'Код устарел. Запроси новый.';
    if (/developer_error|10:|sha|api key|configuration|not-allowed|operation-not/.test(l)) return 'Этот способ входа ещё не включён в настройках облака. Выбери другой.';
    return 'Не получилось войти. Попробуй ещё раз.';
  }

  function go(next, p) { if (next !== 'menu' && step === 'menu') history.pushState({ auth: 1 }, ''); step = next; error = ''; info = ''; pose = p || 'hello'; render(); }
  function fail(e) { const m = friendly(e); error = m || ''; pose = m ? 'oops' : 'hello'; busy = false; render(); }

  function menu() {
    const p = cloud.providers;
    return `<div class="auth-hero">${MD.mascot(pose, 150)}<h1>Мои деньги</h1><p>Войди, чтобы твои траты и доходы были на любом устройстве и никогда не потерялись.</p></div>
    <div class="auth-btns">
      ${p.google ? `<button class="abtn light" data-act="google">${GOOGLE}<span>Продолжить с Google</span></button>` : ''}
      ${p.apple ? `<button class="abtn dark" data-act="apple">${APPLE}<span>Продолжить с Apple</span></button>` : ''}
      ${p.phone ? `<button class="abtn" data-act="to-phone">${MD.icon('sms')}<span>По номеру телефона</span></button>` : ''}
      ${p.email ? `<button class="abtn" data-act="to-email">${MD.icon('mail')}<span>По почте</span></button>` : ''}
    </div>
    ${error ? `<div class="msg err" role="alert">${esc(error)}</div>` : ''}
    <p class="auth-foot">Данные хранятся в твоём личном облачном хранилище. Они видны только тебе.</p>`;
  }

  function head(title, sub) { return `<button class="auth-back" data-act="back" aria-label="Назад">${MD.icon('left')}</button><div class="auth-mini">${MD.mascot(pose, 84)}<h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`; }
  const busyBtn = (label) => `<button class="btn primary wide ${busy ? 'loading' : ''}" type="submit" ${busy ? 'disabled' : ''}><span class="spin" aria-hidden="true"></span><span>${esc(label)}</span></button>`;
  const errBox = () => (error ? `<div class="msg err" role="alert">${esc(error)}</div>` : info ? `<div class="msg ok" role="status">${esc(info)}</div>` : '');

  function email() {
    const up = mode === 'up';
    return `${head(up ? 'Создаём аккаунт' : 'С возвращением', up ? 'Почта и пароль — и всё сохранится в облаке' : 'Введи почту и пароль')}
    <div class="seg" role="radiogroup" aria-label="Вход или регистрация">
      <button type="button" role="radio" class="seg-b" data-act="mode-in" aria-checked="${!up}">Войти</button>
      <button type="button" role="radio" class="seg-b" data-act="mode-up" aria-checked="${up}">Новый аккаунт</button>
    </div>
    <form id="emailForm" novalidate>
      <label class="fl" for="aEmail">Почта</label>
      <input id="aEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="name@example.com" value="${esc(draft.email)}">
      <label class="fl" for="aPw">Пароль</label>
      <input id="aPw" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="${up ? 'Не короче 6 символов' : 'Твой пароль'}" value="${esc(draft.pw)}">
      ${errBox()}
      ${busyBtn(up ? 'Создать аккаунт' : 'Войти')}
      ${up ? '' : '<button type="button" class="link center" data-act="reset">Забыл пароль</button>'}
    </form>`;
  }

  function phoneStep() {
    return `${head('Вход по номеру', 'Пришлём СМС с кодом')}
    <form id="phoneForm" novalidate>
      <label class="fl" for="aPhone">Номер телефона</label>
      <input id="aPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+375 29 123-45-67" value="${esc(phone)}">
      <div class="note">Вводи с кодом страны: +375, +7, +380…</div>
      ${errBox()}
      ${busyBtn('Получить код')}
    </form>`;
  }

  function codeStep() {
    return `${head('Введи код из СМС', phone)}
    <form id="codeForm" novalidate>
      <label class="fl" for="aCode">Код</label>
      <input id="aCode" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">
      ${errBox()}
      ${busyBtn('Подтвердить')}
      <button type="button" class="link center" data-act="resend" ${cooldown > 0 ? 'disabled' : ''}>${cooldown > 0 ? `Отправить ещё раз через ${cooldown} с` : 'Отправить код ещё раз'}</button>
    </form>`;
  }

  function render() {
    const h = { menu, email, phone: phoneStep, code: codeStep }[step]();
    host.innerHTML = `<div class="auth-in">${h}</div>`;
    const f = host.querySelector('input'); if (f && step !== 'menu') setTimeout(() => f.focus({ preventScroll: true }), 50);
  }

  async function run(fn, after) {
    busy = true; error = ''; render();
    try { await fn(); busy = false; if (after) after(); else render(); }
    catch (e) { fail(e); }
  }
  function startCooldown() {
    cooldown = 30; clearInterval(timer);
    timer = setInterval(() => { cooldown--; if (cooldown <= 0) clearInterval(timer); if (step === 'code') { const b = host.querySelector('[data-act=resend]'); if (b) { b.disabled = cooldown > 0; b.textContent = cooldown > 0 ? `Отправить ещё раз через ${cooldown} с` : 'Отправить код ещё раз'; } } }, 1000);
  }
  function normPhone(v) {
    let t = v.replace(/[\s\-()]/g, '');
    if (/^8\d{10}$/.test(t)) t = '+7' + t.slice(1);
    return /^\+\d{9,15}$/.test(t) ? t : null;
  }
  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  host.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || busy) return;
    const a = b.dataset.act;
    if (a === 'google') run(() => cloud.signInGoogle());
    else if (a === 'apple') run(() => cloud.signInApple());
    else if (a === 'to-email') go('email');
    else if (a === 'to-phone') go('phone');
    else if (a === 'back') { if (history.state && history.state.auth) history.back(); else go('menu'); }
    else if (a === 'mode-in' || a === 'mode-up') { draft.email = (host.querySelector('#aEmail') || {}).value || draft.email; mode = a === 'mode-up' ? 'up' : 'in'; error = ''; render(); }
    else if (a === 'reset') {
      const v = (host.querySelector('#aEmail').value || '').trim();
      if (!validEmail(v)) { error = 'Сначала введи свою почту — на неё придёт письмо для сброса.'; pose = 'think'; render(); return; }
      draft.email = v; run(() => cloud.resetPassword(v), () => { info = 'Письмо отправлено. Открой его и придумай новый пароль.'; pose = 'happy'; render(); });
    }
    else if (a === 'resend') run(() => cloud.phoneSend(phone), () => { startCooldown(); info = 'Отправили код ещё раз.'; render(); });
  });

  host.addEventListener('submit', e => {
    e.preventDefault();
    if (busy) return;
    if (e.target.id === 'emailForm') {
      const em = host.querySelector('#aEmail').value.trim(), pw = host.querySelector('#aPw').value;
      draft = { email: em, pw };
      if (!validEmail(em)) { error = 'Проверь почту — в адресе опечатка.'; pose = 'think'; render(); return; }
      if (pw.length < 6) { error = mode === 'up' ? 'Придумай пароль не короче 6 символов.' : 'Введи пароль.'; pose = 'think'; render(); return; }
      run(() => (mode === 'up' ? cloud.signUpEmail(em, pw) : cloud.signInEmail(em, pw)));
    } else if (e.target.id === 'phoneForm') {
      const n = normPhone(host.querySelector('#aPhone').value);
      phone = host.querySelector('#aPhone').value;
      if (!n) { error = 'Номер не подошёл. Введи его с кодом страны, например +375291234567.'; pose = 'think'; render(); return; }
      phone = n;
      run(() => cloud.phoneSend(n), () => { startCooldown(); go('code', 'listen'); });
    } else if (e.target.id === 'codeForm') {
      const c = host.querySelector('#aCode').value.replace(/\D/g, '');
      if (c.length < 6) { error = 'Код — шесть цифр из СМС.'; pose = 'think'; render(); return; }
      run(() => cloud.phoneConfirm(c));
    }
  });

  host.addEventListener('input', e => { if (e.target.id === 'aCode') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });

  // Системная кнопка «Назад» на вложенных шагах
  window.addEventListener('popstate', () => { if (!host.hidden && step !== 'menu') go('menu'); });

  MD.authUI = {
    show() { step = 'menu'; mode = 'in'; error = ''; info = ''; busy = false; pose = 'hello'; host.hidden = false; render(); },
    hide() { host.hidden = true; clearInterval(timer); draft = { email: '', pw: '' }; }
  };
})(window);
