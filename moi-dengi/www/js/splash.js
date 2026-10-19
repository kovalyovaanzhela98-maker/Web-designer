/* Brief branded opening, then continue into the existing three-step onboarding. */
(function () {
  'use strict';
  const el = document.getElementById('splash');
  if (!el) return;
  if (new URLSearchParams(window.location.search).get('splash') === '1') return;
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => {
      el.remove();
      window.dispatchEvent(new Event('fin:splash-finished'));
    }, 260);
  }, 120);
})();
