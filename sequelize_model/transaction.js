module.exports = (sequelize, Sequelize) => {
  const Transaction = sequelize.define(
    "Transaction",
    {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      transactionType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      userId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      merchantUserId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      merchantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      offerId: {
        type: Sequelize.BIGINT,
      },
      rewardId: {
        type: Sequelize.BIGINT,
      },
      discountedPrice: {
        type: Sequelize.DOUBLE,
      },
      points: {
        type: Sequelize.DOUBLE,
      },
      transactionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "transaction",
    }
  );

  return Transaction;
};
