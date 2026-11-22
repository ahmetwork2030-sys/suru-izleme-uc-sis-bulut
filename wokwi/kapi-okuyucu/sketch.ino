/*
 * Ağıl kapısı okuyucu (ESP32)
 * BIS505 Dönem Projesi · Ahmet ATAGÜL
 *
 * Tek sıra geçişli koridordan geçen hayvanın LED kimlik etiketinin kızılötesi kodunu okur,
 * giriş ve çıkışı sayar, akşam sayımında eksik hayvanları listeler ve kayıtları MQTT ile
 * sis düğümüne gönderir (mimarideki ② ve ⑥ akışları). Bağlantı yokken kayıtları sıra
 * numarasıyla bekletir, bağlantı gelince gönderir.
 *
 * Yön, koridorun iki ucundaki ışık bariyerlerinden bulunur: önce dış (mera tarafı) sonra iç
 * (ağıl tarafı) bariyer kesilirse GİRİŞ, tersi ÇIKIŞ. Etiket okuması ile geçiş birbirini 15 s bekler;
 * etiketsiz geçiş (etiket düşmüş, pili bitmiş) uyarı verir.
 *
 * Wokwi'de bir geçiş: "Dış bariyer" düğmesi -> kızılötesi alıcıya tıklayıp NEC adres/komut girin
 * -> "İç bariyer" düğmesi. Etiket no = adres x 256 + komut (örnek: 1318 -> adres 5, komut 38).
 * Güç: ağıldaki enerji biriminden (güneş paneli + akü) 5 V.
 *
 * Bağlantılar:
 *   IR alıcı DAT -> GPIO15      LCD (I2C) SDA -> GPIO21, SCL -> GPIO22
 *   Yeşil LED  -> GPIO26        Kırmızı LED -> GPIO27      Buzzer -> GPIO25
 *   Dış bariyer -> GPIO16      İç bariyer -> GPIO4
 *   "Sayımı kapat" düğmesi -> GPIO13      "İnternet aç/kapat" düğmesi -> GPIO33
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <IRremote.hpp>
#include <LiquidCrystal_I2C.h>
#include <time.h>
#include "kapi_sayim.h"

// ---------- ayarlar ----------
const char* WIFI_AG   = "Wokwi-GUEST";
const char* WIFI_SIFRE = "";
const char* BROKER    = "test.mosquitto.org";   // gösterim için genel broker; sahada sabit sis düğümündeki yerel broker
const uint16_t BROKER_PORT = 1883;
const char* KONU_KAPI  = "bis505-suru/agil1/kapi";
const char* KONU_SAYIM = "bis505-suru/agil1/sayim";
const char* KONU_DURUM = "bis505-suru/agil1/okuyucu";

const uint8_t PIN_IR = 15, PIN_YESIL = 26, PIN_KIRMIZI = 27, PIN_BUZZER = 25;
const uint8_t PIN_DIS = 16, PIN_IC = 4, PIN_SAYIM = 13, PIN_INTERNET = 33;

// Gösterim senaryosu: akşam dönüşü, üç hayvan henüz ağıla girmedi
const uint16_t DEMO_DISARIDA[] = { 1077, 1318, 1402 };

// ---------- nesneler ----------
LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiClient agIstemcisi;
PubSubClient mqtt(agIstemcisi);
kapi::Sayim sayim;
kapi::YonBulucu yonBulucu;

// Etiket okuması ile bariyer geçişi birbirini en çok PENCERE_MS bekler (hangisi önce gelirse)
const uint32_t PENCERE_MS = kapi::YonBulucu::PENCERE_MS;
uint16_t bekleyenNo = 0;     uint32_t bekleyenNoT = 0;
bool bekleyenGecis = false;  kapi::Yon bekleyenYon = kapi::GIRIS;  uint32_t bekleyenGecisT = 0;
uint16_t sonKayitNo = 0;     uint32_t sonKayitT = 0;   // etiketin aynı yayındaki 2. ve 3. çerçevesi için

bool internetAcik = true;        // "İnternet aç/kapat" düğmesiyle kesinti taklit edilir
uint32_t sonBaglantiDenemesi = 0;
uint32_t ekranDonus = 0;

// ---------- yardımcılar ----------
// Okumanın olay zamanı (NTP saati varsa); gönderim gecikse de olay zamanı korunur
String zamanDamgasi(uint32_t olayMs) {
  time_t simdi; time(&simdi);
  if (simdi < 1700000000) return String("");              // saat henüz alınmadı
  time_t olay = simdi - (time_t)((millis() - olayMs) / 1000);
  struct tm t; localtime_r(&olay, &t);
  char b[32];
  strftime(b, sizeof b, "%Y-%m-%dT%H:%M:%S+03:00", &t);
  return String(b);
}

void satir(uint8_t r, const char* s) {     // ekranı silmeden 16 karakterlik satır yaz
  char b[17];
  snprintf(b, sizeof b, "%-16s", s);
  lcd.setCursor(0, r);
  lcd.print(b);
}

void ekranOzet() {
  char s1[17], s2[17];
  snprintf(s1, sizeof s1, "Icerde %u/%u", sayim.icerde(), kapi::SURU);
  if (sayim.bekleyen()) snprintf(s2, sizeof s2, "Kuyruk %u%s", sayim.bekleyen(), internetAcik ? "" : " (yok)");
  else snprintf(s2, sizeof s2, "%s", yonBulucu.yarimGecis(millis()) ? "Gecis suruyor" : "Kapi hazir");
  satir(0, s1); satir(1, s2);
}

void ekranMesaj(const char* s1, const char* s2) {
  satir(0, s1); satir(1, s2);
  ekranDonus = millis() + 2500;
}

void isaret(bool iyi) {
  digitalWrite(iyi ? PIN_YESIL : PIN_KIRMIZI, HIGH);
  tone(PIN_BUZZER, iyi ? 2000 : 400, iyi ? 60 : 300);
  delay(120);
  digitalWrite(PIN_YESIL, LOW);
  digitalWrite(PIN_KIRMIZI, LOW);
}

bool baglan() {
  if (!internetAcik) return false;
  if (WiFi.status() != WL_CONNECTED) return false;
  if (mqtt.connected()) return true;
  if (millis() - sonBaglantiDenemesi < 5000) return false;      // 5 s'de bir dene
  sonBaglantiDenemesi = millis();
  String id = "agil1-okuyucu-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.print("MQTT baglantisi... ");
  if (mqtt.connect(id.c_str(), KONU_DURUM, 0, true, "{\"durum\":\"kopuk\"}")) {
    Serial.println("tamam");
    mqtt.publish(KONU_DURUM, "{\"durum\":\"bagli\"}", true);
    return true;
  }
  Serial.printf("olmadi (kod %d)\n", mqtt.state());
  return false;
}

// kuyruktaki kayıtları sırayla gönder; gönderilemeyen kuyrukta kalır
void kuyruguGonder() {
  if (!baglan()) return;
  kapi::Kayit k;
  uint8_t tur = 0;
  while (sayim.ilkKayit(k) && tur++ < 20) {
    char b[160];
    snprintf(b, sizeof b, "{\"sira\":%lu,\"etiket\":%u,\"yon\":\"%s\",\"t\":\"%s\",\"t_ms\":%lu,\"icerde\":%u}",
             (unsigned long)k.sira, k.etiket, k.yon ? "giris" : "cikis", zamanDamgasi(k.zamanMs).c_str(),
             (unsigned long)k.zamanMs, sayim.icerde());
    if (!mqtt.publish(KONU_KAPI, b)) break;
    Serial.printf("Gonderildi: %s\n", b);
    sayim.ilkiSil();
  }
}

void sayimiKapat() {
  static uint16_t liste[kapi::SURU];
  uint16_t n = sayim.eksikler(liste, kapi::SURU);
  Serial.printf("\n=== Aksam sayimi: %u/%u icerde, %u eksik ===\n", sayim.icerde(), kapi::SURU, n);
  String json = "{\"icerde\":" + String(sayim.icerde()) + ",\"toplam\":" + String(kapi::SURU) + ",\"eksik\":[";
  for (uint16_t i = 0; i < n && i < 40; i++) {
    Serial.printf("  Eksik: LED %u\n", liste[i]);
    json += (i ? "," : "") + String(liste[i]);
  }
  json += "],\"t\":\"" + zamanDamgasi(millis()) + "\"}";
  char s2[17];
  if (n) {
    snprintf(s2, sizeof s2, "Ilk: %u", liste[0]);
    char s1[17]; snprintf(s1, sizeof s1, "EKSIK: %u hayvan", n);
    ekranMesaj(s1, s2);
    tone(PIN_BUZZER, 880, 800);
    digitalWrite(PIN_KIRMIZI, HIGH);
  } else {
    ekranMesaj("Sayim tamam", "Eksik yok");
    digitalWrite(PIN_KIRMIZI, LOW);
  }
  if (baglan()) mqtt.publish(KONU_SAYIM, json.c_str());
  else Serial.println("Sayim sonucu baglanti gelince gonderilecek (sis dugumu tamponu).");
}

// basit düğme okuma (düşen kenar)
bool basildi(uint8_t pin, bool& onceki) {
  bool simdi = digitalRead(pin) == LOW;
  bool kenar = simdi && !onceki;
  onceki = simdi;
  if (kenar) delay(30);
  return kenar;
}

// ---------- kurulum ----------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_YESIL, OUTPUT);
  pinMode(PIN_KIRMIZI, OUTPUT);
  pinMode(PIN_DIS, INPUT_PULLUP);
  pinMode(PIN_IC, INPUT_PULLUP);
  pinMode(PIN_SAYIM, INPUT_PULLUP);
  pinMode(PIN_INTERNET, INPUT_PULLUP);

  lcd.init();
  lcd.backlight();
  ekranMesaj("Agil kapisi", "okuyucu basliyor");

  sayim.yeniGun();
  for (uint16_t no : DEMO_DISARIDA) sayim.disaridaIsaretle(no);

  IrReceiver.begin(PIN_IR, DISABLE_LED_FEEDBACK);

  WiFi.begin(WIFI_AG, WIFI_SIFRE, 6);
  mqtt.setServer(BROKER, BROKER_PORT);
  mqtt.setBufferSize(1024);                 // sayım iletisindeki eksik listesi için
  mqtt.setKeepAlive(60);                    // Wokwi gerçek zamanın ~%50'sinde koşunca broker bağlantıyı düşürmesin
  configTime(3 * 3600, 0, "pool.ntp.org");

  Serial.println("\nAgil kapisi okuyucu hazir.");
  Serial.println("Gecis: Dis bariyer -> kizilotesi aliciya kod -> Ic bariyer = GIRIS (tersi CIKIS).");
  Serial.println("Disarida bekleyen hayvanlar: 1077 (adres 4, komut 53), 1318 (adres 5, komut 38), 1402 (adres 5, komut 122)");
  ekranDonus = millis() + 1500;
}

// Eşleşen okuma + geçişi sayıma işler
void kaydet(uint16_t no, kapi::Yon yon, uint32_t t) {
  sonKayitNo = no; sonKayitT = t;
  kapi::Sonuc r = sayim.oku(no, yon, t);
  char s1[17], s2[17];
  switch (r) {
    case kapi::KAYDEDILDI:
      snprintf(s1, sizeof s1, "LED %u %s", no, yon ? "GIRIS" : "CIKIS");
      snprintf(s2, sizeof s2, "Icerde %u/%u", sayim.icerde(), kapi::SURU);
      Serial.printf("%s  -> %s\n", s1, s2);
      ekranMesaj(s1, s2); isaret(true);
      break;
    case kapi::TEKRAR_OKUMA:
      Serial.printf("LED %u: ayni gecisin tekrari, sayilmadi\n", no);
      break;
    case kapi::DURUM_AYNI:
      snprintf(s1, sizeof s1, "LED %u", no);
      ekranMesaj(s1, yon ? "Zaten icerde" : "Zaten disarida"); isaret(false);
      Serial.printf("LED %u: %s\n", no, yon ? "zaten icerde" : "zaten disarida");
      break;
    case kapi::TANIMSIZ:
      snprintf(s2, sizeof s2, "Kod %u", no);
      ekranMesaj("Tanimsiz etiket", s2); isaret(false);
      Serial.printf("Tanimsiz kod %u (surude yok)\n", no);
      break;
  }
}

// Kızılötesi alıcı bir etiket numarası okudu
void etiketOkundu(uint16_t no) {
  uint32_t t = millis();
  if (no == sonKayitNo && t - sonKayitT < kapi::TEKRAR_MS) return;     // aynı yayının tekrar çerçevesi
  if (bekleyenGecis && t - bekleyenGecisT <= PENCERE_MS) {            // geçiş önce algılanmıştı
    bekleyenGecis = false;
    kaydet(no, bekleyenYon, bekleyenGecisT);
    return;
  }
  if (no == bekleyenNo && t - bekleyenNoT < kapi::TEKRAR_MS) return;
  bekleyenNo = no; bekleyenNoT = t;
  char s1[17]; snprintf(s1, sizeof s1, "LED %u okundu", no);
  ekranMesaj(s1, "Bariyer bekle..");
  Serial.printf("LED %u okundu, bariyer gecisi bekleniyor\n", no);
}

// Bir ışık bariyeri kesildi
void bariyerKesildi(kapi::Bariyer b) {
  uint32_t t = millis();
  kapi::Yon yon;
  if (!yonBulucu.kesildi(b, t, yon)) {
    Serial.printf("%s bariyer kesildi\n", b == kapi::DIS ? "Dis" : "Ic");
    return;
  }
  Serial.printf("Gecis tamamlandi: %s\n", yon ? "GIRIS" : "CIKIS");
  if (bekleyenNo && t - bekleyenNoT <= PENCERE_MS) {                 // etiket önce okunmuştu
    uint16_t no = bekleyenNo; bekleyenNo = 0;
    kaydet(no, yon, t);
  } else {
    bekleyenGecis = true; bekleyenYon = yon; bekleyenGecisT = t;
    ekranMesaj(yon ? "Giris algilandi" : "Cikis algilandi", "Etiket bekle..");
  }
}

// ---------- ana döngü ----------
void loop() {
  static bool oSayim = false, oInternet = false, oDis = false, oIc = false;

  if (IrReceiver.decode()) {
    IRData& d = IrReceiver.decodedIRData;
    bool tekrar = d.flags & IRDATA_FLAGS_IS_REPEAT;
    if (d.protocol == NEC && !tekrar) etiketOkundu((uint16_t)((d.address & 0xFF) << 8) | (d.command & 0xFF));
    IrReceiver.resume();
  }

  if (basildi(PIN_DIS, oDis)) bariyerKesildi(kapi::DIS);
  if (basildi(PIN_IC, oIc)) bariyerKesildi(kapi::IC);

  // süresi dolan yarım eşleşmeler
  uint32_t simdi = millis();
  if (bekleyenGecis && simdi - bekleyenGecisT > PENCERE_MS) {
    bekleyenGecis = false;
    Serial.println("UYARI: etiketsiz gecis (etiket dusmus ya da pili bitmis olabilir)");
    ekranMesaj("Etiketsiz gecis!", "Etiketi kontrol");
    isaret(false);
  }
  if (bekleyenNo && simdi - bekleyenNoT > PENCERE_MS) {
    Serial.printf("LED %u okundu ama gecis tamamlanmadi (hayvan geri dondu)\n", bekleyenNo);
    bekleyenNo = 0;
  }

  if (basildi(PIN_SAYIM, oSayim)) sayimiKapat();
  if (basildi(PIN_INTERNET, oInternet)) {
    internetAcik = !internetAcik;
    if (!internetAcik && mqtt.connected()) mqtt.disconnect();
    Serial.println(internetAcik ? "Internet geri geldi: kuyruk gonderiliyor" : "Internet kesildi: kayitlar kuyrukta bekleyecek");
    ekranMesaj(internetAcik ? "Internet: var" : "Internet: yok", internetAcik ? "Kuyruk gidiyor" : "Kayit bekletilir");
  }

  kuyruguGonder();
  if (mqtt.connected()) mqtt.loop();

  // nabız: okuyucunun ayakta olduğunu 10 s'de bir sis düğümüne bildirir (yerel ağ, WAN'a çıkmaz)
  static uint32_t sonNabiz = 0;
  if (mqtt.connected() && millis() - sonNabiz > 10000) {
    sonNabiz = millis();
    char b[96];
    snprintf(b, sizeof b, "{\"durum\":\"bagli\",\"icerde\":%u,\"bekleyen\":%u}", sayim.icerde(), sayim.bekleyen());
    mqtt.publish(KONU_DURUM, b, true);
  }

  if (ekranDonus && millis() > ekranDonus) { ekranDonus = 0; ekranOzet(); }
  static uint32_t sonOzet = 0;
  if (!ekranDonus && millis() - sonOzet > 1000) { sonOzet = millis(); ekranOzet(); }
}
