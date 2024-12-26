const constants = require("../constants.js");
const { check, validationResult } = require("express-validator");
const pointTransferService = require("../services/pointTransferService.js");
const appUtils = require("../util/appUtil.js");

module.exports = (app) => {
  //Admin manually transferring points to any consumers of any merchant
  app.post(
    `${constants.baseAPIPath}/admin/manual-transfer-point`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    [
      check("transferType")
        .not()
        .isEmpty()
        .withMessage("Transfer type required SPEND/EARNED"),
      check("consumerId")
        .not()
        .isEmpty()
        .withMessage("Consumer Id is required."),
      check("status").not().isEmpty().withMessage("Status is required."),
      check("points", "Points must be between 2 and 8 digits long")
        .trim()
        .isInt()
        .isLength({ min: 2, max: 8 }),
      check("description")
        .notEmpty()
        .withMessage("Description of transfer is required.")
        .isLength({ min: 8, max: 1000 })
        .withMessage("Description must be between 8 and 1000 characters long."),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await pointTransferService.adminManualPoints(req, res);
    }
  );

  //Merchant manually transferring points to his invited consumers
  app.post(
    `${constants.baseAPIPath}/merchant/manual-transfer-point`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    [
      check("transferType")
        .not()
        .isEmpty()
        .withMessage("Transfer type required SPEND/EARNED"),
      check("consumerId")
        .not()
        .isEmpty()
        .withMessage("Consumer Id is required."),
      check("status").not().isEmpty().withMessage("Status is required."),
      check("points", "Points must be between 2 and 8 digits long")
        .trim()
        .isInt()
        .isLength({ min: 2, max: 8 }),
        check("description")
        .notEmpty()
        .withMessage("Description of transfer is required.")
        .isLength({ min: 8, max: 1000 })
        .withMessage("Description must be between 8 and 1000 characters long."),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await pointTransferService.merchantManualPoints(req, res);
    }
  );

  //Admin getting all transfers of all merchants.
  app.get(
    `${constants.baseAPIPath}/admin/all-transfer-points`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await pointTransferService.getAllTransfers(req, res, false);
    }
  );

  //Merchant getting all transfers record.
  app.get(
    `${constants.baseAPIPath}/merchant/all-transfer-points`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await pointTransferService.getMerchantTransfers(req, res);
    }
  );

  //Points getting all transfer record.
  app.get(
    `${constants.baseAPIPath}/consumer/transfers`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    async (req, res) => {
      await pointTransferService.getConsumerTransfers(req, res);
    }
  );

  //Merchant updating the status of transferred points.
  app.patch(
    `${constants.baseAPIPath}/merchant/point/:id/activate`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await pointTransferService.activatePoints(req, res);
    }
  );
};
