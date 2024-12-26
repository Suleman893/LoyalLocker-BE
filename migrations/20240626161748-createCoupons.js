"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("coupons", {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      coupon_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      offer_id: {
        type: Sequelize.BIGINT,
        references: {
          model: "offers",
          key: "id",
        },
        allowNull: true,
      },
      reward_id: {
        type: Sequelize.BIGINT,
        references: {
          model: "rewards",
          key: "id",
        },
        allowNull: true,
      },
      rule_id: {
        type: Sequelize.BIGINT,
        references: {
          model: "earning_rules",
          key: "id",
        },
        allowNull: true,
      },
      user_id: {
        type: Sequelize.BIGINT,
        references: {
          model: "users",
          key: "id",
        },
        allowNull: false,
      },
      issued: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      availed: {
        type: Sequelize.BOOLEAN,
      },
      availed_at: {
        type: Sequelize.DATE,
      },
      //Refers to the user model id of merchant
      merchant_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      //Refers to the merchant model id
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("coupons");
  },
};
