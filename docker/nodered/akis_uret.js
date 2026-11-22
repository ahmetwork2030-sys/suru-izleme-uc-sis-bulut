// Node-RED akışını (flows.json) üretir. Fonksiyon düğümlerinin kodu burada okunabilir biçimde durur.
// Çalıştırma: node akis_uret.js  ->  flows.json
const fs = require('fs');
const TAB = 'sis_sekme';
const BULUT = 'bulut_sekme';

const KOD = {};

KOD.kural = `
// Kural motoru (mimaride ⑦): kopma, hareketsizlik ve yasak alan kuralları
const r = msg.payload;
const agil = msg.topic.split('/')[1];
const durum = flow.get('kural_' + agil) || { gecmis: {}, onder: {}, son: {} };
const AGIL = { x: 900, y: 2500 };
const YASAK = { x0: 4500, x1: 5000, y0: 4300, y1: 4700 };   // ekili tarla
const gun = Math.floor(r.t / 1440);
const alarmlar = [];
function alarm(tur) {
  const anahtar = r.etiket + '|' + tur;
  const son = durum.son[anahtar];
  // aynı durum için tekrar alarm yok: yasak alanda 2 saat, diğerlerinde aynı gün
  if (son !== undefined && (tur === 'yasak' ? r.t - son < 120 : Math.floor(son / 1440) === gun)) return;
  durum.son[anahtar] = r.t;
  alarmlar.push({ topic: 'alarm', payload: { tur, etiket: r.etiket, agil, t: r.t, sim_saat: r.sim_saat, lat: r.lat, lon: r.lon } });
}
const disarida = !r.agilda && Math.hypot(r.x - AGIL.x, r.y - AGIL.y) > 300;
if (r.cihaz === 'tasma') {
  durum.onder[r.grup] = r;
  if (r.x >= YASAK.x0 && r.x <= YASAK.x1 && r.y >= YASAK.y0 && r.y <= YASAK.y1) alarm('yasak');
} else if (disarida) {
  const g = durum.gecmis[r.etiket] || [];
  g.push({ t: r.t, h: r.hareket_m, uz: null });
  while (g.length > 4) g.shift();
  durum.gecmis[r.etiket] = g;
  if (g.length === 4 && g.every(k => k.h < 8)) alarm('hareketsiz');
  const o = durum.onder[r.grup];
  // önderin son okuması 15 dakikadan yeni ve sürü yürümüyorsa uzaklığı ölç
  if (o && !o.agilda && Math.abs(o.t - r.t) <= 15 && o.hareket_m < 375) g[g.length - 1].uz = Math.hypot(r.x - o.x, r.y - o.y);
  const s2 = g.slice(-2);
  if (s2.length === 2 && s2.every(k => k.uz !== null && k.uz > 400)) alarm('kopma');
} else {
  durum.gecmis[r.etiket] = [];
}
flow.set('kural_' + agil, durum);
msg.agil = agil;
return [alarmlar.length ? alarmlar : null, msg];
`;

KOD.onem = `
// Önem puanlama: alarm acil (⑨), olağan okuma rutin (⑩)
if (msg.topic === 'alarm') {
  msg.onem = 1.0;
  msg.yol = 'acil';
  msg.kayit = { olcum: 'alarm', etiketler: { agil: msg.payload.agil, tur: msg.payload.tur }, alanlar: { etiket: msg.payload.etiket, lat: msg.payload.lat, lon: msg.payload.lon, sim_saat: msg.payload.sim_saat } };
  return [msg, null];
}
msg.onem = 0.1;
return [null, msg];
`;

