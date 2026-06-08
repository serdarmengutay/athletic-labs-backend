"use strict";

const { DataTypes } = require("sequelize");

const now = DataTypes.NOW;

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await queryInterface.createTable("test_sessions", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      club_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      club_responsible_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      club_responsible_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      club_responsible_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      sport_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      test_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("draft", "in_progress", "completed"),
        allowNull: false,
        defaultValue: "draft",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
    });

    await queryInterface.createTable("athletes", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      birth_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      gender: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "male",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
    });
    await queryInterface.addIndex("athletes", ["birth_year", "gender"]);

    await queryInterface.createTable("athlete_tests", {
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
      athlete_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "athletes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: DataTypes.ENUM("active", "absent", "skipped"),
        allowNull: false,
        defaultValue: "active",
      },
      is_completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
    });
    await queryInterface.addIndex("athlete_tests", ["test_session_id"]);
    await queryInterface.addIndex("athlete_tests", ["athlete_id"]);
    await queryInterface.addIndex("athlete_tests", ["test_session_id", "athlete_id"], {
      unique: true,
      name: "athlete_tests_session_athlete_unique",
    });

    await queryInterface.createTable("measurements", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      athlete_test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "athlete_tests",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      height: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      weight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      flexibility: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      sprint_30m: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      sprint_30m_second: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      agility: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      vertical_jump: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      pass_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ffmi: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      bmi: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      fatigue_index: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
    });

    await queryInterface.createTable("historical_athlete_data", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      club_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      country_code: {
        type: DataTypes.STRING(4),
        allowNull: false,
        defaultValue: "TR",
      },
      country_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Türkiye",
      },
      birth_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      gender: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "male",
      },
      height: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      weight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      bmi: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      flexibility: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      sprint_30m: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      sprint_30m_second: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      agility: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      vertical_jump: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      pass_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ffmi: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      fatigue_index: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
    });
    await queryInterface.addIndex("historical_athlete_data", ["birth_year", "gender"]);

    await queryInterface.createTable("x_one_report_imports", {
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
      athlete_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "athletes",
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
      report_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      agent_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      qr_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      qr_url: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      raw_payload: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      composition: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      measurement: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      posture: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      balance: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
    });
    await queryInterface.addIndex("x_one_report_imports", ["report_id"], {
      unique: true,
    });
    await queryInterface.addIndex("x_one_report_imports", [
      "test_session_id",
      "athlete_id",
    ]);
    await queryInterface.addIndex("x_one_report_imports", ["athlete_test_id"]);

    await queryInterface.createTable("youjiu_push_logs", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      report_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      device_sn: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      merchant: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("received", "processed", "ignored", "failed"),
        allowNull: false,
        defaultValue: "received",
      },
      raw_payload: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      request_headers: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      received_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: now,
      },
    });
    await queryInterface.addIndex("youjiu_push_logs", ["report_id"]);
    await queryInterface.addIndex("youjiu_push_logs", ["device_sn"]);
    await queryInterface.addIndex("youjiu_push_logs", ["received_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("youjiu_push_logs");
    await queryInterface.dropTable("x_one_report_imports");
    await queryInterface.dropTable("historical_athlete_data");
    await queryInterface.dropTable("measurements");
    await queryInterface.dropTable("athlete_tests");
    await queryInterface.dropTable("athletes");
    await queryInterface.dropTable("test_sessions");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_youjiu_push_logs_status";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_athlete_tests_status";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_test_sessions_status";',
    );
  },
};
