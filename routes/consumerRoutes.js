const constants = require("../constants.js");
const { check, validationResult } = require("express-validator");
const customerService = require("../services/customerService.js");
const appUtils = require("../util/appUtil.js");

module.exports = (app) => {
  //Invite consumer/user
  app.post(
    `${constants.baseAPIPath}/consumer/friend`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    [
      check("email", "must be a valid email, min 5 chars and max 60 chars long")
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await customerService.inviteUser(req, res);
    }
  );

  //Getting all the offers of merchant
  app.get(
    `${constants.baseAPIPath}/consumer/offers`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    async (req, res) => {
      await customerService.getAllOffers(req, res);
    }
  );

  //Getting all the rewards of merchant
  app.get(
    `${constants.baseAPIPath}/consumer/rewards`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    async (req, res) => {
      await customerService.getAllRewards(req, res);
    }
  );

  //Getting the total balance of point of client
  app.get(
    `${constants.baseAPIPath}/consumer/total-balance`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    async (req, res) => {
      await customerService.getTotalBalance(req, res);
    }
  );

  //Consumer availing the reward
  app.post(
    `${constants.baseAPIPath}/consumer/avail-reward/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    [check("couponCode", "Coupon code is required").notEmpty()],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await customerService.availReward(req, res);
    }
  );

  //Consumer availing the offer
  app.post(
    `${constants.baseAPIPath}/consumer/avail-offer/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    [check("couponCode", "Coupon code is required").notEmpty()],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await customerService.availOffer(req, res);
    }
  );

  //avail-rule [REWARD, OFFER]
  app.post(
    `${constants.baseAPIPath}/consumer/avail-rule/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    [check("couponCode", "Coupon code is required").notEmpty()],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await customerService.availRule(req, res);
    }
  );

  //Getting the referred friends
  app.get(
    `${constants.baseAPIPath}/consumer/referred-friends`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    async (req, res) => {
      await customerService.referredFriends(req, res);
    }
  );

  //Getting all transfers of all merchants.
  app.get(
    `${constants.baseAPIPath}/consumer/all-transactions`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_USER);
    },
    async (req, res) => {
      await customerService.getAllTransactions(req, res, false);
    }
  );
};
