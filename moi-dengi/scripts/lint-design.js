/* Проверка системы дизайна: в design.css, skin.css и nav.css разрешены только утверждённые значения. */
const fs = require('fs'), path = require('path');
const www = path.join(__dirname, '../www');
const RADII = new Set([0, 3, 10, 12, 16, 20, 24, 28, 50, 99, 999]), SPACE = new Set([48, 0, 1, 2, 3, 4, 6, 8, 12, 14, 16, 20, 24, 32, 36, 40, 44, 52, 56, 64, 76, 124]), WEIGHTS = new Set([400, 500, 600]);
let bad = 0;
for (const f of ['design.css', 'skin.css']) {
  const css = fs.readFileSync(path.join(www, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const err = m => { bad++; console.log(`✗ ${f}: ${m}`); };
  for (const m of css.matchAll(/border-radius:\s*([^;}]+)/g)) for (const v of m[1].match(/-?\d+(?:\.\d+)?(?:px|%)?/g) || []) { const n = parseFloat(v); if (/%/.test(v) || /^var/.test(v)) continue; if (!RADII.has(n)) err(`радиус ${v}`); }
  for (const m of css.matchAll(/(?:^|[;{\s])(?:padding|margin|gap)(?:-[a-z]+)?:\s*([^;}]+)/g)) for (const v of m[1].match(/(?<![\w#.-])-?\d+(?:\.\d+)?px/g) || []) { const n = Math.abs(parseFloat(v)); if (!SPACE.has(n)) err(`отступ ${v}`); }
  for (const m of css.matchAll(/font-weight:\s*(\d+)/g)) if (!WEIGHTS.has(Number(m[1]))) err(`жирность ${m[1]}`);
  if (/box-shadow:\s*(?!none|inset)[^;}]*rgba\(0,\s*0,\s*0/.test(css) && f === 'design.css') err('тень в design.css');
}
if (bad) { console.log(`\nНарушений: ${bad}`); process.exit(1); } else console.log('Система дизайна: нарушений нет');
