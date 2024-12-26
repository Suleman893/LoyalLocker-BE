const constants = require("../constants.js");
const { check, validationResult } = require("express-validator");
const campaignService = require("../services/campaignService.js");
const appUtils = require("../util/appUtil.js");

module.exports = (app) => {
  //Webhook of mailchimp to get updated of campaign records, based on email checking the merchant user id
  app.get(
    `${constants.baseAPIPath}/merchant/webhook/campaign-updates/:email`,
    async (req, res) => {
      await campaignService.mailchimpCampaignUpdateWebhook(req, res);
    }
  );

  //Merchant adding the mailchimp credentials
  app.post(
    `${constants.baseAPIPath}/merchant/add-mailchimp-credential`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check("mailchimpApiKey")
        .not()
        .isEmpty()
        .withMessage("Mailchimp api key is required"),
      check("mailchimpServerPrefix")
        .not()
        .isEmpty()
        .withMessage("Mailchimp server prefix is required"),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await campaignService.addMailChimpCredential(req, res);
    }
  );

  //Merchant adding the mailchimp credentials
  app.put(
    `${constants.baseAPIPath}/merchant/edit-mailchimp-credential`,
    [
      check("mailchimpApiKey")
        .not()
        .isEmpty()
        .withMessage("Mailchimp api key is required"),
      check("mailchimpServerPrefix")
        .not()
        .isEmpty()
        .withMessage("Mailchimp server prefix is required"),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await campaignService.editMailChimpCredential(req, res);
    }
  );

  //Merchant creating the audience/segment
  app.post(
    `${constants.baseAPIPath}/merchant/create-segment`,
    [
      check("queryToSend").not().isEmpty().withMessage("Query is required"),
      check("segmentName", "must be atleast 5 chars required").isLength({
        min: 5,
      }),
    ],
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await campaignService.createSegment(req, res);
    }
  );

  //Merchant getting all the audiences/segments
  app.get(
    `${constants.baseAPIPath}/merchant/all-segments`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await campaignService.getAllSegments(req, res);
    }
  );

  //Merchant creating the email templates of stripo
  app.post(
    `${constants.baseAPIPath}/merchant/create-email-template`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check("name", "must be atleast 5 char and max 100").isLength({
        min: 5,
        max: 100,
      }),
      check("description", "must be atleast 30 char").isLength({
        min: 30,
      }),
      check("html").not().isEmpty(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await campaignService.createEmailTemplate(req, res);
    }
  );

  //Merchant editing the email templates of stripo
  app.put(
    `${constants.baseAPIPath}/merchant/edit-email-template/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check("name", "must be atleast 5 char and max 100").isLength({
        min: 5,
        max: 100,
      }),
      check("description", "must be atleast 30 char").isLength({
        min: 30,
      }),
      check("html").not().isEmpty(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await campaignService.editEmailTemplate(req, res);
    }
  );

  //Merchant getting all the email templates
  app.get(
    `${constants.baseAPIPath}/merchant/email-templates`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await campaignService.getAllEmailTemplates(req, res);
    }
  );

  //Merchant get the single email template
  app.get(
    `${constants.baseAPIPath}/merchant/single-email-template/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await campaignService.getEmailTemplate(req, res);
    }
  );

  //Merchant creating the campaign
  app.post(
    `${constants.baseAPIPath}/merchant/create-campaign`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check(
        "campaignName",
        "must be atleast 5 char and max 100 chars"
      ).isLength({ min: 5, max: 100 }),
      check("channel").not().isEmpty().withMessage("Channel is required."),
      check("emailTemplateId")
        .not()
        .isEmpty()
        .withMessage("Email template ID is required.")
        .isInt()
        .withMessage("Email Template ID must be integer"),
      check("segmentId")
        .not()
        .isEmpty()
        .withMessage("Segment ID is required.")
        .isInt()
        .withMessage("Segment ID must be an integer."),
      check("mailChimpSegmentId")
        .not()
        .isEmpty()
        .withMessage("MailChimp segment ID is required."),
      check("emailSubject")
        .not()
        .isEmpty()
        .withMessage("Email subject is required."),
      check("senderEmail", "must be a valid email with 5 min char and max 60 chars long")
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
      check("senderName")
        .not()
        .isEmpty()
        .withMessage("Sender name is required."),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await campaignService.createCampaign(req, res);
    }
  );

  //Merchant getting all the campaigns
  app.get(
    `${constants.baseAPIPath}/merchant/all-campaigns`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await campaignService.getAllCampaigns(req, res);
    }
  );

  //Merchant creating the journey
  app.post(
    `${constants.baseAPIPath}/merchant/create-campaign-journey`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    [
      check("name")
        .notEmpty()
        .withMessage("Name is required.")
        .isLength({ min: 5 })
        .withMessage("Name must be at least 5 characters long."),
      check("description")
        .notEmpty()
        .withMessage("Journey description is required")
        .isLength({ min: 30 })
        .withMessage("Min of 30 characters required"),
      check("segmentId", "Segment Id is required.").notEmpty(),
      check("journeySteps")
        .isArray({ min: 1 })
        .withMessage("Journey steps must be an array with at least one action"),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await campaignService.createCampaignJourney(req, res);
    }
  );

  //Merchant getting all the journey
  app.get(
    `${constants.baseAPIPath}/merchant/all-journeys`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await campaignService.getCampaignJourney(req, res);
    }
  );

  //Merchant executing the journey either now/scheduled
  app.post(
    `${constants.baseAPIPath}/merchant/execute-journey/:id`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await campaignService.executeCampaignJourney(req, res);
    }
  );

  //Merchant getting the account info of the connected mailchimp account
  app.get(
    `${constants.baseAPIPath}/merchant/get-account-info`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, appUtils.ROLES.ROLE_MERCHANT);
    },
    async (req, res) => {
      await campaignService.getAccountInfo(req, res);
    }
  );
};
