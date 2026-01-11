// TODO MVP: This script is disabled for MVP
// Station model is commented out in models/index.ts
// Re-enable after MVP when Station model is active again

console.log("❌ create-stations script is disabled for MVP");
console.log("Station model has been commented out.");
process.exit(0);

/*
import { Station } from "../models";

const createStations = async () => {
  try {
    const stations = [
      {
        name: "Boy-Kilo-FFMI-Esneklik İstasyonu",
        description: "Sporcunun boy, kilo, FFMI ve esneklik ölçümlerinin yapıldığı istasyon",
        metrics: ["height", "weight", "flexibility"],
      },
      // ... rest of stations
    ];

    for (const stationData of stations) {
      await Station.create(stationData);
    }

    console.log("✅ İstasyonlar oluşturuldu!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  }
};

createStations();
*/
