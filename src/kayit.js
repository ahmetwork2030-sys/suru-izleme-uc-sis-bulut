/* Hayvan kaydı ve bildirim yönlendirme
 * Mimaride iki bulut bileşeninin işi:
 *   - Cihaz ve profil yönetimi: etiket numarası -> resmi kulak küpesi -> mal sahibi -> sürü ve çoban
 *   - Bildirim servisi (⑭): acil olayı kayda bakarak çobana ve mal sahibine, mal sahibinin seçtiği kanaldan gönderir
 * Aynı dosya üç yerde kullanılır: tarayıcı simülatörü (window.SuruKayit), Node-RED bildirim servisi
 * (akis_uret.js koda gömer) ve Node.js (module.exports). Böylece üçü aynı kaydı üretir.
 * Kişi adları ve küpe numaraları uydurmadır (sentetik); gerçek kişi ya da hayvana ait değildir.
 */
(function (kok, fabrika) {
  var K = fabrika();
  if (typeof module === 'object' && module && module.exports) module.exports = K;
  else kok.SuruKayit = K;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Köy sürüsü: hayvanlar farklı ailelere aittir, tek çoban hepsini otlatır.
  // kanal: push = mobil uygulama bildirimi, SMS = uygulaması olmayan mal sahibi (rapor Bölüm 7.2)
  var SAHIPLER = [
    { kod: 'MS-01', ad: 'Hasan K.', kanal: 'push', pay: 9 },
    { kod: 'MS-02', ad: 'Ayşe D.', kanal: 'push', pay: 6 },
    { kod: 'MS-03', ad: 'Mehmet Y.', kanal: 'SMS', pay: 8 },
    { kod: 'MS-04', ad: 'Fatma Ö.', kanal: 'push', pay: 4 },
    { kod: 'MS-05', ad: 'Ali Ç.', kanal: 'push', pay: 7 },
    { kod: 'MS-06', ad: 'Zeynep A.', kanal: 'push', pay: 3 },
    { kod: 'MS-07', ad: 'Hüseyin T.', kanal: 'SMS', pay: 10 },
    { kod: 'MS-08', ad: 'Emine B.', kanal: 'push', pay: 5 },
    { kod: 'MS-09', ad: 'İbrahim S.', kanal: 'push', pay: 6 },
    { kod: 'MS-10', ad: 'Hatice G.', kanal: 'SMS', pay: 4 },
    { kod: 'MS-11', ad: 'Mustafa E.', kanal: 'push', pay: 8 },
    { kod: 'MS-12', ad: 'Elif K.', kanal: 'push', pay: 3 },
    { kod: 'MS-13', ad: 'Osman Y.', kanal: 'SMS', pay: 5 },
    { kod: 'MS-14', ad: 'Cemile A.', kanal: 'push', pay: 4 }
  ];
  var COBAN = { kod: 'CB-01', ad: 'Veli A.', kanal: 'push' };
  var IL_KODU = '25';                         // Erzurum (gösterimdeki yayla Oltu civarında)

  function rastgele(tohum) {                  // mulberry32: aynı tohum her yerde aynı kaydı verir
    var a = tohum >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // N hayvanlık kaydı kurar. Etiket numarası 1000 + sıra; sahiplik karışıktır (köy sürüsü).
  function kur(N, tohum) {
    N = N || 500;
    var r = rastgele(tohum || 2026);
    var sira = [];
    for (var i = 0; i < N; i++) sira.push(i);
    for (i = N - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), g = sira[i]; sira[i] = sira[j]; sira[j] = g; }
    var payTop = SAHIPLER.reduce(function (s, o) { return s + o.pay; }, 0);
    var sayilar = SAHIPLER.map(function (o) { return Math.floor(N * o.pay / payTop); });
    var kalan = N - sayilar.reduce(function (s, v) { return s + v; }, 0);
    for (i = 0; kalan > 0; i = (i + 1) % sayilar.length, kalan--) sayilar[i]++;
    var hayvanlar = new Array(N), kupeler = {}, k = 0;
    SAHIPLER.forEach(function (o, si) {
      for (var n = 0; n < sayilar[si]; n++, k++) {
        var idx = sira[k], kupe;
        do { kupe = 'TR' + IL_KODU + String(10000000 + Math.floor(r() * 89999999)); } while (kupeler[kupe]);
        kupeler[kupe] = true;
        hayvanlar[idx] = { etiket: 1000 + idx, kupe: kupe, tur: r() < 0.16 ? 'keçi' : 'koyun', sahip: o.kod };
      }
    });
    var sahipler = {};
    SAHIPLER.forEach(function (o, si) { sahipler[o.kod] = { kod: o.kod, ad: o.ad, kanal: o.kanal, hayvan: sayilar[si] }; });
    return { hayvanlar: hayvanlar, sahipler: sahipler, coban: COBAN, N: N };
  }

  function hayvan(kayit, etiket) { return kayit.hayvanlar[etiket - 1000] || null; }
  function sahibi(kayit, etiket) { var h = hayvan(kayit, etiket); return h ? kayit.sahipler[h.sahip] : null; }

  var OLAY = {
    kopma: 'sürüden ayrıldı', hareketsiz: 'uzun süredir hareketsiz',
    yasak: 'sürüsüyle yasak alana (ekili tarla) girdi', eksik: 'akşam sayımında ağıla dönmedi'
  };
  function sizin(tur) { return tur === 'keçi' ? 'keçiniz' : 'koyununuz'; }
  function buyuk(s) { return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1); }
  function konumYazi(o) { return o.lat ? ' Son konum ' + (+o.lat).toFixed(4) + ', ' + (+o.lon).toFixed(4) + '.' : ''; }

  // Bir acil olayı bildirimlere çevirir.
  // olay = { tur, etiketler: [1029, ...], lat?, lon? }  ->  [{ alici, kod, kisi, kanal, tur, etiketler, kupe, mesaj }]
  // Kurallar:
  //  - Çoban her acil olayı push ile alır (sahada ayrıca LoRa ile yerel alarm alır, ⑧).
  //  - Mal sahibi yalnızca kendi hayvanının olayını, kendi seçtiği kanaldan alır.
  //  - Akşam sayımındaki eksikler mal sahibine tek tek değil, sahip başına tek mesajda gider.
  //  - Yasak alan sürü olayıdır (önder tasmasından gelir); tek bir mal sahibine ait değildir, yalnızca çobana gider.
  function bildirimler(kayit, olay) {
    var c = [], et = (olay.etiketler || []).filter(function (e) { return hayvan(kayit, e); });
    if (!et.length) return c;
    var cb = kayit.coban, tur = olay.tur;
    if (tur === 'eksik') {
      c.push({ alici: 'Çoban', kod: cb.kod, kisi: cb.ad, kanal: cb.kanal, tur: tur, etiketler: et, kupe: et.length + ' hayvan',
               mesaj: 'Akşam sayımında ' + et.length + ' hayvan eksik: ' + et.slice(0, 8).join(', ') + (et.length > 8 ? ' …' : '') + '.' });
      var grup = {};
      et.forEach(function (e) { var h = hayvan(kayit, e); (grup[h.sahip] = grup[h.sahip] || []).push(h); });
      Object.keys(grup).sort().forEach(function (kod) {
        var o = kayit.sahipler[kod], hs = grup[kod];
        c.push({ alici: 'Mal sahibi', kod: kod, kisi: o.ad, kanal: o.kanal, tur: tur, etiketler: hs.map(function (h) { return h.etiket; }),
                 kupe: hs.map(function (h) { return h.kupe; }).join(' '),
                 mesaj: 'Akşam sayımında ' + (hs.length === 1 ? sizin(hs[0].tur) + ' ' + hs[0].etiket + ' (' + hs[0].kupe + ')' : hs.length + ' hayvanınız (' + hs.map(function (h) { return h.etiket; }).join(', ') + ')') +
                        ' ağıla dönmedi. Çoban ' + cb.ad + ' bilgilendirildi.' });
      });
      return c;
    }
    var h = hayvan(kayit, et[0]), o = kayit.sahipler[h.sahip];
    c.push({ alici: 'Çoban', kod: cb.kod, kisi: cb.ad, kanal: cb.kanal, tur: tur, etiketler: [h.etiket], kupe: h.kupe,
             mesaj: (tur === 'yasak' ? 'Sürü yasak alana (ekili tarla) girdi; önder ' + h.tur + ' ' + h.etiket + '.'
                                      : buyuk(h.tur) + ' ' + h.etiket + ' (' + o.ad + ') ' + OLAY[tur] + '.') + konumYazi(olay) });
    if (tur !== 'yasak') {
      c.push({ alici: 'Mal sahibi', kod: o.kod, kisi: o.ad, kanal: o.kanal, tur: tur, etiketler: [h.etiket], kupe: h.kupe,
               mesaj: buyuk(sizin(h.tur)) + ' ' + h.etiket + ' (' + h.kupe + ') ' + OLAY[tur] + '. Çoban ' + cb.ad + ' bilgilendirildi.' });
    }
    return c;
  }

  return { kur: kur, hayvan: hayvan, sahibi: sahibi, bildirimler: bildirimler, SAHIPLER: SAHIPLER, COBAN: COBAN, OLAY: OLAY };
});
