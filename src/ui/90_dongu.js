// ---------- kurulum ve ana döngü ----------
var NOTLAR = {
  P1: 'İnternet ve telefon kapsaması her yerde.',
  P2: 'Ağılda internet çoğu zaman var; telefon yalnızca köyün 1,5 km çevresinde çeker.',
  P3: 'Ağılın interneti ortalama 2,5 günde bir yarım saat gelir; telefon yalnızca tepedeki kapsama noktasında çeker.',
  P4: 'Ormanda LoRa menzili kısalır: ağ geçidi 600 m, çobanın cihazı 350 m. İnternet yarı yarıya, telefon ara ara çeker.'
};
function oynatDugme() { $('play').textContent = oynuyor ? 'Duraklat' : 'Başlat'; }
function yeniSim() {
  kapiSifirla(); sonOkuma = {}; paketler = []; bildirimler = []; tamponHam = 0; tamponGun = -1; ozetAni = -1e9;
  izlenenMsg = { K: 0, S: 0, U: 0 }; izlenenAlarm = { K: 0, S: 0, U: 0 }; oncekiX = null; kamHazir = false; gelen = [];
  bildirimGecmis = []; bildirimSay = { push: 0, SMS: 0 }; izlenenBulut = {};
  sim = Sim.create({ profile: profil, seed: tohum, yayin: yayin });
  ileriSar(1440 + 600);                       // 2. gün 10:00: sürüler merada
  var p = Sim.PROFILES[profil];
  $('pnote').textContent = p.kod + ' · ' + p.ad + ' (' + p.ortam + '). ' + NOTLAR[profil];
  olayAkisi(); panel();
}
function ciz() {
  ctx.setTransform(olcek, 0, 0, olcek, 0, 0);
  ctx.clearRect(0, 0, LW, LH);
  if (sahne === 'kus') sahneKus();
  else if (sahne === 'dag') sahneDag();
  else if (sahne === 'agil') sahneAgil();
  else if (sahne === 'koy') sahneKoy();
  else if (sahne === 'bulut') sahneBulut();
  // bildirimler
  bildirimler = bildirimler.filter(function (b) { return simdi - b.t0 < 7000; });
  bildirimler.forEach(function (b, i) {
    var a = kisit((7000 - (simdi - b.t0)) / 800, 0, 1);
    ctx.globalAlpha = a;
    var yer = { kus: [LW / 2, LH - 30 - i * 32], dag: [LW / 2 - 60, LH - 30 - i * 32], agil: [605, 360 - i * 30], koy: [800, 30 + i * 30], bulut: [760, 226 + i * 30] }[sahne] || [LW / 2, 30];
    yazi(b.txt, yer[0], yer[1], { boy: 13, agirlik: 700, hiza: 'center', renk: '#fff', zemin: b.renk, cizgi: b.renk });
    ctx.globalAlpha = 1;
  });
}
var sonZaman = 0, sonPanel = 0, sonAkis = 0;
function dongu(ts) {
  var dt = sonZaman ? Math.min(100, ts - sonZaman) : 16; sonZaman = ts; simdi = ts;
  if (oynuyor && sim) {
    if (sahne === 'agil' && kapiMesgul()) kapiGuncelle(dt);
    else {
      birikim += hiz * dt / 1000;
      var n = Math.floor(birikim); birikim -= n;
      if (n > 0) sim.run(Math.min(n, 720));
      if (sahne === 'agil') kapiGuncelle(dt);
    }
  }
  if (sim) {
    olaylariIsle(false);
    yonleriGuncelle(sim.state());
    if (sahne !== 'sonuc') ciz();
  }
  paketler = paketler.filter(function (p) { return simdi - p.t0 < p.sure; });
  if (ts - sonPanel > 250) { sonPanel = ts; panel(); }
  if (ts - sonAkis > 1500) { sonAkis = ts; olayAkisi(); }
  requestAnimationFrame(dongu);
}
// sessiz işleme (zaman atlamada paket ve bildirim üretme)
var _olaylariIsle = olaylariIsle;
olaylariIsle = function (sessiz) {
  if (!sessiz) return _olaylariIsle();
  var st = sim.state();
  gelen.forEach(function (e) {
    if (e.tur === 'okuma' && e.sabit) tamponHam++;
    if (e.tur === 'kapi' || e.tur === 'sayim') kapiIsle(e, false);
  });
  gelen.length = 0;
  var gun = Math.floor(st.t / 1440);
  if (st.t % 1440 >= st.P.ozetSaat && tamponGun !== gun) { tamponGun = gun; tamponHam = 0; }
  STR.forEach(function (s) { izlenenMsg[s] = st.ST[s].msgs; });
  oncekiMob.buf = st.ST.U.mobBuf.length; oncekiMob.acil = (st.ST.U.mobAcil || []).length;
  var u = 0; st.ST.U.alarms.forEach(function (a) { if (a.tDel !== null) u++; }); izlenenAlarm.U = u;
  st.ST.U.alarms.forEach(function (a) {
    if (a.tBulut === null || a.tBulut === undefined) return;
    var an = a.dev + '|' + a.tur + '|' + a.gun; if (izlenenBulut[an]) return; izlenenBulut[an] = true;
    bulutBildirimi(a, a.tBulut, false);
  });
};

