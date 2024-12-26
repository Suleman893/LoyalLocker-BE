"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("transaction", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      merchant_user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      offer_id: {
        type: Sequelize.BIGINT,
      },
      reward_id: {
        type: Sequelize.BIGINT,
      },
      points: {
        type: Sequelize.DOUBLE,
      },
      discounted_price: {
        type: Sequelize.DOUBLE,
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("transaction");
  },
};
