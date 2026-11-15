<script>
'use strict';
/* ==========================================================================
   THAI LAW LIBRARY — Frontend core
   ========================================================================== */
var BOOT = window.__BOOT__ || {};
var LOGO = (document.getElementById('splashLogo') || {}).src || '';
var APP_VERSION = BOOT.v || '3.0.0';

/* ---------------- DOM helpers ---------------- */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function on(el, ev, sel, fn) {
  if (!fn) { el.addEventListener(ev, sel); return; }
  el.addEventListener(ev, function (e) { var t = e.target.closest(sel); if (t && el.contains(t)) fn.call(t, e, t); });
}
function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/[.\-–—()]/g, ''); }
function thaiDigitsToArabic(s) { return String(s || '').replace(/[๐-๙]/g, function (d) { return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)); }); }

/* ---------------- icons (stroke icons, infographic style — ไม่ใช้อีโมจิ) ---------------- */
var ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20"/>',
  bookmark: '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  bookmarkOn: '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  ai: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/><path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  arrowL: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  flip: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  timer: '<path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  maximize: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2"/><path d="M6.6 6.6A17.3 17.3 0 0 0 2 11s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M2 2l20 20"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2"/><path d="m16 7 3 3"/><path d="m18 5 2 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/>',
  scale: '<path d="M12 3v18"/><path d="M5 21h14"/><path d="M3 7h18"/><path d="M6 7l-3 7a3 3 0 0 0 6 0z"/><path d="M18 7l-3 7a3 3 0 0 0 6 0z"/>',
  gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  sort: '<path d="M3 6h12M3 12h9M3 18h6"/><path d="M17 8v12"/><path d="m21 16-4 4-4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  type: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  language: '<path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  wifiOff: '<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.8a15 15 0 0 1 4.2-2.7"/><path d="M10.7 5a15 15 0 0 1 11.3 3.8"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M16.9 11.2A10 10 0 0 1 19 12.9"/><path d="M12 20h.01"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  badge: '<path d="M12 2l2.4 2.1 3.2-.3.8 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.8 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.8-3.1-2.8-1.6 1.2-3-1.2-3 2.8-1.6.8-3.1 3.2.3z"/><path d="m9 12 2 2 4-4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5H3v8h4c0 3-1 5-4 5z"/><path d="M14 21c3 0 7-1 7-8V5h-7v8h4c0 3-1 5-4 5z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
  book2: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>',
  note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/><path d="M8 9h8M8 13h5"/>',
  bold: '<path d="M6 4h8a4 4 0 0 1 0 8H6z"/><path d="M6 12h9a4 4 0 0 1 0 8H6z"/>',
  italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><path d="M4 21h16"/>',
  strike: '<path d="M16 4H9a3 3 0 0 0-2.8 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><path d="M4 12h16"/>',
  alignL: '<path d="M21 6H3M15 12H3M17 18H3"/>',
  alignC: '<path d="M21 6H3M17 12H7M19 18H5"/>',
  alignR: '<path d="M21 6H3M21 12H9M21 18H7"/>',
  alignJ: '<path d="M21 6H3M21 12H3M21 18H3"/>',
  ul: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  ol: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 6h1v4M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  indent: '<path d="M21 6H11M21 12H11M21 18H11"/><path d="m3 8 4 4-4 4"/>',
  outdent: '<path d="M21 6H11M21 12H11M21 18H11"/><path d="m7 8-4 4 4 4"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  hr: '<path d="M3 12h18"/>',
  eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 19"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  highlighter: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 2-.8 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2H17a5 5 0 0 0 5-5C22 6 17.5 2 12 2z"/>',
  dict: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M8 7h8M8 11h6"/>',
  abbr: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/><path d="M17 14h4M19 12v4"/>',
  compare: '<rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="18" rx="1.5"/>',
  route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>',
  viewer: '<path d="M2 4h20v14H2z"/><path d="M8 22h8"/><path d="M7 9h10M7 13h6"/>',
  brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  bug: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 4l1 2M14 4l-1 2"/>',
  smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  sparkle: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/>',
  power: '<path d="M18.4 6.6a9 9 0 1 1-12.8 0"/><path d="M12 2v10"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
};
function ic(name, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.info) + '</svg>'; }

