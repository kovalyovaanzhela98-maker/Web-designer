/* Единый вид кнопок: новые классы из buttons.css навешиваются на уже существующие элементы, в том числе на созданные позже.
   Старые классы остаются в разметке, чтобы работала логика приложения; их прежние стили выключены (см. app.css). */
(function () {
  'use strict';
  const all = (root, sel, fn) => { if (root.matches && root.matches(sel)) fn(root); root.querySelectorAll && root.querySelectorAll(sel).forEach(fn); };
  const CUR = '[data-txcur],[data-qcur],[data-qscur],[data-cur],[data-gcur],[data-pcur],[data-evcur]';
  const TXT = { 'Назад': 1 };
  function skin(root) {
    if (!root || root.nodeType !== 1) return;
    all(root, '.btn', b => {
      const c = b.classList;
      c.add(c.contains('primary') || c.contains('save') ? 'btn--primary' : c.contains('danger') || c.contains('out') ? 'btn--danger' : c.contains('ghost') ? 'btn--text' : 'btn--secondary');
      if (c.contains('wide')) c.add('btn--block');
    });
    all(root, '.btn-bord', b => b.classList.add('btn', 'btn--outline', 'btn--block'));
    all(root, '.link', b => b.classList.add('btn', 'btn--text'));
    all(root, '.ev-gift,.ev-a,.quiz-back,.auth-skip,.tk,.vl-stop,.pl-btn', b => b.classList.add('btn', 'btn--text'));
    all(root, '.tour-btns .tx', b => b.classList.add('btn', 'btn--primary'));
    all(root, '.abtn', b => b.classList.add('btn', 'btn--secondary', 'btn--block'));
    all(root, '.btn.danger-solid', b => b.classList.add('btn--danger'));
    all(root, '.cq', b => b.classList.add('chip'));
    all(root, '.h-ai-chat', b => b.classList.add('btn', 'btn--outline'));
    all(root, '.hdr', h => {
      const back = h.querySelector('[data-back]');
      if (!back) h.classList.add('hdr--main');
      if (back) { back.classList.add('back'); if (!back.querySelector('span')) back.insertAdjacentHTML('beforeend', '<span>Назад</span>'); }
      h.querySelectorAll('.pill-btn').forEach(b => b.classList.add('act'));
      h.querySelectorAll('.title').forEach(t => t.classList.add('ttl'));
    });
    all(root, '.sheet-head .icon-btn,.sheet .icon-btn[data-close]', b => b.classList.add('close'));
    all(root, '.icon-btn.sm:not(.close)', b => b.classList.add('rnd'));
    // сегменты-табы
    all(root, '.stats-view-tabs', t => { t.classList.add('seg'); t.querySelectorAll('button').forEach(b => syncPressed(b)); });
    all(root, '.seg button', b => syncPressed(b));
    all(root, '.chips', c => {
      if (c.querySelector(CUR)) { c.classList.remove('chips'); c.classList.add('seg', 'seg--sm'); c.querySelectorAll('button').forEach(b => { b.classList.remove('chip'); syncPressed(b); }); }
      else c.querySelectorAll('button').forEach(b => syncPressed(b));
    });
    all(root, '.cur-row', c => { c.classList.remove('chips'); c.classList.add('seg', 'seg--sm'); c.querySelectorAll('button').forEach(b => { b.classList.remove('chip'); syncPressed(b); }); });
    all(root, '.date-row', c => { c.classList.add('chips'); c.querySelectorAll('button.chip').forEach(b => syncPressed(b)); });
    all(root, '.day-chips,.chip[aria-checked],.chip[aria-pressed]', n => { if (n.matches('.chip')) syncPressed(n); else n.querySelectorAll('.chip').forEach(syncPressed); });
    // списки и строки
    all(root, '.grp', g => g.classList.add('list'));
    all(root, '.row', r => {
      r.querySelectorAll(':scope > .rw-ic').forEach(i => i.classList.add('rico'));
      r.querySelectorAll(':scope > .rw-t').forEach(t => { t.classList.add('txt'); const b = t.querySelector(':scope > b'), s = t.querySelector(':scope > small'); if (b) b.classList.add('t1'); if (s) s.classList.add('t2'); });
      r.querySelectorAll(':scope > .rw-r').forEach(v => { v.classList.add(v.textContent.trim() ? 'val' : 'chev'); });
    });
    all(root, '.bulkbar button', b => b.classList.add('btn', b.classList.contains('del') ? 'btn--danger' : 'btn--secondary'));
    all(root, '.sw-t', s => s.classList.add('sw'));
    // строка ввода чата
    all(root, '.chat-bar', f => f.classList.add('composer'));
    all(root, '.cb-btn,.cb-mic', b => b.classList.add('rnd'));
    all(root, '.cb-send', b => b.classList.add('rnd', 'rnd--accent'));
  }
  function syncPressed(b) {
    const v = b.getAttribute('aria-checked') ?? b.getAttribute('aria-selected');
    if (v !== null) b.setAttribute('aria-pressed', v);
  }
  function start() {
    skin(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach(skin);
        else if (m.target.matches && m.target.matches('.seg button,.chips button,.chip,.stats-view-tabs button,.date-row button')) syncPressed(m.target);
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-selected'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.MD = window.MD || {}; window.MD.skin = skin;
})();
