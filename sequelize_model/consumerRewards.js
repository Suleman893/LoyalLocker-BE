"use strict";

module.exports = (sequelize, DataTypes) => {
  const ConsumerRewards = sequelize.define(
    "ConsumerRewards",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      rewardId: {
        type: DataTypes.BIGINT,
        references: {
          model: "rewards",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      underscored: true,
      tableName: "consumer_rewards",
    }
  );

  return ConsumerRewards;
};