/* โลโก้แบรนด์ตามต้นฉบับของแต่ละผู้ให้บริการ */
var BRAND = {
  google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FBBC05" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#EA4335" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#34A853" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#4285F4" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#0866FF"/><path fill="#fff" d="M15.7 15.5l.5-3.5h-3.3V9.8c0-.95.47-1.9 1.96-1.9h1.52V4.95s-1.38-.24-2.7-.24c-2.76 0-4.56 1.67-4.56 4.7V12H6.1v3.5h3.02V24h3.78v-8.5z"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="5.4" fill="#06C755"/><path fill="#fff" d="M20.2 11.1c0-3.66-3.67-6.64-8.2-6.64s-8.2 2.98-8.2 6.64c0 3.28 2.91 6.03 6.84 6.55.27.06.63.18.72.4.08.21.05.53.03.74l-.12.7c-.03.21-.17.81.71.44.88-.37 4.72-2.78 6.44-4.76 1.19-1.3 1.78-2.63 1.78-4.07z"/><path fill="#06C755" d="M17.4 13.2h-2.3a.16.16 0 0 1-.16-.16V9.47c0-.09.07-.16.16-.16h2.3c.09 0 .16.07.16.16v.58c0 .09-.07.16-.16.16h-1.57v.6h1.57c.09 0 .16.07.16.16v.58c0 .09-.07.16-.16.16h-1.57v.6h1.57c.09 0 .16.07.16.16v.58c0 .09-.07.16-.16.16zm-8.5 0c.09 0 .16-.07.16-.16v-.58a.16.16 0 0 0-.16-.16H7.35V9.47a.16.16 0 0 0-.16-.16h-.58a.16.16 0 0 0-.16.16v3.57c0 .09.07.16.16.16zm1.39-3.89h-.58a.16.16 0 0 0-.16.16v3.57c0 .09.07.16.16.16h.58c.09 0 .16-.07.16-.16V9.47a.16.16 0 0 0-.16-.16zm3.96 0h-.58a.16.16 0 0 0-.16.16v2.12l-1.63-2.21-.01-.02h-.69a.16.16 0 0 0-.16.16v3.57c0 .09.07.16.16.16h.58c.09 0 .16-.07.16-.16v-2.12l1.64 2.21.04.04h.7c.09 0 .16-.07.16-.16V9.47a.16.16 0 0 0-.16-.16z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="igg" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#FDF497"/><stop offset=".05" stop-color="#FDF497"/><stop offset=".45" stop-color="#FD5949"/><stop offset=".6" stop-color="#D6249F"/><stop offset=".9" stop-color="#285AEB"/></radialGradient></defs><rect width="24" height="24" rx="6" fill="url(#igg)"/><rect x="5" y="5" width="14" height="14" rx="4.2" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="16.4" cy="7.6" r="1.05" fill="#fff"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#000"/><g transform="translate(4.2 3.6) scale(.65)"><path fill="#25F4EE" transform="translate(-.6 -.6)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path fill="#FE2C55" transform="translate(.6 .6)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path fill="#fff" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></g></svg>'
};

/* ---------------- safe storage (ทุกการอ่าน/เขียนครอบ try/catch) ---------------- */
var MEM = {};
var store = {
  get: function (k, d) { try { var v = localStorage.getItem('tll.' + k); return v === null ? (k in MEM ? MEM[k] : d) : JSON.parse(v); } catch (e) { return k in MEM ? MEM[k] : d; } },
  set: function (k, v) { MEM[k] = v; try { localStorage.setItem('tll.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del: function (k) { delete MEM[k]; try { localStorage.removeItem('tll.' + k); } catch (e) {} },
  wipe: function () { MEM = {}; try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('tll.') === 0) localStorage.removeItem(k); }); } catch (e) {} try { sessionStorage.clear(); } catch (e) {} }
};

