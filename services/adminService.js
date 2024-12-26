const dbConn = require("./databaseConnection");
const appUtils = require("../util/appUtil");
const logger = require("../util/logger");
const Sequelize = require("sequelize");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

function AdminService() {
  //Admin activating/deactivating the consumer
  this.activateConsumer = async function (req, res) {
    let consumerIdentifier = req.params.id;
    let transaction = await dbConn.instance.sequelize.transaction();
    let consumerObj;
    try {
      consumerObj = await dbConn.instance.User.findOne(
        {
          where: { id: consumerIdentifier },
        },
        { transaction }
      );
      if (consumerObj != null) {
        if (consumerObj.status == appUtils.STATUS.ACTIVE) {
          consumerObj.status = appUtils.STATUS.INACTIVE;
        } else {
          consumerObj.status = appUtils.STATUS.ACTIVE;
        }
        await consumerObj.save({ transaction });
        res.body.response = `Consumer status changed to ${consumerObj.status}`;
      } else {
        res.body.status_code = 403;
        res.body.response = "Unknown consumer";
      }
      await transaction.commit();
      logger.log("info", "ACTIVATE_CONSUMER", {
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
      await transaction.rollback();
      logger.log("error", "ACTIVATE_CONSUMER", {
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

  //Admin getting all members
  this.getConsumers = async function (req, res) {
    const { page, pageSize, startDate, endDate, text } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;

    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let parsedEndDate;
      let query = {};
      if (text && text !== "null") {
        query.email = {
          [Sequelize.Op.iLike]: `${text}%`,
        };
      }
      if (endDate && endDate !== "null") {
        parsedEndDate = new Date(endDate);
        parsedEndDate.setHours(23, 59, 59, 999);
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

      const count = await dbConn.instance.User.count({
        where: query,
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: { role: 3 },
            required: true,
          },
        ],
      });

      let rows = await dbConn.instance.User.findAll({
        offset: offset,
        limit: parsedPageSize,
        where: query,
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: { role: 3 },
            required: true,
          },
        ],
        attributes: [
          "id",
          "firstName",
          "lastName",
          "loyaltyNumber",
          "mobile",
          "email",
          "createdAt",
          "status",
        ],
      });

      const totalPages = Math.ceil(count / parsedPageSize);
      res.body.response = rows.map((user) => user.toJSON());
      res.body.status_code = 200;
      res.body.totalPages = totalPages;
      res.body.totalCount = count;
      await transaction.commit();
      logger.log("info", "GET_CONSUMER", {
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
      await transaction.rollback();
      logger.log("error", "GET_CONSUMER", {
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

  //Admin getting all members for manual transferring points API
  //(Infinite Scroll)
  this.getMembers = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let rows = await dbConn.instance.User.findAll({
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: { role: 3 },
            required: true,
          },
        ],
        attributes: ["id", "email"],
      });
      res.body.status_code = 200;
      res.body.response = rows.map((user) => user.toJSON());
      await transaction.commit();
      logger.log("info", "GET_CONSUMER", {
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
      await transaction.rollback();
      logger.log("error", "GET_CONSUMER", {
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

  //Admin getting all the company/brands/merchants
  this.getMerchants = async function (req, res) {
    const { startDate, endDate, text } = req.query;

    try {
      let parsedEndDate;
      if (endDate && endDate !== "null") {
        parsedEndDate = new Date(endDate);
        parsedEndDate.setHours(23, 59, 59, 999);
      }

      let query = {};
      if (text && text !== "null") {
        query.brandName = {
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
      if (
        req.query.isActive &&
        req.query.isActive != "null" &&
        req.query.isActive !== null
      ) {
        query.status = req.query.isActive;
      }

      let response = await dbConn.instance.Merchant.findAll({
        where: query,
        attributes: ["id", "brandName", "status", "currency", "logo"],
        order: [["brandName", "ASC"]],
        include: [
          {
            model: dbConn.instance.User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "mobile", "email"],
          },
        ],
      });
      res.body.status_code = 200;
      res.body.response = response;
      logger.log("info", "GET_MERCHANTS", {
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
      logger.log("error", "GET_MERCHANTS", {
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

  //Admin activating/deactivating the merchant
  this.activateMerchant = async function (req, res) {
    let merchantIdentifier = req.params.id;
    let transaction = await dbConn.instance.sequelize.transaction();
    let merchantObj;
    try {
      merchantObj = await dbConn.instance.Merchant.findOne(
        {
          where: { id: merchantIdentifier },
        },
        { transaction }
      );
      if (merchantObj != null) {
        if (merchantObj.status == appUtils.STATUS.ACTIVE) {
          merchantObj.status = appUtils.STATUS.INACTIVE;
        } else {
          merchantObj.status = appUtils.STATUS.ACTIVE;
        }
        await merchantObj.save({ transaction });
        res.body.response = `Merchant status changed to ${merchantObj.status}`;
      } else {
        res.body.status_code = 403;
        res.body.response = "Unknown company";
      }
      await transaction.commit();
      logger.log("info", "ACTIVATE_MERCHANT", {
        payload: {
          request: merchantIdentifier,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "ACTIVATE_MERCHANT", {
        payload: {
          request: merchantIdentifier,
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

  //Admin adding the company/brands/merchants
  this.addNewMerchantCustomer = async function (req, res) {
    const {
      brandName,
      apiEnabled,
      firstName,
      lastName,
      mobile,
      currency,
      email,
      password,
      sendEmail,
    } = req.body;
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      const existingUser = await dbConn.instance.User.findOne({
        where: { email: email },
      });
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({ error: "Email already exists" });
      }
      const existingMerchant = await dbConn.instance.Merchant.findOne({
        where: { brandName },
      });
      if (existingMerchant) {
        await transaction.rollback();
        return res.status(400).json({ error: "Brand name already exists" });
      }
      let hashedPassword = await bcrypt.hash(password, 10);
      let user = await dbConn.instance.User.create(
        {
          brandName,
          apiEnabled,
          firstName,
          lastName,
          mobile,
          currency,
          email,
          password: hashedPassword,
          status: "ACTIVE",
          role: 2,
        },
        { transaction }
      );
      await dbConn.instance.Merchant.create(
        {
          brandName,
          apiEnabled,
          currency,
          primaryUser: user.id,
          status: "ACTIVE",
        },
        { transaction }
      );
      if (sendEmail) {
        const frontendUrl =
          process.env.NODE_ENV === "dev"
            ? process.env.FRONTEND_DEV_URL
            : process.env.FRONTEND_LIVE_URL;
        const message = `
        <b>Hey from loyal locker! Admin has invited you to the Loyal locker platform, please log in with the below details as a Company:</b>
        <p><b> Email: </b> ${email}</p>
        <p><b> Password: </b>${password}</p>
        <p><a href="${frontendUrl}" style="text-decoration: none; background-color: #4CAF50; color: white; padding: 10px 15px; border-radius: 5px; display: inline-block;">Activate Account</a></p>
        <br/>
`;
        await appUtils.sendMail(user, `Invite to platform`, message);
      }
      await transaction.commit();
      res.body.status_code = 201;
      res.body.response = "Merchant invited with credentials";
      logger.log("info", "ADD_NEW_MERCHANT", {
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
      await transaction.rollback();
      logger.log("error", "ADD_NEW_MERCHANT", {
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

  //Admin editing the company/brands/merchants
  this.updateMerchantCustomer = async function (req, res) {
    const {
      brandName,
      apiEnabled,
      firstName,
      lastName,
      mobile,
      currency,
      email,
      password,
      sendEmail,
    } = req.body;
    const { id } = req.params;
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      const userExist = await dbConn.instance.User.findByPk(id);
      const merchantExist = await dbConn.instance.Merchant.findOne({
        where: { primaryUser: id },
      });
      if (!userExist || !merchantExist) {
        await transaction.rollback();
        return res.status(400).json({ error: "Merchant user don't exist" });
      }
      await dbConn.instance.Merchant.update(
        {
          brandName,
          apiEnabled,
          currency,
        },
        { where: { primaryUser: id } },
        { transaction }
      );
      let userUpdate = {
        firstName,
        lastName,
        mobile,
        email,
      };
      if (password) {
        userUpdate.password = await bcrypt.hash(password, 10);
      }
      await dbConn.instance.User.update(
        userUpdate,
        { where: { id } },
        { transaction }
      );
      let user = {};
      user.email = userUpdate?.email;
      if (sendEmail) {
        const frontendUrl =
          process.env.NODE_ENV === "dev"
            ? process.env.FRONTEND_DEV_URL
            : process.env.FRONTEND_LIVE_URL;
        let message = `
      <b>Hey from loyal locker! Admin has updated your profile, please log in with the below details as a Company:</b>
      <p><b> Email: </b> ${email}</p>`;
        if (password) {
          message += `<p><b> Password: </b>${password}</p>`;
        }
        message += `
      <p><a href="${frontendUrl}" style="text-decoration: none; background-color: #4CAF50; color: white; padding: 10px 15px; border-radius: 5px; display: inline-block;">Activate Account</a></p>
      <br/>`;
        await appUtils.sendMail(
          user,
          `Your profile have been updated`,
          message
        );
      }
      await transaction.commit();
      res.body.status_code = 201;
      res.body.response = "Merchant update successfully";
      logger.log("info", "UPDATE_MERCHANT", {
        payload: {
          request: null,
          user: req.user.email,
          response: res.body.status_code == 200,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "UPDATE_MERCHANT", {
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

  //Admin viewing the company detail
  this.getSpecificCompanyDetail = async function (req, res) {
    const { id } = req.params;
    try {
      let companyExist = await dbConn.instance.Merchant.findOne({
        where: { id: id },
        attributes: [
          "id",
          "brandName",
          "status",
          "currency",
          "logo",
          "apiEnabled",
        ],
        include: [
          {
            model: dbConn.instance.User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "mobile", "email"],
          },
        ],
      });

      res.body.status_code = 200;
      res.body.response = companyExist;
      logger.log("info", "GET_SPECIFIC_MERCHANTS", {
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
      logger.log("error", "GET_SPECIFIC_MERCHANTS", {
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

  //Admin getting all transactions
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

      let query = {};
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

      let count = await dbConn.instance.Transaction.count({
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
            model: dbConn.instance.User,
            as: "userInfo",
            attributes: {
              exclude: [
                "password",
                "fbSocialId",
                "googleSocialId",
                "registrationToken",
                "resetPasswordToken",
                "verifyEmailToken",
                "verifyMobileToken",
                "referralCode",
                "referredBy",
                "invitedBy",
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

module.exports = new AdminService();
