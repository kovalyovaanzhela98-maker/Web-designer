/* Категории и цвета карт — единый источник для приложения и брендбука.
   Новая категория: [название, имя иконки из icons.js, цвет] + ключевые слова в parser.js. */
(function (root) {
const CATS = {
  expense: [
    ['Продукты', 'cart', '#3B82F6'], ['Кафе', 'cup', '#F59E0B'], ['Транспорт', 'bus', '#14B8A6'],
    ['Дом', 'sofa', '#8B5CF6'], ['Здоровье', 'heart', '#EF4444'], ['Одежда', 'shirt', '#EC4899'],
    ['Связь', 'phone', '#06B6D4'], ['Подписки', 'repeat', '#6366F1'], ['Подарки', 'gift', '#F97316'],
    ['Развлечения', 'ticket', '#EAB308'], ['Другое', 'grid', '#94A3B8']
  ],
  income: [
    ['Зарплата', 'cash', '#1F8A5B'], ['Подработка', 'case', '#14B8A6'], ['Подарок', 'gift', '#F97316'],
    ['Возврат', 'undo', '#3B82F6'], ['Другое', 'grid', '#94A3B8']
  ]
};
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
  root.MD.COLORS = COLORS;
})(typeof window !== 'undefined' ? window : globalThis);