/* ---------------- debug / live log (Debug Mode) ---------------- */
var LOGS = [];
function dlog(kind, msg) {
  var line = new Date().toLocaleTimeString('th-TH') + ' [' + kind + '] ' + msg;
  LOGS.push(line); if (LOGS.length > 300) LOGS.shift();
  var box = document.getElementById('debugLog'); if (box) { box.textContent = LOGS.join('\n'); box.scrollTop = box.scrollHeight; }
}

/* ---------------- error tracking (Error Logging / Exception Tracking) ---------------- */
var ERRQ = [];
var flushErrors = debounce(function () {
  if (!ERRQ.length) return;
  var items = ERRQ.splice(0, 20);
  api('clientError', { items: items }, { silent: true, noRetry: true }).catch(function () {});
}, 3000);
function reportError(where, err) {
  var msg = err && err.message ? err.message : String(err);
  dlog('error', where + ': ' + msg);
  ERRQ.push({ where: where, message: msg, stack: err && err.stack ? String(err.stack).slice(0, 1500) : '', ua: navigator.userAgent, v: APP_VERSION, memberId: S.member ? S.member.memberId : '' });
  flushErrors();
}
window.addEventListener('error', function (e) { reportError('window', e.error || e.message); });
window.addEventListener('unhandledrejection', function (e) { reportError('promise', e.reason || 'rejection'); });

/* ---------------- app state ---------------- */
var S = {
  token: store.get('token', ''),
  member: store.get('member', null),
  flags: BOOT.flags || store.get('flags', {}) || {},
  ud: null, rev: 0,
  catalog: store.get('catalog', null), catVer: store.get('catVer', ''),
  treaties: store.get('treaties', null),
  media: [],
  ui: store.get('ui', { view: 'home' }),
  online: true, offlineSince: 0, failStreak: 0,
  unread: 0
};
var SAFE_MODE = store.get('safeMode', false) || !!(S.flags && S.flags.SAFE_MODE);

function defaultUD() {
  return {
    favorites: {}, deleted: {}, folders: [], history: [], searches: [], time: {}, opens: {},
    notes: [], notices: [], readNotices: {}, aiChats: [],
    settings: { lang: 'th', theme: 'light', fontScale: 1, dateFmt: 'be', tz: 'Asia/Bangkok', density: 'comfortable', reduceMotion: false, sound: true, remember: true, idle: 0,
      notif: { all: true, inapp: true, password: true, device: true, news: true } }
  };
}

