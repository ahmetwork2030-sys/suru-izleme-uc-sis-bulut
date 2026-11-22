// Grafana panosunu (dashboards/suru.json) üretir. Çalıştırma: node pano_uret.js
const fs = require('fs');
const DS = { type: 'influxdb', uid: 'influx-suru' };
let id = 0;
function hedef(sorgu) { return [{ refId: 'A', datasource: DS, query: sorgu.trim() }]; }

const sorgu = {
  icerdeSim: `
from(bucket: "sis")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "kapi" and r._field == "icerde" and r.agil == "agil-sim")
  |> group()
  |> sort(columns: ["_time"])
  |> last()`,
  icerdeWokwi: `
from(bucket: "sis")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "kapi" and r._field == "icerde" and r.agil == "agil1")
  |> group()
  |> sort(columns: ["_time"])
  |> last()`,
  bekleyen: `
from(bucket: "sis")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "olcut" and r._field == "bekleyen")
  |> group()
  |> sort(columns: ["_time"])
  |> last()`,
  mesaj: `
from(bucket: "sis")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "olcut" and r.agil == "agil-sim" and (r._field == "klasik_mesaj" or r._field == "uyuyan_mesaj"))
  |> map(fn: (r) => ({ r with _field: if r._field == "klasik_mesaj" then "Klasik: her kayıt ayrı mesaj" else "Uyuyan Bulut: acil + günlük özet" }))`,
  veri: `
from(bucket: "sis")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "olcut" and r.agil == "agil-sim" and (r._field == "klasik_kb" or r._field == "uyuyan_kb"))
  |> map(fn: (r) => ({ r with _field: if r._field == "klasik_kb" then "Klasik" else "Uyuyan Bulut" }))`,
  harita: `
from(bucket: "sis")
  |> range(start: -15m)
  |> filter(fn: (r) => r._measurement == "okuma" and r.agil == "agil-sim" and (r._field == "lat" or r._field == "lon"))
  |> last()
  |> group(columns: ["etiket", "cihaz"])
  |> pivot(rowKey: ["etiket"], columnKey: ["_field"], valueColumn: "_value")
  |> group()
  |> keep(columns: ["etiket", "cihaz", "lat", "lon"])`,
  alarmlar: `
from(bucket: "bulut")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "alarm" and r._field == "etiket")
  |> group()
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 25)
  |> keep(columns: ["_time", "agil", "tur", "_value"])
  |> rename(columns: {_value: "etiket"})`,
  mesafe: `
from(bucket: "bulut")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "ozet" and r._field == "mesafe_m" and r.agil == "agil-sim")
  |> last()
  |> group()
  |> sort(columns: ["_value"], desc: true)
  |> limit(n: 15)
  |> map(fn: (r) => ({ etiket: "Etiket " + r.etiket, "Günlük yürüme (m)": r._value }))`,
  bildirim: `
from(bucket: "bulut")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "bildirim")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> map(fn: (r) => ({ r with kupe: if exists r.kupe then r.kupe else "", sim_saat: if exists r.sim_saat then r.sim_saat else "" }))
  |> group()
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 100)
  |> keep(columns: ["_time", "sim_saat", "alici", "kisi", "kanal", "tur", "etiket", "kupe", "mesaj"])`,
  kanal: `
from(bucket: "bulut")
  |> range(start: -7d)
  |> filter(fn: (r) => r._measurement == "bildirim" and r._field == "adet")
  |> group(columns: ["kanal"])
  |> count()
  |> group()
  |> map(fn: (r) => ({ _time: now(), kanal: r.kanal, _value: r._value }))
  |> pivot(rowKey: ["_time"], columnKey: ["kanal"], valueColumn: "_value")
  |> drop(columns: ["_time"])`,
  sahip: `
from(bucket: "bulut")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "sahip")
  |> last()
  |> map(fn: (r) => ({ r with _value: string(v: r._value) }))
  |> group(columns: ["kod"])
  |> pivot(rowKey: ["kod"], columnKey: ["_field"], valueColumn: "_value")
  |> group()
  |> keep(columns: ["kod", "ad", "hayvan", "kanal", "bildirim"])
  |> sort(columns: ["kod"])`
};

