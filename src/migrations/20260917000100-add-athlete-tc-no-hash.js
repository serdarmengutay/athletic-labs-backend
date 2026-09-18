"use strict";

const { DataTypes, Op } = require("sequelize");

// Additive only. The plain TCKN is never stored; only its HMAC-SHA256 hex digest.
module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn("athletes", "tc_no_hash", {
      type: DataTypes.STRING(64),
      allowNull: true,
    });

    // One TCKN belongs to exactly one athlete, even when registrations arrive concurrently.
    await queryInterface.addIndex("athletes", ["tc_no_hash"], {
      name: "athletes_tc_no_hash_unique",
      unique: true,
      where: { tc_no_hash: { [Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("athletes", "athletes_tc_no_hash_unique");
    await queryInterface.removeColumn("athletes", "tc_no_hash");
  },
};
