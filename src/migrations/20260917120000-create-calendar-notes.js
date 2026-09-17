"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("calendar_notes", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      note_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      note_time: {
        type: DataTypes.STRING(5),
        allowNull: true,
      },
      // Oturum silinirse not kaybolmasın; takvimde gün notu olarak kalır.
      test_session_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "test_sessions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "note",
      },
      is_done: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_by_uid: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      created_by_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      updated_by_email: {
        type: DataTypes.STRING(255),
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

    await queryInterface.addIndex("calendar_notes", ["note_date"], {
      name: "calendar_notes_note_date_idx",
    });
    await queryInterface.addIndex("calendar_notes", ["test_session_id"], {
      name: "calendar_notes_test_session_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calendar_notes");
  },
};
