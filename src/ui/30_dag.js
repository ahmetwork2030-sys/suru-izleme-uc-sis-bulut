// ---------- sahne 2: dağ / mera (sürüyü izleyen yakın kamera) ----------
var DS = LW / 900;                            // 900 m genişlik
var dagGrup = 1, dagTakip = true, kamX = WD.agil.x, kamY = WD.agil.y, kamHazir = false;
var oncekiX = null, oncekiY = null, aci = null;

function yonleriGuncelle(st) {
  var N = st.N;
  if (!oncekiX) { oncekiX = new Float64Array(N); oncekiY = new Float64Array(N); aci = new Float64Array(N); for (var j = 0; j < N; j++) { oncekiX[j] = st.x[j]; oncekiY[j] = st.y[j]; aci[j] = hash(j, 1) * 6.28; } }
  for (var i = 0; i < N; i++) {
    var dx = st.x[i] - oncekiX[i], dy = st.y[i] - oncekiY[i];
    if (dx * dx + dy * dy > 0.5) {
      var hedef = Math.atan2(dy, dx), fark = Math.atan2(Math.sin(hedef - aci[i]), Math.cos(hedef - aci[i]));
      aci[i] += fark * 0.35;
    }
    oncekiX[i] = st.x[i]; oncekiY[i] = st.y[i];
  }
}
function koyunCiz(x, y, a, s, tur, durum) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = 'rgba(0,0,0,' + (koyu ? 0.4 : 0.16) + ')';
  ctx.beginPath(); ctx.ellipse(1.5 * s, 2 * s, 7 * s, 4.6 * s, 0, 0, 7); ctx.fill();
  var yun = durum === 'alarm' ? (koyu ? '#f3b49a' : '#f7c9b6') : durum === 'kayip' ? (koyu ? '#8c8c84' : '#c9c6bd') : (koyu ? '#dcd7c8' : '#f7f4ea');
  ctx.fillStyle = yun; ctx.strokeStyle = durum === 'alarm' ? RENK.alarm : (koyu ? 'rgba(0,0,0,0.5)' : 'rgba(90,80,60,0.45)'); ctx.lineWidth = durum === 'alarm' ? 1.6 : 0.8;
  ctx.beginPath();
  ctx.arc(-3 * s, -1.6 * s, 3.2 * s, 0, 7); ctx.arc(1 * s, -2 * s, 3.3 * s, 0, 7); ctx.arc(-3 * s, 1.8 * s, 3.1 * s, 0, 7); ctx.arc(1.2 * s, 1.9 * s, 3.2 * s, 0, 7); ctx.arc(3.3 * s, 0, 2.6 * s, 0, 7);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = yun; ctx.beginPath(); ctx.ellipse(-0.6 * s, 0, 5 * s, 3.6 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.ellipse(6.6 * s, 0, 2.6 * s, 1.9 * s, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5.6 * s, -2 * s, 1.3 * s, 0.7 * s, -0.6, 0, 7); ctx.ellipse(5.6 * s, 2 * s, 1.3 * s, 0.7 * s, 0.6, 0, 7); ctx.fill();
  if (tur === 1) { ctx.fillStyle = RENK.lora; ctx.fillRect(4.8 * s, -3.6 * s, 2 * s, 1.6 * s); }
  if (tur === 2) { ctx.fillStyle = '#e8c547'; ctx.beginPath(); ctx.arc(5.6 * s, -2.6 * s, 0.9 * s, 0, 7); ctx.fill(); }
  if (tur === 0) {
    ctx.strokeStyle = RENK.onder; ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.moveTo(4.2 * s, -3.2 * s); ctx.lineTo(4.2 * s, 3.2 * s); ctx.stroke();
    ctx.fillStyle = RENK.onder; ctx.fillRect(3.2 * s, -1.2 * s, 2 * s, 2.4 * s);
    ctx.strokeStyle = koyu ? '#eee' : '#333'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(4.2 * s, -1.2 * s); ctx.lineTo(3 * s, -4.8 * s); ctx.stroke();
  }
  ctx.restore();
}
function dagKamera(st) {
  var hedefI = dagGrup;
  if (dagTakip) {
    var en = -1;
    for (var i = 0; i < st.N; i++) if (st.mode[i] !== 0 && !st.inside[i] && st.mode[i] !== 4) { en = i; break; }
    if (en < 0) for (i = 0; i < st.N; i++) if (st.mode[i] === 4 && !st.inside[i]) { en = i; break; }
    if (en >= 0) { hedefI = en; dagGrup = st.grp[en]; }
  }
  var hx = st.x[hedefI], hy = st.y[hedefI];
  if (dagTakip && hedefI !== dagGrup) { hx = (hx + st.x[dagGrup]) / 2; hy = (hy + st.y[dagGrup]) / 2; }
  if (!kamHazir) { kamX = hx; kamY = hy; kamHazir = true; }
  kamX += (hx - kamX) * 0.12; kamY += (hy - kamY) * 0.12;
  kamX = kisit(kamX, 450, WD.W - 450); kamY = kisit(kamY, 282, WD.H - 282);
}
function dx2(x) { return (x - kamX) * DS + LW / 2; }
function dy2(y) { return (y - kamY) * DS + LH / 2; }
function gorunur(x, y, pay) { var sx = dx2(x), sy = dy2(y); pay = pay || 0; return sx > -pay && sx < LW + pay && sy > -pay && sy < LH + pay; }

