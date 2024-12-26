module.exports = (sequelize, Sequelize) => {
  const ReferFriend = sequelize.define(
    "ReferFriend",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      invitedDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      pointsEarned: {
        type: Sequelize.DOUBLE,
        allowNull: false,
        defaultValue: 0.0,
      },
      referredBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "refer_friend",
    }
  );

  return ReferFriend;
};
