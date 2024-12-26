const constants = require("../constants.js");
const { check, validationResult } = require("express-validator");
const adminService = require("../services/adminService");
const appUtils = require("../util/appUtil");

module.exports = (app) => {
  //Admin getting all members
  app.get(
    `${constants.baseAPIPath}/admin/all-consumers`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await adminService.getConsumers(req, res);
    }
  );

  //Admin getting all members for manual transferring points API
  //(Infinite Scroll)
  app.get(
    `${constants.baseAPIPath}/admin/all-transfer-members`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await adminService.getMembers(req, res);
    }
  );

  //Admin activating/deactivating the consumer
  app.get(
    `${constants.baseAPIPath}/admin/consumer/:id/activate`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await adminService.activateConsumer(req, res);
    }
  );

  //Admin getting all the company/brands/merchants
  app.get(
    `${constants.baseAPIPath}/admin/merchants`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await adminService.getMerchants(req, res);
    }
  );

  //Admin activating/deactivating the merchant
  app.get(
    `${constants.baseAPIPath}/admin/merchants/:id/activate`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await adminService.activateMerchant(req, res);
    }
  );

  //Admin adding the company/brands/merchants
  app.post(
    `${constants.baseAPIPath}/admin/merchant`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    [
      check("brandName", "must be atleast 2 char").isLength({ min: 2 }),
      check(
        "firstName",
        "must be atleast 2 char and max 30 chars long"
      ).isLength({
        min: 2,
        max: 30,
      }),
      check("lastName", "must be atleast 2 char and max 30 chars long")
        .optional()
        .isLength({ min: 2, max: 30 }),
      check("apiEnabled", "API enabled must be a boolean").isBoolean(),
      check("mobile", "Mobile number is required").notEmpty(),
      check("currency", "Currency is required").notEmpty(),
      check("email", "must be a valid email with min 2 char and max 60 chars long")
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
      check(
        "password",
        "must be at least 8 chars and max 25 chars long"
      ).isLength({ min: 8, max: 25 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await adminService.addNewMerchantCustomer(req, res);
    }
  );

  //Admin editing the company/brands/merchants
  app.put(
    `${constants.baseAPIPath}/admin/merchant/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    [
      check("brandName", "must be atleast 2 char").isLength({ min: 2 }),
      check(
        "firstName",
        "must be atleast 2 char and max 30 chars long"
      ).isLength({
        min: 2,
        max: 30,
      }),
      check("lastName", "must be atleast 2 char and max 30 chars long")
        .optional()
        .isLength({ min: 2, max: 30 }),
      check("apiEnabled", "API enabled must be a boolean").isBoolean(),
      check("mobile", "Mobile number is required").notEmpty(),
      check("currency", "Currency is required").notEmpty(),
      check("email", "must be a valid email with min 2 chars and max 60 chars long")
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await adminService.updateMerchantCustomer(req, res);
    }
  );

  //Admin getting the specific company details
  app.get(
    `${constants.baseAPIPath}/admin/specific-company-detail/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await adminService.getSpecificCompanyDetail(req, res);
    }
  );

  //Admin getting all transfers of all merchants.
  app.get(
    `${constants.baseAPIPath}/admin/all-transactions`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await adminService.getAllTransactions(req, res, false);
    }
  );
};
