/* ═════════════════════════════════════════════════════════════
   Метеощоденник / Weather Journal — v7
   Авторка: Олеся Бохонок
   Безкоштовно, без реклами, без серверних акаунтів.
   Дані — лише в localStorage цього браузера.
   Зовнішні запити: Open-Meteo (пошук місця, погода) і, лише після
   підтвердження дорослим, Nominatim (назва міста за координатами).
   Код навмисно ES2017 (без ?. та ??), щоб працювати на старіших WebView.
   ═════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ─────────── config ─────────── */

const STORE_KEY = 'meteojournal.v7';
const OLD_STORE_KEYS = ['meteojournal.v6'];
const MAX_RECORDS = 4000;
const MAX_PREDS = 400;
const MAX_PROFILES = 60;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TZ_RE = /^[A-Za-z0-9_+\-/]{1,40}$/;
const RECENT_DAYS = 85;
const DAY_MS = 86400000;

const API = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  archive: 'https://archive-api.open-meteo.com/v1/archive',
  geocode: 'https://geocoding-api.open-meteo.com/v1/search',
  reverse: 'https://nominatim.openstreetmap.org/reverse'
};

/* Додати мову: 1) файл locales/xx.js  2) рядок тут  3) рядок у sw.js (SHELL) */
const LANGS = [
  { c: 'uk', n: 'Українська' }, { c: 'en', n: 'English' }, { c: 'pl', n: 'Polski' },
  { c: 'de', n: 'Deutsch' }, { c: 'es', n: 'Español' }, { c: 'ro', n: 'Română' }, { c: 'ar', n: 'العربية' }
];
const LANG_CODES = LANGS.map(function (l) { return l.c; });

const SKY = ['clear', 'partly', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
const MOODS = ['joy', 'ok', 'sad', 'wow', 'sleepy'];
const AVATARS = ['fox', 'cat', 'dog', 'panda', 'unicorn', 'rocket', 'rainbow', 'owl', 'turtle', 'flower', 'penguin', 'butterfly'];
const AV_EMOJI = { '🦊': 'fox', '🐱': 'cat', '🐶': 'dog', '🐼': 'panda', '🦄': 'unicorn', '🚀': 'rocket', '🌈': 'rainbow', '🦉': 'owl', '🐢': 'turtle', '🌻': 'flower', '🐧': 'penguin', '🦋': 'butterfly' };
const WET_SKY = ['rain', 'storm', 'snow'];
const SKY_GROUP = { clear: 'a', partly: 'a', cloudy: 'b', fog: 'b', rain: 'c', storm: 'c', snow: 'd' };
const TRENDS = ['colder', 'same', 'warmer'];
const TREND_ICON = { colder: 'u-down-t', same: 'u-same-t', warmer: 'u-up-t' };
const WIND_VALUES = [0, 3, 8, 14];   // м/с: тихо, легкий, сильний, дуже сильний
const HUM_VALUES = [30, 55, 80];     // %: сухо, нормально, волого
const LEVELS = [0, 10, 30, 60, 100];
const THERMO_LO = -30, THERMO_HI = 45; // °C, діапазон дитячого термометра
const TREND_DELTA = 2;               // °C, поріг «тепліше / холодніше»

const TEMP_STOPS = [
  [-25, [42, 63, 154]], [-15, [59, 111, 196]], [-5, [111, 168, 220]], [0, [169, 211, 235]],
  [5, [189, 227, 208]], [10, [220, 235, 160]], [15, [243, 226, 123]], [20, [247, 190, 91]],
  [25, [242, 144, 63]], [30, [224, 96, 58]], [35, [178, 58, 72]]
];
const INK_RGB = [22, 33, 43];
const WHITE_RGB = [255, 255, 255];

const STICKERS = [
  { id: 'clear', ic: 'sky-clear', k: 'sky.clear', t: function (r) { return r.sky === 'clear'; } },
  { id: 'partly', ic: 'sky-partly', k: 'sky.partly', t: function (r) { return r.sky === 'partly'; } },
  { id: 'cloudy', ic: 'sky-cloudy', k: 'sky.cloudy', t: function (r) { return r.sky === 'cloudy'; } },
  { id: 'rain', ic: 'sky-rain', k: 'sky.rain', t: function (r) { return r.sky === 'rain'; } },
  { id: 'storm', ic: 'sky-storm', k: 'sky.storm', t: function (r) { return r.sky === 'storm'; } },
  { id: 'snow', ic: 'sky-snow', k: 'sky.snow', t: function (r) { return r.sky === 'snow'; } },
  { id: 'fog', ic: 'sky-fog', k: 'sky.fog', t: function (r) { return r.sky === 'fog'; } },
  { id: 'frost', ic: 'st-frost', k: 'sticker.frost', t: function (r) { return r.temp < 0; } },
  { id: 'hot', ic: 'st-hot', k: 'sticker.hot', t: function (r) { return r.temp >= 25; } },
  { id: 'windy', ic: 'wind-3', k: 'sticker.windy', t: function (r) { return r.wind !== null && r.wind !== undefined && r.wind >= 8; } }
];
const BADGES = [
  { id: 'b1', ic: 'bd-sprout', t: function (s) { return s.total >= 1; } },
  { id: 'b3', ic: 'bd-star', t: function (s) { return s.total >= 3; } },
  { id: 'b7', ic: 'bd-star', t: function (s) { return s.total >= 7; } },
  { id: 'b14', ic: 'bd-crown', t: function (s) { return s.total >= 14; } },
  { id: 'b30', ic: 'bd-trophy', t: function (s) { return s.total >= 30; } },
  { id: 's3', ic: 'bd-flame', t: function (s) { return s.streak >= 3; } },
  { id: 's7', ic: 'bd-flame', t: function (s) { return s.streak >= 7; } },
  { id: 'p1', ic: 'bd-target', t: function (s) { return s.correct >= 1; } },
  { id: 'p3', ic: 'bd-robot', t: function (s) { return s.wins >= 3; } },
  { id: 'book', ic: 'bd-book', t: function (s) { return s.skyKinds >= 7; } }
];
const RECORD_BADGES = [1, 3, 7, 14, 30];

/* ─────────── dom helpers ─────────── */

const $ = function (s, r) { return (r || document).querySelector(s); };
const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
const SVGNS = 'http://www.w3.org/2000/svg';
const XLINK = 'http://www.w3.org/1999/xlink';

function append(n, kid) {
  if (kid === null || kid === undefined || kid === false) return;
  if (Array.isArray(kid)) { kid.forEach(function (k) { append(n, k); }); return; }
  n.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
}
function el(tag, props) {
  const n = document.createElement(tag);
  if (props) {
    Object.keys(props).forEach(function (k) {
      const v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { n.dataset[d] = v[d]; });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    });
  }
  for (let i = 2; i < arguments.length; i++) append(n, arguments[i]);
  return n;
}
function svgEl(tag, attrs) {
  const n = document.createElementNS(SVGNS, tag);
  if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
  for (let i = 2; i < arguments.length; i++) {
    const kid = arguments[i];
    if (kid === null || kid === undefined) continue;
    n.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}
/* <svg><use href="#id"/></svg> з посиланням з sprite, що вбудований у index.html */
function svgUse(id, cls) {
  const s = svgEl('svg', { class: cls || '', 'aria-hidden': 'true', focusable: 'false' });
  const u = svgEl('use', { href: '#' + id });
  u.setAttributeNS(XLINK, 'xlink:href', '#' + id);
  s.appendChild(u);
  return s;
}
const ic = function (id, extra) { return svgUse(id, 'ic' + (extra ? ' ' + extra : '')); };
function setKids(node, kids) {
  while (node.firstChild) node.removeChild(node.firstChild);
  append(node, kids);
}
function setUse(svgNode, id) {
  const u = svgNode.querySelector('use');
  if (!u) return;
  u.setAttribute('href', '#' + id);
  u.setAttributeNS(XLINK, 'xlink:href', '#' + id);
}
const pad = function (n) { return String(n).padStart(2, '0'); };
const round = function (x, d) { const f = Math.pow(10, d || 0); return Math.round(x * f) / f; };
const clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };
const uid = function () { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
const cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
function num(v, min, max) {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  return isFinite(n) && n >= min && n <= max ? n : null;
}
function cleanStr(v, max) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}
function cleanText(v, max) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').trim().slice(0, max) : '';
}
function toInt(v, min, max) {
  const n = Math.round(Number(v));
  return isFinite(n) ? clamp(n, min, max) : min;
}

/* ─────────── state ─────────── */

const state = {
  store: null, lang: 'uk', loc: null, ref: null,
  view: { y: 2000, m: 0 }, activeKey: null, F: null, PF: null,
  busy: false, toastTimer: null, editingProfile: null,
  onbStep: 0, onbAvatar: 'fox', onbCity: null, onboarding: false,
  adultUntil: 0, speechOK: false, installEv: null, updateReady: false, storageOk: true,
  pinFor: null, lastFocus: null, hiResolve: null
};

const P = function () { return state.store.profiles.filter(function (p) { return p.id === state.store.active; })[0]; };
const kidMode = function () { return state.store.kidMode === true; };
const imperial = function () { return state.store.units === 'imperial'; };

/* ─────────── i18n ─────────── */

window.MJ_LOCALES = window.MJ_LOCALES || {};
function loadLocale(code) {
  return new Promise(function (resolve, reject) {
    if (LANG_CODES.indexOf(code) < 0) { reject(new Error('unknown locale')); return; }
    if (window.MJ_LOCALES[code]) { resolve(window.MJ_LOCALES[code]); return; }
    const s = document.createElement('script');
    s.src = 'locales/' + code + '.js';
    s.onload = function () { window.MJ_LOCALES[code] ? resolve(window.MJ_LOCALES[code]) : reject(new Error('bad locale')); };
    s.onerror = function () { reject(new Error('locale load failed')); };
    document.head.appendChild(s);
  });
}
function applyLocaleData(code) {
  state.lang = code;
  state.loc = window.MJ_LOCALES[code];
  state.ref = window.MJ_LOCALES.uk || state.loc;
  const m = state.loc.meta || {};
  document.documentElement.lang = code;
  document.documentElement.dir = m.dir === 'rtl' ? 'rtl' : 'ltr';
}
function localeTag() {
  const l = state.lang;
  const nav = String(navigator.language || '');
  let tag = nav.toLowerCase().indexOf(l) === 0 && nav.length > l.length ? nav : l;
  if (l === 'ar') tag += '-u-nu-latn';
  return tag;
}
const FMT = {};
function dtf(opts) {
  const tag = localeTag(), key = tag + JSON.stringify(opts);
  if (!FMT[key]) {
    try { FMT[key] = new Intl.DateTimeFormat(tag, opts); } catch (e) { FMT[key] = new Intl.DateTimeFormat(state.lang, opts); }
  }
  return FMT[key];
}
function nfmt(d) {
  const tag = localeTag(), key = 'n' + tag + d;
  if (!FMT[key]) {
    try { FMT[key] = new Intl.NumberFormat(tag, { maximumFractionDigits: d }); } catch (e) { FMT[key] = new Intl.NumberFormat(state.lang, { maximumFractionDigits: d }); }
  }
  return FMT[key];
}
function pluralCat(n) {
  const tag = localeTag(), key = 'p' + tag;
  try {
    if (!FMT[key]) FMT[key] = new Intl.PluralRules(tag);
    return FMT[key].select(Math.abs(Number(n)));
  } catch (e) { return Number(n) === 1 ? 'one' : 'other'; }
}
function t(key, params) {
  params = params || {};
  let v;
  if (kidMode() && state.loc) v = state.loc.s[key + '.kid'];
  if (v === undefined && state.loc) v = state.loc.s[key];
  if (v === undefined && state.ref) v = state.ref.s[key];
  if (v === undefined) return key;
  if (typeof v === 'object') v = v[pluralCat(params.n !== undefined ? params.n : 1)] || v.other || '';
  return v.replace(/\{(\w+)\}/g, function (m, k) { return params[k] !== undefined ? String(params[k]) : m; });
}
function detectLang() {
  const cands = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  for (let i = 0; i < cands.length; i++) {
    const parts = String(cands[i]).split('-');
    const base = parts[0].toLowerCase();
    if (LANG_CODES.indexOf(base) >= 0) return base;
    if ((parts[1] || '').toUpperCase() === 'UA') return 'uk';
  }
  return 'en';
}
function detectUnits() {
  const reg = String(navigator.language || '').split('-')[1];
  return reg && ['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH'].indexOf(reg.toUpperCase()) >= 0 ? 'imperial' : 'metric';
}
function weekStart() {
  try {
    const loc = new Intl.Locale(localeTag());
    const wi = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
    if (wi && wi.firstDay) return wi.firstDay % 7;
  } catch (e) { /* старі браузери */ }
  const m = state.loc && state.loc.meta;
  return m && m.weekStart !== undefined ? m.weekStart : 1;
}

/* ─────────── units / format ─────────── */

const toDispT = function (c) { return imperial() ? c * 9 / 5 + 32 : c; };
const fromDispT = function (v) { return imperial() ? (v - 32) * 5 / 9 : v; };
const toDispDelta = function (d) { return imperial() ? d * 9 / 5 : d; };
const toDispW = function (ms) { return imperial() ? ms * 2.2369363 : ms; };
const fromDispW = function (v) { return imperial() ? v / 2.2369363 : v; };
const tempUnit = function () { return t(imperial() ? 'unit.f' : 'unit.c'); };
const windUnit = function () { return t(imperial() ? 'unit.mph' : 'unit.ms'); };
function fmtNum(x, d) {
  d = d === undefined ? 1 : d;
  let v = round(x, d);
  if (v === 0) v = 0;
  return nfmt(d).format(v);
}
const fmtTemp = function (c) { return fmtNum(toDispT(c)) + ' ' + tempUnit(); };
const fmtWind = function (ms) { return fmtNum(toDispW(ms)) + ' ' + windUnit(); };
const signed = function (x) { return (x > 0 ? '+' : '') + fmtNum(x); };
const dirName = function (i) { return t('dir.' + i); };
const dirFromDeg = function (deg) { return Math.round((((deg % 360) + 360) % 360) / 45) % 8; };
function fmtCoord(lat, lon) {
  return fmtNum(Math.abs(lat), 2) + '° ' + t(lat >= 0 ? 'coord.N' : 'coord.S') + ', ' + fmtNum(Math.abs(lon), 2) + '° ' + t(lon >= 0 ? 'coord.E' : 'coord.W');
}
const windStep = function (ms) { return ms < 1.6 ? 0 : ms < 5.5 ? 1 : ms < 10.8 ? 2 : 3; };
const humStep = function (h) { return h < 40 ? 0 : h < 70 ? 1 : 2; };

