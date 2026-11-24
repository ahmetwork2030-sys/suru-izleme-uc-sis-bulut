// Enerji testi: iz güdümlü (trace-driven) LTE modem enerji modeli.
//
// Simülatör (src/engine.js) her bağlantı profili ve her strateji için 30 günlük koşuyu çalıştırır.
// Koşu sırasında sabit sis düğümünün (LoRa ağ geçidindeki LTE modem) buluta yaptığı her gönderim
// dakikası, bayt miktarı ve WAN'ın açık olup olmadığı kaydedilir. Bu iz, ölçülmüş bir LTE güç
// modelinden geçirilerek modemin günlük enerjisi hesaplanır. Uç cihazlar (tasma, LoRa ve LED etiketi)
// üç stratejide de aynı veriyi aynı sıklıkla gönderdiği için uç enerjisi karşılaştırmaya girmez.
//
// Kaynaklar
//  [H] J. Huang ve ark., "A close examination of performance and power characteristics of 4G LTE
//      networks", MobiSys'12, doi:10.1145/2307636.2307658, Tablo 3 (RRC ve DRX güç modeli).
//  [Q] Quectel EG95 Series LTE Standard Specification V2.1 (RAK7268CV2'deki LTE Cat 4 modülü):
//      3,8 V tipik besleme; 2,6 mA uyku; 31 mA boşta; 15 µA kapalı.
//
// Kullanım: node enerji_testi.js [gün]   → enerji_ozet.csv, enerji_kosu.csv, enerji_duyarlilik.csv, enerji.json

const fs = require('fs');
const Sim = require('../src/engine.js');

const GUN = +(process.argv[2] || 30);
const TOHUMLAR = [11, 23, 37, 41, 59];
const PROFILLER = ['P1', 'P2', 'P3', 'P4'];

// ---- güç modeli -----------------------------------------------------------------------------
const V = 3.8;                                   // [Q]
const TABAN = {
  bosta: 31e-3 * V,                              // 0,118 W: modem uyanık, ağa kayıtlı [Q]
  uyku: 2.6e-3 * V,                              // 0,0099 W: modem uykuda, ağa kayıtlı (DRX) [Q]
};
const VARSAYILAN = {
  P_TERFI: 1.2107, T_TERFI: 0.2601,              // RRC_IDLE → RRC_CONNECTED geçişi [H]
  P_KUYRUK: 1.0600, T_KUYRUK: 11.576,            // son paketten sonra bağlantının açık kaldığı kuyruk [H]
  P_AKTARIM: 1.6802,                             // veri aktarımı; DRX "on" gücü üst sınır olarak [H]
  UL_HIZ: 5e6,                                   // bit/s, yukarı yönde varsayılan hız
  KEEPALIVE: 60,                                 // s; K ve S'nin kalıcı MQTT oturumu (veri yoksa PINGREQ)
  PING_B: 2 + 40,                                // PINGREQ + TCP/IP başlıkları (bayt)
  TABAN_K: 'bosta', TABAN_S: 'bosta', TABAN_U: 'uyku'
};

// Bir stratejinin dakikalık izinden (WAN durumu + gönderimler) günlük enerjiyi hesaplar.
function enerjiHesapla(iz, strat, M, P) {
  const kalici = strat !== 'U';                  // K ve S bulutla sürekli MQTT oturumu tutar
  const olaylar = [];                            // [zaman (s), bayt]
  let sonAktivite = -Infinity, oncekiUp = false;
  for (let m = 0; m < M; m++) {
    const T = m * 60, up = iz.up[m] === 1, b = iz.bayt[strat][m] || 0;
    if (up && b > 0) { olaylar.push([T, b]); sonAktivite = T; }
    if (kalici && up) {
      if (!oncekiUp && b === 0) { olaylar.push([T, 200]); sonAktivite = T; }      // yeniden CONNECT
      while (sonAktivite + P.KEEPALIVE < T + 60) {                                 // veri yoksa PINGREQ
        sonAktivite += P.KEEPALIVE;
        if (sonAktivite >= T) olaylar.push([sonAktivite, P.PING_B]);
      }
    }
    oncekiUp = up;
  }
  // RRC durum makinesi
  let terfi = 0, aktarimS = 0, kuyrukS = 0, baglantiBitis = -Infinity;
  for (let i = 0; i < olaylar.length; i++) {
    const [a, b] = olaylar[i];
    let bas = a;
    if (a >= baglantiBitis) { terfi++; bas = a + P.T_TERFI; }
    const d = b * 8 / P.UL_HIZ;
    const bitis = bas + d;
    aktarimS += d;
    const sonraki = i + 1 < olaylar.length ? olaylar[i + 1][0] : Infinity;
    kuyrukS += Math.max(0, Math.min(P.T_KUYRUK, sonraki - bitis));
    baglantiBitis = bitis + P.T_KUYRUK;
  }
  const toplamS = M * 60;
  const terfiS = terfi * P.T_TERFI;
  const tabanS = Math.max(0, toplamS - terfiS - aktarimS - kuyrukS);
  const tabanW = TABAN[P['TABAN_' + strat]];
  const J = {
    taban: tabanS * tabanW,
    terfi: terfi * P.P_TERFI * P.T_TERFI,
    kuyruk: kuyrukS * P.P_KUYRUK,
    aktarim: aktarimS * P.P_AKTARIM
  };
  const gun = M / 1440, Wh = j => j / 3600 / gun;
  return {
    WhGun: Wh(J.taban + J.terfi + J.kuyruk + J.aktarim),
    tabanWh: Wh(J.taban), terfiWh: Wh(J.terfi), kuyrukWh: Wh(J.kuyruk), aktarimWh: Wh(J.aktarim),
    baglantiGun: terfi / gun, acikDkGun: (terfiS + aktarimS + kuyrukS) / 60 / gun
  };
}

