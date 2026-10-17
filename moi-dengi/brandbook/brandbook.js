/* Брендбук «Фин»: страница собирается из тех же токенов, иконок, категорий и персонажа, что и приложение. */
(function () {
  'use strict';
  const MD = window.MD, $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tok = n => getComputedStyle(root).getPropertyValue(n).trim();

  /* ---- контраст WCAG ---- */
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const ratio = (a, b) => { const x = lum(hex2rgb(a)), y = lum(hex2rgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const badge = r => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA крупный' : 'ниже нормы');

  const sections = [];
  const sec = (id, title, sub, html) => sections.push({ id, title, html: `<section class="bb-sec" id="${id}"><h2>${title}</h2><p class="bb-sub">${sub}</p>${html}</section>` });

  /* ---------- 1. Персонаж ---------- */
  const POSES = [
    ['hello', 'Привет', 'Главная, приветствия'],
    ['happy', 'Радость', 'Запись добавлена, доход'],
    ['joy', 'Смеётся', 'Всё получилось'],
    ['love', 'С сердечком', 'Цели и прогресс'],
    ['notify', 'Удивлён', 'Слушает голос, уведомления'],
    ['think', 'Думает', 'Нужно уточнить'],
    ['sleepy', 'Дремлет', 'Пустые экраны, нет операций'],
    ['oops', 'Грустит', 'Ошибка, нет интернета'],
    ['angry', 'Сердится', 'Превышен лимит']
  ];
  const fin = (p, s) => MD.mascot(p, s);
  sec('character', 'Фин', 'Пушистый кремовый друг с зелёным листом на макушке и длинными ушками. Он не считает за тебя, он рядом: радуется, слушает, сочувствует. Деньги в приложении выглядят спокойно, потому что рядом он.',
    `<div class="bb-grid c3">${POSES.map(p => `<div class="bb-card pose">${fin(p[0], 104)}<b>${p[1]}</b><span>${p[2]}</span></div>`).join('')}</div>
    <h3>Виды</h3>
    <div class="bb-demo row" style="justify-content:space-around">${['hello', 'think', 'joy', 'sleepy'].map(k => fin(k, 120)).join('')}</div>
    <p class="bb-cap">Одна и та же форма в разных настроениях: новые позы рисуй с теми же пропорциями, ушками и листом.</p>
    <h3>Фин говорит</h3>
    <div class="bb-demo">${MD.say('think', 'На 17% больше, чем в прошлом месяце<small>Чаще всего: «Одежда». Посмотри, можно ли там сэкономить.</small>', 84)}</div>
    <p class="bb-cap">Фин комментирует деньги репликой в облачке: главная, статистика, помощник. Заголовок реплики короткий, пояснение под ним мелким. Поза подбирается под смысл: радость, раздумье, удивление. Код: <code>MD.say(поза, текст, размер)</code>. Тосты тоже с Фином: <code>toast(текст, null, null, поза)</code>.</p>
    <h3>Из чего он состоит</h3>
    <div class="bb-grid c2">
      <div class="bb-card"><h4>Тельце</h4><p>Мягкий кремовый шарик с едва заметным пушком по краю. Без острых углов и жёстких контуров.</p></div>
      <div class="bb-card"><h4>Лист и ушки</h4><p>Один большой лист-росток на макушке и два длинных ушка, которые переходят из травяного зелёного в кремовый. Это его силуэт, по нему узнают издалека.</p></div>
      <div class="bb-card"><h4>Глаза</h4><p>Крупные тёмные блестящие глаза с бликами и лёгким зелёным оттенком. Щёчки розовые, рот маленький.</p></div>
      <div class="bb-card"><h4>Характер</h4><p>Добрый, спокойный, любопытный. Не ругает за траты и не хвастается за накопления. Эмоции показывает позой и лицом, а не длинной фразой.</p></div>
    </div>
    <h3>Как использовать</h3>
    <div class="dos">
      <div class="yes"><b>Можно</b>Маленьким рядом с приветствием, крупным на входе и в пустых экранах, в сообщениях об ошибке. Один Фин на экран. Размер не меньше 44 пикселей.</div>
      <div class="no"><b>Нельзя</b>Растягивать, красить в другие цвета, убирать лист, ставить на фон тёмнее индиго без мягкой тени, добавлять ему лишние детали вроде очков в обычных экранах.</div>
    </div>
    <h3>Файлы</h3>
    <p>Картинки лежат в <code>www/img/fin</code>, один файл на позу, прозрачный фон. Новую позу добавляй туда и в список <code>POSES</code> в <code>www/js/mascot.js</code>. Сейчас файлы небольшие (до 350 пикселей), для крупных мест нужны оригиналы в высоком разрешении.</p>`);

  /* ---------- 2. Логотип ---------- */
  sec('logo', 'Знак и иконка', 'Знак приложения — подмигивающий Фин на тёмно-зелёном фоне. Узнаётся и в мелком размере: большой глаз, лист и румянец.',
    `<div class="bb-grid c3">
      <div class="bb-card pose"><img src="" alt="" id="icoA" width="104" height="104" style="border-radius:24px"><b>Иконка</b><span>Скруглённый квадрат, тёмно-зелёный фон</span></div>
      <div class="bb-card pose"><div style="width:104px;height:104px;border-radius:50%;background:#1A3125;display:grid;place-items:center;overflow:hidden">${fin('hello', 84)}</div><b>Круглая</b><span>Для круглых масок Android</span></div>
      <div class="bb-card pose"><div style="width:104px;height:104px;border-radius:24px;background:var(--field);display:grid;place-items:center">${fin('hello', 84)}</div><b>Только Фин</b><span>На светлом фоне, без тёмного фона</span></div>
    </div>
    <h3>Правила</h3>
    <div class="bb-grid c2">
      <div class="bb-card"><h4>Охранное поле</h4><p>Вокруг Фина свободно не меньше четверти его ширины. Лист и ушки входят в силуэт, тень в поле не входит.</p></div>
      <div class="bb-card"><h4>Минимальный размер</h4><p>В интерфейсе не меньше 44 пикселей, иконка приложения не меньше 48. Мельче теряются глаза.</p></div>
    </div>
    <h3>Как пересобрать иконку</h3>
    <pre><code>npm run icons</code></pre>
    <p>Скрипт <code>scripts/make_icons.py</code> берёт картинку <code>resources/source/app-icon.png</code>, раскладывает ресурсы Android по папкам (обычная, круглая, адаптивная) и делает версию для тематических иконок Android 13+. Чтобы сменить иконку, подмени этот файл и запусти команду.</p>`);

  /* ---------- 3. Цвет ---------- */
  const COLORS = [
    ['--primary', 'Лист', 'Главный цвет бренда, зелёный лист на макушке Фина: кнопки, активные элементы, шапка баланса.', '--surface'],
    ['--coin', 'Монета', 'Золото монеты. Акцент: центральная кнопка, блик в шапке, звёздочки. Не для текста.', '--bg'],
    ['--ink', 'Чернила', 'Текст на золоте и глаза Фина.', '--coin'],
    ['--bg', 'Фон', 'Белая подложка экранов. В тёмной теме тёмно-зелёная.', '--text'],
    ['--surface', 'Поверхность', 'Карточки, листы, строки.', '--text'],
    ['--text', 'Текст', 'Основной текст и заголовки.', '--surface'],
    ['--muted', 'Второстепенный', 'Подписи, примечания, подсказки.', '--surface'],
    ['--line', 'Линия', 'Границы и разделители.', '--surface']
  ];
  function swatches() {
    return `<div class="bb-grid c4">${COLORS.map(([t, n, d, on]) => {
      const v = tok(t), o = tok(on), r = ratio(v, o);
      const fg = ratio(v, '#FFFFFF') > ratio(v, '#1F2B20') ? '#fff' : '#1F2B20';
      return `<div class="swc"><div class="swc-c" style="background:var(${t});color:${fg}">${n}</div><div class="swc-b"><b>${n}</b><small>${d}</small><button type="button" data-copy="${v}" aria-label="Скопировать ${v}">${v.toUpperCase()}</button><small>Контраст с фоном ${r.toFixed(1)}:1 · ${badge(r)}</small></div></div>`;
    }).join('')}</div>`;
  }
  function pairs() {
    const P = [['--inc', '--inc-bg', '--inc-t', 'Доход'], ['--exp', '--exp-bg', '--exp-t', 'Расход']];
    return `<div class="pair">${P.map(([f, bg, t, n]) => `<div style="background:var(${bg});color:var(${t})"><span>${n}</span><span>${tok(t).toUpperCase()}</span></div><div style="background:var(${f});color:#fff"><span>${n}: заливка</span><span>${tok(f).toUpperCase()}</span></div>`).join('')}</div>`;
  }
  function colorHtml() {
    return `${swatches()}
    <h3>Цвета Фина</h3>
    <p>Эти оттенки встречаются на самом персонаже. Их можно брать для редких акцентов рядом с ним, но не для кнопок и текста.</p>
    <div class="bb-demo row">${[['--fin-cream','Крем'],['--fin-leaf','Лист'],['--fin-leaf-deep','Тёмный лист'],['--fin-blush','Румянец'],['--fin-ink','Глаза']].map(([t,n]) => `<span class="chip"><span class="dot" style="background:var(${t});width:16px;height:16px"></span>${n} ${tok(t).toUpperCase()}</span>`).join('')}</div>
    <h3>Смысловые цвета</h3>
    <p>Зелёный — пришло, красный — потрачено. Они не бренд и не акцент: ими нельзя красить кнопки и украшения. Для мелкого текста берём тёмные варианты (<code>--inc-t</code>, <code>--exp-t</code>), заливки отдельно.</p>
    ${pairs()}
    <h3>Цвета категорий</h3>
    <p>У каждой категории свой цвет. Он идёт в иконку, кольцевую диаграмму и полоску. Список лежит в <code>www/js/categories.js</code>.</p>
    <div class="bb-demo row">${[...MD.CATS.expense, ...MD.CATS.income.filter(c => c[0] !== 'Другое' && c[0] !== 'Подарок')].map(c => `<span class="chip"><span class="dot" style="background:${c[2]}"></span>${esc(c[0])}</span>`).join('')}</div>
    <h3>Цвета карт</h3>
    <div class="bb-demo row">${MD.COLORS.map(c => `<span class="sw" style="--c:${c.bg};--fg:${c.fg};display:grid" role="img" aria-label="${c.name}"></span>`).join('')}</div>
    <h3>Светлая и тёмная темы</h3>
    <p>Тёмная тема не инверсия: фон глубокого лесного зелёного, поверхности чуть светлее, лист и смысловые цвета осветлены, чтобы читаться на тёмном. Переключатель вверху страницы показывает оба набора. Меняй значения в <code>www/tokens.css</code>, там обе темы рядом.</p>`;
  }
  sec('color', 'Цвет', 'Фон и плашки белые, а характер дают зелёный лист Фина и золото монеты. Плашки держатся на тонкой обводке или лёгкой тени. Больше цветов не нужно: остальное служит смыслу.', '<div id="colorBody"></div>');

  /* ---------- 4. Шрифты ---------- */
  sec('type', 'Шрифты', 'Две гарнитуры, обе с кириллицей и лежат в приложении офлайн.',
    `<div class="bb-grid c2">
      <div class="bb-card"><div class="spec-d" style="font-size:44px">Аа 6 545</div><h4 style="margin-top:10px">Wix Madefor Display</h4><p>Заголовки и суммы. Округлая, дружелюбная, цифры ровные и узнаваемые. Веса 700–800.</p></div>
      <div class="bb-card"><div class="spec-t" style="font-size:44px;font-weight:600;line-height:1">Аа 6 545</div><h4 style="margin-top:10px">Golos Text</h4><p>Весь текст интерфейса: подписи, примечания, кнопки, подсказки. Создан для экранов, хорошо читается мелко. Веса 500–800.</p></div>
    </div>
    <h3>Шкала</h3>
    <div class="scale">
      <div><small>Сумма на шапке<br>34 · 700 · display</small><span class="spec-d" style="font-size:34px;font-weight:700">6 545,10 <span style="font-size:19px;opacity:.7">Br</span></span></div>
      <div><small>Заголовок экрана<br>26 · 800 · display</small><span class="spec-d" style="font-size:26px">Операции</span></div>
      <div><small>Заголовок раздела<br>17 · 800 · display</small><span class="spec-d" style="font-size:17px;letter-spacing:-.01em">Недавнее</span></div>
      <div><small>Основной текст<br>15 · 500–700 · text</small><span style="font-size:15px;font-weight:600">Продукты</span></div>
      <div><small>Примечание<br>13 · 500 · text</small><span style="font-size:13px;color:var(--muted);font-weight:500">Евроопт: молоко, хлеб, сыр</span></div>
      <div><small>Подпись<br>12 · 600 · text</small><span style="font-size:12px;color:var(--muted);font-weight:600">Visa · Вчера, 15 октября</span></div>
    </div>
    <h3>Правила для чисел</h3>
    <p>Суммы всегда с пробелом между тысячами, запятой для копеек и знаком валюты: <b class="spec-d" style="font-size:17px;white-space:nowrap">1 250,50 Br</b>. Минус настоящий «−», не дефис. Рядом стоящие суммы выравниваются по цифрам (<code>tabular-nums</code>). Валюту рисуем мельче суммы и чуть светлее.</p>`);

  /* ---------- 5. Сетка и формы ---------- */
  const SP = [['--s-1', '4'], ['--s-2', '8'], ['--s-3', '12'], ['--s-4', '16'], ['--s-5', '20'], ['--s-6', '24'], ['--s-8', '32']];
  const RD = [['--r-sm', '12'], ['--r-md', '16'], ['--r-lg', '24'], ['--r-xl', '28'], ['--r-pill', '999']];
  sec('space', 'Отступы и формы', 'Всё кратно четырём. Между блоками на экране 12, между разделами 24. Слева и справа на экране 16.',
    `<div class="bb-card">${SP.map(([t, v]) => `<div class="sp"><i style="width:${v * 4}px"></i><code>${t}</code> ${v} px</div>`).join('')}</div>
    <h3>Скругления</h3>
    <div class="rd">${RD.map(([t, v]) => `<div style="border-radius:var(${t})">${v === '999' ? 'круг' : v}</div>`).join('')}</div>
    <p style="margin-top:12px">Чем крупнее объект, тем больше скругление: поля 16, карточки и листы 24–28, кнопки-таблетки и чипы полностью круглые. Это та же мягкость, что у Фина.</p>
    <h3>Размеры касания</h3>
    <p>Любая нажимаемая вещь не меньше 44 пикселей по короткой стороне. Если значок мельче, невидимая область вокруг него добирает до 44.</p>`);

  /* ---------- 6. Иконки ---------- */
  sec('icons', 'Иконки', 'Собственный набор, не из библиотек. Двухтоновые: основная форма и приглушённая вторая. Рисуются на сетке 24 на 24.',
    `<div class="bb-grid c2" style="align-items:center"><div class="ic-big" id="icBig"></div><div>
      <p>Основная форма залита цветом. Вторая часть — тот же цвет с прозрачностью 40% (класс <code>a</code>). Тонкие детали — штрих 2,2 с круглыми концами (класс <code>s</code>).</p>
      <p>Углы круглые, у форм нет острых вершин. Метафоры простые и предметные: диван, автобус, билет, корзина.</p></div></div>
    <h3>Весь набор</h3>
    <div class="ic-grid" id="icGrid"></div>
    <h3>Как добавить новую</h3>
    <pre><code>// www/js/icons.js, внутри объекта IC
moto: '&lt;path d="M…"/&gt;&lt;circle class="a" cx="12" cy="12" r="4"/&gt;',</code></pre>
    <p>Новые иконки подхватятся приложением и этой страницей без доработок. Для категории достаточно указать имя иконки в <code>categories.js</code>.</p>
    <h3>Категории</h3>
    <div class="bb-grid c4" id="catGrid"></div>`);

  /* ---------- 7. Компоненты ---------- */
  sec('components', 'Компоненты', 'Всё ниже нарисовано настоящими стилями приложения.',
    `<h3>Кнопки</h3>
    <div class="bb-demo row"><button class="btn primary">Сохранить</button><button class="btn soft">Скопировать копию</button><button class="btn ghost">Отмена</button><button class="btn danger">Удалить</button></div>
    <h3>Чипы и переключатели</h3>
    <div class="bb-demo"><div class="chips"><span class="chip" role="radio" aria-checked="true">BYN Br</span><span class="chip" role="radio" aria-checked="false">RUB ₽</span><span class="chip" role="radio" aria-checked="false">USD $</span></div>
    <div class="seg" role="radiogroup" aria-label="Пример"><button class="seg-b" role="radio" aria-checked="true">Расходы</button><button class="seg-b" role="radio" aria-checked="false">Доходы</button></div></div>
    <h3>Шапка и итоги</h3>
    <div class="bb-demo"><section class="hero"><div class="hero-deco"></div><div class="hero-top"><div class="hero-label">Всего денег</div></div><div class="hero-sum">6 545,10<small>Br</small></div></section>
    <div class="tiles"><div class="tile inc"><div class="tile-ic">${MD.icon('down')}</div><div class="tile-label">Пришло</div><div class="tile-sum">+2 800,00<small>Br</small></div></div><div class="tile exp"><div class="tile-ic">${MD.icon('up')}</div><div class="tile-label">Потрачено</div><div class="tile-sum">−595,40<small>Br</small></div></div></div></div>
    <h3>Карты</h3>
    <div class="bb-demo"><div class="strip"><div class="acc sel"><span class="acc-dot" style="background:#4F6F34"></span><span class="acc-txt"><span class="acc-name">Visa<em>·4417</em></span><span class="acc-bal">954,10<small>Br</small></span></span><span class="acc-more">${MD.icon('dots')}</span></div><div class="acc"><span class="acc-dot" style="background:#F2C230"></span><span class="acc-txt"><span class="acc-name">Наличные</span><span class="acc-bal">200,00<small>Br</small></span></span><span class="acc-more">${MD.icon('dots')}</span></div><div class="acc-add">${MD.icon('plus')}</div></div></div>
    <h3>Операции: примечание под заголовком</h3>
    <p>Заголовок строки — категория. Сразу под ним примечание: на что потрачено или откуда пришло. Карта стоит справа под суммой. Длинное примечание переносится на две строки.</p>
    <div class="bb-demo"><div class="recent">
      ${row('Продукты', 'Евроопт: молоко, хлеб, сыр и ещё всякая мелочь на неделю', '−45,90 Br', 'exp', 'Visa', 'cart', '#3B82F6')}
      ${row('Зарплата', 'Аванс за октябрь', '+500,00 Br', 'inc', 'Visa', 'cash', '#1F8A5B')}
      ${row('Транспорт', '', '−12,00 Br', 'exp', 'Наличные', 'bus', '#14B8A6')}
    </div></div>
    <h3>Навигация</h3>
    <div class="bb-demo"><nav class="nav" aria-label="Пример навигации"><button class="nav-b" aria-current="page">${MD.icon('home')}<span>Главная</span></button><button class="nav-b">${MD.icon('list')}<span>Операции</span></button><button class="nav-add" aria-label="Добавить">${MD.icon('plus')}</button><button class="nav-b">${MD.icon('chart')}<span>Статистика</span></button><button class="nav-b">${MD.icon('spark')}<span>Помощник</span></button></nav></div>
    <p>Центральная кнопка — монета Фина. Это единственное место, где золото работает как кнопка.</p>
    <h3>Поля, сообщения, подсказки</h3>
    <div class="bb-demo"><div class="amount-wrap"><input type="text" value="24,50" aria-label="Пример суммы"><span class="cur">Br</span></div><input type="text" placeholder="На что потрачено или откуда пришло" aria-label="Пример примечания"><div class="msg err">Введи сумму, например 12,50</div><div class="msg ok">Письмо отправлено. Открой его и придумай новый пароль.</div><div><span class="toast">Готово, записано</span></div></div>
    <h3>Пустой экран</h3>
    <div class="bb-demo"><div class="empty"><span class="emp-m">${MD.mascot('sleepy', 92)}</span><b>Здесь будут твои траты и доходы</b>Добавь первую — кнопка «+» внизу</div></div>`);
  function row(cat, note, amt, kind, card, ic, c) {
    return `<div class="swipe"><div class="tx"><div class="tx-ic" style="--c:${c}">${MD.icon(ic)}</div><div class="tx-body"><div class="tx-t">${cat}</div>${note ? `<div class="tx-n">${note}</div>` : ''}</div><div class="tx-r"><div class="tx-a ${kind}">${amt}</div><div class="tx-s">${card}</div></div></div></div>`;
  }

  /* ---------- 8. Голос и тексты ---------- */
  sec('voice', 'Голос и тексты', 'Приложение говорит как внимательный друг: коротко, по-человечески, на «ты». Никаких канцелярских слов.',
    `<div class="bb-grid c2">
      <div class="bb-card"><h4>Как пишем</h4><p>Короткие фразы. Кнопка — глагол, который описывает действие: «Сохранить», «Выйти», «Добавить всё». Радость без восклицаний.</p></div>
      <div class="bb-card"><h4>Ошибки</h4><p>Что случилось и что делать. Без кодов, без вины пользователя, без «к сожалению».</p></div>
      <div class="bb-card"><h4>Деньги</h4><p>Сумма, пробел, валюта. Расход со знаком «−», доход с «+». Не пишем «денежные средства».</p></div>
      <div class="bb-card"><h4>Помощник</h4><p>Не «ИИ» и не «нейросеть». Просто помощник. Он не просит ключей и не рассказывает, как устроен.</p></div>
    </div>
    <h3>Было и стало</h3>
    <div class="tb-wrap"><table class="tb"><thead><tr><th>Не так</th><th>Так</th></tr></thead><tbody>
      <tr><td class="bad">Операция успешно добавлена</td><td class="good">Готово, записано</td></tr>
      <tr><td class="bad">Данные отсутствуют</td><td class="good">Здесь будут твои траты и доходы</td></tr>
      <tr><td class="bad">Введите корректное значение</td><td class="good">Введи сумму, например 12,50</td></tr>
      <tr><td class="bad">Ошибка авторизации (401)</td><td class="good">Почта или пароль не подходят. Проверь и попробуй ещё раз.</td></tr>
      <tr><td class="bad">Сетевая ошибка</td><td class="good">Нет интернета. Подключись к сети и попробуй ещё раз.</td></tr>
      <tr><td class="bad">Удалить запись безвозвратно?</td><td class="good">Удалено · Вернуть</td></tr>
      <tr><td class="bad">Распознавание не удалось</td><td class="good">Не расслышалось. Поднеси телефон поближе и попробуй ещё раз.</td></tr>
    </tbody></table></div>
    <h3>Слова</h3>
    <div class="bb-grid c3">
      <div class="bb-card"><h4>Карта</h4><p>Вместо «счёт», когда речь о банковской карте или наличных.</p></div>
      <div class="bb-card"><h4>Пришло · Потрачено</h4><p>Итоги месяца. Не «поступления» и «расходы» в одном ряду.</p></div>
      <div class="bb-card"><h4>Примечание</h4><p>Поле, где пишут, на что потрачено или откуда пришло.</p></div>
    </div>`);

  /* ---------- 9. Движение и доступность ---------- */
  sec('motion', 'Движение и доступность', 'Движение короткое и мягкое. Оно подтверждает действие и никогда не мешает.',
    `<div class="bb-grid c3">
      <div class="bb-card"><h4>Быстро</h4><p>0,12 с: нажатие кнопки, лёгкое уменьшение до 96%.</p></div>
      <div class="bb-card"><h4>Обычно</h4><p>0,28 с: появление листа и экрана, кривая <code>--ease</code>.</p></div>
      <div class="bb-card"><h4>Живое</h4><p>Фин покачивается и моргает раз в несколько секунд. Сумма на шапке плавно пересчитывается за 0,45 с.</p></div>
    </div>
    <h3>Жесты</h3>
    <div class="bb-grid c2">
      <div class="bb-card"><h4>Тап по карте</h4><p>Показывает операции только по ней. Повторный тап снимает фильтр.</p></div>
      <div class="bb-card"><h4>Долгое нажатие</h4><p>Полсекунды на карте открывает правку. Есть и кнопка «⋯» для тех, кому так удобнее.</p></div>
      <div class="bb-card"><h4>Свайп влево</h4><p>Удаляет операцию. Дальше 96 пикселей уходит, ближе возвращается. Удалённое можно вернуть.</p></div>
      <div class="bb-card"><h4>Кнопка «Назад»</h4><p>Закрывает лист, из вкладки возвращает на главную, из шага входа — к выбору способа.</p></div>
    </div>
    <h3>Доступность</h3>
    <div class="bb-grid c2">
      <div class="bb-card"><h4>Контраст</h4><p>Мелкий текст не ниже 4,5 к 1. Для смысловых цветов в тексте берём тёмные варианты.</p></div>
      <div class="bb-card"><h4>Фокус и экран чтения</h4><p>Фокус всегда виден (3 px). У значков есть подписи, у строк операций — полное описание с суммой.</p></div>
      <div class="bb-card"><h4>Меньше движения</h4><p>Если в телефоне выключены анимации, приложение их не проигрывает.</p></div>
      <div class="bb-card"><h4>Скрыть суммы</h4><p>Значок глаза на шапке прячет все суммы, чтобы можно было открыть приложение при людях.</p></div>
    </div>`);

  /* ---------- 10. Как расширять ---------- */
  sec('extend', 'Как добавлять новое', 'Дизайн-система живёт в нескольких файлах. Новое добавляется в одном месте и появляется везде.',
    `<ul class="steps">
      <li><b>Новая категория</b><span>1. Добавь строку в <code>www/js/categories.js</code> (название, иконка, цвет). 2. Если иконки нет, нарисуй её в <code>icons.js</code>. 3. Впиши ключевые слова в <code>www/js/parser.js</code> и добавь проверку в <code>tests/parser.test.js</code>. Брендбук обновится сам.</span></li>
      <li><b>Новая иконка</b><span>Сетка 24, основная форма и второй тон с классом <code>a</code>, тонкие детали с классом <code>s</code>. Без острых углов.</span></li>
      <li><b>Новая поза Фина</b><span>Положи PNG в <code>www/img/fin</code> и добавь строку в <code>POSES</code> в <code>www/js/mascot.js</code>. Фон прозрачный, лист и ушки целиком в кадре.</span></li>
      <li><b>Новый цвет или размер</b><span>Только через токены в <code>www/tokens.css</code>, сразу для светлой и тёмной темы. В стилях не пишем цвета руками.</span></li>
      <li><b>Новый экран</b><span>Секция с классом <code>screen</code>: сверху <code>hdr</code>, дальше блоки. Отступы между блоками даёт сама секция (12 px), разделы отделяются классом <code>block</code>.</span></li>
      <li><b>Новый текст</b><span>Сверяй с таблицей «Было и стало»: на «ты», коротко, что случилось и что делать.</span></li>
    </ul>
    <h3>Структура</h3>
    <pre><code>moi-dengi/
  www/tokens.css      токены: цвет, шрифты, отступы, радиусы
  www/style.css       компоненты
  www/js/icons.js     иконки
  www/js/mascot.js    Фин и его позы
  www/img/fin/        картинки Фина (PNG)
  www/js/categories.js  категории и цвета карт
  www/js/parser.js    помощник: разбор фраз
  www/js/cloud.js     вход и облако
  brandbook/          этот брендбук</code></pre>
    <h3>Команды</h3>
    <pre><code>npm run serve      открыть приложение в браузере
npm test           проверить разбор фраз
npm run icons      пересобрать иконку приложения
npm run brandbook  собрать этот файл</code></pre>`);

  /* ---------- сборка страницы ---------- */
  function render() {
    $('#bb').innerHTML = sections.map(s => s.html).join('');
    $('#colorBody').innerHTML = colorHtml();
    $('#bbNav').innerHTML = sections.map(s => `<a href="#${s.id}">${s.title.split(' ')[0] === 'Знак' ? 'Знак' : s.title}</a>`).join('');
    // иконки
    $('#icGrid').innerHTML = Object.keys(MD.IC).map(k => `<div class="ic-c">${MD.icon(k)}<span>${k}</span></div>`).join('');
    $('#icBig').innerHTML = MD.icon('sofa');
    const cats = [...MD.CATS.expense, ...MD.CATS.income.filter(c => c[0] === 'Зарплата' || c[0] === 'Подработка' || c[0] === 'Возврат')];
    $('#catGrid').innerHTML = cats.map(c => `<div class="bb-card pose" style="padding:12px 6px"><span class="ci" style="--c:${c[2]}">${MD.icon(c[1])}</span><b style="font-size:13.5px">${esc(c[0])}</b></div>`).join('');
    const ico = $('#icoA'); if (ico) ico.src = (window.BB_ICON || '../www/icon.png');
  }
  $('#heroMascot').innerHTML = MD.mascot('hero', 170);
  render();

  /* копирование цвета */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const v = b.dataset.copy;
    const done = () => { b.classList.add('copied'); const old = b.textContent; b.textContent = 'Скопировано'; setTimeout(() => { b.textContent = old; b.classList.remove('copied'); }, 1100); };
    if (navigator.clipboard) navigator.clipboard.writeText(v).then(done).catch(() => { const t = document.createRange(); t.selectNodeContents(b); const s = getSelection(); s.removeAllRanges(); s.addRange(t); });
  });

  /* переключатель темы */
  const setTheme = t => {
    if (t) root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    [['thLight', 'light'], ['thDark', 'dark'], ['thAuto', '']].forEach(([id, v]) => $('#' + id).setAttribute('aria-checked', String((v || '') === (t || ''))));
    $('#colorBody').innerHTML = colorHtml();
  };
  $('#thLight').addEventListener('click', () => setTheme('light'));
  $('#thDark').addEventListener('click', () => setTheme('dark'));
  $('#thAuto').addEventListener('click', () => setTheme(''));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { $('#colorBody').innerHTML = colorHtml(); });
})();