/* ─────────── colors ─────────── */

function tempRGB(c) {
  const first = TEMP_STOPS[0], last = TEMP_STOPS[TEMP_STOPS.length - 1];
  if (c <= first[0]) return first[1].slice();
  if (c >= last[0]) return last[1].slice();
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const c1 = TEMP_STOPS[i][0], rgb1 = TEMP_STOPS[i][1];
    if (c <= c1) {
      const c0 = TEMP_STOPS[i - 1][0], rgb0 = TEMP_STOPS[i - 1][1];
      const f = (c - c0) / (c1 - c0);
      return rgb0.map(function (v, j) { return Math.round(v + (rgb1[j] - v) * f); });
    }
  }
  return last[1].slice();
}
const rgbCss = function (rgb) { return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')'; };
function luminance(rgb) {
  const lin = rgb.map(function (v) { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const readableOn = function (rgb) { return contrastRatio(rgb, INK_RGB) >= contrastRatio(rgb, WHITE_RGB) ? INK_RGB : WHITE_RGB; };

/* ─────────── dates ─────────── */

const keyOf = function (y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); };
const daysIn = function (y, m) { return new Date(y, m + 1, 0).getDate(); };
function todayParts() { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() }; }
const todayKey = function () { const n = todayParts(); return keyOf(n.y, n.m, n.d); };
function parseKey(k) { const a = k.split('-').map(Number); return { y: a[0], m: a[1] - 1, d: a[2] }; }
function validDate(k) {
  if (typeof k !== 'string' || !DATE_RE.test(k)) return false;
  const p = parseKey(k);
  return p.y >= 1990 && p.y <= 2100 && p.m >= 0 && p.m <= 11 && p.d >= 1 && p.d <= daysIn(p.y, p.m);
}
function addDays(k, n) { const p = parseKey(k); const x = new Date(p.y, p.m, p.d + n); return keyOf(x.getFullYear(), x.getMonth(), x.getDate()); }
function longDate(k) { const p = parseKey(k); return dtf({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(p.y, p.m, p.d)); }
function shortDate(k) { const p = parseKey(k); return dtf({ day: 'numeric', month: 'short' }).format(new Date(p.y, p.m, p.d)); }
function monthTitle(y, m) {
  let s = dtf({ month: 'long', year: 'numeric' }).format(new Date(y, m, 1));
  if (state.lang === 'uk') s = s.replace(/\s*р\.?$/, '');
  return cap(s);
}
const nowHHMM = function () { const n = new Date(); return pad(n.getHours()) + ':' + pad(n.getMinutes()); };

/* ─────────── storage: sanitize ─────────── */

function sanitizeCity(c) {
  if (!c || typeof c !== 'object') return null;
  const name = cleanStr(c.name, 60);
  if (!name) return null;
  let lat = num(c.lat, -90, 90), lon = num(c.lon, -180, 180);
  if (lat === null || lon === null) { lat = null; lon = null; } else { lat = round(lat, 2); lon = round(lon, 2); }
  return { name: name, admin: cleanStr(c.admin, 60), country: cleanStr(c.country, 60), lat: lat, lon: lon,
    tz: typeof c.tz === 'string' && TZ_RE.test(c.tz) ? c.tz : null };
}
function sanitizeReal(r) {
  if (!r || typeof r !== 'object') return null;
  const temp = num(r.temp, -90, 60);
  if (temp === null) return null;
  return {
    temp: round(temp, 1), hum: num(r.hum, 0, 100), wind: num(r.wind, 0, 100),
    dir: Number.isInteger(r.dir) && r.dir >= 0 && r.dir <= 7 ? r.dir : null,
    sky: SKY.indexOf(r.sky) >= 0 ? r.sky : null, at: cleanStr(r.at, 30)
  };
}
function sanitizeRecord(v) {
  if (!v || typeof v !== 'object') return null;
  const temp = num(v.temp, -90, 60);
  const sky = SKY.indexOf(v.sky) >= 0 ? v.sky : null;
  if (temp === null || !sky) return null;
  const r = {
    temp: round(temp, 2), sky: sky,
    t: typeof v.t === 'string' && TIME_RE.test(v.t) ? v.t : null,
    hum: num(v.hum, 0, 100), wind: num(v.wind, 0, 100),
    dir: Number.isInteger(v.dir) && v.dir >= 0 && v.dir <= 7 ? v.dir : null,
    mood: MOODS.indexOf(v.mood) >= 0 ? v.mood : null,
    notes: cleanText(v.notes, 500)
  };
  const real = sanitizeReal(v.real);
  if (real) r.real = real;
  return r;
}
function sanitizePred(v) {
  if (!v || typeof v !== 'object') return null;
  const tr = TRENDS.indexOf(v.tr) >= 0 ? v.tr : null;
  const sk = SKY.indexOf(v.sk) >= 0 ? v.sk : null;
  const base = num(v.base, -90, 60);
  if (!tr || !sk || base === null) return null;
  const p = { tr: tr, sk: sk, base: round(base, 2), mtr: TRENDS.indexOf(v.mtr) >= 0 ? v.mtr : null, msk: SKY.indexOf(v.msk) >= 0 ? v.msk : null, res: null };
  const r = v.res;
  if (r && typeof r === 'object') {
    p.res = {
      tr: r.tr === true, sk: r.sk === true,
      mtr: r.mtr === true ? true : (r.mtr === false ? false : null),
      msk: r.msk === true ? true : (r.msk === false ? false : null),
      pts: toInt(r.pts, 0, 20), out: ['win', 'draw', 'lose', 'none'].indexOf(r.out) >= 0 ? r.out : 'none'
    };
  }
  return p;
}
function sanitizeProfile(p, keepId) {
  if (!p || typeof p !== 'object') return null;
  const records = {}; let count = 0;
  if (p.records && typeof p.records === 'object') {
    Object.keys(p.records).forEach(function (k) {
      if (count >= MAX_RECORDS || !validDate(k)) return;
      const r = sanitizeRecord(p.records[k]);
      if (r) { records[k] = r; count++; }
    });
  }
  const preds = {}; let pc = 0;
  if (p.preds && typeof p.preds === 'object') {
    Object.keys(p.preds).forEach(function (k) {
      if (pc >= MAX_PREDS || !validDate(k)) return;
      const r = sanitizePred(p.preds[k]);
      if (r) { preds[k] = r; pc++; }
    });
  }
  let av = typeof p.avatar === 'string' ? (AV_EMOJI[p.avatar] || p.avatar) : '';
  if (AVATARS.indexOf(av) < 0) av = AVATARS[0];
  const pin = keepId && p.pin && typeof p.pin === 'object' && /^[A-Za-z0-9]{6,32}$/.test(String(p.pin.s)) && /^[0-9a-f]{1,64}$/.test(String(p.pin.h))
    ? { s: p.pin.s, h: p.pin.h } : null;
  return {
    id: keepId && typeof p.id === 'string' && /^[\w-]{1,40}$/.test(p.id) ? p.id : uid(),
    name: cleanStr(p.name, 40), cls: cleanStr(p.cls, 10), avatar: av,
    city: sanitizeCity(p.city), records: records, preds: preds, pin: pin
  };
}
function sanitizeA11y(a) {
  a = a && typeof a === 'object' ? a : {};
  return { hc: a.hc === true, large: a.large === true, readable: a.readable === true, hideChart: a.hideChart === true };
}
function sanitizeMeta(m) {
  m = m && typeof m === 'object' ? m : {};
  const d = m.dismissed && typeof m.dismissed === 'object' ? m.dismissed : {};
  return {
    created: toInt(m.created || Date.now(), 0, 4e12), lastExport: toInt(m.lastExport || 0, 0, 4e12),
    persisted: m.persisted === true, dismissed: { ios: toInt(d.ios || 0, 0, 4e12), exp: toInt(d.exp || 0, 0, 4e12) }
  };
}
function defaultStore() {
  const prof = sanitizeProfile({ name: '', cls: '', avatar: AVATARS[0], city: null, records: {}, preds: {} }, false);
  return {
    v: 7, lang: detectLang(), units: detectUnits(), a11y: sanitizeA11y(null), kidMode: true, speak: true,
    onboarded: false, active: prof.id, profiles: [prof], meta: sanitizeMeta(null)
  };
}
function sanitizeStore(x) {
  if (!x || typeof x !== 'object' || !Array.isArray(x.profiles)) return null;
  const profiles = x.profiles.slice(0, MAX_PROFILES).map(function (p) { return sanitizeProfile(p, true); }).filter(Boolean);
  if (!profiles.length) return null;
  return {
    v: 7, lang: LANG_CODES.indexOf(x.lang) >= 0 ? x.lang : detectLang(),
    units: x.units === 'imperial' ? 'imperial' : 'metric', a11y: sanitizeA11y(x.a11y),
    kidMode: x.kidMode !== false, speak: x.speak !== false, onboarded: x.onboarded === true,
    active: profiles.some(function (p) { return p.id === x.active; }) ? x.active : profiles[0].id,
    profiles: profiles, meta: sanitizeMeta(x.meta)
  };
}

/* ─────────── storage: migration from v1 / v6 ─────────── */

const V1_SKY = { '☀️': 'clear', '🌤️': 'partly', '☁️': 'cloudy', '🌧️': 'rain', '⛈️': 'storm', '❄️': 'snow', '🌫️': 'fog' };
const V1_MOOD = { '😀': 'joy', '😐': 'ok', '😢': 'sad', '🤩': 'wow', '😴': 'sleepy' };
const V1_DIR = { 'Пн': 0, 'Сх': 2, 'Пд': 4, 'Зх': 6 };
function convertV1(data) {
  const meta = data.meta && typeof data.meta === 'object' ? data.meta : {};
  const out = {};
  if (data.records && typeof data.records === 'object') {
    Object.keys(data.records).forEach(function (k) {
      const r = data.records[k];
      const mt = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(k);
      if (!mt || !r || typeof r !== 'object') return;
      out[mt[1] + '-' + pad(Number(mt[2])) + '-' + pad(Number(mt[3]))] = {
        temp: r.temp, sky: V1_SKY[r.sky], t: null, hum: r.hum, wind: r.wind,
        dir: V1_DIR[r.dir] === undefined ? null : V1_DIR[r.dir], mood: V1_MOOD[r.mood] || null, notes: r.notes
      };
    });
  }
  const cityName = cleanStr(meta.city, 60);
  return sanitizeProfile({ name: meta.name, cls: meta['class'], avatar: meta.avatar, city: cityName ? { name: cityName, lat: null, lon: null } : null, records: out }, false);
}
function migrateV1() {
  try {
    const rawR = localStorage.getItem('wl_records'), rawM = localStorage.getItem('wl_meta');
    if (!rawR && !rawM) return null;
    const prof = convertV1({ records: rawR ? JSON.parse(rawR) : {}, meta: rawM ? JSON.parse(rawM) : {} });
    if (!prof) return null;
    const s = defaultStore();
    s.profiles = [prof]; s.active = prof.id; s.onboarded = true;
    const l = localStorage.getItem('wl_lang');
    if (l && LANG_CODES.indexOf(l) >= 0) s.lang = l;
    try {
      const a = JSON.parse(localStorage.getItem('wl_a11y') || 'null');
      if (a) s.a11y = sanitizeA11y({ hc: a.highContrast, large: a.largeText, readable: a.dyslexicFont, hideChart: a.simplified });
    } catch (e) { /* ignore */ }
    return s;
  } catch (e) { return null; }
}
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const s = sanitizeStore(JSON.parse(raw)); if (s) return s; }
  } catch (e) { /* падаємо на міграцію */ }
  for (let i = 0; i < OLD_STORE_KEYS.length; i++) {
    try {
      const raw = localStorage.getItem(OLD_STORE_KEYS[i]);
      if (raw) { const s = sanitizeStore(JSON.parse(raw)); if (s) { s.onboarded = s.onboarded === true; return s; } }
    } catch (e) { /* далі */ }
  }
  return migrateV1() || defaultStore();
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.store)); state.storageOk = true; }
  catch (e) { state.storageOk = false; }
  updateBanner();
}
function requestPersist() {
  const m = state.store.meta;
  if (m.persisted || !navigator.storage || !navigator.storage.persist) return;
  navigator.storage.persist().then(function (ok) { m.persisted = !!ok; saveStore(); }).catch(function () { /* ignore */ });
}

/* ─────────── PIN ─────────── */

