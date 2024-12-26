module.exports = (sequelize, Sequelize) => {
  const Campaign = sequelize.define(
    "Campaign",
    {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      //Refers to the user model id of merchant
      merchantUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      //Refers to the merchant model id
      merchantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      communicationChannel: {
        allowNull: false,
        type: Sequelize.ENUM("sms", "email"),
      },
      emailTemplateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      segmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      mailChimpCampaignId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      emailSubject: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      senderEmail: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      senderName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isScheduled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      campaignScheduleTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      sentCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "campaign",
    }
  );
  return Campaign;
};