KOD.tampon = `
// Tampon ve özetleme: ham okuma sis kovasına yazılır (yerel tampon), gün dönünce özet çıkarılır.
// Klasik yöntem her okumayı ayrı mesajla buluta gönderirdi; karşılaştırma için sayılır.
const r = msg.payload, agil = msg.agil;
const say = flow.get('sayac_' + agil) || { klasik: 0, klasik_b: 0, uyuyan: 0, uyuyan_b: 0 };
say.klasik += 1; say.klasik_b += JSON.stringify(r).length + 150;
flow.set('sayac_' + agil, say);

const ozet = flow.get('ozet_' + agil) || { gun: Math.floor(r.t / 1440), hayvan: {} };
const gun = Math.floor(r.t / 1440);
let cikti = null;
if (gun > ozet.gun) {
  const satirlar = Object.entries(ozet.hayvan).map(([etiket, h]) => ({
    olcum: 'ozet', etiketler: { agil, etiket, cihaz: h.cihaz },
    alanlar: { gun: ozet.gun + 1, okuma: h.n, mesafe_m: Math.round(h.mesafe), son_lat: h.lat, son_lon: h.lon }
  }));
  cikti = { yol: 'rutin', agil, kayitlar: satirlar, boyut: Math.round(JSON.stringify(satirlar).length / 3) };
  ozet.gun = gun; ozet.hayvan = {};
}
const h = ozet.hayvan[r.etiket] || { n: 0, mesafe: 0, lat: r.lat, lon: r.lon, cihaz: r.cihaz };
h.n++; h.mesafe += r.hareket_m || 0; h.lat = r.lat; h.lon = r.lon;
ozet.hayvan[r.etiket] = h;
flow.set('ozet_' + agil, ozet);

const ham = { kova: 'sis', kayit: { olcum: 'okuma', etiketler: { agil, etiket: String(r.etiket), cihaz: r.cihaz },
  alanlar: { lat: r.lat, lon: r.lon, hareket_m: r.hareket_m, grup: r.grup, agilda: !!r.agilda } } };
return [ham, cikti];
`;

KOD.kapi = `
// Ağıl kapısı (② ⑥): simülatörden ve Wokwi'deki okuyucudan gelen geçişler
const r = msg.payload, agil = msg.topic.split('/')[1];
const say = flow.get('sayac_' + agil) || { klasik: 0, klasik_b: 0, uyuyan: 0, uyuyan_b: 0 };
say.klasik += 1; say.klasik_b += JSON.stringify(r).length + 150;
flow.set('sayac_' + agil, say);
const alanlar = { etiket: r.etiket, sira: r.sira || 0 };
if (r.icerde !== undefined) alanlar.icerde = r.icerde;
return { kova: 'sis', kayit: { olcum: 'kapi', etiketler: { agil, yon: r.yon }, alanlar } };
`;

KOD.sayim = `
// Akşam sayımı: eksik hayvan acil olaydır
const r = msg.payload, agil = msg.topic.split('/')[1];
const eksik = (r.eksik || []).slice(0, 50);
const kayitlar = [{ olcum: 'sayim', etiketler: { agil }, alanlar: { icerde: r.icerde, toplam: r.toplam || 500, eksik: (r.eksik || []).length } }]
  .concat(eksik.map(e => ({ olcum: 'alarm', etiketler: { agil, tur: 'eksik' }, alanlar: { etiket: e, sim_saat: r.sim_saat || '' } })));
node.status({ fill: eksik.length ? 'red' : 'green', shape: 'dot', text: agil + ': ' + r.icerde + '/' + (r.toplam || 500) + (eksik.length ? ' · eksik ' + eksik.length : '') });
return [{ kova: 'sis', kayit: kayitlar[0] }, { yol: 'acil', agil, kayitlar, boyut: JSON.stringify(kayitlar).length }];
`;

