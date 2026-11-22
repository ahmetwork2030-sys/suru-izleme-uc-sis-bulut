# Docker gösterimi · ölçüm kayıtları (22 Kasım 2026)

Kayıtlar Ahmet ATAGÜL'ün bilgisayarında çalışan Docker gösteriminden (Mosquitto, Node-RED, InfluxDB, Grafana, simülatör) alındı.
Süre: 13:39–22:46 (yaklaşık 9 saat gerçek zaman, simülasyonda yaklaşık 222 gün). Bağlantı profili P2, 500 hayvan, tohum 11.
Node-RED iki kez yeniden başlatıldı; karşılaştırma sayaçları InfluxDB'deki son değerden devam etti.

## Özet

| Ölçüt | Klasik yöntem | Uyuyan Bulut | Fark |
| --- | ---: | ---: | ---: |
| Buluta giden mesaj | 857.581 | 751 | ≈1.140 kat az |
| İnternet hattından geçen veri | ≈236 MB | ≈0,55 MB | ≈430 kat az |

- Buluta ulaşan acil olay: 482 (172 akşam sayımında eksik, 139 hareketsizlik, 103 sürüden ayrılma, 68 yasak alan).
- Akşam sayımı: 221 gün; günde en çok 2, toplam 172 eksik hayvan.
- Gece özeti: 6.660 hayvan-gün özeti (30 izlenen cihaz × 222 gün); cihaz başına ortalama günlük yürüme ≈12,5 km.
- Bildirim servisi (⑭, 14:15'ten itibaren): 821 bildirim; çobana 430 push, mal sahiplerine 288 push ve 103 SMS.
- Çobana LoRa ile sahada inen alarm (⑧, 16:36'dan itibaren): 345.
- İnternet kesintisi testi (16:39–16:42): kesinti boyunca buluta yazım yok, 4 ileti bekledi; çoban 4 alarmı internetsiz aldı;
  bağlantı gelince 4 ileti 4 saniyede gitti (önce acil, sonra gece özeti), olay zamanları korundu.

Kişi adları ve küpe numaraları uydurmadır.

## Dosyalar

| Dosya | İçerik |
| --- | --- |
| `01_grafana_ust.jpg` | Pano üst kısım: ağıldaki hayvan, bekleyen mesaj, iki karşılaştırma grafiği (son 6 saat), harita, alarmlar |
| `02_grafana_orta.jpg` | Harita, alarm listesi, günlük özetten en çok yürüyen hayvanlar |
| `03_grafana_alt.jpg` | Gönderilen bildirimler, bildirim kanalı (push/SMS), mal sahipleri |
| `04_nodered_sabit_sis.jpg` | Node-RED sabit sis sekmesi, düğüm durumlarıyla (⑥ ⑦ ⑧ ⑨–⑫) |
| `05_nodered_bulut.png` | Node-RED bulut sekmesi: bildirim servisi (⑭) ve hayvan kaydı |
| `06_karsilastirma_grafigi.png` | Dışa aktarılan veriden çizilen karşılaştırma grafiği |
| `07_nodered_internet_kesintisi.jpg` | Kesinti sırasında Node-RED: "İnternet yok · bekleyen 4 mesaj" |
| `veriler/karsilastirma_zaman_serisi.csv` | 20 dakikada bir toplam mesaj ve veri, iki yöntem ve oranlar |
| `veriler/alarmlar_ture_gore.csv` | Buluta ulaşan acil olaylar |
| `veriler/bildirimler_aliciya_gore.csv` | Bildirimler alıcı ve kanala göre |
| `veriler/mal_sahipleri.csv` | Hayvan kaydı: mal sahipleri, hayvan sayısı, kanal |

Kesinti testinin hareketli kaydı (`node_red_internet_kesintisi_testi.gif`) bilgisayarın İndirilenler klasöründedir.
