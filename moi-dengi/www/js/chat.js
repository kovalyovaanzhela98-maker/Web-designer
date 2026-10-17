/* Экран «Спросить Фина»: переписка, голос, чеки и выписки.
   Ответы считает MD.brain по правилам прямо на телефоне. Нейросетей и внешних сервисов нет. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const KEY = 'fin_chat';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let app = null, msgs = [], quick = [], last = null, busy = false, started = false;

  const load = () => { try { msgs = (JSON.parse(localStorage.getItem(KEY) || '[]') || []).filter(m => m.k !== 'draft' || m.done); } catch (_) { msgs = []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(msgs.filter(m => m.k !== 'typing' && m.k !== 'progress').slice(-40))); } catch (_) {} };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const M = n => `${app.fmt(n)} ${app.ctx().sym}`;

  /* ---------- Рисуем ---------- */
  const row = (r, extra = '') => `<div class="cc-row"><span class="l">${r.color ? `<i class="d" style="background:${r.color}"></i>` : ''}<span>${esc(r.l)}</span></span><b class="${r.cls || ''}">${esc(r.v)}</b></div>${r.pct != null && r.color ? `<div class="cc-bar"><i style="--c:${r.color};width:${Math.max(2, r.pct)}%"></i></div>` : ''}${extra}`;
  function draftRows(items) {
    const shown = items.slice(0, 6);
    const inc = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0), exp = items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
    return shown.map(i => `<div class="cc-row"><span class="l"><i class="d" style="background:${catColor(i)}"></i><span>${esc(i.cat === 'Другое' && i.note ? i.note : i.cat)} · ${esc(i.date.slice(8))}.${esc(i.date.slice(5, 7))}</span></span><b class="${i.type === 'income' ? 'i' : 'e'}">${i.type === 'income' ? '+' : '−'}${esc(M(i.amount))}</b></div>`).join('') +
      (items.length > shown.length ? `<div class="cc-row"><span class="l"><span>и ещё ${items.length - shown.length}</span></span></div>` : '') +
      (items.length > 1 ? `<div class="cc-row"><span class="l"><span>Итого</span></span><b>${inc ? `<span class="i">+${esc(M(inc))}</span> ` : ''}${exp ? `<span class="e">−${esc(M(exp))}</span>` : ''}</b></div>` : '');
  }
  const catColor = i => { const c = MD.CATS[i.type].find(x => x[0] === i.cat); return c ? c[2] : '#94A3B8'; };

  function html(m) {
    if (m.k === 'text') return `<div class="bm ${m.r}">${m.html}</div>`;
    if (m.k === 'file') return `<div class="bm me file">${app.icon(m.icon || 'file')}<span>${esc(m.name)}</span></div>`;
    if (m.k === 'typing') return `<div class="bm bot typing" aria-label="Фин печатает"><i></i><i></i><i></i></div>`;
    if (m.k === 'progress') return `<div class="bm bot">${esc(m.text)}</div>`;
    if (m.k === 'card') return `<div class="cc"><h4>${esc(m.title)}</h4>${m.sub ? `<p class="cc-s">${esc(m.sub)}</p>` : ''}${m.rows.map(r => row(r, r.sub ? `<div class="cc-s" style="margin:-4px 0 6px">${esc(r.sub)}</div>` : '')).join('')}</div>`;
    if (m.k === 'action') return `<div class="cc-act"><button class="btn soft" type="button" data-act="${esc(m.kind)}">${esc(m.label)}</button></div>`;
    if (m.k === 'draft') {
      if (m.done) return `<div class="cc done"><h4>${esc(m.intro)}</h4>${draftRows(m.items)}<p class="cc-s" style="margin:8px 0 0">${m.done === 'saved' ? 'Сохранено' : 'Отменено'}</p></div>`;
      return `<div class="cc" data-draft="${m.id}"><h4>${esc(m.intro)}</h4>${m.note ? `<p class="cc-s">${esc(m.note)}</p>` : ''}${draftRows(m.items)}<div class="cc-act"><button class="btn ghost" type="button" data-dr="no">Отмена</button><button class="btn primary" type="button" data-dr="ok">${m.items.length > 1 ? `Сохранить всё · ${m.items.length}` : 'Сохранить'}</button></div></div>`;
    }
    return '';
  }

  function render(noScroll) {
    const feed = $('#chatFeed'); if (!feed) return;
    $('#chatAv').innerHTML = MD.mascot('hello', 46);
    feed.innerHTML = msgs.map(html).join('');
    $('#chatQuick').innerHTML = quick.map(q => `<button class="cq" type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('');
    if (!noScroll) setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 30);
  }

  function push(m) { m.id = m.id || uid(); msgs.push(m); save(); render(); return m; }
  function bot(htmlStr) { return push({ k: 'text', r: 'bot', html: htmlStr }); }
  function drop(m) { msgs = msgs.filter(x => x !== m); }

  function greet() {
    if (msgs.length) return;
    msgs.push({ k: 'text', r: 'bot', html: 'Привет! Я Фин.<small>Спроси про траты или скажи, что записать.</small>', id: uid() });
    quick = ['Сводка за месяц', 'Куда уходят деньги', 'Сколько можно тратить в день', 'Что ты умеешь'];
  }

  /* ---------- Диалог ---------- */
  async function send(text) {
    text = String(text || '').trim(); if (!text || busy) return;
    busy = true; quick = [];
    push({ k: 'text', r: 'me', html: esc(text) });
    $('#chatInput').value = ''; fit();
    const t = push({ k: 'typing' });
    const started = Date.now();
    let r = MD.brain.reply(text, Object.assign(app.ctx(), { last }));
    await new Promise(res => setTimeout(res, Math.max(0, 450 - (Date.now() - started))));
    drop(t);
    last = r.last || last;
    r.blocks.forEach(b => {
      if (b.t === 'text') push({ k: 'text', r: 'bot', html: b.html });
      else if (b.t === 'card') push({ k: 'card', title: b.title, sub: b.sub, rows: b.rows });
      else if (b.t === 'draft') push({ k: 'draft', items: b.items, intro: b.intro });
      else if (b.t === 'action') push({ k: 'action', kind: b.kind, label: b.label });
    });
    quick = r.quick || [];
    render();
    busy = false;
  }

  /* ---------- Чек и выписка ---------- */
  const loadScript = src => new Promise((res, rej) => {
    if ($(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load')); document.head.appendChild(s);
  });
  async function downscale(file, max) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (_) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
    const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.filter = 'grayscale(1) contrast(1.25)'; g.drawImage(bmp, 0, 0, c.width, c.height);
    return c;
  }
  async function ocr(file, onProgress) {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
    const img = await downscale(file, 1800);
    const worker = await root.Tesseract.createWorker(['rus', 'eng'], 1, { logger: m => { if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100)); } });
    try { const { data } = await worker.recognize(img); return data.text || ''; } finally { try { await worker.terminate(); } catch (_) {} }
  }
  async function pdfText(file) {
    const V = '3.11.174', base = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${V}/`;
    await loadScript(base + 'pdf.min.js');
    root.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
    const doc = await root.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const out = [];
    for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      const lines = [];
      tc.items.forEach(it => { if (!it.str || !it.str.trim()) return; const y = Math.round(it.transform[5]); let ln = lines.find(l => Math.abs(l.y - y) <= 2); if (!ln) { ln = { y, parts: [] }; lines.push(ln); } ln.parts.push({ x: it.transform[4], s: it.str }); });
      lines.sort((a, b) => b.y - a.y).forEach(l => out.push(l.parts.sort((a, b) => a.x - b.x).map(x => x.s).join(' ')));
    }
    return out.join('\n');
  }

  const offline = e => `Не получилось: ${e && e.message === 'load' ? 'нужен интернет, чтобы загрузить распознавание (один раз)' : 'файл не читается'}. Попробуй ещё раз.`;

  async function onReceipt(file) {
    if (!file) return;
    push({ k: 'file', name: file.name || 'Фото чека', icon: 'camera' });
    const p = push({ k: 'progress', text: 'Читаю чек…' });
    try {
      const text = await ocr(file, n => { p.text = `Читаю чек… ${n}%`; render(true); });
      drop(p);
      const r = MD.importers.parseReceiptText(text, { today: new Date() });
      if (!r.ok) { render(); bot('Не нашёл сумму на фото.<small>Сфотографируй чек ровнее и при хорошем свете, чтобы была видна строка «Итого».</small>'); quick = ['Что ты умеешь']; render(); return; }
      push({ k: 'draft', items: [r.item], intro: 'Нашёл на чеке', note: r.item.guessedDate ? 'Дату не увидел, поставил сегодняшнюю. Проверь перед сохранением.' : 'Проверь и сохрани.' });
    } catch (e) { drop(p); bot(esc(offline(e))); }
  }

  async function onStatement(file) {
    if (!file) return;
    push({ k: 'file', name: file.name, icon: 'file' });
    const p = push({ k: 'progress', text: 'Читаю выписку…' });
    try {
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      let res;
      if (isPdf) res = MD.importers.parseStatementLines(await pdfText(file), { today: new Date() });
      else { const t = await file.text(); res = MD.importers.parseStatementCSV(t, { today: new Date() }); if (!res.items.length) res = MD.importers.parseStatementLines(t, { today: new Date() }); }
      drop(p);
      const d = MD.importers.dedupe(res.items.slice(0, 500), app.state.tx);
      if (!d.items.length) {
        bot(res.items.length ? `Все операции из файла уже записаны (${d.duplicates}).` : 'Не нашёл операций.<small>Нужна выписка из интернет-банка в формате CSV или PDF: с датой, суммой и описанием.</small>');
        return;
      }
      push({ k: 'draft', items: d.items, intro: `Нашёл операций: ${d.items.length}`, note: `${d.duplicates ? `Уже записанные пропустил: ${d.duplicates}. ` : ''}Проверь суммы со знаком: расходы и доходы определены по описанию.` });
    } catch (e) { drop(p); bot(esc(offline(e))); }
  }

  /* ---------- Голос ---------- */
  function micStart() {
    if (MD.voice.active) return;
    if (!MD.voice.supported()) { bot(esc(MD.voiceMessage('unsupported'))); return; }
    const rec = $('#chatRec'), txt = $('#chatRecText');
    $('#chatForm').hidden = true; rec.hidden = false; txt.textContent = 'Включаю микрофон…';
    const done = () => { rec.hidden = true; $('#chatForm').hidden = false; };
    MD.voice.start({
      onStart: () => { txt.textContent = 'Говори, я записываю'; app.buzz(12); },
      onPartial: t => { txt.textContent = t; },
      onEnd: t => { done(); send(t); },
      onError: code => { done(); bot(esc(MD.voiceMessage(code))); }
    });
  }

  /* ---------- Поле ввода ---------- */
  function fit() {
    const t = $('#chatInput'); t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px';
    const has = !!t.value.trim();
    $('#chatSend').hidden = !has; $('#chatMic').hidden = has;
  }

  function openAttach() {
    const plus = MD.sub.isPlus();
    $$('#lyAttach .row').forEach(b => { $('.rw-r', b).innerHTML = plus ? app.icon('right') : `<span class="badge-plus">${app.icon('crown')}Навсегда</span>`; });
    app.openLayer($('#lyAttach'));
  }

  function init(a) {
    if (started) return; started = true; app = a;
    load(); greet(); render(true);
    $('#chatForm').addEventListener('submit', e => { e.preventDefault(); send($('#chatInput').value); });
    $('#chatInput').addEventListener('input', fit);
    $('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send($('#chatInput').value); } });
    $('#chatMic').addEventListener('click', micStart);
    $('#chatRecStop').addEventListener('click', () => MD.voice.stop());
    $('#chatAttach').addEventListener('click', openAttach);
    $('#chatQuick').addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (q) send(q.dataset.q); });
    $('#chatFeed').addEventListener('click', e => {
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.act === 'newgoal') { app.showTab('goals'); setTimeout(() => app.openQuiz(), 150); return; }
      const dr = e.target.closest('[data-dr]'); if (!dr) return;
      const card = dr.closest('[data-draft]'), m = msgs.find(x => x.id === card.dataset.draft); if (!m || m.done) return;
      if (dr.dataset.dr === 'ok') {
        const first = !app.state.tx.length;
        const n = app.addTx(m.items); m.done = 'saved'; save(); render(true);
        bot(`Записал: <em>${n}</em>.<small>Баланс и аналитика обновились.</small>`);
        quick = ['Сводка за месяц', 'Куда уходят деньги']; render();
        if (first || n >= 5) app.confetti();
      } else { m.done = 'no'; save(); render(true); bot('Хорошо, не записываю.'); }
    });
    $('#chatClear').addEventListener('click', async () => {
      if (!msgs.length) return;
      if (!(await app.confirmDlg('Очистить переписку?', 'Записи и цели не пострадают.', 'Очистить'))) return;
      msgs = []; last = null; greet(); save(); render();
    });
    $('#lyAttach').addEventListener('click', e => {
      const b = e.target.closest('[data-attach]'); if (!b) return;
      const kind = b.dataset.attach, id = kind === 'camera' ? '#fileCamera' : kind === 'gallery' ? '#fileGallery' : '#fileStmt';
      app.closeLayer($('#lyAttach'));
      MD.sub.gate('receipt', () => $(id).click());
    });
    ['#fileCamera', '#fileGallery'].forEach(id => $(id).addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) onReceipt(f); }));
    $('#fileStmt').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) onStatement(f); });
    fit();
  }

  MD.chat = { init, render, send };
  if (MD.app) init(MD.app);
})(typeof window !== 'undefined' ? window : globalThis);