KOD.baglanti = `
// Bağlantı yöneticisi (⑪ ⑫): internet varken önce acil, sonra rutin kuyruğu gönderir; yokken bekletir.
let q = flow.get('kuyruk') || { acil: [], rutin: [] };
if (msg.komut !== 'bosalt') {
  const paket = msg.kayitlar ? { agil: msg.agil, kayitlar: msg.kayitlar, boyut: msg.boyut }
                             : { agil: msg.payload.agil, kayitlar: [msg.kayit], boyut: JSON.stringify(msg.kayit).length };
  q[msg.yol === 'acil' ? 'acil' : 'rutin'].push(paket);
}
const internet = flow.get('internet') !== false;
if (!internet) {
  flow.set('kuyruk', q);
  node.status({ fill: 'red', shape: 'ring', text: 'İnternet yok · bekleyen ' + (q.acil.length + q.rutin.length) + ' mesaj' });
  return null;
}
const giden = q.acil.concat(q.rutin);
flow.set('kuyruk', { acil: [], rutin: [] });
const cikti = [], bulut = [];
for (const p of giden) {
  const say = flow.get('sayac_' + p.agil) || { klasik: 0, klasik_b: 0, uyuyan: 0, uyuyan_b: 0 };
  say.uyuyan += 1; say.uyuyan_b += p.boyut + 150;           // her paket buluta tek mesaj
  flow.set('sayac_' + p.agil, say);
  for (const k of p.kayitlar) cikti.push({ kova: 'bulut', kayit: k });
  // buluta ulaşan acil olaylar bildirim servisine de gider (⑬ ⑭)
  const alarmlar = p.kayitlar.filter(k => k.olcum === 'alarm')
    .map(k => ({ tur: k.etiketler.tur, etiket: k.alanlar.etiket, lat: k.alanlar.lat, lon: k.alanlar.lon, sim_saat: k.alanlar.sim_saat }));
  if (alarmlar.length) bulut.push({ agil: p.agil, alarmlar });
}
const top = (context.get('toplam') || 0) + giden.length;
context.set('toplam', top);
node.status({ fill: 'green', shape: 'dot', text: 'İnternet var · buluta giden ' + top + ' mesaj' });
return [cikti, bulut];
`;

KOD.internetKes = `
flow.set('internet', false);
node.status({ fill: 'red', shape: 'ring', text: 'İnternet kesildi' });
return null;
`;

KOD.internetVer = `
flow.set('internet', true);
node.status({ fill: 'green', shape: 'dot', text: 'İnternet geldi' });
return { komut: 'bosalt' };
`;

KOD.olcut = `
// Karşılaştırma ölçütleri: buluta giden mesaj ve veri (klasik ile Uyuyan Bulut), bekleyen kuyruk
const q = flow.get('kuyruk') || { acil: [], rutin: [] };
const cikti = [];
for (const anahtar of flow.keys().filter(k => k.startsWith('sayac_'))) {
  const agil = anahtar.slice(6), s = flow.get(anahtar);
  cikti.push({ kova: 'sis', kayit: { olcum: 'olcut', etiketler: { agil }, alanlar: {
    klasik_mesaj: s.klasik, uyuyan_mesaj: s.uyuyan,
    klasik_kb: +(s.klasik_b / 1024).toFixed(1), uyuyan_kb: +(s.uyuyan_b / 1024).toFixed(1),
    bekleyen: q.acil.length + q.rutin.length, internet: flow.get('internet') !== false } } });
}
return [cikti];
`;

