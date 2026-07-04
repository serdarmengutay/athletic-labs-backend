"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn("athletes", "parent_phone", {
      type: DataTypes.STRING(20),
      allowNull: true,
    });

    await queryInterface.addIndex("athletes", ["parent_phone"], {
      name: "athletes_parent_phone_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("athletes", "athletes_parent_phone_idx");
    await queryInterface.removeColumn("athletes", "parent_phone");
  },
};
