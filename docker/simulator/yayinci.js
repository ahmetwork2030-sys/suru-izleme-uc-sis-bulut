// Sürü simülatörü -> yerel MQTT broker
// Okumalar, LoRaWAN ağ sunucusunun çözüp broker'a verdiği hâliyle yayınlanır (mimaride ⑥).
const mqtt = require('mqtt');
const Sim = require('./engine.js');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const PROFIL = process.env.PROFIL || 'P2';
const HIZ = Math.max(1, Number(process.env.HIZ) || 10);        // gerçek saniye başına simülasyon dakikası
const TOHUM = Number(process.env.TOHUM) || 11;
const AGIL = process.env.AGIL || 'agil-sim';
const ONEK = 'bis505-suru/' + AGIL;

// Haritadaki metre koordinatları bir yayla çevresine yerleştirilir (Erzurum, Oltu civarı; yalnızca gösterim)
const KOK = { lat: 40.55, lon: 41.98 };
function enlemBoylam(x, y) {
  const lat = KOK.lat + (Sim.WORLD.H - y) / 111320;
  const lon = KOK.lon + x / (111320 * Math.cos(KOK.lat * Math.PI / 180));
  return { lat: +lat.toFixed(6), lon: +lon.toFixed(6) };
}

const istemci = mqtt.connect(MQTT_URL, { clientId: 'suru-simulator-' + AGIL, reconnectPeriod: 2000 });
let canli = false, kapiSira = 0;
const sayac = { okuma: 0, kapi: 0, sayim: 0 };

function yayinla(e) {
  if (!canli || !istemci.connected) return;
  const saat = 'Gün ' + (Math.floor(e.t / 1440) + 1) + ' ' + Sim.hhmm(e.t);
  if (e.tur === 'okuma') {
    const k = enlemBoylam(e.x, e.y);
    istemci.publish(`${ONEK}/lora/${1000 + e.dev}`, JSON.stringify({
      etiket: 1000 + e.dev, cihaz: e.kind === 0 ? 'tasma' : 'lora', grup: e.grp, t: e.t, sim_saat: saat,
      x: Math.round(e.x), y: Math.round(e.y), lat: k.lat, lon: k.lon, hareket_m: Math.round(e.act), agilda: !!e.ic
    }));
    sayac.okuma++;
  } else if (e.tur === 'kapi') {
    istemci.publish(`${ONEK}/kapi`, JSON.stringify({ sira: ++kapiSira, etiket: 1000 + e.dev, yon: e.yon, t: e.t, sim_saat: saat, icerde: e.icerde }));
    sayac.kapi++;
  } else if (e.tur === 'sayim') {
    istemci.publish(`${ONEK}/sayim`, JSON.stringify({ icerde: e.icerde, toplam: 500, eksik: e.eksik.map(d => 1000 + d), t: e.t, sim_saat: saat }));
    sayac.sayim++;
  }
}

const sim = Sim.create({ profile: PROFIL, seed: TOHUM, yayin: yayinla });
sim.run(6 * 60 + 30);       // 1. gün 06:30: sürü ağılda, yayın sessizce bu ana kadar ilerletilir

istemci.on('connect', () => {
  console.log(`Broker'a bağlanıldı: ${MQTT_URL} · profil ${PROFIL} · hız ${HIZ} dk/s · konu ${ONEK}/#`);
  canli = true;
});
istemci.on('error', (h) => console.error('MQTT hatası:', h.message));

let sonGun = -1;
setInterval(() => {
  if (!canli) return;
  sim.step();
  const st = sim.state();
  const gun = Math.floor(st.t / 1440);
  if (gun !== sonGun) { sonGun = gun; console.log(`Gün ${gun + 1} başladı · şimdiye kadar okuma ${sayac.okuma}, kapı ${sayac.kapi}, sayım ${sayac.sayim}`); }
}, 1000 / HIZ);