function randSalt() {
  const a = new Uint8Array(8);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (let i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
function hashPin(pin, salt) {
  const s = salt + ':' + pin;
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (d) {
      return Array.prototype.map.call(new Uint8Array(d), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return Promise.resolve('f' + h.toString(16));
}

/* ─────────── records, game logic ─────────── */

function monthRecords(p, y, m) {
  const prefix = y + '-' + pad(m + 1) + '-';
  return Object.keys(p.records).filter(function (k) { return k.indexOf(prefix) === 0; }).sort().map(function (k) {
    return Object.assign({ key: k, day: Number(k.slice(8)) }, p.records[k]);
  });
}
function computeStats(list) {
  if (!list.length) return null;
  const sum = list.reduce(function (a, r) { return a + r.temp; }, 0);
  let max = list[0], min = list[0];
  list.forEach(function (r) { if (r.temp > max.temp) max = r; if (r.temp < min.temp) min = r; });
  const wind = [0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) { if (r.dir !== null && r.dir !== undefined) wind[r.dir]++; });
  const windMax = Math.max.apply(null, wind);
  const cmp = list.filter(function (r) { return r.real && r.real.temp !== null; });
  return {
    n: list.length, mean: sum / list.length, max: { v: max.temp, key: max.key }, min: { v: min.temp, key: min.key },
    amp: max.temp - min.temp, wet: list.filter(function (r) { return WET_SKY.indexOf(r.sky) >= 0; }).length,
    wind: wind, windTop: windMax > 0 ? wind.indexOf(windMax) : null,
    mae: cmp.length ? cmp.reduce(function (a, r) { return a + Math.abs(r.temp - r.real.temp); }, 0) / cmp.length : null, cmpN: cmp.length
  };
}
const classifyTrend = function (delta) { return delta >= TREND_DELTA ? 'warmer' : delta <= -TREND_DELTA ? 'colder' : 'same'; };
const skyClose = function (a, b) { return !!a && !!b && SKY_GROUP[a] === SKY_GROUP[b]; };
function resolvePred(pred, rec) {
  const realTr = classifyTrend(rec.temp - pred.base);
  const tr = pred.tr === realTr, sk = skyClose(pred.sk, rec.sky);
  const mtr = pred.mtr === null ? null : pred.mtr === realTr;
  const msk = pred.msk === null ? null : skyClose(pred.msk, rec.sky);
  const robot = mtr !== null || msk !== null;
  const kc = (tr ? 1 : 0) + (sk ? 1 : 0), rc = (mtr === true ? 1 : 0) + (msk === true ? 1 : 0);
  let out = 'none';
  if (robot) out = kc > rc ? 'win' : kc === rc ? 'draw' : 'lose';
  const pts = (tr ? 2 : 0) + (sk ? 2 : 0) + (out === 'win' ? 3 : 0);
  return { tr: tr, sk: sk, mtr: mtr, msk: msk, pts: pts, out: out, realTr: realTr };
}
function calcStreak(records) {
  const today = todayKey();
  let d = records[today] ? today : addDays(today, -1);
  let n = 0, forgiven = false;
  for (let i = 0; i < 4000; i++) {
    if (records[d]) n++;
    else { if (n === 0 || forgiven || !records[addDays(d, -1)]) break; forgiven = true; }
    d = addDays(d, -1);
  }
  return n;
}
function bestRun(records) {
  const keys = Object.keys(records).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach(function (k) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  });
  return best;
}
function levelOf(stars) {
  let l = 0;
  for (let i = 0; i < LEVELS.length; i++) if (stars >= LEVELS[i]) l = i;
  return l;
}
function gameSnapshot(p) {
  const keys = Object.keys(p.records);
  const stickers = {};
  keys.forEach(function (k) { const r = p.records[k]; STICKERS.forEach(function (s) { if (s.t(r)) stickers[s.id] = true; }); });
  let pts = 0, wins = 0, correct = 0;
  Object.keys(p.preds).forEach(function (k) {
    const r = p.preds[k].res;
    if (!r) return;
    pts += r.pts;
    if (r.out === 'win') wins++;
    if (r.tr || r.sk) correct++;
  });
  const skyKinds = SKY.filter(function (s) { return stickers[s]; }).length;
  const stats = { total: keys.length, streak: Math.max(calcStreak(p.records), bestRun(p.records)), wins: wins, correct: correct, skyKinds: skyKinds };
  const badges = {};
  BADGES.forEach(function (b) { if (b.t(stats)) badges[b.id] = true; });
  const stars = keys.length + pts;
  return { stars: stars, level: levelOf(stars), stickers: stickers, badges: badges, stats: stats, streakNow: calcStreak(p.records) };
}

/* ─────────── dialogs / toast / gate / pin / speech ─────────── */

function lockScroll() { document.documentElement.classList.toggle('lock', $$('dialog[open]').length > 0); }
function openDialog(d) {
  state.lastFocus = document.activeElement;
  if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); }
  else { d.setAttribute('open', ''); $('#scrim').hidden = false; }
  lockScroll();
}
function closeDialog(d) {
  if (typeof d.close === 'function') { if (d.open) d.close(); }
  else { d.removeAttribute('open'); $('#scrim').hidden = true; d.dispatchEvent(new Event('close')); }
  lockScroll();
}
function toast(msg) {
  const box = $('#toast');
  box.textContent = msg;
  box.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(function () { box.classList.remove('show'); }, 5000);
}
function askConfirm(title, text, okLabel) {
  return new Promise(function (resolve) {
    const d = $('#dlg-confirm'), okBtn = $('#confirm-ok'), cancelBtn = $('#confirm-cancel');
    $('#confirm-title').textContent = title;
    $('#confirm-text').textContent = text;
    okBtn.textContent = okLabel || t('ui.ok');
    let done = false;
    function finish(v) {
      if (done) return;
      done = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      d.removeEventListener('close', onCancel);
      closeDialog(d);
      resolve(v);
    }
    function onOk() { finish(true); }
    function onCancel() { finish(false); }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    d.addEventListener('close', onCancel);
    openDialog(d);
    cancelBtn.focus();
  });
}

/* «Для дорослих»: невелика перешкода (приклад на множення), а не справжній захист. */
let gateAns = 0, gateRes = null;
function newGate() {
  const a = 13 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 4);
  gateAns = a * b;
  $('#gate-q').textContent = t('gate.q', { a: a, b: b });
  $('#gate-a').value = '';
}
function adultOK(force) {
  if (!force && (!kidMode() || Date.now() < state.adultUntil)) return Promise.resolve(true);
  return new Promise(function (resolve) {
    gateRes = resolve;
    newGate();
    $('#gate-err').hidden = true;
    $('#gate-text').textContent = t('gate.text');
    openDialog($('#dlg-gate'));
    setTimeout(function () { $('#gate-a').focus(); }, 60);
  });
}
function finishGate(v) {
  const r = gateRes; gateRes = null;
  closeDialog($('#dlg-gate'));
  if (r) r(v);
}
function askPin(profile) {
  return new Promise(function (resolve) {
    state.pinFor = { profile: profile, resolve: resolve };
    $('#pin-title').textContent = t('pin.title', { name: profile.name || t('profile.default') });
    $('#pin-a').value = '';
    $('#pin-err').hidden = true;
    openDialog($('#dlg-pin'));
    setTimeout(function () { $('#pin-a').focus(); }, 60);
  });
}
function finishPin(v) {
  const s = state.pinFor; state.pinFor = null;
  closeDialog($('#dlg-pin'));
  if (s) s.resolve(v);
}

let voices = [];
function updateSpeech() {
  const ss = window.speechSynthesis;
  voices = ss && ss.getVoices ? ss.getVoices() : [];
  state.speechOK = voices.some(function (v) { return v.lang && v.lang.toLowerCase().replace('_', '-').indexOf(state.lang) === 0; });
  document.documentElement.classList.toggle('can-speak', state.speechOK && state.store && state.store.speak !== false);
}
function initSpeech() {
  if (!('speechSynthesis' in window)) return;
  updateSpeech();
  try { window.speechSynthesis.addEventListener('voiceschanged', updateSpeech); } catch (e) { window.speechSynthesis.onvoiceschanged = updateSpeech; }
}
function speak(text) {
  if (!state.speechOK || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = state.lang;
    const v = voices.filter(function (x) { return x.lang && x.lang.toLowerCase().replace('_', '-').indexOf(state.lang) === 0; })[0];
    if (v) u.voice = v;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) { /* озвучення необов'язкове */ }
}

/* ─────────── static texts / modes ─────────── */

function buildLangSelect() {
  const sel = $('#lang-select');
  setKids(sel, LANGS.map(function (l) { return el('option', { value: l.c, text: l.n }); }));
  sel.value = state.lang;
}
function applyStatic() {
  document.title = t('app.title');
  $$('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
  $$('[data-i18n-attr]').forEach(function (n) {
    n.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
      const i = pair.indexOf(':');
      if (i > 0) n.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim()));
    });
  });
  $('#brand-mark').textContent = t('app.shortName');
  $('#onb-title').textContent = t('app.shortName');
  $('#onb-sub').textContent = t('app.tagline');
  $('#foot-text').textContent = t('foot.text');
  const sel = $('#lang-select'); if (sel) sel.value = state.lang;
  $$('#onb-langs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === state.lang)); });
}
function applyA11y() {
  const a = state.store.a11y, root = document.documentElement;
  root.classList.toggle('hc', a.hc);
  root.classList.toggle('lg', a.large);
  root.classList.toggle('rf', a.readable);
  root.classList.toggle('kid', kidMode());
  root.classList.toggle('simple', a.hideChart === true);
  updateSpeech();
}

/* ─────────── render: header, place, legend, calendar ─────────── */

function renderHeader() {
  const p = P();
  setUse($('#profile-avatar'), 'av-' + p.avatar);
  $('#profile-name').textContent = p.name || t('profile.default');
  $('#btn-profile').setAttribute('aria-label', t('profile.btnLabel', { name: p.name || t('profile.default') }));
}
function renderPlace() {
  const c = P().city;
  $('#place-name').textContent = c ? c.name : t('place.unset');
  $('#place-coords').textContent = c && c.lat !== null ? fmtCoord(c.lat, c.lon) : (c ? t('place.noCoords') : '');
}
function renderLegend() {
  $('#legend-caption').textContent = t('legend.caption', { unit: tempUnit() });
  const lo = TEMP_STOPS[0][0], hi = TEMP_STOPS[TEMP_STOPS.length - 1][0];
  const stops = TEMP_STOPS.map(function (s) { return rgbCss(s[1]) + ' ' + round((s[0] - lo) / (hi - lo) * 100, 1) + '%'; });
  $('#legend-bar').style.background = 'linear-gradient(to right, ' + stops.join(', ') + ')';
  const ticks = $('#legend-ticks');
  setKids(ticks, [-20, -10, 0, 10, 20, 30].map(function (c) {
    const s = el('span', { text: fmtNum(toDispT(c), 0) });
    s.style.left = ((c - lo) / (hi - lo) * 100) + '%';
    return s;
  }));
}
function renderMonth() {
  const p = P(), y = state.view.y, m = state.view.m;
  const dim = daysIn(y, m), today = todayParts(), tk = keyOf(today.y, today.m, today.d);
  const title = monthTitle(y, m);
  $('#month-title').textContent = title;
  $('#cal-caption-table').textContent = t('cal.caption', { month: title });

  const ws = weekStart();
  setKids($('#cal-head-row'), [0, 1, 2, 3, 4, 5, 6].map(function (i) {
    const idx = (ws + i) % 7;
    const ref = new Date(2021, 0, 3 + idx); // 3 січня 2021 — неділя
    return el('th', { scope: 'col' }, el('abbr', { title: cap(dtf({ weekday: 'long' }).format(ref)), text: cap(dtf({ weekday: 'short' }).format(ref)) }));
  }));

  const offset = (new Date(y, m, 1).getDay() - ws + 7) % 7;
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(el('td', { 'aria-hidden': 'true' }));
  for (let d = 1; d <= dim; d++) {
    const key = keyOf(y, m, d), rec = p.records[key], future = key > tk, pred = p.preds[key];
    let label = rec ? t('cal.cellFilled', { date: longDate(key), temp: fmtTemp(rec.temp), sky: t('sky.' + rec.sky) })
      : future ? t('cal.cellFuture', { date: longDate(key) }) : t('cal.cellEmpty', { date: longDate(key) });
    const hasPred = pred && !pred.res;
    if (hasPred) label += ', ' + t('cal.pred');
    const btn = el('button', { type: 'button', class: 'day', dataset: { date: key }, disabled: future, 'aria-current': key === tk ? 'date' : null, 'aria-label': label },
      el('span', { class: 'd', 'aria-hidden': 'true', text: d }));
    if (key === tk) btn.classList.add('today');
    if (rec) {
      const rgb = tempRGB(rec.temp);
      btn.classList.add('has');
      btn.style.setProperty('--bg-cell', rgbCss(rgb));
      btn.style.setProperty('--fg-cell', rgbCss(readableOn(rgb)));
      btn.appendChild(svgUse('sky-' + rec.sky, 'sk'));
      btn.appendChild(el('span', { class: 'v', 'aria-hidden': 'true', text: fmtNum(toDispT(rec.temp), 0) + '°' }));
    }
    if (hasPred) btn.appendChild(el('span', { class: 'pdot', 'aria-hidden': 'true' }));
    cells.push(el('td', null, btn));
  }
  while (cells.length % 7) cells.push(el('td', { 'aria-hidden': 'true' }));
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(el('tr', null, cells.slice(i, i + 7)));
  setKids($('#cal-body'), rows);

  $('#btn-next').disabled = y > today.y || (y === today.y && m >= today.m);
  const n = monthRecords(p, y, m).length;
  $('#cal-hint').textContent = n ? t('cal.hintSome', { n: n }) : t('cal.hintEmpty');
}

/* ─────────── render: chart, stats, rose ─────────── */

