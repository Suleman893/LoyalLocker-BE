module.exports = (sequelize, Sequelize) => {
  const MerchantStores = sequelize.define(
    "MerchantStores",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      merchantId: Sequelize.INTEGER,
      name: Sequelize.STRING,
      identifier: Sequelize.STRING,
      phoneNo: Sequelize.STRING,
      status: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      description: Sequelize.TEXT,
      country: Sequelize.STRING,
      city: Sequelize.STRING,
      address: Sequelize.STRING,
      state: Sequelize.STRING,
      postalCode: Sequelize.STRING,
      mostReferred: {
        type: Sequelize.INTEGER,
        default: 0,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "merchant_stores",
    }
  );

  return MerchantStores;
};
