# Kulüp / Akademi / Takım / Antrenör Hiyerarşisi

## Gerçek dünya problemi (neden bu kadar önemli)

Örnek: Altınordu tarzı bir altyapı akademisinde 160 sporcu, 8 takım var. Yaş grupları bazı takımlarda aynı, bazılarında farklı. Bazı antrenörler tek takıma, bazıları birden fazla takıma bakıyor. Her kulübün takım isimlendirme alışkanlığı farklı (biri "U14 Sarı", biri "2012 Doğumlular A Grubu" diyebilir).

**Bunu yanlış modellersek** (örn. sporcu doğrudan tek bir takıma, takım doğrudan tek bir antrenöre bağlıysa) ileride ciddi bir refactor gerekir ve gerçek kulüpler sisteme sığmaz, antrenörler mağdur olur (kendi baktığı ikinci takımı göremez, ya da yanlış antrenör yanlış takımı görür).

## Model — kesin kurallar

1. **Kulüp (`clubs`) → Takım (`teams`) → Sporcu (`athlete_team_memberships`)**: zaten `athlete_team_memberships` ile many-to-many + zaman damgalı (bkz. ana şema). Bunu değiştirme.
2. **Antrenör ↔ Takım ilişkisi de many-to-many olmalı**, ayrı bir tablo ile:

```sql
CREATE TABLE coach_team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_user_id UUID REFERENCES users(id) NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,
    assigned_by UUID REFERENCES users(id),  -- atamayı yapan akademi direktörü
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

Bir antrenör N takıma bakabilir, bir takımın N antrenörü olabilir — sorgu her zaman bu tablo üzerinden yapılır, `teams.coach_id` gibi tekil bir foreign key ASLA kullanılmaz.

3. **Akademi Direktörü rolü (`academy_director`)**: Bir kulübe bağlı, o kulübün antrenör hesaplarına takım atama/kaldırma yetkisine sahip (yani `coach_team_assignments` üzerinde yazma yetkisi olan tek rol, antrenörün kendisi değil). Kulüp bazlı scope: `director_club_scopes (user_id, club_id)` ile hangi direktörün hangi kulüpte yetkili olduğu tutulur — bir direktör birden fazla kulüpte yetkili olabilir (örn. aynı işletmenin farklı şubeleri).

4. **Takım/yaş grubu adı serbest metin (`teams.name`, `teams.age_group`)** — sabit bir enum/lookup tablosuna kilitlenmez. Her kulüp kendi adlandırmasını kullanır. Filtreleme/karşılaştırma (yaş grubuna göre kıyaslama gibi) **`age_group` metnine göre değil, sporcunun `birth_date`'ine göre hesaplanan gerçek yaşa göre** yapılır — bu, tutarsız isimlendirmeden bağımsız, güvenilir bir karşılaştırma sağlar.

5. **Sporcu grup/takım değişikliği (kulüp içi transfer)**: Direktör ya da yetkili antrenör bir sporcuyu bir takımdan diğerine taşıdığında, **mevcut `athlete_team_memberships` kaydının `end_date`'i doldurulur, yeni bir kayıt açılır** — asla var olan kayıt üzerine yazma (UPDATE ile takım değiştirme) yapılmaz. Bu, geçmişin bozulmadan korunmasını sağlar (bkz. ana şemadaki additive prensip).

## Yetki özeti (RBAC_ROLES.md ile birlikte oku)

| Rol | Görebileceği | Değiştirebileceği |
|---|---|---|
| `academy_director` | Kulübün tüm takımları, tüm sporcuları, tüm antrenör atamaları | Antrenör-takım atamaları, sporcu-takım grup değişiklikleri (kulüp içi) |
| `coach` | Sadece kendine `coach_team_assignments` ile atanmış takım(lar) | Kendi takımına dair not/mesaj (ileride), kendi takımının antrenman içeriği (ileride) |
| `athlete` | Sadece kendi verisi + karşılaştırma amaçlı anonim/agregat veriler | Kendi profili, izin/rıza tercihleri |

## MVP kapsamı

MVP'de en az `coach_team_assignments` ve `academy_director` rolü kurulmalı — bunlar sonradan eklemesi zor, üzerine çok şey inşa edilecek çekirdek parçalar. Aidat/program/drill özellikleri (sportmanager/tacticalpad tarzı) bu fazda YOK, ama şema bunları engellemeyecek şekilde (takım/antrenör ilişkisi esnek) kurulmalı.
