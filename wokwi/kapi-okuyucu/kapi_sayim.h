// Ağıl kapısı sayım mantığı (donanımdan bağımsız; bilgisayarda birim testiyle denenebilir)
// BIS505 Dönem Projesi · Ahmet ATAGÜL
#pragma once
#include <stdint.h>
#include <string.h>

namespace kapi {

const uint16_t ILK_NO = 1000;          // sürü listesi: 1000-1499 numaralı etiketler
const uint16_t SURU = 500;
const uint32_t TEKRAR_MS = 3000;       // etiket kapıdan geçerken kodunu birkaç kez yayar; 3 s içindeki tekrar sayılmaz
const uint16_t KUYRUK = 512;           // bağlantı yokken bekleyen kayıt sayısı (bir günlük kapı geçişinin yarısı)

enum Yon : uint8_t { CIKIS = 0, GIRIS = 1 };
enum Sonuc : uint8_t { KAYDEDILDI = 0, TEKRAR_OKUMA, TANIMSIZ, DURUM_AYNI };

struct Kayit {
  uint32_t sira;       // sıra numarası: bulutta tekrar gelen kaydı elemek için
  uint16_t etiket;
  uint8_t  yon;
  uint32_t zamanMs;
};

class Sayim {
 public:
  void yeniGun() {                        // sabah: tüm sürü ağılda
    memset(icerde_, 0xFF, sizeof icerde_);
    icerdeSay_ = SURU;
    sonEtiket_ = 0; sonZaman_ = 0;
  }
  void disaridaIsaretle(uint16_t no) {    // demo için: akşam dönüşünde henüz girmemiş hayvanlar
    if (!gecerli(no)) return;
    uint16_t i = no - ILK_NO;
    if (icerdeMi(i)) { temizle(i); icerdeSay_--; }
  }
  bool gecerli(uint16_t no) const { return no >= ILK_NO && no < ILK_NO + SURU; }

  Sonuc oku(uint16_t no, Yon yon, uint32_t simdiMs) {
    if (!gecerli(no)) return TANIMSIZ;
    if (no == sonEtiket_ && simdiMs - sonZaman_ < TEKRAR_MS) { sonZaman_ = simdiMs; return TEKRAR_OKUMA; }
    sonEtiket_ = no; sonZaman_ = simdiMs;
    uint16_t i = no - ILK_NO;
    bool ic = icerdeMi(i);
    if (yon == GIRIS) { if (ic) return DURUM_AYNI; ayarla(i); icerdeSay_++; }
    else              { if (!ic) return DURUM_AYNI; temizle(i); icerdeSay_--; }
    kuyrugaEkle(no, yon, simdiMs);
    return KAYDEDILDI;
  }

  uint16_t icerde() const { return icerdeSay_; }
  uint16_t disarida() const { return SURU - icerdeSay_; }

  // ağılda olmayan etiketler (en fazla max tane)
  uint16_t eksikler(uint16_t* out, uint16_t max) const {
    uint16_t n = 0;
    for (uint16_t i = 0; i < SURU && n < max; i++) if (!icerdeMi(i)) out[n++] = ILK_NO + i;
    return n;
  }

  // buluta/broker'a gönderilecek kayıtlar (önce giren önce çıkar)
  uint16_t bekleyen() const { return adet_; }
  bool ilkKayit(Kayit& k) const { if (!adet_) return false; k = kuyruk_[bas_]; return true; }
  void ilkiSil() { if (adet_) { bas_ = (bas_ + 1) % KUYRUK; adet_--; } }
  uint32_t kayipKayit() const { return tasan_; }

 private:
  uint8_t icerde_[(SURU + 7) / 8];
  uint16_t icerdeSay_ = 0;
  uint16_t sonEtiket_ = 0;
  uint32_t sonZaman_ = 0;
  uint32_t sira_ = 0;
  Kayit kuyruk_[KUYRUK];
  uint16_t bas_ = 0, adet_ = 0;
  uint32_t tasan_ = 0;

  bool icerdeMi(uint16_t i) const { return (icerde_[i >> 3] >> (i & 7)) & 1; }
  void ayarla(uint16_t i) { icerde_[i >> 3] |= (uint8_t)(1u << (i & 7)); }
  void temizle(uint16_t i) { icerde_[i >> 3] &= (uint8_t)~(1u << (i & 7)); }
  void kuyrugaEkle(uint16_t no, Yon yon, uint32_t t) {
    if (adet_ == KUYRUK) { ilkiSil(); tasan_++; }      // kuyruk dolarsa en eski kayıt düşer ve sayılır
    uint16_t son = (bas_ + adet_) % KUYRUK;
    kuyruk_[son] = Kayit{ ++sira_, no, (uint8_t)yon, t };
    adet_++;
  }
};

// Geçiş yönü: koridorun iki ucunda birer ışık bariyeri vardır (dış: mera tarafı, iç: ağıl tarafı).
// Hayvan önce dış sonra iç bariyeri keserse GİRİŞ, tersi ÇIKIŞ. Sabah/akşam bilgisine gerek kalmaz;
// gün ortasında geri dönen ya da kapıdan dönüp çıkan hayvan da doğru sayılır.
enum Bariyer : uint8_t { DIS = 0, IC = 1 };

class YonBulucu {
 public:
  static const uint32_t PENCERE_MS = 15000;   // iki bariyer arası en uzun süre (yavaş yürüyen hayvan)
  // Bir bariyer kesildi. Geçiş tamamlandıysa true döner ve yönü yazar.
  bool kesildi(Bariyer b, uint32_t t, Yon& yon) {
    if (ilkVar_ && b != ilk_ && t - ilkT_ <= PENCERE_MS) {
      yon = (ilk_ == DIS) ? GIRIS : CIKIS;
      ilkVar_ = false;
      return true;
    }
    ilk_ = b; ilkT_ = t; ilkVar_ = true;      // ilk bariyer (ya da aynı bariyer yeniden: hayvan geri döndü)
    return false;
  }
  bool yarimGecis(uint32_t t) const { return ilkVar_ && t - ilkT_ <= PENCERE_MS; }

 private:
  Bariyer ilk_ = DIS;
  uint32_t ilkT_ = 0;
  bool ilkVar_ = false;
};

}  // namespace kapi
