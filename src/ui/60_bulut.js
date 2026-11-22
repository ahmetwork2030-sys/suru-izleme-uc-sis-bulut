// ---------- sahne 5: bulut ----------
var BULUT_KUTU = [
  { k: 'gw',   x: 250, y: 110, w: 180, h: 80, ad: 'Cihaz ağ geçidi', alt: 'MQTT · TLS · cihaz sertifikası' },
  { k: 'kuy',  x: 470, y: 110, w: 170, h: 80, ad: 'Mesaj kuyruğu', alt: 'akşam yükünü tamponlar' },
  { k: 'akis', x: 680, y: 110, w: 170, h: 80, ad: 'Akış işleme', alt: 'tekrar eleme · kural · alarm' },
  { k: 'bild', x: 680, y: 300, w: 170, h: 80, ad: 'Bildirim servisi', alt: 'kayda göre: çoban + sahip' },
  { k: 'api',  x: 470, y: 470, w: 170, h: 80, ad: 'API + yük dengeleyici', alt: 'WAF · HTTPS · kimlik' },
  { k: 'kons', x: 900, y: 300, w: 170, h: 80, ad: 'Konsolidasyon', alt: 'zamanlanmış · özetle ve taşı' },
  { k: 'prof', x: 250, y: 300, w: 180, h: 80, ad: 'Cihaz ve profil yönetimi', alt: 'hayvan kaydı · küpe · sahip' },
  { k: 'iam',  x: 250, y: 470, w: 180, h: 80, ad: 'Kimlik ve erişim (IAM)', alt: 'rol ve sahiplik bazlı' },
  { k: 'dr',   x: 20,  y: 300, w: 200, h: 80, ad: 'İzleme · log · DR', alt: 'tüm bileşenleri kapsar' }
];
var BULUT_YOL = {
  K: [[20, 128], [250, 134], [470, 150], [680, 150], [960, 150]],
  S: [[20, 152], [250, 150], [470, 150], [680, 150], [960, 150]],
  U: [[20, 176], [250, 166], [470, 150], [680, 150], [960, 150]]
};
var bulutGoster = { K: true, S: false, U: true };
function silindir(x, y, w, h, dolu, renk, ad, alt) {
  var e = 12;
  ctx.fillStyle = RENK.kutu; ctx.strokeStyle = RENK.kutuCizgi; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x + w / 2, y + h, w / 2, e, 0, 0, Math.PI); ctx.lineTo(x, y); ctx.ellipse(x + w / 2, y, w / 2, e, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill(); ctx.stroke();
  var dh = (h - 6) * kisit(dolu, 0, 1);
  if (dh > 1) {
    ctx.fillStyle = renk; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h, w / 2 - 3, e - 2, 0, 0, Math.PI); ctx.lineTo(x + 3, y + h - dh); ctx.ellipse(x + w / 2, y + h - dh, w / 2 - 3, e - 2, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = RENK.kutuCizgi; ctx.beginPath(); ctx.ellipse(x + w / 2, y, w / 2, e, 0, 0, Math.PI * 2); ctx.stroke();
  yazi(ad, x + w / 2, y + h + 26, { boy: 13, agirlik: 700, hiza: 'center', aile: 'Space Grotesk, Inter, sans-serif' });
  yazi(alt, x + w / 2, y + h + 44, { boy: 11, hiza: 'center', renk: RENK.soluk });
}
function kisiCiz(x, y, renk, ad, alt) {
  ctx.fillStyle = renk; ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = renk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.stroke();
  ctx.fillStyle = renk; ctx.beginPath(); ctx.arc(x, y - 9, 8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + 12, 13, 9, 0, Math.PI, 0); ctx.fill();
  yazi(ad, x, y + 50, { boy: 12.5, agirlik: 700, hiza: 'center' }); yazi(alt, x, y + 66, { boy: 10.5, hiza: 'center', renk: RENK.soluk });
}
function sahneBulut() {
  var st = sim.state(), ST = st.ST;
  ctx.fillStyle = koyu ? '#10161c' : '#f1f5fa'; ctx.fillRect(0, 0, LW, LH);
  yazi('Bulut · yönetilen servisler (PaaS + serverless) · çoklu AZ', 250, 40, { boy: 19, agirlik: 700, aile: 'Space Grotesk, Inter, sans-serif' });
  yazi('Köyden gelen trafik soldan girer. Üç yöntem aynı sürüyü izler; çizgilerin yoğunluğu buluta giden mesaj sayısıdır.', 250, 66, { boy: 12.5, renk: RENK.soluk });
  // gelen hatlar
  var ad = { K: 'Klasik', S: 'Sis + anlık', U: 'Uyuyan Bulut' }, renk = { K: RENK.k, S: RENK.s, U: RENK.u };
  STR.forEach(function (s, i) {
    if (!bulutGoster[s]) return;
    var y = BULUT_YOL[s][0][1];
    ctx.strokeStyle = renk[s]; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(250, BULUT_YOL[s][1][1]); ctx.stroke(); ctx.globalAlpha = 1;
    yazi(ad[s], 24, y - 11, { boy: 11.5, agirlik: 700, renk: renk[s] });
  });
  ctx.strokeStyle = koyu ? '#2e3a46' : '#cfd9e6'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(430, 150); ctx.lineTo(470, 150); ctx.moveTo(640, 150); ctx.lineTo(680, 150); ctx.moveTo(850, 150); ctx.lineTo(960, 150);
  ctx.moveTo(765, 190); ctx.lineTo(765, 300); ctx.moveTo(1010, 190); ctx.lineTo(1010, 300); ctx.moveTo(985, 380); ctx.lineTo(985, 450);
  ctx.moveTo(555, 550); ctx.lineTo(555, 610); ctx.moveTo(765, 380); ctx.lineTo(765, 418); ctx.lineTo(110, 418); ctx.lineTo(110, 604); ctx.moveTo(765, 418); ctx.lineTo(765, 604); ctx.moveTo(555, 470); ctx.lineTo(555, 250); ctx.lineTo(1010, 250);
  ctx.moveTo(430, 510); ctx.lineTo(470, 510); ctx.moveTo(520, 470); ctx.lineTo(520, 340); ctx.lineTo(430, 340); ctx.moveTo(340, 300); ctx.lineTo(340, 190); ctx.stroke();
  BULUT_KUTU.forEach(function (b) {
    if (b.k === 'dr') { ctx.setLineDash([6, 4]); kutu(b.x, b.y, b.w, b.h, { dolgu: RENK.kutu, cizgi: RENK.kutuCizgi, kalin: 1.5 }); ctx.setLineDash([]); }
    else kutu(b.x, b.y, b.w, b.h, { dolgu: RENK.kutu, cizgi: RENK.kutuCizgi, kalin: 1.5 });
    yazi(b.ad, b.x + 14, b.y + 26, { boy: 14, agirlik: 700, aile: 'Space Grotesk, Inter, sans-serif' });
    yazi(b.alt, b.x + 14, b.y + 50, { boy: 11, renk: RENK.soluk });
  });
  // depolar
  var depoMax = Math.max(1, ST.K.store, ST.U.store);
  silindir(960, 110, 100, 80, 0, RENK.bulut, 'Sıcak depolama', 'zaman serisi · 30 gün');
  var dk = ST.K.store / depoMax, du = ST.U.store / depoMax;
  silindir(900, 450, 80, 110, dk, RENK.k, 'Klasik', sayi(ST.K.store / 1e6, 2) + ' MB');
  silindir(1010, 450, 80, 110, du, RENK.u, 'Uyuyan Bulut', sayi(ST.U.store / 1e6, 2) + ' MB');
  yazi('Soğuk depolama (arşiv)', 995, 420, { boy: 12.5, agirlik: 700, hiza: 'center' });
  // kullanıcılar
  kisiCiz(110, 640, RENK.onder, 'Çoban', 'mobil · çevrimdışı');
  kisiCiz(330, 640, RENK.lora, 'Veteriner', 'sağlık kayıtları');
  kisiCiz(555, 640, RENK.sis, 'Kooperatif', 'yönetim paneli');
  kisiCiz(765, 640, RENK.s, 'Mal sahibi', 'kendi hayvanları');
  ctx.strokeStyle = koyu ? '#2e3a46' : '#cfd9e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(470, 520); ctx.lineTo(110, 600); ctx.moveTo(470, 520); ctx.lineTo(330, 600); ctx.moveTo(640, 520); ctx.lineTo(765, 600); ctx.stroke();
  // bildirim servisi alıcıyı hayvan kaydından bulur (etiket -> küpe -> mal sahibi)
  ctx.strokeStyle = RENK.alarm; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(430, 318); ctx.lineTo(680, 318); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  yazi('hayvan kimin?', 600, 308, { boy: 10.5, renk: RENK.alarm, hiza: 'center' });
  if (bildirimGecmis.length) {
    var sb = bildirimGecmis[0];
    yazi('Son bildirim: ' + sb.alici.toLocaleLowerCase('tr-TR') + ' ' + sb.kisi + ' · ' + sb.kanal, 754, 401, { boy: 10.5, hiza: 'right', renk: RENK.soluk });
  }
  paketleriCiz('bulut', function (p) { return p; });
  // mimarideki ok numaraları
  rozet(11, 150, 182, RENK.alarm); rozet(12, 176, 182, RENK.u); rozet(13, 450, 136, RENK.yazi); rozet(14, 778, 400, RENK.alarm); rozet(15, 1030, 276, RENK.yazi); rozet(16, 540, 584, RENK.yazi);
  yazi('acil · özet', 196, 182, { boy: 10.5, renk: RENK.soluk });
  // karşılaştırma tablosu
  var x = 850, y = 614;
  kutu(x, y, 336, 130, { dolgu: RENK.etiket, cizgi: RENK.etiketCizgi });
  yazi('Başlangıçtan bu yana', x + 12, y + 16, { boy: 12.5, agirlik: 700, aile: 'Space Grotesk, Inter, sans-serif' });
  var kol = [['Mesaj', 'msgs', 1, 0], ['Veri KB', 'bytes', 1024, 0], ['Modem dk', 'modemMin', 1, 0]];
  kol.forEach(function (c, j) { yazi(c[0], x + 172 + j * 78, y + 34, { boy: 10.5, renk: RENK.soluk, hiza: 'right' }); });
  STR.forEach(function (s, i) {
    var yy = y + 52 + i * 20, S = ST[s];
    ctx.fillStyle = renk[s]; ctx.beginPath(); ctx.arc(x + 18, yy, 4.5, 0, 7); ctx.fill();
    yazi(ad[s], x + 28, yy, { boy: 11.5, agirlik: 600 });
    kol.forEach(function (c, j) { yazi(sayi(S[c[1]] / c[2], c[3]), x + 172 + j * 78, yy, { boy: 11.5, hiza: 'right', aile: 'IBM Plex Mono, monospace' }); });
  });
  var oran = ST.K.msgs ? 1 - ST.U.msgs / ST.K.msgs : 0;
  yazi('Uyuyan Bulut %' + sayi(oran * 100, 1) + ' daha az mesaj gönderdi', x + 12, y + 116, { boy: 11.5, agirlik: 600, renk: RENK.u });
}
