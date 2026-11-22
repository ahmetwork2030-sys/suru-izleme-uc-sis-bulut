# Bağlantıya Uyarlanabilen Uç–Sis–Bulut Sürü İzleme Platformu

BIS505 Bulut Bilişimde İleri Teknikler dersi dönem projesi (2026–2027 Güz, Dr. Öğr. Üyesi Gözde KARATAŞ BAYDOĞMUŞ).
Hazırlayan: Ahmet ATAGÜL (251129017), Biruni Üniversitesi Bilgisayar Mühendisliği Tezsiz Yüksek Lisans.

## Hızlı başlangıç

| Ne görmek istiyorsunuz | Nasıl açılır | Kurulum |
| --- | --- | --- |
| Tüm sistemin aşama aşama simülasyonu | Bu sayfanın üstündeki **Code → Download ZIP** ile indirin, `cevrimdisi/Suru_Izleme_Simulatoru.html` dosyasına çift tıklayın | Yok; internet de gerekmez |
| LED kimlik etiketi devresi (ATtiny85) | https://wokwi.com/projects/481291970159331329 | Yok; tarayıcıda açılır |
| Ağıl kapısı okuyucu devresi (ESP32) | https://wokwi.com/projects/481291721449614337 | Yok; tarayıcıda açılır |
| Sis düğümü ve bulutun çalışan karşılığı (MQTT, Node-RED, InfluxDB, Grafana) | Docker Desktop açıkken `docker/BASLAT.bat` dosyasına çift tıklayın; pano http://localhost:3000, akış http://localhost:1880 | Docker Desktop (Windows'ta WSL 2 ile); ilk açılışta 1–2 GB indirilir |

Docker servisleri yalnızca bu bilgisayardan (127.0.0.1) erişilebilir; aynı ağdaki başka cihazlara açılmaz. Durdurmak için `docker/DURDUR.bat`.
Ayrıntılar: `docker/README.md` ve `wokwi/README.md`.

Gösterimdeki mal sahibi adları ve kulak küpesi numaraları uydurmadır; gerçek kişi ya da hayvana ait değildir.

## Simülatör

Tarayıcıda çalışan simülasyon projenin tüm katmanlarını tek ekranda gösterir.

500 hayvanlık bir sürü, ağıldaki sabit sis düğümü ve çobanın cebindeki mobil sis düğümü aynı dünyada
üç yöntemle izlenir ve karşılaştırılır:

| Kısaltma | Yöntem | Alarm nerede üretilir | Buluta ne gider |
| --- | --- | --- | --- |
| K | Klasik (bulut merkezli) | Bulutta | Her kayıt ayrı mesajla |
| S | Sis + anlık iletim | Sis katmanında | Her kayıt ayrı mesajla |
| U | Sis + Uyuyan Bulut | Sis katmanında | Acil olay hemen, rutin veri günlük özet olarak |

S yöntemi bir ayrıştırma (ablation) deneyidir: alarm gecikmesindeki kazancın sis katmanından,
veri ve enerji kazancının "Uyuyan Bulut" veri yaşam döngüsünden geldiğini ayrı ayrı gösterir.

## Çalıştırma

- **İnternetsiz tek dosya:** `cevrimdisi/Suru_Izleme_Simulatoru.html` dosyasına çift tıklayın. Yazı tipleri dahil her şey dosyanın içindedir, dış bağlantı yoktur. Kullanım notu: `cevrimdisi/NASIL_ACILIR.txt`.
- **Canlı simülasyon (geliştirme):** `dist/index.html` (yazı tiplerini internetten yükler).
- **Toplu deney:** `node deney/toplu_deney.js 30` → her profil için 5 senaryo × 30 gün. Çıktılar `deney/` klasörüne yazılır.
- **Hızlı kontrol:** `node deney/hizli_test.js` → her profil için 10 günlük tek koşu.
- **Sayfayı yeniden üretmek:** `node build.js` (motor, arayüz bölümleri ve deney özetini tek HTML dosyasına gömer), ardından `node cevrimdisi/build_cevrimdisi.js` (yazı tiplerini gömerek internetsiz sürümü üretir).

