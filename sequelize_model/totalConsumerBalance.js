module.exports = (sequelize, Sequelize) => {
  const TotalConsumerBalance = sequelize.define(
    "TotalConsumerBalance",
    {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      consumerId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      totalBalance: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "total_consumer_balance",
    }
  );
  return TotalConsumerBalance;
};