function sahneDag() {
  var st = sim.state(), P = st.P, orman = st.orman, gece = gecelik(st.t);
  dagKamera(st);
  // zemin
  var rel = kabartma(orman, true);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(rel, (kamX - 450) / 10, (kamY - 281.25) / 10, 90, 56.25, 0, 0, LW, LH);
  // ot, çiçek, taş ve ağaçlar (dünya koordinatına bağlı, kararlı)
  var HC = 26, x0 = Math.floor((kamX - 460) / HC), x1 = Math.ceil((kamX + 460) / HC), y0 = Math.floor((kamY - 290) / HC), y1 = Math.ceil((kamY + 290) / HC);
  var agaclar = [];
  for (var cy = y0; cy <= y1; cy++) for (var cx = x0; cx <= x1; cx++) {
    var r = hash(cx, cy), wx = (cx + hash(cy, cx)) * HC, wy = (cy + hash(cx + 7, cy)) * HC, sx = dx2(wx), sy = dy2(wy);
    var agacMi = false;
    if (orman) { agacMi = ormanda(wx, wy) && r < 0.32 && nehreUzaklik(wx, wy) > 90; WD.meralar.forEach(function (m) { if (uzak(wx, wy, m.x, m.y) < 330) agacMi = false; }); }
    if (agacMi) { agaclar.push([sx, sy, 10 + hash(cx, cy + 3) * 9, r]); continue; }
    if (r < 0.5) {
      ctx.strokeStyle = koyu ? 'rgba(140,190,120,0.18)' : 'rgba(70,120,45,0.32)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(sx - 3, sy); ctx.lineTo(sx - 4, sy - 6); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 8); ctx.moveTo(sx + 3, sy); ctx.lineTo(sx + 5, sy - 6); ctx.stroke();
    } else if (r < 0.56) {
      ctx.fillStyle = hash(cy, cx + 1) > 0.5 ? (koyu ? 'rgba(240,230,160,0.5)' : '#f4e27a') : (koyu ? 'rgba(230,230,240,0.5)' : '#ffffff');
      for (var f = 0; f < 3; f++) { ctx.beginPath(); ctx.arc(sx + f * 3 - 3, sy + (f % 2) * 3, 1.5, 0, 7); ctx.fill(); }
    } else if (r < 0.585) {
      ctx.fillStyle = koyu ? '#5a5a52' : '#a8a397'; ctx.beginPath(); ctx.ellipse(sx, sy, 6, 4, 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = koyu ? '#77776d' : '#cfcabd'; ctx.beginPath(); ctx.ellipse(sx - 1.5, sy - 1.2, 3, 1.8, 0.3, 0, 7); ctx.fill();
    }
  }
  // dere
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); NEHIR.forEach(function (p, k) { if (k) ctx.lineTo(dx2(p[0]), dy2(p[1])); else ctx.moveTo(dx2(p[0]), dy2(p[1])); });
  ctx.strokeStyle = koyu ? '#2d5a7a' : '#7fb1d9'; ctx.lineWidth = 26; ctx.stroke();
  ctx.strokeStyle = koyu ? '#3f7aa0' : '#a9cdea'; ctx.lineWidth = 12; ctx.stroke();
  // yasak alan
  var yz = WD.yasak;
  if (gorunur((yz[0].x + yz[2].x) / 2, (yz[0].y + yz[2].y) / 2, 500)) {
    ctx.save(); ctx.beginPath(); yz.forEach(function (p, i) { if (i) ctx.lineTo(dx2(p.x), dy2(p.y)); else ctx.moveTo(dx2(p.x), dy2(p.y)); }); ctx.closePath();
    ctx.fillStyle = koyu ? '#4a4a2c' : '#d8cf8e'; ctx.fill(); ctx.clip();
    ctx.strokeStyle = koyu ? '#6a7a3a' : '#8fae4a'; ctx.lineWidth = 3;
    for (var sx2 = dx2(yz[0].x) - 600; sx2 < dx2(yz[2].x) + 600; sx2 += 14) { ctx.beginPath(); ctx.moveTo(sx2, dy2(yz[0].y)); ctx.lineTo(sx2 + 120, dy2(yz[2].y)); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); yz.forEach(function (p, i) { if (i) ctx.lineTo(dx2(p.x), dy2(p.y)); else ctx.moveTo(dx2(p.x), dy2(p.y)); }); ctx.closePath();
    ctx.strokeStyle = RENK.yasak; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]);
    yazi('Ekili tarla · yasak alan', dx2((yz[0].x + yz[2].x) / 2), dy2(yz[0].y) - 14, { boy: 13, agirlik: 600, hiza: 'center', renk: RENK.yasak, zemin: RENK.etiket, cizgi: RENK.yasak });
  }
  // ağıl ve köy (yakındaysa)
  if (gorunur(WD.agil.x, WD.agil.y, 300)) {
    var ax = dx2(WD.agil.x), ay = dy2(WD.agil.y), ar = WD.agilR * DS;
    ctx.fillStyle = koyu ? '#3a3a30' : '#dcd2b6'; ctx.beginPath(); ctx.arc(ax, ay, ar, 0, 7); ctx.fill();
    ctx.strokeStyle = RENK.duvar; ctx.lineWidth = 9; ctx.setLineDash([10, 3]); ctx.beginPath(); ctx.arc(ax, ay, ar, 0.12, Math.PI * 2 - 0.12); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = RENK.cati; ctx.fillRect(ax - ar * 0.85, ay - ar * 0.6, ar * 0.7, ar * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(ax - ar * 0.85, ay - ar * 0.6, ar * 0.7, ar * 0.25);
    yazi('Ağıl', ax - ar * 0.5, ay - ar * 0.68 - 10, { boy: 13, agirlik: 700, hiza: 'center', zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
    yazi('kapı · okuyucu', ax + ar + 8, ay, { boy: 12, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
    direkBuyuk(ax + ar * 0.4, ay - ar * 0.55, gece);
  }
  EVLER.forEach(function (e) {
    if (!gorunur(e.x, e.y, 60)) return;
    ctx.save(); ctx.translate(dx2(e.x), dy2(e.y)); ctx.rotate(e.d);
    var w = e.w * DS, h = e.h * DS;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w, h);
    ctx.fillStyle = RENK.cati; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-w / 2, -h / 2, w, h / 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
    ctx.restore();
  });
  // hayvanlar
  var nab = 0.5 + 0.5 * Math.sin(simdi / 200);
  for (var i = st.N - 1; i >= 0; i--) {
    if (!gorunur(st.x[i], st.y[i], 20)) continue;
    var md = st.mode[i], durum = (md === 1 || md === 2 || md === 3) && !st.inside[i] ? 'alarm' : md === 4 && !st.inside[i] ? 'kayip' : '';
    koyunCiz(dx2(st.x[i]), dy2(st.y[i]), aci[i], st.kind[i] === 0 ? 1.55 : 1.1, st.kind[i], durum);
  }
  // ağaçlar koyunların üstünde (orman örtüsü)
  agaclar.forEach(function (a) {
    ctx.fillStyle = koyu ? 'rgba(0,0,0,0.45)' : 'rgba(30,50,25,0.3)'; ctx.beginPath(); ctx.arc(a[0] + 5, a[1] + 6, a[2], 0, 7); ctx.fill();
    ctx.fillStyle = koyu ? 'rgb(' + (32 + a[3] * 40) + ',64,44)' : 'rgb(' + (74 + a[3] * 60) + ',' + (118 + a[3] * 40) + ',66)';
    ctx.beginPath(); ctx.arc(a[0], a[1], a[2], 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.arc(a[0] - a[2] * 0.3, a[1] - a[2] * 0.35, a[2] * 0.45, 0, 7); ctx.fill();
  });
  // okuma yayınları ve olay açıklamaları
  var etiketSay = 0, halkaSay = 0;
  for (i = 0; i < P.TASMA + P.ETIKET; i++) {
    var so = sonOkuma[i]; if (!so || !gorunur(st.x[i], st.y[i], 0)) continue;
    if (st.grp[i] !== dagGrup && ++halkaSay > 4) continue;
    var k = (simdi - so.t) / 2400; if (k < 0 || k > 1) continue;
    var sx3 = dx2(st.x[i]), sy3 = dy2(st.y[i]);
    for (var h = 0; h < 2; h++) {
      var kk = (k + h * 0.35) % 1;
      ctx.strokeStyle = st.kind[i] === 0 ? RENK.onder : RENK.lora; ctx.globalAlpha = (1 - kk) * 0.8; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx3, sy3, 10 + kk * 46, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (etiketSay < 3 && k < 0.85) {
      etiketSay++;
      var ne = so.sabit ? (so.role ? 'röle: önder tasması taşıyor → ağ geçidi ①' : 'LoRa → ağıldaki ağ geçidi ①') : so.mobil ? 'LoRa → çobanın cep ağ geçidi (mobil sis)' : 'kimse duymadı · cihazda tamponda bekliyor';
      yazi((st.kind[i] === 0 ? 'Tasma GPS konumu: ' : 'LoRa etiketi: ') + ne, sx3 + 16, sy3 - 18, { boy: 12, agirlik: 600, renk: so.sabit || so.mobil ? (st.kind[i] === 0 ? RENK.onder : RENK.lora) : RENK.alarm, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
    }
  }
  // sürüden ayrılan / hareketsiz / kayıp hayvanlar
  for (i = 0; i < st.N; i++) {
    var md2 = st.mode[i]; if (md2 === 0 || st.inside[i]) continue;
    var g = st.grp[i]; if (!gorunur(st.x[i], st.y[i], 200)) continue;
    var px = dx2(st.x[i]), py = dy2(st.y[i]), d = uzak(st.x[i], st.y[i], st.x[g], st.y[g]);
    if (md2 === 1 || md2 === 2) {
      ctx.strokeStyle = RENK.alarm; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(dx2(st.x[g]), dy2(st.y[g])); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(px, py, 16 + nab * 6, 0, 7); ctx.stroke();
      yazi(hayvanAdi(i) + ' sürüden ayrıldı · önderden ' + mesafe(d) + (d > P.kopmaEsik ? ' (eşik ' + P.kopmaEsik + ' m)' : ''), px, py + 30, { boy: 12.5, agirlik: 600, hiza: 'center', renk: RENK.alarm, zemin: RENK.etiket, cizgi: RENK.alarm });
    } else if (md2 === 3) {
      ctx.strokeStyle = RENK.alarm; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 16 + nab * 6, 0, 7); ctx.stroke();
      yazi(hayvanAdi(i) + ' hareketsiz (hastalık ya da yaralanma olabilir)', px, py + 30, { boy: 12.5, agirlik: 600, hiza: 'center', renk: RENK.alarm, zemin: RENK.etiket, cizgi: RENK.alarm });
    } else if (md2 === 4) {
      yazi(hayvanAdi(i) + ' sürüden koptu · LED etiketli: sahada izlenemez, akşam sayımında anlaşılır', px, py + 30, { boy: 12, hiza: 'center', renk: RENK.soluk, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
    }
  }
  // çoban ve köpek
  var cx2 = dx2(st.coban.x), cy2 = dy2(st.coban.y);
  if (gorunur(st.coban.x, st.coban.y, 20)) {
    cobanIkon(cx2, cy2, 2.6);
    ctx.fillStyle = koyu ? '#c9a06a' : '#7a5230'; ctx.beginPath(); ctx.ellipse(cx2 - 22, cy2 + 10, 7, 3.6, 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx2 - 15, cy2 + 8, 2.8, 0, 7); ctx.fill();
    yazi('Çoban · cebinde mobil sis düğümü' + (st.tel ? ' · telefon çekiyor' : ' · telefon çekmiyor'), cx2 + 18, cy2 - 22, { boy: 12, agirlik: 600, renk: RENK.mobil, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
  } else kenarOku(st.coban.x, st.coban.y, 'Çoban ' + mesafe(uzak(kamX, kamY, st.coban.x, st.coban.y)), RENK.mobil);
  if (!gorunur(WD.agil.x, WD.agil.y, 0)) kenarOku(WD.agil.x, WD.agil.y, 'Ağıl · LoRa ağ geçidi ' + mesafe(uzak(kamX, kamY, WD.agil.x, WD.agil.y)), RENK.sis);
  paketleriCiz('dunya', function (p) { return [dx2(p[0]), dy2(p[1])]; });
  if (gece > 0) { ctx.fillStyle = RENK.gece + (gece * 0.5) + ')'; ctx.fillRect(0, 0, LW, LH); }
  dagBilgi(st);
  miniHarita(st);
}
function direkBuyuk(x, y, gece) {
  ctx.strokeStyle = koyu ? '#cfd8d2' : '#4a5a50'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - 9, y + 18); ctx.lineTo(x, y - 22); ctx.lineTo(x + 9, y + 18); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x + 6, y + 4); ctx.stroke();
  ctx.strokeStyle = RENK.sis; ctx.lineWidth = 2;
  for (var r = 8; r <= 20; r += 6) { ctx.beginPath(); ctx.arc(x, y - 22, r, -2.5, -0.65); ctx.stroke(); }
  yazi('LoRa ağ geçidi', x, y + 30, { boy: 11.5, agirlik: 600, hiza: 'center', renk: RENK.sis, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
}
function kenarOku(wx, wy, txt, renk) {
  var a = Math.atan2(wy - kamY, wx - kamX), cx = LW / 2, cy = LH / 2;
  var t = Math.min((LW / 2 - 40) / Math.abs(Math.cos(a) || 1e-6), (LH / 2 - 40) / Math.abs(Math.sin(a) || 1e-6));
  var x = cx + Math.cos(a) * t, y = cy + Math.sin(a) * t;
  if (x < 500 && y < 130) y = 150;
  ok(x - Math.cos(a) * 26, y - Math.sin(a) * 26, x, y, renk, 3);
  yazi(txt, x - Math.cos(a) * 34, y - Math.sin(a) * 34 + (Math.sin(a) > 0 ? -16 : 16), { boy: 12, agirlik: 600, hiza: 'center', renk: renk, zemin: RENK.etiket, cizgi: RENK.etiketCizgi });
}
var DURUM_AD = { agil: 'ağılda', yol: 'meraya yürüyor', otla: 'merada otluyor', donus: 'ağıla dönüyor' };
function dagBilgi(st) {
  var g = dagGrup, P = st.P, lora = 0, led = 0, ic = 0;
  for (var i = 0; i < st.N; i++) if (st.grp[i] === g) { if (st.kind[i] === 1) lora++; else if (st.kind[i] === 2) led++; if (st.inside[i]) ic++; }
  var dA = uzak(st.x[g], st.y[g], WD.agil.x, WD.agil.y), dC = uzak(st.x[g], st.y[g], st.coban.x, st.coban.y);
  var gwR = st.orman && ormanda(st.x[g], st.y[g]) ? P.gwRangeOrman : P.gwRange;
  var satir = [
    ['Sürü ' + (g + 1) + ' · ' + DURUM_AD[st.lead[g]], 15, 700],
    ['1 önder tasması (GPS + LoRa) · ' + lora + ' LoRa etiketi · ' + led + ' LED kimlik etiketi', 12.5, 500],
    ['Ağıla ' + mesafe(dA) + (dA <= gwR ? ' · ağ geçidi duyuyor' : ' · ağ geçidinin menzili dışında'), 12.5, 500],
    ['Çobana ' + mesafe(dC) + (st.gwCoban ? '' : '') + ' · ' + (dC <= (st.orman ? P.cepRangeOrman : P.cepRange) ? 'cep ağ geçidi duyuyor' : 'cep ağ geçidinin menzili dışında'), 12.5, 500]
  ];
  kutu(14, 14, 470, 92, { dolgu: RENK.etiket, cizgi: RENK.etiketCizgi });
  satir.forEach(function (s, k) { yazi(s[0], 28, 34 + k * 21, { boy: s[1], agirlik: s[2], aile: k ? undefined : 'Space Grotesk, Inter, sans-serif' }); });
}
function miniHarita(st) {
  var w = 200, h = 125, x = LW - w - 14, y = LH - h - 14;
  ctx.save(); yuvarlakDortgen(x, y, w, h, 8); ctx.clip();
  ctx.drawImage(kabartma(st.orman), x, y, w, h);
  var s = w / WD.W;
  ctx.fillStyle = RENK.cati; ctx.fillRect(x + WD.agil.x * s - 3, y + WD.agil.y * s - 3, 6, 6);
  for (var g = 0; g < st.P.TASMA; g++) { ctx.fillStyle = g === dagGrup ? RENK.alarm : RENK.onder; ctx.beginPath(); ctx.arc(x + st.x[g] * s, y + st.y[g] * s, 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = RENK.mobil; ctx.beginPath(); ctx.arc(x + st.coban.x * s, y + st.coban.y * s, 2.6, 0, 7); ctx.fill();
  ctx.strokeStyle = koyu ? '#fff' : '#1b261e'; ctx.lineWidth = 1.5; ctx.strokeRect(x + (kamX - 450) * s, y + (kamY - 281) * s, 900 * s, 562 * s);
  ctx.restore();
  yuvarlakDortgen(x, y, w, h, 8); ctx.strokeStyle = RENK.etiketCizgi; ctx.lineWidth = 1.5; ctx.stroke();
}
