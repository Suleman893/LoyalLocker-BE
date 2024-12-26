"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("campaign", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
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
        unique: true,
      },
      communication_channel: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email_template_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      segment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      mail_chimp_campaign_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email_subject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sender_email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sender_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_scheduled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      campaign_schedule_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      sent_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
    await queryInterface.dropTable("campaign");
  },
};
