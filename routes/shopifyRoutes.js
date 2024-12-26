const constants = require("../constants.js");
const shopifyService = require("../services/shopifyService.js");
const { check, validationResult } = require("express-validator");

module.exports = (app) => {
  //Webhook of shopify to get updated when new product created in shopify store
  app.post(
    `${constants.baseAPIPath}/merchant/webhook/product-created/:mobile`,
    async (req, res) => {
      await shopifyService.webhookProductCreated(req, res);
    }
  );

  //Webhook of shopify to get updated when new product updated in shopify store
  app.post(
    `${constants.baseAPIPath}/merchant/webhook/product-updated/:mobile`,
    async (req, res) => {
      await shopifyService.webhookProductUpdated(req, res);
    }
  );

  //Webhook of shopify to get updated when new product deleted in shopify store
  app.post(
    `${constants.baseAPIPath}/merchant/webhook/product-deleted/:mobile`,
    async (req, res) => {
      await shopifyService.webhookProductDeleted(req, res);
    }
  );

  //Merchant integrating his shopify store with platform
  app.post(
    `${constants.baseAPIPath}/merchant/integrate-shopify`,
    [
      check("shopifyShopName").not().isEmpty().withMessage("Shopify shop name"),
      check("shopifyApiKey").not().isEmpty().withMessage("Shopify api key"),
      check("shopifyPassword")
        .not()
        .isEmpty()
        .withMessage("Shopify password is required."),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await shopifyService.integrateShopify(req, res);
    }
  );

  //Merchant updating his shopify store integrated with platform
  app.put(
    `${constants.baseAPIPath}/merchant/edit-shopify-integration`,
    [
      check("shopifyShopName").not().isEmpty().withMessage("Shopify shop name"),
      check("shopifyApiKey").not().isEmpty().withMessage("Shopify api key"),
      check("shopifyPassword")
        .not()
        .isEmpty()
        .withMessage("Shopify password is required."),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await shopifyService.editShopifyIntegration(req, res);
    }
  );
};
