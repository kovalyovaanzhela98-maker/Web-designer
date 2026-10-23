/* Подготовка web-части перед запуском/сборкой:
   1) копирует capacitor.js (мост к нативным плагинам) в www;
   2) пишет www/cloud-config.js — включает вход и облако, только если есть android-config/google-services.json. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
fs.copyFileSync(path.join(root, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(root, 'www/capacitor.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'cloud.config.json'), 'utf8'));
const enabled = fs.existsSync(path.join(root, 'android-config/google-services.json'));
fs.writeFileSync(path.join(root, 'www/cloud-config.js'),
  `/* Создаётся автоматически (scripts/prepare.js) — не править руками */\nwindow.MD_CLOUD = ${JSON.stringify({ enabled, providers: cfg.providers })};\n`);
console.log(enabled ? 'Облако включено: найден google-services.json' : 'google-services.json не найден — приложение соберётся без входа (данные только на телефоне)');
