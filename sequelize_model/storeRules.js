"use strict";

module.exports = (sequelize, DataTypes) => {
  const StoreRules = sequelize.define(
    "StoreRules",
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
      earningRuleId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "earning_rules",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      underscored: true,
      tableName: "store_rules", 
    }
  );

  return StoreRules;
};
