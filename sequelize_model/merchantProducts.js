module.exports = (sequelize, Sequelize) => {
  const MerchantProducts = sequelize.define(
    "MerchantProducts",
    {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      //Merchant company id
      merchantId: Sequelize.INTEGER,
      //Product id refers to shopify product id
      productId: {
        type: Sequelize.BIGINT,
      },
      title: Sequelize.STRING,
      productType: Sequelize.STRING,
      price: Sequelize.DOUBLE,
      sku: Sequelize.STRING,
      stock: Sequelize.BIGINT,
      imageSrc: Sequelize.STRING,
      //Product CreatedAt refers to shopify product created date not when record created_at in database
      productCreatedAt: Sequelize.DATE,
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "merchant_products",
    }
  );

  return MerchantProducts;
};
