import sequelize from "../config/database";
import {
  Club,
  Athlete,
  TestSession,
  TestResult,
  PercentileResult,
  Coach,
  StationTest,
  Station,
  StationTestResult,
} from "../models";

const syncDatabase = async () => {
  try {
    console.log("🔄 Database bağlantısı test ediliyor...");
    await sequelize.authenticate();
    console.log("✅ Database bağlantısı başarılı!");

    console.log("🔄 Tablolar oluşturuluyor...");
    await sequelize.sync({ force: true });
    console.log("✅ Tüm tablolar başarıyla oluşturuldu!");

    console.log("🔄 Test verisi ekleniyor...");

    // Test kulübü oluştur
    const testClub = await Club.create({
      name: "Test Kulübü",
      city: "İstanbul",
      contact_person: "Ahmet Yılmaz",
      contact_email: "ahmet@test.com",
      contact_phone: "0532 123 45 67",
    });

    // Demo hesapları oluştur
    const demoCoaches = [
      {
        name: "FFMI İstasyonu",
        email: "ffmi@demo.com",
        password: "demo123",
        role: "station_coach" as const,
        assigned_stations: ["Boy-Kilo-FFMI-Esneklik İstasyonu"],
      },
      {
        name: "Sprint İstasyonu",
        email: "sprint@demo.com",
        password: "demo123",
        role: "station_coach" as const,
        assigned_stations: ["30 Metre Koşu İstasyonu"],
      },
      {
        name: "Yönetici",
        email: "admin@demo.com",
        password: "admin123",
        role: "admin" as const,
        assigned_stations: [],
      },
    ];

    for (const coachData of demoCoaches) {
      const bcrypt = require("bcryptjs");
      const password_hash = await bcrypt.hash(coachData.password, 10);
      await Coach.findOrCreate({
        where: { email: coachData.email },
        defaults: {
          name: coachData.name,
          email: coachData.email,
          password_hash: password_hash,
          role: coachData.role,
          assigned_stations: coachData.assigned_stations,
        },
      });
    }

    // Test hocası oluştur
    const bcrypt = require("bcryptjs");
    const testCoach = await Coach.create({
      name: "Test Hocası",
      email: "hoca@test.com",
      password_hash: await bcrypt.hash("123456", 10),
      role: "admin",
      assigned_stations: [
        "ffmi-station",
        "sprint-30m",
        "vertical-jump",
        "agility",
        "flexibility",
      ],
    });

    // Test sporcusu oluştur
    const testAthlete = await Athlete.create({
      first_name: "Test",
      last_name: "Sporcu",
      birth_year: 2000,
      height: 180,
      weight: 75,
      bmi: 23.15,
      ffmi: 20.5,
      club_id: testClub.id,
      athlete_code: "200000001",
    });

    // Test oturumu oluştur
    const testSession = await TestSession.create({
      club_id: testClub.id,
      test_date: new Date(),
      status: "active",
      notes: "Test oturumu",
    });

    // İstasyonları oluştur
    const stations = [
      {
        name: "Boy-Kilo-FFMI-Esneklik İstasyonu",
        description:
          "Sporcunun boy, kilo, FFMI ve esneklik ölçümlerinin yapıldığı istasyon",
        metrics: ["height", "weight", "flexibility"],
      },
      {
        name: "30 Metre Koşu İstasyonu",
        description:
          "Sporcunun 30 metre koşu testlerinin yapıldığı istasyon (iki koşu)",
        metrics: ["sprint_30m_first", "sprint_30m_second"],
      },
      {
        name: "Çeviklik İstasyonu",
        description: "Sporcunun çeviklik testinin yapıldığı istasyon",
        metrics: ["agility"],
      },
      {
        name: "Dikey Sıçrama İstasyonu",
        description: "Sporcunun dikey sıçrama testinin yapıldığı istasyon",
        metrics: ["vertical_jump"],
      },
    ];

    for (const stationData of stations) {
      await Station.create(stationData);
    }

    console.log("✅ Test verileri eklendi!");
    console.log(`📊 Oluşturulan veriler:`);
    console.log(`   - Kulüp: ${testClub.name}`);
    console.log(`   - Hoca: ${testCoach.name} (${testCoach.email})`);
    console.log(
      `   - Sporcu: ${testAthlete.first_name} ${testAthlete.last_name} (${testAthlete.athlete_code})`
    );
    console.log(`   - Oturum: ${testSession.id}`);
    console.log(`   - İstasyonlar: ${stations.length} adet oluşturuldu`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  }
};

syncDatabase();
