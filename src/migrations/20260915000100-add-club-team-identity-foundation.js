"use strict";

const { DataTypes } = require("sequelize");

const now = DataTypes.NOW;

const timestamps = {
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
};

// Additive only: new tables plus nullable columns on existing tables.
// See docs/domain/CLUB_TEAM_HIERARCHY.md for the model.
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("clubs", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      contact_person: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      contact_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      ...timestamps,
    });

    // Team and age-group names are free text per club, never an enum.
    await queryInterface.createTable("teams", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      club_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "clubs", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      age_group: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ...timestamps,
    });
    await queryInterface.addIndex("teams", ["club_id", "name"], {
      name: "teams_club_id_name_unique",
      unique: true,
    });

    // Team changes close the old row (end_date) and open a new one; rows are never overwritten.
    await queryInterface.createTable("athlete_team_memberships", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      athlete_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "athletes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      team_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      ...timestamps,
    });
    await queryInterface.addIndex("athlete_team_memberships", ["athlete_id"], {
      name: "athlete_team_memberships_athlete_id_idx",
    });
    await queryInterface.addIndex("athlete_team_memberships", ["team_id"], {
      name: "athlete_team_memberships_team_id_idx",
    });

    // Possible duplicate identities wait here for a human decision; nothing merges automatically.
    await queryInterface.createTable("identity_merge_candidates", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      athlete_id_a: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "athletes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      athlete_id_b: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "athletes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      match_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      decided_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      decided_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ...timestamps,
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE identity_merge_candidates
      ADD CONSTRAINT identity_merge_candidates_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'))
    `);
    await queryInterface.addIndex("identity_merge_candidates", ["athlete_id_a", "athlete_id_b"], {
      name: "identity_merge_candidates_pair_unique",
      unique: true,
    });
    await queryInterface.addIndex("identity_merge_candidates", ["status"], {
      name: "identity_merge_candidates_status_idx",
    });

    await queryInterface.addColumn("test_sessions", "club_id", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "clubs", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addIndex("test_sessions", ["club_id"], {
      name: "test_sessions_club_id_idx",
    });

    await queryInterface.addColumn("historical_athlete_data", "athlete_id", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "athletes", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("historical_athlete_data", "club_id", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "clubs", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("historical_athlete_data", "team_id", {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "teams", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("historical_athlete_data", "test_date", {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn("historical_athlete_data", "test_date_estimated", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    });
    await queryInterface.addIndex("historical_athlete_data", ["athlete_id"], {
      name: "historical_athlete_data_athlete_id_idx",
    });
    await queryInterface.addIndex("historical_athlete_data", ["club_id"], {
      name: "historical_athlete_data_club_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("historical_athlete_data", "historical_athlete_data_club_id_idx");
    await queryInterface.removeIndex("historical_athlete_data", "historical_athlete_data_athlete_id_idx");
    await queryInterface.removeColumn("historical_athlete_data", "test_date_estimated");
    await queryInterface.removeColumn("historical_athlete_data", "test_date");
    await queryInterface.removeColumn("historical_athlete_data", "team_id");
    await queryInterface.removeColumn("historical_athlete_data", "club_id");
    await queryInterface.removeColumn("historical_athlete_data", "athlete_id");
    await queryInterface.removeIndex("test_sessions", "test_sessions_club_id_idx");
    await queryInterface.removeColumn("test_sessions", "club_id");
    await queryInterface.dropTable("identity_merge_candidates");
    await queryInterface.dropTable("athlete_team_memberships");
    await queryInterface.dropTable("teams");
    await queryInterface.dropTable("clubs");
  },
};
