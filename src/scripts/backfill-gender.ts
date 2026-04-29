import sequelize from "../config/database";
import { ATHLETE_GENDERS } from "../config/gender";

async function backfillGender() {
  const defaultGender = ATHLETE_GENDERS.MALE;

  try {
    await sequelize.authenticate();

    await sequelize.query(`
      ALTER TABLE athletes
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    `);

    await sequelize.query(`
      UPDATE athletes
      SET gender = '${defaultGender}'
      WHERE gender IS NULL OR TRIM(gender) = ''
    `);

    await sequelize.query(`
      ALTER TABLE athletes
      ALTER COLUMN gender SET DEFAULT '${defaultGender}'
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS athletes_birth_year_gender_idx
      ON athletes (birth_year, gender)
    `);

    await sequelize.query(`
      ALTER TABLE historical_athlete_data
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10)
    `);

    await sequelize.query(`
      UPDATE historical_athlete_data
      SET gender = '${defaultGender}'
      WHERE gender IS NULL OR TRIM(gender) = ''
    `);

    await sequelize.query(`
      ALTER TABLE historical_athlete_data
      ALTER COLUMN gender SET DEFAULT '${defaultGender}'
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS historical_athlete_data_birth_year_gender_idx
      ON historical_athlete_data (birth_year, gender)
    `);

    console.log("Gender backfill completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Gender backfill failed:", error);
    process.exit(1);
  }
}

backfillGender();
