"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("merchant_products", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      //Merchant company id
      merchant_id: {
        type: Sequelize.INTEGER,
      },
      product_id: {
        type: Sequelize.BIGINT,
      },
      title: Sequelize.STRING,
      product_type: {
        type: Sequelize.STRING,
      },
      price: {
        type: Sequelize.DOUBLE,
      },
      stock: {
        type: Sequelize.BIGINT,
      },
      sku: {
        type: Sequelize.STRING,
      },
      image_src: {
        type: Sequelize.STRING,
      },
      product_created_at: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable("merchant_products");
  },
};