KOD.yazici = `
// InfluxDB yazıcı: satır protokolüne çevirir, kova başına 1 saniyelik paketler hâlinde yazar
function kac(s) { return String(s).replace(/[,= ]/g, m => '\\\\' + m); }
// tamsayı alanları sabittir; diğer sayılar her zaman ondalıklı yazılır (InfluxDB alan türü çakışmasın)
const TAMSAYI = ['etiket', 'sira', 'icerde', 'toplam', 'eksik', 'okuma', 'gun', 'grup', 'mesafe_m', 'hareket_m', 'klasik_mesaj', 'uyuyan_mesaj', 'bekleyen', 'adet', 'hayvan', 'bildirim'];
function alan(a, v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return TAMSAYI.includes(a) ? Math.round(v) + 'i' : String(v);
  return '"' + String(v).replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"') + '"';
}
const k = msg.kayit;
const et = Object.entries(k.etiketler || {}).filter(([, v]) => v !== undefined && v !== '').map(([a, v]) => ',' + kac(a) + '=' + kac(v)).join('');
const al = Object.entries(k.alanlar || {}).filter(([, v]) => v !== undefined && v !== null && !(typeof v === 'number' && !isFinite(v))).map(([a, v]) => kac(a) + '=' + alan(a, v)).join(',');
if (!al) return null;
// aynı milisaniyede yazılan iki satır aynı seriye düşüp birbirini ezmesin
let ts = Date.now();
const sonTs = context.get('son_ts') || 0;
if (ts <= sonTs) ts = sonTs + 1;
context.set('son_ts', ts);
const satir = kac(k.olcum) + et + ' ' + al + ' ' + ts;
const kova = msg.kova || 'sis';
const bekleyen = context.get('b_' + kova) || [];
bekleyen.push(satir);
context.set('b_' + kova, bekleyen);
if (!context.get('z_' + kova)) {
  context.set('z_' + kova, true);
  setTimeout(() => {
    const satirlar = context.get('b_' + kova) || [];
    context.set('b_' + kova, []);
    context.set('z_' + kova, false);
    if (!satirlar.length) return;
    node.send({
      url: env.get('INFLUX_URL') + '/api/v2/write?org=' + encodeURIComponent(env.get('INFLUX_ORG')) + '&bucket=' + kova + '&precision=ms',
      method: 'POST',
      headers: { 'Authorization': 'Token ' + env.get('INFLUX_TOKEN'), 'Content-Type': 'text/plain; charset=utf-8' },
      payload: satirlar.join('\\n'),
      satirSayisi: satirlar.length, kova
    });
  }, 1000);
}
return null;
`;

KOD.kontrol = `
if (msg.statusCode !== 204) {
  node.status({ fill: 'red', shape: 'dot', text: 'InfluxDB ' + msg.statusCode });
  node.warn('InfluxDB yazımı başarısız (' + msg.statusCode + '): ' + String(msg.payload).slice(0, 200));
} else {
  const n = (context.get('n') || 0) + msg.satirSayisi;
  context.set('n', n);
  node.status({ fill: 'green', shape: 'dot', text: n + ' satır yazıldı' });
}
return null;
`;

