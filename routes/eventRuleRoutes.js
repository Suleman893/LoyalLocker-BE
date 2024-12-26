const constants = require("../constants.js");
const { check, validationResult } = require("express-validator");
const eventRuleService = require("../services/eventRuleService.js");
const appUtils = require("../util/appUtil.js");

module.exports = (app) => {
  //Adding the rule-type/events
  app.post(
    `${constants.baseAPIPath}/admin/event`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    [
      check("name", "Name is required").notEmpty(),
      check("status", "Status is required").notEmpty(),
      check("description", "Description is required").notEmpty(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await eventRuleService.saveEvent(req, res, req.body);
    }
  );

  //Edit the rule-type/event [Not using]
  // app.put(
  //   `${constants.baseAPIPath}/admin/event/:id`,
  //   function (req, res, next) {
  //     appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
  //   },
  //   async (req, res) => {
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       return res.status(422).json({ errors: errors.array() });
  //     }
  //     await eventRuleService.editEvent(req, res, req.body);
  //   }
  // );

  //Getting all the rule-type/events
  app.get(
    `${constants.baseAPIPath}/admin/event`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await eventRuleService.getEvent(req, res, req.body);
    }
  );

  //Update the event status by event id
  app.patch(
    `${constants.baseAPIPath}/update-event-status/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await eventRuleService.updateEventStatus(req, res, req.body);
    }
  );

  //Adding the rule
  app.post(
    `${constants.baseAPIPath}/merchant/rule`,
    [
      check("eventId")
        .not()
        .isEmpty()
        .withMessage("Event Id is required.")
        .isInt()
        .withMessage("Event Id must be an integer."),
      check("name").not().isEmpty(),
      check("description").not().isEmpty(),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await eventRuleService.saveEarningRule(req, res, req.body);
    }
  );

  //Edit the rule
  app.put(
    `${constants.baseAPIPath}/merchant/rule/:id`,
    [
      check("eventId")
        .not()
        .isEmpty()
        .withMessage("Event Id is required.")
        .isInt()
        .withMessage("Event Id must be an integer."),
      check("name").not().isEmpty(),
      check("description").not().isEmpty(),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await eventRuleService.editEarningRule(req, res, req.body);
    }
  );

  //Duplicating the rule
  app.post(
    `${constants.baseAPIPath}/merchant/duplicate-rule/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await eventRuleService.duplicateEarningRule(req, res, req.body);
    }
  );

  //Get single rule details
  app.get(`${constants.baseAPIPath}/single-rule/:id`, async (req, res) => {
    await eventRuleService.getSingleRule(req, res);
  });

  //Get the rule by event id, used in admin panel
  app.get(
    `${constants.baseAPIPath}/rule/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_ADMIN);
    },
    async (req, res) => {
      await eventRuleService.getRuleOfEvent(req, res);
    }
  );

  //Get the rule of merchant by event id, used in merchant panel
  app.get(
    `${constants.baseAPIPath}/merchant/rule/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await eventRuleService.getMerchantRuleOfEvent(req, res, req.body);
    }
  );

  //Update the rule status by rule id *ADMIN AND MERCHANT BOTH*
  app.patch(
    `${constants.baseAPIPath}/update-rule-status/:id`,
    async (req, res) => {
      await eventRuleService.updateEarningRuleStatus(req, res, req.body);
    }
  );

  //Duplicate the rule by rule id *Not using*
  app.post(
    `${constants.baseAPIPath}/duplicate-rule/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await eventRuleService.duplicateRule(req, res, req.body);
    }
  );

  //Get the events for rule creation [Used in dropdown when creating rule in merchant]
  app.get(
    `${constants.baseAPIPath}/events-for-rule-creation`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await eventRuleService.getAllEventForRuleCreation(req, res);
    }
  );
};
