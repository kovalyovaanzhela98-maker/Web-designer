/* Сквозная проверка в настоящем браузере (Chromium): знакомство, первая запись до входа, «Всё верно?», удаление с «Отмена»,
   обязательные платежи за три тапа, отметка оплаты, предел в 10 платежей и покупка «Навсегда».
   Не входит в `npm test`, потому что нужен Playwright:
     npm i --no-save playwright-core && node tests/e2e.js
   Путь к Chromium: переменная CHROMIUM (по умолчанию из PLAYWRIGHT_BROWSERS_PATH). */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'www');
const types = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(5199);
const executablePath = process.env.CHROMIUM || undefined;
let fails = 0;
const ok = (name, c, info) => { if (!c) { fails++; console.log('✗', name, info || ''); } else console.log('✓', name); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  const openLayers = () => page.$$eval('.layer:not([hidden])', l => l.length);
  const vis = sel => page.isVisible(sel);

  // ---- 1. знакомство
  await page.goto('http://localhost:5199/?mock=1');
  await sleep(400);
  ok('знакомство: «Пропустить» видно на 1 экране', await vis('[data-skip]'));
  for (let i = 0; i < 2; i++) { ok(`знакомство ${i + 1}: «Далее» и «Пропустить» видны`, (await vis('[data-next]')) && (await vis('[data-skip]'))); await page.click('[data-next]'); await sleep(150); }
  ok('знакомство 3: «Далее» и «Пропустить» видны', (await vis('[data-next]')) && (await vis('[data-skip]')));
  ok('знакомство: ровно 3 экрана', (await page.$$eval('.intro-t', e => e.length)) === 3);
  await page.click('[data-skip]'); await sleep(900);
  ok('после знакомства Фин показывает тур по экрану', await vis('.tour'));
  await page.click('[data-tour=skip]'); await sleep(200);
  ok('после пропуска: вход не требуется, видна главная', await vis('#s-home') && !(await vis('#auth')));
  ok('главная: пустое состояние без лишней кнопки', (await page.textContent('#recentList')).includes('Пока пусто') && !(await vis('#recentList [data-add]')));
  ok('на главной нет голосового ввода (микрофон только в «+»)', !(await page.$('#s-home [data-ic=mic], #qaMic')));

  // ---- 2. добавление: 4 действия, кнопка активна только при сумме и категории
  await page.click('#fab'); await sleep(200);
  ok('добавление: «Сохранить» неактивна', await page.isDisabled('#txSave'));
  await page.fill('#txAmount', '12');
  ok('только сумма: всё ещё неактивна', await page.isDisabled('#txSave'));
  await page.click('[data-cat="Транспорт"]');
  ok('сумма + категория: активна', !(await page.isDisabled('#txSave')));
  ok('один слой открыт', (await openLayers()) === 1);
  await page.click('#txSave'); await sleep(300);
  ok('после записи: «Записано» и кнопки «Ещё» на то же число', (await page.textContent('#txDone')).includes('Записано') && await vis('#moreExp') && await vis('#moreInc'));
  await page.click('#txDoneOk'); await sleep(250);
  ok('вернулись на главную, запись сверху', (await page.textContent('#recentList')).includes('Транспорт') && await vis('#s-home'));
  // первая запись: через пару секунд предложение войти (mock)
  await sleep(2000);
  ok('после первой записи предложили войти', await vis('#auth'));
  ok('вход: Google, Apple, телефон', (await page.$$eval('#auth [data-act=google], #auth [data-act=apple], #auth [data-act=phone]', e => e.length)) === 3);
  ok('вход: почта за «Другие способы»', await vis('#auth [data-act=more]') && !(await page.$('#auth #auEmail')));
  await page.click('#auth [data-act=later]'); await sleep(200);
  ok('«Не сейчас»: приложение работает как гость', !(await vis('#auth')) && (await page.textContent('#recentList')).includes('Транспорт'));
  // вход через Google с данными гостя: ничего не теряем
  await page.click('[data-tab=acc]'); await page.click('#loginCard'); await sleep(150);
  await page.click('#auth [data-act=google]'); await sleep(900);
  await page.click('[data-tab=home]'); await sleep(200);
  ok('после входа данные гостя на месте', (await page.textContent('#recentList')).includes('Транспорт'));

  // ---- 3. быстрая запись: «Всё верно?»
  await page.evaluate(() => MD.app.spoken('вчера такси 12 и кофе 6,5', false)); await sleep(250);
  ok('быстрая запись: открыт «Всё верно?»', await vis('#lyDraft') && (await page.textContent('#draftTitle')).includes('Всё верно'));
  ok('«Всё верно?»: две строки', (await page.$$eval('#draftList .dr', e => e.length)) === 2);
  await page.click('#draftList [data-edit="1"]'); await sleep(350);
  ok('правка строки: открыто одно окно (не поверх другого)', (await openLayers()) === 1 && await vis('#lyTx'));
  await page.fill('#txAmount', '7'); await page.click('#txSave'); await sleep(250); if (await page.isVisible('#txDoneOk')) await page.click('#txDoneOk'); await sleep(350);
  ok('после правки вернулись в «Всё верно?»', await vis('#lyDraft') && (await page.textContent('#draftList')).includes('7,00'));
  await page.click('#draftOk'); await sleep(300);
  ok('сохранено: тост «Записано: 2»', (await page.textContent('#toast')).includes('Записано: 2'));
  // непонятная фраза: без вины
  await page.evaluate(() => MD.app.spoken('абвгд', false)); await sleep(200);
  ok('не понял: подсказка с примером, без слова «ошибка»', /вчера такси 12/.test(await page.textContent('#toast')) && !/ошибк/i.test(await page.textContent('#toast')));

  // ---- 4. удаление с возвратом ≥ 5 секунд
  await sleep(4200);
  await page.click('#recentList .tx >> nth=0'); await sleep(250);
  await page.click('#txDelete'); await sleep(250);
  ok('удалено: тост «Отмена»', (await page.textContent('#toast')).includes('Отмена'));
  ok('удаление: окно закрыто, диалогов нет', (await openLayers()) === 0);
  await sleep(4800);
  ok('«Отмена» живёт больше 5 секунд', await vis('#toast'));
  await sleep(1600);
  ok('и пропадает', !(await vis('#toast')));
  await page.click('#recentList .tx >> nth=0');   // восстановим сценарий: удалим и вернём
  await sleep(200); await page.click('#txDelete'); await sleep(200);
  const before = await page.$$eval('#recentList .tx', e => e.length);
  await page.click('#toast button'); await sleep(250);
  ok('«Отмена» возвращает запись', (await page.$$eval('#recentList .tx', e => e.length)) === before + 1);

  // ---- 5. обязательные платежи: три тапа
  await page.click('[data-tab=acc]'); await sleep(150);
  await page.evaluate(() => MD.app.showTab('pay')); await sleep(200);
  ok('экран платежей пуст с призывом', (await page.textContent('#payBody')).includes('Пока пусто') && await vis('#payBody [data-newpay]'));
  await page.click('[data-newpay] >> nth=0');            // тап 1
  await sleep(200);
  await page.click('[data-pp="Аренда"]');                // тап 2
  await page.fill('#payAmount', '500');                  // ввод
  ok('напоминание по умолчанию выключено', (await page.getAttribute('[data-pr="off"]', 'aria-checked')) === 'true');
  const d = new Date(); d.setDate(d.getDate() + 2);
  await page.fill('#payDay', String(d.getDate()));
  await page.click('#paySave'); await sleep(300);        // тап 3
  ok('платёж создан за три тапа', (await page.textContent('#toast')).includes('Платёж добавлен') && (await page.textContent('#payBody')).includes('Аренда'));
  ok('в списке отметка «Ожидает»', (await page.textContent('#payBody')).includes('Ожидает'));
  await page.click('#s-pay [data-back]'); await page.click('[data-tab=home]'); await sleep(200);
  const plaque = await page.textContent('#paysStrip');
  ok('карточка на главной: «Аренда 500,00 Br через 2 дня»', /Аренда\s*500,00\s*\S+\s*через 2 дня/.test(plaque), plaque);
  await page.click('#paysStrip .pc-main'); await sleep(200);
  ok('тап по плашке открывает список платежей', await vis('#s-pay'));
  // совпадение операции: категория Дом, сумма 500, дата +1 день
  await page.click('[data-tab=home]'); await sleep(100);
  await page.click('#fab'); await sleep(200);
  await page.fill('#txAmount', '500'); await page.click('[data-cat="Дом"]');
  await page.click('#dToday'); await page.click('#txSave'); await sleep(250); if (await page.isVisible('#txDoneOk')) await page.click('#txDoneOk'); await sleep(300);
  const t = await page.textContent('#toast');
  ok('Фин предлагает отметить оплату аренды', /Это оплата «Аренда»\?/.test(t) && t.includes('Отметить'), t);
  await page.click('#toast button'); await sleep(250);
  ok('одно нажатие: платёж закрыт', (await page.textContent('#toast')).includes('Отмечено'));
  await page.click('[data-tab=acc]'); await page.evaluate(() => MD.app.showTab('pay')); await sleep(200);
  ok('в списке «Оплачено»', (await page.textContent('#payBody')).includes('Оплачено'));
  // правка: тап по платежу
  await page.click('[data-payedit]'); await sleep(200);
  ok('тап по платежу открывает правку', await vis('#lyPay') && (await page.inputValue('#payName')) === 'Аренда');
  await page.fill('#payAmount', '510'); await page.click('#paySave'); await sleep(250);
  ok('сумма изменилась, отметка осталась', (await page.textContent('#payBody')).includes('510,00') && (await page.textContent('#payBody')).includes('Оплачено'));
  // 10 платежей, 11-й — предложение покупки навсегда
  for (let i = 0; i < 9; i++) {
    await page.click('[data-newpay] >> nth=0'); await sleep(120);
    await page.fill('#payName', 'Платёж ' + i); await page.fill('#payAmount', '10'); await page.click('[data-pcat="Другое"]'); await page.click('#paySave'); await sleep(180);
  }
  ok('в бесплатной версии 10 платежей', (await page.$$eval('#payBody .pay-row', e => e.length)) === 10);
  await page.click('[data-newpay] >> nth=0'); await sleep(300);
  ok('11-й платёж: открылось окно покупки навсегда', await vis('#lyPlus') && (await page.textContent('#plusBody')).includes('Больше десяти платежей'));
  const plus = await page.textContent('#plusBody');
  ok('покупка: без подписки и без месяцев', !/в месяц|месяц|trial|пробн|автоматически/i.test(plus) && /навсегда/i.test(plus), plus);
  ok('одно окно (не поверх другого)', (await openLayers()) === 1);
  await page.click('[data-plus=buy]'); await sleep(600);
  ok('после покупки открылась форма нового платежа', await vis('#lyPay'));

  console.log('ERRORS', JSON.stringify(errs));
  console.log(fails ? `\nПровалено: ${fails}` : '\nВсё прошло');
  await b.close(); srv.close(); if (fails) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
