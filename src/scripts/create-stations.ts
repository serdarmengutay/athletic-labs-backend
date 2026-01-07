import { Station } from "../models";
import sequelize from "../config/database";

const createStations = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

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
      const [station, created] = await Station.findOrCreate({
        where: { name: stationData.name },
        defaults: stationData,
      });

      if (created) {
        console.log(`✅ İstasyon oluşturuldu: ${station.name}`);
      } else {
        console.log(`ℹ️  İstasyon zaten mevcut: ${station.name}`);
      }
    }

    console.log("✅ Tüm istasyonlar başarıyla oluşturuldu.");
    process.exit(0);
  } catch (error) {
    console.error("❌ İstasyonlar oluşturulurken hata oluştu:", error);
    process.exit(1);
  }
};

createStations();
