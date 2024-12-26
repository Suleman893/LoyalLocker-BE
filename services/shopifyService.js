const logger = require("../util/logger");
const Shopify = require("shopify-api-node");
const dbConn = require("./databaseConnection");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const { checkStoreExist } = require("../util/existShopifyStore");

function ShopifyService() {
  //---Shopify Webhooks registrations---
  //Product created event
  this.webhookProductCreated = async function (req, res) {
    const merchantMobileNo = req.params.email;
    try {
      const userExist = await dbConn.instance.User.findOne({
        where: {
          mobile: merchantMobileNo,
        },
      });
      if (userExist && userExist?.email) {
        const merchant = await dbConn.instance.Merchant.findOne({
          where: {
            primaryKey: parseInt(userExist.id),
          },
        });
        const alreadyIntegrated = await dbConn.instance.Merchant.findOne({
          where: {
            primaryKey: parseInt(merchant.id),
          },
        });
        if (
          alreadyIntegrated &&
          alreadyIntegrated?.shopifyShopName &&
          alreadyIntegrated?.shopifyApiKey &&
          alreadyIntegrated?.shopifyPassword
        ) {
          const { id, title, product_type, variants, image, created_at } =
            req.body;
          await dbConn.instance.MerchantProducts.create({
            merchantId: merchant.id,
            productId: id,
            title,
            productType: product_type,
            price: variants && variants.length > 0 ? variants[0].price : "",
            stock:
              variants && variants.length > 0
                ? variants[0].inventory_quantity
                : "",
            sku: variants && variants.length > 0 ? variants[0].sku : "",
            imageSrc: image ? image.src : "",
            productCreatedAt: created_at,
          });
          res.body.status_code = 201;
          res.body.response = `Product added in your store`;
        } else {
          res.body.status_code = 400;
          res.body.response = `Store not integrated`;
        }
      } else {
        res.body.status_code = 404;
        res.body.response = `User Merchant not found`;
      }
      return res.status(res.body.status_code).send(res.body);
    } catch (err) {
      console.log("The error", err);
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Product updated event
  this.webhookProductUpdated = async function (req, res) {
    const merchantMobileNo = req.params.email;
    try {
      const userExist = await dbConn.instance.User.findOne({
        where: {
          mobile: merchantMobileNo,
        },
      });
      if (userExist && userExist?.email) {
        const merchant = await dbConn.instance.Merchant.findOne({
          where: {
            primaryKey: parseInt(userExist.id),
          },
        });
        const alreadyIntegrated = await dbConn.instance.Merchant.findOne({
          where: {
            primaryKey: parseInt(merchant.id),
          },
        });
        if (
          alreadyIntegrated &&
          alreadyIntegrated?.shopifyShopName &&
          alreadyIntegrated?.shopifyApiKey &&
          alreadyIntegrated?.shopifyPassword
        ) {
          const { id, title, product_type, variants, image, created_at } =
            req.body;
          const productIs = await dbConn.instance.MerchantProducts.findOne({
            where: {
              merchantId: merchant.id,
              productId: id,
            },
          });
          await dbConn.instance.MerchantProducts.update(
            {
              productId: id,
              title,
              productType: product_type,
              price: variants && variants.length > 0 ? variants[0].price : "",
              stock:
                variants && variants.length > 0
                  ? variants[0].inventory_quantity
                  : "",
              sku: variants && variants.length > 0 ? variants[0].sku : "",
              imageSrc: image ? image.src : "",
              productCreatedAt: created_at,
            },
            {
              where: {
                id: productIs?.id,
              },
            }
          );
        } else {
          res.body.status_code = 404;
          res.body.response = `User Merchant not found`;
        }
        res.body.status_code = 200;
        res.body.response = `Product updated in your store`;
      } else {
        res.body.status_code = 400;
        res.body.response = `Store not integrated`;
      }
      return res.status(res.body.status_code).send(res.body);
    } catch (err) {
      console.log("The error", err);
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Product deleted event
  this.webhookProductDeleted = async function (req, res) {
    const merchantMobileNo = req.params.email;
    try {
      const userExist = await dbConn.instance.User.findOne({
        where: {
          mobile: merchantMobileNo,
        },
      });
      if (userExist && userExist?.email) {
        const merchant = await dbConn.instance.Merchant.findOne({
          where: {
            primaryKey: parseInt(userExist.id),
          },
        });
        const alreadyIntegrated = await dbConn.instance.Merchant.findOne({
          where: {
            primaryKey: parseInt(merchant.id),
          },
        });
        if (
          alreadyIntegrated &&
          alreadyIntegrated?.shopifyShopName &&
          alreadyIntegrated?.shopifyApiKey &&
          alreadyIntegrated?.shopifyPassword
        ) {
          await dbConn.instance.MerchantProducts.destroy({
            where: {
              merchantId: merchant.id,
              productId: req.body?.id,
            },
          });
          res.body.status_code = 200;
          res.body.response = `Your shopify store one product deleted`;
        } else {
          res.body.status_code = 409;
          res.body.response = `Your shopify store is not integrated`;
        }
      } else {
        res.body.status_code = 404;
        res.body.response = `User Merchant not found`;
      }
      return res.status(res.body.status_code).send(res.body);
    } catch (err) {
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Integrate shopify account with platform
  this.integrateShopify = async function (req, res) {
    const { shopifyShopName, shopifyApiKey, shopifyPassword } = req.body;
    try {
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      await checkStoreExist(shopifyShopName, shopifyApiKey, shopifyPassword);

      const shopify = new Shopify({
        shopName: shopifyShopName,
        apiKey: shopifyApiKey,
        password: shopifyPassword,
      });

      const alreadyIntegrated = await dbConn.instance.Merchant.findOne({
        where: {
          id: merchantIs.merchantId,
          shopifyShopName: shopifyShopName,
          shopifyApiKey: shopifyApiKey,
          shopifyPassword: shopifyPassword,
        },
      });
      if (
        alreadyIntegrated &&
        alreadyIntegrated.shopifyShopName &&
        alreadyIntegrated.shopifyApiKey &&
        alreadyIntegrated.shopifyPassword
      ) {
        res.body.status_code = 409;
        res.body.response = `Your shopify store ${shopifyShopName} already integrated`;
        logger.log("info", "INTEGRATE_ACCOUNT", {
          payload: {
            request: null,
            user: req.user.email,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.Merchant.update(
        {
          shopifyShopName: shopifyShopName,
          shopifyApiKey: shopifyApiKey,
          shopifyPassword: shopifyPassword,
        },
        {
          where: { id: merchantIs.merchantId },
        }
      );
      await shopify.product.list().then((product) => {
        extractedPro = product.map(async (pro) => {
          const productId = pro?.id;
          const title = pro?.title;
          const productType = pro?.product_type;
          const price =
            pro?.variants && pro?.variants?.length > 0
              ? pro?.variants[0]?.price
              : "";
          const stock =
            pro?.variants && pro?.variants?.length > 0
              ? pro?.variants[0]?.inventory_quantity
              : "";
          const sku =
            pro?.variants && pro?.variants?.length > 0
              ? pro?.variants[0]?.sku
              : "";
          const imageSrc = pro?.image ? pro?.image?.src : "";
          const productCreatedAt = pro?.created_at;

          await dbConn.instance.MerchantProducts.create({
            merchantId: merchantIs.merchantId,
            productId,
            title,
            productType,
            price,
            stock,
            sku,
            imageSrc,
            productCreatedAt,
          });
        });
      });
      res.body.status_code = 200;
      res.body.response = `Your shopify store ${shopifyShopName} integrated`;
      logger.log("info", "INTEGRATE_ACCOUNT", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      return res.status(res.body.status_code).send(res.body);
    } catch (err) {
      if (err.status === 400) {
        return res.status(400).send({
          status_code: 400,
          message: "Invalid shopify credentials",
        });
      }
      logger.log("error", "INTEGRATE_ACCOUNT", {
        payload: {
          request: null,
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Edit merchant integration
  this.editShopifyIntegration = async function (req, res) {
    const { shopifyShopName, shopifyApiKey, shopifyPassword } = req.body;
    const merchantIs = await dbConn.instance.MerchantUsers.findOne({
      where: {
        userId: req.user.id,
      },
    });
    try {
      const alreadyIntegrated = await dbConn.instance.Merchant.findOne({
        where: {
          id: merchantIs.merchantId,
        },
      });
      if (
        alreadyIntegrated &&
        alreadyIntegrated.shopifyShopName &&
        alreadyIntegrated.shopifyApiKey &&
        alreadyIntegrated.shopifyPassword
      ) {
        await checkStoreExist(shopifyShopName, shopifyApiKey, shopifyPassword);
        await dbConn.instance.Merchant.update(
          {
            shopifyShopName: shopifyShopName,
            shopifyApiKey: shopifyApiKey,
            shopifyPassword: shopifyPassword,
          },
          {
            where: { id: merchantIs.merchantId },
          }
        );

        const shopify = new Shopify({
          shopName: shopifyShopName,
          apiKey: shopifyApiKey,
          password: shopifyPassword,
        });

        await shopify.product.list().then(async (products) => {
          for (const pro of products) {
            const productId = pro?.id;

            // Check if the product already exists in the database
            const existingProduct =
              await dbConn.instance.MerchantProducts.findOne({
                where: {
                  merchantId: merchantIs.merchantId,
                  productId: productId,
                },
              });
            if (!existingProduct) {
              const title = pro?.title;
              const productType = pro?.product_type;
              const price =
                pro?.variants && pro?.variants?.length > 0
                  ? pro?.variants[0]?.price
                  : "";
              const stock =
                pro?.variants && pro?.variants?.length > 0
                  ? pro?.variants[0]?.inventory_quantity
                  : "";
              const sku =
                pro?.variants && pro?.variants?.length > 0
                  ? pro?.variants[0]?.sku
                  : "";
              const imageSrc = pro?.image ? pro?.image?.src : "";
              const productCreatedAt = pro?.created_at;

              // Create a new record if the product does not exist
              await dbConn.instance.MerchantProducts.create({
                merchantId: merchantIs.merchantId,
                productId,
                title,
                productType,
                price,
                stock,
                sku,
                imageSrc,
                productCreatedAt,
              });
            }
          }
        });

        res.body.status_code = 200;
        res.body.response = `Shopify store integration updated`;
        logger.log("info", "EDIT_SHOPIFY_INTEGRATION", {
          payload: {
            request: null,
            user: req.user.email,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
        return res.status(res.body.status_code).send(res.body);
      }
      res.body.status_code = 404;
      res.body.response = `Shopify store not connected`;
      logger.log("info", "EDIT_SHOPIFY_INTEGRATION", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      return res.status(res.body.status_code).send(res.body);
    } catch (err) {
      if (err.status === 400) {
        return res.status(400).send({
          status_code: 400,
          message: "Invalid shopify credentials",
        });
      }
      logger.log("err", "EDIT_SHOPIFY_INTEGRATION", {
        payload: {
          request: null,
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Get Products
  // this.getProducts = async function (req, res) {
  //   // const baseUrl =
  //   try {
  //     // const { data } = await axios.get(`${baseUrl}/products.json`);
  //     let extractedPro;
  //     const data = await shopify.product.list().then((product) => {
  //       extractedPro = product.map((pro) => {
  //         const imageSrc = pro?.image ? pro?.image?.src : "";
  //         const title = pro?.title;
  //         const id = pro?.id;
  //         const price =
  //           pro?.variants && pro?.variants?.length > 0
  //             ? pro?.variants[0]?.price
  //             : "";
  //         const productType = pro?.product_type;
  //         const createdAt = pro?.created_at;
  //         const stock =
  //           pro?.variants && pro?.variants?.length > 0
  //             ? pro?.variants[0]?.inventory_quantity
  //             : "";
  //         return {
  //           imageSrc,
  //           title,
  //           id,
  //           price,
  //           productType,
  //           createdAt,
  //           stock,
  //         };
  //       });
  //     });
  //     res.body.status_code = 200;
  //     res.body.response = extractedPro;
  //     logger.log("info", "GET_PRODUCTS", {
  //       payload: {
  //         request: null,
  //         user: req.user.email,
  //         response:
  //           res.body.status_code == 200 ? { status_code: 200 } : res.body,
  //         ipAddress: req.ip,
  //       },
  //     });
  //     return res.status(res.body.status_code).send(res.body);
  //   } catch (err) {
  //     logger.log("error", "GET_PRODUCTS", {
  //       payload: {
  //         request: null,
  //         user: req.user.email,
  //         response: err.message,
  //         ipAddress: req.ip,
  //       },
  //     });
  //     return res
  //       .status(500)
  //       .send({ status_code: 500, message: "Internal Server Error" });
  //   }
  // };
}
module.exports = new ShopifyService();