function niceStep(range) {
  const raw = range / 4;
  const steps = [1, 2, 5, 10, 20, 50];
  for (let i = 0; i < steps.length; i++) if (steps[i] >= raw) return steps[i];
  return 100;
}
function buildRecordsTable(list, withNotes) {
  const hasReal = list.some(function (r) { return r.real; });
  const head = [t('th.day'), t('th.time'), t('th.temp'), t('th.sky'), t('th.hum'), t('th.wind')];
  if (hasReal) head.push(t('th.real'));
  if (withNotes) head.push(t('th.notes'));
  const rows = list.map(function (r) {
    const hasW = r.wind !== null && r.wind !== undefined, hasD = r.dir !== null && r.dir !== undefined;
    const cells = [shortDate(r.key), r.t || '—', fmtTemp(r.temp), t('sky.' + r.sky),
      r.hum === null || r.hum === undefined ? '—' : fmtNum(r.hum, 0) + ' %',
      !hasW && !hasD ? '—' : [hasD ? dirName(r.dir) : '', hasW ? fmtWind(r.wind) : ''].filter(Boolean).join(', ')];
    if (hasReal) cells.push(r.real ? fmtTemp(r.real.temp) : '—');
    if (withNotes) cells.push(r.notes || '');
    return el('tr', null, cells.map(function (c) { return el('td', { text: c }); }));
  });
  return el('table', { class: 'data' }, el('thead', null, el('tr', null, head.map(function (h) { return el('th', { scope: 'col', text: h }); }))), el('tbody', null, rows));
}
function renderChart() {
  const p = P(), y = state.view.y, m = state.view.m, dim = daysIn(y, m);
  const box = $('#chart'), legendBox = $('#chart-legend'), tableBox = $('#chart-table');
  setKids(box, null); setKids(legendBox, null); setKids(tableBox, null);
  const list = monthRecords(p, y, m);
  $('#chart-empty').hidden = list.length > 0;
  if (!list.length) return;

  const vals = [];
  list.forEach(function (r) { vals.push(toDispT(r.temp)); if (r.real) vals.push(toDispT(r.real.temp)); });
  let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  const step = niceStep(hi - lo || 10);
  lo = Math.floor((lo - 1) / step) * step;
  hi = Math.ceil((hi + 1) / step) * step;

  const W = 640, H = 270, ML = 46, MR = 14, MT = 14, MB = 34;
  const X = function (d) { return ML + (dim > 1 ? (d - 1) / (dim - 1) : 0.5) * (W - ML - MR); };
  const Y = function (v) { return MT + (hi - v) / (hi - lo) * (H - MT - MB); };
  const minC = Math.min.apply(null, list.map(function (r) { return r.temp; }));
  const maxC = Math.max.apply(null, list.map(function (r) { return r.temp; }));
  const s = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', class: 'chart-svg',
    'aria-label': t('chart.alt', { month: monthTitle(y, m), n: list.length, min: fmtTemp(minC), max: fmtTemp(maxC) }) });

  const grid = svgEl('g', { class: 'ch-grid' });
  for (let v = lo; v <= hi + 1e-9; v += step) {
    grid.appendChild(svgEl('line', { x1: ML, x2: W - MR, y1: Y(v), y2: Y(v) }));
    grid.appendChild(svgEl('text', { x: ML - 8, y: Y(v), class: 'ch-y', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, fmtNum(v, 0)));
  }
  s.appendChild(grid);
  const fz = imperial() ? 32 : 0;
  if (fz > lo && fz < hi) s.appendChild(svgEl('line', { x1: ML, x2: W - MR, y1: Y(fz), y2: Y(fz), class: 'ch-freeze' }));
  const xs = svgEl('g', { class: 'ch-x' });
  for (let d = 1; d <= dim; d++) if (d === 1 || d % 5 === 0) xs.appendChild(svgEl('text', { x: X(d), y: H - 12, 'text-anchor': 'middle' }, fmtNum(d, 0)));
  s.appendChild(xs);

  const line = function (pts) { return pts.map(function (a) { return round(X(a[0]), 1) + ',' + round(Y(a[1]), 1); }).join(' '); };
  if (list.length > 1) s.appendChild(svgEl('polyline', { points: line(list.map(function (r) { return [r.day, toDispT(r.temp)]; })), class: 'ch-mine' }));
  const real = list.filter(function (r) { return r.real; });
  if (real.length > 1) s.appendChild(svgEl('polyline', { points: line(real.map(function (r) { return [r.day, toDispT(r.real.temp)]; })), class: 'ch-real' }));
  real.forEach(function (r) { s.appendChild(svgEl('circle', { cx: round(X(r.day), 1), cy: round(Y(toDispT(r.real.temp)), 1), r: 3.5, class: 'ch-real-dot' })); });
  list.forEach(function (r) {
    s.appendChild(svgEl('circle', { cx: round(X(r.day), 1), cy: round(Y(toDispT(r.temp)), 1), r: 5.5, class: 'ch-dot', fill: rgbCss(tempRGB(r.temp)) },
      svgEl('title', null, shortDate(r.key) + ': ' + fmtTemp(r.temp))));
  });
  box.appendChild(s);

  legendBox.appendChild(el('li', null, el('span', { class: 'lg-line', 'aria-hidden': 'true' }), t('chart.mine')));
  if (real.length) legendBox.appendChild(el('li', null, el('span', { class: 'lg-dash', 'aria-hidden': 'true' }), t('chart.real')));
  if (fz > lo && fz < hi) legendBox.appendChild(el('li', null, el('span', { class: 'lg-freeze', 'aria-hidden': 'true' }), t('chart.freeze')));
  tableBox.appendChild(buildRecordsTable(list, false));
}
function buildStatsList(s, full) {
  const dl = el('dl', { class: 'stats' });
  const row = function (label, value) { dl.appendChild(el('dt', { text: label })); dl.appendChild(el('dd', { text: value })); };
  row(t('stats.records'), fmtNum(s.n, 0));
  row(t('stats.max'), fmtTemp(s.max.v) + ', ' + shortDate(s.max.key));
  row(t('stats.min'), fmtTemp(s.min.v) + ', ' + shortDate(s.min.key));
  row(t('stats.wet'), fmtNum(s.wet, 0));
  if (full) row(t('stats.amp'), fmtNum(toDispDelta(s.amp)) + ' ' + tempUnit());
  if (s.windTop !== null) row(t('stats.wind'), dirName(s.windTop));
  if (full && s.mae !== null) row(t('stats.mae'), fmtNum(toDispDelta(s.mae)) + ' ' + tempUnit());
  return dl;
}
function renderStats() {
  const p = P(), box = $('#stats');
  setKids(box, null);
  const list = monthRecords(p, state.view.y, state.view.m);
  if (!list.length) { box.appendChild(el('p', { class: 'hint', text: t('stats.empty') })); return; }
  const s = computeStats(list), rgb = tempRGB(s.mean);
  const mean = el('div', { class: 'mean' }, el('span', { class: 'mean-num', text: fmtTemp(s.mean) }), el('span', { class: 'mean-lbl', text: t('stats.mean') }));
  mean.style.setProperty('--bg-cell', rgbCss(rgb));
  mean.style.setProperty('--fg-cell', rgbCss(readableOn(rgb)));
  box.appendChild(mean);
  box.appendChild(buildStatsList(s, !kidMode()));
}
function renderRose() {
  const p = P(), box = $('#rose'), hint = $('#rose-hint');
  setKids(box, null);
  const list = monthRecords(p, state.view.y, state.view.m);
  const counts = [0, 0, 0, 0, 0, 0, 0, 0];
  list.forEach(function (r) { if (r.dir !== null && r.dir !== undefined) counts[r.dir]++; });
  const max = Math.max.apply(null, counts);
  if (max === 0) { hint.textContent = t('rose.empty'); return; }
  hint.textContent = t('rose.hint');
  const C = 110, R = 72;
  const pt = function (i, r) { const a = i * Math.PI / 4; return [round(C + r * Math.sin(a), 1), round(C - r * Math.cos(a), 1)]; };
  const listText = counts.map(function (c, i) { return c ? dirName(i) + ': ' + c : null; }).filter(Boolean).join(', ');
  const s = svgEl('svg', { viewBox: '0 0 220 220', role: 'img', class: 'rose-svg', 'aria-label': t('rose.alt', { list: listText }) });
  [0.5, 1].forEach(function (f) { s.appendChild(svgEl('circle', { cx: C, cy: C, r: R * f, class: 'rose-ring' })); });
  for (let i = 0; i < 8; i++) {
    const a = pt(i, R), b = pt(i, R + 17);
    s.appendChild(svgEl('line', { x1: C, y1: C, x2: a[0], y2: a[1], class: 'rose-axis' }));
    s.appendChild(svgEl('text', { x: b[0], y: b[1], class: i % 2 ? 'rose-lbl minor' : 'rose-lbl', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, dirName(i)));
  }
  const nonZero = counts.filter(function (c) { return c > 0; }).length;
  counts.forEach(function (c, i) {
    if (!c) return;
    const a = pt(i, R * c / max);
    s.appendChild(svgEl('line', { x1: C, y1: C, x2: a[0], y2: a[1], stroke: '#1F5FA8', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.85 }));
  });
  if (nonZero >= 3) s.appendChild(svgEl('polygon', { points: counts.map(function (c, i) { return pt(i, R * c / max).join(','); }).join(' '), class: 'rose-shape' }));
  counts.forEach(function (c, i) {
    if (!c) return;
    const a = pt(i, R * c / max), l = pt(i, R * c / max + 13);
    s.appendChild(svgEl('circle', { cx: a[0], cy: a[1], r: 4, fill: '#1F5FA8', stroke: '#fff', 'stroke-width': 1.8 }));
    s.appendChild(svgEl('text', { x: l[0], y: l[1], 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'rose-count' }, fmtNum(c, 0)));
  });
  box.appendChild(s);
}

/* ─────────── render: mascot, progress, stickers, badges ─────────── */

function mascotState() {
  const p = P(), today = todayKey(), tomorrow = addDays(today, 1);
  const has = !!p.records[today], predToday = p.preds[today], predTomorrow = p.preds[tomorrow];
  const streak = calcStreak(p.records);
  const name = p.name || t('mascot.friend');
  let face = 'm-happy', text, cta = false, predict = false;
  if (!has && predToday && !predToday.res) { face = 'm-think'; text = t('mascot.waiting'); cta = true; }
  else if (!has) { text = t('mascot.hello', { name: name }); cta = true; }
  else if (!predTomorrow) { face = 'm-wow'; text = t('mascot.done') + ' ' + t('mascot.donePredict'); predict = true; }
  else { text = t('mascot.predicted'); }
  if (streak >= 2) text += ' ' + t('mascot.streak', { n: streak });
  return { face: face, text: text, cta: cta, predict: predict };
}
function renderMascot() {
  const s = mascotState();
  setUse($('#mascot'), s.face);
  $('#mascot-text').textContent = s.text;
  $('#btn-today-cta').hidden = !s.cta;
  $('#btn-predict').hidden = !s.predict;
}
function renderProgress() {
  const g = gameSnapshot(P()), lvl = g.level;
  $('#pg-stars').textContent = fmtNum(g.stars, 0);
  $('#pg-streak').textContent = fmtNum(g.streakNow, 0);
  $('#pg-level').textContent = t('lvl.' + lvl);
  let pct = 100, next = t('game.max');
  if (lvl < LEVELS.length - 1) {
    const a = LEVELS[lvl], b = LEVELS[lvl + 1];
    pct = Math.round((g.stars - a) / (b - a) * 100);
    next = t('game.next', { n: b - g.stars, name: t('lvl.' + (lvl + 1)) });
  }
  $('#pg-next').textContent = next;
  $('#pg-fill').style.setProperty('--w', pct + '%');
  $('#pg-fill').parentNode.style.setProperty('--w', pct + '%');
  $('#pg-bar').setAttribute('aria-valuenow', String(pct));
}
function renderStickers() {
  const g = gameSnapshot(P());
  setKids($('#stickers'), STICKERS.map(function (s) {
    const got = !!g.stickers[s.id];
    return el('li', { class: got ? 'sticker' : 'sticker locked' }, svgUse(s.ic, ''), el('small', { text: t(s.k) }));
  }));
  const n = STICKERS.filter(function (s) { return g.stickers[s.id]; }).length;
  $('#stickers-hint').textContent = t('stickers.hint', { n: n, total: STICKERS.length });
}
function renderBadges() {
  const g = gameSnapshot(P());
  setKids($('#badges'), BADGES.map(function (b) {
    const got = !!g.badges[b.id];
    return el('li', { class: got ? 'badge got' : 'badge' }, svgUse(b.ic, ''),
      el('span', null, t('bd.' + b.id), got ? null : el('small', { text: t('badge.locked') })));
  }));
  const total = g.stats.total;
  const next = RECORD_BADGES.filter(function (n) { return total < n; })[0];
  $('#badges-next').textContent = next ? t('badge.next', { n: next - total }) : t('badge.done');
}

/* ─────────── banner ─────────── */

const isIOS = function () { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); };
const isStandalone = function () { return navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); };
let bannerId = null;
function updateBanner() {
  const b = $('#banner');
  if (!b || !state.store) return;
  const p = P(), total = Object.keys(p.records).length, m = state.store.meta, now = Date.now();
  let id = null, text = '', act = null;
  if (!state.storageOk) { id = 'storage'; text = t('banner.storage'); }
  else if (state.updateReady) { id = 'update'; text = t('banner.update'); act = { label: t('ui.reload'), fn: function () { location.reload(); } }; }
  else if (isIOS() && !isStandalone() && total >= 1 && now - m.dismissed.ios > 30 * DAY_MS) { id = 'ios'; text = t('banner.ios'); }
  else if (total >= 7 && now - Math.max(m.lastExport, m.created) > 14 * DAY_MS && now - m.dismissed.exp > 14 * DAY_MS) {
    id = 'exp'; text = t('banner.export', { n: total }); act = { label: t('act.export'), fn: exportProfile };
  }
  bannerId = id;
  b.hidden = !id;
  if (!id) return;
  $('#banner-text').textContent = text;
  const btn = $('#banner-act');
  btn.hidden = !act;
  btn.onclick = act ? act.fn : null;
  if (act) btn.textContent = act.label;
  $('#banner-x').hidden = id === 'storage';
}
function dismissBanner() {
  const m = state.store.meta;
  if (bannerId === 'ios') m.dismissed.ios = Date.now();
  else if (bannerId === 'exp') m.dismissed.exp = Date.now();
  else if (bannerId === 'update') state.updateReady = false;
  saveStore();
}

function renderAll() {
  renderHeader(); renderPlace(); renderLegend(); renderMonth(); renderChart(); renderStats(); renderRose();
  renderMascot(); renderProgress(); renderStickers(); renderBadges(); updateBanner();
  $('#btn-compare-t').textContent = t('act.compare');
}

