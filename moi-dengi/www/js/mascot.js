/* Фин — персонаж «Мои деньги»: мягкий кремовый друг с зелёным листом-ростком и длинными ушками.
   Картинки лежат в www/img/fin (PNG с прозрачным фоном). Позы приложения: hello, happy, listen, think, sleepy, oops, rest.
   Новая поза: положи PNG в img/fin и добавь строку в POSES. Имя файла = ключ. */
(function (root) {
  'use strict';
  const BASE = root.FIN_BASE || 'img/fin/';
  const POSES = {
    hello: 'Привет: встреча, приветствие',
    hero: 'Фин с телефоном: вход и крупные места',
    happy: 'Радость: запись добавлена, доход',
    joy: 'Смеётся: всё получилось',
    listen: 'Слушает: идёт запись голоса',
    think: 'Думает: нужно уточнить',
    sleepy: 'Дремлет: пустые экраны',
    rest: 'Отдыхает с чашкой: нет операций',
    oops: 'Ой: ошибка, нет интернета',
    analyzing: 'Записывает: разбор и статистика',
    notify: 'С телефоном: уведомления',
    categories: 'С карточками категорий',
    expenses: 'С чеком: расходы',
    love: 'С сердечком: цели и прогресс'
  };
  const EXTRA = ['side', 'back', 'budget', 'income', 'receipt', 'wallet', 'icon'];
  let n = 0;
  function mascot(pose = 'hello', size = 96, label) {
    const key = POSES[pose] || EXTRA.indexOf(pose) >= 0 ? pose : 'hello';
    const alt = label ? `alt="${label}"` : 'alt="" aria-hidden="true"';
    return `<img class="mascot mascot-${key}" src="${(root.FIN_DATA && root.FIN_DATA[key]) || BASE + key + '.png'}" width="${size}" height="${size}" style="object-fit:contain" ${alt} decoding="async" draggable="false">`;
  }
  root.MD = root.MD || {};
  root.MD.mascot = mascot;
  root.MD.MASCOT_POSES = Object.keys(POSES).filter(k => k !== 'hero');
  root.MD.MASCOT_INFO = POSES;
  root.MD.MASCOT_EXTRA = EXTRA;
  root.MD.MASCOT_NAME = 'Фин';
})(typeof window !== 'undefined' ? window : globalThis);
