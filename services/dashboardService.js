const dbConn = require("./databaseConnection.js");
const logger = require("../util/logger.js");
const sequelize = require("sequelize");
const appUtils = require("../util/appUtil.js");

function CustomerService() {
  var getMerchantObject = async function (userId) {
    return await dbConn.instance.Merchant.findOne({
      attributes: ["id", "brandName", "apiEnabled"],
      include: [
        {
          model: dbConn.instance.MerchantUsers,
          as: "merchantUsers",
          where: { userId: userId },
        },
      ],
    });
  };

  //Admin getting all the company/brands/merchants for Drop down in dashboard
  this.getMerchantsForDropDown = async function (req, res) {
    try {
      let response = await dbConn.instance.Merchant.findAll({
        attributes: ["id", "brandName", "primaryUser"],
        order: [["brandName", "ASC"]],
      });
      res.body.status_code = 200;
      res.body.response = response;
      logger.log("info", "GET_MERCHANTS_FOR_DROPDOWN", {
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
      logger.log("error", "GET_MERCHANTS_FOR_DROPDOWN", {
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

  //Admin dashboard API
  this.getAdminDashboard = async function (req, res) {
    const { id } = req.params;
    let merchantPrimaryId = id;
    if (id && id === "undefined") {
      merchantPrimaryId = undefined;
    }
    try {
      let totalMembers = 0;
      if (merchantPrimaryId) {
        //Total member, which get coupon from that merchant + invited by that merchant
        totalMembers = await dbConn.instance.Coupon.count({
          distinct: true,
          col: "userId",
          where: {
            issued: true,
            merchantUserId: merchantPrimaryId,
          },
        });
      } else {
        totalMembers = await dbConn.instance.User.count({
          include: [
            {
              model: dbConn.instance.UserRoles,
              as: "userRoles",
              where: { role: appUtils.ROLES.ROLE_USER },
              required: true,
            },
          ],
        });
      }

      const totalCreditedPoints = await dbConn.instance.PointTransfer.sum(
        "points",
        {
          where: {
            transferType: "EARNED",
            ...(merchantPrimaryId ? { merchantUserId: merchantPrimaryId } : {}),
          },
        }
      );

      const totalSpendPoints = await dbConn.instance.PointTransfer.sum(
        "points",
        {
          where: {
            transferType: "SPEND",
            ...(merchantPrimaryId ? { merchantUserId: merchantPrimaryId } : {}),
          },
        }
      );

      let totalMerchants = 0;

      if (merchantPrimaryId) {
        const merchantIs = await dbConn.instance.Merchant.findOne({
          primaryUser: merchantPrimaryId,
        });
        //totalStoresOfMerchant if merchant id in req.params
        totalMerchants = await dbConn.instance.MerchantStores.count({
          where: {
            merchantId: merchantIs.id,
          },
        });
      } else {
        totalMerchants = await dbConn.instance.Merchant.count({});
      }

      let totalInvitedUsers = 0;
      if (merchantPrimaryId) {
        totalInvitedUsers = await dbConn.instance.User.count({
          where: {
            invitedBy: merchantPrimaryId,
          },
        });
      } else {
        totalInvitedUsers = await dbConn.instance.User.count({
          where: {
            invitedBy: {
              [sequelize.Sequelize.Op.ne]: null,
            },
          },
        });
      }

      const merchantCampaignRecord =
        await dbConn.instance.MerchantCampaignRecords.findOne({
          where: {
            ...(merchantPrimaryId ? { merchantUserId: merchantPrimaryId } : {}),
          },
        });

      const totalEventsByPlatform = await dbConn.instance.Events.count();

      const eventIds = [1, 2, 3, 4, 5, 6];
      const counts = await dbConn.instance.EarningRules.findAll({
        attributes: [
          "eventId",
          [sequelize.fn("COUNT", sequelize.col("event_id")), "count"],
        ],
        where: {
          eventId: eventIds,
          ...(merchantPrimaryId ? { merchantUserId: merchantPrimaryId } : {}),
        },
        group: ["event_id"],
      });

      const result = eventIds.reduce((acc, id) => {
        acc[id] = { eventId: id, count: 0 };
        return acc;
      }, {});

      counts.forEach((record) => {
        result[record.eventId].count = parseInt(
          record.getDataValue("count"),
          10
        );
      });

      const rulesOfEvents = Object.values(result);

      res.body.status_code = 200;
      res.body.response = {
        totalMembers: merchantPrimaryId
          ? totalMembers + totalInvitedUsers
          : totalMembers,
        totalCreditedPoints,
        totalSpendPoints,
        totalMerchants,
        totalInvitedUsers,
        rulesOfEvents,
        totalEventsByPlatform,
        merchantCampaignRecord,
      };
      logger.log("info", "GET_ADMIN_DASHBOARD", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).send(res.body);
    } catch (err) {
      logger.log("error", "GET_ADMIN_DASHBOARD", {
        payload: {
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  //Merchant dashboard
  this.getMerchantDashboard = async function (req, res) {
    const merchantObj = await getMerchantObject(req.user.id);
    try {
      //Total member, which get coupon from that merchant + invited by that merchant
      const totalMembers = await dbConn.instance.Coupon.count({
        distinct: true,
        col: "userId",
        where: {
          issued: true,
          merchantUserId: req.user.id,
        },
      });

      const totalCreditedPoints = await dbConn.instance.PointTransfer.sum(
        "points",
        {
          where: {
            transferType: "EARNED",
            merchantUserId: req.user.id,
          },
        }
      );

      const totalStores = await dbConn.instance.MerchantStores.count({
        where: {
          merchantId: merchantObj?.id,
        },
      });

      const totalTopPerformingStores =
        await dbConn.instance.MerchantStores.count({
          where: {
            merchantId: merchantObj.id,
            mostReferred: {
              [sequelize.Op.gte]: 10, // Finding stores where mostReferred >= 10
            },
          },
        });

      //No of referrals
      const totalInvitedUsers = await dbConn.instance.User.count({
        where: {
          invitedBy: req.user.id,
        },
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: { role: appUtils.ROLES.ROLE_USER },
            required: true,
          },
        ],
      });

      //Campaigns related card record
      const merchantCampaignRecord =
        await dbConn.instance.MerchantCampaignRecords.findOne({
          where: {
            merchantUserId: req.user.id,
          },
        });

      const totalEventsByPlatform = await dbConn.instance.Events.count();

      //Rule related record for graph
      const eventIds = [1, 2, 3, 4, 5, 6];
      const counts = await dbConn.instance.EarningRules.findAll({
        attributes: [
          "eventId",
          [sequelize.fn("COUNT", sequelize.col("event_id")), "count"],
        ],
        where: {
          eventId: eventIds,
          merchantUserId: req.user.id,
        },
        group: ["event_id"],
      });

      const result = eventIds.reduce((acc, id) => {
        acc[id] = { eventId: id, count: 0 };
        return acc;
      }, {});

      counts.forEach((record) => {
        result[record.eventId].count = parseInt(
          record.getDataValue("count"),
          10
        );
      });

      const rulesOfEvents = Object.values(result);

      res.body.status_code = 200;
      res.body.response = {
        totalMembers: totalInvitedUsers + totalMembers,
        totalCreditedPoints,
        totalStores,
        totalTopPerformingStores,
        totalInvitedUsers, //No of referrals and invited by field in user table
        totalEventsByPlatform,
        merchantCampaignRecord,
        rulesOfEvents,
      };
      logger.log("info", "MERCHANT_GET_DASHBOARD", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).send(res.body);
    } catch (err) {
      logger.log("error", "MERCHANT_GET_DASHBOARD", {
        payload: {
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  //Consumer dashboard API
  this.getConsumerDashboard = async function (req, res) {
    try {
      //Total points of logged in user
      let totalPoints = 0;
      consumerTotalBalance = await dbConn.instance.TotalConsumerBalance.findOne(
        {
          where: { consumerId: req.user.id },
        }
      );
      if (consumerTotalBalance && consumerTotalBalance?.totalBalance) {
        totalPoints = consumerTotalBalance?.totalBalance;
      }

      // Total points spend by merchant is POINT TRANSFER where SPEND because platform (admin/merchant) gave points though MANUAL POINT TRANSFER Points spend = Manual points + In Transaction
      const totalPointsByPlatform = await dbConn.instance.PointTransfer.sum(
        "points",
        {
          where: {
            consumerId: req.user.id,
            transferType: "SPEND",
          },
        }
      );

      //Total points spend (REWARD/OFFER)
      const totalSpendPoints = await dbConn.instance.Transaction.sum("points", {
        where: {
          userId: req.user.id,
        },
      });

      //Total points which are expired (Means status is INACTIVE)
      const totalInActivePoints = await dbConn.instance.PointTransfer.sum(
        "points",
        {
          where: {
            consumerId: req.user.id,
            pointStatus: "INACTIVE",
          },
        }
      );
      //Points related to all MERCHANTS/BRANDS
      const allBrandsPoints = await dbConn.instance.PointTransfer.findAll({
        where: {
          consumerId: parseInt(req.user.id),
          transferType: "EARNED",
        },
        attributes: [
          "merchantId",
          [sequelize.fn("SUM", sequelize.col("points")), "totalPoints"],
        ],
        group: ["merchantId", "merchantBrandInfo.id"],
        include: [
          {
            model: dbConn.instance.Merchant,
            attributes: ["brandName"],
            as: "merchantBrandInfo",
          },
        ],
      });

      res.body.status_code = 200;
      res.body.response = {
        totalPoints,
        totalSpendPoints: totalPointsByPlatform + totalSpendPoints,
        totalInActivePoints,
        allBrandsPoints,
      };
      logger.log("info", "GET_CONSUMER_BRANDS_DASHBOARD", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).send(res.body);
    } catch (err) {
      logger.log("error", "GET_CONSUMER_BRANDS_DASHBOARD", {
        payload: {
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

module.exports = new CustomerService();