/* ─────────── form components: tiles, steppers, thermometer, compass ─────────── */

function tileGroup(box, items, opts) {
  const btns = items.map(function (it) {
    const b = el('button', { type: 'button', class: 'tile-face', 'aria-pressed': 'false', 'aria-label': it.label || String(it.v) },
      svgUse(it.ic, ''), it.label ? el('span', { class: 'lbl', text: it.label }) : null);
    b.addEventListener('click', function () {
      const cur = opts.get();
      opts.set(opts.toggle && cur === it.v ? null : it.v);
      sync();
      if (opts.after) opts.after();
    });
    return b;
  });
  function sync() { const cur = opts.get(); btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(items[i].v === cur)); }); }
  setKids(box, btns);
  sync();
  return { sync: sync, buttons: btns };
}

function bindHold(btn, fn) {
  let t1 = null, t2 = null;
  const stop = function () { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; };
  btn.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    fn();
    stop();
    t1 = setTimeout(function () { t2 = setInterval(fn, 90); }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(function (ev) { btn.addEventListener(ev, stop); });
  btn.addEventListener('click', function (e) { if (e.detail === 0) fn(); }); // клавіатура
  btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
}

/* cfg: kind 'num' | 'time'; get() -> число/рядок або null; set(v); min,max,step,start; unit(); signed */
function makeStepper(cfg) {
  const isTime = cfg.kind === 'time';
  const down = el('button', { type: 'button', class: 'st-btn down', 'aria-label': t(isTime ? 'st.earlier' : 'st.less') }, ic('u-down'));
  const up = el('button', { type: 'button', class: 'st-btn up', 'aria-label': t(isTime ? 'st.later' : 'st.more') }, ic('u-up'));
  const val = el('div', { class: 'st-val empty', role: 'button', tabindex: '0', 'aria-label': t('st.edit') });
  const input = el('input', { class: 'st-input', type: isTime ? 'time' : 'text', inputmode: isTime ? null : 'decimal', autocomplete: 'off', hidden: true, 'aria-label': cfg.label || '' });
  const pm = el('button', { type: 'button', class: 'st-pm', 'aria-label': t('st.sign'), hidden: true }, ic('u-pm'));
  const okb = el('button', { type: 'button', class: 'st-pm', 'aria-label': t('ui.done'), hidden: true }, ic('u-check'));
  const root = el('div', { class: 'stepper' }, down, val, input, pm, okb, up);
  let editing = false;

  function show() {
    const v = cfg.get();
    val.className = 'st-val';
    if (v === null || v === undefined) { setKids(val, '—'); val.classList.add('empty'); return; }
    if (isTime) { setKids(val, v); return; }
    setKids(val, [(cfg.signed && v > 0 ? '+' : '') + fmtNum(v, 0), cfg.unit ? el('span', { class: 'u', text: cfg.unit() }) : null]);
    if (cfg.signed) val.classList.add(v < 0 ? 'neg' : v > 0 ? 'pos' : 'zero');
  }
  function step(dir) {
    const cur = cfg.get();
    if (isTime) {
      const a = TIME_RE.test(cur || '') ? cur.split(':').map(Number) : [cfg.start, 0];
      cfg.set(pad((a[0] + dir + 24) % 24) + ':' + pad(a[1]));
    } else {
      const base = cur === null || cur === undefined ? cfg.start : cur;
      cfg.set(clamp(base + dir * cfg.step, cfg.min, cfg.max));
    }
    show();
    if (cfg.after) cfg.after();
  }
  function setEditing(on) {
    editing = on;
    [down, up, val].forEach(function (n) { n.hidden = on; });
    input.hidden = !on;
    okb.hidden = !on;
    pm.hidden = !on || !cfg.signed;
  }
  function startEdit() {
    const v = cfg.get();
    input.value = v === null || v === undefined ? '' : String(v);
    setEditing(true);
    setTimeout(function () { input.focus(); try { input.select(); } catch (e) { /* time */ } }, 10);
  }
  function commit(apply) {
    if (!editing) return;
    if (apply) {
      const raw = input.value.trim();
      if (isTime) { if (TIME_RE.test(raw)) cfg.set(raw); }
      else if (raw === '') cfg.set(null);
      else { const n = Number(raw.replace(',', '.')); if (isFinite(n)) cfg.set(Math.round(clamp(n, cfg.min, cfg.max))); }
    }
    setEditing(false);
    show();
    if (apply && cfg.after) cfg.after();
    val.focus();
  }
  bindHold(down, function () { step(-1); });
  bindHold(up, function () { step(1); });
  val.addEventListener('click', startEdit);
  val.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(); } });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); commit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); commit(false); }
  });
  input.addEventListener('blur', function () { setTimeout(function () { if (editing && !root.contains(document.activeElement)) commit(true); }, 140); });
  pm.addEventListener('click', function () {
    const s = input.value.trim();
    input.value = s.charAt(0) === '-' ? s.slice(1) : '-' + s;
    input.focus();
  });
  okb.addEventListener('click', function () { commit(true); });
  show();
  return { root: root, refresh: show, commit: function () { commit(true); }, isEditing: function () { return editing; } };
}

/* Вертикальний термометр: тягни пальцем, стрілки/PageUp/PageDown на клавіатурі. */
function buildThermo(F, onChange) {
  const yTop = 22, yBot = 196, yBulb = 216;
  const lo = Math.round(toDispT(THERMO_LO)), hi = Math.round(toDispT(THERMO_HI));
  const yOf = function (v) { return yBot - (clamp(v, lo, hi) - lo) / (hi - lo) * (yBot - yTop); };
  const svg = svgEl('svg', { class: 'thermo', viewBox: '0 0 120 250', role: 'slider', tabindex: '0', 'aria-label': t('thermo.label'), 'aria-valuemin': lo, 'aria-valuemax': hi, 'aria-orientation': 'vertical' });
  svg.appendChild(svgEl('circle', { cx: 64, cy: yBulb, r: 24, class: 'th-tube' }));
  svg.appendChild(svgEl('rect', { x: 54, y: 10, width: 20, height: yBulb - 10, rx: 10, class: 'th-tube' }));
  svg.appendChild(svgEl('circle', { cx: 64, cy: yBulb, r: 22.5, fill: '#fff' }));
  svg.appendChild(svgEl('rect', { x: 55.5, y: 11.5, width: 17, height: yBulb - 12, rx: 8.5, fill: '#fff' }));
  const fz = imperial() ? 32 : 0;
  for (let v = Math.ceil(lo / 10) * 10; v <= hi; v += 10) {
    const y = yOf(v);
    svg.appendChild(svgEl('line', { x1: 44, x2: 52, y1: y, y2: y, class: v === fz ? 'th-tick zero' : 'th-tick' }));
    svg.appendChild(svgEl('text', { x: 40, y: y + 3.5, 'text-anchor': 'end', class: 'th-lbl' }, String(v)));
  }
  const merc = svgEl('g', { class: 'th-merc' });
  const bar = svgEl('rect', { x: 59, width: 10, rx: 5 });
  const bulb = svgEl('circle', { cx: 64, cy: yBulb, r: 17 });
  merc.appendChild(bar); merc.appendChild(bulb);
  svg.appendChild(merc);
  const bubble = svgEl('g', { class: 'th-bub' });
  const bRect = svgEl('rect', { x: 80, width: 38, height: 22, rx: 11 });
  const bText = svgEl('text', { x: 99, 'text-anchor': 'middle', class: 'th-bubble' });
  bubble.appendChild(bRect); bubble.appendChild(bText);
  svg.appendChild(bubble);

  function paint() {
    const has = F.temp !== null;
    const c = has ? F.temp : F.base;
    const v = clamp(toDispT(c), lo, hi);
    const y = yOf(v), color = rgbCss(tempRGB(c));
    bar.setAttribute('y', y); bar.setAttribute('height', yBulb - y); bar.setAttribute('fill', color);
    bulb.setAttribute('fill', color);
    merc.setAttribute('class', has ? 'th-merc' : 'th-merc untouched');
    const by = clamp(y - 11, 4, 190);
    bRect.setAttribute('y', by); bRect.setAttribute('fill', has ? '#16212B' : '#566574');
    bText.setAttribute('y', by + 15); bText.textContent = has ? fmtNum(toDispT(F.temp), 0) : '?';
    svg.setAttribute('aria-valuenow', String(Math.round(v)));
    svg.setAttribute('aria-valuetext', has ? fmtTemp(F.temp) : '?');
  }
  function setDisp(v) { onChange(round(fromDispT(clamp(Math.round(v), lo, hi)), 2)); paint(); }
  let drag = false;
  function fromPointer(e) {
    const r = svg.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height * 250;
    setDisp(lo + (yBot - y) / (yBot - yTop) * (hi - lo));
  }
  svg.addEventListener('pointerdown', function (e) { drag = true; try { svg.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } fromPointer(e); e.preventDefault(); });
  svg.addEventListener('pointermove', function (e) { if (drag) fromPointer(e); });
  ['pointerup', 'pointercancel'].forEach(function (ev) { svg.addEventListener(ev, function () { drag = false; }); });
  svg.addEventListener('keydown', function (e) {
    const cur = F.temp === null ? toDispT(F.base) : toDispT(F.temp);
    const k = e.key;
    let nv = null;
    if (k === 'ArrowUp' || k === 'ArrowRight') nv = cur + 1;
    else if (k === 'ArrowDown' || k === 'ArrowLeft') nv = cur - 1;
    else if (k === 'PageUp') nv = cur + 5;
    else if (k === 'PageDown') nv = cur - 5;
    else if (k === 'Home') nv = lo;
    else if (k === 'End') nv = hi;
    if (nv !== null) { e.preventDefault(); setDisp(nv); }
  });
  paint();
  return { svg: svg, refresh: paint };
}

const COMPASS_ORDER = [7, 0, 1, 6, null, 2, 5, 4, 3];
function buildCompass(box, F) {
  const btns = COMPASS_ORDER.map(function (i) {
    const b = el('button', { type: 'button', class: i === null ? 'dir-btn calm' : 'dir-btn', 'aria-pressed': 'false' });
    if (i === null) { b.appendChild(ic('u-dot', 'arr')); b.appendChild(el('span', { class: 'lbl', text: t('day.dirNone') })); }
    else {
      const a = svgUse('u-arrow', 'arr');
      a.style.transform = 'rotate(' + (i * 45) + 'deg)';
      b.appendChild(a); b.appendChild(el('span', { class: 'lbl', text: dirName(i) }));
    }
    b.addEventListener('click', function () { F.dir = i; sync(); });
    return b;
  });
  function sync() { btns.forEach(function (b, k) { b.setAttribute('aria-pressed', String(COMPASS_ORDER[k] === F.dir)); }); }
  setKids(box, btns);
  sync();
}

/* ─────────── day dialog ─────────── */

let daySteppers = [], dayThermo = null;

