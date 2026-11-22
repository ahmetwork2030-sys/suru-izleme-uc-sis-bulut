# Wokwi devreleri

Mimarideki iki uç bileşen Wokwi'de iki ayrı proje olarak çalışır. Wokwi aynı projede iki mikrodenetleyiciyi
birlikte çalıştıramadığı için etiket ile okuyucu ayrıdır; okuyucuya etiketin kodu, Wokwi'nin kızılötesi alıcısına
tıklanarak gönderilir.

| Proje | Mimarideki karşılığı | Kart |
| --- | --- | --- |
| `etiket/` | LED kimlik etiketi (② akışının kaynağı) | ATtiny85 |
| `kapi-okuyucu/` | Ağıl kapısı okuyucu (② okur, ⑥ ile sis düğümüne gönderir) | ESP32 DevKitC V4 |

## Hazır projeler (tarayıcıda açılır, kurulum gerekmez)

- Ağıl kapısı okuyucu (ESP32): https://wokwi.com/projects/481291721449614337
- LED kimlik etiketi (ATtiny85): https://wokwi.com/projects/481291970159331329

İki proje de 21 Kasım 2026'da Wokwi'de derlenip aşağıdaki senaryolarla denendi. Devredeki her parçanın yanında ne işe yaradığını anlatan bir not (`wokwi-text`) vardır. Bu klasördeki dosyalar
Wokwi'deki projelerle aynıdır; Wokwi'de değişiklik yapılırsa buraya da işlenmelidir.

## Etiket numarası ve kızılötesi kod

Etiket kendi numarasını NEC kızılötesi koduyla yayar: numaranın üst baytı **adres**, alt baytı **komut** olur.
Okuyucu numarayı `adres × 256 + komut` ile geri bulur. Sürü listesi 1000–1499 numaralı etiketlerdir.

| Etiket | Adres | Komut | Gösterimdeki durumu |
| --- | --- | --- | --- |
| 1077 | 4 | 53 | Akşam dönmedi |
| 1318 | 5 | 38 | Henüz kapıdan girmedi |
| 1402 | 5 | 122 | Henüz kapıdan girmedi |
| 1250 | 4 | 226 | Ağılda (tekrar okutulursa "zaten içeride") |
| 1600 | 6 | 64 | Sürüde yok (tanımsız etiket) |

## Wokwi'de projeyi kurma

