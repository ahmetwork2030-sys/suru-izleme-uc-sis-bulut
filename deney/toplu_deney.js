// Toplu deney: her bağlantı profili için 30 günlük, 5 farklı tohumlu koşu.
// Çıktı: sonuclar_kosu.csv (koşu başına), sonuclar_ozet.csv ve ozet.json (profil × strateji)
const fs = require('fs');
const Sim = require('../src/engine.js');
const GUN = +(process.argv[2] || 30), TOHUMLAR = [11, 23, 37, 41, 59];
const rows = [], pool = {};
for (const pr of ['P1', 'P2', 'P3', 'P4']) {
  for (const seed of TOHUMLAR) {
    const sim = Sim.create({ profile: pr, seed });
    sim.run(1440 * GUN);
    const r = sim.summary();
    for (const s of Sim.STRATS) {
      const x = r.strat[s];
      const key = pr + '|' + s;
      const p = pool[key] || (pool[key] = { msg: [], kb: [], depo: [], modem: [], yanlis: 0, alarm: 0, lat: {} });
      p.msg.push(x.mesajGun); p.kb.push(x.kbGun); p.depo.push(x.depoMBYil); p.modem.push(x.modemDkGun);
      p.yanlis += x.yanlisAlarm; p.alarm += x.alarmSay;
      for (const [tur, arr] of Object.entries(x.gecikme)) (p.lat[tur] || (p.lat[tur] = [])).push(...arr);
      const all = Object.values(x.gecikme).flat();
      rows.push([pr, seed, s, x.mesajGun.toFixed(1), x.kbGun.toFixed(2), x.depoMBYil.toFixed(2), x.modemDkGun.toFixed(1),
        all.length, all.filter(v => v === null).length, Sim.quantile(all, 0.5), Sim.quantile(all, 0.95), x.yanlisAlarm].join(','));
    }
    process.stdout.write(pr + ':' + seed + ' ');
  }
}
fs.writeFileSync('sonuclar_kosu.csv', 'profil,tohum,strateji,mesaj_gun,kb_gun,depo_mb_yil,modem_dk_gun,olay,kacan,gecikme_medyan_dk,gecikme_p95_dk,yanlis_alarm\n' + rows.join('\n') + '\n');
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const out = [], json = {};
for (const [key, p] of Object.entries(pool)) {
  const [pr, s] = key.split('|');
  const all = Object.values(p.lat).flat();
  const teslim = all.filter(v => v !== null);
  const rec = {
    profil: pr, strateji: s, mesajGun: mean(p.msg), kbGun: mean(p.kb), depoMBYil: mean(p.depo), modemDkGun: mean(p.modem),
    olay: all.length, kacanOran: all.length ? (all.length - teslim.length) / all.length : 0,
    medyan: Sim.quantile(all, 0.5), p95: Sim.quantile(all, 0.95),
    ilk15dk: all.length ? teslim.filter(v => v <= 15).length / all.length : 0,
    yanlis: p.yanlis, alarm: p.alarm, tur: {}
  };
  for (const [tur, arr] of Object.entries(p.lat)) {
    rec.tur[tur] = { n: arr.length, medyan: Sim.quantile(arr, 0.5), p95: Sim.quantile(arr, 0.95), kacan: arr.filter(v => v === null).length };
  }
  json[key] = rec;
  out.push([pr, s, rec.mesajGun.toFixed(1), rec.kbGun.toFixed(2), rec.depoMBYil.toFixed(2), rec.modemDkGun.toFixed(1), rec.olay,
    (rec.kacanOran * 100).toFixed(1), rec.medyan === null ? '' : rec.medyan.toFixed(0), rec.p95 === null ? '' : rec.p95.toFixed(0),
    (rec.ilk15dk * 100).toFixed(1), rec.yanlis].join(','));
}
fs.writeFileSync('sonuclar_ozet.csv', 'profil,strateji,mesaj_gun,kb_gun,depo_mb_yil,modem_dk_gun,olay,kacan_yuzde,gecikme_medyan_dk,gecikme_p95_dk,ilk15dk_yuzde,yanlis_alarm\n' + out.join('\n') + '\n');
fs.writeFileSync('ozet.json', JSON.stringify({ gun: GUN, tohumlar: TOHUMLAR, sonuc: json }, null, 1));
console.log('\nbitti');