Bağımlılık yoktur; Node 18 veya üstü yeterlidir.

## Dosyalar

| Dosya | İçerik |
| --- | --- |
| `src/engine.js` | Hesap motoru: dünya, sürü hareketi, cihaz okumaları, sis kuralları, bağlantı modelleri, ölçütler |
| `src/kayit.js` | Hayvan kaydı (etiket → resmî küpe → mal sahibi → çoban) ve bildirim kuralları (⑭); simülatör ve Node-RED aynı dosyayı kullanır |
| `src/ui/00_temel.js` | Arayüz altyapısı: tuval, renkler, motor olaylarının işlenmesi, veri paketleri, bildirimler |
| `src/ui/10_arazi.js` | Kabartmalı arazi (yükseklik haritası, eş yükselti çizgileri, dere, orman), köy |
| `src/ui/20_kus.js` | Sahne 1 · kuş bakışı: sürüler, çoban, ağıl, köy, kapsama alanları, internet bağlantısı |
| `src/ui/30_dag.js` | Sahne 2 · dağ/mera: sürüyü izleyen yakın kamera, koyunlar, LoRa yayınları, kopma ve hareketsizlik |
| `src/ui/40_agil.js` | Sahne 3 · ağıl kapısı: koridor, ışık bariyerleri, mıknatıs; etiket (ATtiny85) ve okuyucu (ESP32) devrelerinin canlı çizimi, NEC dalga biçimi, MQTT |
| `src/ui/50_koy.js` | Sahne 4 · köydeki sabit sis düğümü: bileşenler arası paket akışı, tampon, gece özeti, bağlantı yöneticisi, enerji |
| `src/ui/60_bulut.js` | Sahne 5 · bulut: servisler, üç yöntemin trafiği, depolama, kullanıcılar |
| `src/ui/70_anlatim.js` | Aşama aşama anlatım (10 adım), canlı panel, olay akışı, 30 günlük sonuçlar |
| `src/ui/90_dongu.js` | Kurulum ve ana döngü |
| `src/eski/` | İlk arayüz sürümü (karşılaştırma için) |
| `cevrimdisi/` | İnternetsiz tek dosya, üretim betiği, gömülen yazı tipleri ve lisansları |
| `src/index.template.html` | Sayfa şablonu ve stiller |
| `deney/toplu_deney.js` | Toplu deney betiği |
| `deney/sonuclar_kosu.csv` | Koşu başına sonuçlar (profil × tohum × yöntem) |
| `deney/sonuclar_ozet.csv`, `deney/ozet.json` | Profil × yöntem özeti |
| `dist/index.html` | Tek dosyalık simülasyon sayfası |
| `wokwi/etiket/` | LED kimlik etiketi devresi (ATtiny85, NEC kızılötesi kod) |
| `wokwi/kapi-okuyucu/` | Ağıl kapısı okuyucu (ESP32: sayım, eksik listesi, MQTT, bağlantı yokken tamponlama) |
| `wokwi/test/` | Sayım mantığı ve NEC kodlaması için birim testi |
| `docker/` | MQTT, Node-RED, InfluxDB, Grafana ve simülatörden oluşan gösterim |

## Docker gösterimi

Sabit sis düğümü ve bulut, Docker üzerinde MQTT, Node-RED, InfluxDB ve Grafana ile çalışır. Simülatör sürünün
verisini yerel broker'a yayınlar, Wokwi'deki kapı okuyucusu da köprüyle aynı broker'a bağlanır.
Kurulum ve gösterim adımları `docker/README.md` dosyasındadır.

## Simülasyonun sahneleri

Simülasyon beş sahne ve bir sonuç sayfasından oluşur; hepsi aynı hesap motorunu paylaşır:

