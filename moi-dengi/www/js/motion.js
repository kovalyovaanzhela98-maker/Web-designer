/* Движение: каскад и рисование графиков на входе в экран, общий переход «баланс → анализ», отклик на касание на iOS.
   Ничего не считает и не перерисовывает: только добавляет класс на 900 мс и вызывает системный View Transition, если он есть. */
(function () {
  'use strict';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers = new WeakMap();

  /* Экран стал видимым: на 900 мс включается каскад списков и рисование графика */
  function enter(s) {
    if (reduced()) return;
    s.classList.remove('m-enter'); void s.offsetWidth; s.classList.add('m-enter');
    clearTimeout(timers.get(s));
    timers.set(s, setTimeout(() => s.classList.remove("m-enter"), 900));
  }
  new MutationObserver(list => {
    for (const m of list) { const s = m.target; if (s.classList && s.classList.contains('screen') && !s.hidden) enter(s); }
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  /* iOS включает :active только при наличии обработчика касаний */
  document.addEventListener('touchstart', () => {}, { passive: true });

  /* Тап по плашке баланса: маленький график разворачивается в экран анализа (общий элемент) */
  let pass = false;
  document.addEventListener('click', e => {
    if (pass || !document.startViewTransition || reduced()) return;
    const bal = e.target.closest && e.target.closest('#s-home .bal');
    if (!bal || e.target.closest('#balInfo, #balNote, [data-go]')) return;
    e.stopPropagation(); e.preventDefault();
    const from = bal.querySelector('#balanceTrend') || bal;
    from.style.viewTransitionName = 'm-bal';
    const t = document.startViewTransition(() => {
      pass = true; bal.click(); pass = false;
      from.style.viewTransitionName = '';
      const to = document.querySelector('#s-stats .flow-svg') || document.querySelector('#s-stats .curve-box');
      if (to) to.style.viewTransitionName = 'm-bal';
    });
    const clear = () => { from.style.viewTransitionName = ''; document.querySelectorAll('#s-stats [style*="m-bal"]').forEach(n => { n.style.viewTransitionName = ''; }); };
    t.finished.then(clear, clear);
  }, true);
})();
