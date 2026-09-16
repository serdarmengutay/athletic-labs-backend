# Athletic Labs — Ürün Bağlamı

*Her AI ajanı, her görevden önce bu dosyayı okumalı. Bu, şirketin ne yaptığının ve neden yaptığının tek gerçek kaynağıdır. Buradaki hiçbir bilgi, kodda "daha mantıklı görünen" bir varsayımla değiştirilmez.*

## Şirket ne yapar (tek paragraf)

Athletic Labs, 25'ten fazla spor branşında sahada sporculara üç kategoride ölçüm yapan, bu ölçümleri analiz edip raporlayan ve bu raporlar üzerinden sporcuya ve antrenöre (farklı ve ayrı) özellikler sunan bir **veri ve performans gelişim takip şirketidir**. Sporcu 5 yaşından itibaren, hangi kulüpte/şehirde olursa olsun, kariyeri boyunca tek bir profilde takip edilir.

## Üç ölçüm kategorisi

1. **Saha becerisi testleri** — sprint, çeviklik, handgrip, dikey sıçrama gibi genel atletik testler + branşa özel beceri testleri (futbolda pas/şut/dribling gibi, her branşın kendine özgü test bataryası var). Saha ekibi tarafından fiziksel olarak uygulanır.
2. **Genetik tarama** — Yuji Health X-One Pro Max cihazıyla yapılır (şu an aktif kullanımda).
3. **Biyometrik ölçümler** — VALD Performance sistemleri (ForceDecks, SmartSpeed, NordBord, HumanTrak) ile yapılır; sakatlık risk analizi de bu kategoriden çıkar. **Cihaz siparişi verildi, kurulum/entegrasyon en az 3-4 hafta sürecek — MVP bu olmadan da çalışmalı (bkz. MEASUREMENT_PIPELINE.md, adapter deseni).**

Şu ana kadar futbol ve kız voleybolu branşlarında ölçüm yapıldı. 25 branşa genişleme zamanla, kademeli olacak.

## Sporcu tarafı özellikler (app.athleticlabs.com.tr)

- TCKN ile kayıt/giriş (bkz. RBAC_ROLES.md ve backend AGENTS kuralları — TCKN asla düz metin saklanmaz).
- Üç ölçüm kategorisinin sonuçları, detaylı/anlaşılır grafiklerle.
- **Karşılaştırmalı analiz**: kendi yaş grubu, mevkisi, şehri ve takımına göre veritabanındaki diğer sporcularla kıyaslama.
- **Gelişim takibi**: geçmiş test sonuçlarına göre, sporcu hangi takımda test olmuş olursa olsun (bkz. kimlik eşleştirme — athlete_id kulübe bağlı değil).
- **AI destekli raporlama, beslenme ve antrenman önerileri** — geliştirilmesi gereken alanlara özel (bkz. AI_REPORTING_LOGIC.md).
- **Eğitim içerikleri** — branşa özel, sporcunun kendini geliştirmesi için.
- **Sakatlık risk analizi** — VALD verisine dayalı (VALD entegre olduğunda aktif olur).

## Antrenör tarafı özellikler

Antrenör tarafı daha komplike — takım ve kulüp hiyerarşisi var (bkz. CLUB_TEAM_HIERARCHY.md, bu kritik ve esnek kurgulanmalı).

**MVP kapsamında (ilk 1-1.5 ay):**
- Kendi takımındaki sporcuların sonuçları, yaşıt/mevki/şehir bazlı kıyaslamaları, gelişim takibi, geliştirilmesi gereken özellikler.
- Takım raporları: takım ortalamaları, takımın en iyisi, takımın genel geliştirilmesi gereken alanları.
- AI destekli antrenman önerileri.

