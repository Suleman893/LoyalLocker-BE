"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("merchants", "shopify_shop_name", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("merchants", "shopify_api_key", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("merchants", "shopify_password", {
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("merchants", "shopify_shop_name");
    await queryInterface.removeColumn("merchants", "shopify_api_key");
  },
};
