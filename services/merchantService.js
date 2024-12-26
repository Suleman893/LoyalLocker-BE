const Sequelize = require("sequelize");
const dbConn = require("./databaseConnection");
const appUtils = require("../util/appUtil");
const logger = require("../util/logger");
const { Op } = require("sequelize");
const { bucketUploader, deleteFromBucket } = require("../util/fileUpload");

function MerchantService() {
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

  this.about = async function (req, res) {
    let merchantObj;
    try {
      merchantObj = await dbConn.instance.Merchant.findOne({
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
            attributes: [],
            model: dbConn.instance.MerchantUsers,
            as: "merchantUsers",
            where: { userId: req.user.id },
          },
        ],
      });

      res.body.response = merchantObj;
      logger.log("info", "ABOUT", {
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
      logger.log("error", "ABOUT", {
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

  // Merchant getting all its consumers
  this.getConsumers = async function (req, res) {
    const { page, pageSize, startDate, endDate, text } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;

    try {
      let query = { invitedBy: req.user.id };
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
      let rows = await dbConn.instance.User.findAll({
        offset: offset,
        limit: parsedPageSize,
        where: query,
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: { role: appUtils.ROLES.ROLE_USER },
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
        order: [["createdAt", "ASC"]],
      });

      //Role 3 represents the Consumer/Member/Client
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

      const totalPages = Math.ceil(count / parsedPageSize);
      res.body.response = rows.map((user) => user.toJSON());
      res.body.status_code = 200;
      res.body.totalPages = totalPages;
      res.body.totalCount = count;
      logger.log("info", "MERCHANT_CONSUMERS", {
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
      logger.log("error", "MERCHANT_CONSUMERS", {
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

  // Check merchant integrations of 3rd party services.
  this.checkIntegration = async function (req, res) {
    try {
      const merchantUser = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      if (!merchantUser) {
        logger.log("info", "CHECK_ACCOUNT_INTEGRATION", {
          payload: {
            request: null,
            user: req.user.email,
            response: "Merchant user not found",
            ipAddress: req.ip,
          },
        });
        return res
          .status(404)
          .send({ status_code: 404, message: "Merchant user not found" });
      }

      // Retrieve the merchant integrations
      const merchantIntegrations = await dbConn.instance.Merchant.findOne({
        where: {
          primaryUser: req.user.id,
        },
      });

      if (!merchantIntegrations) {
        logger.log("info", "CHECK_ACCOUNT_INTEGRATION", {
          payload: {
            request: null,
            user: req.user.email,
            response: "Merchant not found",
            ipAddress: req.ip,
          },
        });
        return res
          .status(404)
          .send({ status_code: 404, message: "Merchant not found" });
      }

      let integrationStatus = {
        shopify: false,
        mailchimp: false,
      };

      if (
        merchantIntegrations?.shopifyShopName &&
        merchantIntegrations?.shopifyApiKey &&
        merchantIntegrations?.shopifyPassword
      ) {
        integrationStatus.shopify = true;
        integrationStatus.shopifyShopName =
          merchantIntegrations?.shopifyShopName;
        integrationStatus.shopifyApiKey = merchantIntegrations?.shopifyApiKey;
        integrationStatus.shopifyPassword =
          merchantIntegrations?.shopifyPassword;
      }
      if (
        merchantIntegrations?.mailchimpApiKey &&
        merchantIntegrations?.mailchimpServerPrefix
      ) {
        integrationStatus.mailchimp = true;
        integrationStatus.mailchimpApiKey =
          merchantIntegrations?.mailchimpApiKey;
        integrationStatus.mailchimpServerPrefix =
          merchantIntegrations?.mailchimpServerPrefix;
      }
      logger.log("info", "CHECK_ACCOUNT_INTEGRATION", {
        payload: {
          request: null,
          user: req.user.email,
          response: null,
          ipAddress: req.ip,
        },
      });
      return res
        .status(200)
        .send({ status_code: 200, response: integrationStatus });
    } catch (err) {
      logger.log("error", "CHECK_INTEGRATE_ACCOUNT", {
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

  // Merchant inviting the member
  this.inviteUser = async function (req, res) {
    const { storeId } = req.body;
    try {
      const userExist = await dbConn.instance.User.findOne({
        where: { email: req.body.email },
      });
      if (userExist) {
        res.body.status_code = 400;
        res.body.response = "Already registered with platform";
        return res.status(400).send(res.body);
      }
      await dbConn.instance.MerchantStores.increment("mostReferred", {
        by: 1,
        where: { id: storeId },
      });
      const frontendUrl =
        process.env.NODE_ENV === "dev"
          ? process.env.FRONTEND_DEV_URL
          : process.env.FRONTEND_LIVE_URL;
      const message = `
<b>Hey from loyal locker! Please click the following link to register and you will be rewarded with loyalty points based on the rule </b>
<p><a href="${frontendUrl}/signup/${req.user.referralCode}" style="text-decoration: none; background-color: #4CAF50; color: white; padding: 10px 15px; border-radius: 5px; display: inline-block;">Register with Loyal Locker</a></p>
<br/>
`;
      const user = req.body;
      await appUtils.sendMail(
        user,
        `You are invited by ${
          req.user?.firstName + "   " + req?.user?.lastName
        }`,
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

  //------------------------------------------------------------------------------------------------------API-KEYS------------------------------------------------------------------------------------------------------
  // API keys for POS [Not in use for now]
  this.addApiKey = async function (req, res) {
    let ipAddress = req.body.ipAddress;
    let transaction = await dbConn.instance.sequelize.transaction();
    let merchantObj;

    try {
      merchantObj = await getMerchantObject(req.user.id);

      if (merchantObj != null && merchantObj.apiEnabled) {
        let user = {};
        user.ipAddress = ipAddress;
        user.apiKey = appUtils.generateApiKey(
          32,
          "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
        );

        let count = await dbConn.instance.User.update(
          user,
          { where: { id: req.user.id, apiKey: { [Sequelize.Op.eq]: null } } },
          { transaction }
        );
        if (count == 1) {
          res.body.response = true;
        } else {
          res.body.status_code = 403;
          res.body.response = "Api key is already generated";
        }
      } else {
        res.body.status_code = 401;
        res.body.response = "Unauthorized";
      }

      await transaction.commit();
      logger.log("info", "ADD_API_KEY", {
        payload: {
          request: req.body,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "ADD_API_KEY", {
        payload: {
          request: req.body,
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

  // API keys for POS [Not in use for now]
  this.getApiKeys = async function (req, res) {
    let merchantObj = await getMerchantObject(req.user.id);
    try {
      let userObj = await dbConn.instance.User.findAll({
        attributes: ["id", "email", "firstName", "apiKey"],
        where: {
          apiKey: {
            [Sequelize.Op.ne]: null,
          },
        },
        include: [
          {
            attributes: [],
            model: dbConn.instance.MerchantUsers,
            as: "merchantUsers",
            where: { merchantId: merchantObj.id },
          },
        ],
      });

      userObj.forEach(function (item, index) {
        if (item.id != req.user.id) {
          item.apiKey = "********************************";
        }
      });

      res.body.response = userObj;
      logger.log("info", "GET_API_KEY", {
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
      logger.log("error", "GET_API_KEY", {
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

  // API keys for POS [Not in use for now]
  this.deleteApiKey = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();

    try {
      let user = {};
      user.ipAddress = null;
      user.apiKey = null;

      let count = await dbConn.instance.User.update(
        user,
        { where: { id: req.user.id } },
        { transaction }
      );
      if (count == 1) {
        res.body.response = true;
      } else {
        res.body.status_code = 401;
        res.body.response = "Unauthorized";
      }

      await transaction.commit();
      logger.log("info", "DELETE_API_KEY", {
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
      logger.log("info", "DELETE_API_KEY", {
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

  //------------------------------------------------------------------------------------------------------Transaction------------------------------------------------------------------------------------------------------
  // Merchant getting member by email or mobile
  this.getCustomerByEmailOrMobile = async function (req, res, emailOrMobile) {
    let customers;
    try {
      customers = await dbConn.instance.User.findAll({
        attributes: ["email", "mobile", "loyaltyNumber"],
        group: ["email", "mobile", "loyaltyNumber"],
        where: {
          [Sequelize.Op.or]: [
            {
              email: {
                [Sequelize.Op.iLike]: "%" + emailOrMobile + "%",
              },
            },
            {
              mobile: {
                [Sequelize.Op.iLike]: "%" + emailOrMobile + "%",
              },
            },
          ],
        },
      });

      res.body.response = customers;
      logger.log("info", "SEARCH_USER_EMAIL_OR_MOBILE", {
        payload: {
          request: emailOrMobile,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "SEARCH_USER_EMAIL_OR_MOBILE", {
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

  //------------------------------------------------------------------------------------------------------Stores------------------------------------------------------------------------------------------------------
  // Merchant adding store
  this.addStore = async function (req, res) {
    let store = req.body;
    let transaction = await dbConn.instance.sequelize.transaction();

    try {
      let merchantObj = await getMerchantObject(req.user.id);

      if (
        merchantObj.merchantUsers[0].storeId != null &&
        merchantObj.merchantUsers[0].storeId.length > 0
      ) {
        res.body.status_code = 403;
        res.body.response = "Permission denied";
      } else {
        store.merchantId = merchantObj.id;
        store = await dbConn.instance.MerchantStores.create(store, {
          transaction,
        });
        res.body.response = store;
      }

      await transaction.commit();
      logger.log("info", "ADD_STORE", {
        payload: {
          request: store,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "ADD_STORE", {
        payload: {
          request: store,
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

  // Merchant editing store
  this.updateStore = async function (req, res) {
    let store = req.body;
    let transaction = await dbConn.instance.sequelize.transaction();

    try {
      let merchantObj = await getMerchantObject(req.user.id);

      let storeObj = await dbConn.instance.MerchantStores.findOne(
        {
          where: { merchantId: merchantObj.id, identifier: store.identifier },
        },
        { transaction }
      );

      if (storeObj != null) {
        if (
          merchantObj.merchantUsers[0].storeId != null &&
          merchantObj.merchantUsers[0].storeId.length > 0 &&
          !merchantObj.merchantUsers[0].storeId.includes(storeObj.id)
        ) {
          res.body.status_code = 403;
          res.body.response = "Permission denied";
        } else {
          storeObj.name = store.name;
          storeObj.status = store.status;
          storeObj.description = store.description;
          storeObj.identifier = store.identifier;
          storeObj.locationStreet = store.locationStreet;
          storeObj.locationAddress1 = store.locationAddress1;
          storeObj.locationAddress2 = store.locationAddress2;
          storeObj.locationPostal = store.locationPostal;
          storeObj.locationCountry = store.locationCountry;
          storeObj.locationProvince = store.locationProvince;
          storeObj.locationCity = store.locationCity;
          storeObj.locationGeoPoint = store.locationGeoPoint;

          await storeObj.save({ transaction });
          res.body.response = storeObj;
        }
      } else {
        res.body.status_code = 403;
        res.body.response = "Unknown store";
      }

      await transaction.commit();
      logger.log("info", "UPDATE_STORE", {
        payload: {
          request: store,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "UPDATE_STORE", {
        payload: {
          request: store,
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

  // Merchant adding store
  this.addStore = async function (req, res) {
    let store = req.body;
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      const alreadyExist = await dbConn.instance.MerchantStores.findOne({
        where: {
          name: req.body.name,
        },
      });
      if (alreadyExist) {
        res.body.status_code = 409;
        res.body.response = "Store with this name exists";
        return res.status(res.body.status_code).send(res.body);
      }
      let merchantObj = await getMerchantObject(req.user.id);
      if (
        merchantObj.merchantUsers[0].storeId != null &&
        merchantObj.merchantUsers[0].storeId.length > 0
      ) {
        res.body.status_code = 403;
        res.body.response = "Permission denied";
      } else {
        store.merchantId = merchantObj.id;
        store = await dbConn.instance.MerchantStores.create(store, {
          transaction,
        });
        res.body.response = store;
      }
      await transaction.commit();
      logger.log("info", "ADD_STORE", {
        payload: {
          request: store,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "ADD_STORE", {
        payload: {
          request: store,
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

  // Merchant getting all stores
  this.merchantStores = async function (req, res) {
    let merchantObj = await getMerchantObject(req.user.id);
    try {
      let query = { merchantId: merchantObj?.id };
      if (
        req.query.active &&
        req.query.active !== "null" &&
        req.query.active !== "ALL"
      ) {
        query.status = req.query.active;
      }
      let response = await dbConn.instance.MerchantStores.findAll({
        where: query,
        order: [["createdAt", "ASC"]],
      });
      res.body.status_code = 200;
      res.body.response = response;
      logger.log("info", "MERCHANT_GET_STORES", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(200).send(res.body);
    } catch (err) {
      logger.log("error", "MERCHANT_GET_STORES", {
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

  // Merchant activating his store
  this.activateStore = async function (req, res) {
    let storeIdentifier = parseInt(req.params.id);
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let merchantObj = await getMerchantObject(req.user.id);
      let storeObj = await dbConn.instance.MerchantStores.findOne(
        {
          where: { merchantId: merchantObj.id, id: storeIdentifier },
        },
        { transaction }
      );
      if (storeObj != null) {
        if (
          merchantObj.merchantUsers[0].storeId != null &&
          merchantObj.merchantUsers[0].storeId.length > 0 &&
          !merchantObj.merchantUsers[0].storeId.includes(storeIdentifier)
        ) {
          res.body.status_code = 403;
          res.body.response = "Unknown store";
        } else {
          if (storeObj.status == appUtils.STATUS.ACTIVE) {
            storeObj.status = appUtils.STATUS.INACTIVE;
          } else {
            storeObj.status = appUtils.STATUS.ACTIVE;
          }

          await storeObj.save({ transaction });
          res.body.response = `Store status changed to ${storeObj.status}`;
        }
      } else {
        res.body.status_code = 403;
        res.body.response = "Unknown store";
      }
      await transaction.commit();
      logger.log("info", "ACTIVATE_STORE", {
        payload: {
          request: storeIdentifier,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "ACTIVATE_STORE", {
        payload: {
          request: storeIdentifier,
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
        where: { invitedBy: req.user.id },
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
      res.body.response = rows;
      await transaction.commit();
      logger.log("info", "GET_MERCHANT_CONSUMER", {
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
      logger.log("error", "GET_MERCHANT_CONSUMER", {
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

  //Merchant getting all stores for offer creation
  //(For dropdown in the Create offer)
  this.getAllMerchantStores = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      let stores = await dbConn.instance.MerchantStores.findAll({
        where: { merchantId: merchantIs.merchantId },
        attributes: [
          ["id", "value"], // Rename "id" field to "value"
          ["name", "label"], // Rename "name" field to "label"
        ],
      });
      res.body.status_code = 200;
      res.body.response = stores;
      await transaction.commit();
      logger.log("info", "GET_MERCHANT_STORES", {
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
      logger.log("error", "GET_MERCHANT_STORES", {
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

  // Merchant creating the reward
  this.createReward = async function (req, res) {
    const parsedBody = JSON.parse(JSON.stringify(req.body));
    let file;
    let bucketResp;
    if (req.file) {
      // file = JSON.parse(JSON.stringify(req.file));
      file = req.file;
      bucketResp = await bucketUploader("file", file, "rewards");
    }
    try {
      const existsReward = await dbConn.instance.Rewards.findOne({
        where: { name: parsedBody.name },
      });
      if (existsReward) {
        return res.status(400).json({ error: "Reward with this name exists" });
      }
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      await dbConn.instance.Rewards.create({
        ...parsedBody,
        status: "ACTIVE",
        merchantUserId: req.user.id,
        merchantId: merchantIs.merchantId,
        rewardImg: bucketResp,
      });
      res.body.response = "Reward created";
      res.body.status_code = 201;
      logger.log("info", "CREATE_REWARD", {
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
      logger.log("error", "CREATE_REWARD", {
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

  // Merchant creating the offer
  this.createOffer = async function (req, res) {
    try {
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      const offerIs = await dbConn.instance.Offers.create({
        ...req.body,
        merchantUserId: req.user.id,
        merchantId: merchantIs.merchantId,
      });
      offerIs.addStoreInfo(req.body.storeId);
      res.body.response = "Offer created";
      res.body.status_code = 201;
      logger.log("info", "CREATE_OFFER", {
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
      logger.log("error", "CREATE_OFFER", {
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

  //Get the offers created by specific merchant
  this.getOffers = async function (req, res) {
    const { page, pageSize } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;
    try {
      const rows = await dbConn.instance.Offers.findAll({
        offset: offset,
        limit: parsedPageSize,
        where: { merchantUserId: req.user.id },
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
            // attributes: ["name"],
          },
        ],
      });

      const count = await dbConn.instance.Offers.count({
        where: { merchantUserId: req.user.id },
      });

      const totalPages = Math.ceil(count / parsedPageSize);
      res.body.status_code = 200;
      res.body.response = rows;
      res.body.totalCount = count;
      res.body.totalPages = totalPages;
      logger.log("info", "GET_OFFERS", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).send(res.body);
    } catch (err) {
      logger.log("error", "GET_OFFERS", {
        payload: {
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  //Get the rewards created by specific merchant
  this.getRewards = async function (req, res) {
    const { page, pageSize } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;

    try {
      const rows = await dbConn.instance.Rewards.findAll({
        offset: offset,
        limit: parsedPageSize,
        where: { merchantUserId: req.user.id },
        order: [["createdAt", "ASC"]],
        include: [
          {
            model: dbConn.instance.MerchantProducts,
            as: "productInfo",
            // attributes: ["name"],
          },
        ],
      });
      const count = await dbConn.instance.Rewards.count({
        where: { merchantUserId: req.user.id },
      });

      const totalPages = Math.ceil(count / parsedPageSize);

      res.body.status_code = 200;
      res.body.response = rows.map((reward) => reward.toJSON());
      res.body.totalCount = count;
      res.body.totalPages = totalPages;
      logger.log("info", "GET_REWARDS_OF_MERCHANT", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res.status(200).json(res.body);
    } catch (err) {
      logger.log("error", "GET_REWARDS_OF_MERCHANT", {
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

  // Merchant getting the specific offer detail
  this.getSpecificOfferDetail = async function (req, res) {
    const { id } = req.params;
    try {
      let offerExists = await dbConn.instance.Offers.findOne({
        where: { id: id },
        include: [
          {
            model: dbConn.instance.MerchantStores,
            as: "storeInfo",
          },
        ],
      });
      if (!offerExists) {
        res.body.status_code = 404;
        res.body.response = "Offer not found";
        return res.status(res.body.status_code).send(res.body);
      }
      res.body.status_code = 200;
      res.body.response = offerExists;
      logger.log("info", "GET_SPECIFIC_OFFER", {
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
      logger.log("error", "GET_SPECIFIC_OFFER", {
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

  // Merchant getting the specific reward detail
  this.getSpecificRewardDetail = async function (req, res) {
    const { id } = req.params;
    try {
      let rewardExist = await dbConn.instance.Rewards.findOne({
        where: { id: id },
      });
      if (!rewardExist) {
        res.body.status_code = 404;
        res.body.response = "Reward not found";
        return res.status(res.body.status_code).send(res.body);
      }
      res.body.status_code = 200;
      res.body.response = rewardExist;
      logger.log("info", "GET_SPECIFIC_REWARD", {
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
      logger.log("error", "GET_SPECIFIC_REWARD", {
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

  //Edit the offer
  this.editOffer = async function (req, res) {
    const { id } = req.params;
    try {
      let offerExist = await dbConn.instance.Offers.findByPk(id);
      if (!offerExist) {
        return res.status(401).send("Offer don't exists");
      }
      if (req.body.storeId && req.body.storeId.length > 0) {
        const associatedStores = await offerExist.getStoreInfo();
        if (associatedStores.length > 0) {
          await offerExist.removeStoreInfo(associatedStores);
        }
        await offerExist.addStoreInfo(req.body.storeId);
        await offerExist.set({ ...req.body }).save();
        logger.log("info", "UPDATE_OFFER", {
          payload: {
            request: null,
            user: req.user.email,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
        return res.status(200).send("Offer update");
      }
    } catch (err) {
      logger.log("error", "UPDATE_OFFER", {
        payload: {
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

  //Edit the reward
  this.editReward = async function (req, res) {
    const { id } = req.params;
    try {
      let rewardExist = await dbConn.instance.Rewards.findByPk(id);
      if (!rewardExist) {
        res.body.status_code = 401;
        res.body.response = "Reward don't exists";
        return res.status(res.body.status_code).send(res.body);
      }
      if (req.file) {
        //Check if already existed reward have picture
        if (rewardExist?.rewardImg && rewardExist?.rewardImg?.key) {
          await deleteFromBucket(rewardExist?.rewardImg?.key);
        }
        // file = JSON.parse(JSON.stringify(req.file));
        file = req.file;
        bucketResp = await bucketUploader("file", file, "rewards");
        await rewardExist
          .set({
            ...req.body,
            rewardImg: bucketResp,
          })
          .save();
      } else {
        await rewardExist.set({ ...req.body }).save();
      }
      res.body.status_code = 200;
      res.body.response = "Reward update";
      logger.log("info", "UPDATE_REWARD", {
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
      logger.log("error", "UPDATE_REWARD", {
        payload: {
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

  // Merchant activating the reward
  this.activateReward = async function (req, res) {
    const { id } = req.params;
    try {
      let rewardExist = await dbConn.instance.Rewards.findByPk(id);
      if (!rewardExist) {
        res.body.status_code = 401;
        res.body.response = "Reward don't exists";
        return res.status(res.body.status_code).send(res.body);
      }
      if (rewardExist.status == appUtils.STATUS.ACTIVE) {
        rewardExist.status = appUtils.STATUS.INACTIVE;
      } else {
        rewardExist.status = appUtils.STATUS.ACTIVE;
      }
      await rewardExist.save();
      res.body.response = `Reward status changed to ${rewardExist.status}`;
      res.body.status_code = 200;
      logger.log("info", "REWARD_ACTIVATE", {
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
      logger.log("error", "REWARD_ACTIVATE", {
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

  // Merchant activating the offer
  this.activateOffer = async function (req, res) {
    const { id } = req.params;
    try {
      let offerExist = await dbConn.instance.Offers.findByPk(id);
      if (!offerExist) {
        res.body.status_code = 401;
        res.body.response = "Offer don't exists";
        return res.status(res.body.status_code).send(res.body);
      }
      if (offerExist.status == appUtils.STATUS.ACTIVE) {
        offerExist.status = appUtils.STATUS.INACTIVE;
      } else {
        offerExist.status = appUtils.STATUS.ACTIVE;
      }
      await offerExist.save();
      res.body.response = `Offer status changed to ${offerExist.status}`;
      res.body.status_code = 200;
      logger.log("info", "OFFER_ACTIVATE", {
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
      logger.log("error", "OFFER_ACTIVATE", {
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

  //Getting all the products of merchant
  this.getMerchantProducts = async function (req, res) {
    const { page, pageSize, startDate, endDate, text } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;
    try {
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      if (merchantIs && merchantIs.merchantId) {
        let query = {
          merchantId: merchantIs.merchantId,
        };
        if (text && text !== "null") {
          query.title = {
            [Sequelize.Op.iLike]: `${text}%`,
          };
        }
        if (endDate && endDate !== "null") {
          parsedEndDate = new Date(endDate);
          parsedEndDate.setHours(23, 59, 59, 999);
        }
        if (
          startDate &&
          endDate &&
          startDate !== "null" &&
          endDate !== "null"
        ) {
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

        let rows = await dbConn.instance.MerchantProducts.findAll({
          limit: parsedPageSize,
          offset: offset,
          where: query,
          order: [["createdAt", "ASC"]],
        });

        const count = await dbConn.instance.MerchantProducts.count({
          where: query,
        });

        const totalPages = Math.ceil(count / parsedPageSize);
        res.body.status_code = 200;
        res.body.response = rows;
        res.body.totalPages = totalPages;
        res.body.totalCount = count;
        logger.log("info", "GET_ALL_MERCHANT_PRODUCTS", {
          payload: {
            request: null,
            user: req.user.email,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
        return res.status(res.body.status_code).send(res.body);
      } else {
        res.body.status_code = 404;
        res.body.response = "No merchants exist";
        return res.status(res.body.status_code).send(res.body);
      }
    } catch (err) {
      logger.log("error", "GET_ALL_MERCHANT_PRODUCTS", {
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

  //Getting all the products of merchant for dropdown
  this.getMerchantProduct = async function (req, res) {
    try {
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      if (merchantIs && merchantIs.merchantId) {
        let query = {
          merchantId: merchantIs.merchantId,
        };
        let rows = await dbConn.instance.MerchantProducts.findAll({
          where: query,
          order: [["createdAt", "ASC"]],
        });

        // const count = await dbConn.instance.MerchantProducts.count({
        //   where: query,
        // });
        // const totalPages = Math.ceil(count / parsedPageSize);
        res.body.status_code = 200;
        res.body.response = rows;
        // res.body.totalPages = totalPages;
        // res.body.totalCount = count;
        logger.log("info", "GET_ALL_MERCHANT_PRODUCTS", {
          payload: {
            request: null,
            user: req.user.email,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
        return res.status(res.body.status_code).send(res.body);
      } else {
        res.body.status_code = 404;
        res.body.response = "No merchants exist";
        return res.status(res.body.status_code).send(res.body);
      }
    } catch (err) {
      logger.log("error", "GET_ALL_MERCHANT_PRODUCTS", {
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

  //Get coupon code related information
  this.getCouponCodeInfo = async function (req, res) {
    const { couponCode } = req.params;
    try {
      const coupon = await dbConn.instance.Coupon.findOne({
        where: { couponCode, merchantUserId: req.user.id },
        include: [
          {
            model: dbConn.instance.Rewards,
            as: "rewardInfo",
          },
          {
            model: dbConn.instance.Offers,
            as: "offerInfo",
          },
          {
            model: dbConn.instance.EarningRules,
            as: "ruleInfo",
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
        ],
      });
      if (!coupon) {
        return res
          .status(404)
          .send({ status_code: 404, message: "Invalid coupon" });
      }
      if (coupon?.availed) {
        return res
          .status(404)
          .send({ status_code: 404, message: "Coupon already availed" });
      }
      return res.status(200).send({ status_code: 200, response: coupon });
    } catch (err) {
      logger.log("error", "COUPON_INFORMATION", {
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

  //Merchant getting all transactions
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
        merchantUserId: parseInt(req.user.id),
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
        transaction,
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

module.exports = new MerchantService();
