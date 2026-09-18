# Athletic Labs — AI Ajanları için Kurallar

Bu dosya, bu repoda çalışan her AI kodlama ajanı (Claude Code, Codex, vb.) için **zorunlu** bağlam ve kurallar bütünüdür. Kod yazmaya, migration çalıştırmaya ya da mimari karar almaya başlamadan önce bu dosyayı ve işaret ettiği dokümanları oku.

## 0. Önce oku

Herhangi bir işe başlamadan önce, işin konusuna göre şu dosyaları oku:

- `docs/PRODUCT_CONTEXT.md` — şirketin ne yaptığı, tüm feature'lar, iş akışı (**her zaman oku, her görev için**)
- `docs/domain/RBAC_ROLES.md` — rol/yetki modeli (auth, izin, panel/app ayrımına dokunan her iş için)
- `docs/domain/CLUB_TEAM_HIERARCHY.md` — kulüp/akademi/takım/antrenör esnek yapısı (kulüp, takım, antrenör atama işlerinde)
- `docs/domain/AI_REPORTING_LOGIC.md` — AI rapor/beslenme/antrenman önerisi mantığı (bu modüle dokunan her iş için)
- `docs/domain/MEASUREMENT_PIPELINE.md` — ölçüm/cihaz adapter mimarisi (ölçüm, VALD/Yuji entegrasyonu, raw_tests/normalized_metrics işlerinde)
- `docs/domain/OPERATIONAL_WORKFLOW.md` — sahada gerçek çalışma akışı (kayıt, roster, panel kullanımı işlerinde)
- `ARCHITECTURE.md` (repo köküne özel, varsa) — bu spesifik reponun teknik yapısı

Emin değilsen, ilgili dosyayı okumadan varsayımla ilerleme — sor ya da dosyayı bul.

## 1. Değişmez kurallar (asla ihlal etme)

