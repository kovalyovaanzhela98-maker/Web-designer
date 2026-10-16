/* Фин — персонаж «Мои деньги»: мягкий кремовый друг с зелёным листом-ростком и длинными ушками.
   Картинки лежат в www/img/fin (PNG с прозрачным фоном). Позы: hello, happy, joy, love, notify, think, sleepy, oops, angry (старые hero, listen, rest — псевдонимы).
   Новая поза: положи PNG в img/fin и добавь строку в POSES. Имя файла = ключ. */
(function (root) {
  'use strict';
  const BASE = root.FIN_BASE || 'img/fin/';
  const POSES = {
    hello: 'Привет: встреча, приветствие',
    happy: 'С мешочком монет: запись добавлена, доход',
    joy: 'Смеётся: всё получилось',
    love: 'С сердечком: цели и прогресс',
    notify: 'Удивлён: слушает голос, уведомления',
    think: 'Думает: нужно уточнить',
    sleepy: 'Дремлет: пустые экраны',
    oops: 'Плачет: ошибка, нет интернета',
    angry: 'Сердится: превышен лимит'
  };
  /* Старые имена поз: показывают те же картинки */
  const ALIAS = { hero: 'hello', listen: 'notify', rest: 'sleepy' };
  const EXTRA = [];
  let n = 0;
  function mascot(pose = 'hello', size = 96, label) {
    const key = POSES[pose] ? pose : (ALIAS[pose] || 'hello');
    const alt = label ? `alt="${label}"` : 'alt="" aria-hidden="true"';
    return `<img class="mascot mascot-${key}" src="${(root.FIN_DATA && root.FIN_DATA[key]) || BASE + key + '.png'}" width="${size}" height="${size}" style="object-fit:contain" ${alt} decoding="async" draggable="false">`;
  }
  /* Фин говорит: персонаж и облачко с репликой (text — готовый HTML, строки экранируй сам) */
  function say(pose, text, size = 88) {
    return `<div class="fin-say"><span class="fin-say-m">${mascot(pose, size)}</span><div class="bubble">${text}</div></div>`;
  }
  root.MD = root.MD || {};
  root.MD.say = say;
  root.MD.mascot = mascot;
  root.MD.MASCOT_POSES = Object.keys(POSES);
  root.MD.MASCOT_INFO = POSES;
  root.MD.MASCOT_EXTRA = EXTRA;
  root.MD.MASCOT_NAME = 'Фин';
})(typeof window !== 'undefined' ? window : globalThis);
