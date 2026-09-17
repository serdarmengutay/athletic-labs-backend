# Operasyonel İş Akışı (Sahada Gerçekte Ne Oluyor)

## Adım adım

1. **Kulüp anlaşması + takvim** — hangi kulübe hangi tarihte gidileceği planlanır. (Şu an manuel/harici bir süreç, sistemde MVP kapsamında değil.)
2. **Sporcu listesi/roster** — şu an Excel olarak geliyor. **Bu esnek olmalı, tek yönlü değil:**
   - Sporcu, testten önce kendi TCKN + ad-soyad + doğum tarihiyle **kendi kaydını** yapabilmeli (kimlik eşleştirme, bkz. RBAC_ROLES.md).
   - Önceden kaydolamayan sporcular için saha ekibi **manuel/harici ekleme** yapabilmeli.
   - İkisi birbirini dışlamaz — aynı ölçüm gününde bir kısmı önceden kayıtlı, bir kısmı sahada eklenmiş olabilir. Sistem ikisini de sorunsuz karışık kabul etmeli.
3. **Saha ölçümü** — panel.athleticlabs.com.tr üzerinden staff tarafından test sonuçları kaydedilir (bkz. MEASUREMENT_PIPELINE.md, ManualEntryAdapter).
4. **Sonuç erişimi** — sporcu, TCKN ile app.athleticlabs.com.tr'de giriş yapıp sonuçlarına erişir.

## Ölçek gerçeği — neden bu önemli

Yatırım sonrası büyüme agresif planlanıyor: **aynı gün, aynı saatte Türkiye'nin ve dünyanın farklı yerlerinde eşzamanlı ölçümler** yapılacak, yeni sporcu/kulüp/antrenör kayıtları sürekli akacak. Kod yazarken:

- Roster/kayıt işlemlerinde **tekil, sıralı bir akış varsayma** — aynı anda birden fazla saha ekibi, birden fazla kulüpte, birbirinden habersiz çalışıyor olabilir.
- Kimlik eşleştirme (aynı sporcunun mükerrer kaydı) riski, eşzamanlı farklı lokasyonlarda ölçüm yapıldıkça artar — bu yüzden `identity_merge_candidates` akışı (otomatik değil, insan onaylı) MVP'den itibaren aktif olmalı, sonraya bırakılabilecek bir özellik değildir.

## Şu anki kapsam vs. hedef kapsam

- **Şu an:** futbol + kız voleybolu, sınırlı sayıda kulüp.
- **Hedef (yakın vade):** 25 branşa kademeli genişleme, çok sayıda kulüp, eşzamanlı çoklu lokasyon.

Yeni kod, "şu anki küçük ölçek" için en basit çözümü değil, yukarıdaki hedef ölçeği kaldırabilecek (ama over-engineering yapmayan — additive/basit tutulan) bir yaklaşımı tercih etmeli. Belirsizlikte insana sor.
