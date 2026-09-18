import { sequelize } from "../models";
import { assertDestructiveSyncAllowed } from "./destructiveSyncGuard";

const syncSchema = async () => {
  assertDestructiveSyncAllowed("sync-schema");
  try {
    console.log("Checking database connection...");
    await sequelize.authenticate();

    console.log("Synchronizing schema with alter=true...");
    await sequelize.sync({ alter: true });

    console.log("Schema synchronization completed.");
    process.exit(0);
  } catch (error) {
    console.error("Schema synchronization failed:", error);
    process.exit(1);
  }
};

syncSchema();
