module.exports = (sequelize, Sequelize) => {
  const MerchantUsers = sequelize.define(
    "MerchantUsers",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      merchantId: Sequelize.INTEGER,
      userId: Sequelize.BIGINT,
      storeId: Sequelize.INTEGER,
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "merchant_users",
    }
  );

  return MerchantUsers;
};
