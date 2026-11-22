// ---------- sahne 4: köy · sabit sis düğümü ----------
var KOY_KUTU = {
  gw:    { x: 36, y: 118, w: 210, h: 72, ad: 'LoRa ağ geçidi', alt: 'tasma ve LoRa etiketlerinden ①' },
  kapi:  { x: 36, y: 300, w: 210, h: 72, ad: 'Ağıl kapısı okuyucusu', alt: 'LED etiketleri ② → ⑥' },
  coban: { x: 36, y: 560, w: 210, h: 72, ad: 'Çoban · mobil sis', alt: 'cep ağ geçidi ③ uygulama' },
  ns:    { x: 296, y: 118, w: 220, h: 72, ad: 'LoRaWAN ağ sunucusu', alt: 'şifre çözme · tekrar eleme' },
  mqtt:  { x: 296, y: 300, w: 220, h: 72, ad: 'Yerel MQTT broker', alt: 'yerel veri toplama' },
  kural: { x: 556, y: 300, w: 220, h: 72, ad: 'Kural motoru', alt: 'kopma · hareketsizlik · yasak · eksik' },
  tampon:{ x: 556, y: 482, w: 220, h: 118, ad: 'Tampon', alt: 'ham kayıtlar burada bekler' },
  ozet:  { x: 806, y: 482, w: 170, h: 118, ad: 'Özetleme', alt: 'gece 02:00 · 3 kat sıkıştırma' },
  bag:   { x: 1006, y: 300, w: 170, h: 96, ad: 'Bağlantı yöneticisi', alt: 'öncelik · tekrar · sıra no' },
  enerji:{ x: 296, y: 482, w: 220, h: 150, ad: 'Enerji birimi', alt: 'güneş paneli + akü (temsili)' }
};
var ONEM = { x: 890, y: 336 };
var KOY_YOL = {
  lora:  [[246, 154], [296, 154], [406, 190], [406, 300], [516, 336], [556, 336], [776, 336], [ONEM.x - 40, 336], [ONEM.x, 376], [666, 440], [666, 482]],
  kapi:  [[246, 336], [296, 336], [516, 336], [556, 336], [776, 336], [ONEM.x - 40, 336], [ONEM.x, 376], [666, 440], [666, 482]],
  ozet:  [[776, 540], [806, 540], [976, 540], [1091, 470], [1091, 396]],
  wan:   [[1091, 300], [1091, 176]],
  alarm: [[ONEM.x, 296], [ONEM.x, 96], [141, 96], [141, 154], [18, 154], [18, 596], [36, 596]],
  senkron: [[246, 615], [270, 615], [270, 662], [536, 662], [536, 560], [556, 560]],
  telefon: [[141, 632], [141, 742], [1192, 742], [1192, 140], [1132, 140]]
};
function sahneKoy() {
  var st = sim.state(), U = st.ST.U, gece = gecelik(st.t), m = st.t % 1440;
  ctx.fillStyle = koyu ? '#121813' : '#f2f4ee'; ctx.fillRect(0, 0, LW, LH);
  // arka plan: köy silueti
  ctx.fillStyle = koyu ? '#18211b' : '#e6ebdf';
  for (var i = 0; i < 9; i++) { var hx = 40 + i * 132, hy = 80; ctx.fillRect(hx, hy - 30, 90, 30); ctx.beginPath(); ctx.moveTo(hx - 8, hy - 30); ctx.lineTo(hx + 45, hy - 56); ctx.lineTo(hx + 98, hy - 30); ctx.fill(); }
  yazi('Köy · sabit sis düğümü', 36, 40, { boy: 20, agirlik: 700, aile: 'Space Grotesk, Inter, sans-serif' });
  yazi('Mandıradaki küçük bilgisayar: veriyi yerelde işler, acil olanı hemen gönderir, gerisini gece özetler (Uyuyan Bulut).', 36, 66, { boy: 13, renk: RENK.soluk });
  // bağlantı çizgileri
  ctx.lineCap = 'round';
  function hat(yol, renk, kalin) { ctx.strokeStyle = renk; ctx.lineWidth = kalin || 2; ctx.beginPath(); yol.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }
  var hc = koyu ? '#334036' : '#cdd6c6';
  var kirmizi = koyu ? '#5a3428' : '#f0c9b8', sari = koyu ? '#5a4a28' : '#f1dfb4';
  hat(KOY_YOL.lora, hc, 3); hat(KOY_YOL.kapi, hc, 3); hat(KOY_YOL.ozet, hc, 3); hat(KOY_YOL.alarm, kirmizi, 3);
  ctx.setLineDash([7, 5]); hat(KOY_YOL.senkron, sari, 3); ctx.setLineDash([]); hat(KOY_YOL.telefon, kirmizi, 3);
  hat([[ONEM.x + 40, 336], [1006, 348]], kirmizi, 3);
  hat(KOY_YOL.wan, st.wan ? (koyu ? '#2f5d3a' : '#b7dbbb') : kirmizi, 3);
  // kutular
  Object.keys(KOY_KUTU).forEach(function (k) {
    var b = KOY_KUTU[k], vurgu = k === 'ozet' && simdi - ozetAni < 3500;
    kutu(b.x, b.y, b.w, b.h, { dolgu: vurgu ? RENK.sis : RENK.kutu, cizgi: vurgu ? RENK.sis : RENK.kutuCizgi, kalin: 1.5 });
    yazi(b.ad, b.x + 14, b.y + 22, { boy: 14, agirlik: 700, renk: vurgu ? '#fff' : RENK.yazi, aile: 'Space Grotesk, Inter, sans-serif' });
    yazi(b.alt, b.x + 14, b.y + 44, { boy: 11.5, renk: vurgu ? '#eafff6' : RENK.soluk });
  });
  // önem puanlama (karar)
  ctx.fillStyle = RENK.kutu; ctx.strokeStyle = RENK.onder; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ONEM.x, ONEM.y - 40); ctx.lineTo(ONEM.x + 52, ONEM.y); ctx.lineTo(ONEM.x, ONEM.y + 40); ctx.lineTo(ONEM.x - 52, ONEM.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  yazi('Önem', ONEM.x, ONEM.y - 8, { boy: 13, agirlik: 700, hiza: 'center' }); yazi('acil mi?', ONEM.x, ONEM.y + 10, { boy: 11, hiza: 'center', renk: RENK.soluk });
  yazi('evet → hemen', ONEM.x + 60, ONEM.y - 30, { boy: 11.5, agirlik: 600, renk: RENK.alarm });
  yazi('hayır → tampon', ONEM.x - 120, ONEM.y + 60, { boy: 11.5, agirlik: 600, renk: RENK.soluk });
  yazi('acil alarm: kural motoru → LoRa ağ geçidi → cep ağ geçidi (Class C)', 520, 96, { boy: 11.5, agirlik: 600, hiza: 'center', renk: RENK.alarm, zemin: RENK.zemin });
  yazi('akşam ağılda: sahada biriken kayıtlar tampona', 404, 676, { boy: 11.5, agirlik: 600, hiza: 'center', renk: RENK.mobil });
  yazi('telefon çekince acil olay doğrudan buluta (4G/5G)', 640, 742, { boy: 11.5, agirlik: 600, hiza: 'center', renk: RENK.alarm, zemin: RENK.zemin });
  // mimarideki ok numaraları
  var rz = RENK.yazi;
  rozet(1, 30, 130, RENK.lora); rozet(2, 30, 312, RENK.onder); rozet(6, 271, 322, rz); rozet(7, 536, 322, rz);
  rozet(8, 262, 96, RENK.alarm); rozet(9, 960, 330, RENK.alarm); rozet(10, 820, 420, rz); rozet(11, 1070, 250, RENK.alarm); rozet(12, 1112, 250, RENK.u);
  rozet(5, 250, 662, RENK.mobil); rozet(4, 360, 742, RENK.alarm);
  // anten
  direkCiz(220, 140, RENK.sis);
  // tampon göstergesi
  var tb = KOY_KUTU.tampon, dolu = kisit(tamponHam / 2600, 0, 1);
  ctx.fillStyle = koyu ? '#26302a' : '#eef1ea'; yuvarlakDortgen(tb.x + 14, tb.y + 62, tb.w - 28, 18, 6); ctx.fill();
  ctx.fillStyle = RENK.sis; yuvarlakDortgen(tb.x + 14, tb.y + 62, Math.max(8, (tb.w - 28) * dolu), 18, 6); ctx.fill();
  yazi(sayi(tamponHam) + ' ham kayıt', tb.x + 14, tb.y + 96, { boy: 12.5, agirlik: 600 });
  yazi('kuyrukta ' + U.upQ.length + ' ileti', tb.x + tb.w - 14, tb.y + 96, { boy: 11.5, hiza: 'right', renk: U.upQ.length && !st.wan ? RENK.alarm : RENK.soluk });
  // özetleme
  var ob = KOY_KUTU.ozet, kalan = ((st.P.ozetSaat - m) + 1440) % 1440;
  yazi(simdi - ozetAni < 3500 ? 'özet hazırlanıyor…' : 'sonraki özet ' + sure(kalan) + ' sonra', ob.x + 14, ob.y + 80, { boy: 11.5, agirlik: 600, renk: simdi - ozetAni < 3500 ? '#fff' : RENK.soluk });
  // bağlantı yöneticisi
  var bb = KOY_KUTU.bag;
  yazi(st.wan ? '● İnternet var' : '● İnternet yok', bb.x + 14, bb.y + 70, { boy: 12.5, agirlik: 700, renk: st.wan ? RENK.ok : RENK.alarm });
  yazi('modem açık ' + sayi(U.modemMin) + ' dk', bb.x + 14, bb.y + 88, { boy: 11, renk: RENK.soluk });
  // bulut
  bulutCiz(1091, 140, 1.25, koyu ? '#203247' : '#eaf2fb', RENK.bulut);
  yazi('Bulut', 1091, 142, { boy: 14, agirlik: 700, hiza: 'center', renk: RENK.bulut, aile: 'Space Grotesk, Inter, sans-serif' });
  if (!st.wan) yazi('✕', 1091, 238, { boy: 22, agirlik: 700, hiza: 'center', renk: RENK.alarm });
  // enerji birimi: güneş paneli ve akü
  var eb = KOY_KUTU.enerji, gun = 1 - gece;
  ctx.fillStyle = koyu ? '#1d2a44' : '#2a3f6b'; ctx.save(); ctx.translate(eb.x + 20, eb.y + 64); ctx.transform(1, 0, -0.3, 1, 0, 0);
  for (var a = 0; a < 3; a++) for (var b = 0; b < 2; b++) ctx.fillRect(a * 30 + 14, b * 22, 27, 19);
  ctx.restore();
  if (gun > 0.1) { ctx.fillStyle = 'rgba(255,200,60,' + gun + ')'; ctx.beginPath(); ctx.arc(eb.x + 150, eb.y + 74, 12, 0, 7); ctx.fill(); }
  var aku = kisit(0.62 + 0.3 * Math.sin(((m - 600) / 1440) * Math.PI * 2), 0.2, 0.95);
  ctx.strokeStyle = RENK.yazi; ctx.lineWidth = 1.5; ctx.strokeRect(eb.x + 130, eb.y + 98, 60, 24); ctx.fillStyle = RENK.yazi; ctx.fillRect(eb.x + 190, eb.y + 105, 4, 10);
  ctx.fillStyle = aku > 0.35 ? RENK.ok : RENK.alarm; ctx.fillRect(eb.x + 133, eb.y + 101, 54 * aku, 18);
  yazi(gun > 0.1 ? 'güneşten şarj' : 'aküden', eb.x + 16, eb.y + 126, { boy: 11.5, renk: RENK.soluk });
  paketleriCiz('koy', function (p) { return p; });
  // açıklama şeridi
  kutu(806, 630, 370, 84, { dolgu: RENK.etiket, cizgi: RENK.etiketCizgi });
  yazi('Başlangıçtan bu yana buluta giden mesaj', 822, 650, { boy: 12, agirlik: 700 });
  yazi('Klasik ' + sayi(st.ST.K.msgs) + ' · Uyuyan Bulut ' + sayi(U.msgs), 822, 672, { boy: 12.5, aile: 'IBM Plex Mono, monospace' });
  yazi('Aynı alarmlar, çok daha az veri ve modem süresi.', 822, 694, { boy: 11.5, renk: RENK.soluk });
}
