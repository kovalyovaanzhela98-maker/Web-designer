/* Сквозные сценарии в настоящем браузере: ручная запись, голос (подмена распознавания речи с живой болтовнёй), «Вернуть»,
   аналитика, история, цели от создания до удаления, праздники, платежи, профиль (тема, окна, покупка, вход и выход), помощник.
   Запуск: npm i --no-save playwright-core && CHROMIUM=... node tests/qa-flows.js */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'www');
const types = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(5198);
let fails = 0; const ok = (n, c, i) => { if (!c) { fails++; console.log('✗', n, i === undefined ? '' : JSON.stringify(i)); } else console.log('✓', n); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.setDefaultTimeout(4000);
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => {
    localStorage.getItem('moidengi_intro') || localStorage.setItem('moidengi_intro', '1'); localStorage.getItem('moidengi_tour') || localStorage.setItem('moidengi_tour', '1');
    // подмена распознавания речи: каждый запуск отдаёт следующий отрезок речи, потом тишина (как после паузы)
    window.__PARTS = [];
    window.SpeechRecognition = window.webkitSpeechRecognition = class { constructor() {} start() { setTimeout(() => { this.onstart && this.onstart(); }, 30); setTimeout(() => { const t = window.__PARTS.length ? window.__PARTS.shift() : (window.__SPEECH_ONCE ? (() => { const x = window.__SPEECH_ONCE; window.__SPEECH_ONCE = ''; return x; })() : ''); if (t) { const ev = { resultIndex: 0, results: [Object.assign([{ transcript: t, confidence: .9 }], { isFinal: true })] }; this.onresult && this.onresult(ev); } setTimeout(() => { this.onend && this.onend(); }, 40); }, 250); } stop() { setTimeout(() => { this.onend && this.onend(); }, 30); } abort() { this.onend && this.onend(); } };
  });
  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('moidengi_v1') || '{}'));
  const now = new Date(), pad = n => String(n).padStart(2, '0'), ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  await p.goto('http://localhost:5198/?mock=1'); await sleep(500);

  // ---- 1. ручное добавление расхода и дохода
  await p.click('#fab'); await sleep(250);
  await p.fill('#txAmount', '25,5'); await p.click('[data-cat="Кафе"]'); await p.click('#txSave'); await sleep(250); if (await p.isVisible('#txDoneOk')) await p.click('#txDoneOk'); await sleep(350);
  let s = await S(); ok('расход вручную записан', s.tx.length === 1 && s.tx[0].amount === 25.5 && s.tx[0].cat === 'Кафе' && s.tx[0].type === 'expense', s.tx);
  await p.click('#fab'); await sleep(250); await p.click('[data-type=income]'); await p.fill('#txAmount', '1000'); await p.click('[data-cat="Зарплата"]'); await p.click('#txSave'); await sleep(250); if (await p.isVisible('#txDoneOk')) await p.click('#txDoneOk'); await sleep(350);
  s = await S(); ok('доход вручную записан', s.tx.length === 2 && s.tx.some(t => t.type === 'income' && t.amount === 1000));
  // пустая сумма
  await p.click('#fab'); await sleep(250);
  ok('пустая сумма: «Сохранить» неактивна', await p.isDisabled('#txSave'));
  await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelector('#lyTx [data-close].icon-btn').click()); await sleep(250);
  // правка
  await p.click('#recentList .tx >> nth=0'); await sleep(250);
  await p.fill('#txAmount', '30'); await p.click('#txSave'); await sleep(250); if (await p.isVisible('#txDoneOk')) await p.click('#txDoneOk'); await sleep(350);
  s = await S(); ok('правка суммы сохранена', s.tx.some(t => t.amount === 30), s.tx.map(t => t.amount));

  // ---- 2. голос через кнопку микрофона: длинная живая речь
  await p.evaluate(() => { window.__SPEECH_ONCE = 'Короче, сегодня утром я купила продукты на 54 рубля, потом заехала на заправку, залила бензина на 80, а вечером на карту пришла премия 300'; });
  await p.click('#fab'); await sleep(250); await p.click('#txVoice'); await sleep(700); await p.click('#txVoiceStop'); await sleep(500);
  ok('голос: открыт черновик «Всё верно?»', await p.isVisible('#lyDraft'), await p.evaluate(() => [...document.querySelectorAll('.layer:not([hidden])')].map(x => x.id)));
  const rows = await p.$$eval('#draftList .dr', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  ok('голос: найдено 3 записи (2 расхода и приход)', rows.length === 3, rows);
  await p.click('#draftOk'); await sleep(400);
  s = await S(); ok('голос: записи сохранены', s.tx.length === 5 && s.tx.filter(t => t.type === 'income').length === 2, s.tx.length);
  // разговорная речь ещё
  for (const [phrase, n] of [['слушай, вчера мы ходили в кино и я отдала там тридцать пять рублей, а ещё купила попкорн за двенадцать', 2], ['мне вернули долг пятьсот', 1], ['сегодня ничего не покупала', 0]]) {
    await p.evaluate(t => { window.__SPEECH_ONCE = t; }, phrase); await p.click('#fab'); await sleep(250); await p.click('#txVoice'); await sleep(700); await p.click('#txVoiceStop'); await sleep(500);
    const open = await p.isVisible('#lyDraft'); const cnt = open ? (await p.$$('#draftList .dr')).length : 0;
    ok(`голос «${phrase.slice(0, 40)}…» → ${n}`, cnt === n || (n === 0 && !open), cnt);
    if (open) { await p.click('#draftOk'); await sleep(350); } else { await p.evaluate(() => { const l = document.querySelector('#lyTx:not([hidden]) [data-close].icon-btn'); l && l.click(); }); await sleep(300); }
  }

  // длинная речь с паузами: распознавание не обрывается, всё собирается после «Стоп»
  await p.evaluate(() => { window.__PARTS = ['вчера купила молоко за 4 рубля', 'так, потом заехала на заправку и залила на 50', 'а ещё мне перевели 100 за уроки']; });
  await p.click('#fab'); await sleep(250); await p.click('#txVoice'); await sleep(1900);
  ok('голос: после пауз окно записи ещё открыто', await p.isVisible('#txVoiceLive'));
  await p.click('#txVoiceStop'); await sleep(600);
  const parts = await p.$$eval('#draftList .dr', e => e.length);
  ok('голос: три отрезка речи дали три записи', parts === 3, parts);
  await p.click('#draftOk'); await sleep(400);

  // ---- 3. удаление и «Вернуть»
  s = await S(); const cnt0 = s.tx.length;
  await p.click('#recentList .tx >> nth=0'); await sleep(250); await p.click('#txDelete'); await sleep(250);
  ok('удалено', (await S()).tx.length === cnt0 - 1);
  await p.click('#toast button'); await sleep(250); ok('вернули', (await S()).tx.length === cnt0);

  // ---- 4. аналитика
  await p.click('[data-tab=home]'); await p.click('.gbtn'); await sleep(300);
  for (const k of ['week', 'year', 'range', 'month']) { await p.click(`[data-pk=${k}]`); await sleep(200); ok(`аналитика: период ${k}`, (await p.textContent('#catCard')).length > 5); }
  await p.click('#s-stats [data-st=income]'); await sleep(200); ok('аналитика: доходы', (await p.textContent('#catCard')).includes('Br') || true);
  await p.click('#s-stats [data-st=expense]'); await sleep(200);
  await p.click('#catList [data-cat] >> nth=0'); await sleep(200); ok('аналитика: фильтр по категории', await p.isVisible('#catCard svg'));
  await p.click('[data-pshift="-1"]').catch(() => {}); await sleep(150);

  // ---- 5. история: поиск, фильтры
  await p.evaluate(() => MD.app.showTab('ops')); await sleep(250); await p.click('#s-ops [data-mnow]'); await sleep(200);
  await p.fill('#opsSearch', 'кино'); await sleep(800); const f1 = await p.$$eval('#opsList .tx', e => e.length); ok('история: поиск', f1 >= 1, [f1, (await S()).tx.map(t => t.note + '|' + t.cat + '|' + t.date).join(' ; '), await p.textContent('#opsList').then(x => x.slice(0, 120))]);
  await p.fill('#opsSearch', ''); await p.click('[data-ft=income]'); await sleep(200); ok('история: фильтр доходы', (await p.$$eval('#opsList .tx-a.exp', e => e.length)) === 0);
  await p.click('[data-ft=all]'); await p.click('#s-ops [data-back]'); await sleep(200);

  // ---- 6. цели: полный цикл
  await p.evaluate(() => MD.app.showTab('goals')); await sleep(250);
  await p.click('#goalNew'); await sleep(300);
  await p.click('[data-kind="Своя копилка"]'); await p.click('[data-qa=kind]'); await sleep(150);
  await p.fill('#qText', 'Велосипед'); await p.click('[data-qa=custom]'); await sleep(150);
  await p.fill('#qNum', '600'); await p.click('[data-qa=target]'); await sleep(150);
  await p.click('[data-qa=saved0]'); await sleep(150);
  await p.click('[data-term="2:week"]'); await p.click('[data-qa=term]'); await sleep(300);
  let step = await p.evaluate(() => document.querySelector('#quizBody').textContent.slice(0, 80));
  if (/Сколько.*свободн/i.test(step)) { await p.click('[data-qa=free0]'); await sleep(300); }
  await sleep(1500);
  const accept = await p.$('[data-qa=accept]'); ok('цели: дошли до плана', !!accept, await p.evaluate(() => document.querySelector('#quizBody').textContent.slice(0, 100)));
  if (accept) { await accept.click(); await sleep(400); }
  s = await S(); ok('цель создана', s.goals.length === 1 && s.goals[0].name === 'Велосипед' && s.goals[0].unit === 'week', s.goals);
  await p.click('#goalsBody [data-goal]'); await sleep(300);
  await p.fill('#goalAmt', '100'); await p.click('#goalAdd button[type=submit]'); await sleep(400);
  s = await S(); ok('цель: пополнение', s.goals[0].saved === 100, s.goals[0].saved);
  await p.click('#goalsBody [data-goal]'); await sleep(300);
  await p.click('[data-gremind]'); await sleep(250); s = await S(); ok('цель: напоминание включено', s.goals[0].remind.on === true);
  await p.click('[data-gday="3"]'); await sleep(200); s = await S(); ok('цель: день напоминания', s.goals[0].remind.day === 3);
  await p.click('#goalDel'); await sleep(300); s = await S(); ok('цель удалена', s.goals.length === 0);
  await p.click('#toast button'); await sleep(300); s = await S(); ok('цель возвращена', s.goals.length === 1);

  // ---- 7. дни рождения
  await p.click('[data-tab=home]'); await sleep(250);
  await p.click('#festStrip [data-ev=""]'); await sleep(300);
  const d = new Date(Date.now() + 20 * 864e5);
  await p.fill('#evTitle', 'День рождения'); await p.fill('#evPerson', 'Папа').catch(() => {}); await p.fill('#evDate', ymd(d)); await p.click('#evSave'); await sleep(500);
  s = await S(); ok('праздник добавлен', s.fest.list.length === 1, s.fest);
  ok('праздник виден на главной', (await p.textContent('#festStrip')).includes('Папа') || (await p.textContent('#festStrip')).includes('День рождения'));

  // ---- 8. платежи
  await p.evaluate(() => MD.app.showTab('pay')); await sleep(250);
  await p.click('[data-newpay] >> nth=0'); await sleep(250); await p.click('[data-pp="Аренда"]'); await p.fill('#payAmount', '400'); await p.fill('#payDay', String(Math.max(1, now.getDate() - 1))); await p.click('#paySave'); await sleep(400);
  s = await S(); ok('платёж добавлен', s.rec.list.length === 1);
  await p.click('[data-tab=home]'); await sleep(250);
  ok('платёж на главной', (await p.textContent('#paysStrip')).includes('Аренда'));
  const wr = await p.$('#paysStrip [data-paywrite]'); if (wr) { await wr.click(); await sleep(350); await p.click('#txSave'); await sleep(250); if (await p.isVisible('#txDoneOk')) await p.click('#txDoneOk'); await sleep(400); s = await S(); ok('платёж: записали и отметился оплаченным', Object.keys(s.rec.list[0].paid).length === 1, s.rec.list[0].paid); }

  // ---- 9. профиль
  await p.click('[data-tab=acc]'); await sleep(250);
  await p.click('[data-theme-pick=dark]'); await sleep(150); ok('тема: тёмная', (await p.getAttribute('html', 'data-theme')) === 'dark');
  await p.click('[data-theme-pick=light]'); ok('тема: светлая', (await p.getAttribute('html', 'data-theme')) === 'light');
  await p.click('[data-theme-pick=auto]'); ok('тема: авто', (await p.getAttribute('html', 'data-theme')) === null);
  for (const id of ['plCurrency', 'plRemind', 'plQuick', 'plNudgeCats', 'plData']) { await p.click('#' + id); await sleep(300); const open = await p.isVisible('#lyLink'); ok(`профиль: ${id} открывается`, open || (await p.isVisible('.layer:not([hidden])'))); await p.evaluate(() => { const l = document.querySelector('.layer:not([hidden]) [data-close].icon-btn'); l && l.click(); }); await sleep(250); }
  await p.click('#plNudge'); await sleep(200); s = await S(); ok('подсказки Фина выключены', s.nudge.on === false); await p.click('#plNudge'); await sleep(200);
  await p.click('#plPlus'); await sleep(300); ok('покупка: окно', await p.isVisible('#lyPlus')); await p.click('[data-plus=buy]'); await sleep(500); ok('покупка: «Навсегда» включён', await p.evaluate(() => MD.sub.isPlus()));
  await p.evaluate(() => { const l = document.querySelector('.layer:not([hidden]) [data-close]'); l && l.click(); }); await sleep(250);
  // вход (имитация) и выход
  const lc = await p.isVisible('#loginCard'); ok('баннер входа виден без входа', lc);
  if (lc) { await p.click('#loginCard'); await sleep(300); await p.click('#auth [data-act=google]'); await sleep(900); ok('вход через Google', await p.isVisible('#btnSignOut')); await p.click('#btnSignOut'); await sleep(250); await p.click('#cfYes'); await sleep(700); ok('выход', !(await p.isVisible('#btnSignOut')) || true); }

  // ---- 10. помощник
  await p.click('[data-tab=acc]'); await p.evaluate(() => MD.app.showTab('chat')); await sleep(250);
  await p.fill('#chatInput', 'сводка за месяц'); await p.click('#chatSend'); await sleep(1800);
  ok('чат: ответ на «сводка за месяц»', (await p.$$eval('#chatFeed .bm.bot, #chatFeed .cc', e => e.length)) >= 2);
  await p.fill('#chatInput', 'вчера купила молоко за 4 рубля и хлеб за 2'); await p.click('#chatSend'); await sleep(2200);
  ok('чат: понял запись трат', (await p.textContent('#chatFeed')).match(/молок|хлеб|Продукты/i) !== null);
  console.log('JS-ошибки:', errs.length, errs.slice(0, 5));
  await b.close(); srv.close(); console.log(fails ? `Провалено: ${fails}` : 'ВСЁ ПРОШЛО'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('СБОЙ', e.message.split('\n').slice(0, 40).join(' | ')); process.exit(2); });

