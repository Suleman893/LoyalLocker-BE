module.exports = (sequelize, Sequelize) => {
  const Segment = sequelize.define(
    "Segment",
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
      },
      totalUsers: {
        type: Sequelize.INTEGER,
      },
      mailChimpSegmentId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "segment",
    }
  );

  return Segment;
};
