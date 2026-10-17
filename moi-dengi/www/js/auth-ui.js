/* Экран входа «Фин»: Google и Apple (iCloud). Телефон и почту можно привязать позже в «Профиле».
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

  let busy = false, error = '';

  function friendly(e) {
    const l = (((e && e.code) || '') + ' ' + ((e && e.message) || '')).toLowerCase();
    if (/12501|cancel|popup-closed|user-cancelled|canceled/.test(l)) return null;
    if (/network|unavailable|timeout|interrupted|unreachable/.test(l)) return 'Нет сети. Проверь интернет и попробуй снова.';
    if (/too-many-requests|quota|blocked/.test(l)) return 'Слишком много попыток. Подожди немного и повтори.';
    if (/developer_error|10:|sha|api key|configuration|not-allowed|operation-not/.test(l)) return 'Этот способ пока недоступен. Выбери другой.';
    return 'Не получилось войти. Попробуй ещё раз.';
  }

  function render() {
    const p = cloud.providers;
    host.classList.add('auth--menu');
    host.innerHTML = `<div class="auth-art" style="background-image:url(img/onboard/2.jpg)" aria-hidden="true"></div>
    <div class="auth-panel">
      <h1>Войди в Фин</h1>
      <p class="auth-lead">Войди, чтобы траты были на любом телефоне.</p>
      <div class="auth-btns">
        ${p.google ? `<button class="abtn light ${busy ? 'loading' : ''}" data-act="google" ${busy ? 'disabled' : ''}>${GOOGLE}<span>Продолжить с Google</span></button>` : ''}
        ${p.apple ? `<button class="abtn dark ${busy ? 'loading' : ''}" data-act="apple" ${busy ? 'disabled' : ''}>${APPLE}<span>Продолжить с Apple</span></button>` : ''}
      </div>
      ${error ? `<div class="msg err" role="alert">${esc(error)}</div>` : ''}
      <p class="auth-foot">Данные видны только тебе.</p>
    </div>`;
  }

  async function run(fn) {
    busy = true; error = ''; render();
    try { await fn(); busy = false; render(); }
    catch (e) { const m = friendly(e); error = m || ''; busy = false; render(); }
  }

  host.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || busy) return;
    if (b.dataset.act === 'google') run(() => cloud.signInGoogle());
    else if (b.dataset.act === 'apple') run(() => cloud.signInApple());
  });

  MD.authUI = {
    show() { error = ''; busy = false; host.hidden = false; render(); },
    hide() { host.hidden = true; }
  };
})(window);
