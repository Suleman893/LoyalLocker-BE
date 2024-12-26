module.exports = (sequelize, Sequelize) => {
  const Offers = sequelize.define(
    "Offers",
    {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      discountPercentage: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      productId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      discountedPrice: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      claimInstruction: {
        type: Sequelize.TEXT,
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      allStores: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "offers",
    }
  );

  return Offers;
};
