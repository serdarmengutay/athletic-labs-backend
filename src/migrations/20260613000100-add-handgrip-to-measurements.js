"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("measurements", "handgrip", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("measurements", "handgrip");
  },
};