/* ---------------- API client with timeout, retry, circuit breaker, offline queue ---------------- */
var READ_ACTIONS = { ping: 1, getCatalog: 1, getTreaties: 1, media: 1, bootstrap: 1, loginHistory: 1, devices: 1, checkUsername: 1 };
function gsr() { return window.google && google.script && google.script.run ? google.script.run : null; }
function api(action, payload, opt) {
  opt = opt || {};
  var tries = 0, maxTries = (READ_ACTIONS[action] && !opt.noRetry) ? 3 : 1;
  return new Promise(function (resolve, reject) {
    function attempt() {
      tries++;
      var runner = gsr();
      if (!runner) { reject({ code: 'NO_RUNTIME', msg: 'ไม่พบการเชื่อมต่อ Google Apps Script — กรุณาเปิดผ่าน URL ของ Web app' }); return; }
      var done = false;
      var timer = setTimeout(function () {
        if (done) return; done = true;
        netFail(); dlog('timeout', action);
        if (tries < maxTries) setTimeout(attempt, 600 * tries); else reject({ code: 'TIMEOUT', msg: 'ระบบใช้เวลาตอบสนองนานผิดปกติ กรุณาลองใหม่อีกครั้ง' });
      }, opt.timeout || 30000);
      var t0 = performance.now();
      runner.withSuccessHandler(function (res) {
        if (done) return; done = true; clearTimeout(timer); netOk();
        dlog('api', action + ' ' + Math.round(performance.now() - t0) + 'ms ' + (res && res.ok === false ? res.code : 'ok'));
        if (!res) { reject({ code: 'EMPTY', msg: 'ไม่ได้รับข้อมูลจากระบบ' }); return; }
        if (res.ok === false) {
          if (res.code === 'NO_SESSION' && S.token && action !== 'logout') { sessionExpired(); }
          if (res.code === 'MAINTENANCE') showMaintenance(res.msg);
          reject(res); return;
        }
        resolve(res);
      }).withFailureHandler(function (err) {
        if (done) return; done = true; clearTimeout(timer); netFail();
        dlog('fail', action + ' ' + (err && err.message));
        if (tries < maxTries) setTimeout(attempt, 700 * tries);
        else reject({ code: 'NETWORK', msg: 'ไม่สามารถติดต่อระบบได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หากยังพบปัญหา กรุณาติดต่อผู้ดูแลระบบ' });
      }).api(action, payload || {}, S.token || '');
    }
    attempt();
  });
}
function netOk() {
  S.failStreak = 0;
  if (!S.online) { S.online = true; renderNetBar(); flushOutbox(); toast('เชื่อมต่อระบบได้ตามปกติแล้ว', 'ข้อมูลที่บันทึกระหว่างออฟไลน์กำลังซิงก์อัตโนมัติ', 'ok'); }
}
function netFail() {
  S.failStreak++;
  if (S.failStreak >= 3 && S.online) { S.online = false; S.offlineSince = Date.now(); renderNetBar(); }
}
function renderNetBar() {
  var bar = document.getElementById('netBar'); if (!bar) return;
  bar.innerHTML = S.online ? '' : '<div class="offline-bar">' + ic('wifiOff') + ' ขณะนี้ไม่สามารถเชื่อมต่อฐานข้อมูลได้ ระบบจะเก็บข้อมูลไว้ในอุปกรณ์และซิงก์ให้อัตโนมัติเมื่อเชื่อมต่อได้</div>';
}

/* ---------------- toast & snackbar ---------------- */
function toast(title, body, kind, opt) {
  opt = opt || {};
  var box = document.getElementById('toasts'); if (!box) return;
  var life = opt.life === 0 ? 0 : (opt.life || 4200);
  var iconName = kind === 'ok' ? 'check' : kind === 'bad' ? 'alert' : kind === 'warn' ? 'alert' : 'info';
  var el = h('<div class="toast ' + (kind || '') + '" role="status"><span style="color:var(--' + (kind === 'ok' ? 'ok' : kind === 'bad' ? 'bad' : kind === 'warn' ? 'orange' : 'sky-600') + ')">' + ic(iconName) + '</span><div class="grow"><div class="tt">' + esc(title) + '</div>' + (body ? '<div class="tb">' + esc(body) + '</div>' : '') + (opt.action ? '<button class="btn sm ghost" data-act style="margin-top:6px;padding:0 8px;color:var(--sky-700)">' + esc(opt.action) + '</button>' : '') + '</div><button class="icon-btn" aria-label="ปิด" data-x style="width:34px;height:34px">' + ic('x') + '</button>' + (life ? '<i class="life" style="animation-duration:' + life + 'ms"></i>' : '') + '</div>');
  function close() { if (el.classList.contains('out')) return; el.classList.add('out'); setTimeout(function () { el.remove(); }, 460); }
  el.querySelector('[data-x]').onclick = close;
  if (opt.action) el.querySelector('[data-act]').onclick = function () { close(); opt.onAction && opt.onAction(); };
  box.appendChild(el);
  if (box.children.length > 4) box.firstElementChild.remove();
  if (life) setTimeout(close, life);
  return close;
}

