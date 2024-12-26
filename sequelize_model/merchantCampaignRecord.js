module.exports = (sequelize, Sequelize) => {
  const MerchantCampaignRecord = sequelize.define(
    "MerchantCampaignRecords",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      merchantUserId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      merchantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      totalEmailOpenRate: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      totalUniqueEmailOpens: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      totalClickRate: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      totalUniqueEmailClicks: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      totalEmailsSent: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      totalBounce: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
      totalBounceRate: {
        type: Sequelize.STRING,
        defaultValue: "0",
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "merchant_campaign_records",
    }
  );

  return MerchantCampaignRecord;
};
