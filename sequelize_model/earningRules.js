module.exports = (sequelize, Sequelize) => {
  const EarningRules = sequelize.define(
    "EarningRules",
    {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
        allowNull: false,
      },
      eventId: {
        type: Sequelize.INTEGER,
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      points: {
        //Points refers to earn points and activity points based on Event type
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minTransactionValue: Sequelize.INTEGER,
      //Status can be ACTIVE, INACTIVE OR ALWAYS_ACTIVE
      status: {
        type: Sequelize.ENUM("ACTIVE", "INACTIVE", "ALWAYS_ACTIVE"),
        allowNull: false,
      },
      allTimeActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      startAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
      endAt: Sequelize.DATE,
      allStores: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      purchaseType: {
        type: Sequelize.ENUM("FIRST_PURCHASE", "EVERY_PURCHASE"),
      },
      pointsType: {
        type: Sequelize.ENUM("REWARD", "OFFER"),
      },
      distanceFromStore: Sequelize.DOUBLE,
      multiplier: Sequelize.INTEGER,
      productId: {
        type: Sequelize.BIGINT,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "earning_rules",
    }
  );

  return EarningRules;
};