/* ---------------- modal / confirm (ปุ่มยกเลิกซ้าย ปุ่มยืนยันขวาล่าง) ---------------- */
var layerStack = [];
function openScrim(onClick) {
  var s = h('<div class="scrim"></div>');
  document.getElementById('layer').appendChild(s);
  requestAnimationFrame(function () { s.classList.add('on'); });
  if (onClick) s.onclick = onClick;
  return s;
}
function closeScrim(s) { if (!s) return; s.classList.remove('on'); setTimeout(function () { s.remove(); }, 360); }
function modal(o) {
  return new Promise(function (resolve) {
    var scrim = openScrim(function () { if (o.dismiss !== false) finish(false); });
    var wrap = h('<div class="modal-wrap" role="dialog" aria-modal="true"></div>');
    var m = h('<div class="modal ' + (o.wide ? 'wide' : '') + '"></div>');
    m.innerHTML = '<div class="modal-head"><div class="mic ' + (o.tone || '') + '">' + ic(o.icon || 'info') + '</div><div class="grow"><h3>' + esc(o.title || '') + '</h3>' + (o.sub ? '<div class="muted small" style="margin-top:2px">' + esc(o.sub) + '</div>' : '') + '</div></div>' +
      '<div class="modal-body">' + (o.html || (o.text ? '<div class="prose"><p class="noindent">' + esc(o.text) + '</p></div>' : '')) + '</div>' +
      '<div class="modal-actions">' + (o.cancel === false ? '<span class="first"></span>' : '<button class="btn first" data-c>' + esc(o.cancel || 'ยกเลิก') + '</button>') +
      '<button class="btn ' + (o.danger ? 'danger fill' : 'k') + '" data-ok>' + esc(o.ok || 'ยืนยัน') + '</button></div>';
    wrap.appendChild(m); document.getElementById('layer').appendChild(wrap);
    requestAnimationFrame(function () { m.classList.add('on'); });
    var api_ = { el: m, close: function (v) { finish(v); } };
    var done = false;
    function finish(v) {
      if (done) return; done = true;
      m.classList.remove('on'); closeScrim(scrim);
      setTimeout(function () { wrap.remove(); }, 300);
      document.removeEventListener('keydown', key);
      resolve(v);
    }
    function key(e) { if (e.key === 'Escape' && o.dismiss !== false) finish(false); }
    document.addEventListener('keydown', key);
    var cb = m.querySelector('[data-c]'); if (cb) cb.onclick = function () { finish(false); };
    m.querySelector('[data-ok]').onclick = function () {
      if (o.onOk) {
        var r = o.onOk(m, api_);
        if (r === false) return;
        if (r && r.then) { var b = this; b.disabled = true; r.then(function (v) { if (v !== false) finish(v === undefined ? true : v); else b.disabled = false; }).catch(function () { b.disabled = false; }); return; }
      }
      finish(true);
    };
    if (o.onOpen) o.onOpen(m, api_);
    setTimeout(function () { var f = m.querySelector('input,textarea,select'); if (f && o.autofocus !== false) f.focus(); }, 60);
  });
}
function confirmBox(title, text, opt) { opt = opt || {}; return modal({ title: title, text: text, icon: opt.icon || 'help', tone: opt.tone, ok: opt.ok || 'ยืนยัน', cancel: opt.cancel || 'ยกเลิก', danger: opt.danger }); }
function alertBox(title, text, opt) { opt = opt || {}; return modal({ title: title, text: text, icon: opt.icon || 'info', tone: opt.tone, ok: opt.ok || 'รับทราบ', cancel: false }); }

