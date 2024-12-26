const Shopify = require("shopify-api-node");

const checkStoreExist = async (
  shopifyShopName,
  shopifyApiKey,
  shopifyPassword
) => {
  try {
    const shopify = new Shopify({
      shopName: shopifyShopName,
      apiKey: shopifyApiKey,
      password: shopifyPassword,
    });
    await shopify.shop.get();
  } catch (error) {
    error.status = 400;
    error.message = "Failed to connect to account";
    throw error;
  }
};

module.exports = { checkStoreExist };
