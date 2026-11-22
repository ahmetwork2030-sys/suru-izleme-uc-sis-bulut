/*
 * LED kimlik etiketi (ATtiny85)
 * BIS505 Dönem Projesi · Ahmet ATAGÜL
 *
 * Etiket, kendi numarasını kızılötesi ışıkla NEC koduna çevirip yayar.
 * Ağıl kapısındaki okuyucu bu kodu okuyarak hayvanın giriş ya da çıkışını sayar.
 *
 * Pil ömrü için etiket sürekli yayın yapmaz: zamanının neredeyse tamamını
 * en derin uykuda (power-down) geçirir. Kapı çerçevesindeki mıknatıs şeridi
 * etiketteki reed anahtarını kapatınca uyanır, kodunu 3 kez yayar ve yeniden uyur.
 * Kapıda duran hayvan için kod bir kez yayılır; anahtar açılınca etiket yeni geçişe hazırdır.
 *
 * Pinler:
 *   PB0 -> IR LED (Wokwi'de kırmızı LED ile temsil edilir, gerçekte 940 nm kızılötesi LED)
 *   PB1 -> durum LED'i (yayın sırasında yanar; gerçek etikette yoktur)
 *   PB2 <- reed anahtarı (Wokwi'de "Kapi miknatisi" düğmesi; basılı = kapı alanında)
 * Lojik analizör D0'da kızılötesi sinyali, D1'de durum LED'ini, D2'de reed anahtarını kaydeder.
 * Simülasyonu durdurunca inen .vcd dosyası PulseView ile açılıp NEC çerçevesi görülebilir.
 */
#include <avr/sleep.h>
#include <avr/interrupt.h>
#include <TinyDebug.h>
#include "nec.h"

const uint16_t ETIKET_NO = 1318;      // üretimde her etikete bir kez yazılır
const uint8_t  IR_PIN    = PB0;
const uint8_t  DURUM_PIN = PB1;
const uint8_t  REED_PIN  = PB2;
const uint8_t  TEKRAR    = 3;         // bir geçişte yayılan çerçeve sayısı (okuyucu 3 s içindeki tekrarı saymaz)
const uint8_t  ARA_MS    = 40;        // çerçeveler arası boşluk

volatile bool uyandi = false;
ISR(PCINT0_vect) { uyandi = true; }   // reed anahtarı durum değiştirdi: yalnızca uyandırır

// 38 kHz taşıyıcı ile ışık: yaklaşık 26 us periyot, üçte bir doluluk
void isik(uint16_t us) {
  uint16_t periyot = us / 26;
  for (uint16_t i = 0; i < periyot; i++) {
    PORTB |= _BV(IR_PIN);
    delayMicroseconds(8);
    PORTB &= ~_BV(IR_PIN);
    delayMicroseconds(16);
  }
}

void bosluk(uint16_t us) {
  PORTB &= ~_BV(IR_PIN);
  delayMicroseconds(us);
}

void cerceveGonder(uint16_t no) {
  uint8_t b[4];
  necBaytlari(no, b);
  isik(NEC_BASLANGIC_ISIK);
  bosluk(NEC_BASLANGIC_BOSLUK);
  for (uint8_t i = 0; i < 4; i++) {
    for (uint8_t bit = 0; bit < 8; bit++) {          // en düşük bit önce
      isik(NEC_BIT_ISIK);
      bosluk((b[i] >> bit) & 1 ? NEC_BIR_BOSLUK : NEC_SIFIR_BOSLUK);
    }
  }
  isik(NEC_BIT_ISIK);                                  // bitiş işareti
  bosluk(1000);
}

// En derin uyku: saat, zamanlayıcılar ve ADC durur; yalnızca pin değişikliği kesmesi uyandırır.
void uyu() {
  ADCSRA &= ~_BV(ADEN);                 // ADC kapalı (uykuda gereksiz akım çekmesin)
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  cli();
  uyandi = false;
  GIFR  = _BV(PCIF);                    // bekleyen eski kesmeyi temizle
  PCMSK = _BV(REED_PIN);
  GIMSK |= _BV(PCIE);
  sleep_enable();
  sei();
  sleep_cpu();                          // reed anahtarı değişene kadar burada uyur
  sleep_disable();
  GIMSK &= ~_BV(PCIE);                  // uyanıkken kesme kapalı: yayın zamanlaması bozulmasın
}

void setup() {
  DDRB |= _BV(IR_PIN) | _BV(DURUM_PIN);
  pinMode(REED_PIN, INPUT_PULLUP);      // anahtar açıkken akım yok; yalnızca kapıdayken çeker
  Debug.begin();
  Debug.print(F("LED kimlik etiketi "));
  Debug.print(ETIKET_NO);
  Debug.print(F(" -> NEC adres "));
  Debug.print(ETIKET_NO >> 8);
  Debug.print(F(", komut "));
  Debug.println(ETIKET_NO & 0xFF);
  Debug.println(F("Uykuda; kapi miknatisi dugmesine basinca kodunu yayar."));
}

void loop() {
  static bool yayildi = false;          // bu geçişte kod zaten yayıldı mı
  uyu();
  bool kapida = digitalRead(REED_PIN) == LOW;
  if (kapida && !yayildi) {
    PORTB |= _BV(DURUM_PIN);
    for (uint8_t i = 0; i < TEKRAR; i++) {
      cerceveGonder(ETIKET_NO);
      delay(ARA_MS);
    }
    PORTB &= ~_BV(DURUM_PIN);
    yayildi = true;
    Debug.println(F("Kapi alani: kod 3 kez yayildi, uykuya donuyor"));
  }
  if (!kapida) yayildi = false;         // kapıdan çıktı: sonraki geçişe hazır
}