/* ---------------- drawer ---------------- */
function drawer(side, build) {
  var scrim = openScrim(function () { close(); });
  var d = h('<aside class="drawer ' + side + '" role="dialog" aria-modal="true"></aside>');
  document.getElementById('layer').appendChild(d);
  function close() { d.classList.remove('on'); closeScrim(scrim); setTimeout(function () { d.remove(); }, 460); document.removeEventListener('keydown', key); }
  function key(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', key);
  build(d, close);
  requestAnimationFrame(function () { d.classList.add('on'); });
  return close;
}

/* ---------------- loading overlay with 5s / 10s thresholds ---------------- */
function withLoading(text, promise, retry) {
  var ov = h('<div class="loading-ov"><div class="box"><div class="spin"></div><div class="t" style="font-weight:600">' + esc(text) + '</div><div class="s muted small"></div><div class="r"></div></div></div>');
  document.getElementById('layer').appendChild(ov);
  var t5 = setTimeout(function () { ov.querySelector('.s').textContent = 'ระบบกำลังดำเนินการ กรุณารอสักครู่'; }, 5000);
  var t10 = setTimeout(function () {
    ov.querySelector('.s').textContent = 'ระบบใช้เวลานานผิดปกติ ท่านสามารถรอต่อ หรือกดลองอีกครั้ง';
    if (retry) { var b = h('<button class="btn sm" style="margin-top:8px">' + ic('refresh') + ' ลองอีกครั้ง</button>'); b.onclick = function () { cleanup(); retry(); }; ov.querySelector('.r').appendChild(b); }
  }, 10000);
  function cleanup() { clearTimeout(t5); clearTimeout(t10); ov.remove(); }
  return promise.then(function (v) { cleanup(); return v; }, function (e) { cleanup(); throw e; });
}

/* ---------------- i18n (ภาษาเว็บไซต์ ไทย / อังกฤษ / เกาหลี) ---------------- */
var I18N = {
  th: { home: 'หลัก', content: 'เนื้อหา', treaties: 'อนุสัญญา', saved: 'บันทึก', history: 'ประวัติ', time: 'เวลา', profile: 'ข้อมูล', ai: 'ผู้ช่วย AI', notes: 'สมุดบันทึก', tools: 'เครื่องมือ', pricing: 'แพ็กเกจและราคา', help: 'ความช่วยเหลือ', notifications: 'การแจ้งเตือน', settings: 'การตั้งค่า', logout: 'ออกจากระบบ', search: 'ค้นหา', menu: 'เมนู', about: 'เกี่ยวกับเรา', privacy: 'นโยบายความเป็นส่วนตัว', terms: 'ข้อกำหนดการใช้งาน' },
  en: { home: 'Home', content: 'Laws', treaties: 'Treaties', saved: 'Saved', history: 'History', time: 'Time', profile: 'Profile', ai: 'AI Assistant', notes: 'Notebook', tools: 'Tools', pricing: 'Plans & Pricing', help: 'Help', notifications: 'Notifications', settings: 'Settings', logout: 'Sign out', search: 'Search', menu: 'Menu', about: 'About us', privacy: 'Privacy Policy', terms: 'Terms of Service' },
  ko: { home: '홈', content: '법령', treaties: '조약', saved: '저장', history: '기록', time: '시간', profile: '내 정보', ai: 'AI 도우미', notes: '노트', tools: '도구', pricing: '요금제', help: '도움말', notifications: '알림', settings: '설정', logout: '로그아웃', search: '검색', menu: '메뉴', about: '소개', privacy: '개인정보 처리방침', terms: '이용약관' }
};
function tr(k) { var lang = (S.ud && S.ud.settings.lang) || 'th'; return (I18N[lang] && I18N[lang][k]) || I18N.th[k] || k; }

/* ---------------- date helpers ---------------- */
var TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
var TH_MON_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
var TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
function tz() { return (S.ud && S.ud.settings.tz) || 'Asia/Bangkok'; }
function parts(d) {
  d = d instanceof Date ? d : new Date(d);
  try {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d);
    var o = {}; f.forEach(function (p) { o[p.type] = p.value; });
    var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday);
    return { y: +o.year, m: +o.month, d: +o.day, H: +o.hour % 24, M: +o.minute, s: +o.second, wd: wd };
  } catch (e) { return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), H: d.getHours(), M: d.getMinutes(), s: d.getSeconds(), wd: d.getDay() }; }
}
function yr(y) { return (S.ud && S.ud.settings.dateFmt === 'ce') ? y : y + 543; }
function dayKey(d) { var p = parts(d || new Date()); return p.y + '-' + pad(p.m) + '-' + pad(p.d); }
function fmtDate(d, long) { if (!d) return '-'; var p = parts(d); if (isNaN(p.y)) return '-'; return p.d + ' ' + (long ? TH_MONTHS : TH_MON_S)[p.m - 1] + ' ' + yr(p.y); }
function fmtDateTime(d) { if (!d) return '-'; var p = parts(d); if (isNaN(p.y)) return '-'; return p.d + ' ' + TH_MON_S[p.m - 1] + ' ' + yr(p.y) + ' ' + pad(p.H) + ':' + pad(p.M) + ' น.'; }
function fmtTime(d) { var p = parts(d); return pad(p.H) + ':' + pad(p.M) + ':' + pad(p.s); }
function keyLabel(k, mode) {
  var a = k.split('-'), y = +a[0], m = +a[1], d = +a[2];
  if (mode === 'year') return 'ปี ' + (S.ud && S.ud.settings.dateFmt === 'ce' ? 'ค.ศ. ' + y : 'พ.ศ. ' + (y + 543));
  if (mode === 'month') return TH_MONTHS[m - 1] + ' ' + yr(y);
  var wd = new Date(y, m - 1, d).getDay();
  return 'วัน' + TH_DAYS[wd] + 'ที่ ' + d + ' ' + TH_MONTHS[m - 1] + ' ' + yr(y);
}
function dur(sec) { sec = Math.max(0, Math.round(sec || 0)); var hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60; return hh + ' ชม. ' + mm + ' นาที ' + ss + ' วินาที'; }
function durShort(sec) { sec = Math.round(sec || 0); var hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60); return hh ? hh + ' ชม. ' + mm + ' น.' : mm + ' น.'; }

