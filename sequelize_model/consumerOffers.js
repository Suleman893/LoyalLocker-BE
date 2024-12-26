"use strict";

module.exports = (sequelize, DataTypes) => {
  const ConsumerOffers = sequelize.define(
    "ConsumerOffers",
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
      offerId: {
        type: DataTypes.BIGINT,
        references: {
          model: "offers", 
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      underscored: true,
      tableName: "consumer_offers", 
    }
  );

  return ConsumerOffers;
};
