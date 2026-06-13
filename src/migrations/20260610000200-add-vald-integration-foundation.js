"use strict";

const { DataTypes } = require("sequelize");

const defaultValdConfig = {
  schemaVersion: 1,
  disabledManualFields: [],
  expectedMetrics: [],
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn("test_sessions", "vald_enabled", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("test_sessions", "vald_config", {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: defaultValdConfig,
    });

    await queryInterface.createTable("vald_result_imports", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      test_session_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "test_sessions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      athlete_test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "athlete_tests",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "vald",
      },
      source: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "api",
      },
      external_athlete_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      external_test_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      test_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      measured_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      import_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      raw_payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      normalized_metrics: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex("vald_result_imports", [
      "test_session_id",
      "athlete_test_id",
    ]);
    await queryInterface.addIndex("vald_result_imports", [
      "external_athlete_id",
    ]);
    await queryInterface.addIndex("vald_result_imports", ["external_test_id"]);
    await queryInterface.addIndex("vald_result_imports", ["measured_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("vald_result_imports");
    await queryInterface.removeColumn("test_sessions", "vald_config");
    await queryInterface.removeColumn("test_sessions", "vald_enabled");
  },
};
