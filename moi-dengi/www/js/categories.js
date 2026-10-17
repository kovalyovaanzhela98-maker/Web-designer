/* Категории и цвета карт — единый источник для приложения и брендбука.
   Новая категория: [название, имя иконки из icons.js, цвет] + ключевые слова в parser.js. */
(function (root) {
const DEFAULTS = {
  expense: [
    ['Продукты', 'cart', '#3B82F6'], ['Кафе', 'cup', '#F59E0B'], ['Транспорт', 'bus', '#14B8A6'],
    ['Дом', 'sofa', '#8B5CF6'], ['Здоровье', 'heart', '#EF4444'], ['Одежда', 'shirt', '#EC4899'],
    ['Связь', 'phone', '#06B6D4'], ['Подписки', 'repeat', '#6366F1'], ['Подарки', 'gift', '#F97316'],
    ['Развлечения', 'ticket', '#EAB308'], ['Кредиты', 'bank', '#64748B'], ['Переводы', 'swap', '#0EA5E9'],
    ['Налоги', 'tax', '#B45309'], ['Банк', 'receipt', '#475569'], ['Техника', 'laptop', '#0F766E'], ['Другое', 'grid', '#94A3B8']
  ],
  income: [
    ['Зарплата', 'cash', '#1F8A5B'], ['Подработка', 'case', '#14B8A6'], ['Подарок', 'gift', '#F97316'],
    ['Возврат', 'undo', '#3B82F6'], ['Переводы', 'swap', '#0EA5E9'], ['Другое', 'grid', '#94A3B8']
  ]
};
/* Рабочий список: значения по умолчанию плюс правки человека. Тот же объект, что видит приложение: меняется на месте. */
const CATS = { expense: [], income: [] };
const ICONS = ['cart', 'cup', 'pizza', 'bus', 'car', 'plane', 'sofa', 'key', 'heart', 'aid', 'shirt', 'bag', 'phone', 'laptop', 'repeat', 'gift', 'ticket', 'game', 'music', 'book', 'school', 'baby', 'paw', 'gym', 'scissors', 'wrench', 'drop', 'bank', 'receipt', 'tax', 'wallet', 'coins', 'cash', 'case', 'swap', 'grid'];
const PALETTE = ['#3B82F6', '#14B8A6', '#10B981', '#84CC16', '#EAB308', '#F59E0B', '#F97316', '#EF4444', '#EC4899', '#8B5CF6', '#6366F1', '#64748B'];
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
    const mine = list.filter(x => x.custom && x.t === type).map(x => [x.n, x.i || 'grid', x.c || '#64748B', { key: x.k, custom: true, isNew: !!x.isNew, ts: x.ts || 0 }]);
    const fresh = mine.filter(x => x[3].isNew).sort((a, b) => b[3].ts - a[3].ts), rest = mine.filter(x => !x[3].isNew);
    CATS[type].length = 0;
    CATS[type].push(...fresh, ...out, ...rest, ['Другое', 'grid', '#94A3B8', { key: 'Другое', base: true }]);
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
  root.MD.applyCats = applyCats;
  root.MD.catAlias = catAlias;
  root.MD.COLORS = COLORS;
})(typeof window !== 'undefined' ? window : globalThis);
