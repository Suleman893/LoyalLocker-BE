const dbConn = require("./databaseConnection.js");
const appUtils = require("../util/appUtil.js");
const logger = require("../util/logger.js");
const { Op } = require("sequelize");
const Sequelize = require("sequelize");

function CustomerService() {
  //Getting the total balance of point of client
  this.getTotalBalance = async function (req, res) {
    try {
      const totalBalance = await dbConn.instance.TotalConsumerBalance.findOne({
        where: { consumerId: req.user.id },
      });
      res.body.status_code = 200;
      res.body.response = totalBalance?.totalBalance || 0;
      logger.log("info", "GET_TOTAL_BALANCE", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).json(res.body);
    } catch (err) {
      logger.log("error", "GET_TOTAL_BALANCE", {
        payload: {
          request: null,
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  //Get the offers created of all merchants
  this.getAllOffers = async function (req, res) {
    const { page, pageSize } = req.query;
    // const parsedPage = page ? parseInt(page) : 1;
    // const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    // const offset = (parsedPage - 1) * parsedPageSize;
    try {
      const couponsAvailedByUser = await dbConn.instance.Coupon.findAll({
        where: {
          userId: parseInt(req.user.id),
          offerId: { [Op.ne]: null },
          issued: true,
          availed: true,
        },
        attributes: ["offerId"],
        raw: true,
      });

      const couponsAvailedByUserRule = await dbConn.instance.Coupon.findAll({
        where: {
          userId: parseInt(req.user.id),
          ruleId: { [Op.ne]: null },
          issued: true,
          availed: true,
        },
        attributes: ["ruleId"],
        raw: true,
      });

      const excludedOffersIds = couponsAvailedByUser.map((coupon) =>
        parseInt(coupon.offerId)
      );

      const excludedRuleIds = couponsAvailedByUserRule.map((coupon) =>
        parseInt(coupon.ruleId)
      );

      const allOffers = await dbConn.instance.Offers.findAll({
        // offset: offset,
        // limit: parsedPageSize,
        where: {
          status: "ACTIVE",
          id: { [Op.notIn]: excludedOffersIds },
        },
        order: [["createdAt", "ASC"]],
        include: [
          {
            model: dbConn.instance.MerchantStores,
            as: "storeInfo",
            through: "store_offers", // Moved here from include options
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productInfo",
          },
          {
            model: dbConn.instance.Merchant,
            as: "merchantInfo",
            attributes: {
              exclude: [
                "mailchimpApiKey",
                "mailchimpServerPrefix",
                "shopifyShopName",
                "shopifyApiKey",
                "shopifyPassword",
              ],
            },
          },
          {
            model: dbConn.instance.Coupon,
            as: "couponInfo",
            required: false, // Set to true if you only want offers with coupons
            where: {
              userId: req.user.id,
            },
          },
        ],
      });

      // const totalCount = await dbConn.instance.Offers.count({});
      // const totalPages = Math.ceil(totalCount / parsedPageSize);

      const allEarningRules = await dbConn.instance.EarningRules.findAll({
        // offset: offset,
        // limit: parsedPageSize,
        where: {
          pointsType: "OFFER",
          eventId: {
            [Op.ne]: 2,
          },
          status: {
            [Op.or]: ["ACTIVE", "ALWAYS_ACTIVE"],
          },
          id: { [Op.notIn]: excludedRuleIds },
        },
        order: [["createdAt", "ASC"]],
        include: [
          {
            model: dbConn.instance.MerchantStores,
            as: "storeInfo",
            through: "store_rules", // Moved here from include options
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productInfo",
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productsInfo",
            through: "product_rules",
          },
          {
            model: dbConn.instance.Merchant,
            as: "merchantInfo",
            attributes: {
              exclude: [
                "mailchimpApiKey",
                "mailchimpServerPrefix",
                "shopifyShopName",
                "shopifyApiKey",
                "shopifyPassword",
              ],
            },
          },
          {
            model: dbConn.instance.Coupon,
            as: "couponInfo",
            required: false, // Set to true if you only want offers with coupons
            where: {
              userId: req.user.id,
            },
          },
        ],
      });
      res.body.status_code = 200;
      res.body.response = { allEarningRules, allOffers };
      res.body.totalCount = 0;
      res.body.totalPages = 0;
      logger.log("info", "GET_All_OFFERS", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).send(res.body);
    } catch (err) {
      logger.log("error", "GET_All_OFFERS", {
        payload: {
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  //Get the rewards created by all merchants
  this.getAllRewards = async function (req, res) {
    const { page, pageSize } = req.query;
    // const parsedPage = page ? parseInt(page) : 1;
    // const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    // const offset = (parsedPage - 1) * parsedPageSize;

    try {
      const couponsAvailedByUser = await dbConn.instance.Coupon.findAll({
        where: {
          userId: parseInt(req.user.id),
          rewardId: { [Op.ne]: null },
          issued: true,
          availed: true,
        },
        attributes: ["rewardId"],
        raw: true,
      });

      const couponsAvailedByUserRule = await dbConn.instance.Coupon.findAll({
        where: {
          userId: parseInt(req.user.id),
          ruleId: { [Op.ne]: null },
          issued: true,
          availed: true,
        },
        attributes: ["ruleId"],
        raw: true,
      });

      const excludedRewardIds = couponsAvailedByUser.map((coupon) =>
        parseInt(coupon.rewardId)
      );

      const excludedRuleIds = couponsAvailedByUserRule.map((coupon) =>
        parseInt(coupon.ruleId)
      );

      const allRewards = await dbConn.instance.Rewards.findAll({
        // offset: offset,
        // limit: parsedPageSize,
        order: [["createdAt", "ASC"]],
        where: {
          status: "ACTIVE",
          id: { [Op.notIn]: excludedRewardIds },
        },
        include: [
          {
            model: dbConn.instance.MerchantProducts,
            as: "productInfo",
          },
          {
            model: dbConn.instance.Merchant,
            as: "merchantInfo",
            attributes: {
              exclude: [
                "mailchimpApiKey",
                "mailchimpServerPrefix",
                "shopifyShopName",
                "shopifyApiKey",
                "shopifyPassword",
              ],
            },
          },
          {
            model: dbConn.instance.Coupon,
            as: "couponInfo",
            required: false, // Set to true if you only want offers with coupons
            where: {
              userId: req.user.id,
            },
          },
        ],
      });
      // const totalCount = await dbConn.instance.Rewards.count({});
      // const totalPages = Math.ceil(count / parsedPageSize);
      const allEarningRules = await dbConn.instance.EarningRules.findAll({
        // offset: offset,
        // limit: parsedPageSize,
        where: {
          pointsType: "REWARD",
          eventId: {
            [Op.ne]: 2,
          },
          status: {
            [Op.or]: ["ACTIVE", "ALWAYS_ACTIVE"],
          },
          id: { [Op.notIn]: excludedRuleIds },
        },
        order: [["createdAt", "ASC"]],
        include: [
          {
            model: dbConn.instance.MerchantStores,
            as: "storeInfo",
            through: "store_offers", // Moved here from include options
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productsInfo",
            through: "product_rules",
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productInfo",
          },
          {
            model: dbConn.instance.Merchant,
            as: "merchantInfo",
            attributes: {
              exclude: [
                "mailchimpApiKey",
                "mailchimpServerPrefix",
                "shopifyShopName",
                "shopifyApiKey",
                "shopifyPassword",
              ],
            },
          },
          {
            model: dbConn.instance.Coupon,
            as: "couponInfo",
            required: false, // Set to true if you only want offers with coupons
            where: {
              userId: req.user.id,
            },
          },
        ],
      });
      res.body.status_code = 200;
      res.body.response = { allEarningRules, allRewards };
      res.body.totalCount = 0;
      res.body.totalPages = 0;
      logger.log("info", "GET_All_REWARDS", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).json(res.body);
    } catch (err) {
      logger.log("error", "GET_All_REWARDS", {
        payload: {
          request: null,
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  //Avail Offer
  this.availOffer = async function (req, res) {
    const { id } = req.params;
    const { couponCode } = req.body;
    try {
      let offerExist = await dbConn.instance.Offers.findByPk(id);

      if (!offerExist || offerExist.status === "INACTIVE") {
        res.body.status_code = 404;
        res.body.response = "Offer unavailable";
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.Coupon.create({
        couponCode,
        offerId: id,
        userId: req.user.id,
        merchantUserId: offerExist.merchantUserId,
        merchantId: offerExist.merchantId,
      });
      res.body.status_code = 200;
      res.body.response = "Offer issued";
      logger.log("info", "AVAIL_OFFER", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      logger.log("error", "AVAIL_OFFER", {
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

  //Avail Reward
  this.availReward = async function (req, res) {
    const { id } = req.params;
    const { couponCode } = req.body;
    try {
      let rewardExist = await dbConn.instance.Rewards.findOne({
        where: {
          id,
        },
      });
      if (!rewardExist || rewardExist.status === "INACTIVE") {
        res.body.status_code = 404;
        res.body.response = "Reward unavailable";
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.Coupon.create({
        couponCode,
        rewardId: id,
        userId: req.user.id,
        merchantUserId: rewardExist.merchantUserId,
        merchantId: rewardExist.merchantId,
      });
      res.body.status_code = 200;
      res.body.response = "Reward issued";
      logger.log("info", "AVAIL_REWARD", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      logger.log("error", "AVAIL_REWARD", {
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

  //Avail Rule
  this.availRule = async function (req, res) {
    const { id } = req.params;
    const { couponCode } = req.body;
    try {
      let ruleExist = await dbConn.instance.EarningRules.findByPk(id);

      if (!ruleExist || ruleExist.status === "INACTIVE") {
        res.body.status_code = 404;
        res.body.response = "Rule unavailable";
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.Coupon.create({
        couponCode,
        ruleId: id,
        userId: req.user.id,
        merchantUserId: ruleExist.merchantUserId,
        merchantId: ruleExist.merchantId,
      });
      res.body.status_code = 200;
      res.body.response = "Rule availed";
      logger.log("info", "AVAIL_RULE", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      logger.log("error", "AVAIL_RULE", {
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

  //Consumer Invite User
  this.inviteUser = async function (req, res) {
    try {
      const userExist = await dbConn.instance.User.findOne({
        where: { email: req.body.email },
      });
      const referExist = await dbConn.instance.ReferFriend.findOne({
        where: { email: req.body.email },
      });
      if (userExist) {
        res.body.status_code = 400;
        res.body.response = "Email already registered with platform";
        return res.status(400).json(res.body);
      }
      if (referExist) {
        res.body.status_code = 400;
        res.body.response = "Email already invited ";
        return res.status(400).json(res.body);
      }
      await dbConn.instance.ReferFriend.create({
        email: req.body.email,
        referredBy: req.user.id,
      });
      const frontendUrl =
        process.env.NODE_ENV === "dev"
          ? process.env.FRONTEND_DEV_URL
          : process.env.FRONTEND_LIVE_URL;
      const message = `
<b>Hey from loyal locker! Please click the following link to register and earn points</b>
<p><a href="${frontendUrl}/signup/${req.user.referralCode}" style="text-decoration: none; background-color: #4CAF50; color: white; padding: 10px 15px; border-radius: 5px; display: inline-block;">Register with Loyal Locker</a></p>
<br/>
`;
      const user = req.body;
      await appUtils.sendMail(
        user,
        `You are invited by ${req.user.firstName + "   " + req.user.lastName}`,
        message
      );
      res.body.status_code = 200;
      res.body.response = "User invited";
      logger.log("info", "INVITE_USER", {
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
      logger.log("error", "INVITE_USER", {
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

  //Get All Referred Friends
  this.referredFriends = async function (req, res) {
    try {
      const rows = await dbConn.instance.ReferFriend.findAll({
        where: {
          referredBy: req.user.id,
        },
      });
      const count = await dbConn.instance.ReferFriend.count({
        where: {
          referredBy: req.user.id,
        },
      });

      // const totalPages = Math.ceil(count / parsedPageSize);
      res.body.status_code = 200;
      res.body.response = rows;
      // res.body.totalPages = totalPages;
      res.body.totalCount = count;
      logger.log("info", "GET_REFER_FRIEND", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      logger.log("error", "GET_REFER_FRIEND", {
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

  //Get Consumer Transactions
  this.getAllTransactions = async function (req, res) {
    const { page, pageSize, startDate, endDate, text } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let parsedEndDate;
      if (endDate && endDate !== "null") {
        parsedEndDate = new Date(endDate);
        parsedEndDate.setHours(23, 59, 59, 999);
      }
      let query = {
        userId: req.user.id,
      };
      if (text && text !== "null") {
        query.transactionType = {
          [Sequelize.Op.iLike]: `${text}%`,
        };
      }
      if (startDate && endDate && startDate !== "null" && endDate !== "null") {
        query.createdAt = {
          [Op.between]: [startDate, parsedEndDate],
        };
      } else if (startDate && startDate !== "null") {
        query.createdAt = {
          [Op.gte]: startDate,
        };
      } else if (endDate && endDate !== "null") {
        query.createdAt = {
          [Op.lte]: parsedEndDate,
        };
      }

      const count = await dbConn.instance.Transaction.count({
        where: query,
      });

      let rows = await dbConn.instance.Transaction.findAll({
        where: query,
        limit: parsedPageSize,
        offset: offset,
        transaction,
        include: [
          {
            model: dbConn.instance.Merchant,
            as: "merchantInfo",
            attributes: {
              exclude: [
                "mailchimpApiKey",
                "mailchimpServerPrefix",
                "shopifyShopName",
                "shopifyApiKey",
                "shopifyPassword",
              ],
            },
          },
          {
            model: dbConn.instance.Rewards,
            as: "rewardInfo",
            include: [
              {
                model: dbConn.instance.MerchantProducts,
                as: "productInfo",
              },
            ],
          },
          {
            model: dbConn.instance.Offers,
            as: "offerInfo",
            include: [
              {
                model: dbConn.instance.MerchantProducts,
                as: "productInfo",
              },
              {
                model: dbConn.instance.MerchantStores,
                as: "storeInfo",
                through: { attributes: [] },
              },
            ],
          },
        ],
      });

      const totalPages = Math.ceil(count / parsedPageSize);
      logger.log("info", "GET_ALL_TRANSACTIONS", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.body.status_code = 200;
      res.body.response = rows;
      res.body.totalPages = totalPages;
      res.body.totalCount = count;
      await transaction.commit();
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "GET_ALL_TRANSACTIONS", {
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
}

module.exports = new CustomerService();
