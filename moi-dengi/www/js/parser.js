/* Помощник «Фин»: разбор свободной фразы на операции — прямо на телефоне, без интернета и без ключей.
   MD.parseNotes(text, { today: Date, accounts: [{id, name, last4}] }) → [{ type, amount, cat, acc, date, note }]
   Понимает: «кофе 6 и такси 12», «вчера продукты 48 рублей с Visa», «в пятницу пришла зарплата 2 тысячи»,
   числа словами, даты («15 октября», «15.10»), «позавчера», «3 дня назад», несколько трат в одной фразе. */
(function (root) {
  'use strict';

  /* ---------- Словари ---------- */
  const EXPENSE = [
    ['Продукты', ['продукт', 'магазин', 'супермаркет', 'гипермаркет', 'маркет', 'евроопт', 'соседи', 'санта', 'корона', 'виталюр', 'алми', 'гиппо', 'пятероч', 'магнит', 'лент', 'ашан', 'перекрест', 'молок', 'хлеб', 'овощ', 'фрукт', 'мяс', 'колбас', 'сыр', 'яйц', 'круп', 'макарон', 'бакале', 'еда', 'еду', 'рынок', 'ферм', 'продовольств', 'evroopt', 'euroopt', 'green', 'santa', 'korona', 'gippo', 'almi', 'vitalur', 'mila', 'maxi', 'supermarket', 'grocery']],
    ['Кафе', ['попкорн', 'мороженое', 'чай ', 'кофе', 'кафе', 'ресторан', 'обед', 'ужин', 'завтрак', 'пицц', 'суши', 'ролл', 'бургер', 'макдон', 'макдак', 'kfc', 'кфс', 'фастфуд', 'чай', 'латте', 'капучино', 'круассан', 'пирожн', 'десерт', 'бар ', 'бара', 'пиво', 'доставк', 'столов', 'перекус', 'шаурм', 'кебаб', 'мороженое', 'булочк', 'вино', 'mcdonald', 'burger king', 'costa', 'starbucks', 'coffee', 'pizza', 'sushi', 'restaurant', 'cafe ']],
    ['Транспорт', ['такси', 'метро', 'автобус', 'троллейбус', 'трамва', 'маршрутк', 'проезд', 'бензин', 'топлив', 'заправк', 'азс', 'парковк', 'штраф', 'каршеринг', 'самокат', 'электричк', 'поезд', 'ж/д', 'самолет', 'авиа', 'uber', 'убер', 'яндекс го', 'шиномонтаж', 'мойк', 'транспорт', 'билет на', 'yandex go', 'taxi', 'azs', 'belorusneft', 'lukoil', 'parking', 'metro']],
    ['Дом', ['квартир', 'аренд', 'квартплат', 'коммунал', 'свет ', 'электричеств', 'газ ', 'отоплен', 'ремонт', 'мебел', 'хозтовар', 'быт', 'уборк', 'ikea', 'икеа', 'посуд', 'лампочк', 'сантехник', 'клининг', 'стиральн', 'за воду', 'водоснабж', 'жкх', 'жку']],
    ['Здоровье', ['аптек', 'лекарств', 'таблетк', 'врач', 'стоматолог', 'зуб', 'анализ', 'больниц', 'клиник', 'поликлиник', 'массаж', 'витамин', 'очки', 'линзы', 'здоровь', 'терапевт', 'прием у']],
    ['Одежда', ['одежд', 'обув', 'куртк', 'футболк', 'кроссовк', 'джинс', 'плать', 'ботинк', 'сапог', 'пальто', 'свитер', 'шапк', 'носк', 'белье', 'юбк', 'рубашк', 'худи', 'толстовк']],
    ['Связь', ['связь', 'мобильн', 'телефон', 'интернет', 'мтс', 'а1 ', 'лайф', 'тариф', 'симк', 'вайфай', 'wi-fi', 'роуминг', 'белтелеком', 'байфлай', 'mts', 'beltelecom', 'byfly']],
    ['Подписки', ['подписк', 'netflix', 'нетфликс', 'spotify', 'спотифай', 'youtube', 'ютуб', 'apple music', 'кинопоиск', 'яндекс плюс', 'ivi', 'okko', 'chatgpt', 'icloud', 'премиум', 'google play', 'apple.com', 'youtube premium']],
    ['Подарки', ['подар', 'цветы', 'цветов', 'букет', 'открытк']],
    ['Развлечения', ['кино', 'концерт', 'театр', 'музей', 'игр', 'боулинг', 'клуб', 'квиз', 'караоке', 'выставк', 'аттракцион', 'развлечен', 'steam', 'стим', 'playstation', 'билеты']]
  ];
  const INCOME = [
    ['Зарплата', ['зарплат', 'аванс', 'оклад', 'премию', 'премия', 'получк', 'бонус', 'премирова']],
    ['Подработка', ['подработк', 'фриланс', 'заказ', 'халтур', 'репетиторств', 'проект', 'продал', 'выручк', 'перевел']],
    ['Подарок', ['подарили', 'подарок', 'подарил мне', 'подарила мне']],
    ['Возврат', ['возврат', 'вернули', 'кэшбэк', 'кешбэк', 'кэшбек', 'возместил', 'компенсац']]
  ];
  const INCOME_WORDS = /(?<![а-яa-z0-9])(зарплат|аванс|получил|получен|пришл|пришел|поступил|заработал|премию|премия|подработк|фриланс|вернули|возврат|кэшбэк|кешбэк|кэшбек|дивиденд|стипенд|пенси|подарили|продал|начислил|выплат|доход|зачислил|перевел[иа]?\s+мне|мне\s+перевел|перевел[иа]?(?![а-я])|бонус|премирова|выручк|выигр|вернул[аи]?\s+мне|вернули|мне\s+вернул|кэшбэк|компенсир|одолжил[аи]?\s+мне|занял[аи]?\s+мне)/;
  const STOP = new Set(('купил купила купили потратил потратила потратили заплатил заплатила заплатили оплатил оплатила оплатили отдал отдала отдали взял взяла ' +
    'получил получила получили пришло пришла пришли пришел заработал заработала на за по в во из у к от для мне я мой моя мои карты карту карта картой с со ' +
    'подарил подарила подарили вернули вернул подарок рублей рубля рубль руб р br byn бр и еще ещё потом также около примерно где-то там вот это мы был была было были был потратилось ушло ушла ' +
    'короче значит так ну вообще просто сегодня вчера утром вечером днем ночью сразу тут же там нам вам нас вас тоже обошлась обошелся обошлось сходили сходила сходил зашла зашел заехала заехал залила залил оставили оставила оставил перевели перевод днях дня день сегодняшний уже тогда после потом сначала затем всего итого почти ровно штук штуки шт слушай слушайте смотри ходили ходила ходил ездили ездила ездил ага а да нет вроде кажется типа неделю накопилось накопилось').split(' '));
  const DAYS = [['воскресень', 0], ['понедельник', 1], ['вторник', 2], ['сред', 3], ['четверг', 4], ['пятниц', 5], ['суббот', 6]];
  const MONTH_STEMS = ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
  const MONTH_RE = '(январ[яь]|феврал[яь]|март[ае]?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|август[ае]?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])';

  const NUM = { ноль: 0, один: 1, одна: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19, двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90, сто: 100, двести: 200, триста: 300, четыреста: 400, пятьсот: 500, шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900 };
  const THOUSAND = /^(тысяч[аиу]?|тыщ[аиу]?|тыс)$/;

  /* ---------- Утилиты ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const has = (text, stem) => new RegExp('(?<![а-яa-z0-9])' + esc(stem.trim()) + (/\s$/.test(stem) ? '(?![а-яa-z0-9])' : '')).test(text);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  /* «пятьдесят два» → «52», «две тысячи пятьсот» → «2500» */
  function wordsToDigits(s) {
    const toks = s.split(/(\s+)/);
    const out = [];
    let i = 0;
    while (i < toks.length) {
      const w = toks[i];
      if (w in NUM || w === 'полторы' || w === 'полтора') {
        let total = 0, cur = 0, j = i, used = false, lastWordIdx = i;
        while (j < toks.length) {
          const t = toks[j];
          if (/^\s+$/.test(t)) { j++; continue; }
          if (t in NUM) { cur += NUM[t]; used = true; lastWordIdx = j; j++; }
          else if (t === 'полторы' || t === 'полтора') { cur += 1.5; used = true; lastWordIdx = j; j++; }
          else if (THOUSAND.test(t) && used) { total += (cur || 1) * 1000; cur = 0; lastWordIdx = j; j++; }
          else break;
        }
        let half = 0;                                   // «шесть с половиной» → 6,5
        if (toks[lastWordIdx + 2] === 'с' && /^половин(?:ой|кой)$/.test(toks[lastWordIdx + 4] || '')) { half = 0.5; lastWordIdx += 4; }
        out.push(String(total + cur + half));
        i = lastWordIdx + 1;
      } else { out.push(w); i++; }
    }
    return out.join('');
  }

  /* ---------- Даты ---------- */
  function extractDates(s, today) {
    const dates = [];
    const put = (m, date) => { dates.push(date); return ` §${String.fromCharCode(96 + dates.length)}§ `; };
    const mk = (y, m, d) => {
      let dt = new Date(y, m, d);
      if (dt.getMonth() !== m) return null;
      if (dt > addDays(today, 1)) dt = new Date(y - 1, m, d);
      return dt;
    };
    // 15 октября
    s = s.replace(new RegExp('(?<!\\d)(\\d{1,2})\\s+' + MONTH_RE, 'g'), (m, d, mon) => {
      const mi = MONTH_STEMS.findIndex(st => mon.startsWith(st) && (st !== 'ма' || /^ма[яй]/.test(mon)));
      const dt = mk(today.getFullYear(), mi, Number(d));
      return dt ? put(m, dt) : m;
    });
    // 15.10 / 15.10.2026 / 15/10
    s = s.replace(/(?<![\d.])(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?![\d])/g, (m, d, mo, y) => {
      if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return m;
      if (!y && m.includes('.') && mo.length === 1) return m;      // «кофе 6.5» — это сумма, а не 6 мая
      const yy = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : today.getFullYear();
      const dt = mk(yy, Number(mo) - 1, Number(d));
      return dt ? put(m, dt) : m;
    });
    // 15 числа
    s = s.replace(/(?<!\d)(\d{1,2})\s+числ[аое]/g, (m, d) => {
      let dt = new Date(today.getFullYear(), today.getMonth(), Number(d));
      if (dt > addDays(today, 1)) dt = new Date(today.getFullYear(), today.getMonth() - 1, Number(d));
      return put(m, dt);
    });
    // N дней назад / неделю назад
    s = s.replace(/(?<![а-я0-9])(\d{1,2})\s+(?:дн(?:я|ей)|день)\s+назад/g, (m, n) => put(m, addDays(today, -Number(n))));
    s = s.replace(/(?<![а-я])недел[юи]\s+назад/g, m => put(m, addDays(today, -7)));
    // вчера / позавчера / сегодня
    s = s.replace(/(?<![а-я])позавчера/g, m => put(m, addDays(today, -2)));
    s = s.replace(/(?<![а-я])вчера(?:шн[а-я]+)?/g, m => put(m, addDays(today, -1)));
    s = s.replace(/(?<![а-я])сегодня(?:шн[а-я]+)?/g, m => put(m, today));
    // дни недели: ближайший прошедший (или сегодняшний)
    for (const [stem, idx] of DAYS) {
      s = s.replace(new RegExp('(?<![а-я])(?:в|во|на|за)?\\s*' + stem + '[а-я]*', 'g'), m => {
        const diff = (today.getDay() - idx + 7) % 7;
        return put(m, addDays(today, -diff));
      });
    }
    return { text: s, dates };
  }

  /* ---------- Суммы ---------- */
  const NUM_RE = /(\d{1,3}(?:[  ]\d{3})+|\d+)(?:\u0001(\d{1,2}))?/g;
  const CUR_RE = /^\s*(?:руб[а-я]*|р(?![а-я])|₽|br\b|byn\b|бел[а-я]*|usd|\$|долл[а-я]*|евро(?![а-я])|eur|€|коп[а-я]*|тыс[а-я]*|т\.?р(?![а-я])|к(?![а-я])|k(?![a-z]))/;

  function findAmounts(chunk) {
    const found = [];
    let m;
    NUM_RE.lastIndex = 0;
    while ((m = NUM_RE.exec(chunk))) {
      const raw = m[1].replace(/[  ]/g, '');
      let val = Number(raw + (m[2] ? '.' + m[2] : ''));
      const after = chunk.slice(m.index + m[0].length);
      const curM = after.match(CUR_RE);
      let end = m.index + m[0].length;
      if (curM) {
        if (/^\s*(?:тыс|т\.?р|к(?![а-я])|k(?![a-z]))/.test(curM[0])) { val *= 1000; end += curM[0].length; const more = chunk.slice(end).match(/^\s*(?:руб[а-я]*|р(?![а-я])|₽|br\b|byn\b)/); if (more) end += more[0].length; }
        else if (/^\s*коп/.test(curM[0])) { val = val / 100; end += curM[0].length; }
        else end += curM[0].length;
      }
      const before = chunk.slice(0, m.index);
      found.push({ val, start: m.index, end, hasCur: !!curM, prep: /(?:за|на|по|—|-|:)\s*$/.test(before) });
    }
    return found;
  }

  /* ---------- Основная функция ---------- */
  function parseNotes(input, ctx) {
    const today = ctx && ctx.today ? new Date(ctx.today.getFullYear(), ctx.today.getMonth(), ctx.today.getDate()) : new Date();
    const accounts = (ctx && ctx.accounts) || [];
    let s = String(input || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”]/g, ' ');
    s = s.replace(/[ ]/g, ' ');
    s = s.replace(/виз[аыойу](?![а-я])/g, 'visa').replace(/мастер[-\s]?кард[а-я]*/g, 'mastercard').replace(/маэстро/g, 'maestro');
    s = s.replace(/([а-я])([,;:!?])/g, '$1 $2');                 // «двадцать,» → «двадцать ,» для чисел словами
    s = wordsToDigits(s);
    // «6 рублей 50 копеек» → 6.50; «2 тысячи 300» → 2300; «два кофе по 5» → кофе 10
    s = s.replace(/(\d+)\s*(?:руб[а-я]*|р|br|byn)\.?\s+(\d{1,2})\s*коп[а-я]*/g, (m, r, k) => r + '.' + String(k).padStart(2, '0'));
    s = s.replace(/(\d+)\s*(?:тысяч[а-я]*|тыщ[а-я]*)\s+(\d{1,3})(?!\d|[.,]\d)/g, (m, t, r) => String(Number(t) * 1000 + Number(r)));
    s = s.replace(/(?<![\d.,])(\d{1,2})\s+([а-яa-z]+)\s+по\s+(\d+(?:[.,]\d+)?)(?!\d)/g, (m, q, w, pr) => `${w} ${Math.round(Number(q) * Number(String(pr).replace(',', '.')) * 100) / 100}`);
    s = s.replace(/(?<![\wа-я])(\d+)\s?(?:к|k)(?![\wа-я])/g, (m, n) => String(Number(n) * 1000));
    s = s.replace(/\d{1,2}:\d{2}/g, ' ');                      // время
    const d = extractDates(s, today); s = d.text;
    // последние 4 цифры карты: «карта 4417», «····4417»
    let l4hint = null;
    s = s.replace(/(?:карт[а-я]*|\*+|·+|…)\s*(\d{4})(?!\d)/g, (m, n) => { l4hint = n; return ' '; });
    s = s.replace(/(\d)[.,](\d)/g, '$1\u0001$2');               // защитить десятичные
    let chunks = s.split(/[,;.!?\n]|\s+и\s+|\s+а\s+еще\s+|\s+а\s+ещё\s+|\s+еще\s+|\s+потом\s+|\s+плюс\s+|\s+также\s+/).map(x => x.trim()).filter(Boolean);

    // сколько раз упоминается дата и где
    const dateMention = chunks.map(c => (c.match(/§[a-z]§/g) || []).length);
    const totalMentions = dateMention.reduce((a, b) => a + b, 0);

    const last = chunks[chunks.length - 1] || '';
    const lastAmt = findAmounts(last)[0];
    const trailingAll = totalMentions === 1 && chunks.length > 1 && dateMention[chunks.length - 1] === 1 && lastAmt && last.search(/§[a-z]§/) > lastAmt.start;
    const items = [];
    let carry = '', ctxDate = null, ctxAcc = null, pendingTrailingDate = null;
    chunks.forEach((chunk, idx) => {
      // дата
      const dm = chunk.match(/§([a-z])§/);
      if (dm) ctxDate = d.dates[dm[1].charCodeAt(0) - 97];
      // карта, названная в этом куске
      const accHere = findAccount(chunk, accounts, null);
      if (accHere) ctxAcc = accHere;
      const text = (carry ? carry + ' ' : '') + chunk;
      const amounts = findAmounts(chunk);
      if (!amounts.length) {
        const onlyMeta = !chunk.replace(/§[a-z]§/g, '').replace(/[^а-яa-z]/g, '').length || (accHere && chunk.split(/\s+/).length <= 4);
        if (!onlyMeta) carry = text.replace(/§[a-z]§/g, '').trim(); // «хлеб молоко» + «сыр за 15» → одна запись
        if (dm && idx === chunks.length - 1 && totalMentions === 1) pendingTrailingDate = ctxDate;
        return;
      }
      // выбираем сумму
      let best = amounts[0], bestScore = -1;
      amounts.forEach((a, i) => {
        const sc = (a.hasCur ? 3 : 0) + (a.prep ? 2 : 0) + (i === amounts.length - 1 ? 1 : 0);
        if (sc > bestScore) { best = a; bestScore = sc; }
      });
      if (!(best.val > 0)) { carry = ''; return; }
      const full = (carry ? carry + ' ' : '') + chunk;
      const rest = (carry ? carry + ' ' : '') + chunk.slice(0, best.start) + ' ' + chunk.slice(best.end);
      carry = '';
      const type = INCOME_WORDS.test(full) ? 'income' : 'expense';
      const cat = pickCategory(full, type);
      const acc = findAccount(full, accounts, l4hint) || ctxAcc || null;
      items.push({ type, amount: Math.round(best.val * 100) / 100, cat, accRaw: acc, dateIdx: ctxDate, note: makeNote(rest, accounts, cat), hasOwnDate: !!dm });
    });

    return items.map(it => {
      let dt = it.dateIdx || pendingTrailingDate || today;
      if (totalMentions === 1 && pendingTrailingDate) dt = pendingTrailingDate;
      if (trailingAll) dt = d.dates[0];
      const a = it.accRaw || accounts[0];
      return { type: it.type, amount: it.amount, cat: it.cat, acc: a ? a.id : '', date: ymd(dt), note: it.note };
    });
  }

  function pickCategory(text, type) {
    const list = type === 'income' ? INCOME : EXPENSE;
    for (const [cat, stems] of list) if (stems.some(st => has(text, st))) return cat;
    if (type === 'income') return 'Другое';
    return 'Другое';
  }

  function stemOfName(tok) { return tok.length >= 6 ? tok.slice(0, tok.length - 2) : tok; }
  function findAccount(text, accounts, l4) {
    if (l4) { const a = accounts.find(x => x.last4 === l4); if (a) return a; }
    const t = text.replace(/§[a-z]§/g, ' ');
    let best = null, bestLen = 0;
    for (const a of accounts) {
      const nm = a.name.toLowerCase().replace(/ё/g, 'е').replace(/виз[аыойу](?![а-я])/g, 'visa');
      if (nm.length >= 3 && new RegExp('(?<![а-яa-z0-9])' + esc(nm) + '(?![а-яa-z0-9])').test(t) && nm.length > bestLen) { best = a; bestLen = nm.length; continue; }
      for (const tok of nm.split(/[^а-яa-z0-9]+/).filter(x => x.length >= 3)) {
        if (has(t, stemOfName(tok)) && tok.length > bestLen) { best = a; bestLen = tok.length; }
      }
    }
    return best;
  }

  function makeNote(rest, accounts, cat) {
    let t = rest.replace(/§[a-z]§/g, ' ').replace(/\u0001/g, '.');
    for (const a of accounts) {
      const nm = a.name.toLowerCase().replace(/ё/g, 'е');
      t = t.replace(new RegExp('(?<![а-яa-z0-9])' + esc(nm) + '(?![а-яa-z0-9])', 'g'), ' ');
      nm.split(/[^а-яa-z0-9]+/).filter(x => x.length >= 3).forEach(tok => { t = t.replace(new RegExp('(?<![а-яa-z0-9])' + esc(stemOfName(tok)) + '[а-я]*', 'g'), ' '); });
    }
    t = t.replace(/(?<![а-я])(?:руб[а-я]*|₽|\$|usd|евро(?![а-я])|eur|€|коп[а-я]*|тыс[а-я]*)/g, ' ').replace(/[^а-яa-z0-9\s\-\/]/g, ' ');
    const cl = cat.toLowerCase();
    const words = t.split(/\s+/).filter(w => w && !STOP.has(w) && !/^\d+$/.test(w) && !(w.length >= 4 && cl.startsWith(w.slice(0, Math.min(5, w.length)))));
    if (!words.length) return '';
    let note = words.slice(0, 5).join(' ').slice(0, 60);
    note = note.charAt(0).toUpperCase() + note.slice(1);
    if (note.toLowerCase() === cat.toLowerCase()) return '';
    return note;
  }

  root.MD = root.MD || {};
  root.MD.parseNotes = parseNotes;
  root.MD.pickCategory = (text, type) => pickCategory(String(text || '').toLowerCase().replace(/ё/g, 'е'), type || 'expense');
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseNotes, pickCategory: (t, ty) => pickCategory(String(t || '').toLowerCase().replace(/ё/g, 'е'), ty || 'expense') };
})(typeof window !== 'undefined' ? window : globalThis);
