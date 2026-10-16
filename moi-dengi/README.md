# Мои деньги

Личный учёт расходов и доходов. Чистые HTML/CSS/JS + Capacitor 7 (Android). Вход (Google, почта, телефон) и облако на Firebase, помощник работает прямо на телефоне без ключей.

- `www/` — приложение: `tokens.css` (токены), `style.css` (компоненты), `js/` (иконки, персонаж, парсер фраз, вход и облако)
- `brandbook/` — брендбук: `brandbook.html` (готовый файл) и исходники
- `docs/FIREBASE.md` — как включить вход и облако
- `npm run serve` — открыть в браузере (`?mock=1` — с имитацией входа)
- `npm test` — проверка разбора фраз
- `npm run icons` — пересобрать иконку приложения
- `npm run brandbook` — пересобрать брендбук
- APK собирает GitHub Actions (`.github/workflows/build-apk.yml`), готовый файл — в разделе Releases