function lastTemp(p, key) {
  const ks = Object.keys(p.records).filter(function (k) { return k < key; }).sort();
  return ks.length ? p.records[ks[ks.length - 1]].temp : 10;
}
function clearErrors() {
  ['err-sky', 'err-temp'].forEach(function (id) { $('#' + id).hidden = true; });
  ['fld-sky', 'fld-temp'].forEach(function (id) { $('#' + id).classList.remove('invalid'); });
}
function syncDirVisibility() {
  const F = state.F;
  $('#fld-dir').hidden = kidMode() && (F.wind === null || F.wind < 1.6);
}
function buildDayForm() {
  const F = state.F;
  daySteppers = [];
  clearErrors();

  tileGroup($('#sky-chips'), SKY.map(function (k) { return { v: k, ic: 'sky-' + k, label: t('sky.' + k) }; }), {
    get: function () { return F.sky || null; }, set: function (v) { F.sky = v; }, after: clearErrors
  });

  let tempSt = null;
  dayThermo = buildThermo(F, function (c) { F.temp = c; if (tempSt) tempSt.refresh(); clearErrors(); });
  tempSt = makeStepper({
    kind: 'num', signed: true, label: t('day.temp'), unit: tempUnit,
    get: function () { return F.temp === null ? null : Math.round(toDispT(F.temp)); },
    set: function (v) { F.temp = v === null ? null : round(fromDispT(v), 2); },
    min: Math.round(toDispT(-60)), max: Math.round(toDispT(60)), step: 1, start: Math.round(toDispT(F.base)),
    after: function () { dayThermo.refresh(); clearErrors(); }
  });
  setKids($('#thermo-wrap'), dayThermo.svg);
  setKids($('#temp-stepper'), tempSt.root);
  daySteppers.push(tempSt);

  tileGroup($('#wind-steps'), [0, 1, 2, 3].map(function (i) { return { v: i, ic: 'wind-' + i, label: t('wind.' + i) }; }), {
    toggle: true, get: function () { return F.wind === null ? null : windStep(F.wind); },
    set: function (i) { F.wind = i === null ? null : WIND_VALUES[i]; }, after: syncDirVisibility
  });
  const windSt = makeStepper({
    kind: 'num', label: t('day.wind'), unit: windUnit,
    get: function () { return F.wind === null ? null : Math.round(toDispW(F.wind)); },
    set: function (v) { F.wind = v === null ? null : round(fromDispW(v), 1); },
    min: 0, max: Math.round(toDispW(60)), step: 1, start: 0, after: syncDirVisibility
  });
  setKids($('#wind-stepper'), windSt.root); daySteppers.push(windSt);

  tileGroup($('#hum-steps'), [0, 1, 2].map(function (i) { return { v: i, ic: 'hum-' + i, label: t('hum.' + i) }; }), {
    toggle: true, get: function () { return F.hum === null ? null : humStep(F.hum); },
    set: function (i) { F.hum = i === null ? null : HUM_VALUES[i]; }
  });
  const humSt = makeStepper({
    kind: 'num', label: t('day.hum'), unit: function () { return '%'; },
    get: function () { return F.hum === null ? null : Math.round(F.hum); },
    set: function (v) { F.hum = v === null ? null : clamp(v, 0, 100); }, min: 0, max: 100, step: 5, start: 50
  });
  setKids($('#hum-stepper'), humSt.root); daySteppers.push(humSt);

  const timeSt = makeStepper({
    kind: 'time', label: t('day.time'), start: 9,
    get: function () { return F.time || null; }, set: function (v) { F.time = v || ''; }
  });
  setKids($('#time-stepper'), timeSt.root); daySteppers.push(timeSt);

  tileGroup($('#mood-chips'), MOODS.map(function (k) { return { v: k, ic: 'mood-' + k, label: t('mood.' + k) }; }), {
    toggle: true, get: function () { return F.mood || null; }, set: function (v) { F.mood = v || ''; }
  });
  buildCompass($('#dir-compass'), F);
  $('#f-notes').value = F.notes;
  syncDirVisibility();
}
function renderRealTable(rec) {
  const box = $('#real-box');
  if (!rec || !rec.real) { box.hidden = true; return; }
  const re = rec.real, rows = [];
  const add = function (label, mine, model, diff) {
    rows.push(el('tr', null, el('th', { scope: 'row', text: label }), el('td', { text: mine }), el('td', { text: model }), el('td', { text: diff })));
  };
  add(t('real.temp'), fmtTemp(rec.temp), fmtTemp(re.temp), signed(toDispDelta(rec.temp - re.temp)));
  if (re.hum !== null) add(t('real.hum'), rec.hum === null || rec.hum === undefined ? '—' : fmtNum(rec.hum, 0) + ' %', fmtNum(re.hum, 0) + ' %',
    rec.hum === null || rec.hum === undefined ? '—' : signed(rec.hum - re.hum));
  if (re.wind !== null) add(t('real.wind'), rec.wind === null || rec.wind === undefined ? '—' : fmtWind(rec.wind), fmtWind(re.wind),
    rec.wind === null || rec.wind === undefined ? '—' : signed(toDispW(rec.wind) - toDispW(re.wind)));
  if (re.dir !== null) add(t('real.dir'), rec.dir === null || rec.dir === undefined ? '—' : dirName(rec.dir), dirName(re.dir), '');
  if (re.sky) add(t('real.sky'), t('sky.' + rec.sky), t('sky.' + re.sky), '');
  setKids($('#real-table'), el('table', { class: 'data' },
    el('thead', null, el('tr', null, [t('real.param'), t('real.mine'), t('real.model'), t('real.diff')].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
    el('tbody', null, rows)));
  box.hidden = false;
}
function openDay(key) {
  const p = P(), rec = p.records[key] || null;
  state.activeKey = key;
  state.F = rec
    ? { temp: rec.temp, sky: rec.sky, time: rec.t || '', hum: rec.hum, wind: rec.wind, dir: rec.dir, mood: rec.mood || '', notes: rec.notes, base: rec.temp }
    : { temp: null, sky: '', time: key === todayKey() ? nowHHMM() : '09:00', hum: null, wind: null, dir: null, mood: '', notes: '', base: lastTemp(p, key) };
  $('#day-title').textContent = longDate(key);
  buildDayForm();
  $('#more-box').open = !kidMode() || !!(rec && (rec.hum !== null || rec.notes));
  $('#btn-day-delete').hidden = !rec;
  renderRealTable(rec);
  openDialog($('#dlg-day'));
}
function readDayRecord() {
  const F = state.F, p = P(), prev = p.records[state.activeKey] || null;
  F.notes = $('#f-notes').value;
  let dir = F.dir;
  if (kidMode() && (F.wind === null || F.wind < 1.6)) dir = null;
  const rec = sanitizeRecord({ temp: F.temp, sky: F.sky, t: TIME_RE.test(F.time) ? F.time : null, hum: F.hum, wind: F.wind, dir: dir, mood: F.mood || null, notes: F.notes });
  if (rec && prev && prev.real && prev.t === rec.t) rec.real = prev.real;
  return rec;
}
function saveDay(e) {
  e.preventDefault();
  daySteppers.forEach(function (s) { if (s.isEditing()) s.commit(); });
  const F = state.F;
  const needSky = !F.sky, needTemp = F.temp === null;
  if (needSky || needTemp) {
    $('#err-sky').hidden = !needSky; $('#fld-sky').classList.toggle('invalid', needSky);
    $('#err-temp').hidden = !needTemp; $('#fld-temp').classList.toggle('invalid', needTemp);
    const first = needSky ? $('#fld-sky') : $('#fld-temp');
    first.scrollIntoView({ block: 'center' });
    const f = $('button', first) || $('svg[tabindex]', first);
    if (f) f.focus();
    return;
  }
  const rec = readDayRecord();
  if (!rec) return;
  const p = P(), key = state.activeKey, wasNew = !p.records[key];
  const before = gameSnapshot(p);
  p.records[key] = rec;
  let result = null;
  const pred = p.preds[key];
  if (pred && !pred.res) { result = resolvePred(pred, rec); pred.res = result; }
  saveStore();
  requestPersist();
  closeDialog($('#dlg-day'));
  renderAll();
  if (kidMode() && (wasNew || result)) showReward({ key: key, rec: rec, pred: pred, result: result, before: before, after: gameSnapshot(p), wasNew: wasNew });
  else toast(t('toast.saved'));
}
async function deleteDay() {
  const key = state.activeKey;
  const ok = await askConfirm(t('day.deleteTitle'), t('day.deleteText', { date: longDate(key) }), t('ui.ok'));
  if (!ok) return;
  delete P().records[key];
  saveStore();
  closeDialog($('#dlg-day'));
  renderAll();
  toast(t('toast.deleted'));
}

/* ─────────── reward / game ─────────── */

function spawnConfetti() {
  const box = $('#confetti');
  const colors = ['#F5A623', '#E5533D', '#4DA3E8', '#5CC27B', '#B37BE0', '#FFD23F'];
  setKids(box, null);
  for (let i = 0; i < 26; i++) {
    const c = el('span', { class: 'cf' });
    c.style.setProperty('--x', Math.round(Math.random() * 100) + '%');
    c.style.setProperty('--d', (Math.random() * 0.7).toFixed(2) + 's');
    c.style.setProperty('--c', colors[i % colors.length]);
    box.appendChild(c);
  }
}
function duelCol(who, sky, trend, skOk, trOk, win) {
  return el('div', { class: win ? 'win' : '' },
    el('div', { class: 'who', text: who }),
    el('div', { class: 'row2' }, sky ? svgUse('sky-' + sky, '') : el('span', { text: '?' }), trend ? ic(TREND_ICON[trend]) : null),
    el('div', { class: 'row2' }, skOk === null || skOk === undefined ? null : ic(skOk ? 'u-check' : 'u-close', skOk ? 'ok' : 'no'),
      trOk === null || trOk === undefined ? null : ic(trOk ? 'u-check' : 'u-close', trOk ? 'ok' : 'no')));
}
function showReward(info) {
  const box = $('#reward-content'), p = P();
  setKids(box, null);
  const gained = info.after.stars - info.before.stars;
  let face = 'm-happy', celebrate = false, title = t('toast.saved');
  if (gained > 0) box.appendChild(el('p', { class: 'reward-line' }, el('span', { class: 'reward-stars' }, ic('u-star', 'ic-star'), '+' + fmtNum(gained, 0))));
  if (info.result) {
    const r = info.result, pr = info.pred;
    title = t('game.resTitle');
    box.appendChild(el('div', { class: 'duel' },
      duelCol(t('game.you'), pr.sk, pr.tr, r.sk, r.tr, r.out === 'win'),
      duelCol(t('game.robot'), pr.msk, pr.mtr, r.msk, r.mtr, r.out === 'lose'),
      duelCol(t('game.real'), info.rec.sky, r.realTr, null, null, false)));
    const msg = r.out === 'win' ? t('game.win') : r.out === 'draw' ? t('game.draw') : r.out === 'lose' ? t('game.lose') : t('game.noRobot');
    box.appendChild(el('p', { class: 'reward-line', text: msg }));
    face = r.out === 'win' ? 'm-wow' : r.out === 'lose' ? 'm-think' : 'm-happy';
    celebrate = r.out === 'win' || r.pts >= 4;
  }
  const items = [];
  STICKERS.forEach(function (s) { if (info.after.stickers[s.id] && !info.before.stickers[s.id]) items.push({ ic: s.ic, label: t(s.k) }); });
  BADGES.forEach(function (b) { if (info.after.badges[b.id] && !info.before.badges[b.id]) items.push({ ic: b.ic, label: t('bd.' + b.id) }); });
  if (items.length) {
    celebrate = true; face = 'm-wow';
    box.appendChild(el('div', { class: 'newitems' }, items.map(function (i) { return el('div', { class: 'newitem' }, svgUse(i.ic, ''), el('span', { text: i.label })); })));
  }
  if (info.after.level > info.before.level) {
    celebrate = true; face = 'm-wow';
    box.appendChild(el('p', { class: 'reward-line', text: t('game.levelUp', { name: t('lvl.' + info.after.level) }) }));
  }
  $('#reward-title').textContent = title;
  setUse($('#reward-mascot'), face);
  const showPredict = info.key === todayKey() && !p.preds[addDays(todayKey(), 1)];
  $('#reward-predict').hidden = !showPredict;
  if (celebrate) spawnConfetti(); else setKids($('#confetti'), null);
  openDialog($('#dlg-reward'));
}

async function fetchModelTrend(city, d0) {
  const params = new URLSearchParams({ latitude: String(city.lat), longitude: String(city.lon), daily: 'temperature_2m_max,temperature_2m_min,weather_code', timezone: 'auto', start_date: d0, end_date: addDays(d0, 1) });
  const data = await getJson(API.forecast + '?' + params, 9000);
  const d = data && data.daily;
  if (!d || !Array.isArray(d.time) || d.time.length < 2) return null;
  const mean = function (i) { const a = d.temperature_2m_max[i], b = d.temperature_2m_min[i]; return typeof a === 'number' && typeof b === 'number' ? (a + b) / 2 : null; };
  const m0 = mean(0), m1 = mean(1);
  if (m0 === null || m1 === null) return null;
  return { mtr: classifyTrend(m1 - m0), msk: skyFromCode(d.weather_code ? d.weather_code[1] : null) };
}
function openPredict() {
  const p = P(), today = todayKey(), tomorrow = addDays(today, 1);
  if (!p.records[today]) { openDay(today); return; }
  const ex = p.preds[tomorrow];
  state.PF = { sky: ex && !ex.res ? ex.sk : '', trend: ex && !ex.res ? ex.tr : '' };
  const PF = state.PF;
  $('#err-pred').hidden = true;
  tileGroup($('#pred-sky'), SKY.map(function (k) { return { v: k, ic: 'sky-' + k, label: t('sky.' + k) }; }), {
    get: function () { return PF.sky || null; }, set: function (v) { PF.sky = v; $('#err-pred').hidden = true; }
  });
  tileGroup($('#pred-trend'), TRENDS.map(function (k) { return { v: k, ic: TREND_ICON[k], label: t('trend.' + k) }; }), {
    get: function () { return PF.trend || null; }, set: function (v) { PF.trend = v; $('#err-pred').hidden = true; }
  });
  openDialog($('#dlg-predict'));
}
function savePredict(e) {
  e.preventDefault();
  const PF = state.PF, p = P(), today = todayKey(), tomorrow = addDays(today, 1), rec = p.records[today];
  if (!PF.sky || !PF.trend || !rec) { $('#err-pred').hidden = false; return; }
  p.preds[tomorrow] = { tr: PF.trend, sk: PF.sky, base: rec.temp, mtr: null, msk: null, res: null };
  saveStore();
  closeDialog($('#dlg-predict'));
  renderAll();
  toast(t('game.saved'));
  const pid = p.id, city = p.city;
  if (city && city.lat !== null) {
    fetchModelTrend(city, today).then(function (m) {
      const prof = state.store.profiles.filter(function (x) { return x.id === pid; })[0];
      const pr = prof && prof.preds[tomorrow];
      if (m && pr && !pr.res) { pr.mtr = m.mtr; pr.msk = m.msk; saveStore(); }
    }).catch(function () { /* Метеоробот просто промовчить */ });
  }
}

/* ─────────── Open-Meteo ─────────── */

async function getJson(url, timeout) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, timeout || 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}
function skyFromCode(c) {
  if (typeof c !== 'number') return null;
  if (c === 0) return 'clear';
  if (c === 1 || c === 2) return 'partly';
  if (c === 3) return 'cloudy';
  if (c === 45 || c === 48) return 'fog';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95 && c <= 99) return 'storm';
  return null;
}
async function fetchHourly(city, keys) {
  const cutoff = addDays(todayKey(), -RECENT_DAYS);
  const groups = [[API.archive, keys.filter(function (k) { return k < cutoff; })], [API.forecast, keys.filter(function (k) { return k >= cutoff; })]];
  const hourly = {};
  for (let g = 0; g < groups.length; g++) {
    const base = groups[g][0], ks = groups[g][1];
    if (!ks.length) continue;
    const params = new URLSearchParams({ latitude: String(city.lat), longitude: String(city.lon),
      hourly: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m', wind_speed_unit: 'ms', timezone: 'auto', start_date: ks[0], end_date: ks[ks.length - 1] });
    const data = await getJson(base + '?' + params);
    const h = data && data.hourly;
    if (!h || !Array.isArray(h.time)) throw new Error('bad response');
    h.time.forEach(function (tm, i) {
      hourly[tm] = { temp: h.temperature_2m ? h.temperature_2m[i] : null, hum: h.relative_humidity_2m ? h.relative_humidity_2m[i] : null,
        wind: h.wind_speed_10m ? h.wind_speed_10m[i] : null, deg: h.wind_direction_10m ? h.wind_direction_10m[i] : null, code: h.weather_code ? h.weather_code[i] : null };
    });
  }
  return hourly;
}
function hourSlot(key, time) {
  const a = (time || '09:00').split(':').map(Number);
  let h = a[0]; if (a[1] >= 30) h += 1; if (h > 23) h = 23;
  return key + 'T' + pad(h) + ':00';
}
function pickReal(hourly, rec) {
  const v = hourly[hourSlot(rec.key, rec.t)];
  if (!v || typeof v.temp !== 'number') return null;
  const wind = typeof v.wind === 'number' ? round(v.wind, 1) : null;
  return sanitizeReal({ temp: v.temp, hum: typeof v.hum === 'number' ? Math.round(v.hum) : null, wind: wind,
    dir: typeof v.deg === 'number' && wind !== null && wind >= 0.3 ? dirFromDeg(v.deg) : null, sky: skyFromCode(v.code), at: new Date().toISOString() });
}
function setBusy(on) { state.busy = on; const b = $('#btn-compare'); b.disabled = on; b.setAttribute('aria-busy', String(on)); }
async function compareMonth() {
  if (state.busy) return;
  const p = P(), tk = todayKey();
  if (!p.city || p.city.lat === null) { toast(t('cmp.noCoords')); openPlace(); return; }
  const list = monthRecords(p, state.view.y, state.view.m).filter(function (r) { return r.key <= tk; });
  if (!list.length) { toast(t('cmp.none')); return; }
  setBusy(true);
  toast(t('cmp.running'));
  try {
    const hourly = await fetchHourly(p.city, list.map(function (r) { return r.key; }));
    let ok = 0;
    list.forEach(function (r) { const real = pickReal(hourly, r); if (real) { p.records[r.key].real = real; ok++; } });
    saveStore(); renderAll();
    const missing = list.length - ok;
    toast(ok ? t('cmp.done', { n: ok }) + (missing ? ' ' + t('cmp.missing', { n: missing }) : '') : t('cmp.err'));
  } catch (e) { toast(t('cmp.err')); }
  finally { setBusy(false); }
}

/* ─────────── place ─────────── */

async function reverseGeocode(lat, lon) {
  try {
    const params = new URLSearchParams({ lat: String(round(lat, 2)), lon: String(round(lon, 2)), format: 'json', zoom: '10', 'accept-language': state.lang });
    const res = await fetch(API.reverse + '?' + params, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json(), a = data && data.address;
    if (!a) return null;
    const name = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || a.state;
    if (!name) return null;
    return { name: cleanStr(name, 60), admin: cleanStr(a.state || a.county || '', 60), country: cleanStr(a.country || '', 60), lat: round(lat, 2), lon: round(lon, 2), tz: null };
  } catch (e) { return null; }
}
async function geoLookup(statusEl) {
  if (!(await adultOK())) return null;
  if (!navigator.geolocation) { statusEl.textContent = t('place.geoErr'); return null; }
  statusEl.textContent = t('place.geoWait');
  return new Promise(function (resolve) {
    navigator.geolocation.getCurrentPosition(async function (pos) {
      statusEl.textContent = t('place.searching');
      const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (!city) statusEl.textContent = t('place.geoNoName');
      resolve(city);
    }, function () { statusEl.textContent = t('place.geoErr'); resolve(null); }, { timeout: 12000, maximumAge: 600000 });
  });
}
async function searchCities(q, statusEl, listEl, onPick) {
  setKids(listEl, null);
  if (q.length < 2) { statusEl.textContent = t('place.short'); return; }
  statusEl.textContent = t('place.searching');
  try {
    const params = new URLSearchParams({ name: q, count: '8', language: state.lang, format: 'json' });
    const data = await getJson(API.geocode + '?' + params);
    const found = (data && Array.isArray(data.results) ? data.results : [])
      .map(function (r) { return { name: r.name, admin: r.admin1, country: r.country, lat: r.latitude, lon: r.longitude, tz: r.timezone }; })
      .map(sanitizeCity).filter(function (c) { return c && c.lat !== null; });
    if (!found.length) { statusEl.textContent = t('place.none'); return; }
    statusEl.textContent = t('place.choose');
    setKids(listEl, found.map(function (c) {
      return el('li', null, el('button', { type: 'button', class: 'result', onclick: function () { onPick(c); } },
        el('strong', { text: c.name }), el('span', { text: [c.admin, c.country].filter(Boolean).join(', ') }), el('small', { dir: 'ltr', text: fmtCoord(c.lat, c.lon) })));
    }));
  } catch (err) { statusEl.textContent = t('place.err'); }
}
function openPlace() {
  $('#place-q').value = ''; $('#place-status').textContent = ''; setKids($('#place-results'), null);
  openDialog($('#dlg-place'));
}
function setCity(raw) {
  const city = sanitizeCity(raw);
  if (!city) return;
  P().city = city;
  saveStore();
  closeDialog($('#dlg-place'));
  renderAll();
  toast(t('place.set', { name: city.name }));
}

/* ─────────── profiles + PIN ─────────── */

const profileLabel = function (p) { return p.name || t('profile.default'); };
function renderProfileList() {
  setKids($('#profile-list'), state.store.profiles.map(function (p) {
    const active = p.id === state.store.active;
    const meta = [p.cls ? t('profile.classLbl', { cls: p.cls }) : '', t('profile.records', { n: Object.keys(p.records).length })].filter(Boolean).join(', ');
    return el('li', { class: active ? 'prow on' : 'prow' },
      svgUse('av-' + p.avatar, 'av'),
      el('span', { class: 'pname' }, el('strong', null, p.pin ? ic('u-lock') : null, ' ' + profileLabel(p)), el('small', { text: meta })),
      el('button', { type: 'button', class: 'btn btn-sm', disabled: active, text: active ? t('profile.active') : t('profile.switch'), onclick: function () { switchProfile(p.id); } }),
      el('button', { type: 'button', class: 'btn btn-sm', text: t('profile.edit'), onclick: function () { showProfileForm(p.id); } }));
  }));
}
async function switchProfile(id) {
  const target = state.store.profiles.filter(function (p) { return p.id === id; })[0];
  if (!target) return;
  if (target.pin && !(await askPin(target))) return;
  state.store.active = id;
  saveStore();
  closeDialog($('#dlg-profile'));
  renderAll();
}
let formAvatar = AVATARS[0];
function showProfileForm(id) {
  const p = id ? state.store.profiles.filter(function (x) { return x.id === id; })[0] : null;
  state.editingProfile = p ? p.id : null;
  formAvatar = p ? p.avatar : AVATARS[0];
  $('#profile-form-title').textContent = t(p ? 'profile.editTitle' : 'profile.newTitle');
  $('#p-name').value = p ? p.name : '';
  $('#p-class').value = p ? p.cls : '';
  $('#p-pin').value = '';
  $('#p-pin-hint').textContent = p && p.pin ? t('pin.keep') : t('pin.hint');
  const old = $('#pin-remove-row'); if (old) old.parentNode.removeChild(old);
  if (p && p.pin) {
    $('#p-pin-hint').parentNode.appendChild(el('button', { type: 'button', class: 'btn btn-sm', id: 'pin-remove-row', text: t('pin.remove'), onclick: async function () {
      if (!(await adultOK(true))) return;
      p.pin = null; saveStore(); renderProfileList(); showProfileForm(p.id); toast(t('pin.removed'));
    } }));
  }
  tileGroup($('#avatar-chips'), AVATARS.map(function (a) { return { v: a, ic: 'av-' + a, label: '' }; }), { get: function () { return formAvatar; }, set: function (v) { formAvatar = v; } });
  $('#btn-profile-delete').hidden = !p;
  $('#profile-form').hidden = false;
  $('#p-name').focus();
}
async function saveProfile(e) {
  e.preventDefault();
  const pinRaw = $('#p-pin').value.trim();
  if (pinRaw && !/^\d{4}$/.test(pinRaw)) { toast(t('pin.digits')); $('#p-pin').focus(); return; }
  const fields = { name: $('#p-name').value, cls: $('#p-class').value, avatar: formAvatar };
  let target;
  if (state.editingProfile) {
    target = state.store.profiles.filter(function (x) { return x.id === state.editingProfile; })[0];
    const upd = sanitizeProfile(Object.assign({}, target, fields), true);
    Object.assign(target, upd);
  } else {
    if (state.store.profiles.length >= MAX_PROFILES) return;
    target = sanitizeProfile({ name: fields.name, cls: fields.cls, avatar: fields.avatar, city: P().city, records: {}, preds: {} }, false);
    state.store.profiles.push(target);
    state.store.active = target.id;
  }
  if (pinRaw) {
    const salt = randSalt();
    target.pin = { s: salt, h: await hashPin(pinRaw, salt) };
    toast(t('pin.set'));
  }
  saveStore();
  $('#profile-form').hidden = true;
  renderProfileList();
  renderAll();
}
async function deleteProfile() {
  const p = state.store.profiles.filter(function (x) { return x.id === state.editingProfile; })[0];
  if (!p || !(await adultOK())) return;
  const ok = await askConfirm(t('profile.deleteTitle'), t('profile.deleteText', { name: profileLabel(p) }), t('ui.ok'));
  if (!ok) return;
  state.store.profiles = state.store.profiles.filter(function (x) { return x.id !== p.id; });
  if (!state.store.profiles.length) state.store.profiles.push(defaultStore().profiles[0]);
  if (!state.store.profiles.some(function (x) { return x.id === state.store.active; })) state.store.active = state.store.profiles[0].id;
  saveStore();
  $('#profile-form').hidden = true;
  renderProfileList();
  renderAll();
}

/* ─────────── settings, io, print, class ─────────── */

function renderSettingsState() {
  $$('input[name="units"]').forEach(function (r) { r.checked = r.value === state.store.units; });
  const a = state.store.a11y;
  $('#set-hc').checked = a.hc; $('#set-large').checked = a.large; $('#set-readable').checked = a.readable;
  $('#set-hideChart').checked = a.hideChart === true; $('#set-kid').checked = kidMode(); $('#set-speak').checked = state.store.speak !== false;
  $('#row-speak').hidden = !state.speechOK;
  $('#btn-install').hidden = !state.installEv;
}
async function openSettings() {
  if (!(await adultOK())) return;
  renderSettingsState();
  openDialog($('#dlg-settings'));
}
async function wipeAll() {
  const ok = await askConfirm(t('set.wipeTitle'), t('set.wipeText'), t('ui.ok'));
  if (!ok) return;
  try { [STORE_KEY].concat(OLD_STORE_KEYS, ['wl_records', 'wl_meta', 'wl_lang', 'wl_a11y', 'wl_kid_seen']).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { /* ignore */ }
  const lang = state.lang;
  state.store = defaultStore(); state.store.lang = lang;
  saveStore();
  closeDialog($('#dlg-settings'));
  applyA11y(); applyStatic();
  showOnboarding();
}
const slug = function (s) { return s.replace(/[^\wÀ-￿-]+/g, '_').replace(/^_+|_+$/g, ''); };
function downloadJSON(payload, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' }));
  const a = el('a', { href: url, download: name });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}
function exportProfile() {
  const p = P();
  const payload = { app: 'MeteoJournal', schema: 7, exported: new Date().toISOString(), profile: { name: p.name, cls: p.cls, avatar: p.avatar, city: p.city, records: p.records, preds: p.preds } };
  const name = 'MeteoJournal_' + (slug(p.name) || 'journal') + '_' + todayKey() + '.weather';
  downloadJSON(payload, name);
  state.store.meta.lastExport = Date.now();
  saveStore();
  toast(t('io.exported', { name: name }));
}
function readFile(f) {
  return new Promise(function (resolve, reject) {
    const r = new FileReader();
    r.onload = function () { resolve(String(r.result)); };
    r.onerror = function () { reject(r.error); };
    r.readAsText(f);
  });
}
function profileFromFile(data) {
  if (!data || typeof data !== 'object') return null;
  if ((data.app === 'MeteoJournal' || data.app === 'WeatherLab') && data.profile) return sanitizeProfile(data.profile, false);
  if (data.records && data.meta) return convertV1(data);
  return null;
}
async function importFiles(files) {
  const messages = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    try {
      if (f.size > MAX_FILE_BYTES) { messages.push(t('io.fail', { file: f.name, reason: t('io.tooBig') })); continue; }
      let data;
      try { data = JSON.parse(await readFile(f)); } catch (e) { messages.push(t('io.fail', { file: f.name, reason: t('io.notWl') })); continue; }
      const prof = profileFromFile(data);
      if (!prof) { messages.push(t('io.fail', { file: f.name, reason: t('io.notWl') })); continue; }
      const n = Object.keys(prof.records).length;
      if (!n) { messages.push(t('io.fail', { file: f.name, reason: t('io.empty') })); continue; }
      if (state.store.profiles.length >= MAX_PROFILES) break;
      state.store.profiles.push(prof);
      state.store.active = prof.id;
      messages.push(t('io.imported', { name: profileLabel(prof), n: n }));
    } catch (e) { messages.push(t('io.fail', { file: f.name, reason: t('io.readErr') })); }
  }
  saveStore(); renderAll(); renderProfileList();
  if (messages.length) toast(messages.join(' '));
}
function renderPrint() {
  const box = $('#print-report'), p = P(), y = state.view.y, m = state.view.m;
  setKids(box, null);
  const list = monthRecords(p, y, m);
  const meta = [t('print.student') + ': ' + profileLabel(p)];
  if (p.cls) meta.push(t('print.class') + ': ' + p.cls);
  meta.push(t('print.place') + ': ' + (p.city ? p.city.name + (p.city.lat === null ? '' : ' (' + fmtCoord(p.city.lat, p.city.lon) + ')') : '—'));
  box.appendChild(el('h1', { text: t('print.title') + ': ' + monthTitle(y, m) }));
  box.appendChild(el('p', { class: 'pmeta', text: meta.join('. ') }));
  if (!list.length) { box.appendChild(el('p', { text: t('chart.empty') })); return; }
  const chart = $('#chart svg');
  if (chart) box.appendChild(chart.cloneNode(true));
  box.appendChild(buildRecordsTable(list, true));
  box.appendChild(buildStatsList(computeStats(list), true));
  box.appendChild(el('p', { class: 'pmeta', text: t('print.made', { date: longDate(todayKey()) }) }));
}
async function openClass() {
  if (!(await adultOK())) return;
  const y = state.view.y, m = state.view.m, profs = state.store.profiles;
  let entries = 0, tempSum = 0, tempN = 0, wins = 0, robotGames = 0;
  profs.forEach(function (p) {
    entries += Object.keys(p.records).length;
    monthRecords(p, y, m).forEach(function (r) { tempSum += r.temp; tempN++; });
    Object.keys(p.preds).forEach(function (k) { const r = p.preds[k].res; if (r && r.out !== 'none') { robotGames++; if (r.out === 'win') wins++; } });
  });
  const stat = function (num, label) { return el('div', null, el('strong', { text: num }), el('small', { text: label })); };
  const rows = profs.slice().sort(function (a, b) { return profileLabel(a).localeCompare(profileLabel(b), state.lang); }).map(function (p) {
    const g = gameSnapshot(p);
    return el('tr', null, el('td', null, profileLabel(p) + (p.cls ? ' (' + p.cls + ')' : '')), el('td', { text: fmtNum(Object.keys(p.records).length, 0) }),
      el('td', { text: fmtNum(g.stars, 0) }), el('td', { text: fmtNum(monthRecords(p, y, m).length, 0) }));
  });
  setKids($('#class-body'), [
    el('p', { class: 'hint', text: t('class.hint') }),
    el('div', { class: 'class-sum' }, stat(fmtNum(profs.length, 0), t('class.profiles')), stat(fmtNum(entries, 0), t('class.entries')),
      stat(tempN ? fmtTemp(tempSum / tempN) : '—', t('class.mean') + ', ' + monthTitle(y, m)),
      stat(robotGames ? fmtNum(wins, 0) + ' / ' + fmtNum(robotGames, 0) : '—', t('class.win'))),
    el('div', { class: 'table-wrap' }, el('table', { class: 'data' },
      el('thead', null, el('tr', null, [t('class.col.name'), t('class.col.entries'), t('class.col.stars'), t('class.col.month')].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
      el('tbody', null, rows)))
  ]);
  openDialog($('#dlg-class'));
}

/* ─────────── onboarding ─────────── */

function renderOnbDots() { setKids($('#onb-dots'), [0, 1, 2].map(function (i) { return el('span', { class: i === state.onbStep ? 'on' : '' }); })); }
function showOnbStep(n) {
  state.onbStep = clamp(n, 0, 2);
  $$('.onb-step').forEach(function (s) { s.classList.toggle('active', Number(s.getAttribute('data-step')) === state.onbStep); });
  $('#onb-back').hidden = state.onbStep === 0;
  $('#onb-next-t').textContent = state.onbStep === 2 ? t('onb.finish') : t('onb.next');
  renderOnbDots();
}
function buildOnbDynamic() {
  setKids($('#onb-langs'), LANGS.map(function (l) {
    return el('button', { type: 'button', 'data-lang': l.c, 'aria-pressed': String(l.c === state.lang), text: l.n, lang: l.c, onclick: function () { setLang(l.c); } });
  }));
  tileGroup($('#onb-avatars'), AVATARS.map(function (a) { return { v: a, ic: 'av-' + a, label: '' }; }), { get: function () { return state.onbAvatar; }, set: function (v) { state.onbAvatar = v; } });
}
function showOnboarding() {
  state.onboarding = true; state.onbStep = 0; state.onbAvatar = AVATARS[0]; state.onbCity = null;
  $('#app-shell').hidden = true; $('#onboard').hidden = false; $('#boot').hidden = true;
  ['onb-name', 'onb-class', 'onb-city'].forEach(function (id) { $('#' + id).value = ''; });
  $('#onb-city-status').textContent = ''; setKids($('#onb-city-results'), null); $('#onb-name-err').hidden = true;
  buildOnbDynamic();
  showOnbStep(0);
}
function hideOnboarding() { state.onboarding = false; $('#onboard').hidden = true; $('#app-shell').hidden = false; }
function onbNext() {
  if (state.onbStep === 0) {
    if (!$('#onb-name').value.trim()) { $('#onb-name-err').hidden = false; $('#onb-name').focus(); return; }
    $('#onb-name-err').hidden = true;
  }
  if (state.onbStep === 2) {
    const raw = $('#onb-city').value.trim();
    if (!state.onbCity && raw.length >= 2) { $('#onb-city-status').textContent = t('onb.needCity'); $('#onb-city').focus(); return; }
    finalizeOnboarding(state.onbCity);
    return;
  }
  showOnbStep(state.onbStep + 1);
}
function finalizeOnboarding(city) {
  const p = P();
  p.name = cleanStr($('#onb-name').value, 40) || t('profile.default');
  p.cls = cleanStr($('#onb-class').value, 10);
  p.avatar = state.onbAvatar;
  p.city = city ? sanitizeCity(city) : null;
  state.store.onboarded = true;
  saveStore(); requestPersist();
  hideOnboarding(); renderAll();
}

/* ─────────── language ─────────── */

async function setLang(code) {
  if (LANG_CODES.indexOf(code) < 0 || code === state.lang) return;
  try { await loadLocale(code); } catch (e) { toast(t('place.err')); $('#lang-select').value = state.lang; return; }
  applyLocaleData(code);
  state.store.lang = code;
  saveStore();
  refreshLocaleDependent();
}
function refreshLocaleDependent() {
  applyStatic();
  updateSpeech();
  if (state.onboarding) { buildOnbDynamic(); showOnbStep(state.onbStep); return; }
  renderAll();
  if ($('#dlg-day').open) { const k = state.activeKey; $('#day-title').textContent = longDate(k); buildDayForm(); }
}

/* ─────────── events ─────────── */

function changeMonth(delta) {
  let y = state.view.y, m = state.view.m + delta;
  while (m < 0) { m += 12; y--; }
  while (m > 11) { m -= 12; y++; }
  state.view = { y: y, m: m };
  renderAll();
}
function bindEvents() {
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeDialog(b.closest('dialog')); }); });
  $$('dialog').forEach(function (d) {
    d.addEventListener('close', lockScroll);
    d.addEventListener('cancel', function () { /* Esc: нативне закриття */ });
  });
  ['dlg-place', 'dlg-profile', 'dlg-settings', 'dlg-privacy', 'dlg-class', 'dlg-reward'].forEach(function (id) {
    const d = $('#' + id);
    d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); });
  });
  $('#dlg-day').addEventListener('close', function () { const k = state.activeKey; setTimeout(function () { const b = k && $('.day[data-date="' + k + '"]'); if (b && !b.disabled) b.focus(); }, 0); });

  $('#onb-next').addEventListener('click', onbNext);
  $('#onb-back').addEventListener('click', function () { showOnbStep(state.onbStep - 1); });
  $('#onb-skip').addEventListener('click', function () { state.onbCity = null; $('#onb-city').value = ''; finalizeOnboarding(null); });
  $('#onb-city-search').addEventListener('click', function () {
    searchCities($('#onb-city').value.trim(), $('#onb-city-status'), $('#onb-city-results'), function (c) {
      state.onbCity = c; $('#onb-city').value = c.name; $('#onb-city-status').textContent = '✓ ' + c.name; setKids($('#onb-city-results'), null);
    });
  });
  $('#onb-city').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#onb-city-search').click(); } });
  $('#onb-city').addEventListener('input', function () { state.onbCity = null; });
  $('#onb-geo').addEventListener('click', async function () {
    const c = await geoLookup($('#onb-city-status'));
    if (c) { state.onbCity = c; $('#onb-city').value = c.name; $('#onb-city-status').textContent = '✓ ' + c.name; }
  });

  $('#btn-prev').addEventListener('click', function () { changeMonth(-1); });
  $('#btn-next').addEventListener('click', function () { changeMonth(1); });
  $('#btn-today').addEventListener('click', function () { const n = todayParts(); state.view = { y: n.y, m: n.m }; renderAll(); });
  $('#cal-body').addEventListener('click', function (e) { const b = e.target.closest('.day'); if (b && !b.disabled) openDay(b.getAttribute('data-date')); });
  $('#btn-today-cta').addEventListener('click', function () { openDay(todayKey()); });
  $('#btn-predict').addEventListener('click', openPredict);
  $('#reward-predict').addEventListener('click', function () { closeDialog($('#dlg-reward')); openPredict(); });
  $('#btn-speak').addEventListener('click', function () { speak($('#mascot-text').textContent); });
  $('#predict-form').addEventListener('submit', savePredict);

  $('#day-form').addEventListener('submit', saveDay);
  $('#btn-day-delete').addEventListener('click', deleteDay);

  $('#btn-compare').addEventListener('click', compareMonth);
  $('#btn-export').addEventListener('click', exportProfile);
  $('#btn-import').addEventListener('click', function () { $('#file-import').click(); });
  $('#file-import').addEventListener('change', function (e) { const fs = Array.prototype.slice.call(e.target.files); e.target.value = ''; importFiles(fs); });
  $('#btn-print').addEventListener('click', function () { renderPrint(); window.print(); });
  window.addEventListener('beforeprint', renderPrint);
  $('#btn-class').addEventListener('click', openClass);

  $('#btn-place').addEventListener('click', openPlace);
  $('#place-form').addEventListener('submit', function (e) {
    e.preventDefault();
    searchCities($('#place-q').value.trim(), $('#place-status'), $('#place-results'), setCity);
  });
  $('#btn-geo').addEventListener('click', async function () { const c = await geoLookup($('#place-status')); if (c) setCity(c); });

  $('#btn-profile').addEventListener('click', function () { renderProfileList(); $('#profile-form').hidden = true; openDialog($('#dlg-profile')); });
  $('#btn-profile-new').addEventListener('click', function () { showProfileForm(null); });
  $('#btn-profile-cancel').addEventListener('click', function () { $('#profile-form').hidden = true; });
  $('#profile-form').addEventListener('submit', saveProfile);
  $('#btn-profile-delete').addEventListener('click', deleteProfile);

  $('#gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (Number($('#gate-a').value.trim()) === gateAns) { state.adultUntil = Date.now() + 5 * 60000; finishGate(true); }
    else { $('#gate-err').hidden = false; newGate(); $('#gate-a').focus(); }
  });
  $('#gate-cancel').addEventListener('click', function () { finishGate(false); });
  $('#dlg-gate').addEventListener('close', function () { if (gateRes) finishGate(false); });
  $('#pin-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const s = state.pinFor;
    if (!s) return;
    const h = await hashPin($('#pin-a').value.trim(), s.profile.pin.s);
    if (h === s.profile.pin.h) finishPin(true); else { $('#pin-err').hidden = false; $('#pin-a').value = ''; $('#pin-a').focus(); }
  });
  $('#pin-cancel').addEventListener('click', function () { finishPin(false); });
  $('#dlg-pin').addEventListener('close', function () { if (state.pinFor) finishPin(false); });
  $('#pin-forgot').addEventListener('click', async function () {
    const s = state.pinFor;
    if (!s || !(await adultOK(true))) return;
    s.profile.pin = null; saveStore(); renderProfileList(); toast(t('pin.removed')); finishPin(true);
  });

  $('#btn-settings').addEventListener('click', openSettings);
  $$('input[name="units"]').forEach(function (r) {
    r.addEventListener('change', function () { state.store.units = r.value; saveStore(); renderAll(); });
  });
  [['set-hc', 'hc'], ['set-large', 'large'], ['set-readable', 'readable'], ['set-hideChart', 'hideChart']].forEach(function (pair) {
    $('#' + pair[0]).addEventListener('change', function (e) { state.store.a11y[pair[1]] = e.target.checked; saveStore(); applyA11y(); });
  });
  $('#set-kid').addEventListener('change', function (e) { state.store.kidMode = e.target.checked; saveStore(); applyA11y(); applyStatic(); renderAll(); });
  $('#set-speak').addEventListener('change', function (e) { state.store.speak = e.target.checked; saveStore(); updateSpeech(); });
  $('#btn-wipe').addEventListener('click', wipeAll);
  $('#btn-privacy').addEventListener('click', function () { openDialog($('#dlg-privacy')); });
  $('#btn-install').addEventListener('click', function () {
    if (!state.installEv) return;
    state.installEv.prompt();
    state.installEv.userChoice.then(function () { state.installEv = null; $('#btn-install').hidden = true; });
  });
  $('#banner-x').addEventListener('click', dismissBanner);
  $('#lang-select').addEventListener('change', function (e) { setLang(e.target.value); });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); state.installEv = e; });
  window.addEventListener('pageshow', function () { if (state.store && !state.onboarding) renderAll(); });
}