**Sonraki fazlar (MVP'den sonra, temel oturunca — 1 ay hedefine dahil değil):**
- Antrenman drill ve içerik kütüphanesi.
- Aidat takibi ve kulüp programı yönetimi (referans: sportmanager.eu tarzı — incele).
- Taktik/planlama/antrenman drilleri oluşturma aracı (referans: tacticalpad.com tarzı — incele).
- Antrenörün kendine not alması, sporculara sistem üzerinden mesaj göndermesi.

**Bu iki referans ürün (SportManager, TacticalPad) temel yapı oturana kadar ERTELENMİŞ özelliklerdir — bunları MVP'ye dahil etme, ama mimariyi bunları sonradan ekleyebilecek şekilde kapatma (örn. antrenman/drill verisi için şimdiden çok dar/tek amaçlı bir şema kurma).**

## Kulüp/akademi hiyerarşisi — kritik esneklik gereksinimi

Gerçek dünya örneği: bir altyapı akademisinde (örn. 160 sporcu, 8 takım, bazı yaş grupları aynı bazıları farklı) her takımın başında farklı bir antrenör olabilir, bazı antrenörler birden fazla takıma bakabilir, takım isimleri kulüpten kulübe tamamen farklı olabilir.

**Gereken model:**
- Bir **akademi/kulüp direktörü** rolü olmalı — kulübe tanımlı antrenör hesaplarına takım atayabilir.
- Antrenör-takım ilişkisi **many-to-many** olmalı (bir antrenör birden fazla takıma bakabilir, bir takımın birden fazla antrenörü olabilir).
- Direktör, kendi takımı içindeki sporcuları gruplar arasında değiştirebilmeli (transfer/grup değişikliği kulüp içi, sistemde ayrı bir kayıt açmadan).
- Takım/yaş grubu isimlendirmesi kulüpten kulübe **serbest metin** olmalı, sabit bir enum'a kilitlenmemeli — her kulübün kendi adlandırma alışkanlığı var.

Detaylı model için: `docs/domain/CLUB_TEAM_HIERARCHY.md`.

## Operasyonel iş akışı (sahada gerçekte nasıl çalışıyoruz)

1. Kulüple anlaşma yapılır, ölçüm takvimi oluşturulur (hangi tarihte hangi kulübe gidilecek).
2. Sporcu listesi bugün Excel olarak geliyor — **bu değişecek/esnek olacak**: sporcu kendi TCKN + ad-soyad + doğum tarihiyle önceden kendi kaydını yapabilecek; kaydolamayanlar için sahada harici/manuel ekleme de mümkün olmalı. İkisi de desteklenmeli, birbirini dışlamamalı.
3. Saha ekibi, panel.athleticlabs.com.tr üzerinden ölçümleri kaydeder.
4. Yatırım sonrası bu süreç agresif şekilde büyüyecek: **aynı gün, aynı saatte Türkiye'nin ve dünyanın farklı yerlerinde eş zamanlı ölçümler yapılacak**, yeni sporcu/kulüp/antrenör kayıtları eşzamanlı akacak. Sistem bunu (eşzamanlı, çok lokasyonlu, sürekli büyüyen kayıt hacmini) baştan hesaba katmalı — tekil/sıralı işlem varsayımı yapan kod yazma.

Detaylar için: `docs/domain/OPERATIONAL_WORKFLOW.md`.

## Yol haritası sıralaması (öncelik sırası)

1. Backend: kimlik + auth + RBAC temeli (additive migration disipliniyle)
2. Panel (athletic-labs-frontend): küçük eklemeler (manuel test girişi, esnek roster/self-kayıt desteği) — mevcut akış bozulmaz
3. App/portal (athletic-labs-app): sıfırdan, backend'in `/portal/*` uçlarına bağlanarak
4. Scouting (athletic-labs-scouting): app'in temel akışı oturduktan sonra
5. SportManager/TacticalPad tarzı antrenör özellikleri: temel yapı oturduktan sonra, ayrı fazda
6. Tanıtım sitesi (athletic-labs-website): en son. Kısa vadede sadece bir "Giriş Yap" linki eklenir (bağımsız/düşük riskli, mevcut siteye dokunmadan). Diğer tüm projeler (backend, panel, app, scouting) tamamlandıktan sonra site **baştan sona yeniden yapılır** — bu, ayrı ve daha büyük bir iş olarak ele alınmalı, "Giriş Yap" linkiyle karıştırılmamalı.

Hedef: **1-1.5 ay içinde sistemin ~%75'i çalışır durumda**, kullanıcı oturumuyla gerçek rapor paylaşımı yapılabiliyor olmalı.
