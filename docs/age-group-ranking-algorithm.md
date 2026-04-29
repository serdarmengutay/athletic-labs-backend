# Age Group Ranking Algorithm

Bu doküman karne hesaplamasında kullanılan yaş grubu kıyas algoritmasının teknik akışını özetler.

## Kural Özeti

- Segment sadece `birthYear + gender + metricKey`
- Minimum örneklem: `50`
- `lower_is_better` ve `higher_is_better` metric config üzerinden yönetilir
- `null` veya geçersiz metrik genel skora girmez
- `insufficient_sample` olan metrik genel skora girmez
- `score = grubun yüzde kaçından daha iyi olduğu`
- `percentileRank = 100 - score`
- `overallScore = geçerli metrik skorlarının weighted average değeri`
- `overallPercentileRank = 100 - overallScore`
- Karne üzerinde gösterilen ana sayı `overallPercentileRank` değeridir

## Akış Diyagramı

```mermaid
flowchart TD
    A["Karne Hesaplama İsteği (/calculate-report)"] --> B["Athlete + Measurement yüklenir"]
    B --> C["Derived metrikler hesaplanır (BMI, fatigue, vb.)"]
    C --> D["Metric config listesi oluşturulur"]
    D --> E["Her metric için kıyas sorgusu çalışır"]

    E --> F["Segment: birthYear + gender + metricKey"]
    F --> G["DB metric pool oluşturulur"]
    G --> G1["measurements + athletes"]
    G --> G2["historical_athlete_data"]

    G1 --> H["Valid range filtreleri uygulanır"]
    G2 --> H

    H --> I["Aggregation query"]
    I --> I1["groupSize"]
    I --> I2["betterPerformerCount"]
    I --> I3["worsePerformerCount"]
    I --> I4["equalValueCount"]

    I1 --> J{"groupSize >= 50?"}
    I2 --> J
    I3 --> J
    I4 --> J

    J -- "Hayır" --> K["status = insufficient_sample"]
    J -- "Evet" --> L["Tie strategy uygulanır (midpoint)"]

    L --> M["score hesaplanır"]
    M --> N["percentileRank = 100 - score"]
    N --> O["Metric sonucu oluşturulur"]

    K --> P["Metric genel skordan çıkarılır"]
    O --> Q["Weighted overallScore hesaplanır"]
    P --> Q
    Q --> R["overallPercentileRank = 100 - overallScore"]
    R --> S["Frontend rapor formatına dönüştürülür"]
```

## Metrik Bazlı Mantık

### lower_is_better

Örnek: `sprint_30m`, `agility`

- daha iyi performans: daha düşük değer
- better performers: `metric_value < athleteValue`
- worse performers: `metric_value > athleteValue`

### higher_is_better

Örnek: `vertical_jump`, `flexibility`, `pass_count`, `ffmi`

- daha iyi performans: daha yüksek değer
- better performers: `metric_value > athleteValue`
- worse performers: `metric_value < athleteValue`

## Tie Handling

Varsayılan strateji: `midpoint`

Formül:

- `tieAdjustedBetterThanCount = worsePerformerCount + (equalValueCount / 2)`
- `score = (tieAdjustedBetterThanCount / groupSize) * 100`

Bu yaklaşım aynı değere sahip sporcuların deterministic ve dengeli puanlanmasını sağlar.

## Karne Görselleştirme Akışı

```mermaid
flowchart TD
    A["generateFrontendAthleteReport"] --> B["Metric score ve percentile rank üret"]
    A --> C["Yaş grubu ham ortalamalarını hesapla"]

    B --> D["API response.metrics[*]"]
    C --> E["API response.ageGroupAverages"]
    B --> F["API response.overallPerformance = overallPercentileRank"]

    D --> G["Karne: overall yüzdelik göster"]
    E --> H["Bar chart: sporcu ham değer vs yaş grubu ortalaması"]
    E --> I["Radar: ham değerler valid range üzerinden normalize edilerek çizilir"]
```

## Chart Notu

- Bar chart tarafında her metrik için yeşil bar sporcunun ham değeri, gri bar aynı `birthYear + gender` grubunun ham ortalamasıdır.
- Radar chart tarafında da kaynak veri yine ham değerdir; sadece ortak eksende çizilebilmesi için metric config içindeki valid range kullanılarak normalize edilir.
- Bu yüzden radar üzerinde görülen değer bir “ortalama skor 50” mantığı değildir; yaş grubu ortalamasının ham metrikten türetilmiş normalize görsel karşılığıdır.

## Import Akışı

```mermaid
flowchart TD
    A["TEST klasörü taranır"] --> B{"Dosya import edilebilir mi?"}
    B -- "Hayır" --> C["Skip: temp / anttrenor raporu / rapor dosyası"]
    B -- "Evet" --> D["Workbook açılır"]
    D --> E["Sheet parse edilir"]
    E --> F{"Sheet gerçek test datası mı?"}
    F -- "Hayır" --> G["Sheet skip"]
    F -- "Evet" --> H["Satırlar normalize edilir"]
    H --> I["Eksik metrikler null bırakılır"]
    I --> J["BMI / Fatigue derived alanları hesaplanır"]
    J --> K["Duplicate hash üretilir"]
    K --> L["Duplicate candidate report'a yazılır"]
    L --> M["historical_athlete_data tablosuna import edilir"]
```
