const dbConn = require("./databaseConnection");
const cron = require("node-cron");
const { Op } = require("sequelize");

function CronService() {

  var expireRule = async function () {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(today.getDate() + 1);
      const allRules = await dbConn.instance.EarningRules.findAll({
        where: {
          endAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
          status: "ACTIVE",
        },
      });
      if (allRules && allRules?.length) {
        for (let ruleRec of allRules) {
          await ruleRec.update({
            status: "INACTIVE",
          });
        }
      }
    } catch (err) {
      throw new Error("Error executing point expiry job");
    }
  };

  var expirePoints = async function () {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(today.getDate() + 1);
      const expiredPoints = await dbConn.instance.PointTransfer.findAll({
        where: {
          pointsExpiry: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
          pointStatus: "ACTIVE",
        },
      });
      if (expiredPoints && expiredPoints?.length) {
        for (let transferRecord of expiredPoints) {
          await transferRecord.update({
            pointStatus: "INACTIVE",
          });
          const balanceExist =
            await dbConn.instance.TotalConsumerBalance.findOne({
              where: {
                consumerId: parseInt(transferRecord.consumerId),
              },
            });
          if (balanceExist) {
            await balanceExist.decrement("totalBalance", {
              by: transferRecord.points,
            });
          }
        }
      }
    } catch (err) {
      throw new Error("Error executing point expiry job");
    }
  };

  var expireRewards = async function () {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(today.getDate() + 1);
      const expiredRewards = await dbConn.instance.Rewards.findAll({
        where: {
          expirationDate: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
          status: "ACTIVE",
        },
      });
      if (expiredRewards && expiredRewards?.length) {
        for (let rewardRecord of expiredRewards) {
          await rewardRecord.update({
            status: "INACTIVE",
          });
        }
      }
    } catch (err) {
      throw new Error("Error executing point expiry job");
    }
  };

  var expireOffers = async function () {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(today.getDate() + 1);
      const expiredOffers = await dbConn.instance.Offers.findAll({
        where: {
          expiryDate: {
            [Op.gte]: today,
            [Op.lt]: tomorrow,
          },
          status: "ACTIVE",
        },
      });
      if (expiredOffers && expiredOffers?.length) {
        for (let offerRecord of expiredOffers) {
          await offerRecord.update({
            status: "INACTIVE",
          });
        }
      }
    } catch (err) {
      throw new Error("Error executing point expiry job");
    }
  };

  cron.schedule("00 00 * * *", expirePoints);
  cron.schedule("00 00 * * *", expireRule);
  cron.schedule("00 00 * * *", expireRewards);
  cron.schedule("00 00 * * *", expireOffers);
}

module.exports = new CronService();
