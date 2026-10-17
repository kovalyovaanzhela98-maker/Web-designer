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
    ['angry', 'Сердится', 'Достигнут лимит']
  ];
  const fin = (p, s) => MD.mascot(p, s);
  sec('character', 'Фин', 'Пушистый кремовый друг с зелёным листом на макушке и длинными ушками. Он не считает за тебя, он рядом: радуется, слушает, сочувствует. Деньги в приложении выглядят спокойно, потому что рядом он. Цвета его реплик — кремовый и травяной зелёный (<code>--cream</code>, <code>--accent</code>).',
    `<div class="bb-grid c3">${POSES.map(p => `<div class="bb-card pose">${fin(p[0], 104)}<b>${p[1]}</b><span>${p[2]}</span></div>`).join('')}</div>
    <h3>Виды</h3>
    <div class="bb-demo row" style="justify-content:space-around">${['hello', 'think', 'joy', 'sleepy'].map(k => fin(k, 120)).join('')}</div>
    <p class="bb-cap">Одна и та же форма в разных настроениях: новые позы рисуй с теми же пропорциями, ушками и листом.</p>
    <h3>Фин говорит</h3>
    <div class="bb-demo">${MD.say('think', 'На 17% больше, чем в прошлом месяце<small>Чаще всего: «Одежда». Посмотри, можно ли там сэкономить.</small>', 84)}</div>
    <p class="bb-cap">Фин комментирует деньги репликой в облачке: главная, статистика, помощник. Облачко кремово-зелёное (<code>--accent-bg</code>), без тени. Заголовок реплики короткий, пояснение под ним мелким. Реплика меняется мягким проявлением за 0,18 с. Поза подбирается под смысл: радость, раздумье, удивление. Код: <code>MD.say(поза, текст, размер)</code>. Тосты тоже с Фином: <code>toast(текст, null, null, поза)</code>.</p>
    <h3>Из чего он состоит</h3>
    <div class="bb-grid c2">
      <div class="bb-card"><h4>Тельце</h4><p>Мягкий кремовый шарик с едва заметным пушком по краю. Без острых углов и жёстких контуров.</p></div>
      <div class="bb-card"><h4>Лист и ушки</h4><p>Один большой лист-росток на макушке и два длинных ушка, которые переходят из травяного зелёного в кремовый. Это его силуэт, по нему узнают издалека.</p></div>
      <div class="bb-card"><h4>Глаза</h4><p>Крупные тёмные блестящие глаза с бликами и лёгким зелёным оттенком. Щёчки розовые, рот маленький.</p></div>
      <div class="bb-card"><h4>Характер</h4><p>Добрый, спокойный, любопытный. Не ругает за траты и не хвастается за накопления. Эмоции показывает позой и лицом, а не длинной фразой.</p></div>
    </div>
    <h3>Как использовать</h3>
    <div class="dos">
      <div class="yes"><b>Можно</b>Маленьким рядом с приветствием, крупным на входе и в пустых экранах, в сообщениях об ошибке. Один Фин на экран. Размер не меньше 44 пикселей. Фин не покачивается и не прыгает: на экране он стоит спокойно, меняется только поза.</div>
      <div class="no"><b>Нельзя</b>Растягивать, красить в другие цвета, убирать лист, заливать им фон, добавлять ему лишние детали вроде очков в обычных экранах.</div>
    </div>
    <h3>Файлы</h3>
    <p>Картинки лежат в <code>www/img/fin</code>, один файл на позу, прозрачный фон. Новую позу добавляй туда и в список <code>POSES</code> в <code>www/js/mascot.js</code>. Сейчас файлы небольшие (до 350 пикселей), для крупных мест нужны оригиналы в высоком разрешении.</p>`);

  /* ---------- 2. Логотип ---------- */
  sec('logo', 'Знак и иконка', 'Знак приложения — подмигивающий Фин на тёмно-зелёном фоне. Узнаётся и в мелком размере: большой глаз, лист и румянец.',
    `<div class="bb-grid c3">
      <div class="bb-card pose"><img src="" alt="" id="icoA" width="104" height="104" style="border-radius:24px"><b>Иконка</b><span>Скруглённый квадрат, тёмно-зелёный фон</span></div>
      <div class="bb-card pose"><div style="width:104px;height:104px;border-radius:50%;background:#1A3125;display:grid;place-items:center;overflow:hidden">${fin('hello', 84)}</div><b>Круглая</b><span>Для круглых масок Android</span></div>
      <div class="bb-card pose"><div style="width:104px;height:104px;border-radius:24px;background:var(--field);display:grid;place-items:center">${fin('hello', 84)}</div><b>Только Фин</b><span>На белом фоне, без тёмного фона</span></div>
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
  /* [токен, название, описание, на каком фоне считаем контраст] — только то, что есть в www/tokens.css */
  const COLORS = [
    ['--bg', 'Фон', 'Белая подложка экранов. В тёмной теме тёмно-зелёная.', '--text'],
    ['--surface', 'Плашка', 'Карточки и листы. На светлом фоне такие же белые, отделяются мягкой тенью.', '--text'],
    ['--field', 'Поле', 'Фон дорожек, сегментов, чипов и неактивных кнопок.', '--text'],
    ['--text', 'Чернила', 'Основной текст, заголовки, обводка выбранного.', '--bg'],
    ['--muted', 'Второстепенный', 'Подписи, примечания, неактивные табы.', '--bg'],
    ['--ph', 'Подсказка', 'Текст-подсказка в полях ввода.', '--surface'],
    ['--line', 'Линия', 'Разделители внутри карточек. Всегда тонкая, без текста поверх.', null],
    ['--btn', 'Главная кнопка', 'Тёмные чернила. Главные кнопки нейтральные, не цветные.', '--on-btn'],
    ['--accent', 'Акцент', 'Зелёный лист: кнопка «+», микрофон, прогресс целей.', '--cream'],
    ['--accent-t', 'Акцент в тексте', 'Активный таб, слово-акцент в реплике Фина, процент цели.', '--accent-bg'],
    ['--cream', 'Крем', 'Цвет Фина. Значок на кнопке «+». На тёмной теме чуть приглушён.', '--accent'],
    ['--accent-bg', 'Фон реплики', 'Облачко Фина, подсветка микрофона. Не заливка экранов и не фон кнопок.', '--text'],
    ['--inc', 'Доход', 'Заливка значков и полос. Для текста берём --inc-t.', '--bg'],
    ['--exp', 'Расход', 'Заливка значков и полос. Для текста берём --exp-t.', '--bg'],
    ['--focus', 'Фокус', 'Обводка 2 px у выбранного с клавиатуры.', '--bg']
  ];
  const isHex = v => /^#[0-9a-f]{3,6}$/i.test(v);
  function swatches() {
    return `<div class="bb-grid c4">${COLORS.map(([t, n, d, on]) => {
      const v = tok(t), o = on && tok(on);
      const hx = isHex(v), ok = hx && o && isHex(o);
      const fg = hx ? (ratio(v, '#FFFFFF') > ratio(v, '#1F2B20') ? '#fff' : '#1F2B20') : 'var(--text)';
      const rr = ok ? ratio(v, o) : 0;
      return `<div class="swc"><div class="swc-c" style="background:var(${t});color:${fg}">${n}</div><div class="swc-b"><b>${n}</b><small>${d}</small><code class="tk">${t}</code>${hx ? `<button type="button" data-copy="${v}" aria-label="Скопировать ${v}">${v.toUpperCase()}</button>` : `<span class="hexv">${esc(v)}</span>`}${ok ? `<small>Контраст ${rr.toFixed(1)}:1 · ${badge(rr)}</small>` : ''}</div></div>`;
    }).join('')}</div>`;
  }
  function pairs() {
    const P = [['--inc', '--inc-bg', '--inc-t', 'Доход'], ['--exp', '--exp-bg', '--exp-t', 'Расход']];
    return `<div class="pair">${P.map(([f, bg, t, n]) => `<div style="background:var(${bg});color:var(${t})"><span>${n}</span><span>${tok(t).toUpperCase()}</span></div>`).join('')}</div>`;
  }
  /* Значения токенов в обеих темах (временно переключаем тему на корне, ничего не рисуется) */
  const TOKEN_NAMES = ['--bg', '--surface', '--field', '--text', '--muted', '--ph', '--btn', '--on-btn', '--accent', '--accent-t', '--cream', '--accent-bg', '--inc-t', '--inc-bg', '--exp-t', '--exp-bg', '--focus'];
  function themeVals(theme) {
    const prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', theme);
    const cs = getComputedStyle(root), o = {};
    TOKEN_NAMES.forEach(n => { o[n] = cs.getPropertyValue(n).trim(); });
    if (prev === null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', prev);
    return o;
  }
  /* [пара, текст, фон, минимум]: 4,5 для текста, 3 для значков и полос */
  const CONTRAST = [
    ['Основной текст на фоне', '--text', '--bg', 4.5],
    ['Второстепенный текст на фоне', '--muted', '--bg', 4.5],
    ['Подсказка в поле', '--ph', '--surface', 4.5],
    ['Доход, текст на плашке', '--inc-t', '--surface', 4.5],
    ['Расход, текст на плашке', '--exp-t', '--surface', 4.5],
    ['Доход на своей подложке', '--inc-t', '--inc-bg', 4.5],
    ['Расход на своей подложке', '--exp-t', '--exp-bg', 4.5],
    ['Главная кнопка', '--on-btn', '--btn', 4.5],
    ['Текст реплики Фина', '--text', '--accent-bg', 4.5],
    ['Слово-акцент в реплике', '--accent-t', '--accent-bg', 4.5],
    ['Активный таб', '--accent-t', '--surface', 4.5],
    ['Значок на кнопке «+»', '--cream', '--accent', 3],
    ['Полоса прогресса на дорожке', '--accent', '--field', 3],
    ['Рамка фокуса', '--focus', '--bg', 3]
  ];
  function contrastTable() {
    const L = themeVals('light'), D = themeVals('dark');
    const cell = (V, f, b, min) => {
      const r = ratio(V[f], V[b]), good = r >= min;
      return `<td class="${good ? 'okc' : 'lowc'}">${r.toFixed(1)}:1 <small>${r >= 7 ? 'AAA' : good ? 'AA' : 'ниже ' + min}</small></td>`;
    };
    return `<div class="tb-wrap"><table class="tb ct"><thead><tr><th>Пара</th><th>Светлая</th><th>Тёмная</th></tr></thead><tbody>${CONTRAST.map(([n, f, b, min]) => `<tr><td>${n}<small class="pr">${f} на ${b}${min === 3 ? ' · нужно 3:1' : ''}</small></td>${cell(L, f, b, min)}${cell(D, f, b, min)}</tr>`).join('')}</tbody></table></div>`;
  }
  function colorHtml() {
    return `${swatches()}
    <h3>Где живёт акцент</h3>
    <p>Зелёно-кремовый акцент стоит ровно в пяти местах. Больше им ничего не красим: ни фоны экранов, ни главные кнопки, ни заголовки.</p>
    <div class="bb-demo">
      <div class="acc-row">
        <div class="acc-it"><span class="nav-add static" aria-hidden="true">${MD.icon('plus')}</span><small>Кнопка «+»</small></div>
        <div class="acc-it"><span class="cb-mic" aria-hidden="true">${MD.icon('mic')}</span><small>Микрофон</small></div>
        <div class="acc-it"><span class="goal-pct">64%</span><small>Прогресс целей</small></div>
        <div class="acc-it"><span class="act-tab">${MD.icon('home')}Главная</span><small>Активный таб</small></div>
      </div>
      ${MD.say('love', 'Реплика Фина<small>Облачко цвета <code>--accent-bg</code>, слово-акцент <em>зелёным</em>.</small>', 56)}
    </div>
    <h3>Главная кнопка нейтральная</h3>
    <div class="bb-demo row"><button class="btn primary" type="button">Сохранить</button><span class="bb-cap">Цвет <code>--btn</code>: тёмные чернила на светлой теме, светлые на тёмной.</span></div>
    <h3>Смысловые цвета</h3>
    <p>Зелёный — пришло, красный — потрачено. Они не бренд и не акцент: ими нельзя красить кнопки и украшения. Для текста берём тёмные варианты (<code>--inc-t</code>, <code>--exp-t</code>), заливки и полосы отдельно.</p>
    ${pairs()}
    <h3>Цвета категорий</h3>
    <p>У каждой категории свой цвет. Он идёт в значок на мягкой подложке и в кольцевую диаграмму. Список лежит в <code>www/js/categories.js</code>.</p>
    <div class="bb-demo row">${[...MD.CATS.expense, ...MD.CATS.income.filter(c => c[0] !== 'Другое' && c[0] !== 'Подарок')].map(c => `<span class="chip"><span class="dot" style="background:${c[2]}"></span>${esc(c[0])}</span>`).join('')}</div>
    <h3>Контраст в обеих темах</h3>
    <p>Мелкий текст не ниже 4,5 к 1, значки и полосы не ниже 3 к 1. Таблица считается из живых токенов, обе темы сразу.</p>
    ${contrastTable()}
    <h3>Светлая и тёмная темы</h3>
    <p>Тёмная тема не инверсия: фон глубокого лесного зелёного, плашки чуть светлее, та же логика (тень для карточек, обводка для полей). Зелёный акцент приглушён: заливка <code>--accent</code> темнее, текстовый <code>--accent-t</code> светлее, чтобы читаться. Переключатель вверху страницы показывает оба набора. Меняй значения в <code>www/tokens.css</code>, там обе темы рядом.</p>`;
  }
  sec('color', 'Цвет', 'Фон и плашки белые. Характер дают зелёный лист и крем Фина, и только в нескольких местах. Золота и монеты в системе больше нет, остальное служит смыслу.', '<div id="colorBody"></div>');

  /* ---------- 4. Шрифты ---------- */
  sec('type', 'Шрифты', 'Две гарнитуры, обе с кириллицей, лежат в приложении офлайн. Размеров ровно три.',
    `<div class="bb-grid c2">
      <div class="bb-card"><div class="spec-d spec-big">Аа 6 545</div><h4 style="margin-top:12px">Wix Madefor Display</h4><p>Заголовки и суммы. Округлая, дружелюбная, цифры ровные и узнаваемые. Веса 600–700.</p></div>
      <div class="bb-card"><div class="spec-t spec-big" style="font-weight:600">Аа 6 545</div><h4 style="margin-top:12px">Golos Text</h4><p>Весь текст интерфейса: подписи, примечания, кнопки, подсказки. Создан для экранов, хорошо читается мелко. Веса 500–700.</p></div>
    </div>
    <h3>Шкала: три размера</h3>
    <div class="scale">
      <div><small>Заголовок экрана и сумма баланса<br><code>--fs-title</code> 28 · 700 · display</small><span class="spec-d" style="font-size:var(--fs-title);font-weight:700;letter-spacing:-.02em">6 545,10 <span style="font-size:var(--fs-cap);font-weight:500;color:var(--muted);letter-spacing:0">Br</span></span></div>
      <div><small>Карточка: заголовок, строка, кнопка<br><code>--fs-card</code> 16 · 600–700 · text или display</small><span style="font-size:var(--fs-card);font-weight:600">Продукты</span></div>
      <div><small>Подпись и примечание<br><code>--fs-cap</code> 13 · 500–600 · text</small><span style="font-size:var(--fs-cap);color:var(--muted);font-weight:500">Евроопт: молоко, хлеб, сыр</span></div>
    </div>
    <p>Больше размеров нет. Нужен акцент — меняем вес или цвет, а не размер. Валюту рядом с суммой пишем подписью (13), заголовок раздела внутри экрана — размером карточки (16, жирнее).</p>
    <h3>Правила для чисел</h3>
    <p>Суммы всегда с пробелом между тысячами, запятой для копеек и знаком валюты: <b class="spec-d" style="font-size:var(--fs-card);white-space:nowrap">1 250,50 Br</b>. Минус настоящий «−», не дефис. Рядом стоящие суммы выравниваются по цифрам (<code>tabular-nums</code>).</p>`);

  /* ---------- 5. Отступы и формы ---------- */
  const RD = [['--r-sm', '12'], ['--r-md', '16'], ['--r-lg', '20'], ['--r-pill', '999']];
  sec('space', 'Отступы и формы', 'Два шага: 16 между блоками (<code>--gap</code>) и 12 внутри карточек (<code>--pad</code>). Слева и справа на экране тоже 16.',
    `<div class="bb-demo gapdemo">
      <div class="card gd-card"><span class="gd-in"><b>Блок</b><small>12 внутри: <code>--pad</code></small></span></div>
      <div class="gd-mark"><i></i><code>--gap</code> 16</div>
      <div class="card gd-card"><span class="gd-in"><b>Следующий блок</b><small>Между блоками 16</small></span></div>
    </div>
    <h3>Скругления</h3>
    <div class="rd">${RD.map(([t, v]) => `<div style="border-radius:var(${t})"><code>${t}</code>${v === '999' ? 'круг' : v}</div>`).join('')}</div>
    <p style="margin-top:12px">Чем крупнее объект, тем больше скругление: плашки и карточки 20 (<code>--r-lg</code>), поля и кнопки 16, мелкие элементы 12, чипы-таблетки и круглые кнопки полностью круглые. Это та же мягкость, что у Фина.</p>
    <h3>Тень и обводка</h3>
    <p>Фон белый и плашки белые, поэтому границу задаёт одно из двух, и всегда по одному правилу. Карточкам — одна мягкая тень (<code>--shadow</code>: <code>0 1px 3px</code> с 6% чёрного). Полям ввода — обводка 1 px (<code>--outline</code>). Тени «в глубину», стекла, градиентов и свечения нет.</p>
    <div class="bb-grid c2">
      <div class="bb-demo"><div class="card"><b>Карточка</b><div class="note">Тень <code>--shadow</code></div></div></div>
      <div class="bb-demo"><label class="field" style="margin-top:0"><input type="text" placeholder=" " value="Евроопт"><span>Заметка</span></label><div class="note" style="margin-top:0">Обводка <code>--outline</code></div></div>
    </div>
    <h3>Размеры касания</h3>
    <p>Любая нажимаемая вещь не меньше 44 пикселей по короткой стороне. Если значок мельче, невидимая область вокруг него добирает до 44. Нижнее меню 64, центральная кнопка «+» 56.</p>`);

  /* ---------- 6. Иконки ---------- */
  sec('icons', 'Иконки', 'Собственный набор, не из библиотек. Контурные, одной линией толщиной 2 px, на сетке 24 на 24, без заливок.',
    `<div class="bb-grid c2" style="align-items:center"><div class="ic-big" id="icBig"></div><div>
      <p>Только контур: линия 2 px везде, концы и углы круглые (<code>stroke-linecap: round</code>). Заливок нет, второго тона нет, тонких штрихов отдельной толщины тоже нет. Размер 24, в мелких местах 16–20, линия остаётся 2.</p>
      <p>Точка — это кружок радиусом 0,6 с той же линией. Метафоры простые и предметные: диван, автобус, билет, корзина. Цвет иконки — цвет текста вокруг (<code>currentColor</code>).</p></div></div>
    <h3>Весь набор</h3>
    <div class="ic-grid" id="icGrid"></div>
    <h3>Как добавить новую</h3>
    <pre><code>// www/js/icons.js, внутри объекта IC: только контур, без классов и заливок
moto: '&lt;circle cx="7" cy="16" r="3"/&gt;&lt;circle cx="17" cy="16" r="3"/&gt;&lt;path d="M7 16h4l3-6h3"/&gt;',</code></pre>
    <p>Толщину и концы линии задаёт один стиль <code>svg.ic</code> в <code>app.css</code>, в самих путях их не пишем. Новые иконки подхватятся приложением и этой страницей без доработок. Для категории достаточно указать имя иконки в <code>categories.js</code>.</p>
    <h3>Категории</h3>
    <div class="bb-grid c4" id="catGrid"></div>`);

  /* ---------- 7. Компоненты ---------- */
  function row(cat, note, amt, kind, ic, c) {
    return `<div class="swipe"><div class="tx"><div class="tx-ic" style="--c:${c}">${MD.icon(ic)}</div><div class="tx-body"><div class="tx-t">${cat}</div>${note ? `<div class="tx-n">${note}</div>` : ''}</div><div class="tx-r"><div class="tx-a ${kind}">${amt}</div></div></div></div>`;
  }
  const payRow = (ic, c, name, sub, amt, st, late) => `<div class="pay-row${late ? ' late' : ''}"><span class="pr-main"><span class="tx-ic" style="--c:${c}">${MD.icon(ic)}</span><span class="pr-b"><b>${name}</b><small>${sub}</small></span><span class="pr-r"><b>${amt}</b>${st}</span></span>${late ? '<span class="late-act">Записать</span>' : ''}</div>`;
  sec('components', 'Компоненты', 'Всё ниже нарисовано настоящими стилями приложения (<code>www/app.css</code>).',
    `<h3>Карточка, баланс и итоги</h3>
    <div class="bb-demo">
      <section class="card"><div class="bal-top"><span class="cap">Баланс</span><span class="eye">${MD.icon('eye')}</span></div><div class="bal-sum">6 545,10<small>Br</small></div></section>
      <div class="tiles"><div class="card tile inc"><small>${MD.icon('down')}<span>Пришло</span></small><b>+2 800,00<small>Br</small></b><small class="mo">в октябре</small></div><div class="card tile exp"><small>${MD.icon('up')}<span>Потрачено</span></small><b>−595,40<small>Br</small></b><small class="mo">в октябре</small></div></div>
    </div>
    <p>Карточка (<code>.card</code>): белая плашка, отступ 12, радиус 20, тень <code>--shadow</code>. Сумма баланса — размер заголовка (28), суммы в плитках — размер карточки (16).</p>
    <h3>Ближайший платёж</h3>
    <div class="bb-demo">
      <div class="card pay-next"><span class="pn-main"><span class="pn-ic">${MD.icon('calendar')}</span><span class="pn-t"><small>Ближайший платёж</small><b>Интернет 25,00 Br · завтра</b></span><span class="rw-r">${MD.icon('right')}</span></span></div>
      <div class="card pay-next late"><span class="pn-main"><span class="pn-ic">${MD.icon('calendar')}</span><span class="pn-t"><small>Пора записать</small><b>Аренда 300,00 Br · 12 октября</b></span></span><span class="late-act">Записать</span></div>
    </div>
    <p>Когда срок подошёл, плашка становится красной и называется «Пора записать»: без слов про просрочку, с кнопкой «Записать» рядом. Красный здесь мягкая подложка <code>--exp-bg</code>, не тревога.</p>
    <h3>Обязательные платежи</h3>
    <div class="bb-demo">
      <div class="card pay-sum"><span>Оплачено 1 из 3</span><b>Осталось 325,00 Br</b></div>
      <div class="card" style="padding:0 12px">
        ${payRow('phone', '#06B6D4', 'Связь', '5 октября · Связь', '20,00 Br', `<span class="st paid">${MD.icon('check')}Оплачено</span>`, false)}
        ${payRow('sofa', '#8B5CF6', 'Интернет', '18 октября · Дом', '25,00 Br', '<span class="st">Ожидает</span>', false)}
        ${payRow('sofa', '#8B5CF6', 'Аренда', '12 окт. · Дом', '300 Br', '', true)}
      </div>
    </div>
    <p>У каждого платежа отметка: «Оплачено» (зелёный текст и галочка), «Ожидает» (серый), «Пора записать» (красная подложка и кнопка).</p>
    <h3>Скажи или напиши</h3>
    <div class="bb-demo">
      <form class="qadd" onsubmit="return false"><input type="text" placeholder="Скажи или напиши: вчера такси 12" aria-label="Пример быстрой записи"><span class="qa-mic">${MD.icon('mic')}</span></form>
    </div>
    <p>Поле быстрой записи стоит на Главной. Обводка 1 px (это поле ввода), микрофон единственный цветной элемент: <code>--accent-bg</code> и <code>--accent-t</code>. Когда есть текст, микрофон заменяет тёмная кнопка с галочкой.</p>
    <h3>Всё верно?</h3>
    <div class="bb-demo">
      <div class="card" style="padding:4px 12px">
        <div class="draft-row"><span class="dr"><span class="tx-ic" style="--c:#14B8A6">${MD.icon('bus')}</span><span class="dr-b"><span class="dr-t" style="display:block">Транспорт</span><span class="tx-n">Такси</span><span class="dr-s">Вчера</span></span><span class="tx-a exp">−12,00 Br</span></span><span class="dr-x">${MD.icon('close')}</span></div>
        <div class="draft-row"><span class="dr"><span class="tx-ic" style="--c:#3B82F6">${MD.icon('cart')}</span><span class="dr-b"><span class="dr-t" style="display:block">Продукты</span><span class="dr-s">Сегодня</span></span><span class="tx-a exp">−8,40 Br</span></span><span class="dr-x">${MD.icon('close')}</span></div>
      </div>
      <div class="draft-sum"><span>Записей: 2</span><span class="e">Расход −20,40 Br</span></div>
      <button class="btn primary wide" type="button" style="margin-top:0">Всё верно · 2</button>
    </div>
    <p>После голоса или быстрой записи всегда показываем этот экран: Фин разобрал фразу, а человек подтверждает. Любую строку можно изменить или убрать, ничего не сохраняется без «Всё верно».</p>
    <h3>Реплика Фина</h3>
    <div class="bb-demo">${MD.say('think', 'На 17% больше, чем в прошлом месяце<small>Чаще всего: «Одежда».</small>', 64)}</div>
    <h3>Операции</h3>
    <div class="bb-demo"><div class="recent">
      ${row('Продукты', 'Евроопт: молоко, хлеб, сыр и ещё всякая мелочь на неделю', '−45,90 Br', 'exp', 'cart', '#3B82F6')}
      ${row('Зарплата', 'Аванс за октябрь', '+500,00 Br', 'inc', 'cash', '#1F8A5B')}
      ${row('Транспорт', '', '−12,00 Br', 'exp', 'bus', '#14B8A6')}
    </div></div>
    <p>Заголовок строки — категория, под ним заметка (до двух строк). Справа сумма, доход зелёным и «+», расход красным и «−». Значок на мягкой подложке цвета категории.</p>
    <h3>Нижнее меню</h3>
    <div class="bb-demo navdemo"><nav class="nav" aria-label="Пример меню"><button class="nav-b" type="button" aria-current="page"><span class="np">${MD.icon('home')}</span><span class="nl">Главная</span></button><button class="nav-b" type="button"><span class="np">${MD.icon('chart')}</span><span class="nl">Аналитика</span></button><span class="nav-mid"><button class="nav-add" type="button" aria-label="Добавить">${MD.icon('plus')}</button></span><button class="nav-b" type="button"><span class="np">${MD.icon('goal')}</span><span class="nl">Цели</span></button><button class="nav-b" type="button"><span class="np">${MD.icon('person')}</span><span class="nl">Профиль</span></button></nav></div>
    <p>Пять мест: Главная, Аналитика, большая приподнятая «+» по центру, Цели, Профиль. Кнопка «+» зелёная с кремовым значком (<code>.nav-add</code>), активный таб зелёный (<code>--accent-t</code>), остальные серые. Меню белое, отделено тонкой тенью сверху.</p>
    <h3>Кнопки</h3>
    <div class="bb-demo row"><button class="btn primary" type="button">Сохранить</button><button class="btn soft" type="button">Сохранить в файл</button><button class="btn ghost" type="button">Отмена</button><button class="btn danger" type="button">Удалить</button></div>
    <h3>Чипы и переключатели</h3>
    <div class="bb-demo"><div class="chips"><span class="chip" role="radio" aria-checked="true">BYN Br</span><span class="chip" role="radio" aria-checked="false">RUB ₽</span><span class="chip" role="radio" aria-checked="false">USD $</span></div>
    <div class="seg" role="radiogroup" aria-label="Пример"><button class="seg-b" type="button" role="radio" aria-checked="true">Расходы</button><button class="seg-b" type="button" role="radio" aria-checked="false">Доходы</button></div></div>
    <h3>Поля и сообщения</h3>
    <div class="bb-demo">
      <label class="field" style="margin-top:0"><input type="text" placeholder=" " value="24,50"><span>Сумма</span></label>
      <label class="field err" style="margin-top:0"><input type="text" placeholder=" " value="abc"><span>Сумма</span></label>
      <div class="msg err" style="margin-top:0">Введи сумму, например 12,50</div>
      <div class="msg ok" style="margin-top:0">Письмо отправлено. Открой его и придумай новый пароль.</div>
    </div>
    <p>Поле с подписью, которая поднимается при вводе (<code>.field</code>), обводка 1 px. При ошибке обводка красная, под полем короткая подсказка, что ввести.</p>
    <h3>Тост с действием</h3>
    <div class="bb-demo"><div class="toast"><span>Удалено</span><button type="button">Вернуть</button></div><div class="toast"><span class="toast-m">${MD.mascot('happy', 28)}</span><span>Готово, записано</span></div></div>
    <p>Тост тёмный (<code>--btn</code>), появляется снизу за 0,18 с. Если у него есть действие «Вернуть», он висит не меньше 5 секунд (в приложении 6), обычный — 4. Любое удаление отменяется тостом, а не вопросом «Вы уверены?».</p>
    <h3>Цель и прогресс</h3>
    <div class="bb-demo"><div class="goal"><span class="goal-top"><b>Отпуск</b><span class="goal-pct">64%</span></span><span class="goal-bar"><i style="display:block;width:64%"></i></span><span class="goal-sub"><span>Отложено 1 920,00 Br из 3 000,00 Br</span><span>Осталось 1 080,00 Br</span></span></div></div>
    <p>Прогресс целей — одно из пяти мест зелёного акцента: полоса <code>--accent</code> и процент <code>--accent-t</code>.</p>
    <h3>Пустой экран</h3>
    <div class="bb-demo"><div class="empty"><span class="emp-m">${MD.mascot('sleepy', 92)}</span><b>Пока пусто</b>Нажми «+» внизу и запиши первую трату<button class="btn primary" type="button">Записать трату</button></div></div>
    <p>Пустой экран не говорит «нет данных». Он объясняет, что делать дальше, и даёт кнопку: Фин дремлет, под ним одна фраза и одно действие.</p>`);

  /* ---------- 8. Голос и тексты ---------- */
  sec('voice', 'Голос и тексты', 'Приложение говорит как внимательный друг: коротко, по-человечески, на «ты». Никаких канцелярских слов.',
    `<div class="bb-grid c2">
      <div class="bb-card"><h4>Как пишем</h4><p>Короткие фразы. Кнопка — глагол, который описывает действие: «Сохранить», «Записать», «Вернуть». Радость без восклицаний.</p></div>
      <div class="bb-card"><h4>Ошибки</h4><p>Что случилось и что попробовать, с примером. Без кодов, без вины пользователя, без «к сожалению».</p></div>
      <div class="bb-card"><h4>Траты без оценок</h4><p>Фин называет факт и следующий шаг, а не ставит оценку. Он не стыдит и не пугает, ни в реплике, ни в цвете.</p></div>
      <div class="bb-card"><h4>Деньги</h4><p>Сумма, пробел, валюта. Расход со знаком «−», доход с «+». Не пишем «денежные средства».</p></div>
      <div class="bb-card"><h4>Помощник</h4><p>Не «ИИ» и не «нейросеть». Просто помощник. Он не просит ключей и не рассказывает, как устроен.</p></div>
      <div class="bb-card"><h4>Покупка</h4><p>Платных тарифов нет. Есть одна разовая покупка «Фин Навсегда»: заплатил один раз, никаких списаний по месяцам. Так и пишем.</p></div>
    </div>
    <h3>Было и стало</h3>
    <div class="tb-wrap"><table class="tb"><thead><tr><th>Не так</th><th>Так</th></tr></thead><tbody>
      <tr><td class="bad">Операция успешно добавлена</td><td class="good">Готово, записано</td></tr>
      <tr><td class="bad">Нет данных</td><td class="good">Пока пусто. Нажми «+» и запиши первую трату</td></tr>
      <tr><td class="bad">Ошибка ввода</td><td class="good">Не расслышал. Попробуй так: вчера такси 12</td></tr>
      <tr><td class="bad">Введите корректное значение</td><td class="good">Введи сумму, например 12,50</td></tr>
      <tr><td class="bad">Удалить запись безвозвратно?</td><td class="good">Удалено · Вернуть</td></tr>
      <tr><td class="bad">Ошибка авторизации (401)</td><td class="good">Почта или пароль не подходят. Проверь и попробуй ещё раз.</td></tr>
      <tr><td class="bad">Сетевая ошибка</td><td class="good">Нет связи. Данные сохранятся на телефоне</td></tr>
      <tr><td class="bad">Подтвердите введённые данные</td><td class="good">Всё верно?</td></tr>
    </tbody></table></div>
    <h3>Слова</h3>
    <div class="bb-grid c3">
      <div class="bb-card"><h4>Пришло · Потрачено</h4><p>Итоги месяца. Не «поступления» и «расходы» в одном ряду.</p></div>
      <div class="bb-card"><h4>Заметка</h4><p>Поле, где пишут, на что потрачено или откуда пришло.</p></div>
      <div class="bb-card"><h4>Пора записать</h4><p>Когда срок обязательного платежа подошёл. Спокойно и с действием.</p></div>
    </div>`);

  /* ---------- 9. Движение и доступность ---------- */
  sec('motion', 'Движение и доступность', 'Движение только функциональное: оно показывает, что произошло. Декоративных анимаций нет.',
    `<div class="bb-grid c3">
      <div class="bb-card"><h4>Появился тост</h4><p>Проявляется и поднимается на 8 px. <code>--dur</code> 0,18 с, ease-out.</p></div>
      <div class="bb-card"><h4>Переключился таб</h4><p>Экран проявляется, сдвигаясь на 6 px. Те же 0,18 с, ease-out.</p></div>
      <div class="bb-card"><h4>Сменилась реплика Фина</h4><p>Новая реплика мягко проявляется. 0,18 с, ease-out.</p></div>
    </div>
    <p>Это всё. Длительность всегда в пределах 150–200 мс, кривая одна (<code>--ease</code>, ease-out). Нет покачивания Фина, конфетти, подсчёта суммы «от нуля» и пружинных кнопок. Если в телефоне выключены анимации, приложение их не проигрывает вовсе.</p>
    <h3>Жесты</h3>
    <div class="bb-grid c2">
      <div class="bb-card"><h4>Свайп влево</h4><p>Удаляет операцию. Дальше 96 пикселей уходит, ближе возвращается. Сразу появляется тост «Удалено · Вернуть».</p></div>
      <div class="bb-card"><h4>Кнопка «Назад»</h4><p>Закрывает лист, из вкладки возвращает на главную, из шага входа — к выбору способа.</p></div>
    </div>
    <h3>Доступность</h3>
    <div class="bb-grid c2">
      <div class="bb-card"><h4>Контраст</h4><p>Мелкий текст не ниже 4,5 к 1, значки и полосы не ниже 3 к 1. Для смысловых цветов в тексте берём тёмные варианты. Таблица в разделе «Цвет».</p></div>
      <div class="bb-card"><h4>Фокус и экран чтения</h4><p>Фокус всегда виден: обводка 2 px цвета <code>--focus</code> с отступом 2. У значков есть подписи, у строк операций — полное описание с суммой.</p></div>
      <div class="bb-card"><h4>Касание</h4><p>Всё нажимаемое не меньше 44 px по короткой стороне.</p></div>
      <div class="bb-card"><h4>Скрыть суммы</h4><p>Значок глаза в карточке баланса прячет все суммы, чтобы можно было открыть приложение при людях.</p></div>
    </div>`);

  /* ---------- 10. Как расширять ---------- */
  sec('extend', 'Как добавлять новое', 'Дизайн-система живёт в нескольких файлах. Новое добавляется в одном месте и появляется везде.',
    `<ul class="steps">
      <li><b>Новая категория</b><span>1. Добавь строку в <code>www/js/categories.js</code> (название, иконка, цвет). 2. Если иконки нет, нарисуй её в <code>icons.js</code>. 3. Впиши ключевые слова в <code>www/js/parser.js</code> и добавь проверку в <code>tests/parser.test.js</code>. Брендбук обновится сам.</span></li>
      <li><b>Новая иконка</b><span>Сетка 24, только контур, линия 2 px с круглыми концами, без заливок и второго тона. Без острых углов.</span></li>
      <li><b>Новая поза Фина</b><span>Положи PNG в <code>www/img/fin</code> и добавь строку в <code>POSES</code> в <code>www/js/mascot.js</code>. Фон прозрачный, лист и ушки целиком в кадре.</span></li>
      <li><b>Новый цвет или размер</b><span>Только через токены в <code>www/tokens.css</code>, сразу для светлой и тёмной темы. Размеров текста ровно три (<code>--fs-title</code>, <code>--fs-card</code>, <code>--fs-cap</code>), новых не заводим. В стилях не пишем цвета руками.</span></li>
      <li><b>Новый экран</b><span>Секция с классом <code>screen</code>: сверху <code>hdr</code>, дальше блоки. Отступы между блоками даёт сама секция (<code>--gap</code>, 16 px), внутри карточки <code>--pad</code> (12 px). Карточке — тень, полю ввода — обводка.</span></li>
      <li><b>Новое движение</b><span>Только если оно показывает, что произошло, и укладывается в 150–200 мс ease-out. Декоративные анимации не добавляем.</span></li>
      <li><b>Новый текст</b><span>Сверяй с таблицей «Было и стало»: на «ты», коротко, что случилось и что делать.</span></li>
    </ul>
    <h3>Структура</h3>
    <pre><code>moi-dengi/
  www/tokens.css      токены: цвет, шрифты, три размера текста, отступы, радиусы
  www/app.css         компоненты и экраны
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
    const gl = Array.from({ length: 23 }, (_, i) => `<path d="M${i + 1} 0V24M0 ${i + 1}H24"/>`).join('');
    $('#icBig').innerHTML = `<svg viewBox="0 0 24 24" class="ic-grid-bg" aria-hidden="true">${gl}</svg>` + MD.icon('sofa');
    const cats = [...MD.CATS.expense, ...MD.CATS.income.filter(c => c[0] === 'Зарплата' || c[0] === 'Подработка' || c[0] === 'Возврат')];
    $('#catGrid').innerHTML = cats.map(c => `<div class="bb-card pose cat-c"><span class="ci" style="--c:${c[2]}">${MD.icon(c[1])}</span><b>${esc(c[0])}</b></div>`).join('');
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
