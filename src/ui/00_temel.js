/* Sürü İzleme Simülatörü — görsel arayüz (bölümler build.js ile sırayla birleştirilir)
 * BIS505 Dönem Projesi · Ahmet ATAGÜL
 * Bütün sahneler 1200 x 750 mantıksal birimde çizilir; tuval genişliğine göre ölçeklenir.
 */
(function () {
'use strict';
var Sim = window.SuruSim, WD = Sim.WORLD, STR = Sim.STRATS;
function $(id) { return document.getElementById(id); }
var LW = 1200, LH = 750;                     // mantıksal sahne boyutu
var profil = 'P2', tohum = 11, sim = null, hiz = 60, birikim = 0, oynuyor = true, sahne = 'kus';
var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var cv = $('cv'), ctx = cv.getContext('2d'), olcek = 1, simdi = 0;
var koyu = false;

function temaOku() {
  var t = document.documentElement.getAttribute('data-theme');
  koyu = t === 'dark' || (t !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function boyutla() {
  var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 900;
  cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * LH / LW);
  olcek = cv.width / LW;
}

// ---------- küçük yardımcılar ----------
function kisit(v, a, b) { return v < a ? a : v > b ? b : v; }
function karis(a, b, k) { return a + (b - a) * k; }
function uzak(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function sayi(v, d) { return (+v).toLocaleString('tr-TR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
function mesafe(m) { return m >= 1000 ? sayi(m / 1000, 1) + ' km' : Math.round(m) + ' m'; }
function sure(dk) {
  if (dk === null || dk === undefined) return '—';
  dk = Math.round(dk);
  if (dk < 60) return dk + ' dk';
  var g = Math.floor(dk / 1440), s = Math.floor((dk % 1440) / 60), m = dk % 60;
  if (g > 0) return g + ' gün ' + s + ' sa';
  return s + ' sa' + (m ? ' ' + m + ' dk' : '');
}
function saat(t) { return Sim.hhmm(t); }
function gunSaat(t) { return 'Gün ' + (Math.floor(t / 1440) + 1) + ' · ' + Sim.hhmm(t); }
function hash(a, b) {                        // iki tamsayıdan 0..1 arası kararlı sayı
  var h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function hayvanAdi(i) { return sim.animalName(i); }
function etiketNo(i) { return 1000 + i; }

// Gün ışığı: 0 gündüz, 1 tam gece
function gecelik(t) {
  var m = ((t % 1440) + 1440) % 1440;
  if (m >= 420 && m <= 1080) return 0;
  if (m > 1080 && m < 1230) return (m - 1080) / 150;
  if (m >= 330 && m < 420) return 1 - (m - 330) / 90;
  return 1;
}

// ---------- çizim yardımcıları ----------
function yuvarlakDortgen(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function yazi(txt, x, y, o) {
  o = o || {};
  ctx.font = (o.agirlik || 500) + ' ' + (o.boy || 13) + 'px ' + (o.aile || 'Inter, system-ui, sans-serif');
  ctx.textAlign = o.hiza || 'left'; ctx.textBaseline = o.taban || 'middle';
  if (o.zemin) {
    var w = ctx.measureText(txt).width, b = o.boy || 13, px = 6;
    var x0 = o.hiza === 'center' ? x - w / 2 : o.hiza === 'right' ? x - w : x;
    ctx.fillStyle = o.zemin; yuvarlakDortgen(x0 - px, y - b * 0.75, w + px * 2, b * 1.5, 5); ctx.fill();
    if (o.cizgi) { ctx.strokeStyle = o.cizgi; ctx.lineWidth = 1; ctx.stroke(); }
  }
  if (o.golge) { ctx.lineWidth = 3; ctx.strokeStyle = o.golge; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); }
  ctx.fillStyle = o.renk || RENK.yazi; ctx.fillText(txt, x, y);
}
function kutu(x, y, w, h, o) {
  o = o || {};
  yuvarlakDortgen(x, y, w, h, o.r === undefined ? 10 : o.r);
  ctx.fillStyle = o.dolgu || RENK.kutu; ctx.fill();
  ctx.lineWidth = o.kalin || 1.2; ctx.strokeStyle = o.cizgi || RENK.kutuCizgi; ctx.stroke();
}
function ok(x1, y1, x2, y2, renk, kalin, kesik) {
  ctx.strokeStyle = renk; ctx.lineWidth = kalin || 1.5; ctx.setLineDash(kesik || []);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  var a = Math.atan2(y2 - y1, x2 - x1), s = 7 + (kalin || 1.5);
  ctx.fillStyle = renk; ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - s * Math.cos(a - 0.4), y2 - s * Math.sin(a - 0.4));
  ctx.lineTo(x2 - s * Math.cos(a + 0.4), y2 - s * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
}

// Mimarideki ok numarası (① … ⑰) rozeti
var DAIRE = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰'];
function rozet(n, x, y, renk) {
  ctx.fillStyle = RENK.kutu; ctx.strokeStyle = renk || RENK.yazi; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); ctx.stroke();
  yazi(String(n), x, y + 0.5, { boy: 11, agirlik: 700, hiza: 'center', renk: renk || RENK.yazi });
}
// Renkler (aydınlık / karanlık tema)
var RENK = {};
function renkleriKur() {
  temaOku();
  RENK = koyu ? {
    yazi: '#e6ede7', soluk: '#9faea2', kutu: '#1d2820', kutuCizgi: '#3b4a3f', zemin: '#141b16',
    etiket: 'rgba(20,27,22,0.86)', etiketCizgi: '#3b4a3f', lora: '#6aa8ec', led: '#d9d4c3', onder: '#f0a347',
    alarm: '#f08a5d', ok: '#7cc77f', sis: '#5fc3a6', bulut: '#8ab6ea', mobil: '#e8b04a', paket: '#9fd3ff',
    yasak: '#f08a5d', yol: 'rgba(214,190,140,0.55)', duvar: '#8d8a80', cati: '#9a4a35', gece: 'rgba(4,10,24,', k: '#9fb2c6', u: '#5fc3a6', s: '#e3a35a'
  } : {
    yazi: '#1b261e', soluk: '#5a675c', kutu: '#ffffff', kutuCizgi: '#c9d2c1', zemin: '#f4f6f0',
    etiket: 'rgba(255,255,255,0.9)', etiketCizgi: '#c9d2c1', lora: '#2563a8', led: '#f6f3ea', onder: '#c26b0c',
    alarm: '#c2410c', ok: '#2f7d32', sis: '#1f6f5c', bulut: '#2563a8', mobil: '#b7791f', paket: '#2b7bd3',
    yasak: '#c2410c', yol: 'rgba(160,124,72,0.55)', duvar: '#9b968a', cati: '#b5523b', gece: 'rgba(8,16,40,', k: '#55677a', u: '#1f6f5c', s: '#a8641a'
  };
}

// ---------- simülasyon ve olaylar ----------
var gelen = [];                    // motorun son karede yaydığı olaylar
function yayin(e) { gelen.push(e); }
var sonOkuma = {};                 // cihaz -> { t (ms), sabit, mobil, role }
var paketler = [];                 // { yer: 'dunya'|'koy'|'bulut', yol: [[x,y]...], t0, sure, renk, r, iz }
var bildirimler = [];              // ekrandaki kısa bildirimler { txt, t0, renk }
var tamponHam = 0, tamponGun = -1; // Uyuyan Bulut: sis düğümünde bekleyen ham kayıt (gece özetlenir)
var ozetAni = -1e9;                // son gece özetinin ekran zamanı
var izlenenMsg = { K: 0, S: 0, U: 0 }, izlenenAlarm = { K: 0, S: 0, U: 0 };
var sonKapiOlay = null, bildirilen = {}, sonKoyPaket = 0, oncekiMob = { buf: 0, acil: 0 };
// Hayvan kaydı ve bildirim servisi (⑭): src/kayit.js; Node-RED'deki bulut sekmesiyle aynı kayıt
var KAYIT = window.SuruKayit ? window.SuruKayit.kur(500) : null;
var bildirimGecmis = [], bildirimSay = { push: 0, SMS: 0 }, izlenenBulut = {};
function sahipAdi(dev) { var o = KAYIT && window.SuruKayit.sahibi(KAYIT, 1000 + dev); return o ? o.ad : ''; }
function kupeNo(dev) { var h = KAYIT && window.SuruKayit.hayvan(KAYIT, 1000 + dev); return h ? h.kupe : ''; }
// Olay buluta ulaşınca bildirim servisi kayda bakar: çobana push, mal sahibine kendi seçtiği kanaldan
function bulutBildirimi(a, t, gorsel) {
  if (!KAYIT) return;
  var bs = window.SuruKayit.bildirimler(KAYIT, { tur: a.tur, etiketler: [1000 + a.dev] });
  bs.forEach(function (b) {
    bildirimSay[b.kanal] = (bildirimSay[b.kanal] || 0) + 1;
    bildirimGecmis.unshift({ t: t, alici: b.alici, kisi: b.kisi, kanal: b.kanal, mesaj: b.mesaj, gecikme: t - a.tDet });
  });
  if (bildirimGecmis.length > 40) bildirimGecmis.length = 40;
  if (!gorsel) return;
  var ms = bs.filter(function (b) { return b.alici === 'Mal sahibi'; })[0];
  paketEkle('bulut', [[765, 380], [765, 418], [110, 418], [110, 604]], RENK.alarm, 2200, 5);
  if (ms) {
    paketEkle('bulut', [[765, 380], [765, 604]], ms.kanal === 'SMS' ? RENK.s : RENK.bulut, 2200, 5);
    bildir('⑭ Mal sahibi ' + ms.kisi + ' (' + ms.kanal + '): ' + Sim.TUR_AD[a.tur].toLocaleLowerCase('tr-TR') + ' · ' + (1000 + a.dev) + (t - a.tDet > 30 ? ' · olaydan ' + sure(t - a.tDet) + ' sonra' : ''), ms.kanal === 'SMS' ? RENK.s : RENK.bulut);
  }
}

function paketEkle(yer, yol, renk, sureMs, r) {
  if (paketler.length > 260) return;
  paketler.push({ yer: yer, yol: yol, t0: simdi, sure: sureMs || 1300, renk: renk, r: r || 3 });
}
function bildir(txt, renk) {
  bildirimler.push({ txt: txt, t0: simdi, renk: renk || RENK.alarm });
  if (bildirimler.length > 2) bildirimler.shift();
}
function yolNokta(yol, k) {                  // çok parçalı yolda k (0..1) konumu
  if (yol.length === 2) return [karis(yol[0][0], yol[1][0], k), karis(yol[0][1], yol[1][1], k)];
  var top = 0, uz = [];
  for (var i = 1; i < yol.length; i++) { var d = uzak(yol[i - 1][0], yol[i - 1][1], yol[i][0], yol[i][1]); uz.push(d); top += d; }
  var hedef = k * top;
  for (i = 1; i < yol.length; i++) {
    if (hedef <= uz[i - 1] || i === yol.length - 1) {
      var kk = uz[i - 1] ? kisit(hedef / uz[i - 1], 0, 1) : 1;
      return [karis(yol[i - 1][0], yol[i][0], kk), karis(yol[i - 1][1], yol[i][1], kk)];
    }
    hedef -= uz[i - 1];
  }
  return yol[yol.length - 1];
}

// Kare başında motor olaylarını işle
function olaylariIsle() {
  var st = sim.state(), okumaSay = 0;
  var gun = Math.floor(st.t / 1440);
  for (var k = 0; k < gelen.length; k++) {
    var e = gelen[k];
    if (e.tur === 'okuma') {
      sonOkuma[e.dev] = { t: simdi, sabit: e.sabit, mobil: e.mobil, role: e.role };
      if (e.sabit) tamponHam++;
      if (++okumaSay > 30) continue;             // hızlı oynatmada ekranı boğmasın
      var yol;
      if (e.sabit) {
        yol = e.role ? [[e.x, e.y], [st.x[e.grp], st.y[e.grp]], [WD.agil.x, WD.agil.y]] : [[e.x, e.y], [WD.agil.x, WD.agil.y]];
        paketEkle('dunya', yol, RENK.lora, 1500, 2.6);
        if (simdi - sonKoyPaket > 260) { sonKoyPaket = simdi; paketEkle('koy', KOY_YOL.lora, RENK.lora, 2600, 4); }
      }
      if (e.mobil) paketEkle('dunya', [[e.x, e.y], [st.coban.x, st.coban.y]], RENK.mobil, 1100, 2.4);
    } else if (e.tur === 'kapi' || e.tur === 'sayim') {
      kapiOlay(e);
    }
  }
  gelen.length = 0;
  // gece özeti (02:00): ham kayıtlar özetlenir
  var m = st.t % 1440;
  if (m >= st.P.ozetSaat && tamponGun !== gun) {
    tamponGun = gun; ozetAni = simdi; tamponHam = 0;
    paketEkle('koy', KOY_YOL.ozet, RENK.sis, 2400, 6);
  }
  // buluta giden mesajlar
  STR.forEach(function (s) {
    var S = st.ST[s], d = S.msgs - izlenenMsg[s];
    if (d > 0) {
      var n = Math.min(d, s === 'U' ? 6 : 14);
      for (var q = 0; q < n; q++) {
        if (s === 'U') { paketEkle('koy', KOY_YOL.wan, RENK.u, 1800 + q * 120, 4.5); paketEkle('dunyaWan', DUNYA_WAN(), RENK.u, 1700 + q * 120, 3.2); }
        if (bulutGoster[s]) paketEkle('bulut', BULUT_YOL[s], s === 'K' ? RENK.k : s === 'S' ? RENK.s : RENK.u, 2600 + q * 90, s === 'U' ? 5 : 3.2);
      }
    }
    izlenenMsg[s] = S.msgs;
  });
  // mobil sis akışları: ⑤ akşam ağılda sabit sise aktarım, ④ telefon çekince acil olayın buluta gitmesi
  var Um = st.ST.U, mb = Um.mobBuf.length, ma = (Um.mobAcil || []).length;
  if (mb < oncekiMob.buf) { paketEkle('koy', KOY_YOL.senkron, RENK.mobil, 2400, 5); bildir('⑤ Çobanın telefonu ağılda: sahada biriken ' + (oncekiMob.buf - mb) + ' kayıt sabit sise aktarıldı', RENK.mobil); }
  if (ma < oncekiMob.acil && mb >= oncekiMob.buf) paketEkle('koy', KOY_YOL.telefon, RENK.alarm, 2600, 5);
  oncekiMob.buf = mb; oncekiMob.acil = ma;
  // yeni alarm teslimleri (Uyuyan Bulut stratejisinde çobana ulaşan)
  var U = st.ST.U, teslim = 0;
  U.alarms.forEach(function (a) { if (a.tDel !== null) teslim++; });
  if (teslim > izlenenAlarm.U) {
    var yeni = U.alarms.filter(function (a) { return a.tDel !== null; }).slice(izlenenAlarm.U);
    yeni.slice(-3).forEach(function (a) {
      var an = a.dev + '|' + a.tur + '|' + a.gun; if (bildirilen[an]) return; bildirilen[an] = true;
      bildir('Çobanın telefonuna alarm: ' + hayvanAdi(a.dev) + ' · ' + Sim.TUR_AD[a.tur] + ' · gecikme ' + sure(a.tDel - a.tDet), RENK.alarm);
      paketEkle('koy', KOY_YOL.alarm, RENK.alarm, 1600, 5);
    });
  }
  izlenenAlarm.U = teslim;
  // ⑭ olay buluta ulaştığında mal sahibine bildirim (P3'te çoban anında, mal sahibi internet gelince öğrenir)
  U.alarms.forEach(function (a) {
    if (a.tBulut === null || a.tBulut === undefined) return;
    var an = a.dev + '|' + a.tur + '|' + a.gun; if (izlenenBulut[an]) return; izlenenBulut[an] = true;
    bulutBildirimi(a, a.tBulut, true);
  });
}
