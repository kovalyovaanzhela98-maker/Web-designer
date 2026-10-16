/* Монька — персонаж «Мои деньги»: золотая монетка с ростком.
   Позы: hello, happy, listen, think, sleepy, oops.
   Строится из простых форм на сетке 120×120. Глаза и щёки общие, меняются брови, рот и детали. */
(function (root) {
  const INK = '#1D2433', GOLD1 = '#FFD95A', GOLD2 = '#F2B900', RIM = '#C98F00', BLUSH = '#FF7F6B';
  let uid = 0;
  const eye = (cx, cy, rx = 5.2, ry = 6.8) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}"/><circle cx="${cx + 1.7}" cy="${cy - 2.4}" r="1.9" fill="#fff"/>`;
  const arc = d => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const star = (x, y, s) => `<path d="M${x} ${y - s}l${s * .3} ${s * .7} ${s * .7} ${s * .3}-${s * .7} ${s * .3}-${s * .3} ${s * .7}-${s * .3}-${s * .7}-${s * .7}-${s * .3} ${s * .7}-${s * .3}z" fill="#FFB800"/>`;

  const POSES = {
    hello: () => ({
      face: `<g class="eyes">${eye(47, 64)}${eye(73, 64)}</g>${arc('M51 77Q60 85 69 77')}`,
      extra: `<circle cx="105" cy="58" r="7.5" fill="url(#G)" stroke="${RIM}" stroke-opacity=".5" stroke-width="2"/><circle cx="15" cy="84" r="7.5" fill="url(#G)" stroke="${RIM}" stroke-opacity=".5" stroke-width="2"/><path d="M111 42q4.5-3 8 0M112 49q4-2.5 7 0" fill="none" stroke="#2F4AA8" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>`
    }),
    happy: () => ({
      face: `${arc('M41 66Q47 57 53 66')}${arc('M67 66Q73 57 79 66')}<path d="M49 75Q60 93 71 75Z" fill="${INK}"/><ellipse cx="60" cy="83" rx="5" ry="3" fill="${BLUSH}"/>`,
      extra: `${star(14, 34, 9)}${star(108, 26, 7)}${star(104, 96, 5)}`
    }),
    listen: () => ({
      face: `<g class="eyes">${eye(47, 63, 6, 8.4)}${eye(73, 63, 6, 8.4)}</g><ellipse cx="60" cy="80" rx="4.2" ry="5.2" fill="${INK}"/>`,
      extra: `<path d="M9 54Q2 64 9 74M112 54Q119 64 112 74" fill="none" stroke="#2F4AA8" stroke-width="3" stroke-linecap="round" opacity=".6"/>`
    }),
    think: () => ({
      face: `<g class="eyes">${eye(49.5, 61.5)}${eye(75.5, 61.5)}</g><path d="M41 50Q47 46 54 49" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M54 79H68" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
      extra: `<circle cx="96" cy="30" r="3" fill="#2F4AA8" opacity=".55"/><circle cx="104" cy="20" r="4.6" fill="#2F4AA8" opacity=".55"/><circle cx="110" cy="8" r="2" fill="#2F4AA8" opacity=".55"/>`
    }),
    sleepy: () => ({
      face: `${arc('M41 64Q47 70 53 64')}${arc('M67 64Q73 70 79 64')}<ellipse cx="60" cy="79" rx="3.2" ry="2.8" fill="${INK}"/>`,
      extra: `<path d="M99 32h9l-9 11h9M110 15h6l-6 7h6" fill="none" stroke="#2F4AA8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>`
    }),
    oops: () => ({
      face: `<g class="eyes">${eye(47, 65, 4.8, 6.2)}${eye(73, 65, 4.8, 6.2)}</g><path d="M40 54L54 58M80 54L66 58" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M51 82Q55.5 75 60 80Q64.5 85 69 78" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`,
      extra: `<path d="M107 30Q113 39 107 46Q101 39 107 30Z" fill="#7FB6FF"/>`
    })
  };

  function mascot(pose = 'hello', size = 96, label) {
    const id = 'mg' + (++uid), p = (POSES[pose] || POSES.hello)();
    const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
    return `<svg class="mascot mascot-${pose}" width="${size}" height="${size}" viewBox="0 0 120 120" ${aria}>
<defs><radialGradient id="${id}" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${GOLD1}"/><stop offset="1" stop-color="${GOLD2}"/></radialGradient></defs>
<g class="m-all">
<ellipse cx="60" cy="113" rx="30" ry="4.6" fill="${INK}" opacity=".12"/>
${p.extra.replace(/url\(#G\)/g, `url(#${id})`)}
<path d="M60 22V11" stroke="#1F8A5B" stroke-width="4" stroke-linecap="round"/>
<path d="M60 14C50 5 39 9 41 18 49 20 56 19 60 14Z" fill="#2FB67A"/><path d="M60 14C70 4 81 8 79 17 71 19 64 18 60 14Z" fill="#1F8A5B"/>
<circle cx="60" cy="66" r="44" fill="url(#${id})"/>
<circle cx="60" cy="66" r="35.5" fill="none" stroke="${RIM}" stroke-opacity=".5" stroke-width="3"/>
<path d="M24 56A38 38 0 0 1 46 31" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/>
<ellipse cx="37" cy="77" rx="6.6" ry="4.2" fill="${BLUSH}" opacity=".5"/><ellipse cx="83" cy="77" rx="6.6" ry="4.2" fill="${BLUSH}" opacity=".5"/>
${p.face}
</g></svg>`;
  }
  root.MD = root.MD || {};
  root.MD.mascot = mascot;
  root.MD.MASCOT_POSES = Object.keys(POSES);
  root.MD.MASCOT_NAME = 'Монька';
})(typeof window !== 'undefined' ? window : globalThis);
