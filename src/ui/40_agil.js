// ---------- sahne 3: ağıl kapısı ve devreler (Wokwi'deki iki devrenin simülasyon içindeki karşılığı) ----------
var KX = { giris: 210, cikis: 960, dis: 420, mik0: 560, mik1: 650, ir: 605, ic: 790, ust: 168, alt: 238, orta: 203 };
var kapi = null;
function kapiSifirla() {
  kapi = { kuyruk: [], aktif: [], sira: 0, gun: -1, cikis: 0, giris: 0, icerde: null, msj: [], l1: 'Agil kapisi', l2: 'Kapi hazir', yesil: 0, kirmizi: false,
           bip: 0, disKesik: 0, icKesik: 0, irAn: 0, etiket: null, etiketYayin: -1, etiketT0: 0, sonSayim: '', hizli: false, sayimBekle: null };
}
kapiSifirla();
function kapiOlay(e) {
  if (sahne === 'agil') kapi.kuyruk.push(e); else kapiIsle(e, false);
}
function kapiBosalt() { while (kapi.kuyruk.length) kapiIsle(kapi.kuyruk.shift(), false); kapi.aktif.forEach(function (a) { if (!a.kayit) kapiIsle(a.e, false); }); kapi.aktif = []; }
function kapiIsle(e, gorsel) {
  var N = sim.state().N, gun = Math.floor(e.t / 1440);
  if (gun !== kapi.gun) { kapi.gun = gun; kapi.cikis = 0; kapi.giris = 0; kapi.kirmizi = false; }
  if (e.tur === 'kapi') {
    var no = etiketNo(e.dev), giris = e.yon === 'giris';
    kapi.sira++; if (giris) kapi.giris++; else kapi.cikis++;
    kapi.icerde = e.icerde;
    kapi.l1 = 'LED ' + no + ' ' + (giris ? 'GIRIS' : 'CIKIS'); kapi.l2 = 'Icerde ' + e.icerde + '/' + N;
    kapi.msj.push({ k: 'kapi', txt: '{"sira":' + kapi.sira + ',"etiket":' + no + ',"yon":"' + e.yon + '","t":"' + saat(e.t) + '","icerde":' + e.icerde + '}' });
    if (gorsel) { kapi.yesil = simdi; kapi.bip = simdi; paketEkle('koy', KOY_YOL.kapi, RENK.onder, 2200, 4); }
  } else {
    var eksik = e.eksik.map(etiketNo);
    if (eksik.length) { kapi.l1 = 'EKSIK: ' + eksik.length + ' hayvan'; kapi.l2 = 'Ilk: ' + eksik[0]; kapi.kirmizi = true; }
    else { kapi.l1 = 'Sayim tamam'; kapi.l2 = 'Eksik yok'; kapi.kirmizi = false; }
    kapi.icerde = e.icerde;
    kapi.sonSayim = saat(e.t) + ' · ' + e.icerde + '/' + N + ' içeride, ' + eksik.length + ' eksik';
    kapi.msj.push({ k: 'sayim', txt: '{"icerde":' + e.icerde + ',"toplam":' + N + ',"eksik":[' + eksik.slice(0, 8).join(',') + (eksik.length > 8 ? ',…' : '') + ']}' });
    if (gorsel) { kapi.bip = simdi; paketEkle('koy', KOY_YOL.kapi, RENK.alarm, 2200, 5); }
  }
  if (kapi.msj.length > 40) kapi.msj.shift();
}
function gecisSuresi() {                         // bir hayvanın koridoru geçme süresi (gerçek saniye)
  var s = hiz <= 6 ? 6 : hiz <= 15 ? 4.6 : hiz <= 30 ? 3.4 : hiz <= 60 ? 2.6 : hiz <= 180 ? 1.3 : 0.6;
  return kapi.hizli ? s / 5 : s;
}
function kapiMesgul() { return kapi.kuyruk.length > 0 || kapi.aktif.length > 0; }
function kapiGuncelle(dtMs) {
  var D = gecisSuresi() * 1000, son = kapi.aktif[kapi.aktif.length - 1];
  if (kapi.kuyruk.length && (!son || son.p > 0.3)) {
    var e = kapi.kuyruk[0];
    if (e.tur === 'sayim') { if (!kapi.aktif.length) { kapi.kuyruk.shift(); kapiIsle(e, true); } }
    else { kapi.kuyruk.shift(); kapi.aktif.push({ e: e, no: etiketNo(e.dev), giris: e.yon === 'giris', p: 0, x: e.yon === 'giris' ? KX.giris : KX.cikis, kayit: false, dis: false, ic: false, ir: false, reed: false }); }
  }
  for (var i = 0; i < kapi.aktif.length; i++) {
    var a = kapi.aktif[i], ox = a.x;
    a.p += dtMs / D;
    a.x = a.giris ? karis(KX.giris, KX.cikis, a.p) : karis(KX.cikis, KX.giris, a.p);
    var gecti = function (cx) { return (ox < cx && a.x >= cx) || (ox > cx && a.x <= cx); };
    if (gecti(KX.dis)) { a.dis = true; kapi.disKesik = simdi; }
    if (gecti(KX.ic)) { a.ic = true; kapi.icKesik = simdi; }
    var mik = a.x > KX.mik0 && a.x < KX.mik1;
    if (mik && !a.reed) { a.reed = true; kapi.etiket = a.no; kapi.etiketT0 = simdi; }
    if (gecti(KX.ir)) { a.ir = true; kapi.irAn = simdi; kapi.l1 = 'LED ' + a.no + ' okundu'; kapi.l2 = 'Bariyer bekle..'; }
    var tamam = a.giris ? a.ic && a.dis && a.ir : a.ic && a.dis && a.ir;
    if (tamam && !a.kayit) { a.kayit = true; kapiIsle(a.e, true); }
  }
  kapi.aktif = kapi.aktif.filter(function (a) { return a.p < 1; });
}
function sahneAgil() {
  var st = sim.state(), gece = gecelik(st.t), N = st.N;
  if (kapi.icerde === null) { var ic = 0; for (var i = 0; i < N; i++) ic += st.inside[i]; kapi.icerde = ic; }
  // gökyüzü yerine zemin: sol mera, orta koridor, sağ ağıl
  var cim = koyu ? '#26362a' : '#b9d39b', cim2 = koyu ? '#2d3f30' : '#a9c88a', toprak = koyu ? '#3d3528' : '#d9c7a0';
  ctx.fillStyle = cim; ctx.fillRect(0, 0, LW, 400);
  for (var k = 0; k < 160; k++) { var gx = hash(k, 1) * LW, gy = hash(k, 2) * 390; ctx.fillStyle = cim2; ctx.fillRect(gx, gy, 3, 7); }
  // ağıl avlusu
  ctx.fillStyle = toprak; ctx.beginPath(); ctx.moveTo(900, 20); ctx.lineTo(1200, 20); ctx.lineTo(1200, 390); ctx.lineTo(900, 390); ctx.quadraticCurveTo(860, 203, 900, 20); ctx.fill();
  ctx.strokeStyle = RENK.duvar; ctx.lineWidth = 12; ctx.setLineDash([16, 4]);
  ctx.beginPath(); ctx.moveTo(1200, 20); ctx.lineTo(905, 20); ctx.quadraticCurveTo(866, 100, 880, KX.ust); ctx.moveTo(880, KX.alt); ctx.quadraticCurveTo(866, 320, 905, 390); ctx.lineTo(1200, 390); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = RENK.cati; ctx.fillRect(1040, 40, 140, 90); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(1040, 40, 140, 45);
  yazi('Ağıl', 1110, 150, { boy: 15, agirlik: 700, hiza: 'center', aile: 'Space Grotesk, Inter, sans-serif' });
  // ağıldaki hayvanlar
  var cikanBekler = kapi.kuyruk.filter(function (e) { return e.tur === 'kapi' && e.yon === 'cikis'; }).length;
  var goster = Math.min(Math.max(0, (kapi.icerde || 0) - Math.min(cikanBekler, 9)), 60);
  for (i = 0; i < goster; i++) {
    var sx = 1100 + (i % 4) * 22 + (Math.floor(i / 4) % 2) * 11, sy = 160 + Math.floor(i / 4) * 13;
    if (sy > 352) break;
    koyunCiz(sx, sy, 0.3 + hash(i, 4) * 0.6, 1.25, 2, '');
  }
  yazi('Ağılda ' + (kapi.icerde || 0) + ' / ' + N, 1110, 372, { boy: 14, agirlik: 700, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  // mera tarafı patika
  ctx.fillStyle = toprak; ctx.beginPath(); ctx.moveTo(0, 170); ctx.quadraticCurveTo(200, 160, 330, KX.ust + 4); ctx.lineTo(330, KX.alt - 4); ctx.quadraticCurveTo(200, 250, 0, 240); ctx.fill();
  yazi('Mera tarafı', 70, 130, { boy: 14, agirlik: 700, aile: 'Space Grotesk, Inter, sans-serif' });
  // koridor
  ctx.fillStyle = koyu ? '#4a4030' : '#cdb78c'; ctx.fillRect(330, KX.ust, 550, KX.alt - KX.ust);
  ctx.strokeStyle = koyu ? '#8a6a44' : '#8a5a2b'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(330, KX.ust); ctx.lineTo(880, KX.ust); ctx.moveTo(330, KX.alt); ctx.lineTo(880, KX.alt); ctx.stroke();
  ctx.fillStyle = koyu ? '#6a5034' : '#6e4520';
  for (var px = 330; px <= 880; px += 44) { ctx.fillRect(px - 4, KX.ust - 4, 8, 8); ctx.fillRect(px - 4, KX.alt - 4, 8, 8); }
  yazi('Tek sıra geçişli koridor', 605, KX.alt + 22, { boy: 12, hiza: 'center', renk: RENK.soluk });
  // mıknatıs şeridi
  ctx.fillStyle = '#c0392b'; ctx.fillRect(KX.mik0, KX.ust - 12, (KX.mik1 - KX.mik0) / 2, 7);
  ctx.fillStyle = '#2e6fbf'; ctx.fillRect((KX.mik0 + KX.mik1) / 2, KX.ust - 12, (KX.mik1 - KX.mik0) / 2, 7);
  yazi('N', KX.mik0 + 10, KX.ust - 8.5, { boy: 9, agirlik: 700, renk: '#fff', hiza: 'center' }); yazi('S', KX.mik1 - 10, KX.ust - 8.5, { boy: 9, agirlik: 700, renk: '#fff', hiza: 'center' });
  // bariyerler
  function bariyer(x, kesik, ad, adim) {
    var aktif = simdi - kesik < 700;
    ctx.fillStyle = koyu ? '#d8d8d0' : '#333'; ctx.fillRect(x - 6, KX.ust - 18, 12, 12); ctx.fillRect(x - 6, KX.alt + 6, 12, 12);
    ctx.strokeStyle = aktif ? '#ffd23f' : 'rgba(230,40,40,0.85)'; ctx.lineWidth = aktif ? 4 : 2;
    if (aktif) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 14; }
    ctx.setLineDash(aktif ? [6, 5] : []); ctx.beginPath(); ctx.moveTo(x, KX.ust - 6); ctx.lineTo(x, KX.alt + 6); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
    yazi(adim + ' ' + ad, x, KX.ust - 34, { boy: 12, agirlik: 600, hiza: 'center', zemin: aktif ? '#ffd23f' : RENK.etiket, renk: aktif ? '#1b261e' : RENK.yazi, cizgi: RENK.etiketCizgi });
  }
  // okuyucu
  var irAktif = simdi - kapi.irAn < 900;
  kutu(KX.ir - 34, 64, 68, 40, { dolgu: koyu ? '#20262e' : '#2b3138', cizgi: irAktif ? '#b15cff' : '#555', kalin: irAktif ? 3 : 1.2, r: 6 });
  ctx.fillStyle = irAktif ? '#c77dff' : '#555'; ctx.beginPath(); ctx.arc(KX.ir, 92, 7, 0, 7); ctx.fill();
  yazi('ESP32', KX.ir, 76, { boy: 10, agirlik: 600, hiza: 'center', renk: '#dfe6ee' });
  ctx.strokeStyle = koyu ? '#999' : '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(KX.ir, 104); ctx.lineTo(KX.ir, KX.ust - 12); ctx.stroke();
  yazi('3. Kızılötesi alıcı (okuyucu)', KX.ir + 44, 78, { boy: 12, agirlik: 600, zemin: irAktif ? '#e5ccff' : RENK.etiket, renk: irAktif ? '#2a1640' : RENK.yazi, cizgi: RENK.etiketCizgi });
  yazi('2. Mıknatıs şeridi: etiket uyanır', (KX.mik0 + KX.mik1) / 2 - 120, 120, { boy: 12, agirlik: 600, zemin: RENK.etiket, cizgi: RENK.etiketCizgi, hiza: 'center' });
  // kuyruktaki hayvanlar
  var bekleyen = kapi.kuyruk.filter(function (e) { return e.tur === 'kapi'; });
  for (i = 0; i < Math.min(bekleyen.length, 9); i++) {
    var gir = bekleyen[i].yon === 'giris';
    var qx = gir ? KX.giris - 30 - i * 26 : 1000 + (i % 3) * 30, qy = gir ? KX.orta + Math.sin(i * 1.7) * 14 : KX.orta - 26 + Math.floor(i / 3) * 26;
    koyunCiz(qx, qy, gir ? 0 : Math.PI, 1.9, bekleyen[i].dev < st.P.TASMA ? 0 : bekleyen[i].dev < st.P.TASMA + st.P.ETIKET ? 1 : 2, '');
  }
  if (bekleyen.length) yazi('Sırada ' + bekleyen.length + ' hayvan', bekleyen[0].yon === 'giris' ? 110 : 1110, bekleyen[0].yon === 'giris' ? 290 : 120, { boy: 13, agirlik: 600, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  // koridordaki hayvanlar ve etiket ışığı
  kapi.aktif.forEach(function (a) {
    var tur = a.e.dev < st.P.TASMA ? 0 : a.e.dev < st.P.TASMA + st.P.ETIKET ? 1 : 2;
    koyunCiz(a.x, KX.orta, a.giris ? 0 : Math.PI, 2.3, tur, '');
    var mik = a.x > KX.mik0 - 10 && a.x < KX.mik1 + 10;
    if (mik) {
      var hx = a.x + (a.giris ? 14 : -14), hy = KX.orta - 6;
      ctx.fillStyle = 'rgba(177,92,255,' + (0.5 + 0.5 * Math.sin(simdi / 40)) + ')'; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(177,92,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(KX.ir, 100); ctx.stroke(); ctx.setLineDash([]);
      yazi('LED ' + a.no + ' kodunu yayıyor', a.x, KX.orta + 46, { boy: 12, agirlik: 600, hiza: 'center', renk: '#7b2fd0', zemin: koyu ? '#efe3ff' : '#f3eaff', cizgi: '#b15cff' });
    } else yazi('LED ' + a.no, a.x, KX.orta + 40, { boy: 11, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  });
  bariyer(KX.dis, kapi.disKesik, 'Dış bariyer', '1.');
  bariyer(KX.ic, kapi.icKesik, 'İç bariyer', '4.');
  yazi('Mimaride: LED etiketi → okuyucu', 70, 330, { boy: 11.5, renk: RENK.soluk }); rozet(2, 54, 330, RENK.onder);
  var yonTxt = kapi.aktif.length ? (kapi.aktif[0].giris ? 'Önce dış sonra iç bariyer kesiliyor → GİRİŞ' : 'Önce iç sonra dış bariyer kesiliyor → ÇIKIŞ') : (kapiMesgul() ? '' : 'Kapı boş · sabah 07:00 çıkış, akşam yaklaşık 19:20 dönüş');
  if (yonTxt) yazi(yonTxt, 605, 300, { boy: 14, agirlik: 700, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.etiketCizgi, aile: 'Space Grotesk, Inter, sans-serif' });
  if (gece > 0) { ctx.fillStyle = RENK.gece + (gece * 0.4) + ')'; ctx.fillRect(0, 0, LW, 400); }
  // alt paneller: devreler
  ctx.fillStyle = koyu ? '#121813' : '#f3f5ef'; ctx.fillRect(0, 400, LW, LH - 400);
  ctx.strokeStyle = RENK.kutuCizgi; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 400); ctx.lineTo(LW, 400); ctx.stroke();
  etiketDevresi(14, 412, 410, 326);
  okuyucuDevresi(436, 412, 470, 326);
  mqttPaneli(918, 412, 268, 326);
}
// LED kimlik etiketi devresi (ATtiny85, CR2032, reed, IR LED) + NEC dalga biçimi
function etiketDevresi(x, y, w, h) {
  kutu(x, y, w, h, { dolgu: RENK.kutu, cizgi: RENK.kutuCizgi });
  var no = kapi.etiket || 1318, yayin = kapi.etiket !== null && simdi - kapi.etiketT0 < 1400, uyanik = yayin;
  yazi('LED kimlik etiketi · ATtiny85', x + 14, y + 20, { boy: 14, agirlik: 700, aile: 'Space Grotesk, Inter, sans-serif' });
  yazi(uyanik ? 'Uyandı · kod 3 kez yayılıyor' : 'Uykuda · ≈0,2 µA (pil yıllarca gider)', x + 14, y + 40, { boy: 12, agirlik: 600, renk: uyanik ? '#7b2fd0' : RENK.soluk });
  var bx = x + 40, by = y + 70;
  // pil
  ctx.fillStyle = koyu ? '#9aa0a6' : '#c7ccd1'; ctx.beginPath(); ctx.arc(bx + 20, by + 60, 26, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6b7178'; ctx.lineWidth = 2; ctx.stroke();
  yazi('CR2032', bx + 20, by + 56, { boy: 10, agirlik: 700, hiza: 'center', renk: '#222' }); yazi('3 V', bx + 20, by + 70, { boy: 10, hiza: 'center', renk: '#222' });
  // çip
  kutu(bx + 110, by + 30, 90, 66, { dolgu: '#1f2326', cizgi: '#000', r: 4 });
  for (var p = 0; p < 4; p++) { ctx.fillStyle = '#b8bcc0'; ctx.fillRect(bx + 120 + p * 20, by + 22, 8, 8); ctx.fillRect(bx + 120 + p * 20, by + 96, 8, 8); }
  yazi('ATtiny85', bx + 155, by + 58, { boy: 12, agirlik: 700, hiza: 'center', renk: '#e8e8e8' });
  yazi(uyanik ? 'çalışıyor' : 'uyku', bx + 155, by + 76, { boy: 10, hiza: 'center', renk: uyanik ? '#c77dff' : '#9aa' });
  // reed anahtarı
  var rx = bx + 250, ry = by + 30;
  ctx.fillStyle = koyu ? 'rgba(180,220,255,0.18)' : 'rgba(170,210,240,0.45)'; yuvarlakDortgen(rx, ry, 90, 22, 11); ctx.fill();
  ctx.strokeStyle = '#8aa'; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(rx - 8, ry + 11); ctx.lineTo(rx + 42, ry + 11);
  ctx.moveTo(rx + 98, ry + 11); ctx.lineTo(rx + 48, uyanik ? ry + 11 : ry + 5); ctx.stroke();
  yazi('Reed: ' + (uyanik ? 'kapalı' : 'açık'), rx + 45, ry - 10, { boy: 11, agirlik: 600, hiza: 'center', renk: uyanik ? '#7b2fd0' : RENK.soluk });
  // IR LED
  var lx = bx + 290, ly = by + 98;
  ctx.fillStyle = uyanik ? '#b15cff' : (koyu ? '#3a3046' : '#d9cfe6'); ctx.beginPath(); ctx.arc(lx, ly, 11, Math.PI, 0); ctx.lineTo(lx + 11, ly + 10); ctx.lineTo(lx - 11, ly + 10); ctx.fill();
  if (uyanik) for (var r = 0; r < 3; r++) { ctx.strokeStyle = 'rgba(177,92,255,' + (0.7 - r * 0.2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly, 18 + r * 8 + (simdi / 30) % 8, -2.6, -0.5); ctx.stroke(); }
  yazi('IR LED · 940 nm', lx, ly + 24, { boy: 11, hiza: 'center', renk: RENK.soluk });
  // bağlantılar
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 20, by + 34); ctx.lineTo(bx + 20, by + 10); ctx.lineTo(bx + 130, by + 10); ctx.lineTo(bx + 130, by + 22); ctx.stroke();
  ctx.strokeStyle = '#6a3fa0'; ctx.beginPath(); ctx.moveTo(bx + 200, by + 50); ctx.lineTo(rx - 8, ry + 11); ctx.stroke();
  ctx.strokeStyle = '#d68910'; ctx.beginPath(); ctx.moveTo(bx + 200, by + 80); ctx.lineTo(lx - 11, by + 80); ctx.lineTo(lx - 11, ly + 4); ctx.stroke();
  // NEC dalga biçimi
  var wx = x + 14, wy = y + 236, ww = w - 28;
  yazi('Kızılötesi NEC çerçevesi · etiket ' + no + ' = adres ' + (no >> 8) + ', komut ' + (no & 255), wx, wy - 18, { boy: 11.5, agirlik: 600 });
  var parcalar = necParcalari(no), top = 0; parcalar.forEach(function (q) { top += q[1]; });
  var ilerleme = uyanik ? ((simdi - kapi.etiketT0) % 460) / 460 : -1, xx = wx, birikmis = 0;
  ctx.lineWidth = 1.6; ctx.beginPath();
  parcalar.forEach(function (q) {
    var gw = q[1] / top * ww, yy = q[0] ? wy + 4 : wy + 34;
    ctx.lineTo(xx, yy); ctx.lineTo(xx + gw, yy); xx += gw; birikmis += q[1];
  });
  ctx.strokeStyle = koyu ? '#7f8a82' : '#9aa59c'; ctx.stroke();
  if (ilerleme >= 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(wx, wy - 2, ww * ilerleme, 42); ctx.clip();
    xx = wx; ctx.beginPath();
    parcalar.forEach(function (q) { var gw = q[1] / top * ww, yy = q[0] ? wy + 4 : wy + 34; ctx.lineTo(xx, yy); ctx.lineTo(xx + gw, yy); xx += gw; });
    ctx.strokeStyle = '#b15cff'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
  }
  yazi('9 ms başlangıç · 4,5 ms boşluk · 32 bit (adres, ~adres, komut, ~komut) · ≈68 ms', wx, wy + 56, { boy: 10.5, renk: RENK.soluk });
  yazi('Wokwi\'deki etiket devresinin aynısı: kapıda uyanır, 3 çerçeve yayar, uyur.', wx, wy + 74, { boy: 10.5, renk: RENK.soluk });
}
function necParcalari(no) {
  var b = [no >> 8, (~(no >> 8)) & 255, no & 255, (~no) & 255], q = [[1, 9000], [0, 4500]];
  b.forEach(function (bayt) { for (var i = 0; i < 8; i++) { q.push([1, 560]); q.push([0, (bayt >> i) & 1 ? 1690 : 560]); } });
  q.push([1, 560]); q.push([0, 2000]);
  return q;
}
function lcdCiz(x, y, l1, l2, w) {
  kutu(x - 8, y - 8, w + 16, 66, { dolgu: '#24452a', cizgi: '#18301c', r: 6 });
  ctx.fillStyle = '#8fb339'; ctx.fillRect(x, y, w, 50);
  yazi((l1 + '                ').slice(0, 16), x + 8, y + 14, { boy: 16, aile: 'IBM Plex Mono, monospace', renk: '#1b2a0a', agirlik: 500 });
  yazi((l2 + '                ').slice(0, 16), x + 8, y + 37, { boy: 16, aile: 'IBM Plex Mono, monospace', renk: '#1b2a0a', agirlik: 500 });
}
// Ağıl kapısı okuyucusu (ESP32, LCD, IR alıcı, iki bariyer, LED'ler, buzzer, güç)
function okuyucuDevresi(x, y, w, h) {
  kutu(x, y, w, h, { dolgu: RENK.kutu, cizgi: RENK.kutuCizgi });
  yazi('Ağıl kapısı okuyucusu · ESP32', x + 14, y + 20, { boy: 14, agirlik: 700, aile: 'Space Grotesk, Inter, sans-serif' });
  var ex = x + 170, ey = y + 112;
  // kart
  kutu(ex, ey, 100, 150, { dolgu: '#1d1f24', cizgi: '#000', r: 6 });
  ctx.fillStyle = '#c9a227'; ctx.fillRect(ex + 30, ey - 14, 40, 18);
  yazi('ESP32', ex + 50, ey + 30, { boy: 14, agirlik: 700, hiza: 'center', renk: '#e8e8e8' });
  yazi('Wi-Fi · MQTT', ex + 50, ey + 50, { boy: 10, hiza: 'center', renk: '#9aa' });
  for (var p = 0; p < 9; p++) { ctx.fillStyle = '#b8bcc0'; ctx.fillRect(ex - 6, ey + 14 + p * 15, 6, 5); ctx.fillRect(ex + 100, ey + 14 + p * 15, 6, 5); }
  // LCD
  lcdCiz(x + 150, y + 42, kapi.l1, kapi.l2, 200);
  // bariyer girişleri
  var disA = simdi - kapi.disKesik < 700, icA = simdi - kapi.icKesik < 700, irA = simdi - kapi.irAn < 900;
  function giris(gx, gy, ad, aktif, renk, pinY) {
    kutu(gx, gy, 108, 30, { dolgu: aktif ? renk : (koyu ? '#262c27' : '#f4f6f0'), cizgi: aktif ? renk : RENK.kutuCizgi, r: 6 });
    yazi(ad, gx + 54, gy + 15, { boy: 11.5, agirlik: 600, hiza: 'center', renk: aktif ? '#1b1b1b' : RENK.yazi });
    ctx.strokeStyle = aktif ? renk : (koyu ? '#555' : '#aab'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gx + 108, gy + 15); ctx.lineTo(ex - 6, pinY); ctx.stroke();
  }
  giris(x + 18, y + 122, '1. Dış bariyer', disA, '#ffd23f', ey + 20);
  giris(x + 18, y + 162, '3. IR alıcı', irA, '#c77dff', ey + 50);
  giris(x + 18, y + 202, '4. İç bariyer', icA, '#ffd23f', ey + 80);
  // LED'ler ve buzzer
  var yesil = simdi - kapi.yesil < 500, bip = simdi - kapi.bip < 500;
  function led(lx, ly, renk, acik, ad) {
    ctx.fillStyle = acik ? renk : (koyu ? '#333' : '#ddd'); if (acik) { ctx.shadowColor = renk; ctx.shadowBlur = 16; }
    ctx.beginPath(); ctx.arc(lx, ly, 10, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    yazi(ad, lx + 18, ly, { boy: 11.5, renk: RENK.soluk });
    ctx.strokeStyle = koyu ? '#555' : '#aab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + 106, ly); ctx.lineTo(lx - 10, ly); ctx.stroke();
  }
  led(x + 320, y + 140, '#2fb344', yesil, 'Kayıt');
  led(x + 320, y + 176, '#e03a2e', kapi.kirmizi, 'Uyarı');
  ctx.fillStyle = '#1d1f24'; ctx.beginPath(); ctx.arc(x + 320, y + 214, 11, 0, 7); ctx.fill();
  if (bip) for (var r = 0; r < 3; r++) { ctx.strokeStyle = 'rgba(80,80,80,' + (0.8 - r * 0.25) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + 320, y + 214, 15 + r * 6, -0.7, 0.7); ctx.stroke(); }
  yazi('Buzzer', x + 338, y + 214, { boy: 11.5, renk: RENK.soluk });
  ctx.strokeStyle = koyu ? '#555' : '#aab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + 106, y + 214); ctx.lineTo(x + 309, y + 214); ctx.stroke();
  // güç
  ctx.fillStyle = '#c0392b'; ctx.fillRect(ex + 46, ey + 150, 8, 12);
  yazi('5 V · ağıldaki enerji birimi (güneş paneli + akü)', ex + 50, ey + 172, { boy: 11, hiza: 'center', renk: RENK.soluk });
  yazi('Bağlantı yoksa kayıtlar sıra numarasıyla bekler, gelince sırayla gider.', x + 14, y + h - 16, { boy: 10.5, renk: RENK.soluk });
}
function mqttPaneli(x, y, w, h) {
  kutu(x, y, w, h, { dolgu: koyu ? '#0d110e' : '#10140f', cizgi: '#2a332c' });
  yazi('Sis düğümüne giden iletiler', x + 12, y + 20, { boy: 13, agirlik: 700, renk: '#e5ece6', aile: 'Space Grotesk, Inter, sans-serif' });
  rozet(6, x + w - 20, y + 20, '#7fb7e6');
  yazi('yerel MQTT · bis505-suru/agil1/…', x + 12, y + 38, { boy: 10.5, renk: '#8fa08f', aile: 'IBM Plex Mono, monospace' });
  var m = kapi.msj.slice(-5).reverse(), yy = y + 60;
  m.forEach(function (q) {
    if (yy > y + h - 60) return;
    yazi(q.k === 'sayim' ? 'bis505-suru/agil1/sayim' : 'bis505-suru/agil1/kapi', x + 12, yy, { boy: 10, renk: q.k === 'sayim' ? '#f0b46a' : '#7fb7e6', aile: 'IBM Plex Mono, monospace' });
    var parca = q.txt.split(','), satir = '', sat = [];
    parca.forEach(function (p, k) { var ek = p + (k < parca.length - 1 ? ',' : ''); if ((satir + ek).length > 36) { sat.push(satir); satir = ek; } else satir += ek; });
    sat.push(satir);
    sat.slice(0, 2).forEach(function (s, k) { yazi(s, x + 12, yy + 13 + k * 12, { boy: 10, renk: '#cfe3c8', aile: 'IBM Plex Mono, monospace' }); });
    yy += 13 + Math.min(2, sat.length) * 12 + 9;
  });
  if (!m.length) yazi('Henüz kapı geçişi yok', x + 12, y + 70, { boy: 11, renk: '#8fa08f' });
  yazi('Bugün çıkış ' + kapi.cikis + ' · giriş ' + kapi.giris, x + 12, y + h - 34, { boy: 11.5, renk: '#e5ece6', agirlik: 600 });
  yazi(kapi.sonSayim ? 'Son sayım ' + kapi.sonSayim : 'Akşam sayımı henüz yok', x + 12, y + h - 15, { boy: 10.5, renk: '#8fa08f' });
}
