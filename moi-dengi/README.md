# Мои деньги

Личный учёт расходов и доходов. Чистые HTML/CSS/JS + Capacitor 7 (Android). Данные — только в localStorage на устройстве.

- `www/` — само приложение (офлайн, шрифты Manrope и Unbounded лежат в `www/fonts`)
- `npm run serve` — локальный запуск на http://localhost:5173
- `npm run icons` — перерисовать иконку (нужен Python + Pillow)
- APK собирает GitHub Actions (`.github/workflows/build-apk.yml`) — артефакт `moi-dengi-apk`