1. **Additive-only migration.** Mevcut bir tabloya/koluna asla `DROP`, `ALTER COLUMN TYPE`, `RENAME` uygulama. Sadece `ADD COLUMN` (nullable/default'lu) ve `CREATE TABLE` kullan. Yıkıcı bir değişiklik gerekiyor gibi görünüyorsa, kod yazmadan önce bunu insana sor.
2. **TCKN asla düz metin olarak saklanmaz veya loglanmaz.** Sadece `tc_no_hash` (HMAC-SHA256) üzerinden işlem yapılır. TCKN'yi bir response body'sine, log satırına, hata mesajına asla yazma.
3. **Sistemdeki her işlem `athlete_id` (UUID) üzerinden yapılır**, TCKN sadece giriş/kayıt anında bir kez kullanılıp hash'e çevrilir.
4. **Kimlik birleştirme (merge) otomatik yapılmaz.** Olası mükerrer kayıtlar `identity_merge_candidates` tablosuna düşer, insan onayı bekler. Bunu otomatikleştiren kod yazma.
5. **`/internal/*` ve `/portal/*` uçları birbirine karışmaz.** İç ölçüm ekibi (panel.athleticlabs.com.tr) ile sporcu/antrenör (app.athleticlabs.com.tr) farklı rol setlerine sahiptir, middleware seviyesinde ayrılır. Bir portal rolüne internal uç erişimi açma.
6. **Prod veritabanına doğrudan migration çalıştırma.** Önce Neon geliştirme branch'inde test edilir, onaylanınca prod'a düşük trafik saatinde uygulanır.
7. **AI üretimi sağlık/beslenme/antrenman içeriği, yüksek riskli sinyaller (örn. ciddi sakatlık riski) için doğrudan sporcuya gösterilmez** — insan uzman onay kuyruğuna düşer. Bu akışı atlayan kod yazma.

## 2. Çalışma tarzı

- **Küçük, kapsamı net görevler halinde ilerle.** "Şu feature'ı baştan sona yap" yerine, tek bir modül/uç/tablo üzerinde çalış. Karmaşık sistemde geniş kapsamlı tek seferlik değişiklikler hataya en açık olanlardır.
- **Riskli/geniş kapsamlı bir değişiklik öncesi (migration, RBAC değişikliği, cross-repo etkisi olan işler) önce kod yazmadan bir plan/özet sun**, onay bekle.
- **Mevcut çalışan davranışı koru.** athletic-labs-backend ve athletic-labs-frontend (panel) şu an canlı sahada ölçüm için kullanılıyor — bunları bozan hiçbir değişiklik "iyileştirme" gerekçesiyle yapılmaz.
- Belirsizlik durumunda (bu dosyalarda cevabı olmayan bir iş mantığı sorusu) varsayımla ilerlemek yerine sor.

## 3. Repo haritası (ekosistem)

| Repo | Alan adı | Kim kullanır | Durum |
|---|---|---|---|
| athletic-labs-backend | (API, domain yok) | Tüm frontend'ler buna bağlanır | Mevcut, genişletiliyor |
| athletic-labs-frontend (panel) | panel.athleticlabs.com.tr | Saha ölçüm ekibi (staff) | Mevcut, küçük eklemeler |
| athletic-labs-app (portal) | app.athleticlabs.com.tr | Sporcu, antrenör | Yeni, sıfırdan |
| athletic-labs-scouting | (ileride) | Scout/analiz kullanıcıları | Yeni, app'ten sonra |
| athletic-labs-website | athleticlabs.com.tr | Herkes (tanıtım) | Mevcut statik site. Kısa vadede sadece "Giriş Yap" linki eklenecek; diğer tüm projeler (backend, panel, app, scouting) tamamlandıktan sonra site **baştan sona yeniden yapılacak** |

Tek backend, çoklu frontend. Domain/iş mantığı sadece backend'de yaşar, frontend'ler sadece görüntüler/gönderir.

## 4. Dal ve PR yapısı

Köklü yenileme (kimlik/TCKN, RBAC, kulüp-takım hiyerarşisi, portal, scouting) tek tek main'e değil, **`dev` dalında** toplanır. Bu düzen **tüm repolarda** (backend, panel/frontend, app, scouting, website) aynıdır.

```
main  ← yayındaki sürüm (Render/Vercel buradan deploy eder)
 └── dev  ← tüm yenilemenin toplandığı dal
      ├── feat/<konu>   ← görev bazlı dallar, PR'ı dev'e açılır
      └── fix/<konu>
```

1. **Görev dalı her zaman `dev`'den açılır**, `main`'den değil: `git checkout dev && git pull && git checkout -b feat/<konu>`.
2. **PR'ın hedefi (base) her zaman `dev`'dir.** Ajan, hedefi `main` olan PR açmaz.
3. **`main`'e yalnızca sürüm çıkarken**, tüm feature'lar tamamlandıktan sonra `dev` → `main` PR'ı ile gidilir. Bu PR'ı insan açar/onaylar.
4. **`main`'e doğrudan push edilmez.** Tek istisna, canlı sistemi ayakta tutan acil düzeltmelerdir; bu durumda düzeltme sonradan `dev`'e de taşınır.
5. **Deploy etkisi:** `main`'e birleştirme canlıya çıkar; backend'de ayrıca `render.yaml` gereği `npm run db:migrate` çalışır. Saha ekibi paneli ölçüm günlerinde kullandığı için `main` birleştirmeleri ölçüm olmayan bir güne planlanır (bkz. kural 1.6).
6. Migration'lar `dev`'de birikir; prod'a uygulanma sırası ve zamanı insanla kararlaştırılır.
7. Backend ile frontend'i birlikte etkileyen bir değişiklikte (yeni uç, değişen alan adı) iki reponun PR'ları aynı anda `dev`'e alınır; panel, `dev` backend'iyle çalışır durumda tutulur.
