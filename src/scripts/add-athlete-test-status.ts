import { DataTypes } from "sequelize";
import sequelize from "../config/database";

async function addAthleteTestStatusColumn() {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable("athlete_tests");

  if (!table.status) {
    await queryInterface.addColumn("athlete_tests", "status", {
      type: DataTypes.ENUM("active", "absent", "skipped"),
      allowNull: false,
      defaultValue: "active",
    });
  }
}

addAthleteTestStatusColumn()
  .then(async () => {
    console.log("athlete_tests.status hazır");
    await sequelize.close();
  })
  .catch(async (error) => {
    console.error("athlete_tests.status eklenemedi:", error);
    await sequelize.close();
    process.exit(1);
  });
