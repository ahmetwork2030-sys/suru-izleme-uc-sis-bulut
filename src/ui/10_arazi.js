// ---------- arazi: kabartmalı yükseklik haritası ----------
// Dünya 8000 x 5000 m; kabartma 800 x 500 pikselde (10 m / piksel) bir kez üretilir, sahnelerde ölçeklenir.
var RW = 800, RH = 500, KUS = LW / WD.W;     // kuş bakışı: 0,15 birim / m
var NEHIR = [[2900, 0], [2600, 700], [2050, 1350], [1500, 1900], [1150, 2250], [1050, 2700], [880, 3300], [700, 4100], [560, 5000]];
var KOY = { x: 640, y: 2830 };                // köy merkezi (ağılın güneybatısı, dere kıyısı)
var EVLER = [];
(function () {
  for (var i = 0; i < 14; i++) {
    var a = hash(i, 7) * Math.PI * 2, r = 60 + hash(i, 9) * 190;
    EVLER.push({ x: KOY.x + Math.cos(a) * r, y: KOY.y + Math.sin(a) * r * 0.8, w: 26 + hash(i, 3) * 18, h: 18 + hash(i, 5) * 12, d: (hash(i, 11) - 0.5) * 0.5 });
  }
})();
var MERA_AD = ['Mera A', 'Mera B', 'Mera C', 'Mera D'];

function vgurultu(x, y) {
  var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y) { var s = 0, a = 0.5, f = 1; for (var o = 0; o < 5; o++) { s += a * vgurultu(x * f + o * 17, y * f - o * 11); f *= 2.03; a *= 0.5; } return s; }
