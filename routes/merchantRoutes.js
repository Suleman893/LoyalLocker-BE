const constants = require("../constants.js");
const { check, validationResult } = require("express-validator");
const merchantService = require("../services/merchantService.js");
const appUtils = require("../util/appUtil.js");
const validator = require("../util/validator.js");
const { upload } = require("../util/multer.js");

module.exports = (app) => {
  //Merchant information (Not using for now)
  app.get(
    `${constants.baseAPIPath}/merchant/about`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.about(req, res);
    }
  );

  //Add the API keys for POS Systems (Not using for now)
  app.post(
    `${constants.baseAPIPath}/merchant/api-keys`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check("ipAddress", "must be valid json array").custom(
        validator.isValidJSONArray
      ),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      await merchantService.addApiKey(req, res);
    }
  );

  //Get the API keys for POS Systems (Not using for now)
  app.get(
    `${constants.baseAPIPath}/merchant/api-keys`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getApiKeys(req, res);
    }
  );

  //Delete the API keys for POS Systems (Not using for now)
  app.delete(
    `${constants.baseAPIPath}/merchant/api-keys`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.deleteApiKey(req, res);
    }
  );

  //Get all the members/consumers of merchant (For dropdown in frontend)
  app.get(
    `${constants.baseAPIPath}/merchant/customers`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getMerchantCustomers(req, res, true, null);
    }
  );

  //Get all the members/consumers of merchant
  app.get(
    `${constants.baseAPIPath}/merchant/merchant-consumers`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getConsumers(req, res);
    }
  );

  //Merchant getting all members for manual transferring points API
  //(Infinite Scroll / API for Dropdowns in frontend)
  app.get(
    `${constants.baseAPIPath}/merchant/all-transfer-members`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getMembers(req, res);
    }
  );

  //Merchant getting all stores
  //(Infinite Scroll / API for Dropdowns in frontend)
  app.get(
    `${constants.baseAPIPath}/merchant/all-stores`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getAllMerchantStores(req, res);
    }
  );

  //Merchant activate/deactivate the member and that member cannot login then
  app.get(
    `${constants.baseAPIPath}/merchant/consumer/:id/activate`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.activateConsumer(req, res);
    }
  );

  //Merchant inviting the consumers
  app.post(
    `${constants.baseAPIPath}/merchant/invite-member`,
    [
      check("email", "must be a valid email with 5 min chars and max 60 chars")
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
      check("firstName")
        .not()
        .isEmpty()
        .withMessage("First name is required.")
        .isLength({ min: 2, max: 30 })
        .withMessage("First name must be min 2 and max 30 chars"),
      check("lastName", "must be min 2 char and max 30 chars long")
        .optional()
        .isLength({ min: 2, max: 30 }),
      check("storeId").not().isEmpty().withMessage("Store id is required."),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await merchantService.inviteUser(req, res);
    }
  );

  //Merchant adding the store
  app.post(
    `${constants.baseAPIPath}/merchant/store`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check("name", "must be at least 2 chars and max 100 chars long")
        .trim()
        .isLength({ min: 2, max: 100 }),
      check("identifier", "must be at least 2 chars and max 100 chars long")
        .trim()
        .isLength({ min: 2, max: 100 }),
      check("status", "must be either ACTIVE/INACTIVE")
        .trim()
        .isLength({ min: 6 }),
      check("country", "must be at least 2 chars and max 100 chars long")
        .trim()
        .isLength({ min: 2, max: 100 }),
      check("city", "must be at least 2 chars and max 100 chars long")
        .trim()
        .isLength({ min: 2, max: 100 }),
      check("address", "must be at least 5 chars and max 100 chars long")
        .trim()
        .isLength({ min: 5, max: 100 }),
      check("state", "must be max 100 chars long")
        .optional()
        .isLength({ max: 100 }),
      check("postalCode", "must be at least 4 chars and max 10 chars long")
        .trim()
        .isLength({ min: 4, max: 10 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await merchantService.addStore(req, res);
    }
  );

  //Merchant all stores
  app.get(
    `${constants.baseAPIPath}/merchant/stores`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.merchantStores(req, res);
    }
  );

  //Merchant updating the status of his/her store
  app.patch(
    `${constants.baseAPIPath}/merchant/store/:id/activate`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.activateStore(req, res);
    }
  );

  //Merchant creating reward for consumers
  app.post(
    `${constants.baseAPIPath}/merchant/reward`,
    upload.single("photoUrl"),
    [
      check("name", "must be at least 2 chars and max 80 chars long")
        .trim()
        .isLength({ min: 2, max: 80 }),
      check("rewardPoints", "Reward points must be between 2 and 8 digits long")
        .trim()
        .isInt()
        .isLength({ min: 2, max: 8 }),
      check("expirationDate", "expiration date is required"),
      check("productId")
        .trim()
        .notEmpty()
        .withMessage("Product Id is required.")
        .isInt()
        .withMessage("Product Id must be an integer."),
      check(
        "claimInstruction",
        "must be atleast 5 chars min and max 1000 chars long"
      )
        .optional()
        .isLength({ min: 5, max: 1000 }),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await merchantService.createReward(req, res);
    }
  );

  //Merchant creating offers for consumers
  app.post(
    `${constants.baseAPIPath}/merchant/offer`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check("storeId")
        .isArray({ min: 1 })
        .withMessage("Store Id must be an array with at least one element"),
      check("expiryDate", "Expiry date of reward is required").notEmpty(),
      check("discountPercentage", "Discount percentage is required").notEmpty(),
      check("discountedPrice", "Discounted price is required").notEmpty(),
      check("claimInstruction")
        .notEmpty()
        .withMessage("Claim instruction is required.")
        .isLength({ min: 5, max: 1000 })
        .withMessage(
          "Claim instruction must be between 5 and 1000 characters long."
        ),
      check("productId")
        .notEmpty()
        .withMessage("Product Id is required.")
        .isInt()
        .withMessage("Product Id must be a number."),
      check("allStores", "All Stores must be a boolean value").isBoolean(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await merchantService.createOffer(req, res);
    }
  );

  //Getting all the offers of merchant
  app.get(
    `${constants.baseAPIPath}/merchant/offers`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getOffers(req, res, req.body);
    }
  );

  //Getting all the rewards of merchant
  app.get(
    `${constants.baseAPIPath}/merchant/rewards`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getRewards(req, res, req.body);
    }
  );

  //Get the information of specific offer for edit
  app.get(
    `${constants.baseAPIPath}/merchant/specific-offer/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getSpecificOfferDetail(req, res);
    }
  );

  //Get the information of specific reward for edit
  app.get(
    `${constants.baseAPIPath}/merchant/specific-reward/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getSpecificRewardDetail(req, res);
    }
  );

  //Edit the offer
  app.put(
    `${constants.baseAPIPath}/merchant/offer/:id`,
    [
      check("storeId")
        .isArray({ min: 1 })
        .withMessage("Store Id must be an array with at least one element"),
      check("expiryDate", "Expiry date of reward is required").notEmpty(),
      check("discountPercentage", "Discount percentage is required").notEmpty(),
      check("discountedPrice", "Discounted price is required").notEmpty(),
      check("claimInstruction")
        .notEmpty()
        .withMessage("Claim instruction is required.")
        .isLength({ min: 5, max: 1000 })
        .withMessage(
          "Claim instruction must be between 5 and 1000 characters long."
        ),
      check("productId")
        .notEmpty()
        .withMessage("Product Id is required.")
        .isInt()
        .withMessage("Product Id must be a number."),
      check("allStores", "All Stores must be a boolean value").isBoolean(),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await merchantService.editOffer(req, res, req.body);
    }
  );

  //Edit the reward
  app.put(
    `${constants.baseAPIPath}/merchant/reward/:id`,
    upload.single("photoUrl"),
    [
      check("name", "must be at least 2 chars and max 80 chars long")
        .trim()
        .isLength({ min: 2, max: 80 }),
      check("rewardPoints", "Reward points must be between 2 and 8 digits long")
        .trim()
        .isInt()
        .isLength({ min: 2, max: 8 }),
      check("expirationDate", "expiration date is required"),
      check("productId")
        .trim()
        .notEmpty()
        .withMessage("Product Id is required.")
        .isInt()
        .withMessage("Product Id must be an integer."),
      check(
        "claimInstruction",
        "must be atleast 5 chars min and max 1000 chars long"
      )
        .optional()
        .isLength({ min: 5, max: 1000 }),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await merchantService.editReward(req, res, req.body);
    }
  );

  //Change the status of reward
  app.patch(
    `${constants.baseAPIPath}/merchant/reward-status-change/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.activateReward(req, res);
    }
  );

  //Change the status of offer
  app.patch(
    `${constants.baseAPIPath}/merchant/offer-status-change/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.activateOffer(req, res);
    }
  );

  //Usage in frontend to check if merchant account integrated to render different options based on configuration
  app.get(
    `${constants.baseAPIPath}/merchant/check-integration-status`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.checkIntegration(req, res);
    }
  );

  //Merchant getting all the products from shopify store
  app.get(`${constants.baseAPIPath}/merchant/products`, async (req, res) => {
    await merchantService.getMerchantProducts(req, res);
  });

  //Dropdowns usage, being used in reward, offer,rule
  app.get(
    `${constants.baseAPIPath}/merchant/products/all`,
    async (req, res) => {
      await merchantService.getMerchantProduct(req, res);
    }
  );

  //Get the coupon code related information
  app.get(
    `${constants.baseAPIPath}/merchant/coupon-info/:couponCode`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getCouponCodeInfo(req, res);
    }
  );

  //Getting all transfers of all merchants.
  app.get(
    `${constants.baseAPIPath}/merchant/all-transactions`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await merchantService.getAllTransactions(req, res, false);
    }
  );
};
