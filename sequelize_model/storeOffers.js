"use strict";

module.exports = (sequelize, DataTypes) => {
  const StoreOffers = sequelize.define(
    "StoreOffers",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      merchantStoreId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "merchant_stores",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      offerId: {
        type: DataTypes.BIGINT,
        allowNull: false,
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
      tableName: "store_offers",
    }
  );

  return StoreOffers;
};
