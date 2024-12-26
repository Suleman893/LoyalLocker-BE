module.exports = (sequelize, Sequelize) => {
  const Rewards = sequelize.define(
    "Rewards",
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      rewardPoints: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      productId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      rewardImg: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      claimInstruction: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "rewards",
    }
  );

  return Rewards;
};
