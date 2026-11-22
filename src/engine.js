/*
 * Sürü İzleme Simülatörü — hesap motoru
 * BIS505 Dönem Projesi · Ahmet ATAGÜL
 *
 * Aynı dünya (sürü hareketi, cihaz okumaları, bağlantı durumu) üzerinde üç stratejiyi
 * birlikte çalıştırır ve karşılaştırır:
 *   K  Klasik (bulut merkezli): her kayıt ayrı mesajla buluta gider, alarm bulutta üretilir.
 *   S  Sis + anlık iletim: alarm sis katmanında üretilir, her kayıt yine ayrı mesajla buluta gider.
 *   U  Sis + "Uyuyan Bulut": alarm sis katmanında, acil olay hemen, rutin veri günlük özet olarak gider.
 * Zaman adımı 1 dakikadır. Tarayıcıda (window.SuruSim) ve Node'da (require) çalışır.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SuruSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- yardımcılar ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function inPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function hhmm(t) {
    var m = ((t % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }

  // ---------- dünya ve parametreler ----------
  var WORLD = {
    W: 8000, H: 5000,                       // metre
    agil: { x: 900, y: 2500 },              // ağıl / köy: sabit sis düğümü ve LoRa ağ geçidi
    agilR: 120,
    meralar: [{ x: 3000, y: 1600 }, { x: 4300, y: 3300 }, { x: 5700, y: 2200 }, { x: 3500, y: 4000 }],
    yasak: [{ x: 4500, y: 4300 }, { x: 5000, y: 4300 }, { x: 5000, y: 4700 }, { x: 4500, y: 4700 }],   // ekili tarla
    tepe: { x: 5000, y: 1250 },             // P3: tek kapsama noktası
    ormanDisiR: 700                         // P4: ağılın çevresindeki açıklık
  };

  var PROFILES = {
    P1: { kod: 'P1', ad: 'Sürekli bağlantı', ortam: 'Ahır ve yakın mera', orman: false,
          wan: { always: true }, tel: { tip: 'her' } },
    P2: { kod: 'P2', ad: 'Günlük aralıklı', ortam: 'Köy ve mandıra sürüsü', orman: false,
          wan: { upMean: 20 * 60, downMean: 60 }, tel: { tip: 'koy', r: 1500 } },
    P3: { kod: 'P3', ad: 'Uzun kesinti', ortam: 'Yayla, göçer sürü', orman: false,
          wan: { upMean: 30, downMean: 60 * 60 }, tel: { tip: 'tepe', r: 450 } },
    P4: { kod: 'P4', ad: 'Sinyal gölgeli', ortam: 'Orman, kanyon', orman: true,
          wan: { upMean: 120, downMean: 120 }, tel: { tip: 'markov', upMean: 30, downMean: 90, koyR: 800 } }
  };

  var DEFAULTS = {
    N: 500, TASMA: 5, ETIKET: 25,
    period: 15,                    // okuma aralığı (dk)
    gwRange: 5000, gwRangeOrman: 600,
    cepRange: 1500, cepRangeOrman: 350,
    relayRange: 300, relayRangeOrman: 200,
    kopmaEsik: 400, kopmaArdisik: 2,
    hareketsizEsik: 8, hareketsizArdisik: 4,
    recB: 100, ovhB: 150, acilB: 200, statusB: 100,
    ozetHayvanB: 1200, ozetSayimB: 2000, sikistirma: 3,
    ozetSaat: 120,                 // 02:00
    sayimSon: 23 * 60,             // dönüş gecikirse sayım en geç 23:00'te
    pKopma: 0.35, pLedKayip: 0.5, pHareketsiz: 0.3, pYasak: 0.25
  };

  var STRATS = ['K', 'S', 'U'];
  var STRAT_AD = { K: 'Klasik (bulut merkezli)', S: 'Sis + anlık iletim', U: 'Sis + Uyuyan Bulut' };
  var TUR_AD = { kopma: 'Sürüden ayrılma', hareketsiz: 'Hareketsizlik', yasak: 'Yasak alan', eksik: 'Akşam sayımında eksik' };

  function create(opts) {
    opts = opts || {};
    var P = Object.assign({}, DEFAULTS, opts.params || {});
    var prof = PROFILES[opts.profile || 'P2'];
    var rnd = mulberry32((opts.seed || 1) >>> 0);
    // isteğe bağlı yayın kancası: Docker gösteriminde okumalar, kapı geçişleri ve sayım MQTT'ye aktarılır
    var yayin = typeof opts.yayin === 'function' ? opts.yayin : null;
    var N = P.N, nTrack = P.TASMA + P.ETIKET;

    // --- hayvanlar ---
    // 0..4 önder (tasma), 5..29 LoRa etiketi, 30..499 LED etiketi
    var kind = new Uint8Array(N), grp = new Uint8Array(N);
    var x = new Float64Array(N), y = new Float64Array(N), ox = new Float64Array(N), oy = new Float64Array(N);
    var inside = new Uint8Array(N);       // ağılda mı
    var mode = new Uint8Array(N);         // 0 normal, 1 kaçak (hareket), 2 kaçak (bekliyor), 3 hareketsiz, 4 kayıp LED
    var modeEnd = new Float64Array(N), dirx = new Float64Array(N), diry = new Float64Array(N);
    var lastRx = new Float64Array(N), lastRy = new Float64Array(N);
    for (var i = 0; i < N; i++) {
      kind[i] = i < P.TASMA ? 0 : (i < nTrack ? 1 : 2);
      grp[i] = i < P.TASMA ? i : i % P.TASMA;
      var a = rnd() * 2 * Math.PI, r = Math.sqrt(rnd()) * 160;
      ox[i] = Math.cos(a) * r; oy[i] = Math.sin(a) * r;
      if (kind[i] === 0) { ox[i] = 0; oy[i] = 0; }
      x[i] = WORLD.agil.x + ox[i] * 0.4; y[i] = WORLD.agil.y + oy[i] * 0.4;
      lastRx[i] = x[i]; lastRy[i] = y[i];
      inside[i] = 1;
    }
    var phaseOff = new Uint8Array(N);
    for (i = 0; i < nTrack; i++) phaseOff[i] = Math.floor(rnd() * P.period);

    // önderlerin günlük durumu
    var L = [];
    for (var g = 0; g < P.TASMA; g++) L.push({ state: 'agil', tx: 0, ty: 0, cx: 0, cy: 0, nextT: 0, gateDone: true, yasakUntil: -1 });
    var coban = { x: WORLD.agil.x + 30, y: WORLD.agil.y };

    // --- bağlantı süreçleri ---
    function markov(up, down, startUp) {
      var st = { up: startUp, next: 0 };
      st.next = (startUp ? expo(up) : expo(down));
      return st;
    }
    function expo(mean) { return -Math.log(1 - rnd()) * mean; }
    var wan = prof.wan.always ? { up: true, next: Infinity } : markov(prof.wan.upMean, prof.wan.downMean, rnd() < prof.wan.upMean / (prof.wan.upMean + prof.wan.downMean));
    var telM = prof.tel.tip === 'markov' ? markov(prof.tel.upMean, prof.tel.downMean, false) : null;

    function inForest(px, py) {
      if (!prof.orman) return false;
      return dist(px, py, WORLD.agil.x, WORLD.agil.y) > WORLD.ormanDisiR;
    }
    function gwHears(i) {
      var rr = inForest(x[i], y[i]) ? P.gwRangeOrman : P.gwRange;
      return dist(x[i], y[i], WORLD.agil.x, WORLD.agil.y) <= rr;
    }
    function gwReachesCoban() {
      var rr = inForest(coban.x, coban.y) ? P.gwRangeOrman : P.gwRange;
      return dist(coban.x, coban.y, WORLD.agil.x, WORLD.agil.y) <= rr;
    }
    function cepHears(i) {
      var rr = (inForest(x[i], y[i]) || inForest(coban.x, coban.y)) ? P.cepRangeOrman : P.cepRange;
      return dist(x[i], y[i], coban.x, coban.y) <= rr;
    }
    function relayed(i) {           // LoRa etiketi, ağ geçidine ulaşamıyorsa yakındaki tasma taşır
      if (kind[i] !== 1) return false;
      var rr = inForest(x[i], y[i]) ? P.relayRangeOrman : P.relayRange;
      for (var g = 0; g < P.TASMA; g++) if (dist(x[i], y[i], x[g], y[g]) <= rr && gwHears(g)) return true;
      return false;
    }
    function relayedMobile(i) {     // röle tasma, menzildeki her LoRa alıcısına taşır; cep ağ geçidi de bir alıcıdır
      if (kind[i] !== 1) return false;
      var rr = inForest(x[i], y[i]) ? P.relayRangeOrman : P.relayRange;
      for (var g = 0; g < P.TASMA; g++) if (dist(x[i], y[i], x[g], y[g]) <= rr && cepHears(g)) return true;
      return false;
    }
    function phoneCov() {
      var t = prof.tel;
      if (t.tip === 'her') return true;
      if (t.tip === 'koy') return dist(coban.x, coban.y, WORLD.agil.x, WORLD.agil.y) <= t.r;
      if (t.tip === 'tepe') return dist(coban.x, coban.y, WORLD.tepe.x, WORLD.tepe.y) <= t.r;
      return telM.up || dist(coban.x, coban.y, WORLD.agil.x, WORLD.agil.y) <= t.koyR;
    }

    // --- strateji durumları ---
    function newStrat(id) {
      return {
        id: id, msgs: 0, bytes: 0, store: 0, modemMin: 0, sessions: 0,
        devBuf: [],               // cihazda bekleyen okumalar (bu stratejinin alıcıları duymadıysa)
        upQ: [],                  // sis/ağ geçidinde buluta gönderilmeyi bekleyen mesajlar
        cloudLast: {},            // bulutun bildiği son okumalar (K kuralları için)
        fogLast: {},              // sis düğümlerinin bildiği okumalar (S, U)
        mobBuf: [],               // mobil sisin akşam aktaracağı okumalar
        alarms: [],               // {dev, tur, tDet, tDel}
        pend: [],                 // teslim bekleyen alarmlar
        known: {},                // dev|tur|gün -> alarm verildi mi
        gateDayDone: {},
        lastSessionMin: -1,
        mobAcil: [], sentAcil: {}
      };
    }
    var ST = {}; STRATS.forEach(function (s) { ST[s] = newStrat(s); });
    for (i = 0; i < N; i++) STRATS.forEach(function (s) { ST[s].devBuf[i] = []; });

    var t = 0;                  // dakika
    var countedDay = -1;
    var events = [];            // yer gerçeği olaylar
    var log = [];
    var dayPlan = null;
    var gateToday = { exit: 0, enter: {}, enterCount: 0 };

    function logPush(txt, cls) { log.push({ t: t, txt: txt, cls: cls || '' }); if (log.length > 400) log.shift(); }
    function animalName(i) {
      if (kind[i] === 0) return 'Önder ' + (i + 1);
      return (kind[i] === 1 ? 'LoRa ' : 'LED ') + (1000 + i);
    }

    // ---------- günlük plan ----------
    function planDay(d) {
      var p = { center: [], kopma: null, led: null, hareketsiz: null, yasak: null };
      var c = WORLD.meralar[Math.floor(rnd() * WORLD.meralar.length)];
      for (var g = 0; g < P.TASMA; g++) {
        var a = rnd() * 2 * Math.PI, r = 200 + rnd() * 300;
        p.center.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
      }
      var base = d * 1440;
      if (rnd() < P.pKopma) p.kopma = { dev: P.TASMA + Math.floor(rnd() * P.ETIKET), t0: base + 600 + Math.floor(rnd() * 300), dur: 60 + Math.floor(rnd() * 90) };
      if (rnd() < P.pLedKayip) p.led = { dev: nTrack + Math.floor(rnd() * (N - nTrack)), t0: base + 600 + Math.floor(rnd() * 300), dur: 90 + Math.floor(rnd() * 90) };
      if (rnd() < P.pHareketsiz) {
        var dv; do { dv = P.TASMA + Math.floor(rnd() * P.ETIKET); } while (p.kopma && dv === p.kopma.dev);
        p.hareketsiz = { dev: dv, t0: base + 540 + Math.floor(rnd() * 420), dur: 150 + Math.floor(rnd() * 120) };
      }
      if (rnd() < P.pYasak) p.yasak = { g: Math.floor(rnd() * P.TASMA), t0: base + 660 + Math.floor(rnd() * 240), dur: 45, started: false };
      return p;
    }

    // ---------- hareket ----------
    function moveToward(i, tx, ty, v) {
      var dx = tx - x[i], dy = ty - y[i], d = Math.sqrt(dx * dx + dy * dy);
      if (d <= v || d === 0) { x[i] = tx; y[i] = ty; return true; }
      x[i] += dx / d * v; y[i] += dy / d * v; return false;
    }
    function clampWorld(i) {
      if (x[i] < 50) x[i] = 50; if (x[i] > WORLD.W - 50) x[i] = WORLD.W - 50;
      if (y[i] < 50) y[i] = 50; if (y[i] > WORLD.H - 50) y[i] = WORLD.H - 50;
    }

    function stepLeaders(m, d) {
      for (var g = 0; g < P.TASMA; g++) {
        var l = L[g];
        var depart = 420 + g * 6, ret = 1110 + g * 5;
        if (l.state === 'agil' && m >= depart && m < ret - 60) {
          l.state = 'yol'; l.cx = dayPlan.center[g].x; l.cy = dayPlan.center[g].y; l.tx = l.cx; l.ty = l.cy;
          gateExit(g);
        }
        if ((l.state === 'yol' || l.state === 'otla') && m >= ret) { l.state = 'donus'; }
        var yp = dayPlan.yasak;
        if (yp && yp.g === g && t >= yp.t0 && t < yp.t0 + yp.dur + 180 && (l.state === 'otla')) {
          l.tx = (WORLD.yasak[0].x + WORLD.yasak[2].x) / 2; l.ty = (WORLD.yasak[0].y + WORLD.yasak[2].y) / 2;
          if (inPoly(x[g], y[g], WORLD.yasak)) {
            if (!yp.started) { yp.started = true; yp.inT = t; }
            if (t >= yp.inT + yp.dur) { yp.t0 = -1e9; l.nextT = 0; }
          }
        }
        if (l.state === 'yol') {
          if (moveToward(g, l.tx, l.ty, 40)) { l.state = 'otla'; l.nextT = t; }
        } else if (l.state === 'otla') {
          if (t >= l.nextT && !(yp && yp.g === g && t >= yp.t0 && t < yp.t0 + yp.dur + 180)) {
            var a = rnd() * 2 * Math.PI, r = rnd() * 400;
            l.tx = l.cx + Math.cos(a) * r; l.ty = l.cy + Math.sin(a) * r; l.nextT = t + 25 + rnd() * 20;
          }
          var yz = yp && yp.g === g && t >= yp.t0 && t < yp.t0 + yp.dur + 180;
          if (moveToward(g, l.tx, l.ty, yz ? 30 : 12) && !yz) l.nextT = Math.min(l.nextT, t + 5);
        } else if (l.state === 'donus') {
          if (moveToward(g, WORLD.agil.x + 60, WORLD.agil.y, 48)) { l.state = 'agil'; gateEnter(g); }
        }
        clampWorld(g);
        // yer gerçeği: önder (ve sürüsü) yasak alana girdi
        var icinde = inPoly(x[g], y[g], WORLD.yasak);
        // yer gerçeği: önder yasak alana girdi (bir saatten kısa çıkışlar aynı giriş sayılır)
        if (icinde && !l.inYasak && t - (l.yasakCikis === undefined ? -1e9 : l.yasakCikis) > 60) {
          events.push({ id: events.length, tur: 'yasak', dev: g, t0: t });
          logPush(hhmm(t) + ' · ' + animalName(g) + ' sürüsüyle yasak alana girdi', 'olay');
        }
        if (!icinde && l.inYasak) l.yasakCikis = t;
        l.inYasak = icinde;
      }
    }

    function gateExit(g) {
      for (var i = 0; i < N; i++) if (grp[i] === g && inside[i] && mode[i] !== 4) { inside[i] = 0; gateToday.exit++; gateEvent(i, 'cikis'); }
    }
    function gateEnter(g) {
      for (var i = 0; i < N; i++) {
        if (grp[i] !== g || inside[i]) continue;
        if (mode[i] === 0 || mode[i] === 3) {
          inside[i] = 1; gateToday.enter[i] = t; gateToday.enterCount++; gateEvent(i, 'giris');
          x[i] = WORLD.agil.x + ox[i] * 0.4; y[i] = WORLD.agil.y + oy[i] * 0.4;
          if (mode[i] === 3) mode[i] = 0;
        }
      }
      x[g] = WORLD.agil.x; y[g] = WORLD.agil.y;
    }

    // kapı olayı = bir kayıt (her stratejide sabit sise ulaşır, K'da tek tek buluta gider)
    function gateEvent(i, yon) {
      if (yayin) { var ic = 0; for (var q = 0; q < N; q++) ic += inside[q]; yayin({ tur: 'kapi', dev: i, t: t, yon: yon, icerde: ic }); }
      STRATS.forEach(function (s) { recordAtFixed(ST[s], { dev: i, t: t, kapi: yon }); });
    }

    function stepFollowers(m) {
      var kp = dayPlan.kopma, lp = dayPlan.led, hp = dayPlan.hareketsiz;
      for (var i = P.TASMA; i < N; i++) {
        var g = grp[i];
        if (mode[i] === 0 && kp && kp.dev === i && t === kp.t0 && !inside[i]) {
          mode[i] = 1; modeEnd[i] = t + kp.dur; setAway(i);
          events.push({ id: events.length, tur: 'kopma', dev: i, t0: t });
          logPush(hhmm(t) + ' · ' + animalName(i) + ' sürüden ayrıldı', 'olay');
        }
        if (mode[i] === 0 && lp && lp.dev === i && t === lp.t0 && !inside[i]) {
          mode[i] = 4; modeEnd[i] = t + lp.dur; setAway(i);
          logPush(hhmm(t) + ' · ' + animalName(i) + ' sürüden koptu (LED etiket sahada izlenemez, akşam sayımında anlaşılır)', 'olay');
        }
        if (mode[i] === 0 && hp && hp.dev === i && t === hp.t0 && !inside[i]) {
          mode[i] = 3; modeEnd[i] = t + hp.dur;
          events.push({ id: events.length, tur: 'hareketsiz', dev: i, t0: t });
          logPush(hhmm(t) + ' · ' + animalName(i) + ' hareketsiz kaldı', 'olay');
        }
        if (inside[i]) continue;
        if (mode[i] === 1 || mode[i] === 4) {
          if (t < modeEnd[i]) { x[i] += dirx[i] * 15; y[i] += diry[i] * 15; }
          else if (mode[i] === 1) mode[i] = 2;
          clampWorld(i);
          continue;
        }
        if (mode[i] === 2) { if (m >= 21 * 60) { mode[i] = 0; inside[i] = 1; x[i] = WORLD.agil.x + ox[i] * 0.4; y[i] = WORLD.agil.y + oy[i] * 0.4; } continue; }
        if (mode[i] === 3) { if (t >= modeEnd[i]) mode[i] = 0; else continue; }
        // normal: önderin etrafındaki kişisel konum, yavaşça değişen
        if (rnd() < 0.02) {
          var a = rnd() * 2 * Math.PI, r = Math.sqrt(rnd()) * 160; ox[i] = Math.cos(a) * r; oy[i] = Math.sin(a) * r;
        }
        moveToward(i, x[g] + ox[i], y[g] + oy[i], 60);
        clampWorld(i);
      }
    }
    function setAway(i) {
      var g = grp[i], dx = x[i] - x[g], dy = y[i] - y[g], d = Math.sqrt(dx * dx + dy * dy) || 1;
      var a = Math.atan2(dy / d, dx / d) + (rnd() - 0.5);
      dirx[i] = Math.cos(a); diry[i] = Math.sin(a);
    }

    // ---------- okumalar ----------
    function stepReadings() {
      for (var i = 0; i < nTrack; i++) {
        if ((t - phaseOff[i]) % P.period !== 0) continue;
        var act = dist(x[i], y[i], lastRx[i], lastRy[i]);
        lastRx[i] = x[i]; lastRy[i] = y[i];
        var rec = { dev: i, t: t, x: x[i], y: y[i], act: act, ic: inside[i] };
        var fx = gwHears(i) || relayed(i), mo = cepHears(i) || relayedMobile(i);
        if (yayin) yayin({ tur: 'okuma', dev: i, kind: kind[i], grp: grp[i], t: t, x: x[i], y: y[i], act: act, ic: inside[i],
                           sabit: !!fx, mobil: !!mo, role: !gwHears(i) && !!fx });
        // K: yalnızca sabit ağ geçidi (paket iletici), cihaz duyulana kadar saklar
        deliverDev(ST.K, i, rec, fx, false);
        deliverDev(ST.S, i, rec, fx, mo);
        deliverDev(ST.U, i, rec, fx, mo);
      }
    }
    function deliverDev(S, i, rec, fx, mo) {
      var buf = S.devBuf[i]; buf.push(rec);
      if (!fx && !mo) return;
      for (var k = 0; k < buf.length; k++) {
        var r = buf[k];
        if (S.id === 'K') recordAtFixed(S, r);
        else {
          if (mo) fogProcess(S, r, 'mobil');
          if (fx) recordAtFixed(S, r);
          else S.mobBuf.push(r);
        }
      }
      S.devBuf[i] = [];
    }

    // sabit sise / ağ geçidine ulaşan kayıt
    function recordAtFixed(S, r) {
      if (S.id === 'K') { S.upQ.push({ kind: 'rec', r: r, b: P.recB + P.ovhB }); return; }
      fogProcess(S, r, 'sabit');
      if (S.id === 'S') S.upQ.push({ kind: 'rec', r: r, b: P.recB + P.ovhB });
      // U: ham kayıt tamponda kalır; özet gece hazırlanır
    }

    // ---------- kurallar ----------
    function ruleCheck(S, store, r, where) {
      if (r.kapi) return;
      var hist = store[r.dev] || (store[r.dev] = []);
      for (var q = 0; q < hist.length; q++) if (hist[q].t === r.t) return;   // aynı okuma bu düğüme daha önce ulaştı
      r = { dev: r.dev, t: r.t, x: r.x, y: r.y, act: r.act, ic: r.ic };
      if (where === 'mobil') {        // çobana uzaklık ve o anki menzil (sessiz cihaz kuralı için)
        r.dc = dist(r.x, r.y, coban.x, coban.y);
        r.rr = (inForest(r.x, r.y) || inForest(coban.x, coban.y)) ? P.cepRangeOrman : P.cepRange;
      }
      hist.push(r); hist.sort(function (p1, p2) { return p1.t - p2.t; }); if (hist.length > 10) hist.shift();
      var d = Math.floor(r.t / 1440);
      var disAgil = dist(r.x, r.y, WORLD.agil.x, WORLD.agil.y) > 300 && !r.ic;
      if (kind[r.dev] === 0) {
        if (inPoly(r.x, r.y, WORLD.yasak)) raise(S, r.dev, 'yasak', where, d);
        for (var f = P.TASMA; f < nTrack; f++) if (grp[f] === r.dev && store[f]) kopmaCheck(S, store, f, where, d);
        return;
      }
      if (!disAgil) return;
      // hareketsizlik
      var n = 0;
      for (var k = hist.length - 1; k >= 0 && n < P.hareketsizArdisik; k--) { if (hist[k].act < P.hareketsizEsik && !hist[k].ic) n++; else break; }
      if (n >= P.hareketsizArdisik) raise(S, r.dev, 'hareketsiz', where, d);
      // kopma: önderin aynı andaki konumuyla karşılaştır (iki önder okuması arasında enterpolasyon)
      kopmaCheck(S, store, r.dev, where, d);
    }
    function leaderAt(lh, tt) {
      var before = null, after = null;
      for (var q = 0; q < lh.length; q++) {
        if (lh[q].t <= tt && (!before || lh[q].t > before.t)) before = lh[q];
        if (lh[q].t >= tt && (!after || lh[q].t < after.t)) after = lh[q];
      }
      if (!before || !after || after.t - before.t > 30 || before.ic || after.ic) return null;
      var sp = after.t > before.t ? dist(before.x, before.y, after.x, after.y) / (after.t - before.t) : 0;
      if (sp > 25) return null;                       // sürü yürüyor: kopma değerlendirilmez
      var w = after.t > before.t ? (tt - before.t) / (after.t - before.t) : 0;
      return { x: before.x + (after.x - before.x) * w, y: before.y + (after.y - before.y) * w };
    }
    function kopmaCheck(S, store, dev, where, d) {
      var hist = store[dev], lh = store[grp[dev]];
      if (!hist || !lh) return;
      for (var k = 0; k < hist.length; k++) {
        var h = hist[k];
        if (h.uz !== undefined || h.ic) continue;
        var lp = leaderAt(lh, h.t);
        if (lp) h.uz = dist(h.x, h.y, lp.x, lp.y);
      }
      var c = 0;
      for (k = hist.length - 1; k >= 0; k--) {
        if (hist[k].uz === undefined) { if (c === 0) continue; else break; }
        if (hist[k].uz > P.kopmaEsik) c++; else break;
        if (c >= P.kopmaArdisik) { raise(S, dev, 'kopma', where, Math.floor(hist[k].t / 1440)); return; }
      }
    }
    // mobil sis: sürüsü duyulduğu hâlde 35 dakikadır duyulmayan etiket "sessiz" sayılır
    function sessizCheck(S) {
      var mob = S.mob; if (!mob) return;
      var d = Math.floor(t / 1440);
      for (var i = P.TASMA; i < nTrack; i++) {
        var h = mob[i], lh = mob[grp[i]];
        if (!h || !h.length || !lh || !lh.length) continue;
        var last = h[h.length - 1], llast = lh[lh.length - 1];
        if (last.ic || llast.ic) continue;
        if (t - last.t < 35 || t - last.t > 120 || t - llast.t > 15) continue;
        // sessizlik boyunca önder çobanın yakınındaydı: sürüsü menzildeyken bu etiket duyulmadı
        var yakin = 0, uzak = 0;
        for (var q = 0; q < lh.length; q++) if (lh[q].t > last.t) { if (lh[q].dc <= lh[q].rr * 0.35) yakin++; else uzak++; }
        if (yakin >= 2 && uzak === 0) raise(S, i, 'kopma', 'mobil', d);
      }
    }
    function fogProcess(S, r, where) { ruleCheck(S, where === 'mobil' ? (S.mob || (S.mob = {})) : S.fogLast, r, where); }

    function raise(S, dev, tur, where, d) {
      var key = dev + '|' + tur + '|' + where;
      var son = S.known[key];
      // aynı durum için tekrar alarm yok: kopma, hareketsizlik ve eksik günde bir; yasak alan her girişte (2 saat arayla)
      if (tur === 'yasak') { if (son !== undefined && t - son.t < 120) return; }
      else if (son !== undefined && son.d === d) return;
      S.known[key] = { t: t, d: d };
      var al = { dev: dev, tur: tur, tDet: t, tDel: null, where: where, gun: d, tBulut: where === 'bulut' ? t : null };   // tBulut: olayın buluta ulaştığı an (⑭ mal sahibi bildirimi)
      S.alarms.push(al);
      if (S.id === 'K') { S.pend.push({ al: al, via: 'bulut' }); return; }
      // sis: mobil düğüm çobanın elinde -> anında; sabit düğüm -> LoRa ile çobana ulaşabiliyorsa anında
      if (where === 'mobil' || where === 'agil' || (where === 'sabit' && gwReachesCoban())) deliver(S, al);
      else S.pend.push({ al: al, via: 'sis' });
      // acil olay buluta: sabit sis kendi kuyruğunun başına koyar (⑨ ⑪); mobil sis telefon kapsama bulunca
      // doğrudan gönderir (④), bulamazsa akşam ağılda sabit sise aktarır (⑤)
      if (where === 'mobil') S.mobAcil.push(al); else S.upQ.unshift({ kind: 'acil', al: al, b: P.acilB + P.ovhB });
    }
    function acilKey(al) { return al.dev + '|' + al.tur + '|' + al.gun; }
    function deliver(S, al) {
      if (al.tDel !== null) return;
      al.tDel = t;
      if (S.id === 'U' || S.id === 'K') {
        // olay günlüğü yalnızca K ve U için (arayüzde karşılaştırma)
      }
    }

    // ---------- buluta gönderim ----------
    function session(S) {
      if (S.lastSessionMin !== t) { S.lastSessionMin = t; S.sessions++; if (S.id === 'U') S.modemMin += 1; }
    }
    function sendNow(S, bytes, storeB, phone) {
      S.msgs++; S.bytes += bytes; S.store += storeB;
      if (!phone) session(S);
    }
    function stepUplink() {
      var up = wan.up;
      STRATS.forEach(function (s) {
        var S = ST[s];
        if (up && (s === 'K' || s === 'S')) S.modemMin += 1;       // kalıcı MQTT oturumu
        if (!up) return;
        var q = S.upQ;
        while (q.length) {
          var it = q.shift();
          if (it.kind === 'rec') { sendNow(S, it.b, P.recB, false); if (s === 'K') cloudProcess(S, it.r); }
          else if (it.kind === 'acil') { if (!S.sentAcil[acilKey(it.al)]) { S.sentAcil[acilKey(it.al)] = true; sendNow(S, it.b, P.acilB, false); } cloudAlarm(S, it.al); }
          else if (it.kind === 'ozet') { sendNow(S, it.b, it.raw, false); }
          else if (it.kind === 'status') { sendNow(S, it.b, 0, false); }
        }
      });
    }
    // K: bulut kuralları kayıt geldiğinde çalışır
    function cloudProcess(S, r) {
      if (r.kapi) {
        var d = Math.floor(r.t / 1440);
        var g = S.gate || (S.gate = {});
        var gd = g[d] || (g[d] = { giris: {}, n: 0 });
        if (r.kapi === 'giris') { gd.giris[r.dev] = true; gd.n++; }
        return;
      }
      ruleCheck(S, S.cloudLast, r, 'bulut');
    }
    function cloudAlarm(S, al) { /* S, U: acil olay buluta ulaştı; telefon kapsama bulunca bildirim gider */
      if (al.tBulut === null) al.tBulut = t;
      if (al.tDel === null) S.pend.push({ al: al, via: 'bulut' });
    }

    // akşam sayımı
    function countCheck(d) {
      var missing = [];
      for (var i = 0; i < N; i++) if (!inside[i]) missing.push(i);
      missing.forEach(function (i) { if (kind[i] === 2) events.push({ id: events.length, tur: 'eksik', dev: i, t0: t }); });
      if (yayin) yayin({ tur: 'sayim', t: t, icerde: N - missing.length, eksik: missing.slice() });
      STRATS.forEach(function (s) {
        var S = ST[s];
        if (s === 'K') { S.countDue = S.countDue || []; S.countDue.push(d); return; }
        missing.forEach(function (i) { if (kind[i] === 2) raise(S, i, 'eksik', 'agil', d); });
      });
      if (missing.length) logPush(hhmm(t) + ' · Akşam sayımı: ' + (N - missing.length) + '/' + N + ' hayvan ağılda', 'sayim');
    }
    // K: bulut, günün kapı kayıtları geldiğinde eksik listesini çıkarır
    function cloudCountCheck() {
      var S = ST.K; if (!S.countDue || !S.countDue.length || !wan.up) return;
      // kuyrukta o güne ait kapı kaydı kalmadıysa sayım tamamdır
      var rest = S.countDue.slice();
      S.countDue = [];
      rest.forEach(function (d) {
        var pendingGate = S.upQ.some(function (it) { return it.kind === 'rec' && it.r.kapi && Math.floor(it.r.t / 1440) === d; });
        if (pendingGate) { S.countDue.push(d); return; }
        var gd = (S.gate && S.gate[d]) || { giris: {} };
        var exited = S.exitList && S.exitList[d] ? S.exitList[d] : null;
        for (var i = nTrack; i < N; i++) {
          if (!gd.giris[i] && exited && exited[i]) raise(S, i, 'eksik', 'bulut', d);
        }
      });
    }

    // U: gece özet, saat başı durum mesajı
    function stepOzet(m) {
      var U = ST.U;
      if (m === P.ozetSaat) {
        var raw = nTrack * P.ozetHayvanB + P.ozetSayimB;
        var comp = Math.round(raw / P.sikistirma);
        U.upQ.push({ kind: 'ozet', b: comp + P.ovhB, raw: raw });
      }
      if (m % 60 === 0 && wan.up) U.upQ.push({ kind: 'status', b: P.statusB + P.ovhB });
    }

    function stepPhone() {
      var pc = phoneCov();
      ['S', 'U'].forEach(function (s) {
        var S = ST[s]; if (!pc || !S.mobAcil.length) return;
        S.mobAcil.forEach(function (al) {
          if (!S.sentAcil[acilKey(al)]) { S.sentAcil[acilKey(al)] = true; sendNow(S, P.acilB + P.ovhB, P.acilB, true); }
          if (al.tBulut === null) al.tBulut = t;
        });
        S.mobAcil = [];
      });
    }
    // bekleyen alarmların teslimi
    function stepPending() {
      var pc = phoneCov(), gwc = gwReachesCoban(), m = t % 1440;
      STRATS.forEach(function (s) {
        var S = ST[s];
        S.pend = S.pend.filter(function (p) {
          if (p.al.tDel !== null) return false;
          if (p.via === 'bulut' && pc) { deliver(S, p.al); return false; }
          if (p.via === 'sis' && gwc) { deliver(S, p.al); return false; }
          return true;
        });
      });
    }

    // mobil sis akşam ağılda sabit sise aktarır (⑤)
    function stepSync() {
      if (dist(coban.x, coban.y, WORLD.agil.x, WORLD.agil.y) > 200) return;
      ['S', 'U'].forEach(function (s) {
        var S = ST[s]; if (!S.mobBuf.length && !S.mobAcil.length) return;
        var b = S.mobBuf; S.mobBuf = [];
        b.forEach(function (r) { recordAtFixed(S, r); });
        S.mobAcil.forEach(function (al) { S.upQ.unshift({ kind: 'acil', al: al, b: P.acilB + P.ovhB }); });
        S.mobAcil = [];
      });
    }

    function stepCoban(m) {
      var l = L[0];
      if (l.state === 'agil') { coban.x += (WORLD.agil.x + 30 - coban.x) * 0.2; coban.y += (WORLD.agil.y - coban.y) * 0.2; return; }
      var tx = x[0] + 40, ty = y[0] - 40;
      // P3: çoban gün içinde bir kez tepedeki kapsama noktasına uğrayabilir
      if (prof.tel.tip === 'tepe' && dayPlan.tepeT && t >= dayPlan.tepeT && t < dayPlan.tepeT + 40) { tx = WORLD.tepe.x; ty = WORLD.tepe.y; }
      var dx = tx - coban.x, dy = ty - coban.y, d = Math.sqrt(dx * dx + dy * dy), v = 70;
      if (d > v) { coban.x += dx / d * v; coban.y += dy / d * v; } else { coban.x = tx; coban.y = ty; }
    }

    function stepConn() {
      if (!prof.wan.always && t >= wan.next) { wan.up = !wan.up; wan.next = t + Math.max(1, expo(wan.up ? prof.wan.upMean : prof.wan.downMean)); }
      if (telM && t >= telM.next) { telM.up = !telM.up; telM.next = t + Math.max(1, expo(telM.up ? prof.tel.upMean : prof.tel.downMean)); }
    }

    // ---------- ana adım ----------
    function step() {
      var d = Math.floor(t / 1440), m = t % 1440;
      if (m === 0 || !dayPlan) {
        dayPlan = planDay(d);
        if (prof.tel.tip === 'tepe' && rnd() < 0.3) dayPlan.tepeT = d * 1440 + 720 + Math.floor(rnd() * 180);
        gateToday = { exit: 0, enter: {}, enterCount: 0 };
        // kayıp LED hayvanları sabah bulunmuş sayılır
        for (var i = 0; i < N; i++) if (mode[i] === 4 || mode[i] === 2) { mode[i] = 0; inside[i] = 1; x[i] = WORLD.agil.x; y[i] = WORLD.agil.y; }
        ST.K.exitList = ST.K.exitList || {};
        ST.K.exitList[d] = {};
      }
      stepConn();
      stepLeaders(m, d);
      stepFollowers(m);
      stepCoban(m);
      if (m >= 420 && m < 480) for (var j = nTrack; j < N; j++) if (!inside[j]) ST.K.exitList[d][j] = true;
      stepReadings();
      if (m >= 1110 && countedDay !== d && (L.every(function (l) { return l.state === 'agil'; }) || m >= P.sayimSon)) { countedDay = d; countCheck(d); }
      stepSync();
      stepOzet(m);
      if (m % 5 === 0) { sessizCheck(ST.S); sessizCheck(ST.U); }
      stepPhone();
      stepUplink();
      cloudCountCheck();
      stepPending();
      t++;
    }

    // ---------- sonuçlar ----------
    function matchEvents() {
      var out = {};
      STRATS.forEach(function (s) {
        var S = ST[s];
        out[s] = events.map(function (ev) {
          var best = null;
          S.alarms.forEach(function (al) {
            if (al.dev !== ev.dev || al.tDet < ev.t0 - 1 || al.gun !== Math.floor(ev.t0 / 1440)) return;
            var ok = (ev.tur === 'yasak' && al.tur === 'yasak') ||
                     (ev.tur === 'eksik' && al.tur === 'eksik' && al.gun === Math.floor(ev.t0 / 1440)) ||
                     ((ev.tur === 'kopma' || ev.tur === 'hareketsiz') && (al.tur === 'kopma' || al.tur === 'hareketsiz') && al.gun === Math.floor(ev.t0 / 1440));
            if (!ok || al.tDel === null) return;
            if (!best || al.tDel < best.tDel) best = al;
          });
          return { ev: ev, gecikme: best ? best.tDel - ev.t0 : null };
        });
      });
      return out;
    }

    function summary() {
      var days = t / 1440, ms = matchEvents(), res = { gun: days, profil: prof.kod, strat: {} };
      STRATS.forEach(function (s) {
        var S = ST[s], lat = {}, all = [];
        ms[s].forEach(function (x) {
          var arr = lat[x.ev.tur] || (lat[x.ev.tur] = []);
          arr.push(x.gecikme); if (x.gecikme !== null) all.push(x.gecikme);
        });
        var unmatched = S.alarms.filter(function (al) {
          return !events.some(function (ev) {
            if (ev.dev !== al.dev || Math.floor(ev.t0 / 1440) !== al.gun) return false;
            if (al.tDet < ev.t0 - 1) return false;
            if (ev.tur === 'yasak' || ev.tur === 'eksik') return ev.tur === al.tur;
            return al.tur === 'kopma' || al.tur === 'hareketsiz';
          });
        }).length;
        res.strat[s] = {
          ad: STRAT_AD[s], yanlisAlarm: unmatched, alarmSay: S.alarms.length,
          mesajGun: S.msgs / days, kbGun: S.bytes / 1024 / days, depoMBYil: S.store / 1e6 / days * 365,
          modemDkGun: S.modemMin / days, gecikme: lat, tum: all
        };
      });
      return res;
    }

    return {
      step: step,
      run: function (minutes) { for (var k = 0; k < minutes; k++) step(); },
      get t() { return t; },
      state: function () {
        return { t: t, x: x, y: y, kind: kind, mode: mode, inside: inside, coban: coban, wan: wan.up, tel: phoneCov(),
                 gwCoban: gwReachesCoban(), N: N, ST: ST, events: events, log: log, prof: prof, P: P,
                 grp: grp, lead: L.map(function (l) { return l.state; }), orman: prof.orman };
      },
      summary: summary,
      matchEvents: matchEvents,
      animalName: animalName
    };
  }

  // istatistik yardımcıları
  function quantile(arr, q) {
    var a = arr.filter(function (v) { return v !== null; }).sort(function (p, r) { return p - r; });
    if (!a.length) return null;
    var pos = (a.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return a[lo] + (a[hi] - a[lo]) * (pos - lo);
  }

  return { create: create, WORLD: WORLD, PROFILES: PROFILES, DEFAULTS: DEFAULTS, STRATS: STRATS,
           STRAT_AD: STRAT_AD, TUR_AD: TUR_AD, hhmm: hhmm, inPoly: inPoly, quantile: quantile };
});
