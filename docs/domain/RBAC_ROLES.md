# Rol ve Yetki Modeli (RBAC)

## Roller

| Rol                | Erişim alanı                                    | Kısa tanım                                                               |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `staff`            | `/internal/*` (panel.athleticlabs.com.tr)       | Saha ölçüm ekibi — ölçüm girişi, sporcu/kulüp yönetimi                   |
| `superadmin`       | `/internal/*` (tam yetki)                       | Şirket içi yönetim                                                       |
| `academy_director` | `/portal/*` (kulüp scope'unda)                  | Kulübün takım/antrenör atamalarını yönetir (bkz. CLUB_TEAM_HIERARCHY.md) |
| `coach`            | `/portal/*` (sadece kendine atanmış takım(lar)) | Kendi takımının sonuçlarını, raporlarını görür                           |
| `athlete`          | `/portal/*` (sadece kendi verisi)               | Kendi sonuçlarını, gelişimini, AI önerilerini görür                      |

## Kesin kural: `/internal` ve `/portal` birbirine asla karışmaz

- Bu ayrım hem **middleware seviyesinde** (JWT'deki role claim'i kontrol edilir, yanlış rol → 403) hem de **ürün seviyesinde** (panel.athleticlabs.com.tr ve app.athleticlabs.com.tr farklı domainler/frontend'ler) uygulanır.
- `staff`/`superadmin` rolündeki bir token, `/portal/*` uçlarına da erişemez — yön ikisi de kapalı, tek yönlü bir izin değil.
- Yeni bir uç eklerken önce "bu hangi rol grubuna ait" sorusu sorulur, ona göre `/internal` veya `/portal` altına yazılır — üçüncü bir "genel" namespace yoktur.

## `academy_director` ile `club_admin` farkı (varsa karışıklık olursa)

Ana yol haritası dokümanında `club_admin` geçebilir — bu, MVP'de `academy_director` ile aynı kavramı ifade eder (kulüp yönetimi yetkisi). Yeni kod `academy_director` ismini kullanır, tutarlılık için. İkisi aynı anlama gelmiyorsa bunu insan ile netleştir, varsayımla ilerleme.

## Kimlik doğrulama akışı özeti

1. Kullanıcı TCKN girer (athlete/veli için) ya da e-posta/şifre (staff/coach/director için — ileride athlete için de eklenecek).
2. TCKN → checksum doğrulama (format) → HMAC-SHA256 hash → `athletes.tc_no_hash` üzerinden arama.
3. Eşleşme varsa mevcut `athlete_id`, yoksa yeni UUID + yeni kayıt.
4. Girişten sonra tüm işlemler JWT içindeki `athlete_id`/`user_id` + `role` üzerinden yürür, TCKN bir daha hiçbir yerde açık olarak kullanılmaz.

Detay ve gerekçe için ana yol haritası dokümanındaki "T.C. Kimlik No Toplama" ve "Sporcu Kimlik Eşleştirme" bölümlerine bakılabilir (bu repoda yoksa insana sor).

## Antrenörün görebileceği test geçmişi (karar: 2026-09-16, insan onaylı)

Bir sporcu A kulübünden B kulübüne geçtiğinde, **B kulübünün antrenörü sporcunun A kulübünde yapılmış eski testlerini de görür.** Antrenör, sporcunun tüm test geçmişini görür; görünürlük kulübe göre değil, **sporcuya** göre belirlenir.

- Kapsam kuralı: antrenör, `coach_team_assignments` ile kendisine atanmış takımlarda **o an açık üyeliği** (`athlete_team_memberships.end_date IS NULL`) olan sporcuları görür. Bir sporcu bu kapsama giriyorsa, o sporcunun **tüm** testleri (eski kulüplerdekiler dahil) gösterilir.
- Her test, **yapıldığı tarihteki kulüp ve takım adıyla** gösterilir — testler yeni kulübe taşınmaz, yeniden etiketlenmez. Kaynak: eski testlerde `historical_athlete_data.club_id`/`team_id`, canlı testlerde `test_sessions.club_id`.
- Gerekçe: ürünün çekirdeği kariyer boyu gelişim takibi. Sporcu kulüp değiştirdiğinde geçmişi sıfırlanırsa gelişim grafiği anlamını yitirir.
- Sporcu kapsamdan çıkınca (üyeliği kapanınca, yani başka kulüpte test olunca) eski antrenör o sporcuyu **artık görmez** — geçmişe dönük erişim açık kalmaz.
- Takım ortalaması/karşılaştırma raporlarında sporcu yalnızca **o testin yapıldığı** takıma sayılır; eski kulüpteki testi yeni takımın ortalamasına karışmaz.
