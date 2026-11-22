const Sim = require('../src/engine.js');
for (const pr of ['P1','P2','P3','P4']) {
  const t0 = Date.now();
  const sim = Sim.create({ profile: pr, seed: 7 });
  sim.run(1440 * 10);
  const r = sim.summary();
  console.log(`\n${pr}  (${Date.now()-t0} ms)  olay: ${sim.state().events.length}`);
  for (const s of Sim.STRATS) {
    const x = r.strat[s];
    const lat = Object.entries(x.gecikme).map(([k,v]) => `${k}: n=${v.length} med=${Sim.quantile(v,0.5)} p95=${Sim.quantile(v,0.95)} kacan=${v.filter(z=>z===null).length}`).join(' | ');
    console.log(`  ${s} mesaj/gün ${x.mesajGun.toFixed(0)}  KB/gün ${x.kbGun.toFixed(1)}  depo MB/yıl ${x.depoMBYil.toFixed(1)}  modem dk/gün ${x.modemDkGun.toFixed(0)}  alarm ${x.alarmSay} yanlış ${x.yanlisAlarm}`);
    console.log(`     ${lat}`);
  }
}
