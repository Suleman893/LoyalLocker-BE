module.exports = (sequelize, Sequelize) => {
  const CampaignEmailTemplate = sequelize.define(
    "CampaignEmailTemplate",
    {
      id: {
        type: Sequelize.INTEGER,
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
      description: {
        type: Sequelize.TEXT,
      },
      html: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "campaign_email_template",
    }
  );
  return CampaignEmailTemplate;
};