// ---------- olaylar ----------
renkleriKur();
Object.keys(Sim.PROFILES).forEach(function (k) {
  var p = Sim.PROFILES[k], b = document.createElement('button');
  b.type = 'button'; b.textContent = p.kod; b.title = p.ad + ' · ' + p.ortam; b.setAttribute('aria-pressed', String(k === profil));
  b.addEventListener('click', function () {
    profil = k; Array.prototype.forEach.call($('profiles').children, function (c) { c.setAttribute('aria-pressed', String(c.textContent === profil)); });
    yeniSim();
  });
  $('profiles').appendChild(b);
});
SAHNELER.forEach(function (s, i) {
  var b = document.createElement('button'); b.type = 'button'; b.className = 'tab'; b.dataset.k = s.k; b.setAttribute('role', 'tab');
  b.innerHTML = '<span class="n">' + (i + 1) + '</span>' + s.ad;
  b.addEventListener('click', function () { sahneSec(s.k); });
  b.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var j = (i + (e.key === 'ArrowRight' ? 1 : SAHNELER.length - 1)) % SAHNELER.length;
    sahneSec(SAHNELER[j].k); $('tabs').children[j].focus();
  });
  $('tabs').appendChild(b);
});
ADIMLAR.forEach(function (a, i) {
  var b = document.createElement('button'); b.type = 'button'; b.textContent = i + 1; b.title = a.b; b.setAttribute('aria-label', 'Adım ' + (i + 1) + ': ' + a.b);
  b.addEventListener('click', function () { adimGoster(i, true); });
  $('dots').appendChild(b);
});
$('prev').addEventListener('click', function () { adimGoster(adim - 1, true); });
$('next').addEventListener('click', function () { adimGoster(adim === ADIMLAR.length - 1 ? 0 : adim + 1, true); });
$('speed').addEventListener('change', function (e) { hiz = +e.target.value; birikim = 0; });
$('play').addEventListener('click', function () { oynuyor = !oynuyor; oynatDugme(); });
$('hour').addEventListener('click', function () { if (sahne === 'agil') kapiBosalt(); ileriSar(60); panel(); });
$('reset').addEventListener('click', function () { tohum += 1; yeniSim(); });
cv.addEventListener('click', function (e) {
  if (sahne !== 'kus') return;
  var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
  for (var i = kusSicakNokta.length - 1; i >= 0; i--) { var h = kusSicakNokta[i]; if (uzak(x, y, h.x, h.y) < h.r) { h.git(); return; } }
});
cv.addEventListener('mousemove', function (e) {
  if (sahne !== 'kus') { cv.style.cursor = ''; return; }
  var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
  cv.style.cursor = kusSicakNokta.some(function (h) { return uzak(x, y, h.x, h.y) < h.r; }) ? 'pointer' : '';
});
if (window.ResizeObserver) new ResizeObserver(boyutla).observe(cv); else window.addEventListener('resize', boyutla);
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { renkleriKur(); lejant(); });
new MutationObserver(function () { renkleriKur(); lejant(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
if (azHareket) { oynuyor = false; }
boyutla();
yeniSim();
sonuclar();
sahneSec('kus');
adimGoster(0, false);
oynatDugme();
requestAnimationFrame(dongu);
})();
