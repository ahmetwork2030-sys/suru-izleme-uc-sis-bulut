// Bilgisayarda birim testi: g++ -std=c++17 -I../kapi-okuyucu -I../etiket test_kapi.cpp -o t && ./t
#include <cassert>
#include <cstdio>
#include "kapi_sayim.h"
#include "nec.h"

static int hata = 0;
#define KONTROL(x) do { if (!(x)) { printf("HATA satir %d: %s\n", __LINE__, #x); hata++; } } while (0)

int main() {
  // --- NEC kodlaması ---
  uint8_t b[4];
  necBaytlari(1318, b);
  KONTROL(b[0] == 5 && b[2] == 38);
  KONTROL((uint8_t)(b[0] ^ b[1]) == 0xFF && (uint8_t)(b[2] ^ b[3]) == 0xFF);
  KONTROL(etiketNoBul(5, 38) == 1318);
  KONTROL(etiketNoBul(4, 53) == 1077);
  KONTROL(etiketNoBul(5, 122) == 1402);
  for (uint16_t no = 1000; no < 1500; no++) { necBaytlari(no, b); KONTROL(etiketNoBul(b[0], b[2]) == no); }

  // --- sayım ---
  static kapi::Sayim s;
  s.yeniGun();
  KONTROL(s.icerde() == 500);
  s.disaridaIsaretle(1077); s.disaridaIsaretle(1318); s.disaridaIsaretle(1402);
  KONTROL(s.icerde() == 497);
  uint32_t t = 0;
  KONTROL(s.oku(1318, kapi::GIRIS, t += 10000) == kapi::KAYDEDILDI);
  KONTROL(s.icerde() == 498);
  KONTROL(s.oku(1318, kapi::GIRIS, t += 500) == kapi::TEKRAR_OKUMA);      // aynı geçişin tekrarı
  KONTROL(s.icerde() == 498);
  KONTROL(s.oku(1318, kapi::GIRIS, t += 10000) == kapi::DURUM_AYNI);      // zaten içeride
  KONTROL(s.oku(999, kapi::GIRIS, t += 10000) == kapi::TANIMSIZ);
  KONTROL(s.oku(1500, kapi::GIRIS, t += 10000) == kapi::TANIMSIZ);
  KONTROL(s.oku(1402, kapi::GIRIS, t += 10000) == kapi::KAYDEDILDI);
  uint16_t liste[500];
  uint16_t n = s.eksikler(liste, 500);
  KONTROL(n == 1 && liste[0] == 1077);
  // kuyruk: iki kayıt, sıra numaraları artan
  KONTROL(s.bekleyen() == 2);
  kapi::Kayit k;
  KONTROL(s.ilkKayit(k) && k.etiket == 1318 && k.sira == 1 && k.yon == kapi::GIRIS);
  s.ilkiSil();
  KONTROL(s.ilkKayit(k) && k.etiket == 1402 && k.sira == 2);
  s.ilkiSil();
  KONTROL(s.bekleyen() == 0 && !s.ilkKayit(k));
  // sabah çıkışı: tüm sürü
  s.yeniGun();
  for (uint16_t no = 1000; no < 1500; no++) { t += 4000; KONTROL(s.oku(no, kapi::CIKIS, t) == kapi::KAYDEDILDI); }
  KONTROL(s.icerde() == 0);
  KONTROL(s.bekleyen() == 500 && s.kayipKayit() == 0);
  // kuyruk taşması: 512'den fazla kayıt bekletilirse en eski düşer ve sayılır
  for (uint16_t no = 1000; no < 1020; no++) { t += 4000; s.oku(no, kapi::GIRIS, t); }
  KONTROL(s.bekleyen() == 512 && s.kayipKayit() == 8);
  KONTROL(s.ilkKayit(k) && k.sira == 11);   // sıra numarası günler arasında da artmaya devam eder

  // yön: dış sonra iç = giriş, iç sonra dış = çıkış
  kapi::YonBulucu yb; kapi::Yon y;
  KONTROL(!yb.kesildi(kapi::DIS, 1000, y));
  KONTROL(yb.yarimGecis(2000));
  KONTROL(yb.kesildi(kapi::IC, 3000, y) && y == kapi::GIRIS);
  KONTROL(!yb.yarimGecis(3500));
  KONTROL(!yb.kesildi(kapi::IC, 5000, y));
  KONTROL(yb.kesildi(kapi::DIS, 6000, y) && y == kapi::CIKIS);
  // aynı bariyer iki kez: hayvan geri döndü, geçiş sayılmaz
  KONTROL(!yb.kesildi(kapi::DIS, 7000, y));
  KONTROL(!yb.kesildi(kapi::DIS, 8000, y));
  KONTROL(yb.kesildi(kapi::IC, 9000, y) && y == kapi::GIRIS);
  // pencere aşıldı: ikinci bariyer yeni bir başlangıç sayılır
  KONTROL(!yb.kesildi(kapi::DIS, 10000, y));
  KONTROL(!yb.kesildi(kapi::IC, 10000 + kapi::YonBulucu::PENCERE_MS + 1, y));

  printf(hata ? "%d hata\n" : "Tum testler gecti\n", hata);
  return hata ? 1 : 0;
}