// ---- simülasyon koşuları ve izler -----------------------------------------------------------
const M = 1440 * GUN, izler = [];
for (const pr of PROFILLER) {
  for (const seed of TOHUMLAR) {
    const iz = { profil: pr, seed, up: new Uint8Array(M), bayt: { K: new Float64Array(M), S: new Float64Array(M), U: new Float64Array(M) }, tel: { K: 0, S: 0, U: 0 } };
    const sim = Sim.create({
      profile: pr, seed,
      iz: {
        dakika: (t, up) => { if (t < M) iz.up[t] = up ? 1 : 0; },
        gonder: (s, t, b, telefon) => { if (t >= M) return; if (telefon) iz.tel[s]++; else iz.bayt[s][t] += b; }
      }
    });
    sim.run(M);
    izler.push(iz);
    process.stdout.write(pr + ':' + seed + ' ');
  }
}
console.log();

function senaryo(P) {
  const sonuc = {};
  for (const iz of izler) for (const s of Sim.STRATS) {
    const r = enerjiHesapla(iz, s, M, P), k = iz.profil + '|' + s;
    (sonuc[k] = sonuc[k] || []).push(Object.assign({ profil: iz.profil, seed: iz.seed, strat: s, telefonGun: iz.tel[s] / GUN }, r));
  }
  return sonuc;
}
const ort = (a, f) => a.reduce((t, x) => t + f(x), 0) / a.length;
const sd = (a, f) => { const m = ort(a, f); return Math.sqrt(a.reduce((t, x) => t + (f(x) - m) ** 2, 0) / (a.length - 1)); };

// Ana senaryo
const ana = senaryo(VARSAYILAN);
const kosu = ['profil,tohum,strateji,wh_gun,taban_wh,terfi_wh,kuyruk_wh,aktarim_wh,baglanti_gun,acik_dk_gun,telefon_gonderim_gun'];
const ozet = ['profil,strateji,wh_gun,wh_gun_ss,taban_wh,terfi_wh,kuyruk_wh,aktarim_wh,baglanti_gun,acik_dk_gun,K_ye_gore_azalma_yuzde'];
const json = { gun: GUN, tohumlar: TOHUMLAR, parametre: VARSAYILAN, taban: TABAN, ana: {}, duyarlilik: {} };
for (const pr of PROFILLER) {
  const K = ort(ana[pr + '|K'], x => x.WhGun);
  for (const s of Sim.STRATS) {
    const a = ana[pr + '|' + s];
    a.forEach(x => kosu.push([pr, x.seed, s, x.WhGun.toFixed(4), x.tabanWh.toFixed(4), x.terfiWh.toFixed(4), x.kuyrukWh.toFixed(4), x.aktarimWh.toFixed(5), x.baglantiGun.toFixed(1), x.acikDkGun.toFixed(1), x.telefonGun.toFixed(2)].join(',')));
    const rec = {
      WhGun: ort(a, x => x.WhGun), ss: sd(a, x => x.WhGun), taban: ort(a, x => x.tabanWh), terfi: ort(a, x => x.terfiWh),
      kuyruk: ort(a, x => x.kuyrukWh), aktarim: ort(a, x => x.aktarimWh), baglanti: ort(a, x => x.baglantiGun), acikDk: ort(a, x => x.acikDkGun)
    };
    rec.azalma = 100 * (1 - rec.WhGun / K);
    json.ana[pr + '|' + s] = rec;
    ozet.push([pr, s, rec.WhGun.toFixed(3), rec.ss.toFixed(3), rec.taban.toFixed(3), rec.terfi.toFixed(3), rec.kuyruk.toFixed(3), rec.aktarim.toFixed(4), rec.baglanti.toFixed(0), rec.acikDk.toFixed(1), rec.azalma.toFixed(1)].join(','));
  }
}

// Duyarlılık: varsayımlar değişince K ile U arasındaki fark nasıl değişiyor?
const SENARYOLAR = [
  ['Ana senaryo', {}],
  ['U modemi uyutmasa (üçü de boşta)', { TABAN_U: 'bosta' }],
  ['Üçü de uykuda', { TABAN_K: 'uyku', TABAN_S: 'uyku' }],
  ['MQTT keepalive 1200 s', { KEEPALIVE: 1200 }],
  ['Kuyruk süresi 5 s', { T_KUYRUK: 5 }],
  ['Yukarı hız 1 Mbit/s', { UL_HIZ: 1e6 }]
];
const duy = ['senaryo,profil,K_wh_gun,S_wh_gun,U_wh_gun,U_azalma_yuzde'];
for (const [ad, deg] of SENARYOLAR) {
  const r = senaryo(Object.assign({}, VARSAYILAN, deg));
  json.duyarlilik[ad] = {};
  for (const pr of PROFILLER) {
    const v = {}; for (const s of Sim.STRATS) v[s] = ort(r[pr + '|' + s], x => x.WhGun);
    v.azalma = 100 * (1 - v.U / v.K);
    json.duyarlilik[ad][pr] = v;
    duy.push([ad, pr, v.K.toFixed(3), v.S.toFixed(3), v.U.toFixed(3), v.azalma.toFixed(1)].join(','));
  }
}

fs.writeFileSync('enerji_kosu.csv', kosu.join('\n') + '\n');
fs.writeFileSync('enerji_ozet.csv', ozet.join('\n') + '\n');
fs.writeFileSync('enerji_duyarlilik.csv', duy.join('\n') + '\n');
fs.writeFileSync('enerji.json', JSON.stringify(json, null, 1));
console.log(ozet.join('\n'));
console.log(duy.join('\n'));