function stat(baslik, s, x, y, w, aciklama, renk) {
  return {
    id: ++id, type: 'stat', title: baslik, description: aciklama, datasource: DS, targets: hedef(s),
    gridPos: { x, y, w, h: 5 },
    options: { reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false }, colorMode: 'value', graphMode: 'none', textMode: 'value', justifyMode: 'center' },
    fieldConfig: { defaults: { unit: 'none', decimals: 0, color: { mode: 'fixed', fixedColor: renk || 'green' } }, overrides: [] }
  };
}
function zaman(baslik, s, x, y, w, birim, aciklama) {
  return {
    id: ++id, type: 'timeseries', title: baslik, description: aciklama, datasource: DS, targets: hedef(s),
    gridPos: { x, y, w, h: 8 },
    options: { legend: { displayMode: 'list', placement: 'bottom', showLegend: true }, tooltip: { mode: 'multi', sort: 'desc' } },
    fieldConfig: {
      defaults: { unit: birim, custom: { lineWidth: 2, fillOpacity: 8, showPoints: 'never', scaleDistribution: { type: 'log', log: 10 } } },
      overrides: [
        { matcher: { id: 'byRegexp', options: '.*Klasik.*' }, properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: '#8091a5' } }] },
        { matcher: { id: 'byRegexp', options: '.*Uyuyan.*' }, properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: '#2a9d7f' } }] }
      ]
    }
  };
}

