"use strict";

module.exports = (sequelize, DataTypes) => {
  const ProductRules = sequelize.define(
    "ProductRules",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      merchantProductId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "merchant_products",
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
      tableName: "product_rules",
    }
  );

  return ProductRules;
};
