// ---------- sahne 1: kuş bakışı ----------
var BULUT_IKON = { x: 1100, y: 78 };
function DUNYA_WAN() { return [[WD.agil.x, WD.agil.y], [BULUT_IKON.x / KUS, BULUT_IKON.y / KUS]]; }
function kx(x) { return x * KUS; }
function ky(y) { return y * KUS; }
var kusSicakNokta = [];                       // tıklanabilir alanlar: { x, y, r, git }

function bulutCiz(x, y, s, renk, cizgi) {
  ctx.fillStyle = renk; ctx.strokeStyle = cizgi; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x - 22 * s, y + 4 * s, 15 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x - 6 * s, y - 10 * s, 18 * s, Math.PI * 1.05, Math.PI * 1.95);
  ctx.arc(x + 16 * s, y - 2 * s, 15 * s, Math.PI * 1.3, Math.PI * 0.35);
  ctx.lineTo(x - 22 * s, y + 19 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function agilCiz(x, y, r, s) {                 // taş duvarlı ağıl, ahır ve kapı (kuş bakışı)
  ctx.fillStyle = koyu ? '#3a3a30' : '#d9cfb4'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = RENK.duvar; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(x, y, r, 0.25, Math.PI * 2 - 0.25); ctx.stroke();
  ctx.fillStyle = RENK.cati; ctx.fillRect(x - r * 0.9, y - r * 0.55, r * 0.75, r * 0.55);
  ctx.fillStyle = koyu ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)'; ctx.fillRect(x - r * 0.9, y - r * 0.12, r * 0.75, r * 0.12);
}
function evCiz(e, s, isik) {
  ctx.save(); ctx.translate(kx(e.x), ky(e.y)); ctx.rotate(e.d);
  var w = e.w * KUS * s, h = e.h * KUS * s;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-w / 2 + 1.5, -h / 2 + 1.5, w, h);
  ctx.fillStyle = RENK.cati; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = koyu ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)'; ctx.fillRect(-w / 2, -h / 2, w, h / 2);
  if (isik > 0.3) { ctx.fillStyle = 'rgba(255,210,120,' + (isik * 0.9) + ')'; ctx.fillRect(-1.2, -1, 2.4, 2); }
  ctx.restore();
}
function kapsamaHalkasi(x, y, r, renk, kesik) {
  ctx.strokeStyle = renk; ctx.lineWidth = 1.4; ctx.setLineDash(kesik || [6, 5]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
}
function sahneKus() {
  var st = sim.state(), P = st.P, prof = st.prof, orman = st.orman, gece = gecelik(st.t), zamanMs = simdi;
  kusSicakNokta = [];
  ctx.drawImage(kabartma(orman), 0, 0, LW, LH);
  var ax = kx(WD.agil.x), ay = ky(WD.agil.y);
  // yollar
  ctx.strokeStyle = RENK.yol; ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]);
  WD.meralar.forEach(function (m, i) {
    ctx.beginPath(); ctx.moveTo(ax + 10, ay);
    ctx.quadraticCurveTo(karis(ax, kx(m.x), 0.5) + (i % 2 ? 40 : -30), karis(ay, ky(m.y), 0.5) + (i % 2 ? -30 : 35), kx(m.x), ky(m.y)); ctx.stroke();
  });
  ctx.setLineDash([]);
  // meralar
  WD.meralar.forEach(function (m, i) {
    ctx.fillStyle = koyu ? 'rgba(150,200,120,0.08)' : 'rgba(255,255,220,0.22)';
    ctx.beginPath(); ctx.ellipse(kx(m.x), ky(m.y), 70, 52, 0, 0, 7); ctx.fill();
    yazi(MERA_AD[i], kx(m.x), ky(m.y) + 62, { boy: 12, hiza: 'center', renk: koyu ? '#c8d6c4' : '#3c4a3e', golge: koyu ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' });
  });
  // yasak alan: ekili tarla
  var yz = WD.yasak;
  ctx.save(); ctx.beginPath(); yz.forEach(function (p, i) { if (i) ctx.lineTo(kx(p.x), ky(p.y)); else ctx.moveTo(kx(p.x), ky(p.y)); }); ctx.closePath();
  ctx.fillStyle = koyu ? '#4a4a2c' : '#d8cf8e'; ctx.fill(); ctx.clip();
  ctx.strokeStyle = koyu ? '#6a7a3a' : '#9cb35a'; ctx.lineWidth = 1.2;
  for (var sx = kx(yz[0].x) - 80; sx < kx(yz[2].x) + 80; sx += 5) { ctx.beginPath(); ctx.moveTo(sx, ky(yz[0].y)); ctx.lineTo(sx + 30, ky(yz[2].y)); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath(); yz.forEach(function (p, i) { if (i) ctx.lineTo(kx(p.x), ky(p.y)); else ctx.moveTo(kx(p.x), ky(p.y)); }); ctx.closePath();
  ctx.strokeStyle = RENK.yasak; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  yazi('Ekili tarla · yasak alan', kx(yz[0].x) + 37, ky(yz[2].y) + 13, { boy: 11.5, hiza: 'center', renk: RENK.yasak, agirlik: 600, golge: koyu ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' });
  // kapsama alanları
  var gwR = orman ? P.gwRangeOrman : P.gwRange;
  kapsamaHalkasi(ax, ay, P.gwRange * KUS, koyu ? 'rgba(95,195,166,0.45)' : 'rgba(31,111,92,0.4)');
  if (orman) kapsamaHalkasi(ax, ay, P.gwRangeOrman * KUS + 105 * KUS, koyu ? 'rgba(95,195,166,0.8)' : 'rgba(31,111,92,0.75)', [3, 3]);
  var tel = prof.tel, telRenk = koyu ? 'rgba(190,150,255,0.6)' : 'rgba(110,60,190,0.5)';
  if (tel.tip === 'koy') kapsamaHalkasi(ax, ay, tel.r * KUS, telRenk, [2, 4]);
  if (tel.tip === 'markov') kapsamaHalkasi(ax, ay, tel.koyR * KUS, telRenk, [2, 4]);
  if (tel.tip === 'tepe') {
    kapsamaHalkasi(kx(WD.tepe.x), ky(WD.tepe.y), tel.r * KUS, telRenk, [2, 4]);
    direkCiz(kx(WD.tepe.x), ky(WD.tepe.y), telRenk.replace(/0\.\d+\)$/, '1)'));
    yazi('Telefonun çektiği tek nokta (tepe)', kx(WD.tepe.x), ky(WD.tepe.y) - 22, { boy: 11.5, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  }
  // köy ve ağıl
  EVLER.forEach(function (e) { evCiz(e, 2.2, gece); });
  agilCiz(ax, ay, WD.agilR * KUS, 1);
  direkCiz(ax + 14, ay - 14, RENK.sis);
  // hayvanlar
  var N = st.N, nab = 0.5 + 0.5 * Math.sin(zamanMs / 220);
  for (var i = N - 1; i >= 0; i--) {
    var x = kx(st.x[i]), y = ky(st.y[i]), md = st.mode[i], kind = st.kind[i];
    if (kind === 0) continue;
    ctx.fillStyle = kind === 1 ? RENK.lora : RENK.led;
    ctx.beginPath(); ctx.arc(x, y, kind === 1 ? 2.1 : 1.7, 0, 7); ctx.fill();
    if (kind === 2 && !koyu) { ctx.strokeStyle = 'rgba(60,60,50,0.45)'; ctx.lineWidth = 0.6; ctx.stroke(); }
    if (md !== 0 && !st.inside[i]) {
      ctx.strokeStyle = md === 4 ? RENK.soluk : RENK.alarm; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(x, y, 5 + nab * 4, 0, 7); ctx.stroke();
    }
  }
  var etiketYer = [];
  for (var g = 0; g < P.TASMA; g++) {
    var lx = kx(st.x[g]), ly = ky(st.y[g]);
    ctx.fillStyle = RENK.onder; ctx.strokeStyle = koyu ? '#111' : '#fff'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(lx, ly, 4.2, 0, 7); ctx.fill(); ctx.stroke();
    if (!st.inside[g]) {
      var ex = lx + 10 + (g % 3) * 0, ey = ly - 12, cak = etiketYer.some(function (q) { return Math.abs(q[0] - ex) < 56 && Math.abs(q[1] - ey) < 20; });
      if (cak) { ey = ly + 14 + (g % 2) * 18; ex = lx + 10; cak = etiketYer.some(function (q) { return Math.abs(q[0] - ex) < 56 && Math.abs(q[1] - ey) < 20; }); }
      if (!cak) { etiketYer.push([ex, ey]); yazi('Sürü ' + (g + 1) + ' ›', ex, ey, { boy: 11.5, agirlik: 600, zemin: RENK.etiket, cizgi: RENK.etiketCizgi }); }
      else yazi(String(g + 1), lx + 8, ly - 8, { boy: 10.5, agirlik: 700, zemin: RENK.onder, renk: '#fff' });
      kusSicakNokta.push({ x: lx, y: ly, r: 34, git: function (gg) { return function () { dagGrup = gg; dagTakip = false; sahneSec('dag'); }; }(g) });
    }
  }
  // çoban (mobil sis düğümü)
  var cx = kx(st.coban.x), cy = ky(st.coban.y);
  var cepR = (orman && ormanda(st.coban.x, st.coban.y) ? P.cepRangeOrman : P.cepRange) * KUS;
  ctx.fillStyle = koyu ? 'rgba(232,176,74,0.07)' : 'rgba(183,121,31,0.07)'; ctx.beginPath(); ctx.arc(cx, cy, cepR, 0, 7); ctx.fill();
  kapsamaHalkasi(cx, cy, cepR, koyu ? 'rgba(232,176,74,0.55)' : 'rgba(183,121,31,0.5)', [3, 4]);
  cobanIkon(cx, cy, 1);
  // paketler
  paketleriCiz('dunya', function (p) { return [kx(p[0]), ky(p[1])]; });
  // gece
  if (gece > 0) { ctx.fillStyle = RENK.gece + (gece * 0.5) + ')'; ctx.fillRect(0, 0, LW, LH); }
  if (gece > 0.2) {
    var gl = ctx.createRadialGradient(ax, ay, 2, ax, ay, 46);
    gl.addColorStop(0, 'rgba(255,205,120,' + (0.55 * gece) + ')'); gl.addColorStop(1, 'rgba(255,205,120,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(ax, ay, 46, 0, 7); ctx.fill();
    EVLER.forEach(function (e) { ctx.fillStyle = 'rgba(255,210,120,' + (0.9 * gece) + ')'; ctx.beginPath(); ctx.arc(kx(e.x), ky(e.y), 1.6, 0, 7); ctx.fill(); });
  }
  // bulut ve geniş alan bağlantısı (WAN)
  var bx = BULUT_IKON.x, by = BULUT_IKON.y;
  ctx.strokeStyle = st.wan ? (koyu ? 'rgba(124,199,127,0.75)' : 'rgba(47,125,50,0.7)') : RENK.alarm;
  ctx.lineWidth = 2; ctx.setLineDash(st.wan ? [8, 6] : [3, 6]); ctx.lineDashOffset = st.wan ? -zamanMs / 40 : 0;
  ctx.beginPath(); ctx.moveTo(ax + 16, ay - 16); ctx.quadraticCurveTo(ax + 300, by + 40, bx - 34, by + 6); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
  if (!st.wan) yazi('✕ internet yok', karis(ax, bx, 0.42), karis(ay, by, 0.42) - 8, { boy: 12, agirlik: 600, renk: RENK.alarm, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.alarm });
  bulutCiz(bx, by, 1.15, koyu ? '#203247' : '#eaf2fb', RENK.bulut);
  yazi('Bulut ›', bx - 2, by + 2, { boy: 13, agirlik: 700, hiza: 'center', renk: RENK.bulut, aile: 'Space Grotesk, Inter, sans-serif' });
  paketleriCiz('dunyaWan', function (p) { return [kx(p[0]), ky(p[1])]; });
  kusSicakNokta.push({ x: bx, y: by, r: 40, git: function () { sahneSec('bulut'); } });
  // etiketler
  yazi('Ağıl kapısı ›', ax + 22, ay + 18, { boy: 12, agirlik: 600, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  yazi('Köy · sabit sis düğümü ›', kx(KOY.x) - 10, ky(KOY.y) + 34, { boy: 12, agirlik: 600, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  yazi('Çoban · mobil sis', cx + 12, cy + 14, { boy: 11.5, agirlik: 600, renk: RENK.mobil, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  kusSicakNokta.push({ x: ax, y: ay, r: 26, git: function () { sahneSec('agil'); } });
  kusSicakNokta.push({ x: kx(KOY.x), y: ky(KOY.y), r: 34, git: function () { sahneSec('koy'); } });
  yazi('LoRa ağ geçidi menzili ' + mesafe(P.gwRange) + (orman ? ' · ormanda ' + mesafe(P.gwRangeOrman) : ''), ax + P.gwRange * KUS * Math.cos(0.32), ay + P.gwRange * KUS * Math.sin(0.32),
       { boy: 11, renk: RENK.sis, zemin: RENK.etiket, cizgi: RENK.etiketCizgi, hiza: 'center' });
  pusulaVeOlcek();
}
function direkCiz(x, y, renk) {
  ctx.strokeStyle = renk; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x, y - 7); ctx.moveTo(x - 4, y + 7); ctx.lineTo(x, y - 3); ctx.lineTo(x + 4, y + 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 7, 4, -2.4, -0.7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - 7, 7, -2.4, -0.7); ctx.stroke();
}
function cobanIkon(x, y, s) {
  ctx.fillStyle = koyu ? '#f2efe6' : '#2a2a24';
  ctx.beginPath(); ctx.arc(x, y - 6 * s, 2.6 * s, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 3 * s, y + 4 * s); ctx.lineTo(x, y - 3.5 * s); ctx.lineTo(x + 3 * s, y + 4 * s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = koyu ? '#d9b26a' : '#8a5a20'; ctx.lineWidth = 1.3 * s;
  ctx.beginPath(); ctx.moveTo(x + 4.5 * s, y + 5 * s); ctx.lineTo(x + 4.5 * s, y - 8 * s); ctx.arc(x + 3 * s, y - 8 * s, 1.5 * s, 0, Math.PI, true); ctx.stroke();
  ctx.fillStyle = RENK.mobil; ctx.fillRect(x - 5.5 * s, y - 2 * s, 2.2 * s, 3.4 * s);
}
function pusulaVeOlcek() {
  var x = 40, y = LH - 40;
  ctx.strokeStyle = koyu ? 'rgba(230,237,231,0.8)' : 'rgba(27,38,30,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1000 * KUS, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.moveTo(x + 1000 * KUS, y - 4); ctx.lineTo(x + 1000 * KUS, y + 4); ctx.stroke();
  yazi('1 km', x + 500 * KUS, y - 10, { boy: 11, hiza: 'center', golge: koyu ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' });
  yazi('K', 40, 32, { boy: 13, agirlik: 700, hiza: 'center', golge: koyu ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' });
  ok(40, 62, 40, 42, koyu ? 'rgba(230,237,231,0.8)' : 'rgba(27,38,30,0.75)', 1.6);
}
function paketleriCiz(yer, donustur) {
  for (var i = 0; i < paketler.length; i++) {
    var p = paketler[i]; if (p.yer !== yer) continue;
    var k = (simdi - p.t0) / p.sure; if (k < 0 || k > 1) continue;
    var a = yolNokta(p.yol, k), b = yolNokta(p.yol, Math.max(0, k - 0.06));
    var A = donustur(a), B = donustur(b), iz = uzak(A[0], A[1], B[0], B[1]);
    if (iz > 18) { B = [A[0] + (B[0] - A[0]) * 18 / iz, A[1] + (B[1] - A[1]) * 18 / iz]; }
    ctx.strokeStyle = p.renk; ctx.globalAlpha = 0.45; ctx.lineWidth = p.r * 0.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(A[0], A[1]); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = p.renk; ctx.beginPath(); ctx.arc(A[0], A[1], p.r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(A[0] - p.r * 0.3, A[1] - p.r * 0.3, p.r * 0.35, 0, 7); ctx.fill();
  }
}
