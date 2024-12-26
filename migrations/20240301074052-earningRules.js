"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("earning_rules", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
        allowNull: false,
      },
      event_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      merchant_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      merchant_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      min_transaction_value: {
        type: Sequelize.INTEGER,
      },
      status: {
        type: Sequelize.STRING,
        // type: Sequelize.ENUM("ACTIVE", "INACTIVE", "ALWAYS_ACTIVE"),
      },
      all_time_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      start_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_at: {
        type: Sequelize.DATE,
      },
      all_stores: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      purchase_type: {
        type: Sequelize.STRING,
        // type: Sequelize.ENUM("FIRST_PURCHASE", "EVERY_PURCHASE"),
      },
      points_type: {
        type: Sequelize.STRING,
        // type: Sequelize.ENUM("REWARD", "OFFER"),
      },
      distance_from_store: {
        type: Sequelize.DOUBLE,
      },
      multiplier: {
        type: Sequelize.DOUBLE,
      },
      product_id: {
        type: Sequelize.BIGINT,
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
    await queryInterface.dropTable("store_rules");
    await queryInterface.dropTable("product_rules")
    await queryInterface.dropTable("earning_rules");
    await queryInterface.dropTable("coupons");

  },
};