1. [wokwi.com](https://wokwi.com) adresinde **New Project** ile yeni bir proje açın: okuyucu için **ESP32**, etiket için **ATtiny85**.
2. Açılan `sketch.ino` sekmesinin içeriğini bu klasördeki `sketch.ino` ile değiştirin.
3. `diagram.json` sekmesinin içeriğini bu klasördeki `diagram.json` ile değiştirin.
4. Editördeki dosya menüsünden **New file** ile `.h` dosyasını ekleyin (okuyucuda `kapi_sayim.h`, etikette `nec.h`) ve içeriğini yapıştırın.
5. **Library Manager** sekmesinden `libraries.txt` dosyasındaki kütüphaneleri ekleyin
   (okuyucu: IRremote, LiquidCrystal I2C, PubSubClient; etiket: TinyDebug).
6. **Save** ile kaydedin. Ücretsiz hesapta proje **Public** kaydedilir (Unlisted ücretli plandadır); kodda şifre bulunmadığı için sorun yoktur.

## Okuyucu gösterim senaryosu

Simülasyon akşam dönüşüyle başlar: 500 hayvanın 497'si ağılda, üçü dışarıda.

**Yön nasıl bulunur?** Koridorun iki ucunda birer ışık bariyeri vardır (Wokwi'de iki sarı düğme): dış bariyer
mera tarafında, iç bariyer ağıl tarafında. Hayvan önce dış sonra iç bariyeri keserse GİRİŞ, tersi ÇIKIŞ
sayılır. Böylece sabah/akşam ayrımına ya da elle çevrilen bir anahtara gerek kalmaz; gün ortasında dönen ya
da kapıdan geri dönen hayvan da doğru sayılır. Etiket okuması ile bariyer geçişi birbirini 15 saniye bekler.

1. Başlatın. LCD'de `Icerde 497/500` ve `Kapi hazir` görünür.
2. Bir giriş: **Dış bariyer** düğmesine basın → kızılötesi alıcıya tıklayıp komut `38`, adres `5` girin ve Send'e basın
   (LCD: `LED 1318 okundu`) → pencereyi kapatıp **İç bariyer** düğmesine basın. LCD `LED 1318 GIRIS`, `Icerde 498/500`;
   yeşil LED yanar, kayıt MQTT ile gönderilir.
3. Bir çıkış: önce **İç**, sonra **Dış** bariyer. Seri monitörde `Gecis tamamlandi: CIKIS` yazar.
4. Etiketsiz geçiş: iki bariyere basıp etiket kodu göndermeyin. 15 saniye sonra LCD `Etiketsiz gecis!`, kırmızı LED ve
   uyarı sesi gelir (etiket düşmüş ya da pili bitmiş olabilir).
5. Mavi **İnternet aç/kapat** düğmesine basın: bağlantı kesilir. Adres `5`, komut `122` (1402) ile bir giriş daha yapın.
   LCD `Kuyruk 1 (yok)` gösterir: kayıt sıra numarasıyla bekletilir. Mavi düğmeye yeniden basınca kayıt gönderilir.
6. Kırmızı **Sayımı kapat** düğmesine basın. LCD `EKSIK: 1 hayvan / Ilk: 1077`, kırmızı LED ve uzun bir uyarı sesi.
   Eksik listesi MQTT ile gönderilir.
7. Adres `6`, komut `64` (1600) ile bir geçiş yapın: `Tanimsiz etiket`.

Devredeki güç sembolleri (VCC, GND), okuyucunun ağıldaki enerji biriminden (güneş paneli + akü) 5 V ile
beslendiğini gösterir; Wokwi kartı kendiliğinden besler.

### MQTT iletileri

Okuyucu, gösterimde genel test broker'ına (`test.mosquitto.org`, port 1883) yazar. Sahada bu broker ağıldaki
sabit sis düğümünün yerel broker'ıdır. Docker aşamasında bu konular yerel broker'a köprülenecektir.

| Konu | Ne zaman | Örnek |
| --- | --- | --- |
| `bis505-suru/agil1/kapi` | Her geçerli geçiş | `{"sira":1,"etiket":1318,"yon":"giris","t":"2026-11-15T19:42:10+03:00","t_ms":18250,"icerde":498}` |
| `bis505-suru/agil1/sayim` | Sayım kapatılınca | `{"icerde":499,"toplam":500,"eksik":[1077],"t":"..."}` |
| `bis505-suru/agil1/okuyucu` | Bağlanınca, 10 s'de bir nabız olarak ve bağlantı kopunca (son vasiyet iletisi `{"durum":"kopuk"}`) | `{"durum":"bagli","icerde":498,"bekleyen":0}` |

Nabız iletisi sis düğümüne okuyucunun ayakta olduğunu bildirir ve yerel ağda kalır, WAN'a çıkmaz. Wokwi'de ayrıca
bir işe yarar: simülasyon gerçek zamanın yarısı hızında koşabildiği için kütüphanenin kendi canlı tutma (keepalive)
iletisi broker'a geç ulaşır ve broker bağlantıyı düşürür; düzenli nabız bunu önler.

İletileri bilgisayardan izlemek için: `mosquitto_sub -h test.mosquitto.org -t 'bis505-suru/#' -v`

Her kayıt bir **sıra numarası** taşır; bağlantı koptuğunda yeniden gönderilen kayıt bulutta bu numarayla elenir
(raporda 4.5, "Yeniden gönderim ve çift kayıt"). Zaman damgası gönderim anını değil, okuma anını gösterir.

## Etiket gösterimi

Etiket sürekli yayın yapmaz. Zamanının neredeyse tamamını ATtiny85'in en derin uykusunda (power-down) geçirir.
Kapı çerçevesindeki mıknatıs şeridi etiketteki reed anahtarını kapatınca uyanır, kodunu 3 kez yayar ve yeniden uyur.
Wokwi'de reed anahtarını siyah **Kapi miknatisi (reed)** düğmesi temsil eder.

1. Başlatın. Seri çıkışta `LED kimlik etiketi 1318 -> NEC adres 5, komut 38` ve `Uykuda; ...` yazılır. Lojik analizör yalnızca başlangıçtaki birkaç örneği gösterir: etiket uyurken hiçbir şey yaymaz.
2. **Kapi miknatisi** düğmesine basın. Yeşil durum LED'i yanar, kırmızı LED (kızılötesi LED'i temsil eder) 3 NEC çerçevesi gönderir; seri çıkışta `Kapi alani: kod 3 kez yayildi, uykuya donuyor` yazılır. Lojik analizördeki örnek sayısı yaklaşık 6.300'e çıkar (3 çerçeve) ve düğmeye yeniden basılana kadar artmaz.
3. Simülasyonu durdurun. Lojik analizörün kaydı `etiket-nec.vcd` olarak iner.
4. Dosyayı PulseView ile açıp IR NEC çözücüsünü ekleyin: adres `0x05`, komut `0x26` görünür. Bu ekran raporda etiketin kodlamasını gösteren şekil olarak kullanılabilir.

NEC çerçevesi yaklaşık 68 ms sürer: 9 ms başlangıç ışığı, 4,5 ms boşluk ve 32 bit (adres, ters adres, komut, ters komut).
Aynı geçişte 3 kez yayılan kod okuyucuda bir kez sayılır (okuyucu 3 s içindeki tekrarı saymaz).

**Pil ömrü kabaca** (varsayımlar: kızılötesi LED tepe akımı 20 mA ve üçte bir doluluk, 8 MHz'te yaklaşık 3 mA çekirdek akımı,
uykuda 0,2 µA, günde 4 kapı geçişi, CR2032 ≈ 220 mAh):

| Tasarım | Günlük tüketim | CR2032 ömrü |
| --- | --- | --- |
| 2 s'de bir yayın (ilk tasarım) | ≈ 4,6 mAh | ≈ 1,5 ay |
| Kapıda uyanarak 3 yayın (şimdiki) | ≈ 0,006 mAh | pilin kendi kendine boşalması belirler (yıllar) |

## Sahadaki farklar

- Sahada iki bariyer, koridorun iki ucuna karşılıklı takılan kızılötesi verici-alıcı çiftleridir (ışık bariyeri). Gösterimde sarı düğmelerle temsil edilir.
- Gösterimdeki kırmızı LED, sahada 940 nm kızılötesi LED'dir ve gözle görülmez.
- Gösterimdeki "Kapi miknatisi" düğmesi, sahada kapı çerçevesine gömülü mıknatıs şeridi ile etiketin içindeki reed anahtarıdır. Wokwi akım ölçmez; pil ömrü yukarıdaki hesapla tahmin edilmiştir.
- Okuyucu gösterimde doğrudan genel broker'a yazar; sahada ağıldaki yerel MQTT broker'a yazar ve uzun süreli tamponlama sis düğümündedir.

## Birim testi

Sayım mantığı ve NEC kodlaması donanımdan bağımsızdır ve bilgisayarda denenebilir:

```
cd wokwi/test
g++ -std=c++17 -I../kapi-okuyucu -I../etiket test_kapi.cpp -o t && ./t
```