/* ---------------- device info ---------------- */
function deviceInfo() {
  var ua = navigator.userAgent || '';
  var os = /iPad|Macintosh.*Mobile|Macintosh(?=.*Safari)(?=.*Version)/.test(ua) && navigator.maxTouchPoints > 1 ? 'iPadOS' : /iPhone|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'อื่น ๆ';
  var browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'อื่น ๆ';
  var device = os === 'iPadOS' || /Tablet|iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? 'แท็บเล็ต' : /Mobile|iPhone|Android/.test(ua) ? 'โทรศัพท์มือถือ' : 'คอมพิวเตอร์';
  return { device: device, os: os, browser: browser };
}
var IPINFO = null;
function lookupIp() {
  if (IPINFO || !(S.flags && S.flags.FLAG_IP_LOOKUP)) return Promise.resolve(IPINFO || {});
  var ctrl = window.AbortController ? new AbortController() : null;
  var tm = setTimeout(function () { ctrl && ctrl.abort(); }, 1800);
  return fetch('https://ipapi.co/json/', ctrl ? { signal: ctrl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
    clearTimeout(tm);
    IPINFO = { ip: j.ip || '', location: [j.city, j.region, j.country_name].filter(Boolean).join(', '), isp: j.org || '' };
    return IPINFO;
  }).catch(function () { clearTimeout(tm); return {}; });
}
function clientInfo() { return lookupIp().then(function (ip) { var d = deviceInfo(); return { device: d.device, os: d.os, browser: d.browser, ip: ip.ip || '', location: ip.location || '', isp: ip.isp || '' }; }); }

/* ---------------- sounds (Web Audio) ---------------- */
var AC = null;
function beep(freq, ms, vol, type) {
  if (S.ud && S.ud.settings.sound === false) return;
  if (S.flags && S.flags.FLAG_SOUND === false) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, AC.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + ms / 1000);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + ms / 1000 + 0.02);
  } catch (e) {}
}
var SND = {
  click: function () { beep(1400, 45, 0.18, 'square'); },
  start: function () { beep(880, 90, 0.22); setTimeout(function () { beep(1320, 110, 0.22); }, 95); },
  stop: function () { beep(1100, 90, 0.22); setTimeout(function () { beep(700, 130, 0.22); }, 95); },
  tick: function () { beep(1000, 130, 0.3, 'square'); },
  end: function () { [0, 260, 520].forEach(function (d) { setTimeout(function () { beep(1500, 220, 0.35, 'square'); }, d); }); }
};

/* ---------------- haptics ---------------- */
function tap() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }

