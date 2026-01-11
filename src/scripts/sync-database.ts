import sequelize from "../config/database";
import {
  TestSession,
  Athlete,
  AthleteTest,
  Measurement,
  HistoricalAthleteData,
} from "../models";

// TODO MVP: Commented out old models
/*
import {
  Club,
  TestResult,
  PercentileResult,
  Coach,
  StationTest,
  Station,
  StationTestResult,
} from "../models";
*/

const syncDatabase = async () => {
  try {
    console.log("🔄 Database bağlantısı test ediliyor...");
    await sequelize.authenticate();
    console.log("✅ Database bağlantısı başarılı!");

    console.log("🔄 Tablolar oluşturuluyor...");
    await sequelize.sync({ force: true });
    console.log("✅ Tüm tablolar başarıyla oluşturuldu!");

    console.log("🔄 Test verisi ekleniyor...");

    // Test oturumu oluştur (MVP: inline club info)
    const testSession = await TestSession.create({
      club_name: "Test Kulübü",
      club_responsible_name: "Ahmet Yılmaz",
      club_responsible_email: "ahmet@test.com",
      club_responsible_phone: "0532 123 45 67",
      city: "İstanbul",
      sport_type: "Futbol",
      test_date: new Date(),
      status: "draft",
      notes: "Test oturumu",
    });

    // Test sporcusu oluştur (MVP: simplified)
    const testAthlete = await Athlete.create({
      full_name: "Test Sporcu",
      birth_year: 2010,
      birth_date: new Date("2010-05-15"),
    });

    // AthleteTest oluştur
    const athleteTest = await AthleteTest.create({
      test_session_id: testSession.id,
      athlete_id: testAthlete.id,
      is_completed: false,
    });

    // Measurement oluştur
    await Measurement.create({
      athlete_test_id: athleteTest.id,
      height: 145,
      weight: 38,
      flexibility: 12,
      sprint_30m: 5.2,
      sprint_30m_second: 5.1,
      agility: 11.5,
      vertical_jump: 32,
    });

    // Örnek historical data ekle
    const historicalData = [
      {
        birth_year: 2010,
        height: 140,
        weight: 35,
        flexibility: 10,
        sprint_30m: 5.5,
        sprint_30m_second: 5.4,
        agility: 12.0,
        vertical_jump: 28,
      },
      {
        birth_year: 2010,
        height: 142,
        weight: 37,
        flexibility: 11,
        sprint_30m: 5.3,
        sprint_30m_second: 5.2,
        agility: 11.8,
        vertical_jump: 30,
      },
      {
        birth_year: 2010,
        height: 145,
        weight: 38,
        flexibility: 12,
        sprint_30m: 5.2,
        sprint_30m_second: 5.1,
        agility: 11.5,
        vertical_jump: 32,
      },
      {
        birth_year: 2011,
        height: 138,
        weight: 33,
        flexibility: 9,
        sprint_30m: 5.7,
        sprint_30m_second: 5.6,
        agility: 12.5,
        vertical_jump: 25,
      },
      {
        birth_year: 2011,
        height: 140,
        weight: 35,
        flexibility: 10,
        sprint_30m: 5.5,
        sprint_30m_second: 5.4,
        agility: 12.2,
        vertical_jump: 27,
      },
    ];

    for (const data of historicalData) {
      await HistoricalAthleteData.create(data);
    }

    console.log("✅ Test verileri eklendi!");
    console.log(`📊 Oluşturulan veriler:`);
    console.log(`   - Test Oturumu: ${testSession.id}`);
    console.log(`   - Sporcu: ${testAthlete.full_name}`);
    console.log(`   - AthleteTest: ${athleteTest.id}`);
    console.log(`   - Historical Data: ${historicalData.length} adet`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  }
};

syncDatabase();
