const dbConn = require("./databaseConnection.js");
const logger = require("../util/logger.js");

function EventRuleService() {
  //Adding the rule-type/events
  this.saveEvent = async function (req, res) {
    const { name } = req.body;
    try {
      let alreadyExist = await dbConn.instance.Events.findOne({
        where: { name },
      });
      if (alreadyExist) {
        res.body.status_code = 403;
        res.body.response = "Rule type already exists";
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.Events.create({
        ...req.body,
        adminId: req.user.id,
      });
      res.body.status_code = 200;
      res.body.response = "New event created";
      logger.log("info", "ADD_EVENT", {
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
      logger.log("error", "ADD_EVENT", {
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

  //Edit the rule-type/events
  // this.editEvent = async function (req, res) {
  //   const { id } = req.params;
  //   try {
  //     let eventExists = await dbConn.instance.Events.findByPk(id);
  //     if (!eventExists) {
  //       res.body.status_code = 401;
  //       res.body.response = "Event don't exists";
  //       return res.status(res.body.status_code).send(res.body);
  //     }
  //     await eventExists.set({ ...req.body }).save();
  //     res.body.status_code = 200;
  //     res.body.response = "Event update";
  //     logger.log("info", "UPDATE_EVENT", {
  //       payload: {
  //         request: null,
  //         user: req.user.email,
  //         response:
  //           res.body.status_code == 200 ? { status_code: 200 } : res.body,
  //         ipAddress: req.ip,
  //       },
  //     });
  //     res.status(res.body.status_code).send(res.body);
  //   } catch (err) {
  //     logger.log("error", "UPDATE_EVENT", {
  //       payload: {
  //         user: req.user.email,
  //         response: err.message,
  //         ipAddress: req.ip,
  //       },
  //     });
  //     return res
  //       .status(500)
  //       .send({ status_code: 500, message: "Internal Server Error" });
  //   }
  // };

  //Getting all the rule-type/events
  this.getEvent = async function (req, res) {
    const { page, pageSize } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;
    try {
      let rows = await dbConn.instance.Events.findAll({
        limit: parsedPageSize,
        offset: offset,
        raw: true,
        order: [["createdAt", "ASC"]],
      });
      const count = await dbConn.instance.Events.count({});
      const totalPages = Math.ceil(count / parsedPageSize);
      res.body.status_code = 200;
      res.body.response = rows;
      res.body.totalPages = totalPages;
      res.body.totalCount = count;
      logger.log("info", "GET_ALL_EVENTS", {
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
      logger.log("error", "GET_ALL_EVENTS", {
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

  //Update the event status by event id
  this.updateEventStatus = async function (req, res) {
    const { id } = req.params;
    try {
      const event = await dbConn.instance.Events.findByPk(id);
      if (!event) {
        return res
          .status(404)
          .send({ status_code: 404, message: "Event not found" });
      }
      event.status = event.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await event.save();
      logger.log("info", "UPDATE_EVENT_STATUS", {
        payload: {
          request: null,
          user: req.user.email,
          response: {
            status_code: 200,
            message: "Status updated successfully",
          },
          ipAddress: req.ip,
        },
      });
      return res
        .status(200)
        .send({ status_code: 200, message: "Status updated successfully" });
    } catch (err) {
      logger.log("error", "UPDATE_EVENT_STATUS", {
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

  //Adding the rule
  this.saveEarningRule = async function (req, res) {
    let rule = req.body;
    try {
      let alreadyExist = await dbConn.instance.EarningRules.findOne({
        where: { name: rule.name },
      });
      if (alreadyExist) {
        return res
          .status(403)
          .send({ status_code: 403, response: "Rule already exists" });
      }
      if (rule.eventId === 2) {
        //If event is referral (2) than all other rules will be inactive.
        await dbConn.instance.EarningRules.update(
          { status: "INACTIVE" }, // Set the status to INACTIVE
          { where: { eventId: 2 } } // Where condition to match eventId === 2 || event is Referral
        );
      }
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      const ruleIs = await dbConn.instance.EarningRules.create({
        ...rule,
        merchantUserId: req.user.id,
        merchantId: merchantIs.merchantId,
      });
      if (rule?.storeId && rule?.storeId?.length) {
        ruleIs.addStoreInfo(req.body.storeId);
      }
      if (rule?.productsId && rule?.productsId?.length) {
        ruleIs.addProductsInfo(req.body.productsId);
      }
      logger.log("info", "ADD_RULE", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res
        .status(200)
        .send({ status_code: 200, response: "New rule created" });
    } catch (err) {
      logger.log("error", "ADD_RULE", {
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

  //Duplicate the rule
  this.duplicateEarningRule = async function (req, res) {
    let { id } = req.params;
    try {
      let alreadyExist = await dbConn.instance.EarningRules.findOne({
        where: { id: id },
      });
      if (alreadyExist && alreadyExist.eventId === 2) {
        //If event is referral (2) than all other rules will be inactive.
        await dbConn.instance.EarningRules.update(
          { status: "INACTIVE" }, // Set the status to INACTIVE
          { where: { eventId: 2 } } // Where condition to match eventId === 2 || event is Referral
        );
      }
      const duplicatedNewRule = await dbConn.instance.EarningRules.create({
        eventId: alreadyExist.eventId,
        merchantId: alreadyExist.merchantId,
        merchantUserId: alreadyExist.merchantUserId,
        name: alreadyExist.name,
        description: alreadyExist.description,
        points: alreadyExist.points,
        minTransactionValue: alreadyExist.minTransactionValue || 0,
        status: alreadyExist.status,
        startAt: alreadyExist.startAt,
        endAt: alreadyExist.endAt || null,
        pointsType: alreadyExist.pointsType || null,
        purchaseType: alreadyExist.purchaseType || null,
        distanceFromStore: alreadyExist.distanceFromStore || null,
        multiplier: alreadyExist.multiplier || null,
        productId: alreadyExist.productId || null,
      });
      const existingRuleStores = await dbConn.instance.StoreRules.findAll({
        where: { earningRuleId: alreadyExist.id },
      });
      let existRuleStoreIds;
      if (existingRuleStores && existingRuleStores?.length) {
        existRuleStoreIds = existingRuleStores.map(
          (item) => item.merchantStoreId
        );
      }
      if (existRuleStoreIds && existRuleStoreIds?.length) {
        duplicatedNewRule.addStoreInfo(existRuleStoreIds);
      }
      logger.log("info", "DUPLICATE_RULE", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res
        .status(200)
        .send({ status_code: 200, response: "Rule duplicated" });
    } catch (err) {
      logger.log("error", "DUPLICATE_RULE", {
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

  //Get single rule
  this.getSingleRule = async function (req, res) {
    const { id } = req.params;
    try {
      let ruleIs = await dbConn.instance.EarningRules.findOne({ id: id });
      logger.log("info", "GET_SINGLE_RULE", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      if (ruleIs) {
        return res.status(200).send({ status_code: 200, response: ruleIs });
      }
    } catch (err) {
      logger.log("error", "GET_SINGLE_RULE", {
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

  //Edit the rule
  this.editEarningRule = async function (req, res) {
    let rule = req.body;
    const { id } = req.params;
    try {
      let ruleExist = await dbConn.instance.EarningRules.findByPk(id);
      if (!ruleExist) {
        return res
          .status(401)
          .send({ status_code: 401, response: "Rule don't exists" });
      }
      if (rule?.storeId && rule?.storeId?.length > 0) {
        const associatedStores = await ruleExist.getStoreInfo();
        if (associatedStores?.length > 0) {
          await ruleExist.removeStoreInfo(associatedStores);
        }
        await ruleExist.addStoreInfo(rule?.storeId);
      }
      if (rule?.productsId && rule?.productsId?.length) {
        const associatedProducts = await ruleExist.getProductInfo();
        if (associatedProducts?.length > 0) {
          await ruleExist.removeProductInfo(associatedProducts);
        }
        await ruleExist.addProductInfo(rule?.storeId);
      }

      await ruleExist.set({ ...req.body }).save();
      logger.log("info", "EDIT_RULE", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      return res
        .status(200)
        .send({ status_code: 200, response: "Rule updated" });
    } catch (err) {
      logger.log("error", "EDIT_RULE", {
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

  //Get the rule by event id
  this.getRuleOfEvent = async function (req, res) {
    const { id } = req.params;
    const { page, pageSize } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;
    try {
      let rows = await dbConn.instance.EarningRules.findAll({
        where: { eventId: id },
        offset: offset,
        limit: parsedPageSize,
        include: [
          {
            model: dbConn.instance.Events,
            as: "eventInfo",
            attributes: ["id", "name", "status", "description"],
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productInfo",
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productsInfo",
          },
          {
            model: dbConn.instance.MerchantStores,
            as: "storeInfo",
            required: false,
          },
        ],
        order: [["createdAt", "ASC"]],
      });

      const count = await dbConn.instance.EarningRules.count({
        where: { eventId: id },
      });

      const totalPages = Math.ceil(count / parsedPageSize);
      logger.log("info", "GET_RULE", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      res.body.response = rows.map((rule) => rule.toJSON());
      res.body.totalPages = totalPages;
      res.body.totalCount = count;
      return res.status(200).json(res.body);
    } catch (err) {
      logger.log("error", "GET_RULE", {
        payload: {
          user: req.user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  //Get the rule of merchant by event id
  this.getMerchantRuleOfEvent = async function (req, res) {
    const { id } = req.params;
    const { page, pageSize } = req.query;
    const parsedPage = page ? parseInt(page) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize) : 8;
    const offset = (parsedPage - 1) * parsedPageSize;

    try {
      let rows = await dbConn.instance.EarningRules.findAll({
        limit: parsedPageSize,
        offset: offset,
        where: { eventId: id, merchantUserId: req.user.id },
        order: [["createdAt", "ASC"]],
        include: [
          {
            model: dbConn.instance.Events,
            as: "eventInfo",
            attributes: ["id", "name", "status", "description"],
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productInfo",
          },
          {
            model: dbConn.instance.MerchantProducts,
            as: "productsInfo",
          },
          {
            model: dbConn.instance.MerchantStores,
            as: "storeInfo",
            required: false,
          },
        ],
        distinct: true,
      });

      const count = await dbConn.instance.EarningRules.count({
        where: { eventId: id, merchantUserId: req.user.id },
      });
      const totalPages = Math.ceil(count / parsedPageSize);

      logger.log("info", "GET_RULE_OF_MERCHANT", {
        payload: {
          request: null,
          user: req.user.email,
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      res.body.response = rows.map((rule) => rule.toJSON());
      res.body.totalPages = totalPages;
      res.body.totalCount = count;
      return res.status(200).json(res.body);
    } catch (err) {
      logger.log("error", "GET_RULE_OF_MERCHANT", {
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

  //Update the rule status by rule id
  this.updateEarningRuleStatus = async function (req, res) {
    const { id } = req.params;
    try {
      const rule = await dbConn.instance.EarningRules.findByPk(id);
      if (!rule) {
        return res
          .status(404)
          .send({ status_code: 404, message: "Rule not found" });
      }
      rule.status = req.body.status;
      await rule.save();
      logger.log("info", "UPDATE_RULE_STATUS", {
        payload: {
          request: null,
          user: req.user.email,
          response: {
            status_code: 200,
            message: "Rule status updated successfully",
          },
          ipAddress: req.ip,
        },
      });
      return res
        .status(200)
        .send({ status_code: 200, message: "Rule status updated successfully" });
    } catch (err) {
      logger.log("error", "UPDATE_RULE_STATUS", {
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

  //Duplicate the rule status by rule id
  this.duplicateRule = async function (req, res) {
    const { id } = req.params;
    try {
      const rule = await dbConn.instance.EarningRules.findByPk(id, {
        raw: true,
      });
      if (!rule) {
        return res
          .status(404)
          .send({ status_code: 404, message: "Rule not found" });
      }
      const { id: removedId, ...rest } = rule;
      await dbConn.instance.EarningRules.create(rest);
      logger.log("info", "DUPLICATE_RULE_STATUS", {
        payload: {
          request: null,
          user: req.user.email,
          response: {
            status_code: 200,
            message: "Status updated successfully",
          },
          ipAddress: req.ip,
        },
      });
      return res
        .status(200)
        .send({ status_code: 200, message: "Rule duplicated successfully" });
    } catch (err) {
      logger.log("error", "DUPLICATE_RULE_STATUS", {
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

  //Getting all the rule-type/events DROPDOWN
  this.getAllEventForRuleCreation = async function (req, res) {
    try {
      let rules = await dbConn.instance.Events.findAll({
        attributes: [
          ["id", "value"], // Rename "id" field to "value"
          ["name", "label"], // Rename "name" field to "label"
        ],
        order: [["createdAt", "ASC"]],
      });
      res.body.status_code = 200;
      res.body.response = rules;
      logger.log("info", "GET_ALL_EVENTS_FOR_RULE", {
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
      logger.log("error", "GET_ALL_EVENTS_FOR_RULE", {
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

module.exports = new EventRuleService();