/* ─────────── service worker / init ─────────── */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    reg.addEventListener('updatefound', function () {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) { state.updateReady = true; updateBanner(); }
      });
    });
  }).catch(function () { /* офлайн-режим необов'язковий */ });
}
async function unlockActive() {
  for (;;) {
    const p = P();
    if (!p.pin) return;
    if (await askPin(p)) return;
  }
}
async function init() {
  state.store = loadStore();
  let lang = state.store.lang;
  try { await Promise.all([loadLocale('uk'), loadLocale(lang)]); }
  catch (e) { lang = 'uk'; try { await loadLocale('uk'); } catch (e2) { $('#boot').textContent = 'Error: locale'; return; } }
  state.store.lang = lang;
  applyLocaleData(lang);
  const n = todayParts();
  state.view = { y: n.y, m: n.m };
  buildLangSelect();
  applyA11y();
  applyStatic();
  bindEvents();
  initSpeech();
  saveStore();
  registerSW();
  if (!state.store.onboarded) { showOnboarding(); }
  else {
    $('#boot').hidden = true;
    $('#app-shell').hidden = false;
    renderAll();
    await unlockActive();
    if (/[?&]today=1/.test(location.search)) { try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ } openDay(todayKey()); }
  }
  $('#boot').hidden = true;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