// ---------- Bulut sekmesi: hayvan kaydı ve bildirim servisi ----------
// Kayıt, tarayıcı simülatörüyle aynı dosyadan (src/kayit.js) üretilir; ikisi aynı mal sahiplerini gösterir.
const KAYIT_KAYNAK = fs.readFileSync(require('path').join(__dirname, '../../src/kayit.js'), 'utf8');
const KAYIT_BASLAT = `
// Hayvan kaydı (bulutta "Cihaz ve profil yönetimi"): etiket -> resmi küpe -> mal sahibi -> çoban
const module = { exports: {} };
` + KAYIT_KAYNAK + `
context.set('K', module.exports);
context.set('kayit', module.exports.kur(500));
`;
KOD.bildirim = `
// Bildirim servisi (⑭): buluta ulaşan acil olayı kayda bakarak çobana ve mal sahibine gönderir.
// Tekrar gelen olay (bağlantı kopup yeniden gönderilen paket) ikinci kez bildirim üretmez.
const K = context.get('K'), kayit = context.get('kayit');
const gorulen = context.get('gorulen') || {};
const gunNo = s => { const m = /Gün (\\d+)/.exec(s || ''); return m ? +m[1] : 0; };
const olaylar = [], eksik = [];
let sim_saat = '';
for (const a of msg.alarmlar) {
  const anahtar = msg.agil + '|' + a.etiket + '|' + a.tur + '|' + gunNo(a.sim_saat);
  if (gorulen[anahtar]) continue;
  gorulen[anahtar] = Date.now();
  sim_saat = a.sim_saat || sim_saat;
  if (a.tur === 'eksik') eksik.push(a.etiket); else olaylar.push(a);
}
const anahtarlar = Object.keys(gorulen);
if (anahtarlar.length > 5000) anahtarlar.sort((x, y) => gorulen[x] - gorulen[y]).slice(0, 1000).forEach(k => delete gorulen[k]);
context.set('gorulen', gorulen);
let bild = [];
for (const a of olaylar) bild = bild.concat(K.bildirimler(kayit, { tur: a.tur, etiketler: [a.etiket], lat: a.lat, lon: a.lon }));
if (eksik.length) bild = bild.concat(K.bildirimler(kayit, { tur: 'eksik', etiketler: eksik }));
const sayac = global.get('bildirim_sayac') || { push: 0, SMS: 0, kisi: {} };
const cikti = bild.map(b => {
  sayac[b.kanal] = (sayac[b.kanal] || 0) + 1;
  sayac.kisi[b.kod] = (sayac.kisi[b.kod] || 0) + 1;
  return { kova: 'bulut', kayit: { olcum: 'bildirim',
    etiketler: { agil: msg.agil, alici: b.alici, kanal: b.kanal, tur: b.tur, kod: b.kod },
    alanlar: { kisi: b.kod + ' ' + b.kisi, etiket: b.etiketler[0], adet: b.etiketler.length, kupe: b.kupe, mesaj: b.mesaj, sim_saat } } };
});
global.set('bildirim_sayac', sayac);
node.status({ fill: 'blue', shape: 'dot', text: 'push ' + sayac.push + ' · SMS ' + sayac.SMS });
return [cikti];
`;
KOD.kayitYaz = `
// Mal sahipleri listesini panoya yazar: hayvan sayısı, bildirim kanalı, şimdiye kadarki bildirim sayısı
const kayit = context.get('kayit');
const sayac = global.get('bildirim_sayac') || { push: 0, SMS: 0, kisi: {} };
const cikti = Object.values(kayit.sahipler).map(o => ({ kova: 'bulut', kayit: { olcum: 'sahip', etiketler: { kod: o.kod },
  alanlar: { ad: o.ad, hayvan: o.hayvan, kanal: o.kanal, bildirim: sayac.kisi[o.kod] || 0 } } }));
const c = kayit.coban;
cikti.push({ kova: 'bulut', kayit: { olcum: 'sahip', etiketler: { kod: c.kod }, alanlar: { ad: c.ad + ' (çoban)', hayvan: kayit.N, kanal: c.kanal, bildirim: sayac.kisi[c.kod] || 0 } } });
node.status({ fill: 'green', shape: 'dot', text: Object.keys(kayit.sahipler).length + ' mal sahibi · ' + kayit.N + ' hayvan' });
return [cikti];
`;
KOD.geriSorgu = `
// Node-RED yeniden başlarsa karşılaştırma sayaçları sıfırlanmasın: son değerleri InfluxDB'den oku
msg.url = env.get('INFLUX_URL') + '/api/v2/query?org=' + encodeURIComponent(env.get('INFLUX_ORG'));
msg.method = 'POST';
msg.headers = { 'Authorization': 'Token ' + env.get('INFLUX_TOKEN'), 'Content-Type': 'application/vnd.flux', 'Accept': 'application/csv' };
msg.payload = 'from(bucket: "sis") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "olcut" and (r._field == "klasik_mesaj" or r._field == "uyuyan_mesaj" or r._field == "klasik_kb" or r._field == "uyuyan_kb")) |> last()';
return msg;
`;
KOD.geriYukle = `
if (msg.statusCode !== 200) { node.status({ fill: 'yellow', shape: 'ring', text: 'geri yükleme yok (' + msg.statusCode + ')' }); return null; }
let bas = null; const geri = {};
for (const satir of String(msg.payload).split(/\\r?\\n/)) {
  if (!satir.trim()) { bas = null; continue; }
  const h = satir.split(',');
  if (h.includes('_field') && h.includes('_value')) { bas = h; continue; }
  if (!bas) continue;
  const agil = h[bas.indexOf('agil')], alan = h[bas.indexOf('_field')], v = Number(h[bas.indexOf('_value')]);
  if (agil && isFinite(v)) (geri[agil] = geri[agil] || {})[alan] = v;
}
for (const [agil, g] of Object.entries(geri)) {
  const say = flow.get('sayac_' + agil) || { klasik: 0, klasik_b: 0, uyuyan: 0, uyuyan_b: 0 };
  // sayaç bellekte duruyorsa (yalnızca yeniden dağıtım) zaten büyüktür; sıfırlandıysa son ölçüm üstüne eklenir
  if (say.klasik < (g.klasik_mesaj || 0)) {
    say.klasik += g.klasik_mesaj || 0; say.uyuyan += g.uyuyan_mesaj || 0;
    say.klasik_b += (g.klasik_kb || 0) * 1024; say.uyuyan_b += (g.uyuyan_kb || 0) * 1024;
  }
  flow.set('sayac_' + agil, say);
}
node.status({ fill: 'green', shape: 'dot', text: Object.keys(geri).length ? 'sayaçlar geri yüklendi: ' + Object.keys(geri).join(', ') : 'önceki ölçüm yok, sıfırdan' });
return null;
`;

