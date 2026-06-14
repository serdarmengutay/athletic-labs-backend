"use strict";

const normalizeTable = async (queryInterface, tableName, firstColumn, secondColumn) => {
  const tables = await queryInterface.showAllTables();
  const normalizedTableNames = tables.map((table) =>
    typeof table === "string" ? table : table.tableName,
  );
  if (!normalizedTableNames.includes(tableName)) return;

  const columns = await queryInterface.describeTable(tableName);
  if (!columns[firstColumn] || !columns[secondColumn]) return;

  await queryInterface.sequelize.query(`
    UPDATE "${tableName}"
    SET
      "${firstColumn}" = LEAST("${firstColumn}", "${secondColumn}"),
      "${secondColumn}" = GREATEST("${firstColumn}", "${secondColumn}")
    WHERE
      "${firstColumn}" IS NOT NULL
      AND "${secondColumn}" IS NOT NULL
      AND "${firstColumn}" > "${secondColumn}"
  `);
};

module.exports = {
  async up(queryInterface) {
    await normalizeTable(
      queryInterface,
      "measurements",
      "sprint_30m",
      "sprint_30m_second",
    );
    await normalizeTable(
      queryInterface,
      "historical_athlete_data",
      "sprint_30m",
      "sprint_30m_second",
    );
    await normalizeTable(
      queryInterface,
      "test_results",
      "sprint_30m_first",
      "sprint_30m_second",
    );

    const measurementColumns =
      await queryInterface.describeTable("measurements");
    if (measurementColumns.fatigue_index) {
      await queryInterface.sequelize.query(`
        UPDATE "measurements"
        SET "fatigue_index" = ROUND(
          (
            ("sprint_30m_second" - "sprint_30m")
            / NULLIF("sprint_30m", 0)
          ) * 100,
          2
        )
        WHERE
          "sprint_30m" IS NOT NULL
          AND "sprint_30m_second" IS NOT NULL
          AND "sprint_30m" > 0
      `);
    }
  },

  async down() {
    // Data normalization is intentionally irreversible.
  },
};
