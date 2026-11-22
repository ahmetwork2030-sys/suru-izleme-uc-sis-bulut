/* Sürü İzleme Simülatörü — arayüz */
(function () {
  'use strict';
  var Sim = window.SuruSim, WD = Sim.WORLD, STR = Sim.STRATS;
  function $(id) { return document.getElementById(id); }
  var profil = 'P2', seed = 11, sim = null, spf = 1, frame = 0, acc = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var playing = !reduce;
  var C = {};
  var NOTLAR = {
    P1: 'İnternet ve telefon kapsaması her yerde.',
    P2: 'Ağılda internet çoğu zaman var; telefon yalnızca köyün 1,5 km çevresinde çeker.',
    P3: 'Ağılın interneti ortalama 2,5 günde bir yarım saat gelir; telefon yalnızca tepedeki kapsama noktasında çeker.',
    P4: 'Ormanda LoRa menzili kısalır: ağ geçidi 600 m, çobanın cihazı 350 m. İnternet yarı yarıya, telefon ara ara çeker.'
  };
  var RENK = { K: '--k', S: '--s', U: '--u' };
  var KISA = { K: 'Klasik', S: 'Sis + anlık', U: 'Uyuyan Bulut' };

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ['--map-grass', '--map-grass-2', '--map-forest', '--map-line', '--map-text', '--zone', '--zone-line', '--yasak',
     '--dot-led', '--dot-lora', '--dot-lead', '--coban', '--alarm', '--ok', '--surface', '--k', '--s', '--u', '--fg']
      .forEach(function (n) { C[n] = cs.getPropertyValue(n).trim(); });
  }

  // ---------- süre biçimi ----------
  function sure(dk) {
    if (dk === null || dk === undefined) return '—';
    dk = Math.round(dk);
    if (dk < 60) return dk + ' dk';
    var g = Math.floor(dk / 1440), s = Math.floor((dk % 1440) / 60), m = dk % 60;
    if (g > 0) return g + ' gün ' + s + ' sa';
    return s + ' sa ' + (m ? m + ' dk' : '');
  }
  function sayi(v, d) { return v.toLocaleString('tr-TR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function zaman(t) { return 'Gün ' + (Math.floor(t / 1440) + 1) + ' · ' + Sim.hhmm(t); }

  // ---------- kontroller ----------
  var pbox = $('profiles');
  Object.keys(Sim.PROFILES).forEach(function (k) {
    var p = Sim.PROFILES[k], b = document.createElement('button');
    b.type = 'button'; b.textContent = p.kod; b.title = p.ad + ' · ' + p.ortam;
    b.setAttribute('aria-pressed', String(k === profil));
    b.addEventListener('click', function () {
      profil = k;
      Array.prototype.forEach.call(pbox.children, function (c) { c.setAttribute('aria-pressed', String(c.textContent === profil)); });
      reset();
    });
    pbox.appendChild(b);
  });
  $('speed').addEventListener('change', function (e) { spf = +e.target.value; acc = 0; });
  $('play').addEventListener('click', function () { playing = !playing; playBtn(); });
  $('day').addEventListener('click', function () { sim.run(1440); draw(); panel(); logRender(); });
  $('reset').addEventListener('click', function () { seed += 1; reset(); });
  function playBtn() { $('play').textContent = playing ? 'Duraklat' : 'Başlat'; }

  function reset() {
    kapiSifirla();
    sim = Sim.create({ profile: profil, seed: seed, yayin: kapiYayin });
    sim.run(1440 + 600);                    // 2. gün 10:00'dan başla: sürü merada
    KAPI.anim = null; kapiCiz();
    var p = Sim.PROFILES[profil];
    $('pnote').textContent = p.kod + ' · ' + p.ad + ' (' + p.ortam + '). ' + NOTLAR[profil];
    draw(); panel(); logRender();
  }

  // ---------- harita ----------
  var cv = $('map'), ctx = cv.getContext('2d');
  function fit() {
    var dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 800;
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * 5 / 8);
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(cv); else window.addEventListener('resize', fit);

  function draw() {
    if (!sim) return;
    var st = sim.state(), P = st.P, prof = st.prof;
    var cw = cv.width, ch = cv.height, s = cw / WD.W, dpr = window.devicePixelRatio || 1;
    function X(v) { return v * s; } function Y(v) { return v * s; }
    ctx.clearRect(0, 0, cw, ch);
    // zemin
    ctx.fillStyle = prof.orman ? C['--map-forest'] : C['--map-grass'];
    ctx.fillRect(0, 0, cw, ch);
    if (prof.orman) {
      ctx.fillStyle = C['--map-grass'];
      ctx.beginPath(); ctx.arc(X(WD.agil.x), Y(WD.agil.y), WD.ormanDisiR * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C['--map-line'];
      for (var gx = 120; gx < WD.W; gx += 260) for (var gy = 120; gy < WD.H; gy += 260) {
        var jx = gx + ((gy * 7) % 90), jy = gy + ((gx * 3) % 80);
        if (Math.hypot(jx - WD.agil.x, jy - WD.agil.y) < WD.ormanDisiR) continue;
        ctx.beginPath(); ctx.arc(X(jx), Y(jy), 2.2 * dpr, 0, Math.PI * 2); ctx.fill();
      }
    }
    // meralar
    var fpx = Math.max(9, Math.min(12, cw / dpr / 70));
    ctx.font = (fpx * dpr) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    WD.meralar.forEach(function (m, i) {
      ctx.fillStyle = C['--map-grass-2'];
      ctx.beginPath(); ctx.ellipse(X(m.x), Y(m.y), 700 * s, 520 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C['--map-text'];
      ctx.fillText('Mera ' + 'ABCD'[i], X(m.x), Y(m.y - 560));
    });
    // telefon kapsaması
    ctx.fillStyle = C['--zone'];
    var tel = prof.tel;
    if (tel.tip === 'koy') { ctx.beginPath(); ctx.arc(X(WD.agil.x), Y(WD.agil.y), tel.r * s, 0, Math.PI * 2); ctx.fill(); }
    if (tel.tip === 'tepe') {
      ctx.beginPath(); ctx.arc(X(WD.tepe.x), Y(WD.tepe.y), tel.r * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C['--map-text']; ctx.fillText('Kapsama noktası (tepe)', X(WD.tepe.x), Y(WD.tepe.y + tel.r + 160));
    }
    if (tel.tip === 'markov') { ctx.beginPath(); ctx.arc(X(WD.agil.x), Y(WD.agil.y), tel.koyR * s, 0, Math.PI * 2); ctx.fill(); }
    // yasak alan
    var yz = WD.yasak;
    ctx.save();
    ctx.beginPath(); yz.forEach(function (p, i) { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); }); ctx.closePath();
    ctx.globalAlpha = 0.16; ctx.fillStyle = C['--yasak']; ctx.fill(); ctx.globalAlpha = 1;
    ctx.clip();
    ctx.strokeStyle = C['--yasak']; ctx.lineWidth = 1 * dpr; ctx.globalAlpha = 0.5;
    for (var hx = yz[0].x - 600; hx < yz[1].x + 600; hx += 70) { ctx.beginPath(); ctx.moveTo(X(hx), Y(yz[0].y)); ctx.lineTo(X(hx + 500), Y(yz[2].y)); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = C['--yasak']; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); yz.forEach(function (p, i) { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); }); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = C['--yasak']; ctx.fillText('Ekili tarla (yasak alan)', X((yz[0].x + yz[1].x) / 2), Y(yz[0].y - 70));
    // menziller
    ctx.setLineDash([6 * dpr, 5 * dpr]); ctx.lineWidth = 1.2 * dpr; ctx.strokeStyle = C['--zone-line'];
    var gr = prof.orman ? P.gwRangeOrman : P.gwRange;
    ctx.beginPath(); ctx.arc(X(WD.agil.x), Y(WD.agil.y), gr * s, 0, Math.PI * 2); ctx.stroke();
    var cr = prof.orman && Math.hypot(st.coban.x - WD.agil.x, st.coban.y - WD.agil.y) > WD.ormanDisiR ? P.cepRangeOrman : P.cepRange;
    ctx.beginPath(); ctx.arc(X(st.coban.x), Y(st.coban.y), cr * s, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // ağıl
    var ax = X(WD.agil.x), ay = Y(WD.agil.y), aw = 22 * dpr;
    ctx.fillStyle = C['--surface']; ctx.strokeStyle = C['--fg']; ctx.lineWidth = 1.5 * dpr;
    ctx.fillRect(ax - aw / 2, ay - aw / 2, aw, aw); ctx.strokeRect(ax - aw / 2, ay - aw / 2, aw, aw);
    ctx.fillStyle = st.wan ? C['--ok'] : C['--alarm'];
    ctx.beginPath(); ctx.arc(ax + aw / 2 + 8 * dpr, ay - aw / 2, 5 * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C['--map-text']; ctx.textAlign = 'left';
    ctx.fillText('Ağıl · sabit sis düğümü', ax - aw / 2, ay + aw / 2 + 14 * dpr);
    ctx.fillText(st.wan ? 'internet var' : 'internet yok', ax + aw / 2 + 16 * dpr, ay - aw / 2 + 4 * dpr);
    // hayvanlar
    var n = st.N;
    for (var i = n - 1; i >= 0; i--) {
      var k = st.kind[i], md = st.mode[i];
      if (st.inside[i]) continue;
      var r = k === 0 ? 4.5 : k === 1 ? 2.6 : 1.7;
      var col = k === 0 ? C['--dot-lead'] : k === 1 ? C['--dot-lora'] : C['--dot-led'];
      if (md !== 0) col = C['--alarm'];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(X(st.x[i]), Y(st.y[i]), r * dpr, 0, Math.PI * 2); ctx.fill();
      if (md !== 0 || k === 0) {
        ctx.strokeStyle = md !== 0 ? C['--alarm'] : C['--fg']; ctx.lineWidth = 1 * dpr;
        ctx.beginPath(); ctx.arc(X(st.x[i]), Y(st.y[i]), (r + (md !== 0 ? 5 : 1.5)) * dpr, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // ağıldaki hayvan sayısı
    var ic = 0; for (i = 0; i < n; i++) if (st.inside[i]) ic++;
    if (ic) { ctx.fillStyle = C['--map-text']; ctx.fillText(ic + ' hayvan ağılda', ax - aw / 2, ay + aw / 2 + 28 * dpr); }
    // çoban
    var cx = X(st.coban.x), cy = Y(st.coban.y);
    ctx.fillStyle = C['--coban'];
    ctx.beginPath(); ctx.moveTo(cx, cy - 8 * dpr); ctx.lineTo(cx + 6 * dpr, cy + 5 * dpr); ctx.lineTo(cx - 6 * dpr, cy + 5 * dpr); ctx.closePath(); ctx.fill();
    ctx.fillText('Çoban · mobil sis', cx + 9 * dpr, cy + 4 * dpr);
    // ölçek
    ctx.strokeStyle = C['--map-text']; ctx.lineWidth = 2 * dpr;
    var sx = cw - X(1000) - 16 * dpr, sy = ch - 14 * dpr;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + X(1000), sy); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillText('1 km', sx + X(500), sy - 6 * dpr);
  }

  // ---------- panel ----------
  function panel() {
    var st = sim.state();
    $('dayl').textContent = 'Gün ' + (Math.floor(st.t / 1440) + 1);
    $('time').textContent = Sim.hhmm(st.t);
    var chips = [
      ['Ağılda internet', st.wan, st.wan ? 'var' : 'yok'],
      ['Çobanın telefonu', st.tel, st.tel ? 'çekiyor' : 'çekmiyor'],
      ['Çoban ağılın LoRa menzilinde', st.gwCoban, st.gwCoban ? 'evet' : 'hayır']
    ];
    $('chips').innerHTML = chips.map(function (c) { return '<span class="chip ' + (c[1] ? 'on' : 'off') + '">' + c[0] + ': ' + c[2] + '</span>'; }).join('');
    var maxMsg = Math.max(1, st.ST.K.msgs, st.ST.S.msgs, st.ST.U.msgs);
    $('strats').innerHTML = STR.map(function (s) {
      var S = st.ST[s], del = 0, bek = 0;
      S.alarms.forEach(function (a) { if (a.tDel !== null) del++; else bek++; });
      return '<div class="strat"><h3><i class="dot" style="background:var(' + RENK[s] + ')"></i>' + Sim.STRAT_AD[s] + '</h3>' +
        '<div class="kv">' +
        '<div><span class="k">Buluta mesaj</span><span class="v">' + sayi(S.msgs) + '</span></div>' +
        '<div><span class="k">Hattan veri</span><span class="v">' + sayi(S.bytes / 1024) + ' KB</span></div>' +
        '<div><span class="k">Modem açık</span><span class="v">' + sayi(S.modemMin) + ' dk</span></div>' +
        '<div><span class="k">Bulut depolama</span><span class="v">' + sayi(S.store / 1e6, 2) + ' MB</span></div>' +
        '<div><span class="k">Ulaşan alarm</span><span class="v">' + del + '</span></div>' +
        '<div><span class="k">Bekleyen alarm</span><span class="v">' + bek + '</span></div>' +
        '</div><div class="bar" title="Buluta giden mesaj, en yüksek yönteme göre"><i style="width:' + Math.max(0.5, S.msgs / maxMsg * 100).toFixed(1) + '%;background:var(' + RENK[s] + ')"></i></div></div>';
    }).join('');
  }

  // ---------- ağıl kapısı (Wokwi'deki okuyucunun ve etiketin karşılığı) ----------
  // Motor her kapı geçişinde ve akşam sayımında bir olay yayar; Docker'daki yayıncı da aynı olayları kullanır.
  // Etiket numarası Wokwi'dekiyle aynıdır: 1000 + hayvan sırası; NEC kodu adres = no / 256, komut = no % 256.
  var KAPI;
  function kapiSifirla() {
    KAPI = { sira: 0, gun: -1, cikis: 0, giris: 0, ser: [], l1: 'Icerde 500/500', l2: 'Kapi hazir', yesil: 0, kirmizi: false,
             anim: null, sonSayim: '', degisti: true };
  }
  function pad16(x) { x = String(x); return (x + '                ').slice(0, 16); }
  function kapiSaat(t) { return 'Gün ' + (Math.floor(t / 1440) + 1) + ' ' + Sim.hhmm(t); }
  function serialPush(html) { KAPI.ser.push(html); if (KAPI.ser.length > 60) KAPI.ser.shift(); }
  function kapiYayin(e) {
    if (e.tur !== 'kapi' && e.tur !== 'sayim') return;
    KAPI.degisti = true;
    var d = Math.floor(e.t / 1440);
    if (d !== KAPI.gun) { KAPI.gun = d; KAPI.cikis = 0; KAPI.giris = 0; KAPI.kirmizi = false; }
    var N = sim ? sim.state().N : 500;
    if (e.tur === 'kapi') {
      var no = 1000 + e.dev, giris = e.yon === 'giris';
      KAPI.sira++;
      if (giris) KAPI.giris++; else KAPI.cikis++;
      KAPI.l1 = 'LED ' + no + ' ' + (giris ? 'GIRIS' : 'CIKIS');
      KAPI.l2 = 'Icerde ' + e.icerde + '/' + N;
      KAPI.yesil = 8;
      KAPI.anim = { no: no, giris: giris, f: 0 };
      serialPush('<span class="k">bis505-suru/agil1/kapi</span> {"sira":' + KAPI.sira + ',"etiket":' + no + ',"yon":"' + e.yon +
                 '","t":"' + kapiSaat(e.t) + '","icerde":' + e.icerde + '}');
    } else {
      var eksik = e.eksik.map(function (i) { return 1000 + i; });
      if (eksik.length) { KAPI.l1 = 'EKSIK: ' + eksik.length + ' hayvan'; KAPI.l2 = 'Ilk: ' + eksik[0]; KAPI.kirmizi = true; }
      else { KAPI.l1 = 'Sayim tamam'; KAPI.l2 = 'Eksik yok'; KAPI.kirmizi = false; }
      KAPI.sonSayim = kapiSaat(e.t) + ': ' + e.icerde + '/' + N + ' içeride, ' + eksik.length + ' eksik';
      serialPush('<span class="s">bis505-suru/agil1/sayim</span> {"icerde":' + e.icerde + ',"toplam":' + N + ',"eksik":[' +
                 eksik.slice(0, 40).join(',') + '],"t":"' + kapiSaat(e.t) + '"}');
    }
  }
  // Son geçişin koridordaki sırası: girişte dış bariyer → etiket okuma → iç bariyer, çıkışta tersi
  function kapiCiz() {
    var a = KAPI.anim, adim = -1, ADIM_KARE = spf <= 0.1 ? 20 : spf <= 0.25 ? 14 : spf <= 0.5 ? 10 : 7;
    if (a) { adim = Math.floor(a.f / ADIM_KARE); if (adim > 3) { KAPI.anim = null; a = null; adim = -1; } }
    var sira = a && !a.giris ? ['g-ic', 'g-ir', 'g-dis'] : ['g-dis', 'g-ir', 'g-ic'];
    ['g-dis', 'g-ir', 'g-ic'].forEach(function (id) { $(id).classList.toggle('on', a !== null && sira.indexOf(id) === Math.min(adim, 2)); });
    $('g-irtxt').textContent = a && adim >= 1 ? a.no + ' · adres ' + (a.no >> 8) + ', komut ' + (a.no & 255) : 'etiket bekleniyor';
    $('g-dir').textContent = a ? (a.giris ? 'Mera → Ağıl · GİRİŞ' : 'Ağıl → Mera · ÇIKIŞ') : '';
    $('g-led-g').classList.toggle('on', KAPI.yesil > 0);
    $('g-led-r').classList.toggle('on', KAPI.kirmizi);
    if (a) a.f++;
    if (KAPI.yesil > 0) KAPI.yesil--;
    if (!KAPI.degisti) return;
    KAPI.degisti = false;
    $('g-l1').textContent = pad16(KAPI.l1); $('g-l2').textContent = pad16(KAPI.l2);
    $('g-stats').innerHTML = '<span>Bugün çıkış: ' + KAPI.cikis + ' · giriş: ' + KAPI.giris + ' · toplam kayıt: ' + KAPI.sira + '</span>' +
      '<span>Son akşam sayımı: ' + (KAPI.sonSayim || 'henüz yok') + '</span>';
    var se = $('g-serial');
    se.innerHTML = KAPI.ser.length ? KAPI.ser.slice().reverse().join('<br>') : 'Kapı iletisi bekleniyor…';
  }
  $('gotoEve').addEventListener('click', function () {
    var t = sim.t, hedef = Math.floor(t / 1440) * 1440 + 19 * 60 + 5;   // gruplar 19:20-20:00 arası döner
    if (t >= hedef) hedef += 1440;
    sim.run(hedef - t);
    spf = 0.25; acc = 0; $('speed').value = '0.25';
    playing = true; playBtn();
    draw(); panel(); logRender(); kapiCiz();
  });

  // ---------- olay akışı ----------
  var TUR_METIN = {
    kopma: function (a) { return a + ' sürüden ayrıldı'; },
    hareketsiz: function (a) { return a + ' hareketsiz kaldı'; },
    yasak: function (a) { return a + ' sürüsüyle yasak alana girdi'; },
    eksik: function (a) { return 'Akşam sayımı: ' + a + ' ağıla dönmedi'; }
  };
  function logRender() {
    var st = sim.state(), ms = sim.matchEvents();
    var evs = st.events.slice(-24).reverse();
    if (!evs.length) { $('log').innerHTML = '<p class="empty">Henüz olay yok. Simülasyon ilerledikçe sürüden ayrılan, hareketsiz kalan ya da yasak alana giren hayvanlar burada görünür.</p>'; return; }
    $('log').innerHTML = evs.map(function (ev) {
      var tags = STR.map(function (s) {
        var m = ms[s][ev.id], g = m ? m.gecikme : null;
        if (g === null) return '<span class="tag ' + s + ' wait">' + KISA[s] + ': bekliyor</span>';
        return '<span class="tag ' + s + '">' + KISA[s] + ': ' + Sim.hhmm(ev.t0 + g) + ' (' + sure(g) + ')</span>';
      }).join('');
      return '<div class="ev"><span class="t">' + zaman(ev.t0) + '</span><span class="txt">' + TUR_METIN[ev.tur](sim.animalName(ev.dev)) + '</span><div class="dl">' + tags + '</div></div>';
    }).join('');
  }

  // ---------- toplu deney tablosu ----------
  function batch() {
    var D = window.TOPLU_DENEY;
    if (!D) return;
    var head = '<thead><tr><th>Profil</th><th>Yöntem</th><th>Mesaj / gün</th><th>Veri KB / gün</th><th>Depolama MB / yıl</th><th>Modem dk / gün</th><th>Medyan gecikme</th><th>p95 gecikme</th><th>15 dk içinde</th><th>Ulaşmayan</th></tr></thead>';
    var body = '';
    ['P1', 'P2', 'P3', 'P4'].forEach(function (p) {
      STR.forEach(function (s, j) {
        var r = D.sonuc[p + '|' + s];
        body += '<tr class="' + s + '"><td>' + (j === 0 ? p + ' · ' + Sim.PROFILES[p].ad : '') + '</td><td>' + Sim.STRAT_AD[s] + '</td>' +
          '<td class="num">' + sayi(r.mesajGun, 1) + '</td><td class="num">' + sayi(r.kbGun, 1) + '</td><td class="num">' + sayi(r.depoMBYil, 1) + '</td>' +
          '<td class="num">' + sayi(r.modemDkGun, 1) + '</td><td class="num">' + sure(r.medyan) + '</td><td class="num">' + sure(r.p95) + '</td>' +
          '<td class="num">%' + sayi(r.ilk15dk * 100, 0) + '</td><td class="num">%' + sayi(r.kacanOran * 100, 0) + '</td></tr>';
      });
    });
    $('batch').innerHTML = head + '<tbody>' + body + '</tbody>';
    $('batchnote').textContent = 'Her profil ' + D.tohumlar.length + ' farklı senaryoyla ' + D.gun + ' gün koşturuldu. Gecikme, olay anından alarmın çobanın telefonuna ulaşmasına kadar geçen süredir; akşam sayımındaki eksikte sayım anından ölçülür. "Ulaşmayan": deney süresi içinde çobana hiç ulaşmayan alarm. Sonuçlar modelin varsayımlarına bağlıdır: 15 dakikalık okuma aralığı, 400 m kopma eşiği, 1 saatlik hareketsizlik eşiği ve profillerdeki bağlantı süreleri.';
  }

  // ---------- döngü ----------
  function loop() {
    if (playing && sim) {
      acc += spf;
      var n = Math.floor(acc);
      acc -= n;
      if (n > 0) { sim.run(n); draw(); }
      frame++;
      if (frame % 4 === 0) panel();
      if (frame % 20 === 0) logRender();
    }
    if (sim) kapiCiz();
    requestAnimationFrame(loop);
  }

  readColors();
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColors(); draw(); });
  new MutationObserver(function () { readColors(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  playBtn();
  batch();
  reset();
  fit();
  requestAnimationFrame(loop);
})();