/* ---------------- read more (Read More / Expandable Text) ---------------- */
function readMore(innerHtml, lines) {
  var id = 'rm' + uid();
  setTimeout(function () {
    var el = document.getElementById(id); if (!el) return;
    var body = el.querySelector('.rm-body');
    if (body.scrollHeight <= body.clientHeight + 4) { el.classList.remove('closed'); el.querySelector('.rm-btn').remove(); }
  }, 30);
  return '<div class="readmore closed" id="' + id + '" style="--rm-h:' + (lines || 5) * 1.85 + 'em"><div class="rm-body">' + innerHtml + '</div><button class="rm-btn" type="button" data-rm>' + ic('chevD') + '<span>อ่านเพิ่มเติม</span></button></div>';
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-rm]'); if (!b) return;
  var box = b.closest('.readmore'); var body = box.querySelector('.rm-body');
  if (box.classList.contains('closed')) { body.style.maxHeight = body.scrollHeight + 'px'; box.classList.remove('closed'); b.querySelector('span').textContent = 'ย่อข้อความ'; b.querySelector('svg').style.transform = 'rotate(180deg)'; }
  else { body.style.maxHeight = ''; box.classList.add('closed'); b.querySelector('span').textContent = 'อ่านเพิ่มเติม'; b.querySelector('svg').style.transform = ''; }
});

/* ---------------- scroll animations (Scroll-Triggered & Scroll-Linked) ---------------- */
var IO = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) { ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); IO.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' }) : null;
function observeRise(root) { $$('.rise', root || document).forEach(function (el) { if (IO) IO.observe(el); else el.classList.add('in'); }); }
window.addEventListener('scroll', function () {
  var bar = document.getElementById('readbar'); if (!bar) return;
  if (!document.body.classList.contains('readable')) { bar.style.width = '0'; return; }
  var max = document.documentElement.scrollHeight - innerHeight;
  bar.style.width = (max > 0 ? clamp(scrollY / max * 100, 0, 100) : 0) + '%';
}, { passive: true });

/* ---------------- law text formatting (ย่อหน้า + ไฮไลต์ "มาตรา") ---------------- */
function lawHtml(text, q) {
  var lines = String(text || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
  return '<div class="law-text">' + lines.map(function (ln) {
    var cls = /^\(\d+\)|^\([ก-ฮ]\)/.test(ln) ? 'item' : /^\(เนื้อความ/.test(ln) ? 'note' : '';
    var s = esc(ln).replace(/มาตรา\s*([0-9๐-๙]+(?:\/[0-9๐-๙]+)?)/g, '<span class="sec-ref">มาตรา $1</span>');
    if (q) s = highlight(s, q);
    return '<p class="' + cls + '">' + s + '</p>';
  }).join('') + '</div>';
}
function highlight(html, q) {
  q = String(q || '').trim(); if (!q || q.length < 2) return html;
  var words = q.split(/\s+/).filter(function (w) { return w.length > 1; }).map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  if (!words.length) return html;
  var re = new RegExp('(' + words.join('|') + ')', 'gi');
  return html.split(/(<[^>]+>)/).map(function (part) { return part.charAt(0) === '<' ? part : part.replace(re, '<mark class="hl">$1</mark>'); }).join('');
}

/* ---------------- simple markdown (สำหรับคำตอบ AI) ---------------- */
function md(src) {
  var lines = esc(src).split('\n'), out = [], list = null;
  function inline(s) { return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'); }
  function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
  lines.forEach(function (l) {
    var m;
    if ((m = l.match(/^#{1,3}\s+(.*)/))) { closeList(); out.push('<h3>' + inline(m[1]) + '</h3>'); }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
    else if (!l.trim()) { closeList(); }
    else { closeList(); out.push('<p>' + inline(l) + '</p>'); }
  });
  closeList();
  return out.join('');
}

/* ---------------- file download helpers ---------------- */
function downloadText(name, text, mime) {
  try {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return true;
  } catch (e) { reportError('download', e); return false; }
}
function downloadBase64(name, b64, mime) {
  var bin = atob(b64), arr = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  var blob = new Blob([arr], { type: mime });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
}
function copyText(s) {
  function fallback() { var ta = document.createElement('textarea'); ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).catch(fallback); else fallback(); } catch (e) { fallback(); }
  toast('คัดลอกข้อความแล้ว', '', 'ok', { life: 2200 });
}
</script>
