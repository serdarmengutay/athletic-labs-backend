# Athletic Labs Backend

Sporcu performans testleri için geliştirilmiş backend API sistemi.

## Özellikler

### 🏃‍♂️ Sporcu Yönetimi

- Sporcu kodu sistemi (doğum yılı + sıra numarası)
- Excel dosyasından toplu sporcu import
- Sporcu bilgileri (ad, soyad, doğum yılı, boy, kilo, BMI, FFMI)

### 🏢 Kulüp Yönetimi

- Kulüp bilgileri (ad, şehir, iletişim bilgileri)
- Kulüp-sporcu ilişkileri

### 🧪 Test Sistemi

- Test oturumu yönetimi
- İstasyon bazlı veri girişi
- QR kod ile hızlı veri girişi
- Otomatik percentile hesaplama

### 📊 İstasyonlar

1. **Boy-Kilo-FFMI-Esneklik İstasyonu**

   - Boy ölçümü
   - Kilo ölçümü
   - Esneklik testi

2. **30 Metre Koşu İstasyonu**

   - İlk 30 metre koşu
   - İkinci 30 metre koşu
   - Yorgunluk endeksi hesaplama

3. **Çeviklik İstasyonu**

   - Çeviklik testi

4. **Dikey Sıçrama İstasyonu**
   - Dikey sıçrama testi

### 📈 Analiz ve Raporlama

- Yaş grubuna göre percentile hesaplama
- Metrik bazlı skor hesaplama
- Genel performans değerlendirmesi
- Radar ve sütun grafik verileri

## Kurulum

### Gereksinimler

- Node.js 18+
- PostgreSQL
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükle**

```bash
npm install
```

2. **Environment değişkenlerini ayarla**
   `.env` dosyası oluşturun:

```env
NODE_ENV=development
PORT=5017
DB_HOST=localhost
DB_PORT=5432
DB_NAME=athletic_labs
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
```

3. **Database'i senkronize et**

```bash
npm run dev
# veya
npx ts-node src/scripts/sync-database.ts
```

4. **Sunucuyu başlat**

```bash
npm run dev
```

## API Endpoints

### Kulüpler

- `GET /api/clubs` - Tüm kulüpleri listele
- `POST /api/clubs` - Yeni kulüp oluştur
- `GET /api/clubs/:id` - Kulüp detayları
- `PUT /api/clubs/:id` - Kulüp güncelle
- `DELETE /api/clubs/:id` - Kulüp sil

### Sporcular

- `GET /api/athletes` - Tüm sporcuları listele
- `POST /api/athletes` - Yeni sporcu oluştur
- `GET /api/athletes/:id` - Sporcu detayları
- `PUT /api/athletes/:id` - Sporcu güncelle
- `DELETE /api/athletes/:id` - Sporcu sil

### Test Oturumları

- `GET /api/tests/sessions` - Tüm test oturumlarını listele
- `POST /api/tests/sessions` - Yeni test oturumu oluştur
- `GET /api/tests/sessions/:id` - Test oturumu detayları
- `PUT /api/tests/sessions/:id` - Test oturumu güncelle

### QR Kodlar

- `POST /api/qr/generate` - QR kod oluştur
- `POST /api/qr/validate` - QR kod doğrula
- `POST /api/qr/bulk-generate` - Toplu QR kod oluştur

### İstasyonlar

- `GET /api/station` - Tüm istasyonları listele
- `POST /api/station` - Yeni istasyon oluştur
- `POST /api/station/athlete-by-qr` - QR ile sporcu bilgilerini getir
- `POST /api/station/save-data` - İstasyon verilerini kaydet
- `GET /api/station/athlete/:athleteId/session/:sessionId/status` - Sporcu test durumu

### Excel İşlemleri

- `POST /api/excel/import-athletes` - Excel'den sporcu import et
- `GET /api/excel/template` - Excel template indir
- `GET /api/excel/export-athletes/:clubId/:sessionId` - Sporcuları Excel'e export et

## Veri Modelleri

### Sporcu Kodu Sistemi

Sporcu kodları şu formatta oluşturulur:

- Format: `YYYYXXXXXX`
- YYYY: Doğum yılı
- XXXXXX: O yıl içindeki sıra numarası (6 haneli, sıfır ile doldurulur)

Örnek:

- 2014 doğumlu, 512. sporcu → `201400512`
- 2014 doğumlu, 10152. sporcu → `201410152`

### Percentile Hesaplama

- Her metrik için yaş grubuna göre percentile hesaplanır
- Skor = 100 - Percentile (düşük percentile = yüksek skor)
- Genel skor = Tüm metrik skorlarının ortalaması

### Yaş Grupları

- U10: 10 yaş altı
- U12: 10-12 yaş
- U14: 12-14 yaş
- U16: 14-16 yaş
- U18: 16-18 yaş
- U20: 18-20 yaş
- Senior: 20 yaş üstü

## Geliştirme

### Scripts

```bash
npm run dev          # Geliştirme sunucusu
npm run build        # TypeScript derleme
npm run start        # Production sunucusu
```

### Database Scripts

```bash
npx ts-node src/scripts/sync-database.ts      # Database senkronizasyonu
npx ts-node src/scripts/create-stations.ts    # İstasyonları oluştur
```

## Teknolojiler

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL, Sequelize ORM
- **QR Kod**: qrcode kütüphanesi
- **Excel**: xlsx kütüphanesi
- **File Upload**: multer
- **Authentication**: JWT

## Lisans

ISC

