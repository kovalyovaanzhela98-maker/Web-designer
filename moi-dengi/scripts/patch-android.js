/* Правки сгенерированного Android-проекта: Google-вход, ключ подписи, google-services.json */
const fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, '..');
const vars = path.join(root, 'android/variables.gradle');
let v = fs.readFileSync(vars, 'utf8');
if (!/rgcfaIncludeGoogle/.test(v)) { v = v.replace(/ext\s*\{/, 'ext {\n    rgcfaIncludeGoogle = true'); fs.writeFileSync(vars, v); console.log('variables.gradle: включён Google-вход'); }
const gs = path.join(root, 'android-config/google-services.json');
if (fs.existsSync(gs)) { fs.copyFileSync(gs, path.join(root, 'android/app/google-services.json')); console.log('google-services.json скопирован'); }
const ks = path.join(root, 'android-config/debug.keystore');
if (fs.existsSync(ks)) { const d = path.join(os.homedir(), '.android'); fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(ks, path.join(d, 'debug.keystore')); console.log('Ключ подписи установлен (SHA-1 постоянный)'); }
/* Подпись явно прописана в app/build.gradle: иначе каждая сборка получала новый случайный ключ, и новая версия не ставилась поверх старой */
if (fs.existsSync(ks)) {
  const gp = path.join(root, 'android/app/build.gradle'); let g = fs.readFileSync(gp, 'utf8');
  if (!/fin-constant-signing/.test(g)) {
    g += `\n// fin-constant-signing\nandroid.signingConfigs.debug.storeFile = file('../../android-config/debug.keystore')\nandroid.signingConfigs.debug.storePassword = 'android'\nandroid.signingConfigs.debug.keyAlias = 'androiddebugkey'\nandroid.signingConfigs.debug.keyPassword = 'android'\n`;
    fs.writeFileSync(gp, g); console.log('build.gradle: постоянный ключ подписи прописан');
  }
}

/* ---------- Быстрая запись: виджет, плитка шторки, закреплённое уведомление ---------- */
const pkgDir = path.join(root, 'android/app/src/main/java/by/moidengi/app');
const resDir = path.join(root, 'android/app/src/main/res');
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const nativeDir = path.join(root, 'android-native');
if (fs.existsSync(nativeDir)) {
  for (const f of fs.readdirSync(path.join(nativeDir, 'java'))) fs.copyFileSync(path.join(nativeDir, 'java', f), path.join(pkgDir, f));
  const copyTree = (from, to) => { for (const e of fs.readdirSync(from, { withFileTypes: true })) { const s = path.join(from, e.name), d = path.join(to, e.name); if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyTree(s, d); } else fs.copyFileSync(s, d); } };
  copyTree(path.join(nativeDir, 'res'), resDir);
  const mf = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  let m = fs.readFileSync(mf, 'utf8');
  if (!/FinWidgetProvider/.test(m)) {
    const filter = '            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="fin" android:host="add" />\n            </intent-filter>\n';
    m = m.replace(/(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?)(\n\s*<\/activity>)/, (all, a, b) => a + '\n' + filter + b.replace(/^\n/, ''));
    const extra = fs.readFileSync(path.join(nativeDir, 'manifest-extra.xml'), 'utf8');
    m = m.replace('</application>', extra + '\n    </application>');
    fs.writeFileSync(mf, m);
    console.log('Манифест: ссылка fin://add, виджет, плитка, загрузка после перезагрузки');
  }
  console.log('Нативная быстрая запись установлена');
}

/* Номер версии растёт с каждой сборкой: Android ставит новую поверх старой как обновление */
const gradle = path.join(root, 'android/app/build.gradle');
if (fs.existsSync(gradle)) {
  const code = parseInt(process.env.GITHUB_RUN_NUMBER || '', 10) || 1;
  let g = fs.readFileSync(gradle, 'utf8');
  g = g.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "1.0.${code}"`);
  fs.writeFileSync(gradle, g);
  console.log('versionCode =', code);
}
