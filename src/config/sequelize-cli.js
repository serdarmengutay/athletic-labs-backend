require("dotenv").config();

const baseConfig = {
  dialect: "postgres",
  logging: false,
  migrationStorageTableName: "sequelize_meta",
};

function databaseConfig() {
  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      url: process.env.DATABASE_URL,
      dialectOptions:
        process.env.DB_SSL === "true"
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
              },
            }
          : undefined,
    };
  }

  return {
    ...baseConfig,
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "athletic_labs",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
  };
}

module.exports = {
  development: databaseConfig(),
  test: databaseConfig(),
  production: databaseConfig(),
};
