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
