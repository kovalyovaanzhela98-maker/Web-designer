/* Категории и цвета карт — единый источник для приложения и брендбука.
   Новая категория: [название, имя иконки из icons.js, цвет] + ключевые слова в parser.js. */
(function (root) {
const DEFAULTS = {
  expense: [
    ['Продукты', 'c_groceries', '#FF9466'], ['Кафе', 'c_cafe', '#FF9466'], ['Транспорт', 'c_transport', '#4F8CF5'],
    ['Дом', 'c_home', '#FF9466'], ['Здоровье', 'c_health', '#F25C6E'], ['Одежда', 'c_clothes', '#4F8CF5'],
    ['Связь', 'c_mobile_internet', '#8A6BEF'], ['Подписки', 'c_subscriptions', '#EE6CAF'], ['Подарки', 'c_gifts', '#F25C6E'],
    ['Развлечения', 'c_entertainment', '#F5B82E'], ['Кредиты', 'c_credit', '#8A6BEF'], ['Переводы', 'c_transfer', '#4F8CF5'],
    ['Налоги', 'c_taxes', '#8C99B0'], ['Банк', 'c_insurance', '#2EC496'], ['Техника', 'c_shopping', '#EE6CAF'], ['Другое', 'c_other', '#8A6BEF']
  ],
  income: [
    ['Зарплата', 'c_salary', '#58BB3C'], ['Подработка', 'c_freelance', '#4F8CF5'], ['Подарок', 'c_gifts', '#F25C6E'],
    ['Возврат', 'c_cashback', '#F5B82E'], ['Переводы', 'c_transfer', '#4F8CF5'], ['Другое', 'c_other', '#8A6BEF']
  ]
};
/* Рабочий список: значения по умолчанию плюс правки человека. Тот же объект, что видит приложение: меняется на месте. */
const CATS = { expense: [], income: [] };
const ICONS = (root.MD && root.MD.CAT_SLUGS || []).concat(['cart', 'cup', 'pizza', 'bus', 'car', 'plane', 'sofa', 'key', 'heart', 'aid', 'shirt', 'bag', 'phone', 'laptop', 'repeat', 'gift', 'ticket', 'game', 'music', 'book', 'school', 'baby', 'paw', 'gym', 'scissors', 'wrench', 'drop', 'bank', 'receipt', 'tax', 'wallet', 'coins', 'cash', 'case', 'swap', 'grid']);
/* Десять тонов: пользователь выбирает один из них, а не произвольный цвет. [тон, solid, фон, текст, текст в тёмной теме] */
const TONES = {
  peach: ['#FF9466', '#FFF0EA', '#99593D', '#FF9466'], coral: ['#F25C6E', '#FDE8EB', '#B24451', '#F47887'], butter: ['#F5B82E', '#FEF5E2', '#8B691A', '#F5B82E'],
  mint: ['#2EC496', '#E2F7F0', '#1D7C5F', '#2EC496'], sky: ['#4F8CF5', '#E6EFFE', '#3A67B4', '#6D9FF7'], lilac: ['#8A6BEF', '#EFEAFD', '#7057C3', '#A48BF3'],
  pink: ['#EE6CAF', '#FDEAF4', '#A64B7A', '#F07DB8'], sand: ['#CC9C63', '#F8F1E9', '#876742', '#CC9C63'], slate: ['#8C99B0', '#EFF1F4', '#626B7B', '#99A5B9'], green: ['#58BB3C', '#E8F5E4', '#377626', '#58BB3C']
};
const PALETTE = Object.keys(TONES).map(k => TONES[k][0]);
/* Тон по цвету категории; незнакомый цвет (старые данные) ближе всего к slate */
function toneOf(hex) { const h = String(hex || '').toUpperCase(); for (const k in TONES) if (TONES[k][0].toUpperCase() === h) return { name: k, solid: TONES[k][0], bg: TONES[k][1], text: TONES[k][2], textDark: TONES[k][3] }; const t = TONES.slate; return { name: 'slate', solid: /^#[0-9A-F]{6}$/.test(h) ? h : t[0], bg: t[1], text: t[2], textDark: t[3] }; }
/* cfg: [{ k, t, n, i, c, custom, isNew, ts }] — k: исходное имя (для встроенных) или id (для своих) */
function applyCats(cfg) {
  const list = Array.isArray(cfg) ? cfg : [];
  for (const type of ['expense', 'income']) {
    const out = [];
    for (const d of DEFAULTS[type]) {
      if (d[0] === 'Другое') continue;
      const o = list.find(x => !x.custom && x.t === type && x.k === d[0]);
      out.push([o && o.n ? o.n : d[0], o && o.i ? o.i : d[1], o && o.c ? o.c : d[2], { key: d[0], base: true, custom: !!(o && o.c) }]);
    }
    const mine = list.filter(x => x.custom && x.t === type).map(x => [x.n, x.i || 'grid', x.c || '#8C99B0', { key: x.k, custom: true, isNew: !!x.isNew, ts: x.ts || 0 }]);
    const fresh = mine.filter(x => x[3].isNew).sort((a, b) => b[3].ts - a[3].ts), rest = mine.filter(x => !x[3].isNew);
    CATS[type].length = 0;
    CATS[type].push(...fresh, ...out, ...rest, ['Другое', 'c_other', '#8A6BEF', { key: 'Другое', base: true }]);
  }
}
/* Имя по исходному (так отвечает разбор речи и выписок: «Кафе» → переименованное «Кофейни») */
function catAlias(type, name, cfg) {
  const o = (cfg || []).find(x => !x.custom && x.t === type && x.k === name);
  return o && o.n ? o.n : name;
}
applyCats([]);
const COLORS = [
  { bg: '#4F6F34', fg: '#FFFFFF', name: 'Лист' },
  { bg: '#2F4AA8', fg: '#FFFFFF', name: 'Синий' },
  { bg: '#1F8A5B', fg: '#FFFFFF', name: 'Изумруд' },
  { bg: '#C2364B', fg: '#FFFFFF', name: 'Красный' },
  { bg: '#7A4FD0', fg: '#FFFFFF', name: 'Фиолетовый' },
  { bg: '#D9560F', fg: '#FFFFFF', name: 'Оранжевый' },
  { bg: '#F2C230', fg: '#1F2B20', name: 'Жёлтый' },
  { bg: '#2B3345', fg: '#FFFFFF', name: 'Графитовый' }
];
  root.MD = root.MD || {};
  root.MD.CATS = CATS;
  root.MD.CAT_DEFAULTS = DEFAULTS;
  root.MD.CAT_ICONS = ICONS;
  root.MD.CAT_PALETTE = PALETTE;
  root.MD.TONES = TONES;
  root.MD.toneOf = toneOf;
  root.MD.applyCats = applyCats;
  root.MD.catAlias = catAlias;
  root.MD.COLORS = COLORS;
})(typeof window !== 'undefined' ? window : globalThis);
