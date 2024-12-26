"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("merchant_campaign_records", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      merchant_user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_email_open_rate: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      total_unique_email_opens: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      total_click_rate: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      total_unique_email_clicks: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      total_emails_sent: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      total_bounce: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      total_bounce_rate: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("merchant_campaign_record");
  },
};
