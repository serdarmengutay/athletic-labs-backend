"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn("x_one_report_imports", "measurement_time", {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("x_one_report_imports", "body_fat_percent", {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("x_one_report_imports", "mineral_amount", {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("x_one_report_imports", "protein_amount", {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("x_one_report_imports", "device_serial", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await queryInterface.addIndex("x_one_report_imports", ["device_serial"]);
    await queryInterface.addIndex("x_one_report_imports", ["measurement_time"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("x_one_report_imports", ["measurement_time"]);
    await queryInterface.removeIndex("x_one_report_imports", ["device_serial"]);
    await queryInterface.removeColumn("x_one_report_imports", "device_serial");
    await queryInterface.removeColumn("x_one_report_imports", "protein_amount");
    await queryInterface.removeColumn("x_one_report_imports", "mineral_amount");
    await queryInterface.removeColumn("x_one_report_imports", "body_fat_percent");
    await queryInterface.removeColumn("x_one_report_imports", "measurement_time");
  },
};