function nehreUzaklik(x, y) {
  var en = 1e9;
  for (var i = 1; i < NEHIR.length; i++) {
    var ax = NEHIR[i - 1][0], ay = NEHIR[i - 1][1], bx = NEHIR[i][0], by = NEHIR[i][1];
    var dx = bx - ax, dy = by - ay, k = kisit(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    var d = uzak(x, y, ax + dx * k, ay + dy * k); if (d < en) en = d;
  }
  return en;
}
function yukseklik(x, y) {
  var taban = fbm(x / 1700, y / 1700);
  var egim = (x / WD.W) * 0.55 + (1 - y / WD.H) * 0.45;           // kuzeydoğuya doğru yükselen dağlar
  var h = 0.16 + 0.5 * egim + 0.42 * (taban - 0.5);
  var da = uzak(x, y, WD.agil.x, WD.agil.y);
  h -= 0.22 * Math.exp(-da * da / (2 * 1100 * 1100));             // ağıl ve köy vadide
  var dn = nehreUzaklik(x, y);
  h -= 0.1 * Math.exp(-dn * dn / (2 * 260 * 260));                 // dere yatağı
  var dt = uzak(x, y, WD.tepe.x, WD.tepe.y);
  h += 0.22 * Math.exp(-dt * dt / (2 * 520 * 520));                // kapsama tepesi
  WD.meralar.forEach(function (m) {                                // meralar yumuşak düzlük
    var d = uzak(x, y, m.x, m.y), w = Math.exp(-d * d / (2 * 520 * 520));
    h = karis(h, 0.42 + 0.06 * taban, w * 0.65);
  });
  return kisit(h, 0, 1);
}
var RAMPA_ACIK = [[0, [150, 190, 128]], [0.28, [172, 205, 140]], [0.45, [196, 214, 152]], [0.6, [208, 202, 150]], [0.72, [186, 170, 132]], [0.84, [168, 160, 146]], [0.93, [222, 219, 210]], [1, [246, 245, 240]]];
var RAMPA_KOYU = [[0, [36, 54, 38]], [0.28, [42, 62, 42]], [0.45, [50, 68, 46]], [0.6, [62, 66, 48]], [0.72, [66, 60, 48]], [0.84, [72, 70, 66]], [0.93, [104, 104, 102]], [1, [132, 134, 132]]];
function rampa(r, h) {
  for (var i = 1; i < r.length; i++) if (h <= r[i][0]) {
    var k = (h - r[i - 1][0]) / (r[i][0] - r[i - 1][0]), a = r[i - 1][1], b = r[i][1];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  return r[r.length - 1][1];
}
var YUK = null;
function yukseklikDizisi() {
  if (YUK) return YUK;
  YUK = new Float32Array(RW * RH);
  for (var j = 0; j < RH; j++) for (var i = 0; i < RW; i++) YUK[j * RW + i] = yukseklik((i + 0.5) * 10, (j + 0.5) * 10);
  return YUK;
}
var kabartmaOnbellek = {};
function ormanda(x, y) { return uzak(x, y, WD.agil.x, WD.agil.y) > WD.ormanDisiR; }
function kabartma(orman, yumusak) {
  var anahtar = (koyu ? 'k' : 'a') + (orman ? 'o' : '') + (yumusak ? 'y' : '');
  if (kabartmaOnbellek[anahtar]) return kabartmaOnbellek[anahtar];
  var Y = yukseklikDizisi(), c = document.createElement('canvas'); c.width = RW; c.height = RH;
  var g = c.getContext('2d'), img = g.createImageData(RW, RH), d = img.data, R = koyu ? RAMPA_KOYU : RAMPA_ACIK;
  for (var j = 0; j < RH; j++) for (var i = 0; i < RW; i++) {
    var p = j * RW + i, h = Y[p];
    var hx = Y[j * RW + Math.min(RW - 1, i + 1)] - Y[j * RW + Math.max(0, i - 1)];
    var hy = Y[Math.min(RH - 1, j + 1) * RW + i] - Y[Math.max(0, j - 1) * RW + i];
    var golge = kisit(1 + (-hx * 0.8 - hy * 0.8) * 9, 0.62, 1.3);         // kuzeybatıdan ışık
    var c3 = rampa(R, h);
    var es = Math.floor(h * 22), sag = Math.floor(Y[j * RW + Math.min(RW - 1, i + 1)] * 22), alt = Math.floor(Y[Math.min(RH - 1, j + 1) * RW + i] * 22);
    var cizgi = !yumusak && (es !== sag || es !== alt) ? (es % 5 === 0 ? 0.8 : 0.9) : 1;  // eş yükselti çizgileri
    if (yumusak) golge = 1 + (golge - 1) * 0.5;
    d[p * 4] = kisit(c3[0] * golge * cizgi, 0, 255); d[p * 4 + 1] = kisit(c3[1] * golge * cizgi, 0, 255);
    d[p * 4 + 2] = kisit(c3[2] * golge * cizgi, 0, 255); d[p * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (yumusak) { kabartmaOnbellek[anahtar] = c; return c; }
  // dere
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); NEHIR.forEach(function (p, k) { if (k) g.lineTo(p[0] / 10, p[1] / 10); else g.moveTo(p[0] / 10, p[1] / 10); });
  g.strokeStyle = koyu ? '#2d5a7a' : '#7fb1d9'; g.lineWidth = 5; g.stroke();
  g.strokeStyle = koyu ? '#3f7aa0' : '#a9cdea'; g.lineWidth = 2; g.stroke();
  // ağaçlar
  var adim = orman ? 6 : 9;
  for (var ty = 0; ty < RH; ty += adim) for (var tx = 0; tx < RW; tx += adim) {
    var jx = tx + hash(tx, ty) * adim, jy = ty + hash(ty, tx + 3) * adim, wx = jx * 10, wy = jy * 10, hh = Y[Math.min(RH - 1, jy | 0) * RW + Math.min(RW - 1, jx | 0)];
    var koru;
    if (orman) {
      koru = ormanda(wx, wy) && nehreUzaklik(wx, wy) > 120;
      WD.meralar.forEach(function (m) { if (uzak(wx, wy, m.x, m.y) < 330) koru = false; });
    } else koru = hh > 0.42 && hh < 0.78 && fbm(wx / 900 + 40, wy / 900) > 0.6 && uzak(wx, wy, WD.agil.x, WD.agil.y) > 900;
    if (!koru) continue;
    var r = (orman ? 3.2 : 2.4) + hash(tx + 5, ty) * 1.4;
    g.fillStyle = koyu ? 'rgba(0,0,0,0.35)' : 'rgba(40,60,30,0.28)'; g.beginPath(); g.arc(jx + 1, jy + 1.2, r, 0, 7); g.fill();
    var ton = hash(tx, ty + 9);
    g.fillStyle = koyu ? 'rgb(' + (30 + ton * 14) + ',' + (60 + ton * 20) + ',' + (40 + ton * 10) + ')' : 'rgb(' + (70 + ton * 30) + ',' + (112 + ton * 30) + ',' + (64 + ton * 20) + ')';
    g.beginPath(); g.arc(jx, jy, r, 0, 7); g.fill();
    g.fillStyle = koyu ? 'rgba(120,160,120,0.18)' : 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(jx - r * 0.35, jy - r * 0.35, r * 0.45, 0, 7); g.fill();
  }
  kabartmaOnbellek[anahtar] = c;
  return c;
}
