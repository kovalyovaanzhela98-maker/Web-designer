/* Собирает брендбук в один самодостаточный файл (шрифты, стили, иконки, персонаж — внутри).
   node scripts/build-brandbook.js                  → brandbook/brandbook.html (полный документ)
   node scripts/build-brandbook.js --fragment FILE  → то же без <html>/<head>/<body> (для публикации страницей) */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), www = path.join(root, 'www'), bb = path.join(root, 'brandbook');
const read = p => fs.readFileSync(p, 'utf8');
const fonts = css => css.replace(/url\(fonts\/([^)]+)\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(www, 'fonts', f)).toString('base64')})`);
const css = fonts(read(path.join(www, 'tokens.css'))) + '\n' + read(path.join(www, 'style.css')) + '\n' + read(path.join(bb, 'brandbook.css'));
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(www, 'icon.png')).toString('base64');
const finDir = path.join(www, 'img', 'fin');
const finData = Object.fromEntries(fs.readdirSync(finDir).filter(f => f.endsWith('.png')).map(f => [f.replace('.png', ''), 'data:image/png;base64,' + fs.readFileSync(path.join(finDir, f)).toString('base64')]));
const js = [`window.BB_ICON=${JSON.stringify(icon)};`, `window.FIN_DATA=${JSON.stringify(finData)};`, ...['icons', 'mascot', 'categories'].map(n => read(path.join(www, 'js', n + '.js'))), read(path.join(bb, 'brandbook.js'))].join('\n;\n');
const src = read(path.join(bb, 'index.html'));
const body = src.slice(src.indexOf('<body class="bb">') + '<body class="bb">'.length, src.lastIndexOf('</body>')).replace(/<script[^>]*><\/script>\s*/g, '');
const title = 'Брендбук Мои деньги';
const fi = process.argv.indexOf('--fragment');
if (fi > 0) {
  const out = `<title>${title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>\n${css}\n</style>\n<div class="bb">${body}</div>\n<script>\n${js}\n</script>\n`;
  fs.writeFileSync(process.argv[fi + 1], out); console.log('фрагмент:', process.argv[fi + 1], (out.length / 1024).toFixed(0) + ' КБ');
} else {
  const out = `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="color-scheme" content="light dark">\n<title>${title}</title>\n<style>\n${css}\n</style>\n</head>\n<body class="bb">${body}<script>\n${js}\n</script>\n</body>\n</html>\n`;
  const f = path.join(bb, 'brandbook.html'); fs.writeFileSync(f, out); console.log('готово:', f, (out.length / 1024).toFixed(0) + ' КБ');
}
