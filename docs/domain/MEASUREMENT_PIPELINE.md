# Ölçüm Hattı — Cihazdan Bağımsız Adapter Mimarisi

## Üç ölçüm kategorisi, üç farklı kaynak

1. Saha becerisi testleri → sahada elle/manuel girilir (panel.athleticlabs.com.tr üzerinden staff tarafından).
2. Genetik tarama → Yuji Health X-One Pro Max (aktif kullanımda, entegrasyon henüz yapılmadıysa manuel girişle idare edilir).
3. Biyometrik → VALD Performance (ForceDecks, SmartSpeed, NordBord, HumanTrak) — **sipariş aşamasında, entegrasyon henüz yok**.

## Kesin kural: çekirdek sistem hiçbir cihazın API'siyle doğrudan konuşmaz

Her kaynak için ayrı bir "adapter" yazılır, adapter'ın tek görevi kendi ham formatını ortak `NormalizedTestResult` şemasına çevirmek:

```
[VALD API]           → VALDAdapter        ─┐
[Yuji Health export] → YujiAdapter        ─┤→ NormalizedTestResult → raw_tests + normalized_metrics
[Saha manuel giriş]  → ManualEntryAdapter ─┘
```

Bunun pratik sonucu: **VALD entegrasyonu gecikse/değişse bile** (3-4 hafta sürüyor, cihaz değişebilir), sporcu paneli, rapor, AI katmanı hiç etkilenmez — çünkü hepsi `normalized_metrics` üzerinden çalışır, hangi adapter'ın veriyi ürettiğiyle ilgilenmez.

## MVP önceliği

MVP'de sadece **ManualEntryAdapter** gereklidir — bu, saha ekibinin panelden elle girdiği test sonuçlarını `NormalizedTestResult`'a çevirir. VALD/Yuji adapter'ları cihazlar/entegrasyon hazır olduğunda eklenir, mevcut hiçbir şeyi değiştirmeden.

## Şema (ana yol haritası dokümanındaki tablolarla birebir)

- `test_sources` — kaynak kataloğu (`manual_field_test`, `vald_forcedecks`, `yuji_health` gibi kodlarla)
- `raw_tests` — bir test oturumu (hangi sporcu, hangi kaynak, ne zaman, ham veri referansı)
- `metric_catalog` — cihazdan bağımsız, standart metrik sözlüğü (örn. `cmj_height`, `sprint_20m`)
- `normalized_metrics` — asıl karşılaştırılabilir, rapor/AI'ın okuduğu veri

Yeni bir cihaz/kaynak eklerken: yeni bir adapter yazılır, `metric_catalog`'a o cihazın metriklerinin karşılığı eşlenir. `raw_tests`/`normalized_metrics` şeması değişmez.

## Eşzamanlı/çoklu lokasyon notu

Şirket büyüdükçe aynı gün, farklı şehir/ülkelerde eşzamanlı ölçümler yapılacak (bkz. PRODUCT_CONTEXT.md, Operasyonel İş Akışı). Adapter ve ingestion katmanı, tekil/sıralı işlem varsayımı yapmadan, eşzamanlı yazma yüküne dayanıklı tasarlanmalı (örn. `raw_tests` insert'lerinde global bir sıra/kilit varsayma).
