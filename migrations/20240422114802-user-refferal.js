"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "referred_by", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("users", "referral_code", {
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "referred_by");
    await queryInterface.removeColumn("users", "referral_code");
  },
};
