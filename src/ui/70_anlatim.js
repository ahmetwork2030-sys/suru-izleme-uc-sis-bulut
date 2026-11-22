// ---------- sahneler, alt kontroller, açıklamalar ----------
var SAHNELER = [
  { k: 'kus', ad: 'Kuş bakışı' }, { k: 'dag', ad: 'Dağ · mera' }, { k: 'agil', ad: 'Ağıl kapısı' },
  { k: 'koy', ad: 'Köy · sis düğümü' }, { k: 'bulut', ad: 'Bulut' }, { k: 'sonuc', ad: '30 günlük sonuçlar' }
];
var atlama = false;
function sahneSec(k) {
  if (sahne === 'agil' && k !== 'agil') kapiBosalt();
  sahne = k; kamHazir = false;
  Array.prototype.forEach.call($('tabs').children, function (b) { b.setAttribute('aria-selected', String(b.dataset.k === k)); b.tabIndex = b.dataset.k === k ? 0 : -1; });
  $('stage').classList.toggle('sonuc', k === 'sonuc');
  altKontroller(); lejant(); aciklama();
}
function dugme(ad, fn, birincil, basili) {
  var b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (birincil ? ' primary' : ''); b.textContent = ad;
  if (basili !== undefined) b.setAttribute('aria-pressed', String(basili));
  b.addEventListener('click', fn); return b;
}
function altKontroller() {
  var s = $('subctl'); s.innerHTML = '';
  if (sahne === 'kus') { s.appendChild(dugme('Sabah çıkışına git', function () { saateGit(6 * 60 + 55); })); s.appendChild(dugme('Akşam dönüşüne git', function () { saateGit(19 * 60 + 5); })); }
  if (sahne === 'dag') {
    var seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'İzlenen sürü');
    for (var g = 0; g < 5; g++) (function (gg) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Sürü ' + (gg + 1);
      b.setAttribute('aria-pressed', String(!dagTakip && dagGrup === gg));
      b.addEventListener('click', function () { dagGrup = gg; dagTakip = false; kamHazir = false; altKontroller(); });
      seg.appendChild(b);
    })(g);
    s.appendChild(seg);
    s.appendChild(dugme('Olayları takip et', function () { dagTakip = !dagTakip; altKontroller(); }, false, dagTakip));
  }
  if (sahne === 'agil') {
    s.appendChild(dugme('Sabah çıkışına git', function () { saateGit(6 * 60 + 58); }));
    s.appendChild(dugme('Akşam dönüşüne git', function () { saateGit(19 * 60 + 5); }));
    s.appendChild(dugme(kapi.hizli ? 'Normal geçiş' : 'Hızlı geçir', function () { kapi.hizli = !kapi.hizli; altKontroller(); }));
    s.appendChild(dugme('Sırayı bitir', function () { kapiBosalt(); }));
  }
  if (sahne === 'koy') { s.appendChild(dugme('Gece özetine git (01:58)', function () { saateGit(118); })); }
  if (sahne === 'bulut') {
    var seg2 = document.createElement('div'); seg2.className = 'seg'; seg2.setAttribute('role', 'group'); seg2.setAttribute('aria-label', 'Gösterilen trafik');
    [['K', 'Klasik'], ['S', 'Sis + anlık'], ['U', 'Uyuyan Bulut']].forEach(function (q) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = q[1]; b.setAttribute('aria-pressed', String(bulutGoster[q[0]]));
      b.addEventListener('click', function () { bulutGoster[q[0]] = !bulutGoster[q[0]]; altKontroller(); }); seg2.appendChild(b);
    });
    s.appendChild(seg2);
  }
}
var LEJANT = {
  kus: [['--o', 'Önder hayvan tasması (GPS + LoRa)'], ['--l', 'LoRa etiketi'], ['--e', 'LED kimlik etiketi'], ['--a', 'Sürüden ayrılan ya da hareketsiz hayvan'], ['--m', 'Çoban ve cep ağ geçidi menzili'], ['--t', 'Telefon kapsaması (profile göre)']],
  dag: [['--o', 'Önder: turuncu tasma'], ['--l', 'LoRa etiketi: kulakta mavi'], ['--y', 'LED etiketi: kulakta sarı'], ['--a', 'Alarm durumundaki hayvan']],
  agil: [['--y', 'Işık bariyeri kesildi'], ['--p', 'Kızılötesi etiket yayını'], ['--g', 'Kayıt (yeşil LED)'], ['--a', 'Eksik hayvan (kırmızı LED)']],
  koy: [['--l', 'LoRa okuması'], ['--o', 'Kapı kaydı'], ['--a', 'Acil alarm'], ['--s', 'Gece özeti ve buluta giden ileti']],
  bulut: [['--k', 'Klasik (bulut merkezli)'], ['--w', 'Sis + anlık iletim'], ['--s', 'Sis + Uyuyan Bulut']],
  sonuc: []
};
function lejant() {
  var r = { '--o': RENK.onder, '--l': RENK.lora, '--e': koyu ? '#d9d4c3' : '#bfb9a8', '--a': RENK.alarm, '--m': RENK.mobil, '--t': koyu ? '#be96ff' : '#6e3cbe', '--y': '#e8c547', '--p': '#b15cff', '--g': '#2fb344', '--s': RENK.u, '--k': RENK.k, '--w': RENK.s };
  $('legend').innerHTML = LEJANT[sahne].map(function (l) { return '<span><i class="sw" style="background:' + r[l[0]] + '"></i>' + l[1] + '</span>'; }).join('');
}
function aciklama() {
  if (!sim) return;
  var st = sim.state(), c = '';
  if (sahne === 'kus') c = '<b>Kuş bakışı.</b> Arazi, sürüler, çoban, ağıl, köy ve bulut bağlantısı aynı anda. Bir sürüye, ağıla, köye ya da buluta tıklayarak o istasyonun içine girin.';
  if (sahne === 'dag') c = '<b>Dağ · mera.</b> Sürü ' + (dagGrup + 1) + ' ' + DURUM_AD[st.lead[dagGrup]] + '. Halkalar cihazların 15 dakikada bir yaptığı LoRa yayınıdır; yazı, yayını kimin duyduğunu söyler.' + (dagTakip ? ' Olay takibi açık: bir hayvan sürüden ayrılırsa kamera ona döner.' : '');
  if (sahne === 'agil') c = kapiMesgul() ? '<b>Ağıl kapısı.</b> Geçiş sürüyor; her hayvanı izleyebilmeniz için simülasyon saati bekliyor. Sırada ' + kapi.kuyruk.length + ' kayıt var.' : '<b>Ağıl kapısı.</b> Kapı şu an boş. Sabah çıkışı ya da akşam dönüşüne gidin; her hayvan iki ışık bariyerinden ve kızılötesi okuyucudan tek tek geçer.';
  if (sahne === 'koy') c = '<b>Köy · sabit sis düğümü.</b> Paketler gerçek olaylardan üretilir. Acil olay (kopma, hareketsizlik, yasak alan, eksik) hemen çobana ve buluta; rutin kayıt tamponda bekler, gece özetlenir.';
  if (sahne === 'bulut') c = '<b>Bulut.</b> Aynı sürü için üç yöntemin buluta gönderdiği trafik. Klasikte her okuma ayrı mesajdır; Uyuyan Bulutta günde bir özet ve yalnızca acil olaylar gelir. Acil olay gelince bildirim servisi hayvan kaydından sahibini bulur; çobana ve mal sahibine bildirim gider.';
  if (sahne === 'sonuc') c = '<b>30 günlük toplu deney.</b> Her profil beş farklı senaryoyla otuz gün koşturuldu.';
  $('cap').innerHTML = c;
}

