/* Иконки «Фин» — собственный двухтоновый набор.
   Правила: сетка 24×24, заливка currentColor; class="a" — второй тон (прозрачность .4);
   class="s" — штрих 2.2 с круглыми концами. Новые иконки добавлять сюда же. */
(function (root) {
const IC = {
  home: '<path class="a" d="M5 11.2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7.8L12 5.6z"/><path d="M12 3.1 2.9 10.9a1.1 1.1 0 0 0 1.4 1.7L12 6l7.7 6.6a1.1 1.1 0 0 0 1.4-1.7z"/><path d="M9.6 21v-4.2a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2V21z"/>',
  list: '<rect x="3.5" y="5" width="17" height="3.4" rx="1.7"/><rect class="a" x="3.5" y="10.3" width="11" height="3.4" rx="1.7"/><rect x="3.5" y="15.6" width="14" height="3.4" rx="1.7"/>',
  chart: '<rect class="a" x="3.8" y="12" width="4.4" height="8" rx="1.6"/><rect x="9.8" y="4" width="4.4" height="16" rx="1.6"/><rect class="a" x="15.8" y="8.5" width="4.4" height="11.5" rx="1.6"/>',
  spark: '<circle class="a" cx="12" cy="12" r="9.6"/><path d="M12 5.6l1.6 4.2 4.2 1.6-4.2 1.6L12 17.2l-1.6-4.2L6.2 11.4l4.2-1.6z"/>',
  plus: '<rect x="10.8" y="4.5" width="2.4" height="15" rx="1.2"/><rect x="4.5" y="10.8" width="15" height="2.4" rx="1.2"/>',
  mic: '<rect x="8.8" y="2.8" width="6.4" height="12" rx="3.2"/><path class="a" d="M4.8 11h2.2a5 5 0 0 0 10 0h2.2a7.2 7.2 0 0 1-6.1 7.1V21h-2.4v-2.9A7.2 7.2 0 0 1 4.8 11z"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="3"/>',
  gear: '<rect class="a" x="3" y="6" width="18" height="2.4" rx="1.2"/><circle cx="8.5" cy="7.2" r="3.1"/><rect class="a" x="3" y="15.6" width="18" height="2.4" rx="1.2"/><circle cx="15.5" cy="16.8" r="3.1"/>',
  eye: '<path class="a" d="M12 5c5 0 8.6 4.1 9.7 6.2a1.6 1.6 0 0 1 0 1.6C20.6 14.9 17 19 12 19S3.4 14.9 2.3 12.8a1.6 1.6 0 0 1 0-1.6C3.4 9.1 7 5 12 5z"/><circle cx="12" cy="12" r="3.3"/>',
  eyeoff: '<path class="a" d="M12 5c5 0 8.6 4.1 9.7 6.2a1.6 1.6 0 0 1 0 1.6C20.6 14.9 17 19 12 19S3.4 14.9 2.3 12.8a1.6 1.6 0 0 1 0-1.6C3.4 9.1 7 5 12 5z"/><circle cx="12" cy="12" r="3.3"/><path class="s" d="M4.5 4.5l15 15" style="stroke-width:2.6"/>',
  down: '<path d="M12 20.5l-7.2-7.6h4.7V4h5v8.9h4.7z"/>',
  up: '<path d="M12 3.5l7.2 7.6h-4.7V20h-5v-8.9H4.8z"/>',
  close: '<path class="s" d="M6.5 6.5l11 11M17.5 6.5l-11 11" style="stroke-width:2.4"/>',
  search: '<circle class="a" cx="10.5" cy="10.5" r="6.5"/><circle class="s" cx="10.5" cy="10.5" r="6.5"/><path class="s" d="M15.5 15.5 20 20"/>',
  trash: '<path class="a" d="M6 8.4h12l-.9 10.7a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8z"/><path d="M4 6.4a1 1 0 0 1 1-1h3.4l.7-1.4h5.8l.7 1.4H19a1 1 0 0 1 0 2H5a1 1 0 0 1-1-1z"/>',
  left: '<path class="s" d="M14.5 5.5 8 12l6.5 6.5" style="stroke-width:2.6"/>',
  right: '<path class="s" d="M9.5 5.5 16 12l-6.5 6.5" style="stroke-width:2.6"/>',
  check: '<path class="s" d="M5.5 12.5l4.2 4.2L18.5 8" style="stroke-width:2.8"/>',
  goal: '<circle class="a" cx="12" cy="12" r="9.6"/><circle class="s" cx="12" cy="12" r="5.8"/><circle cx="12" cy="12" r="2.2"/>',
  dots: '<circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/>',
  /* аккаунт и синхронизация */
  mail: '<rect class="a" x="3" y="5.5" width="18" height="13" rx="3"/><path class="s" d="M4.8 8.4 12 13.4l7.2-5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path class="a" d="M4.5 20.5a7.5 7.5 0 0 1 15 0z"/>',
  exit: '<path class="a" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path class="s" d="M14.5 8.5 18 12l-3.5 3.5M9.5 12H18"/>',
  cloud: '<path d="M7 18.5A4.5 4.5 0 0 1 6.6 9.6a5.5 5.5 0 0 1 10.6 1A4 4 0 0 1 17 18.5z"/>',
  sms: '<path class="a" d="M3.5 7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H11l-4.5 3.5V17a3 3 0 0 1-3-3z"/><circle cx="8.5" cy="10.5" r="1.2"/><circle cx="12" cy="10.5" r="1.2"/><circle cx="15.5" cy="10.5" r="1.2"/>',
  /* категории */
  cart: '<path class="a" d="M5.6 8.2h14a1 1 0 0 1 1 1.25l-1.5 6a2 2 0 0 1-1.95 1.5H9.1a2 2 0 0 1-1.95-1.55z"/><path class="s" d="M2.8 4.2h2.1l1.5 10.2"/><circle cx="9.4" cy="19.7" r="1.7"/><circle cx="16.6" cy="19.7" r="1.7"/>',
  cup: '<path d="M4.2 9.5h11.6v5.3A5.2 5.2 0 0 1 10.6 20H9.4a5.2 5.2 0 0 1-5.2-5.2z"/><path class="s" d="M15.8 11h1.2a2.6 2.6 0 0 1 0 5.2h-1.2"/><path class="s a" d="M8 3.2v3M12 3.2v3"/>',
  bus: '<path fill-rule="evenodd" d="M5 5.5A3.2 3.2 0 0 1 8.2 2.3h7.6A3.2 3.2 0 0 1 19 5.5V16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM7.6 5.4v5h8.8v-5zM7.4 14.2a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0zm7 0a1.1 1.1 0 1 0 2.2 0 1.1 1.1 0 0 0-2.2 0z"/><rect x="5.8" y="18.6" width="3" height="2.6" rx="1.1"/><rect x="15.2" y="18.6" width="3" height="2.6" rx="1.1"/>',
  sofa: '<path class="a" d="M6 8.2A3 3 0 0 1 9 5.2h6a3 3 0 0 1 3 3V12H6z"/><path d="M3 12.8a2 2 0 0 1 4 0V14h10v-1.2a2 2 0 0 1 4 0V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z"/><rect x="5" y="19.4" width="1.8" height="2" rx=".9"/><rect x="17.2" y="19.4" width="1.8" height="2" rx=".9"/>',
  heart: '<path fill-rule="evenodd" d="M12 20.6S3 15.2 3 9A4.9 4.9 0 0 1 12 6.4 4.9 4.9 0 0 1 21 9c0 6.2-9 11.6-9 11.6zM11 9.6v1.9H9.1v2H11v1.9h2v-1.9h1.9v-2H13V9.6z"/>',
  shirt: '<path d="M8.6 3.4 3 6.1l1.9 4.6 2.6-1V20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9.7l2.6 1L21 6.1l-5.6-2.7a3.5 3.5 0 0 1-6.8 0z"/>',
  phone: '<path fill-rule="evenodd" d="M9.8 2.5h4.4a2.8 2.8 0 0 1 2.8 2.8v13.4a2.8 2.8 0 0 1-2.8 2.8H9.8A2.8 2.8 0 0 1 7 18.7V5.3a2.8 2.8 0 0 1 2.8-2.8zM9.2 5.2v10.4h5.6V5.2zm2.8 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>',
  repeat: '<path class="s" d="M5 11.5a7 7 0 0 1 11.7-4.7M19 12.5a7 7 0 0 1-11.7 4.7"/><path d="M18.6 3.2v4.8h-4.8zM5.4 20.8V16h4.8z"/>',
  gift: '<path d="M4 11h6.8v10H6.2A2.2 2.2 0 0 1 4 18.8zM13.2 11H20v7.8a2.2 2.2 0 0 1-2.2 2.2h-4.6z"/><path class="a" d="M3 7.6A1.6 1.6 0 0 1 4.6 6h6.2v3.6H3zM13.2 6h6.2A1.6 1.6 0 0 1 21 7.6v2H13.2z"/><path class="s" d="M12 6C10.4 2.8 7.2 3.2 7.6 5.2c.3 1.2 2.6.8 4.4.8zM12 6c1.6-3.2 4.8-2.8 4.4-.8-.3 1.2-2.6.8-4.4.8z" style="stroke-width:1.8"/>',
  ticket: '<path fill-rule="evenodd" d="M3 8.2A2.2 2.2 0 0 1 5.2 6h13.6A2.2 2.2 0 0 1 21 8.2v1.9a1.9 1.9 0 0 1 0 3.8v1.9a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 15.8v-1.9a1.9 1.9 0 0 1 0-3.8zM10.2 9v6l5-3z"/>',
  grid: '<rect x="3.8" y="3.8" width="7.4" height="7.4" rx="2.2"/><rect class="a" x="12.8" y="3.8" width="7.4" height="7.4" rx="2.2"/><rect class="a" x="3.8" y="12.8" width="7.4" height="7.4" rx="2.2"/><rect x="12.8" y="12.8" width="7.4" height="7.4" rx="2.2"/>',
  cash: '<path fill-rule="evenodd" d="M5.2 5.5h13.6A2.2 2.2 0 0 1 21 7.7v8.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 16.3V7.7a2.2 2.2 0 0 1 2.2-2.2zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zM5.9 11.1a1 1 0 1 0 0 1.8 1 1 0 0 0 0-1.8zM18.1 11.1a1 1 0 1 0 0 1.8 1 1 0 0 0 0-1.8z"/>',
  case: '<path fill-rule="evenodd" d="M3 9.2A2.2 2.2 0 0 1 5.2 7h13.6A2.2 2.2 0 0 1 21 9.2v8.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 17.8zM10.6 12v2h2.8v-2z"/><path class="s" d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"/>',
  undo: '<path class="s" d="M8.5 5.5 4 10l4.5 4.5"/><path class="s" d="M4.6 10h9.4a5.2 5.2 0 0 1 0 10.4H10.5"/>'
};

  const icon = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
  root.MD = root.MD || {};
  root.MD.IC = IC;
  root.MD.icon = icon;
})(typeof window !== 'undefined' ? window : globalThis);
