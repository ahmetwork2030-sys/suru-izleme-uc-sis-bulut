# Docker gösterimi: sabit sis düğümü ve bulut

Raporun 4.7 bölümünde belirtilen kavram kanıtı: mimarinin rolleri açık kaynak karşılıklarıyla tek bilgisayarda çalışır.

| Kapsayıcı | Mimarideki rol | Adres |
| --- | --- | --- |
| `simulator` | Sürü, önder tasmaları, LoRa etiketleri ve ağıl kapısı (LoRaWAN ağ sunucusunun broker'a verdiği çıktı) | — |
| `mosquitto` | Yerel MQTT broker (⑥); Wokwi'deki kapı okuyucusunun iletilerini köprüyle alır | `localhost:1883` |
| `nodered` | Kural motoru (⑦), önem puanlama, tampon ve özetleme (⑩), bağlantı yöneticisi (⑪ ⑫) | http://localhost:1880 |
| `influxdb` | `sis` kovası: sis düğümünün yerel ham verisi · `bulut` kovası: buluta giden acil olay ve özet | http://localhost:8086 |
| `grafana` | Pano | http://localhost:3000 |

## Çalıştırma

Gereken tek şey [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, macOS ya da Linux).

```
cd docker
docker compose up -d
```

İlk çalıştırmada imajlar indirilir (birkaç dakika). Sonra tarayıcıda **http://localhost:3000** adresini açın;
"Sürü İzleme · Sis ve Bulut" panosu kendiliğinden gelir. Simülasyonda bir gün yaklaşık 2,4 dakika sürer.

Durdurmak için `docker compose down`, verileri de silip baştan başlamak için `docker compose down -v`.

## Gösterim senaryosu

1. **Pano:** Haritada önder tasmaları ve LoRa etiketli hayvanlar mera ile ağıl arasında hareket eder. "Buluta giden mesaj"
   grafiğinde klasik yöntemin çizgisi hızla yükselir; Uyuyan Bulut'unki acil olaylar ve gün sonu özetleriyle basamak basamak artar.
2. **Kesinti:** http://localhost:1880 adresinde Node-RED'i açın, **İnterneti kes** düğümünün solundaki düğmeye basın.
   Panoda "Buluta gitmeyi bekleyen mesaj" artar; bulut kovasına yazım durur, yerel `sis` kovasına yazım sürer.
3. **Bağlantı geri gelir:** **İnterneti ver** düğmesine basın. Bağlantı yöneticisi önce acil olayları, sonra özetleri gönderir; bekleyen sayı sıfırlanır.
4. **Akşam sayımı:** Simülasyonda her akşam sayım yapılır; eksik hayvan "Buluta ulaşan alarmlar" tablosuna düşer.
5. **Wokwi ile birlikte:** Wokwi'deki ağıl kapısı okuyucusunu çalıştırın (https://wokwi.com/projects/481291721449614337, ayrıntı `../wokwi/README.md`). Okuyucu iletilerini genel test
   broker'ına yazar, yerel broker bunları köprüyle alır. Panodaki "Ağıldaki hayvan · Wokwi kapısı" kutusu ve alarm tablosu
   Wokwi'de yaptığınız geçişlerle değişir.

## Hayvan kaydı ve bildirimler (⑭)

Node-RED'deki ikinci sekme, **Bulut · kayıt ve bildirim**, bulutun bildirim servisini gösterir. Bağlantı yöneticisinin
buluta ulaştırdığı her acil olay bu sekmeye gelir. Servis aynı olayın ikinci kez gelmesini eler (ağıl + etiket + olay + gün),
hayvan kaydına bakar ve çobana ve hayvanın sahibine bildirim üretir:

| Olay | Çoban | Mal sahibi |
| --- | --- | --- |
| Sürüden ayrılma, hareketsizlik | push | kendi hayvanıysa, seçtiği kanaldan (push ya da SMS) |
| Yasak alan | push | gönderilmez (sürü olayı) |
| Akşam sayımında eksik | tek liste | sahip başına tek mesaj |

Kayıt `../src/kayit.js` dosyasından üretilir (500 hayvan, 14 mal sahibi, 1 çoban); tarayıcı simülatörü de aynı dosyayı
kullanır. Kişi adları ve küpe numaraları uydurmadır. Panodaki son üç panel: gönderilen bildirimler, push ve SMS sayısı,
mal sahipleri listesi.

Node-RED yeniden başlarsa karşılaştırma sayaçları sıfırlanmaz: açılışta InfluxDB'deki son değerler okunur.

## Ayarlar (`.env`)

| Ayar | Varsayılan | Açıklama |
| --- | --- | --- |
| `PROFIL` | `P2` | Bağlantı profili: P1, P2, P3 ya da P4 |
| `HIZ` | `10` | Gerçek saniye başına simülasyon dakikası |
| `TOHUM` | `11` | Senaryo tohumu; değiştirince farklı olaylar üretilir |

Profili değiştirdikten sonra yalnızca simülatörü yeniden başlatmak yeter: `docker compose up -d simulator`.

## Ölçütlerin anlamı

Node-RED her okumayı ve kapı geçişini "klasik yöntemde buluta gidecek bir mesaj" olarak sayar. Uyuyan Bulut'ta
buluta yalnızca bağlantı yöneticisinden geçen paketler gider: her acil olay bir mesaj, her gün sonu özeti bir mesaj.
Mesaj başına 150 bayt protokol yükü eklenir. Bu sayaçlar `sis` kovasındaki `olcut` ölçümüne yazılır.

## Dosyalar

| Dosya | İçerik |
| --- | --- |
| `docker-compose.yml` | Beş kapsayıcının tanımı |
| `.env` | Gösterim ayarları ve yerel parolalar |
| `mosquitto/mosquitto.conf` | Yerel broker ve Wokwi köprüsü |
| `influxdb/kovalar.sh` | İlk kurulumda `bulut` kovasını oluşturur |
| `nodered/flows.json` | Sis düğümü akışı (`node nodered/akis_uret.js` ile yeniden üretilir) |
| `simulator/` | Hesap motoru (`../src/engine.js` kopyası) ve MQTT yayıncısı |
| `grafana/` | Veri kaynağı, pano tanımı (`node grafana/pano_uret.js` ile yeniden üretilir) |

## Güvenlik notu

Bu kurulum yalnızca yerel gösterim içindir: broker anonim bağlantıya açıktır, parola ve token `.env` dosyasında sabittir.
Raporun 6. bölümündeki önlemler (TLS, cihaz sertifikası, rol ve sahiplik bazlı erişim) bu gösterimde uygulanmamıştır.
