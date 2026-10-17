/* Голосовой ввод: одна точка входа для формы записи и помощника.
   MD.voice.start({ onStart, onPartial(text), onEnd(text), onError(code) }) → Promise<boolean>
   MD.voice.stop()   — остановить и отдать то, что услышано (всегда приходит onEnd или onError)
   MD.voice.cancel() — выбросить запись без результата
   Коды ошибок: unsupported, unavailable, denied, nospeech, network, fail.
   Слушает, пока человек сам не нажмёт «Стоп» (пауза в речи запись не обрывает), но не дольше пяти минут или пока приложение не ушло в фон. */
(function (root) {
  'use strict';
  const MD = root.MD = root.MD || {};
  const MAX_MS = 300000;
  let session = null;

  const nativePlugin = () => {
    const c = root.Capacitor;
    if (!(c && c.isNativePlatform && c.isNativePlatform())) return null;
    try { return c.registerPlugin('SpeechRecognition'); } catch (_) { return c.Plugins && c.Plugins.SpeechRecognition || null; }
  };
  const webRecognition = () => root.SpeechRecognition || root.webkitSpeechRecognition || null;
  const supported = () => !!(nativePlugin() || webRecognition());

  /* Всё сказанное: закончившиеся отрезки плюс текущий */
  const full = s => s.parts.concat(s.text || '').map(x => String(x).trim()).filter(Boolean).join(' ').trim();
  const nextPart = s => { if (s.text) { s.parts.push(s.text); s.text = ''; } };

  function finish(s, code) {
    if (s.done) return;
    s.done = true;
    clearTimeout(s.timer); clearTimeout(s.fallback);
    if (session === s) session = null;
    const P = s.native;
    if (P) { try { P.removeAllListeners(); } catch (_) {} }
    if (s.cancelled) return;
    const text = full(s);
    if (text) { if (s.h.onEnd) s.h.onEnd(text); }
    else if (s.h.onError) s.h.onError(code || 'nospeech');
  }

  async function start(h) {
    if (session) cancel();
    const s = session = { h: h || {}, text: '', parts: [], userStop: false, done: false, cancelled: false, native: null, web: null, timer: null, fallback: null };
    const fail = code => { finish(s, code); return false; };
    const P = nativePlugin();
    if (P) {
      s.native = P;
      try {
        const av = await P.available();
        if (!av || !av.available) return fail('unavailable');
        let perm = await P.checkPermissions();
        if (!perm || perm.speechRecognition !== 'granted') perm = await P.requestPermissions();
        if (!perm || perm.speechRecognition !== 'granted') return fail('denied');
        if (s.done) return false;
        await P.removeAllListeners();
        await P.addListener('partialResults', d => {
          if (s.done) return;
          const t = d && d.matches && d.matches[0];
          if (t) { s.text = t; if (s.h.onPartial) s.h.onPartial(full(s)); }
        });
        const begin = () => P.start({ language: 'ru-RU', maxResults: 1, partialResults: true, popup: false });
        await P.addListener('listeningState', d => {
          if (!d || d.status !== 'stopped' || s.done) return;
          if (s.userStop) { finish(s, 'nospeech'); return; }
          nextPart(s);                                   // тишина оборвала отрезок: продолжаем слушать дальше
          setTimeout(() => { if (!s.done && !s.userStop) Promise.resolve(begin()).catch(() => finish(s, 'fail')); }, 150);
        });
        if (s.done) return false;
        if (s.h.onStart) s.h.onStart();
        s.timer = setTimeout(() => stop(), MAX_MS);
        await begin();
        return true;
      } catch (e) { return fail('fail'); }
    }
    const SR = webRecognition();
    if (!SR) return fail('unsupported');
    const r = new SR();
    r.lang = 'ru-RU'; r.interimResults = true; r.continuous = true;
    r.onresult = ev => {
      let t = ''; for (const x of ev.results) t += x[0].transcript;
      s.text = t.trim(); if (s.h.onPartial) s.h.onPartial(full(s));
    };
    r.onerror = ev => {
      const e = ev && ev.error;
      if (!s.userStop && (e === 'no-speech' || e === 'aborted')) return;      // пауза: onend запустит запись заново
      finish(s, e === 'not-allowed' || e === 'service-not-allowed' ? 'denied' : e === 'network' ? 'network' : e === 'no-speech' ? 'nospeech' : e === 'aborted' ? 'nospeech' : 'fail');
    };
    r.onend = () => {
      if (s.done) return;
      if (s.userStop) { finish(s, 'nospeech'); return; }
      nextPart(s);
      try { r.start(); } catch (_) { finish(s, 'nospeech'); }
    };
    s.web = r;
    try { r.start(); } catch (e) { return fail('fail'); }
    if (s.h.onStart) s.h.onStart();
    s.timer = setTimeout(() => stop(), MAX_MS);
    return true;
  }

  function stop() {
    const s = session; if (!s || s.done) return;
    s.userStop = true;
    if (s.native) {
      try { Promise.resolve(s.native.stop()).catch(() => {}); } catch (_) {}
      s.fallback = setTimeout(() => finish(s, 'nospeech'), 900);      // если плагин не сообщил об остановке
    } else if (s.web) {
      try { s.web.stop(); } catch (_) {}
      s.fallback = setTimeout(() => finish(s, 'nospeech'), 900);
    } else finish(s, 'nospeech');
  }

  function cancel() {
    const s = session; if (!s) return;
    s.cancelled = true;
    try { if (s.native) Promise.resolve(s.native.stop()).catch(() => {}); } catch (_) {}
    try { if (s.web) s.web.abort(); } catch (_) {}
    finish(s);
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden && session) stop(); });

  MD.voice = { supported, start, stop, cancel, get active() { return !!session; } };
  MD.voiceMessage = code => ({
    unsupported: 'Голос здесь не работает. Нажми на поле и продиктуй через микрофон на клавиатуре.',
    unavailable: 'На этом телефоне нет распознавания речи. Нажми на поле и продиктуй с клавиатуры.',
    denied: 'Нужен доступ к микрофону. Включи его: Настройки телефона → Приложения → Фин → Разрешения.',
    network: 'Для голоса нужен интернет.',
    nospeech: 'Не расслышал. Скажи ещё раз, например: «вчера такси 12».'
  }[code] || 'Не получилось включить микрофон. Попробуй ещё раз.');
})(typeof window !== 'undefined' ? window : globalThis);
