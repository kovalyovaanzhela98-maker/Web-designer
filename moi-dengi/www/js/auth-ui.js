/* Экран входа «Фин». Не обязателен: без входа данные только на телефоне, со входом они синхронизируются.
   Фин предлагает войти после первой записи (см. offerLogin в app.js) и в Профиле.
   Два главных способа: Google или Apple, и телефон. Почта спрятана за «Другие способы».
   Сами входы — в cloud.js. */
(function (root) {
  'use strict';
  const MD = root.MD;
  const host = document.getElementById('auth');
  if (!host) return;
  const cloud = MD.cloud;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const GOOGLE = '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const APPLE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>';
  const ic = n => MD.icon(n);

  /* step: menu | phone | code | email */
  let step = 'menu', busy = false, error = '', phone = '', mode = 'in', email = '';

  function friendly(e) {
    const l = (((e && e.code) || '') + ' ' + ((e && e.message) || '')).toLowerCase();
    if (/12501|cancel|popup-closed|user-cancelled|canceled/.test(l)) return null;
    if (/network|unavailable|timeout|interrupted|unreachable/.test(l)) return 'Нет сети. Проверь интернет и попробуй снова.';
    if (/too-many-requests|quota|blocked/.test(l)) return 'Много попыток подряд. Подожди немного и повтори.';
    if (/invalid-phone/.test(l)) return 'Не понял номер. Впиши с кодом страны: +375…';
    if (/invalid-verification|invalid-code/.test(l)) return 'Код не подошёл. Проверь цифры или запроси новый.';
    if (/invalid-credential|wrong-password|user-not-found/.test(l)) return 'Почта или пароль не подошли. Попробуй ещё раз.';
    if (/email-already-in-use/.test(l)) return 'Эта почта уже есть. Нажми «Войти».';
    if (/weak-password/.test(l)) return 'Пароль короткий. Нужно хотя бы 6 символов.';
    if (/developer_error|10:|sha|api key|configuration|not-allowed|operation-not/.test(l)) return 'Этот способ пока недоступен. Выбери другой.';
    return 'Не получилось войти. Попробуй ещё раз.';
  }
  const normPhone = v => { let t = String(v).replace(/[\s\-()]/g, ''); if (/^8\d{10}$/.test(t)) t = '+7' + t.slice(1); return /^\+\d{9,15}$/.test(t) ? t : null; };
  const fld = (id, label, type, extra = '') => `<label class="field"><input id="${id}" type="${type}" placeholder=" " autocomplete="${type === 'tel' ? 'tel' : type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}" ${extra}><span>${esc(label)}</span></label>`;
  const err = () => (error ? `<div class="msg err" role="alert">${esc(error)}</div>` : '');
  const btn = (act, label, cls = 'primary') => `<button class="btn ${cls} wide" type="button" data-act="${act}" ${busy ? 'disabled' : ''}>${esc(label)}</button>`;

  function render() {
    const p = cloud.providers;
    let body = '';
    if (step === 'menu') {
      body = `<div class="auth-hero">${MD.mascot('hello', 120)}<h1>Войди в Фин</h1><p>Тогда траты будут на любом телефоне. Без входа данные остаются только здесь.</p></div>
        <div class="auth-btns">
          ${p.google ? `<button class="abtn" data-act="google" ${busy ? 'disabled' : ''}>${GOOGLE}<span>Продолжить с Google</span></button>` : ''}
          ${p.apple ? `<button class="abtn dark" data-act="apple" ${busy ? 'disabled' : ''}>${APPLE}<span>Продолжить с Apple</span></button>` : ''}
          ${p.phone ? `<button class="abtn" data-act="phone" ${busy ? 'disabled' : ''}>${ic('phone')}<span>По номеру телефона</span></button>` : ''}
        </div>${err()}
        ${p.email ? '<button class="auth-skip" type="button" data-act="more">Другие способы</button>' : ''}
        <button class="auth-skip" type="button" data-act="later">Не сейчас</button>
        <p class="auth-foot">Данные видны только тебе.</p>`;
    } else if (step === 'phone') {
      body = `<div class="auth-hero"><h1>Номер телефона</h1><p>Пришлю СМС с кодом.</p></div><form data-form="phone">${fld('auPhone', 'Номер, например +375 29 123-45-67', 'tel', `value="${esc(phone)}"`)}${err()}${btn('phone-send', 'Получить код')}</form>${btn('back', 'Назад', 'ghost')}`;
    } else if (step === 'code') {
      body = `<div class="auth-hero"><h1>Код из СМС</h1><p>${esc(phone)}</p></div><form data-form="code"><label class="field"><input id="auCode" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder=" "><span>Шесть цифр</span></label>${err()}${btn('code-ok', 'Подтвердить')}</form>${btn('phone-send', 'Отправить код ещё раз', 'ghost')}${btn('back', 'Назад', 'ghost')}`;
    } else {
      body = `<div class="auth-hero"><h1>${mode === 'in' ? 'Вход по почте' : 'Новая почта'}</h1><p>${mode === 'in' ? 'Впиши почту и пароль.' : 'Придумай пароль не короче 6 символов.'}</p></div>
        <form data-form="email">${fld('auEmail', 'Почта', 'email', `value="${esc(email)}" autocapitalize="off"`)}${fld('auPw', 'Пароль', 'password')}${err()}${btn('email-go', mode === 'in' ? 'Войти' : 'Создать вход')}</form>
        <button class="auth-skip" type="button" data-act="mode">${mode === 'in' ? 'Первый раз? Создать вход' : 'Уже есть вход? Войти'}</button>
        ${mode === 'in' ? '<button class="auth-skip" type="button" data-act="reset">Забыл пароль</button>' : ''}${btn('back', 'Назад', 'ghost')}`;
    }
    host.innerHTML = `<div class="auth-in">${body}</div>`;
    const f = host.querySelector('input'); if (f && step !== 'menu') setTimeout(() => f.focus({ preventScroll: true }), 60);
  }

  async function run(fn, next) {
    busy = true; error = ''; render();
    try { await fn(); busy = false; if (next) step = next; render(); }
    catch (e) { const m = friendly(e); error = m || ''; busy = false; render(); }
  }
  const val = id => ((host.querySelector('#' + id) || {}).value || '').trim();

  host.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || busy) return;
    const a = b.dataset.act;
    if (a === 'google') run(() => cloud.signInGoogle());
    else if (a === 'apple') run(() => cloud.signInApple());
    else if (a === 'phone') { step = 'phone'; error = ''; render(); }
    else if (a === 'more') { step = 'email'; mode = 'in'; error = ''; render(); }
    else if (a === 'mode') { mode = mode === 'in' ? 'up' : 'in'; error = ''; render(); }
    else if (a === 'back') { step = 'menu'; error = ''; render(); }
    else if (a === 'later') api.hide();
    else if (a === 'phone-send') {
      const n = normPhone(step === 'code' ? phone : val('auPhone')); phone = n || val('auPhone');
      if (!n) { error = 'Не понял номер. Впиши с кодом страны: +375…'; render(); return; }
      run(() => cloud.phoneSend(n), 'code');
    } else if (a === 'code-ok') {
      const c = val('auCode').replace(/\D/g, '');
      if (c.length < 6) { error = 'Код не подошёл. Нужны шесть цифр.'; render(); return; }
      run(() => cloud.phoneConfirm(c));
    } else if (a === 'email-go') {
      email = val('auEmail'); const pw = (host.querySelector('#auPw') || {}).value || '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { error = 'Не понял почту. Проверь адрес.'; render(); return; }
      if (pw.length < 6) { error = 'Пароль короткий. Нужно хотя бы 6 символов.'; render(); return; }
      run(() => (mode === 'in' ? cloud.signInEmail(email, pw) : cloud.signUpEmail(email, pw)));
    } else if (a === 'reset') {
      email = val('auEmail');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { error = 'Впиши почту, и пришлю письмо для нового пароля.'; render(); return; }
      run(async () => { await cloud.resetPassword(email); }).then(() => { if (!error) { error = ''; MD.app && MD.app.toast('Письмо отправлено. Загляни в почту.', null, null, 'happy'); } });
    }
  });
  host.addEventListener('submit', e => { e.preventDefault(); const b = host.querySelector('form [data-act]'); if (b) b.click(); });

  const api = {
    show() { step = 'menu'; error = ''; busy = false; host.hidden = false; render(); },
    hide() { host.hidden = true; }
  };
  MD.authUI = api;
})(window);