KOD.cobanLora = `
// ⑧ Acil olay internet beklemeden sahaya iner: LoRa ağ geçidi aşağı bağlantıyla çobanın cep ağ geçidine
// gönderir (LoRaWAN Class C). Ağ sunucusu bu konuyu dinleyip aşağı bağlantı kuyruğuna alır.
const kayitlar = msg.kayit ? [msg.kayit] : (msg.kayitlar || []);
const al = kayitlar.filter(k => k.olcum === 'alarm');
if (!al.length) return null;
const say = (context.get('say') || 0) + al.length;
context.set('say', say);
const son = al[al.length - 1];
node.status({ fill: 'red', shape: 'dot', text: 'çobana ' + say + ' alarm · son: ' + son.etiketler.tur + ' ' + son.alanlar.etiket });
return [al.map(k => ({ topic: 'bis505-suru/' + k.etiketler.agil + '/asagi/coban',
  payload: { tur: k.etiketler.tur, etiket: k.alanlar.etiket, sim_saat: k.alanlar.sim_saat, lat: k.alanlar.lat, lon: k.alanlar.lon } }))];
`;

let y = 0;
function fn(id, ad, kod, x, yy, cikis, wires, z, baslat) {
  return { id, type: 'function', z: z || TAB, name: ad, func: kod.trim(), outputs: cikis, timeout: 0, noerr: 0, initialize: (baslat || '').trim(), finalize: '', libs: [], x, y: yy, wires };
}
const nodes = [
  { id: TAB, type: 'tab', label: 'Sabit sis düğümü', disabled: false, info: 'BIS505 Dönem Projesi · sabit sis düğümünün Node-RED karşılığı. Akış numaraları rapordaki Şekil 1 ile aynıdır.' },
  { id: 'broker', type: 'mqtt-broker', name: 'Yerel broker', broker: '${MQTT_HOST}', port: '1883', clientid: 'nodered-sis', autoConnect: true, usetls: false, protocolVersion: '4', keepalive: '60', cleansession: true, autoUnsubscribe: true },

  { id: 'not1', type: 'comment', z: TAB, name: 'Okumalar: LoRaWAN ağ sunucusu → yerel broker (⑥) → kural motoru (⑦) → önem puanlama', info: '', x: 330, y: 40, wires: [] },
  { id: 'mq_lora', type: 'mqtt in', z: TAB, name: 'LoRa okumaları', topic: 'bis505-suru/+/lora/+', qos: '0', datatype: 'json', broker: 'broker', nl: false, rap: true, rh: 0, inputs: 0, x: 130, y: 100, wires: [['kural']] },
  fn('kural', 'Kural motoru (⑦)', KOD.kural, 340, 100, 2, [['onem'], ['onem']]),
  fn('onem', 'Önem puanlama', KOD.onem, 560, 100, 2, [['baglanti', 'coban_lora'], ['tampon']]),
  fn('coban_lora', 'Çobana LoRa alarmı (⑧)', KOD.cobanLora, 830, 40, 1, [['mq_asagi']]),
  { id: 'mq_asagi', type: 'mqtt out', z: TAB, name: 'Aşağı bağlantı (Class C)', topic: '', qos: '1', retain: 'false', respTopic: '', contentType: '', userProps: '', correl: '', expiry: '', broker: 'broker', x: 1070, y: 40, wires: [] },
  fn('tampon', 'Tampon ve özetleme (⑩)', KOD.tampon, 800, 160, 2, [['yazici'], ['baglanti']]),

  { id: 'not2', type: 'comment', z: TAB, name: 'Ağıl kapısı ve akşam sayımı (simülatör ve Wokwi okuyucusu)', info: '', x: 300, y: 240, wires: [] },
  { id: 'mq_kapi', type: 'mqtt in', z: TAB, name: 'Kapı geçişleri', topic: 'bis505-suru/+/kapi', qos: '0', datatype: 'json', broker: 'broker', nl: false, rap: true, rh: 0, inputs: 0, x: 130, y: 300, wires: [['kapi']] },
  fn('kapi', 'Kapı kaydı', KOD.kapi, 340, 300, 1, [['yazici']]),
  { id: 'mq_sayim', type: 'mqtt in', z: TAB, name: 'Akşam sayımı', topic: 'bis505-suru/+/sayim', qos: '0', datatype: 'json', broker: 'broker', nl: false, rap: true, rh: 0, inputs: 0, x: 130, y: 360, wires: [['sayim']] },
  fn('sayim', 'Sayım ve eksik', KOD.sayim, 340, 360, 2, [['yazici'], ['baglanti', 'coban_lora']]),

  { id: 'not3', type: 'comment', z: TAB, name: 'Bağlantı yöneticisi (⑪ ⑫): internet yokken bekletir, gelince önce acil sonra rutin', info: '', x: 360, y: 440, wires: [] },
  fn('baglanti', 'Bağlantı yöneticisi', KOD.baglanti, 820, 300, 2, [['yazici'], ['l_bulut_out']]),
  { id: 'l_bulut_out', type: 'link out', z: TAB, name: 'Buluta ulaşan acil olaylar', mode: 'link', links: ['l_bulut_in'], x: 1015, y: 260, wires: [] },
  { id: 'kes', type: 'inject', z: TAB, name: 'İnterneti kes', props: [{ p: 'payload' }], repeat: '', crontab: '', once: false, onceDelay: 0.1, topic: '', payload: '', payloadType: 'date', x: 140, y: 500, wires: [['kes_fn']] },
  fn('kes_fn', 'Bağlantı kesildi', KOD.internetKes, 340, 500, 1, [[]]),
  { id: 'ver', type: 'inject', z: TAB, name: 'İnterneti ver', props: [{ p: 'payload' }], repeat: '', crontab: '', once: true, onceDelay: 0.5, topic: '', payload: '', payloadType: 'date', x: 140, y: 560, wires: [['ver_fn']] },
  fn('ver_fn', 'Bağlantı geldi', KOD.internetVer, 340, 560, 1, [['baglanti']]),

  { id: 'not4', type: 'comment', z: TAB, name: 'Ölçütler ve InfluxDB yazımı ("sis" = yerel tampon, "bulut" = buluta giden)', info: '', x: 360, y: 640, wires: [] },
  { id: 'olcut_tik', type: 'inject', z: TAB, name: '10 saniyede bir', props: [{ p: 'payload' }], repeat: '10', crontab: '', once: true, onceDelay: 8, topic: '', payload: '', payloadType: 'date', x: 150, y: 700, wires: [['olcut']] },
  fn('olcut', 'Karşılaştırma ölçütleri', KOD.olcut, 370, 700, 1, [['yazici']]),
  fn('yazici', 'InfluxDB yazıcı', KOD.yazici, 1060, 400, 1, [['http']]),
  { id: 'http', type: 'http request', z: TAB, name: 'InfluxDB /api/v2/write', method: 'use', ret: 'txt', paytoqs: 'ignore', url: '', tls: '', persist: false, proxy: '', insecureHTTPParser: false, authType: '', senderr: false, headers: [], x: 1100, y: 480, wires: [['kontrol']] },
  fn('kontrol', 'Yazım kontrolü', KOD.kontrol, 1110, 560, 1, [[]]),
  { id: 'l_yaz_in', type: 'link in', z: TAB, name: 'Buluttan yazım', links: ['l_yaz_out'], x: 905, y: 440, wires: [['yazici']] },
  { id: 'geri_tik', type: 'inject', z: TAB, name: 'Açılışta', props: [{ p: 'payload' }], repeat: '', crontab: '', once: true, onceDelay: 2, topic: '', payload: '', payloadType: 'date', x: 140, y: 760, wires: [['geri_sorgu']] },
  fn('geri_sorgu', 'Sayaçları geri yükle', KOD.geriSorgu, 370, 760, 1, [['geri_http']]),
  { id: 'geri_http', type: 'http request', z: TAB, name: 'InfluxDB /api/v2/query', method: 'use', ret: 'txt', paytoqs: 'ignore', url: '', tls: '', persist: false, proxy: '', insecureHTTPParser: false, authType: '', senderr: false, headers: [], x: 610, y: 760, wires: [['geri_yukle']] },
  fn('geri_yukle', 'Sayaç geri yükleme', KOD.geriYukle, 840, 760, 1, [[]]),

  { id: BULUT, type: 'tab', label: 'Bulut · kayıt ve bildirim', disabled: false, info: 'Bulut tarafının gösterim için küçük karşılığı: akış işlemeden gelen acil olay, hayvan kaydına (Cihaz ve profil yönetimi) bakılarak çobana ve mal sahibine bildirilir (⑭). Kayıt src/kayit.js dosyasından üretilir; tarayıcı simülatörü de aynı dosyayı kullanır. Kişi adları ve küpe numaraları uydurmadır.' },
  { id: 'notb1', type: 'comment', z: BULUT, name: 'Buluta ulaşan acil olay → tekrar eleme → hayvan kaydı → çobana ve mal sahibine bildirim (⑬ ⑭)', info: '', x: 400, y: 40, wires: [] },
  { id: 'l_bulut_in', type: 'link in', z: BULUT, name: 'Sis düğümünden', links: ['l_bulut_out'], x: 95, y: 100, wires: [['bildirim']] },
  fn('bildirim', 'Bildirim servisi (⑭)', KOD.bildirim, 340, 100, 1, [['l_yaz_out']], BULUT, KAYIT_BASLAT),
  { id: 'notb2', type: 'comment', z: BULUT, name: 'Hayvan kaydı: 500 hayvan, 14 mal sahibi, 1 çoban (Cihaz ve profil yönetimi)', info: '', x: 360, y: 180, wires: [] },
  { id: 'kayit_tik', type: 'inject', z: BULUT, name: 'Dakikada bir', props: [{ p: 'payload' }], repeat: '60', crontab: '', once: true, onceDelay: 3, topic: '', payload: '', payloadType: 'date', x: 130, y: 240, wires: [['kayit_yaz']] },
  fn('kayit_yaz', 'Mal sahipleri listesi', KOD.kayitYaz, 360, 240, 1, [['l_yaz_out']], BULUT, KAYIT_BASLAT),
  { id: 'l_yaz_out', type: 'link out', z: BULUT, name: 'InfluxDB yazıcıya', mode: 'link', links: ['l_yaz_in'], x: 655, y: 120, wires: [] }
];
fs.writeFileSync(__dirname + '/flows.json', JSON.stringify(nodes, null, 2));
console.log('flows.json:', nodes.length, 'düğüm');
