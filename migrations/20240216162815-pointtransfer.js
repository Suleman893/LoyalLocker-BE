"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("point_transfer", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING,
      },
      consumer_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      admin_id: {
        type: Sequelize.BIGINT,
      },
      //Refers to the Merchant Table PK
      merchant_id: {
        type: Sequelize.INTEGER,
      },
      //Refers to the User Table PK
      merchant_user_id: {
        type: Sequelize.BIGINT,
      },
      transfer_type: {
        type: Sequelize.STRING,
        allowNull: false,
        // type: Sequelize.ENUM("SPEND", "EARNED"),
      },
      points: {
        allowNull: false,
        type: Sequelize.DOUBLE,
      },
      point_status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      points_expiry: {
        type: Sequelize.DATE,
      },
      loyalty_number: {
        allowNull: false,
        type: Sequelize.DOUBLE,
      },
      transfer_hash: {
        type: Sequelize.STRING,
      },
      transfer_date: {
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
    await queryInterface.dropTable("point_transfer");
  },
};
