// LED kimlik etiketi: etiket numarasının NEC kızılötesi çerçevesine çevrilmesi
// Etiket no 16 bittir: üst bayt NEC "adres", alt bayt NEC "komut" olarak gönderilir.
// Örnek: 1318 = 0x0526 -> adres 5, komut 38
#pragma once
#include <stdint.h>

// NEC zamanlamaları (mikrosaniye)
#define NEC_BASLANGIC_ISIK   9000
#define NEC_BASLANGIC_BOSLUK 4500
#define NEC_BIT_ISIK          560
#define NEC_SIFIR_BOSLUK      560
#define NEC_BIR_BOSLUK       1690

// Çerçevedeki 4 bayt: adres, ~adres, komut, ~komut (her bayt en düşük bitten başlayarak gönderilir)
static inline void necBaytlari(uint16_t etiketNo, uint8_t out[4]) {
  uint8_t adres = (uint8_t)(etiketNo >> 8);
  uint8_t komut = (uint8_t)(etiketNo & 0xFF);
  out[0] = adres;
  out[1] = (uint8_t)~adres;
  out[2] = komut;
  out[3] = (uint8_t)~komut;
}

// Alıcı tarafında: çözülen adres ve komuttan etiket numarası
static inline uint16_t etiketNoBul(uint8_t adres, uint8_t komut) {
  return (uint16_t)(((uint16_t)adres << 8) | komut);
}
