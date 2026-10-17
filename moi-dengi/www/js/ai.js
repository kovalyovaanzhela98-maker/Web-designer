/* ИИ-Фин: понимает любой текст, фото, скриншоты и PDF, отвечает по делу и достаёт из картинок операции.
   Работает через Claude API (Anthropic). Ключ человек вводит сам в профиле и он хранится только на телефоне.
   В запрос уходит: сообщение, прикреплённые файлы и короткая сводка (категории, суммы за месяц, копилки, платежи).
   Подсказки на главной по-прежнему считаются правилами на телефоне, без ИИ. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const KEY = 'fin_ai_key', URL_KEY = 'fin_ai_url';
  const API = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-sonnet-5-5';
  const CURS = ['BYN', 'RUB', 'USD', 'EUR'];

  const get = k => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
  const put = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (_) {} };
  const key = () => get(KEY).trim();
  const endpoint = () => get(URL_KEY).trim() || (root.MD_CLOUD && root.MD_CLOUD.aiEndpoint) || '';
  const available = () => !!(key() || endpoint());

  const TOOL = {
    name: 'reply',
    description: 'Ответ пользователю и, если нужно, найденные операции для записи.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Ответ по-русски: коротко, спокойно, по делу. Можно использовать <em> для сумм.' },
        transactions: {
          type: 'array',
          description: 'Операции, найденные в сообщении, на фото, скриншоте, чеке или выписке. Пусто, если записывать нечего.',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['expense', 'income'] },
              amount: { type: 'number', description: 'Сумма, положительное число' },
              currency: { type: 'string', enum: CURS },
              category: { type: 'string', description: 'Одна из категорий пользователя' },
              date: { type: 'string', description: 'Дата операции, ГГГГ-ММ-ДД' },
              time: { type: 'string', description: 'Время ЧЧ:ММ, если видно' },
              name: { type: 'string', description: 'Получатель или описание, как в источнике' },
              check: { type: 'string', description: 'Номер чека или операции, если есть' }
            },
            required: ['type', 'amount', 'currency', 'category', 'date']
          }
        }
      },
      required: ['text']
    }
  };

  function system(c) {
    const cats = c.cats || { expense: [], income: [] };
    return [
      'Ты Фин, дружелюбный помощник по личным финансам в приложении «Фин». Отвечаешь по-русски, коротко и спокойно, на «ты».',
      'Ты понимаешь любые сообщения и любые изображения: чеки, скриншоты банков, выписки, фото ценников, таблицы, переписки. Если на картинке нет денег, просто отвечай по сути вопроса.',
      'Всегда отвечай через инструмент reply. Если пользователь просит что-то записать или прислал чек, скриншот или выписку, верни операции в transactions. Не придумывай то, чего нет в источнике. Если картинка нечёткая, скажи об этом и верни только то, что видно.',
      'Для каждой операции укажи дату и время операции, название получателя, сумму, валюту, номер чека, если они видны. Дату обработки платежа не путай с датой операции: бери дату операции.',
      'Категорию выбирай ТОЛЬКО из списка пользователя. Расходы: ' + cats.expense.join(', ') + '. Доходы: ' + cats.income.join(', ') + '.',
      'Подсказки по категориям: Life и мобильные операторы — Связь; ноутбук, телефон, электроника — Техника; кредит, Альфа кредит — Кредиты; переводы людям, Сбер — Переводы; налоги — Налоги; электроэнергия, коммунальные услуги — Дом; М-Банкинг и комиссии банка — Банк; пополнение счёта — доход или Переводы.',
      'Валюта по умолчанию: ' + c.cur + '. Сегодня ' + c.today + '. Относительные даты («вчера») переводи в ГГГГ-ММ-ДД.',
      'Данные пользователя за ' + (c.monthName || 'месяц') + ': ' + (c.summary || 'пока пусто') + '.',
      c.goals ? 'Копилки: ' + c.goals + '.' : '',
      c.pays ? 'Обязательные платежи: ' + c.pays + '.' : '',
      'Не давай инвестиционных советов, не осуждай траты, не используй слова «слишком», «плохо», «нарушение». Не предлагай бюджеты по категориям и не говори, что ты нейросеть, если не спросят.'
    ].filter(Boolean).join('\n');
  }

  /* Содержимое сообщения: текст + файлы (изображения и PDF уходят как есть, остальное текстом) */
  async function blocks(text, files) {
    const out = [];
    for (const f of files || []) {
      if (f.kind === 'image') out.push({ type: 'image', source: { type: 'base64', media_type: f.mime || 'image/jpeg', data: f.data } });
      else if (f.kind === 'pdf') out.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data } });
      else if (f.kind === 'text') out.push({ type: 'text', text: 'Содержимое файла ' + (f.name || '') + ':\n' + String(f.data).slice(0, 60000) });
    }
    out.push({ type: 'text', text: text || (out.length ? 'Посмотри, что здесь, и запиши операции.' : '') });
    return out;
  }

  function buildRequest(o) {
    const hist = (o.history || []).slice(-10).map(m => ({ role: m.role, content: [{ type: 'text', text: String(m.text).slice(0, 1500) }] }));
    return {
      model: o.model || MODEL,
      max_tokens: 4096,
      system: system(o.ctx),
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'reply' },
      messages: hist.concat([{ role: 'user', content: o.content }])
    };
  }

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const validDate = s => { if (!ISO.test(s)) return false; const d = new Date(s + 'T00:00:00'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; };
  const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

  /* Проверяем то, что вернул ИИ: не доверяем ни суммам, ни категориям, ни датам */
  function normalize(list, c) {
    const cats = c.cats || { expense: [], income: [] }, items = [];
    (Array.isArray(list) ? list : []).slice(0, 300).forEach(r => {
      if (!r || typeof r !== 'object') return;
      const type = r.type === 'income' ? 'income' : 'expense', amount = Math.round(Math.abs(num(r.amount)) * 100) / 100;
      if (!amount || amount > 1e9) return;
      const cur = CURS.includes(String(r.currency).toUpperCase()) ? String(r.currency).toUpperCase() : c.cur;
      const pool = cats[type] || [];
      const found = pool.find(x => x.toLowerCase() === String(r.category || '').toLowerCase());
      const cat = found || (pool.includes('Другое') ? 'Другое' : pool[pool.length - 1] || 'Другое');
      const date = validDate(r.date) ? r.date : c.today;
      const time = /^\d{1,2}:\d{2}$/.test(r.time || '') ? r.time : '';
      const name = String(r.name || '').trim().slice(0, 80);
      items.push({ type, amount, cur, cat, date, time, name: name || cat, note: name, check: String(r.check || '').slice(0, 40), procDate: '', procTime: '', rep: '' });
    });
    return items;
  }

  function parse(resp, c) {
    const tu = ((resp && resp.content) || []).find(b => b.type === 'tool_use' && b.name === 'reply');
    if (tu && tu.input) return { text: String(tu.input.text || '').slice(0, 4000), items: normalize(tu.input.transactions, c) };
    const tx = ((resp && resp.content) || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return { text: tx.slice(0, 4000), items: [] };
  }

  const errText = (status, body) => {
    if (status === 401 || status === 403) return 'ключ не подошёл. Проверь его в профиле, в разделе «Фин-ИИ»';
    if (status === 429) return 'слишком много запросов подряд, подожди минуту';
    if (status === 413) return 'файл слишком большой, пришли поменьше';
    if (status >= 500) return 'сервис сейчас недоступен, попробуй позже';
    return (body && body.error && body.error.message) || 'не получилось связаться с ИИ';
  };

  async function ask(o) {
    const c = o.ctx, content = await blocks(o.text, o.files);
    const body = buildRequest({ ctx: c, content, history: o.history, model: o.model });
    const url = endpoint() || API, headers = { 'content-type': 'application/json' };
    if (!endpoint() || key()) { headers['x-api-key'] = key(); headers['anthropic-version'] = '2023-06-01'; headers['anthropic-dangerous-direct-browser-access'] = 'true'; }
    let res;
    try { res = await (o.fetch || root.fetch)(url, { method: 'POST', headers, body: JSON.stringify(body) }); }
    catch (_) { const e = new Error('Нет связи с интернетом'); e.code = 'offline'; throw e; }
    let json = null; try { json = await res.json(); } catch (_) {}
    if (!res.ok) { const e = new Error(errText(res.status, json)); e.code = 'http'; e.status = res.status; throw e; }
    return parse(json, c);
  }

  /* Файл → блок для запроса. Картинки уменьшаем: длинная сторона до 1568 px, JPEG */
  async function fileToPart(file) {
    const name = file.name || '', type = file.type || '';
    const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
    if (/pdf/i.test(type) || /\.pdf$/i.test(name)) return { kind: 'pdf', name, data: b64(await file.arrayBuffer()) };
    if (/^image\//.test(type)) {
      let bmp;
      try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch (_) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
      const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, k = Math.min(1, 1568 / Math.max(w, h));
      const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      return { kind: 'image', mime: 'image/jpeg', name, data: cv.toDataURL('image/jpeg', 0.86).split(',')[1] };
    }
    return { kind: 'text', name, data: await file.text() };
  }

  MD.ai = { available, key, setKey: v => put(KEY, String(v || '').trim()), endpoint, ask, fileToPart, buildRequest, normalize, parse, system, MODEL };
  if (typeof module !== 'undefined') module.exports = MD.ai;
})(typeof window !== 'undefined' ? window : globalThis);
