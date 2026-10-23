/* Заставка: логотип, слоган и полоска загрузки. При самом первом запуске показывается дольше, потом сразу переходит в знакомство. */
(function () {
  'use strict';
  const el = document.getElementById('splash');
  if (!el) return;
  if (new URLSearchParams(window.location.search).get('splash') === '1') return;
  let first = false;
  try { first = localStorage.getItem('moidengi_intro') !== '1' && !localStorage.getItem('moidengi_v1'); } catch (_) {}
  if (first) el.classList.add('is-first');
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => {
      el.remove();
      window.dispatchEvent(new Event('fin:splash-finished'));
    }, 320);
  }, first ? 1700 : 120);
})();
