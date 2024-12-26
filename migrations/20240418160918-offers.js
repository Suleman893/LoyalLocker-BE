"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("offers", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      merchant_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      discount_percentage: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      discounted_price: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      claim_instruction: {
        type: Sequelize.TEXT,
      },
      expiry_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      all_stores: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("consumer_offers");
    await queryInterface.dropTable("store_offers");
    await queryInterface.dropTable("coupons");
    await queryInterface.dropTable("offers");
  },
};