1. **Kuş bakışı:** arazi, sürüler, çoban (mobil sis), ağıl, köy (sabit sis), kapsama alanları ve bulut bağlantısı. Gece/gündüz değişir.
2. **Dağ · mera:** seçilen sürüyü izleyen yakın kamera. Tasma ve LoRa etiketlerinin 15 dakikalık yayınları, yayını kimin duyduğu, sürüden ayrılan ya da hareketsiz kalan hayvan.
3. **Ağıl kapısı:** her hayvan koridordan tek tek geçer. Dış/iç ışık bariyeri yönü, mıknatıs şeridi etiketi uyandırır, kızılötesi okuyucu numarayı okur. Wokwi'deki iki devre (ATtiny85 etiket, ESP32 okuyucu) burada canlı çizilir; LCD, LED'ler, buzzer ve NEC dalga biçimi geçişle birlikte çalışır. Geçiş sürerken simülasyon saati bekler.
4. **Köy · sabit sis düğümü:** mimarideki bileşenler (ağ sunucusu, yerel MQTT, kural motoru, önem puanlama, tampon, özetleme, bağlantı yöneticisi, enerji birimi) arasında gerçek olaylardan üretilen paketler akar.
5. **Bulut:** üç yöntemin buluta gönderdiği trafik, depolama ve kullanıcılar. Acil olay buluta ulaşınca bildirim servisi hayvan kaydına bakar; çobana ve hayvanın sahibine bildirim gider (sağ panelde son bildirimler).
6. **30 günlük sonuçlar:** toplu deney tablosu ve grafikleri.

Sağdaki **aşama aşama anlatım** 10 adımda sistemi baştan sona gösterir; her adım ilgili sahneyi açar, saati ilgili ana getirir ve hızı okunabilir düzeye ayarlar.

## Wokwi devreleri

LED kimlik etiketi ve ağıl kapısı okuyucusu Wokwi'de çalışır ve tarayıcıda doğrudan açılabilir:

- Ağıl kapısı okuyucu (ESP32): https://wokwi.com/projects/481291721449614337
- LED kimlik etiketi (ATtiny85): https://wokwi.com/projects/481291970159331329

Gösterim senaryosu ve kurulum adımları `wokwi/README.md` dosyasındadır.

## Model

**Dünya.** 8 km × 5 km arazi; ağıl (sabit sis düğümü ve LoRa ağ geçidi), dört mera, bir ekili tarla (yasak alan) ve P3 için bir kapsama noktası (tepe). Zaman adımı 1 dakikadır.

**Sürü.** 500 hayvan, 5 grup. Her grubun önünde GPS tasmalı bir önder hayvan vardır; 25 hayvanda LoRa etiketi, 470 hayvanda LED kimlik etiketi bulunur. Sürü 07:00'de ağıldan çıkar, günün merasında otlar, 18:30'da döner. Ağıl kapısında her hayvanın çıkışı ve girişi kaydedilir.

**Olaylar (yer gerçeği).** Her gün belirli olasılıklarla: bir LoRa etiketli hayvan sürüden ayrılır (%35), bir LED etiketli hayvan kopar ve akşam dönmez (%50), bir LoRa etiketli hayvan 2,5–4,5 saat hareketsiz kalır (%30), bir grup ekili tarlaya yönelir (%25).

**Kurallar (sis katmanında ve klasik yöntemde bulutta aynı).**
- Sürüden ayrılma: hayvan, önderinin aynı andaki konumundan 400 m'den uzakta iki ardışık okumada görülürse. Önder konumu iki önder okuması arasında enterpolasyonla bulunur; sürü yürürken değerlendirilmez.
- Hareketsizlik: dört ardışık okumada (1 saat) 15 dakikadaki yer değiştirme 8 m'nin altındaysa.
- Yasak alan: önder okuması tarlanın içindeyse.
- Akşam sayımı: dönüşte ağıla girmeyen LED etiketli hayvan.
- Sessiz cihaz (yalnızca mobil sis): sürüsü çobanın yakınında duyulduğu hâlde 35 dakikadır duyulmayan etiket.

