/* Облако «Мои деньги»: вход (Google / Apple / телефон / почта) и синхронизация данных между устройствами.
   На телефоне работает через нативный Firebase (плагины Capacitor). В браузере — имитация для проверки интерфейса (?mock=1).
   Данные пользователя лежат в Firestore: users/{uid} (валюта и карты) и users/{uid}/tx/{id} (операции). */
(function (root) {
  'use strict';
  const cfg = root.MD_CLOUD || { enabled: false, providers: {} };
  const Cap = root.Capacitor;
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const mock = !native && /[?&]mock=1/.test(root.location ? root.location.search : '');
  const enabled = (native && !!cfg.enabled) || mock;
  const providers = mock ? { google: true, email: true, phone: true, apple: true } : Object.assign({ google: true, email: true, phone: false, apple: false }, cfg.providers || {});

  const toUser = u => u && { uid: u.uid, email: u.email || '', phone: u.phoneNumber || u.phone || '', name: u.displayName || u.name || '' };
  const asErr = e => (e && typeof e === 'object') ? e : { message: String(e) };

  /* ---------- Нативная реализация ---------- */
  function nativeBackend() {
    const A = Cap.registerPlugin('FirebaseAuthentication');
    const F = Cap.registerPlugin('FirebaseFirestore');
    let verificationId = null;
    const api = {
      onAuth(cb) {
        A.addListener('authStateChange', ev => cb(toUser(ev && ev.user)));
        A.getCurrentUser().then(r => cb(toUser(r && r.user))).catch(() => cb(null));
      },
      signInGoogle: () => A.signInWithGoogle(),
      signInApple: () => A.signInWithApple(),
      signInEmail: (email, password) => A.signInWithEmailAndPassword({ email, password }),
      signUpEmail: (email, password) => A.createUserWithEmailAndPassword({ email, password }),
      resetPassword: email => A.sendPasswordResetEmail({ email }),
      signOut: () => A.signOut(),
      async phoneSend(phoneNumber, link) {
        const handles = [];
        try {
          await new Promise(async (resolve, reject) => {
            handles.push(await A.addListener('phoneCodeSent', ev => { verificationId = ev.verificationId; resolve(); }));
            handles.push(await A.addListener('phoneVerificationFailed', ev => reject(ev && ev.message ? { message: ev.message, code: ev.code } : ev)));
            handles.push(await A.addListener('phoneVerificationCompleted', () => resolve()));
            (link ? A.linkWithPhoneNumber({ phoneNumber }) : A.signInWithPhoneNumber({ phoneNumber })).catch(reject);
          });
        } finally { handles.forEach(h => h && h.remove && h.remove()); }
      },
      /* Привязка к уже вошедшему профилю (телефон и почта нужны, чтобы вернуть доступ) */
      linkPhoneSend(phoneNumber) { return api.phoneSend(phoneNumber, true); },
      linkPhoneConfirm: code => A.linkWithPhoneNumber({ verificationId, verificationCode: code }),
      linkEmail: (email, password) => A.linkWithEmailAndPassword({ email, password }),
      async refreshUser() { const r = await A.getCurrentUser(); return toUser(r && r.user); },
      phoneConfirm: code => A.confirmVerificationCode({ verificationId, verificationCode: code }),

      /* Синхронизация: два слушателя (карты и операции), результат отдаём вместе, когда пришли оба */
      listen(uid, handlers) {
        let meta, txs, ids = [];
        const emit = () => { if (meta === undefined || txs === undefined) return; handlers.onData({ exists: !!meta, currency: meta && meta.currency, accounts: (meta && meta.accounts) || [], goals: (meta && meta.goals) || [], tx: txs }); };
        F.addDocumentSnapshotListener({ reference: `users/${uid}` }, (ev, err) => {
          if (err) return handlers.onError && handlers.onError(err);
          meta = ev && ev.snapshot ? ev.snapshot.data : null; emit();
        }).then(id => ids.push(id));
        F.addCollectionSnapshotListener({ reference: `users/${uid}/tx` }, (ev, err) => {
          if (err) return handlers.onError && handlers.onError(err);
          txs = ((ev && ev.snapshots) || []).map(s => Object.assign({ id: s.id }, s.data)); emit();
        }).then(id => ids.push(id));
        return () => ids.forEach(id => F.removeSnapshotListener({ callbackId: id }).catch(() => {}));
      },
      async write(uid, ops) {
        const base = `users/${uid}`;
        const list = ops.map(o => o.del
          ? { type: 'delete', reference: `${base}/tx/${o.id}` }
          : o.meta ? { type: 'set', reference: base, data: o.meta }
            : { type: 'set', reference: `${base}/tx/${o.id}`, data: o.data });
        for (let i = 0; i < list.length; i += 400) await F.writeBatch({ operations: list.slice(i, i + 400) });
      }
    };
    return api;
  }

  /* ---------- Имитация для браузера ---------- */
  function mockBackend() {
    const K = 'moidengi_mock_';
    const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(K + k)) ?? d; } catch (_) { return d; } };
    const wr = (k, v) => { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (_) {} };
    let authCb = null, pendingPhone = null;
    const fail = (code, message) => Promise.reject({ code, message: message || code });
    const setUser = u => { wr('user', u); authCb && authCb(u); return Promise.resolve({ user: u }); };
    const cloudOf = uid => rd('cloud_' + uid, { meta: null, tx: {} });
    const listeners = new Set();
    const api = {
      onAuth(cb) { authCb = cb; setTimeout(() => cb(rd('user', null)), 30); },
      signInGoogle: () => setUser({ uid: 'g-demo', email: 'demo.user@gmail.com', name: 'Демо' }),
      signInApple: () => setUser({ uid: 'a-demo', email: 'demo@icloud.com', name: 'Демо' }),
      signInEmail(email, pw) {
        const users = rd('users', {});
        if (!users[email] || users[email] !== pw) return fail('auth/invalid-credential');
        return setUser({ uid: 'e-' + email, email });
      },
      signUpEmail(email, pw) {
        const users = rd('users', {});
        if (users[email]) return fail('auth/email-already-in-use');
        if (pw.length < 6) return fail('auth/weak-password');
        users[email] = pw; wr('users', users);
        return setUser({ uid: 'e-' + email, email });
      },
      resetPassword: email => rd('users', {})[email] ? Promise.resolve() : fail('auth/user-not-found'),
      signOut() { wr('user', null); authCb && authCb(null); return Promise.resolve(); },
      phoneSend(phone) { if (phone === '+1000') return fail('auth/invalid-phone-number'); pendingPhone = phone; return Promise.resolve(); },
      phoneConfirm(code) { return code === '123456' ? setUser({ uid: 'p-' + pendingPhone, phone: pendingPhone }) : fail('auth/invalid-verification-code'); },
      linkPhoneSend(phone) { if (phone === '+1000') return fail('auth/invalid-phone-number'); pendingPhone = phone; return Promise.resolve(); },
      linkPhoneConfirm(code) { if (code !== '123456') return fail('auth/invalid-verification-code'); const u = Object.assign({}, rd('user', {}), { phone: pendingPhone }); wr('user', u); return Promise.resolve({ user: u }); },
      linkEmail(email, pw) { if (pw.length < 6) return fail('auth/weak-password'); const u = Object.assign({}, rd('user', {}), { email }); wr('user', u); return Promise.resolve({ user: u }); },
      refreshUser: () => Promise.resolve(rd('user', null)),
      listen(uid, h) {
        const fire = () => { const c = cloudOf(uid); h.onData({ exists: !!c.meta, currency: c.meta && c.meta.currency, accounts: (c.meta && c.meta.accounts) || [], goals: (c.meta && c.meta.goals) || [], tx: Object.entries(c.tx).map(([id, d]) => Object.assign({ id }, d)) }); };
        const l = () => setTimeout(fire, 20); listeners.add(l); setTimeout(fire, 40);
        return () => listeners.delete(l);
      },
      async write(uid, ops) {
        const c = cloudOf(uid);
        ops.forEach(o => { if (o.del) delete c.tx[o.id]; else if (o.meta) c.meta = o.meta; else c.tx[o.id] = o.data; });
        wr('cloud_' + uid, c); listeners.forEach(l => l());
      }
    };
    return api;
  }

  /* ---------- Общая обёртка ---------- */
  const backend = !enabled ? null : (native ? nativeBackend() : mockBackend());
  const txData = t => ({ type: t.type, amount: t.amount, cat: t.cat, acc: t.acc, date: t.date, note: t.note || '', ts: t.ts || Date.now() });
  const metaData = s => ({ currency: s.currency, accounts: s.accounts, goals: s.goals || [], v: 1, updatedAt: Date.now() });
  const sig = t => JSON.stringify([t.type, t.amount, t.cat, t.acc, t.date, t.note || '']);

  /* Снимок «что уже в облаке»: нужен, чтобы отправлять только изменения */
  function snapshotOf(state) {
    return { meta: JSON.stringify([state.currency, state.accounts, state.goals || []]), tx: new Map(state.tx.map(t => [t.id, sig(t)])) };
  }
  function diff(prev, state) {
    const ops = [];
    const m = JSON.stringify([state.currency, state.accounts, state.goals || []]);
    if (m !== prev.meta) ops.push({ meta: metaData(state) });
    const seen = new Set();
    for (const t of state.tx) { seen.add(t.id); if (prev.tx.get(t.id) !== sig(t)) ops.push({ id: t.id, data: txData(t) }); }
    for (const id of prev.tx.keys()) if (!seen.has(id)) ops.push({ id, del: true });
    return ops;
  }

  root.MD = root.MD || {};
  root.MD.cloud = Object.assign({ enabled, native, mock, providers, snapshotOf, diff, asErr }, backend || {});
})(typeof window !== 'undefined' ? window : globalThis);
