# AI Destekli Rapor / Beslenme / Antrenman Önerisi Mantığı

## Amaç

Bir sporcunun normalize edilmiş metriklerinden (bkz. MEASUREMENT_PIPELINE.md), yaş/branş/mevki referans normlarına göre, kişiye özel: (1) performans değerlendirmesi, (2) beslenme önerisi, (3) antrenman önerisi üretmek. Antrenör tarafında ise takım geneli için benzer, agregat bir değerlendirme.

## Akış (özet — detay ana yol haritası dokümanında)

Test verisi işlenir → arka plan işinde (gerçek zamanlı DEĞİL) AI çağrılır → yapılandırılmış JSON çıktı `ai_reports` tablosuna yazılır → portal bu saklanan sonucu gösterir, her sayfa açılışında yeniden üretmez.

## Girdi tasarımı — ne gönderilir, ne gönderilmez

**Gönderilir:**
- Sporcunun yaşı, branşı, mevkisi (varsa), cinsiyeti
- Güncel test metrikleri (normalize edilmiş, `normalized_metrics`'ten)
- Geçmiş test(ler)le kıyaslama için delta (gelişim yönü/miktarı)
- Branş/yaş grubuna özel referans norm/persentil tablosu (bu, sistem promptunun **cache'lenen** kısmı — bkz. maliyet notu aşağıda)

**Gönderilmez (asla):**
- TCKN veya herhangi bir kimlik hash'i (AI'ın buna ihtiyacı yok, `athlete_id` bile response'da olmamalı, prompt içeriğinde kesinlikle olmamalı)
- Ham force-plate sinyali, video — bunlar zaten `normalized_metrics` seviyesine indirgenmiş halde kullanılır
- Sporcunun adı/soyadı — prompt'a sadece anonim bir referans (örn. "Sporcu A") ile gidilir, çıktı sonradan ilgili `athlete_id`'ye eşlenir

## Çıktı formatı

Serbest metin DEĞİL — **yapılandırılmış JSON** istenir (model'e response formatı açıkça tarif edilir), örnek alanlar:

```json
{
  "assessment_summary": "...",
  "strengths": ["..."],
  "areas_to_improve": ["..."],
  "nutrition_recommendation": "...",
  "training_recommendation": "...",
  "flagged_for_human_review": false,
  "flag_reason": null
}
```

Bu, UI'da güvenilir/deterministik render için gerekli — serbest metin parse etmeye çalışmayın.

## Kritik güvenlik/sorumluluk kuralı

`flagged_for_human_review: true` dönen (örn. ciddi sakatlık riski, aşırı düşük/anormal bir metrik, tutarsız veri) sonuçlar **doğrudan sporcuya gösterilmez** — bir insan uzman (fizyoterapist/diyetisyen) onay kuyruğuna düşer. Bu mantığı atlayan/basitleştiren bir implementasyon yapma. Ayrıca tüm AI çıktılarında arayüz tarafında "genel öneridir, bir uzmana danışın" ton/etiketlemesi zorunlu — bu bir UI metni kısıtlaması değil, ürün kuralıdır.

## Maliyet mimarisi (uygulanacak, atlanmayacak optimizasyonlar)

1. **Batch API kullan** — üretim gerçek zamanlı değil, arka planda toplu üretilebilir, standart fiyatın yarısı.
2. **Prompt caching kullan** — branş/yaş grubu referans normları (sistem promptunun sabit kısmı) cache'lenir, tekrar eden kısım standart fiyatın ~%10'una iner.
3. Model seçimi: nüans gerektiren değerlendirme için Sonnet; ileride kalıplaşmış/tekrarlayan alt-görevler için Haiku'ya bölünebilir — MVP'de tek model (Sonnet) yeterli, erken optimizasyona girme.
4. Tahmini maliyet: rapor başına ~$0.01-0.02 (optimize edilmemiş), cache+batch ile ~$0.005-0.01. 1.000-1.500 sporcu ölçeğinde aylık $15-30 mertebesinde — bu bütçeyi zorlayan bir kalem değil, gereksiz kısıtlama/basitleştirme yapma.

## Takım/antrenör tarafı için farkı

Antrenöre gösterilen AI çıktısı **agregat** olmalı (takım ortalaması, takımın güçlü/zayıf yönleri, dağılım) — tek tek her sporcunun raporunu birleştirip antrenöre "hepsini oku" demek yerine, ayrı bir agregasyon promptu/adımı ile üretilir. Bu, sporcu bazlı raporla aynı `ai_reports` tablosunu değil, ayrı bir `ai_team_reports` (ya da benzeri, takım+dönem bazlı) kaydı kullanmalı.