// ---------- zaman atlama ----------
function ileriSar(dk) {
  atlama = true;
  while (dk > 0) { var n = Math.min(dk, 240); sim.run(n); dk -= n; olaylariIsle(true); }
  atlama = false; birikim = 0;
}
function saateGit(hedefDk) {
  var t = sim.t, m = t % 1440, fark = (hedefDk - m + 1440) % 1440;
  if (fark < 2) fark += 1440;
  if (sahne === 'agil') kapiBosalt();
  ileriSar(fark); aciklama();
}
function olayBul() {                         // bir hayvan sürüden ayrılana ya da hareketsiz kalana kadar ilerle
  atlama = true;
  for (var k = 0; k < 4 * 1440; k++) {
    sim.run(1);
    if (k % 60 === 0) olaylariIsle(true);
    var st = sim.state();
    for (var i = 0; i < st.N; i++) if ((st.mode[i] === 1 || st.mode[i] === 3) && !st.inside[i]) { olaylariIsle(true); atlama = false; dagGrup = st.grp[i]; return i; }
  }
  olaylariIsle(true); atlama = false; return -1;
}

// ---------- aşama aşama anlatım ----------
var ADIMLAR = [
  { b: 'Sistemin tamamı: dört katman', s: 'kus', git: function () { var m = sim.t % 1440; if (m < 9 * 60 || m > 17 * 60) saateGit(10 * 60); },
    m: '<p>Sürü bir gün boyunca dağda otlar. Hayvanların üstündeki cihazlar <b>uç katman</b>, çobanın cebindeki telefon <b>mobil sis</b>, köydeki mandıra bilgisayarı ve ağıldaki LoRa ağ geçidi <b>sabit sis</b>, en üstte <b>bulut</b> vardır.</p><p>Yaylada internet her zaman yoktur; bu yüzden karar mümkün olduğunca sahada verilir.</p>',
    l: ['Turuncu: önder tasması (GPS + LoRa) · mavi: LoRa etiketi · açık renk: LED kimlik etiketi.', 'Mavi paketler ağıldaki ağ geçidine, sarı paketler çobanın telefonuna giden okumalardır.', 'Sağ üstte internet bağlantısı; kesikken kırmızıya döner.'] },
  { b: 'Sabah: ağıl kapısından çıkış', s: 'agil', git: function () { saateGit(6 * 60 + 58); },
    m: '<p>Saat 07:00\'de sürüler ağıldan çıkar. Her hayvan tek sıra koridordan geçer. Koridorun iki ucunda <b>ışık bariyeri</b>, ortasında <b>mıknatıs şeridi</b> ve <b>kızılötesi okuyucu</b> vardır.</p><p>Mıknatıs hayvanın kulağındaki LED etiketini uyandırır; etiket numarasını kızılötesi ışıkla 3 kez yayar ve yeniden uyur. Okuyucu numarayı okur, yönü bariyerlerin sırasından bulur.</p>',
    l: ['Önce iç sonra dış bariyer kesilirse ÇIKIŞ.', 'Alttaki iki devre Wokwi\'de kurduğumuz devrelerin aynısı: LCD, LED\'ler, buzzer ve NEC dalga biçimi canlı.', 'Sağdaki iletiler yerel MQTT\'ye gider.'] },
  { b: 'Meraya yürüyüş: önder tasması', s: 'dag', git: function () { dagGrup = 0; dagTakip = false; saateGit(8 * 60 + 20); },
    m: '<p>GPS yalnızca sürüyü yöneten <b>önder hayvanda</b> vardır; diğerleri onu izler. Tasma konumunu 15 dakikada bir LoRa ile yayar.</p><p>Yayını ağıldaki ağ geçidi (5 km), çobanın cebindeki ağ geçidi (1,5 km) ya da ikisi birden duyar. Kimse duymazsa kayıt cihazda bekler.</p>',
    l: ['Turuncu halkalar tasmanın yayınıdır.', 'Yazı, yayını kimin duyduğunu gösterir.', 'Sağ alttaki küçük harita kameranın yerini gösterir.'] },
  { b: 'Merada: LoRa etiketi ve mobil sis', s: 'dag', git: function () { dagGrup = 2; dagTakip = false; saateGit(12 * 60); },
    m: '<p>Anlık izlenmesi gereken hayvanlarda (hasta, gebe) <b>LoRa etiketi</b> vardır; etiket hayvandan hayvana taşınabilir.</p><p>Ağ geçidinin menzili dışında, yakındaki önder tasması <b>röle</b> olur; çoban yakınsa telefonu kaydı doğrudan alır. Çobanın telefonundaki uygulama kopma ve hareketsizliği internet olmadan hesaplar.</p>',
    l: ['Mavi halkalar LoRa etiketinin yayınıdır.', '“röle: önder tasması taşıyor” yazısı kapsama dışındaki etiketi gösterir.', 'Bilgi kutusunda sürünün ağıla ve çobana uzaklığı yazar.'] },
  { b: 'Bir hayvan sürüden ayrılıyor', s: 'dag', git: function () { dagTakip = true; var i = olayBul(); if (i < 0) bildir('Önümüzdeki 4 günde olay çıkmadı; yeni senaryo deneyin.', RENK.soluk); },
    m: '<p>Simülasyon bir hayvanın sürüden ayrıldığı ya da hareketsiz kaldığı ana kadar ilerledi. Hayvan önderden <b>400 m</b> uzaklaşırsa ve bu iki okuma üst üste sürerse kural motoru alarm üretir.</p><p>Uyuyan Bulutta bu karar <b>sahada</b> verilir; alarm çobanın telefonuna internet olmadan ulaşır. Klasik yapıda ise kayıt önce buluta gitmeli; internet yoksa alarm saatlerce bekler.</p>',
    l: ['Kırmızı kesikli çizgi hayvanı önderine bağlar, uzaklık yazar.', 'Alarm çobana ulaşınca ekranın üstünde bildirim çıkar.', 'Aşağıdaki olay akışında üç yöntemin alarm gecikmesi yan yana.'] },
  { b: 'Köyde sabit sis düğümü', s: 'koy', git: function () { saateGit(15 * 60); },
    m: '<p>Ağıldaki LoRa ağ geçidi ve kapı okuyucusu kayıtları köydeki küçük bilgisayara getirir. Burada <b>yerel MQTT</b>, <b>kural motoru</b> ve <b>önem puanlama</b> çalışır.</p><p>Acil olay hemen gönderilir; rutin kayıt <b>tamponda</b> bekler. Bağlantı yöneticisi interneti izler; yoksa iletiler sıra numarasıyla bekletilir ve sonra tekrarsız gönderilir.</p>',
    l: ['Kutulardaki daire içindeki rakamlar mimari diyagramdaki ok numaralarıdır (① … ⑫).', 'Mavi paket: LoRa okuması · turuncu: kapı kaydı · kırmızı: acil alarm · sarı: çobanın telefonundan gelen.', 'Tampon çubuğu gün boyu dolar; enerji birimi güneş paneli ve aküyle çalışır.'] },
  { b: 'Akşam dönüşü ve sayım', s: 'agil', git: function () { saateGit(19 * 60 + 5); },
    m: '<p>Sürüler 19:20 civarında döner ve kapıdan tek tek girer. Önce dış sonra iç bariyer kesildiği için yön <b>GİRİŞ</b>tir. LCD ağıldaki hayvan sayısını gösterir.</p><p>Son grup girince <b>akşam sayımı</b> kapanır: içeride olmayan hayvanlar listelenir, kırmızı LED yanar ve liste çobana gider. LED etiketli bir hayvan sahada izlenemez; kaybı burada anlaşılır.</p>',
    l: ['Simülasyon saati, her hayvanı izleyebilmeniz için kapı boşalana kadar bekler.', '“Hızlı geçir” ile hızlandırabilirsiniz.', 'Sayım sonucu sağdaki iletilerde ve LCD\'de.'] },
  { b: 'Gece: Uyuyan Bulut', s: 'koy', git: function () { saateGit(118); },
    m: '<p>Beyin uykuda günün anılarını özetleyip kalıcı belleğe taşır. Sistem de gece <b>02:00</b>\'de tampondaki ham kayıtları hayvan başına özetler, sıkıştırır ve tek bir ileti hâline getirir.</p><p>İnternet varsa özet hemen buluta gider; yoksa bağlantı yöneticisi bekletir ve ilk fırsatta gönderir. Böylece buluta günde yüzlerce yerine birkaç ileti gider.</p>',
    l: ['Özetleme kutusu çalışırken yeşil yanar.', 'Tampon çubuğu özetten sonra boşalır.', 'Bağlantı yöneticisi internet durumunu gösterir.'] },
  { b: 'Bulutta: depolama ve kullanıcılar', s: 'bulut', git: function () {},
    m: '<p>Bulutta veri cihaz ağ geçidinden girer, kuyruk ve akış işlemeden geçip depolanır. Kullanıcılar (çoban, veteriner, kooperatif, mal sahibi) API üzerinden kendi yetkileri kadarını görür.</p><p>Acil olay buluta ulaşınca <b>bildirim servisi (⑭)</b> hayvan kaydına bakar: etiket numarası hangi resmi küpeye ve hangi mal sahibine ait? Çobana push, mal sahibine kendi seçtiği kanaldan (push ya da SMS) bildirim gider. Köy sürüsünde 500 hayvan 14 aileye aittir.</p><p>Soldaki hatlar üç yöntemin trafiğidir: klasikte her okuma ayrı mesaj, Uyuyan Bulutta günde birkaç özet. Depolama silindirleri farkı gösterir.</p>',
    l: ['Üstteki düğmelerle hatları açıp kapatabilirsiniz.', 'Kesikli kırmızı çizgi: bildirim servisi hayvanın sahibini kayıttan sorar.', 'Sağ panelde son bildirimler: kime, hangi kanaldan, ne yazdı.'] },
  { b: '30 günlük sonuçlar', s: 'sonuc', git: function () {},
    m: '<p>Dört bağlantı profili için 30 günlük deney: Uyuyan Bulut buluta giden mesajı ve depolamayı büyük ölçüde azaltır, alarmları ise klasik yapıdan daha önce ulaştırır.</p>',
    l: ['Bağlantının en kötü olduğu P3\'te klasik yapıda alarmların bir kısmı hiç ulaşmaz.', 'Sonuçlar modelin varsayımlarına bağlıdır (notta yazılı).'] }
];
var adim = 0;
function hizAyarla(v) { hiz = v; birikim = 0; $('speed').value = String(v); }
var ADIM_HIZ = [30, 15, 6, 6, 6, 6, 15, 6, 60, 60];
function adimGoster(i, calistir) {
  adim = kisit(i, 0, ADIMLAR.length - 1);
  var a = ADIMLAR[adim];
  $('stepno').textContent = (adim + 1) + ' / ' + ADIMLAR.length;
  $('stitle').textContent = a.b; $('stext').innerHTML = a.m;
  $('slook').innerHTML = a.l.map(function (x) { return '<li>' + x + '</li>'; }).join('');
  $('prev').disabled = adim === 0; $('next').textContent = adim === ADIMLAR.length - 1 ? 'Başa dön' : 'Sonraki →';
  Array.prototype.forEach.call($('dots').children, function (b, k) { if (k === adim) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  if (calistir) { sahneSec(a.s); a.git(); sahneSec(a.s); hizAyarla(ADIM_HIZ[adim]); oynuyor = true; oynatDugme(); }
}

// ---------- canlı panel ----------
var KISA = { K: 'Klasik', S: 'Sis + anlık', U: 'Uyuyan Bulut' };
function panel() {
  if (!sim) return;
  var st = sim.state(), d = Math.floor(st.t / 1440) + 1;
  $('dayl').textContent = 'Gün ' + d; $('time').textContent = saat(st.t);
  var dc = uzak(st.coban.x, st.coban.y, WD.agil.x, WD.agil.y);
  var chips = [['Ağılda internet', st.wan, st.wan ? 'var' : 'yok'], ['Çobanın telefonu', st.tel, st.tel ? 'çekiyor' : 'çekmiyor'], ['Çoban ağ geçidi menzilinde', st.gwCoban, st.gwCoban ? 'evet' : 'hayır']];
  $('chips').innerHTML = chips.map(function (c) { return '<span class="chip ' + (c[1] ? 'on' : 'off') + '">' + c[0] + ': ' + c[2] + '</span>'; }).join('');
  var maxM = Math.max(1, st.ST.K.msgs), maxD = Math.max(1, st.ST.K.store);
  var satir = function (s, v, mx, fmt) { return '<div class="row"><span>' + KISA[s] + '</span><span class="bar"><i style="width:' + Math.max(0.6, v / mx * 100).toFixed(1) + '%;background:var(--' + s.toLowerCase() + ')"></i></span><span class="v">' + fmt + '</span></div>'; };
  var h = '<h3>Buluta giden mesaj</h3>' + STR.map(function (s) { return satir(s, st.ST[s].msgs, maxM, sayi(st.ST[s].msgs)); }).join('');
  h += '<h3>Bulut depolama</h3>' + STR.map(function (s) { return satir(s, st.ST[s].store, maxD, sayi(st.ST[s].store / 1e6, 2) + ' MB'); }).join('');
  var al = STR.map(function (s) { var S = st.ST[s], u = 0, b = 0; S.alarms.forEach(function (a) { if (a.tDel !== null) u++; else b++; }); return KISA[s] + ' ' + u + (b ? ' (+' + b + ' bekliyor)' : ''); });
  h += '<h3>Çobana ulaşan alarm</h3><div class="lbl">' + al.join(' · ') + '</div>';
  if (KAYIT) {
    h += '<h3>Bildirim servisi ⑭ · push ' + sayi(bildirimSay.push) + ' · SMS ' + sayi(bildirimSay.SMS) + '</h3>';
    h += bildirimGecmis.length ? bildirimGecmis.slice(0, 3).map(function (b) {
      return '<div class="lbl"><b>' + gunSaat(b.t) + ' · ' + b.alici + ' ' + b.kisi + ' (' + b.kanal + ')</b><br>' + b.mesaj + '</div>';
    }).join('') : '<div class="lbl">Acil olay buluta ulaşınca kayda bakılır; çobana ve hayvanın sahibine bildirim gider.</div>';
  }
  $('cmp').innerHTML = h;
  aciklama();
}
var TUR_METIN = {
  kopma: function (a) { return a + ' sürüden ayrıldı'; }, hareketsiz: function (a) { return a + ' hareketsiz kaldı'; },
  yasak: function (a) { return a + ' sürüsüyle yasak alana girdi'; }, eksik: function (a) { return 'Akşam sayımı: ' + a + ' ağıla dönmedi'; }
};
var sonLogN = -1;
function olayAkisi() {
  var st = sim.state(), ms = sim.matchEvents();
  var evs = st.events.slice(-24).reverse();
  if (!evs.length) { $('log').innerHTML = '<p class="empty">Henüz olay yok. Sürüden ayrılan, hareketsiz kalan ya da yasak alana giren hayvanlar burada görünür.</p>'; return; }
  $('log').innerHTML = evs.map(function (ev) {
    var tags = STR.map(function (s) {
      var m = ms[s][ev.id], g = m ? m.gecikme : null;
      if (g === null) return '<span class="tag ' + s + ' wait">' + KISA[s] + ': bekliyor</span>';
      return '<span class="tag ' + s + '">' + KISA[s] + ': ' + saat(ev.t0 + g) + ' (' + sure(g) + ')</span>';
    }).join('');
    var sh = sahipAdi(ev.dev);
    return '<div class="ev"><span class="t">' + gunSaat(ev.t0) + '</span><span class="txt">' + TUR_METIN[ev.tur](hayvanAdi(ev.dev) + (sh && ev.tur !== 'yasak' ? ' (' + sh + ')' : '')) + '</span><div class="dl">' + tags + '</div></div>';
  }).join('');
}
function sonuclar() {
  var D = window.TOPLU_DENEY; if (!D) return;
  var head = '<thead><tr><th>Profil</th><th>Yöntem</th><th>Mesaj / gün</th><th>Veri KB / gün</th><th>Depolama MB / yıl</th><th>Modem dk / gün</th><th>Medyan gecikme</th><th>p95 gecikme</th><th>15 dk içinde</th><th>Ulaşmayan</th></tr></thead>', body = '';
  ['P1', 'P2', 'P3', 'P4'].forEach(function (p) {
    STR.forEach(function (s, j) {
      var r = D.sonuc[p + '|' + s];
      body += '<tr class="' + s + '"><td>' + (j === 0 ? p + ' · ' + Sim.PROFILES[p].ad : '') + '</td><td>' + Sim.STRAT_AD[s] + '</td><td class="num">' + sayi(r.mesajGun, 1) + '</td><td class="num">' + sayi(r.kbGun, 1) + '</td><td class="num">' + sayi(r.depoMBYil, 1) + '</td><td class="num">' + sayi(r.modemDkGun, 1) + '</td><td class="num">' + sure(r.medyan) + '</td><td class="num">' + sure(r.p95) + '</td><td class="num">%' + sayi(r.ilk15dk * 100, 0) + '</td><td class="num">%' + sayi(r.kacanOran * 100, 0) + '</td></tr>';
    });
  });
  $('batch').innerHTML = head + '<tbody>' + body + '</tbody>';
  function grafik(baslik, alan, bicim) {
    var mx = 0; ['P1', 'P2', 'P3', 'P4'].forEach(function (p) { ['K', 'U'].forEach(function (s) { var v = D.sonuc[p + '|' + s][alan]; if (v !== null && v > mx) mx = v; }); });
    var h = '<div class="b"><h3>' + baslik + '</h3>';
    ['P1', 'P2', 'P3', 'P4'].forEach(function (p) {
      ['K', 'U'].forEach(function (s) {
        var v = D.sonuc[p + '|' + s][alan];
        h += '<div class="r"><span>' + (s === 'K' ? p : '') + '</span><span class="bar"><i style="width:' + (v === null ? 0 : Math.max(0.6, v / mx * 100)).toFixed(1) + '%;background:var(--' + s.toLowerCase() + ')"></i></span><span class="v">' + bicim(v) + '</span></div>';
      });
    });
    return h + '</div>';
  }
  $('bars').innerHTML = '<p class="note" style="grid-column:1/-1;margin:0"><i class="sw" style="background:var(--k)"></i> Klasik (bulut merkezli) &nbsp; <i class="sw" style="background:var(--u)"></i> Sis + Uyuyan Bulut</p>' + grafik('Buluta mesaj / gün (Klasik ve Uyuyan Bulut)', 'mesajGun', function (v) { return sayi(v, 0); }) +
    grafik('Modem açık dk / gün', 'modemDkGun', function (v) { return sayi(v, 0); }) +
    grafik('Alarmın çobana medyan gecikmesi', 'medyan', function (v) { return sure(v); });
  $('batchnote').textContent = 'Her profil ' + D.tohumlar.length + ' farklı senaryoyla ' + D.gun + ' gün koşturuldu. Gecikme, olay anından alarmın çobanın telefonuna ulaşmasına kadar geçen süredir. "Ulaşmayan": deney süresi içinde çobana hiç ulaşmayan alarm. Sonuçlar modelin varsayımlarına bağlıdır: 15 dakikalık okuma aralığı, 400 m kopma eşiği, 1 saatlik hareketsizlik eşiği ve profillerdeki bağlantı süreleri.';
}