**Haberleşme.** Okuma aralığı 15 dakikadır. LoRa menzili açık arazide ağ geçidi için 5 km, çobanın cihazı için 1,5 km; ormanda sırasıyla 600 m ve 350 m. Tasma, ağ geçidine ulaşamayan LoRa etiketine röle olur (açıkta 300 m, ormanda 200 m). Duyulmayan okumayı cihaz saklar ve ilk fırsatta gönderir.

**Bağlantı profilleri.**

| Profil | Ağıldaki internet | Çobanın telefonu |
| --- | --- | --- |
| P1 · Sürekli | Her zaman var | Her yerde çeker |
| P2 · Günlük aralıklı | Ortalama 20 saat var, 1 saat yok | Köyün 1,5 km çevresinde |
| P3 · Uzun kesinti | Ortalama 60 saat yok, 30 dakika var | Yalnızca tepedeki kapsama noktasında (çoban günlerin %30'unda uğrar) |
| P4 · Sinyal gölgeli | Ortalama 2 saat var, 2 saat yok; ağılın 700 m dışı orman | Ağılın 800 m çevresinde ve ara ara (30 dk var, 90 dk yok) |

**Ölçütler.** Buluta giden mesaj, internet hattından geçen veri (kayıt 100 B + mesaj başına 150 B protokol yükü), bulutta biriken veri, sis düğümünün mobil modeminin açık kaldığı süre (klasik yöntemde kalıcı MQTT bağlantısı; Uyuyan Bulut'ta her gönderim oturumu 1 dakika) ve alarm gecikmesi (olay anından alarmın çobanın telefonuna ulaşmasına kadar; akşam sayımındaki eksikte sayım anından).

## Sonuçlar (5 senaryo × 30 gün)

| Profil | Yöntem | Mesaj / gün | Veri KB / gün | Depolama MB / yıl | Modem dk / gün | Medyan gecikme | p95 gecikme |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| P1 | Klasik | 3.879 | 947 | 141,6 | 1.440 | 9 dk | 76 dk |
| P1 | Uyuyan Bulut | 27 | 19 | 14,0 | 25 | 9 dk | 70 dk |
| P2 | Klasik | 3.879 | 947 | 141,6 | 1.364 | 4 sa 45 dk | 8 sa 55 dk |
| P2 | Uyuyan Bulut | 25 | 19 | 14,0 | 24 | 11 dk | 69 dk |
| P3 | Klasik | 3.602 | 879 | 131,5 | 12 | 5 gün 2 sa | 15 gün |
| P3 | Uyuyan Bulut | 3 | 12 | 13,2 | 0,5 | 36 dk | 71 dk |
| P4 | Klasik | 3.846 | 939 | 140,4 | 713 | 6 sa 11 dk | 11 sa 35 dk |
| P4 | Uyuyan Bulut | 15 | 16 | 14,0 | 13 | 63 dk | 9 sa 6 dk |

Sis + anlık iletim (S) yönteminin gecikmeleri Uyuyan Bulut ile aynı, veri ve mesaj sayıları ise klasik yöntemle aynıdır.
P3'te klasik yöntemde alarmların %20'si 30 gün içinde çobana hiç ulaşmamıştır. Tam tablo `deney/sonuclar_ozet.csv` dosyasındadır.

## Sınırlılıklar

- Sonuçlar modelin varsayımlarına bağlıdır; saha ölçümü değildir.
- Sürü hareketi basitleştirilmiştir: takipçiler önderin çevresinde rastgele bir konumda durur.
- P4'te gruplar çobanın cihazının menzilinden daha geniş bir alana yayıldığında sürüden ayrılma geç fark edilir (medyan yaklaşık 7,5 saat).
- Enerji, modemin açık kaldığı süreyle temsil edilmiştir; ağ arama sırasındaki tüketim modellenmemiştir.
