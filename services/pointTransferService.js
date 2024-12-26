const dbConn = require("./databaseConnection");
const logger = require("../util/logger");
const sendPoints = require("../util/blockChain");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");

function PointTransferService() {
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

  // Admin manually transferring the points
  this.adminManualPoints = async function (req, res) {
    const { consumerId, points, transferType, description, status } = req.body;
    let transaction;
    transaction = await dbConn.instance.sequelize.transaction();
    try {
      const consumerExist = await dbConn.instance.User.findByPk(consumerId, {
        raw: true,
      });
      const adminExist = await dbConn.instance.User.findByPk(req.user.id, {
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: {
              role: 1,
            },
          },
        ],
      });
      if (!adminExist && adminExist?.toJSON()?.userRoles[0]?.role !== 1) {
        res.body.status_code = 404;
        res.body.response = "Sender invalid";
        return res.status(res.body.status_code).send(res.body);
      }
      if (!consumerExist) {
        res.body.status_code = 404;
        res.body.response = "Member don't exists";
        return res.status(res.body.status_code).send(res.body);
      }
      if (adminExist.toJSON().userRoles[0].role === 1 && consumerExist) {
        const transferHash = await sendPoints({
          points,
          consumerId,
          transferType,
          description,
        });
        if (transferHash) {
          const alreadyTransferred =
            await dbConn.instance.TotalConsumerBalance.findOne({
              where: {
                consumerId: consumerId,
              },
              transaction,
            });
          if (alreadyTransferred) {
            if (alreadyTransferred.totalBalance >= 0) {
              await alreadyTransferred.increment("totalBalance", {
                by: points,
              });
            }
          } else {
            await dbConn.instance.TotalConsumerBalance.create({
              consumerId: consumerId,
              totalBalance: points,
            });
          }
          await dbConn.instance.PointTransfer.create(
            {
              ...req.body,
              loyaltyNumber: points,
              adminId: req.user.id,
              transferHash,
              pointStatus: status,
              pointsExpiry: req.body?.pointsExpiry || null,
            },
            { transaction }
          );
          await transaction.commit();
          res.body = {
            status_code: 200,
            response: "Points Transferred Successfully",
          };
          logger.log("info", "TRANSFER_POINT", {
            payload: {
              request: null,
              user: req.user.email,
              response: res.body,
              ipAddress: req.ip,
            },
          });
          res.status(res.body.status_code).send(res.body);
        }
      }
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "TRANSFER_POINT", {
        payload: {
          request: null,
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      if (err?.message?.includes("insufficient funds for gas")) {
        return res
          .status(400)
          .send({ status_code: 400, message: "Insufficient funds for gas" });
      }
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  // Admin getting all the points transferred NOT USED
  this.adminGetAllPoints = async function (req, res) {
    const { page, pageSize, startDate, endDate, text } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let rows = await dbConn.instance.PointTransfer.findAll({
        limit: parseInt(pageSize),
        offset: offset,
        attributes: [
          "id",
          "transferType",
          "points",
          "description",
          "transferDate",
        ],
        include: [
          {
            model: dbConn.instance.User,
            as: "consumerInfo",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: dbConn.instance.User,
            as: "adminInfo",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: dbConn.instance.User,
            as: "merchantInfo",
            attributes: ["firstName", "lastName", "email"],
          },
        ],
      });

      const count = await dbConn.instance.PointTransfer.count({});

      const totalPages = Math.ceil(count / parseInt(pageSize));

      logger.log("info", "ADMIN_ALL_TRANSFER_POINTS", {
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
      res.body.totalCount = count;
      res.body.totalPages = totalPages;
      await transaction.commit();
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "ADMIN_ALL_TRANSFER_POINTS", {
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

  // Merchant manually transferring the points
  this.merchantManualPoints = async function (req, res) {
    const {
      consumerId,
      points,
      transferType,
      description,
      status,
      couponCode,
      pointsExpiry,
    } = req.body;
    let transaction;
    try {
      transaction = await dbConn.instance.sequelize.transaction();
      const consumerExist = await dbConn.instance.User.findByPk(consumerId, {
        raw: true,
      });
      const merchantExist = await dbConn.instance.User.findByPk(req.user.id, {
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: {
              role: 2,
            },
          },
        ],
      });
      if (!merchantExist && merchantExist.toJSON().userRoles[0].role !== 2) {
        res.body.status_code = 404;
        res.body.response = "Sender invalid";
        return res.status(res.body.status_code).send(res.body);
      }
      if (!consumerExist) {
        res.body.status_code = 404;
        res.body.response = "Member don't exists";
        return res.status(res.body.status_code).send(res.body);
      }
      if (merchantExist.toJSON().userRoles[0].role === 2 && consumerExist) {
        let merchantObj = await getMerchantObject(req.user.id);
        if (transferType === "EARNED") {
          const transferHash = await sendPoints({
            points,
            consumerId,
            transferType,
            description,
          });
          if (transferHash) {
            const alreadyTransferred =
              await dbConn.instance.TotalConsumerBalance.findOne({
                where: {
                  consumerId: consumerId,
                },
                transaction,
              });
            if (alreadyTransferred) {
              if (alreadyTransferred.totalBalance >= 0) {
                await alreadyTransferred.increment("totalBalance", {
                  by: points,
                  transaction,
                });
              }
            } else {
              await dbConn.instance.TotalConsumerBalance.create(
                {
                  consumerId: consumerId,
                  totalBalance: points,
                },
                { transaction }
              );
            }
            await dbConn.instance.PointTransfer.create(
              {
                ...req.body,
                transferType: transferType,
                merchantId: merchantObj.id,
                merchantUserId: req.user.id,
                transferHash: transferHash,
                pointStatus: status,
                pointsExpiry: pointsExpiry || null,
                loyaltyNumber: points,
              },
              { transaction }
            );
            await dbConn.instance.Coupon.update(
              { availed: true, availedAt: new Date() },
              {
                where: {
                  couponCode: couponCode,
                },
                transaction,
              }
            );
          } else {
            throw new Error("Blockchain error occurred");
          }
        } else if (transferType === "SPEND") {
          if (points) {
            const alreadyTransferred =
              await dbConn.instance.TotalConsumerBalance.findOne({
                where: {
                  consumerId: consumerId,
                },
                transaction,
              });
            if (alreadyTransferred) {
              if (alreadyTransferred.totalBalance >= points) {
                await alreadyTransferred.decrement("totalBalance", {
                  by: points,
                  transaction,
                });
              }
            } else {
              res.body.status_code = 400;
              res.body.response = "Insufficient total points to spend";
              return res.status(res.body.status_code).send(res.body);
            }
            if (!couponCode) {
              //SPEND and not having coupon code means that its MANUAL transfer type by the MERCHANT rather than COUPON CODE Points transfer
              await dbConn.instance.PointTransfer.create(
                {
                  ...req.body,
                  transferType: transferType,
                  merchantId: merchantObj.id,
                  merchantUserId: req.user.id,
                  pointStatus: status,
                  pointsExpiry: pointsExpiry || null,
                  loyaltyNumber: points,
                },
                { transaction }
              );
            }
          }
        }
        if (couponCode) {
          const couponCodeIs = await dbConn.instance.Coupon.findOne({
            where: {
              couponCode: couponCode,
            },
            include: [
              {
                model: dbConn.instance.Rewards,
                as: "rewardInfo", // Replace 'reward' with the actual alias used in the association if different
              },
              {
                model: dbConn.instance.Offers,
                as: "offerInfo", // Replace 'offer' with the actual alias used in the association if different
              },
              {
                model: dbConn.instance.EarningRules,
                as: "ruleInfo", // Replace 'earning_rule' with the actual alias used in the association if different
              },
            ],
            transaction,
          });
          if (couponCodeIs?.rewardInfo) {
            await dbConn.instance.Transaction.create(
              {
                transactionType: "Reward",
                merchantUserId: parseInt(req.user.id),
                merchantId: couponCodeIs?.rewardInfo?.merchantId,
                userId: couponCodeIs.userId,
                rewardId: couponCodeIs.rewardInfo.id,
                points: points,
              },
              { transaction }
            );
          }
          if (couponCodeIs?.offerInfo) {
            await dbConn.instance.Transaction.create(
              {
                transactionType: "Offer",
                merchantUserId: parseInt(req.user.id),
                merchantId: couponCodeIs?.offerInfo?.merchantId,
                userId: couponCodeIs.userId,
                offerId: couponCodeIs.offerInfo.id,
                discountedPrice: couponCodeIs?.offerInfo.discountedPrice,
              },
              { transaction }
            );
          }
          if (couponCodeIs?.ruleInfo?.purchaseType === "EVERY_PURCHASE") {
            await dbConn.instance.Coupon.update(
              { availed: true, availedAt: new Date(), ruleId: null },
              {
                where: {
                  couponCode: couponCode,
                },
                transaction,
              }
            );
          } else {
            await dbConn.instance.Coupon.update(
              { availed: true, availedAt: new Date() },
              {
                where: {
                  couponCode: couponCode,
                },
                transaction,
              }
            );
          }
        }
        await transaction.commit();
        res.body = {
          status_code: 200,
          response: "Points Transferred Successfully",
        };
        logger.log("info", "TRANSFER_POINT", {
          payload: {
            request: null,
            user: req.user.email,
            response: res.body,
            ipAddress: req.ip,
          },
        });
        res.status(res.body.status_code).send(res.body);
      }
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "TRANSFER_POINT", {
        payload: {
          request: null,
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      if (err?.message?.includes("insufficient funds for gas")) {
        return res
          .status(400)
          .send({ status_code: 400, message: "Insufficient funds for gas" });
      }
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Admin getting all transfers
  this.getAllTransfers = async function (req, res) {
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

      let query = {};
      let queryUser = {};
      if (text && text !== "null") {
        queryUser.firstName = {
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

      const count = await dbConn.instance.PointTransfer.count({
        where: query,
        transaction,
      });

      let rows = await dbConn.instance.PointTransfer.findAll({
        where: query,
        limit: parsedPageSize,
        offset: offset,
        transaction,
        attributes: [
          "id",
          "transferType",
          "points",
          "description",
          "transferDate",
        ],
        include: [
          {
            model: dbConn.instance.User,
            as: "consumerInfo",
            attributes: ["firstName", "lastName", "email"],
            where: queryUser,
          },
          {
            model: dbConn.instance.User,
            as: "adminInfo",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: dbConn.instance.User,
            as: "merchantInfo",
            attributes: ["firstName", "lastName", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const totalPages = Math.ceil(count / parsedPageSize);
      logger.log("info", "GET_ALL_TRANSFER_POINTS", {
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
      logger.log("error", "GET_ALL_TRANSFER_POINTS", {
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

  //Merchant getting all transfers
  this.getMerchantTransfers = async function (req, res) {
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
        merchantUserId: req.user.id,
      };
      let queryUser = {};
      if (text && text !== "null") {
        queryUser.firstName = {
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

      let rows = await dbConn.instance.PointTransfer.findAll({
        where: query,
        limit: parsedPageSize,
        offset: offset,
        transaction,
        attributes: [
          "id",
          "transferType",
          "points",
          "description",
          "transferDate",
          "pointStatus",
          "pointsExpiry",
        ],
        include: [
          {
            model: dbConn.instance.User,
            as: "consumerInfo",
            attributes: ["firstName", "lastName", "email"],
            where: queryUser,
          },
          {
            model: dbConn.instance.User,
            as: "adminInfo",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: dbConn.instance.User,
            as: "merchantInfo",
            attributes: ["firstName", "lastName", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      const count = await dbConn.instance.PointTransfer.count({
        where: query,
        transaction,
      });

      const totalPages = Math.ceil(count / parsedPageSize);

      logger.log("info", "GET_ALL_TRANSFER_POINTS", {
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
      logger.log("error", "GET_ALL_TRANSFER_POINTS", {
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

  //Status change of points
  this.activatePoints = async function (req, res) {
    const { id } = req.params;
    try {
      let transferExist = await dbConn.instance.PointTransfer.findByPk(id);
      if (!transferExist) {
        res.body.status_code = 401;
        res.body.response = "Transfer don't exists";
        return res.status(res.body.status_code).send(res.body);
      }
      transferExist.pointStatus = req.body.pointStatus;
      await transferExist.save();
      res.body.response = `Points status changed`;
      res.body.status_code = 200;
      logger.log("info", "POINT_TRANSFER_ACTIVATE", {
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
      logger.log("error", "POINT_TRANSFER_ACTIVATE", {
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

  //Admin getting consumer specific transfers
  this.getConsumerTransfers = async function (req, res) {
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
        consumerId: parseInt(req.user.id),
      };
      if (text && text !== "null") {
        query = {
          [Op.or]: [
            { "$merchantInfo.email$": { [Op.like]: `%${text}%` } },
            { "$adminInfo.email$": { [Op.like]: `%${text}%` } },
          ],
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
      let rows = await dbConn.instance.PointTransfer.findAll({
        where: query,
        limit: parsedPageSize,
        offset: offset,
        transaction,
        attributes: [
          "id",
          "transferType",
          "points",
          "description",
          "transferDate",
          "pointsExpiry",
        ],
        include: [
          {
            model: dbConn.instance.User,
            as: "consumerInfo",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: dbConn.instance.User,
            as: "adminInfo",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: dbConn.instance.User,
            as: "merchantInfo",
            attributes: ["firstName", "lastName", "email"],
          },
        ],
      });

      const count = await dbConn.instance.PointTransfer.count({
        where: query,
      });

      const totalPages = Math.ceil(count / parseInt(pageSize));

      logger.log("info", "GET_ALL_CONSUMER_POINTS", {
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
      logger.log("error", "GET_ALL_CONSUMER_POINTS", {
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

module.exports = new PointTransferService();