const panolar = [
  stat('Ağıldaki hayvan · simülasyon', sorgu.icerdeSim, 0, 0, 6, 'Simülatördeki sürünün kapı sayımı (500 hayvan).'),
  stat('Ağıldaki hayvan · Wokwi kapısı', sorgu.icerdeWokwi, 6, 0, 6, 'Wokwi\'deki ağıl kapısı okuyucusundan köprüyle gelen sayım.'),
  stat('Buluta gitmeyi bekleyen mesaj', sorgu.bekleyen, 12, 0, 6, 'Node-RED\'de "İnterneti kes" ile bağlantı kesilince bağlantı yöneticisinin kuyruğu.', 'orange'),
  {
    id: ++id, type: 'text', title: 'Bu pano', gridPos: { x: 18, y: 0, w: 6, h: 5 },
    options: { mode: 'markdown', content: '**"sis"** kovası sabit sis düğümünün yerel ham verisidir. **"bulut"** kovası yalnızca acil olayları ve günlük özetleri tutar. Alttaki iki grafik, aynı sürü için klasik yöntemin ve Uyuyan Bulut\'un buluta göndereceği mesaj ve veri miktarını karşılaştırır (logaritmik eksen).' }
  },
  zaman('Buluta giden mesaj (toplam)', sorgu.mesaj, 0, 5, 12, 'none', 'Klasik yöntemde her okuma ve kapı geçişi ayrı mesajdır.'),
  zaman('İnternet hattından geçen veri (KB, toplam)', sorgu.veri, 12, 5, 12, 'kbytes', 'Mesaj başına 150 bayt protokol yükü dahil.'),
  {
    id: ++id, type: 'geomap', title: 'Sürü · son konumlar (önder tasmaları ve LoRa etiketleri)', datasource: DS, targets: hedef(sorgu.harita),
    gridPos: { x: 0, y: 13, w: 14, h: 12 },
    options: {
      view: { id: 'coords', lat: 40.5725, lon: 42.027, zoom: 12.5 },
      controls: { showZoom: true, mouseWheelZoom: true },
      basemap: { type: 'osm-standard', name: 'OpenStreetMap', config: {} },
      layers: [{ type: 'markers', name: 'Hayvanlar', location: { mode: 'auto' }, tooltip: true,
        config: { showLegend: false, style: { size: { fixed: 6 }, color: { fixed: '#2563a8' }, opacity: 0.85, symbol: { mode: 'fixed', fixed: 'img/icons/marker/circle.svg' } } } }],
      tooltip: { mode: 'details' }
    },
    fieldConfig: { defaults: {}, overrides: [] }
  },
  {
    id: ++id, type: 'table', title: 'Buluta ulaşan alarmlar', datasource: DS, targets: hedef(sorgu.alarmlar),
    gridPos: { x: 14, y: 13, w: 10, h: 12 },
    options: { showHeader: true, cellHeight: 'sm' },
    fieldConfig: { defaults: {}, overrides: [
      { matcher: { id: 'byName', options: '_time' }, properties: [{ id: 'displayName', value: 'Zaman' }] },
      { matcher: { id: 'byName', options: 'agil' }, properties: [{ id: 'displayName', value: 'Ağıl' }] },
      { matcher: { id: 'byName', options: 'tur' }, properties: [{ id: 'displayName', value: 'Olay' }, { id: 'mappings', value: [{ type: 'value', options: {
        kopma: { text: 'Sürüden ayrılma', color: 'orange' }, hareketsiz: { text: 'Hareketsizlik', color: 'orange' },
        yasak: { text: 'Yasak alan', color: 'red' }, eksik: { text: 'Akşam sayımında eksik', color: 'red' } } }] }, { id: 'custom.cellOptions', value: { type: 'color-text' } }] },
      { matcher: { id: 'byName', options: 'etiket' }, properties: [{ id: 'displayName', value: 'Etiket' }] }
    ] }
  },
  {
    id: ++id, type: 'bargauge', title: 'Günlük özetten: en çok yürüyen hayvanlar (bulut)', datasource: DS, targets: hedef(sorgu.mesafe),
    gridPos: { x: 0, y: 25, w: 24, h: 8 },
    options: { orientation: 'horizontal', displayMode: 'basic', showUnfilled: true, reduceOptions: { calcs: ['lastNotNull'], fields: '', values: true } },
    fieldConfig: { defaults: { unit: 'lengthm', min: 0, color: { mode: 'fixed', fixedColor: '#2a9d7f' } }, overrides: [] }
  
  },
  {
    id: ++id, type: 'table', title: 'Gönderilen bildirimler (⑭) · çoban ve mal sahibi', datasource: DS, targets: hedef(sorgu.bildirim),
    description: 'Bulutun bildirim servisi, buluta ulaşan her acil olayı hayvan kaydına bakarak çobana ve hayvanın sahibine gönderir. Mal sahibi bildirimi kendi seçtiği kanaldan (push ya da SMS) alır. Kişi adları ve küpe numaraları uydurmadır.',
    gridPos: { x: 0, y: 33, w: 16, h: 12 },
    transformations: [{ id: 'organize', options: { indexByName: { _time: 0, sim_saat: 1, tur: 2, alici: 3, kisi: 4, kanal: 5, etiket: 6, kupe: 7, mesaj: 8 } } }],
    options: { showHeader: true, cellHeight: 'sm', sortBy: [{ displayName: 'Zaman', desc: true }] },
    fieldConfig: { defaults: { custom: { align: 'auto' } }, overrides: [
      { matcher: { id: 'byName', options: '_time' }, properties: [{ id: 'displayName', value: 'Zaman' }, { id: 'custom.width', value: 150 }] },
      { matcher: { id: 'byName', options: 'sim_saat' }, properties: [{ id: 'displayName', value: 'Sim. saati' }, { id: 'custom.width', value: 100 }] },
      { matcher: { id: 'byName', options: 'alici' }, properties: [{ id: 'displayName', value: 'Alıcı' }, { id: 'custom.width', value: 90 }] },
      { matcher: { id: 'byName', options: 'kisi' }, properties: [{ id: 'displayName', value: 'Kişi' }, { id: 'custom.width', value: 140 }] },
      { matcher: { id: 'byName', options: 'kanal' }, properties: [{ id: 'displayName', value: 'Kanal' }, { id: 'custom.width', value: 65 },
        { id: 'mappings', value: [{ type: 'value', options: { SMS: { color: 'orange', index: 0 }, push: { color: 'blue', index: 1 } } }] }, { id: 'custom.cellOptions', value: { type: 'color-text' } }] },
      { matcher: { id: 'byName', options: 'tur' }, properties: [{ id: 'displayName', value: 'Olay' }, { id: 'custom.width', value: 130 }, { id: 'mappings', value: [{ type: 'value', options: {
        kopma: { text: 'Sürüden ayrılma', index: 0 }, hareketsiz: { text: 'Hareketsizlik', index: 1 }, yasak: { text: 'Yasak alan', index: 2 }, eksik: { text: 'Sayımda eksik', index: 3 } } }] }] },
      { matcher: { id: 'byName', options: 'etiket' }, properties: [{ id: 'displayName', value: 'Etiket' }, { id: 'custom.width', value: 65 }] },
      { matcher: { id: 'byName', options: 'kupe' }, properties: [{ id: 'displayName', value: 'Resmi küpe' }, { id: 'custom.width', value: 120 }] },
      { matcher: { id: 'byName', options: 'mesaj' }, properties: [{ id: 'displayName', value: 'Mesaj' }] }
    ] }
  },
  {
    id: ++id, type: 'stat', title: 'Bildirim kanalı', datasource: DS, targets: hedef(sorgu.kanal),
    description: 'Push mobil uygulamaya gider. SMS yalnızca uygulaması olmayan mal sahiplerine gider; bölge ölçeğinde maliyetin büyük kısmı SMS\'tir (rapor Bölüm 7.2).',
    gridPos: { x: 16, y: 33, w: 8, h: 4 },
    options: { reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false }, colorMode: 'value', graphMode: 'none', textMode: 'value_and_name', justifyMode: 'center' },
    fieldConfig: { defaults: { unit: 'none', decimals: 0 }, overrides: [
      { matcher: { id: 'byName', options: 'push' }, properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: '#5794f2' } }, { id: 'displayName', value: 'Push' }] },
      { matcher: { id: 'byName', options: 'SMS' }, properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: '#ff9830' } }] }
    ] }
  },
  {
    id: ++id, type: 'table', title: 'Hayvan kaydı · mal sahipleri', datasource: DS, targets: hedef(sorgu.sahip),
    description: 'Buluttaki "Cihaz ve profil yönetimi" her etiketin hangi hayvana (resmi kulak küpesi) ve hangi mal sahibine ait olduğunu tutar. Köy sürüsünde 500 hayvan 14 aileye aittir; tek çoban hepsini otlatır.',
    gridPos: { x: 16, y: 37, w: 8, h: 8 },
    transformations: [{ id: 'organize', options: { indexByName: { kod: 0, ad: 1, hayvan: 2, kanal: 3, bildirim: 4 } } }],
    options: { showHeader: true, cellHeight: 'sm' },
    fieldConfig: { defaults: {}, overrides: [
      { matcher: { id: 'byName', options: 'kod' }, properties: [{ id: 'displayName', value: 'Kod' }] },
      { matcher: { id: 'byName', options: 'ad' }, properties: [{ id: 'displayName', value: 'Ad' }] },
      { matcher: { id: 'byName', options: 'hayvan' }, properties: [{ id: 'displayName', value: 'Hayvan' }] },
      { matcher: { id: 'byName', options: 'kanal' }, properties: [{ id: 'displayName', value: 'Kanal' }] },
      { matcher: { id: 'byName', options: 'bildirim' }, properties: [{ id: 'displayName', value: 'Bildirim' }] }
    ] }
  }
];

const pano = {
  uid: 'suru-izleme', title: 'Sürü İzleme · Sis ve Bulut', tags: ['bis505', 'suru'], timezone: 'browser', schemaVersion: 39, version: 1,
  editable: true, refresh: '10s', time: { from: 'now-30m', to: 'now' }, panels: panolar, templating: { list: [] }, annotations: { list: [] }
};
fs.writeFileSync(__dirname + '/dashboards/suru.json', JSON.stringify(pano, null, 2));
console.log('dashboards/suru.json:', panolar.length, 'panel');
