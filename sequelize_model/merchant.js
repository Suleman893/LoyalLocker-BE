const dbConn = require("../services/databaseConnection");

module.exports = (sequelize, Sequelize) => {
  const Merchant = sequelize.define(
    "Merchant",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      brandName: Sequelize.STRING,
      primaryUser: Sequelize.BIGINT,
      status: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      currency: Sequelize.STRING,
      logo: Sequelize.STRING,
      apiEnabled: Sequelize.BOOLEAN,
      mailchimpApiKey: Sequelize.STRING,
      mailchimpServerPrefix: Sequelize.STRING,
      shopifyShopName: Sequelize.STRING,
      shopifyApiKey: Sequelize.STRING,
      shopifyPassword: Sequelize.STRING,
      userId: {
        type: new Sequelize.VIRTUAL(),
      },
      storeId: {
        type: new Sequelize.VIRTUAL(),
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "merchants",
      hooks: {
        //Before
        // afterCreate: async function(merchant, options) {
        //   dbConn.instance.MerchantUsers.create({merchantId: merchant.id, userId: merchant.userId, storeId: merchant.storeId}, {transaction: options.transaction}).then(async userRole => {
        //   })
        // }
        afterCreate: async function (merchant, options) {
          dbConn.instance.MerchantUsers.create(
            {
              merchantId: merchant.id,
              userId: merchant.primaryUser,
              storeId: merchant.storeId,
            },
            { transaction: options.transaction }
          ).then(async (userRole) => {});
        },
      },
    }
  );

  return Merchant;
};
