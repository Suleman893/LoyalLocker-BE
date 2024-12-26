const mailChimpService = require("./email/mailChimpService.js");
const Sequelize = require("sequelize");
const dbConn = require("./databaseConnection");
const logger = require("../util/logger");
const executeJourney = require("../util/campaignJourney.js");
const mailchimp = require("@mailchimp/mailchimp_marketing");

function CampaignService() {
  //Mailchimp campaigns status updates
  this.mailchimpCampaignUpdateWebhook = async function (req, res) {
    const merchantEmail = req.params.email;
    try {
      const merchantExists = await dbConn.instance.User.findOne({
        where: {
          email: merchantEmail,
        },
      });
      if (merchantExists && merchantExists?.email) {
        const client = await mailChimpService.connectToMailChimp(
          parseInt(merchantExists.id)
        );

        if (client?.config.apiKey && client?.config?.server) {
          const response = await client.campaigns.list();
          const campaigns = response.campaigns;

          let totalEmailOpenRate = 0;
          let totalUniqueEmailOpens = 0;
          let totalClickRate = 0;
          let totalUniqueEmailClicks = 0;
          let totalEmailsSent = 0;
          let totalHardBounces = 0;
          let totalSoftBounces = 0;

          for (const campaign of campaigns) {
            const campaignId = campaign.id;
            const campaignReport = await client.reports.getCampaignReport(
              campaignId
            );
            totalEmailOpenRate += campaignReport?.opens?.open_rate;
            totalUniqueEmailOpens += campaignReport?.opens?.unique_opens;
            totalClickRate += campaignReport?.clicks?.click_rate;
            totalUniqueEmailClicks += campaignReport?.clicks?.unique_clicks;
            totalEmailsSent += campaignReport?.emails_sent;
            totalHardBounces += campaignReport?.bounces.hard_bounces;
            totalSoftBounces += campaignReport?.bounces.soft_bounces;
          }

          const totalBounceRate =
            (totalHardBounces + totalSoftBounces) / totalEmailsSent;

          const existingRecord =
            await dbConn.instance.MerchantCampaignRecords.findOne({
              where: { merchantUserId: merchantExists.id },
            });

          if (existingRecord) {
            await dbConn.instance.MerchantCampaignRecords.update(
              {
                totalEmailOpenRate: parseFloat(totalEmailOpenRate.toFixed(2)),
                totalUniqueEmailOpens: totalUniqueEmailOpens,
                totalClickRate: parseFloat(totalClickRate.toFixed(2)),
                totalUniqueEmailClicks: totalUniqueEmailClicks,
                totalEmailsSent: totalHardBounces + totalSoftBounces,
                totalBounceRate: parseFloat(totalBounceRate.toFixed(2)),
              },
              {
                where: { merchantUserId: merchantExists.id },
              }
            );
          }
          res.body.status_code = 201;
          res.body.response = `Campaign record updated of mailchimp`;
        }
      } else {
        res.body.status_code = 404;
        res.body.response = `Merchant not found`;
      }
      return res.status(res.body.status_code).send(res.body);
    } catch (err) {
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Merchant setting its mailchimp configuration
  this.addMailChimpCredential = async function (req, res) {
    const { mailchimpApiKey, mailchimpServerPrefix } = req.body;
    try {
      mailchimp.setConfig({
        apiKey: mailchimpApiKey,
        server: mailchimpServerPrefix,
      });

      //Verify mailchimp credentials
      const response = await mailchimp.ping.get();
      if (response.health_status.length);
      {
        const [affectedRows, merchants] = await dbConn.instance.Merchant.update(
          {
            mailchimpApiKey,
            mailchimpServerPrefix,
          },
          {
            where: { primaryUser: req.user.id },
            returning: true,
            plain: true,
          }
        );
        let merchant;
        if (affectedRows > 0) {
          merchant = merchants[0];
        } else {
          merchant = await dbConn.instance.Merchant.findOne({
            where: { primaryUser: req.user.id },
          });
        }

        const client = await mailChimpService.connectToMailChimp(req.user.id);

        if (client?.config.apiKey && client?.config?.server) {
          const response = await client.campaigns.list();
          const campaigns = response.campaigns;

          let totalEmailOpenRate = 0;
          let totalUniqueEmailOpens = 0;
          let totalClickRate = 0;
          let totalUniqueEmailClicks = 0;
          let totalEmailsSent = 0;
          let totalHardBounces = 0;
          let totalSoftBounces = 0;

          for (const campaign of campaigns) {
            const campaignId = campaign.id;
            const campaignReport = await client.reports.getCampaignReport(
              campaignId
            );
            totalEmailOpenRate += campaignReport?.opens?.open_rate;
            totalUniqueEmailOpens += campaignReport?.opens?.unique_opens;
            totalClickRate += campaignReport?.clicks?.click_rate;
            totalUniqueEmailClicks += campaignReport?.clicks?.unique_clicks;
            totalEmailsSent += campaignReport?.emails_sent;
            totalHardBounces += campaignReport?.bounces.hard_bounces;
            totalSoftBounces += campaignReport?.bounces.soft_bounces;
          }

          const totalBounceRate =
            (totalHardBounces + totalSoftBounces) / totalEmailsSent;

          await dbConn.instance.MerchantCampaignRecords.create({
            merchantUserId: req.user.id,
            merchantId: merchant.id,
            totalEmailOpenRate: parseFloat(totalEmailOpenRate.toFixed(2)),
            totalUniqueEmailOpens: totalUniqueEmailOpens,
            totalClickRate: parseFloat(totalClickRate.toFixed(2)),
            totalUniqueEmailClicks: totalUniqueEmailClicks,
            totalEmailsSent: totalHardBounces + totalSoftBounces,
            totalBounceRate: parseFloat(totalBounceRate.toFixed(2)),
          });
          res.body.status_code = 200;
          res.body.response = "Mailchimp credentials added";
          logger.log("info", "MAIL_CHIMP_CREDENTIALS", {
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
          res.body.status_code = 200;
          res.body.response = "Failed to add credentials";
          return res.status(res.body.status_code).send(res.body);
        }
      }
    } catch (err) {
      if (err.message === "Unauthorized") {
        return res
          .status(400)
          .send({ status_code: 400, message: "Invalid mailchimp credentials" });
      }
      if (err.code === "ENOTFOUND" && err.errno === -3008) {
        return res
          .status(400)
          .send({ status_code: 400, message: "Invalid mailchimp credentials" });
      }
      logger.log("error", "MAIL_CHIMP_CREDENTIALS", {
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

  //Merchant setting its mailchimp configuration
  this.editMailChimpCredential = async function (req, res) {
    const { mailchimpApiKey, mailchimpServerPrefix } = req.body;
    try {
      mailchimp.setConfig({
        apiKey: mailchimpApiKey,
        server: mailchimpServerPrefix,
      });

      //Verify mailchimp credentials
      const response = await mailchimp.ping.get();
      if (response.health_status.length);
      {
        const [affectedRows, merchants] = await dbConn.instance.Merchant.update(
          {
            mailchimpApiKey,
            mailchimpServerPrefix,
          },
          {
            where: { primaryUser: req.user.id },
            returning: true,
            plain: true,
          }
        );
        let merchant;
        if (affectedRows > 0) {
          merchant = merchants[0];
        } else {
          merchant = await dbConn.instance.Merchant.findOne({
            where: { primaryUser: req.user.id },
          });
        }

        const client = await mailChimpService.connectToMailChimp(req.user.id);

        if (client?.config.apiKey && client?.config?.server) {
          const response = await client.campaigns.list();
          const campaigns = response.campaigns;

          let totalEmailOpenRate = 0;
          let totalUniqueEmailOpens = 0;
          let totalClickRate = 0;
          let totalUniqueEmailClicks = 0;
          let totalEmailsSent = 0;
          let totalHardBounces = 0;
          let totalSoftBounces = 0;

          for (const campaign of campaigns) {
            const campaignId = campaign.id;
            const campaignReport = await client.reports.getCampaignReport(
              campaignId
            );
            totalEmailOpenRate += campaignReport?.opens?.open_rate;
            totalUniqueEmailOpens += campaignReport?.opens?.unique_opens;
            totalClickRate += campaignReport?.clicks?.click_rate;
            totalUniqueEmailClicks += campaignReport?.clicks?.unique_clicks;
            totalEmailsSent += campaignReport?.emails_sent;
            totalHardBounces += campaignReport?.bounces.hard_bounces;
            totalSoftBounces += campaignReport?.bounces.soft_bounces;
          }

          const totalBounceRate =
            (totalHardBounces + totalSoftBounces) / totalEmailsSent;

          const existingRecord =
            await dbConn.instance.MerchantCampaignRecords.findOne({
              where: { merchantUserId: req.user.id },
            });

          if (existingRecord) {
            await dbConn.instance.MerchantCampaignRecords.update(
              {
                merchantId: merchant.id,
                totalEmailOpenRate: parseFloat(totalEmailOpenRate.toFixed(2)),
                totalUniqueEmailOpens: totalUniqueEmailOpens,
                totalClickRate: parseFloat(totalClickRate.toFixed(2)),
                totalUniqueEmailClicks: totalUniqueEmailClicks,
                totalEmailsSent: totalHardBounces + totalSoftBounces,
                totalBounceRate: parseFloat(totalBounceRate.toFixed(2)),
              },
              {
                where: { merchantUserId: req.user.id },
              }
            );
          } else {
            await dbConn.instance.MerchantCampaignRecords.create({
              merchantUserId: req.user.id,
              merchantId: merchant.id,
              totalEmailOpenRate: parseFloat(totalEmailOpenRate.toFixed(2)),
              totalUniqueEmailOpens: totalUniqueEmailOpens,
              totalClickRate: parseFloat(totalClickRate.toFixed(2)),
              totalUniqueEmailClicks: totalUniqueEmailClicks,
              totalEmailsSent: totalHardBounces + totalSoftBounces,
              totalBounceRate: parseFloat(totalBounceRate.toFixed(2)),
            });
          }

          res.body.status_code = 200;
          res.body.response = "Mailchimp credentials updated";
          logger.log("info", "MAIL_CHIMP_CREDENTIALS", {
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
          res.body.status_code = 200;
          res.body.response = "Failed to add credentials";
          return res.status(res.body.status_code).send(res.body);
        }
      }
    } catch (err) {
      console.log("The err", err);
      console.log("The err", err.message);
      console.log("The err", err.code);
      if (err.message === "Unauthorized") {
        return res
          .status(400)
          .send({ status_code: 400, message: "Invalid mailchimp credentials" });
      }
      if (err.code === "ENOTFOUND" && err.errno === -3008) {
        return res
          .status(400)
          .send({ status_code: 400, message: "Invalid mailchimp credentials" });
      }
      logger.log("error", "MAIL_CHIMP_CREDENTIALS", {
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

  //Merchant create segment/audience
  this.createSegment = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    let { segmentName, queryToSend } = req.body;
    // let { segmentName, gender, age, country, oprOne, oprTwo } = req.body;
    try {
      const alreadyExist = await dbConn.instance.Segment.findOne({
        where: {
          name: segmentName,
        },
      });
      if (alreadyExist) {
        res.body.status_code = 409;
        res.body.response = "Segment with this name exists";
        return res.status(res.body.status_code).send(res.body);
      }
      // const currentDate = new Date();
      // const minBirthDate = new Date(
      //   currentDate.getFullYear() - age,
      //   currentDate.getMonth(),
      //   currentDate.getDate()
      // );
      // const maxBirthDate = new Date(
      //   currentDate.getFullYear() - age - 1,
      //   currentDate.getMonth(),
      //   currentDate.getDate()
      // );
      // let matchedCondition = await dbConn.instance.User.findAll(
      //   {
      //     attributes: ["id", "email"],
      //     where: {
      //       [oprOne === "and" ? Sequelize.Op.and : Sequelize.Op.or]: [
      //         {
      //           [oprTwo === "and" ? Sequelize.Op.and : Sequelize.Op.or]: [
      //             { country: country },
      //             {
      //               dateOfBirth: {
      //                 [Sequelize.Op.gte]: maxBirthDate
      //                   .toISOString()
      //                   .split("T")[0],
      //                 [Sequelize.Op.lt]: minBirthDate
      //                   .toISOString()
      //                   .split("T")[0],
      //               },
      //             },
      //           ],
      //         },
      //         { gender: gender },
      //       ],
      //     },
      //     raw: true,
      //   },
      //   { transaction }
      // );

      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      const client = await mailChimpService.connectToMailChimp(req.user.id);
      const sqlQuery = `SELECT * FROM USERS WHERE ${queryToSend}`;
      // const sqlQuery = `SELECT * FROM USERS WHERE ${queryToSend} AND invited_by = ${req.user.id}`;

      const matchedCondition = await dbConn.instance.sequelize.query(sqlQuery, {
        type: Sequelize.QueryTypes.SELECT,
      });
      const matchedUserIds = matchedCondition.map((user) => user.id);
      const matchedEmails = matchedCondition.map((user) => user.email);
      if (!matchedEmails.length) {
        res.body.status_code = 404;
        res.body.response = "No user matches this criteria";
        return res.status(res.body.status_code).send(res.body);
      }
      const mailChimpSegmentId = await mailChimpService.createStaticSegment(
        client,
        segmentName,
        matchedEmails
      );
      // if (mailChimpSegmentId) {
      const newSegment = await dbConn.instance.Segment.create(
        {
          name: segmentName,
          mailChimpSegmentId: mailChimpSegmentId,
          totalUsers: matchedUserIds?.length,
          merchantUserId: req.user.id,
          merchantId: merchantIs.merchantId,
        },
        { transaction }
      );
      await newSegment.addUsers(matchedUserIds, {
        transaction,
        as: "userId",
      });
      res.body.status_code = 200;
      res.body.response = "Segment Created";
      // } else {
      //   res.body.status_code = 404;
      //   res.body.response = "No user in mailchimp list match's this criteria";
      // }
      await transaction.commit();
      logger.log("info", "CREATE_SEGMENT", {
        payload: {
          request: null,
          user: null,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "CREATE_SEGMENT", {
        payload: {
          request: null,
          user: null,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //Merchant get all segments/audiences
  this.getAllSegments = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let allSegments = await dbConn.instance.Segment.findAll({
        attributes: [
          "id",
          "name",
          "totalUsers",
          "mailChimpSegmentId",
          "updatedAt",
        ],
        include: [
          {
            model: dbConn.instance.User,
            as: "users",
            attributes: ["id", "email"],
            through: { attributes: [] },
          },
        ],
        where: {
          merchantUserId: req.user.id,
        },
        transaction,
      });
      await transaction.commit();
      logger.log("info", "GET_ALL_SEGMENT", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.body.status_code = 200;
      res.body.response = allSegments;
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "GET_ALL_SEGMENT", {
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

  //Merchant create campaign
  this.createCampaign = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    let {
      campaignName,
      channel,
      emailTemplateId,
      segmentId,
      mailChimpSegmentId,
      emailSubject,
      senderEmail,
      senderName,
    } = req.body;
    try {
      const alreadyExist = await dbConn.instance.Campaign.findOne({
        where: {
          name: campaignName,
        },
      });
      if (alreadyExist) {
        res.body.status_code = 409;
        res.body.response = "Campaign with this name already exist";
        return res.status(res.body.status_code).send(res.body);
      }

      const client = await mailChimpService.connectToMailChimp(req.user.id);

      let template;
      if (emailTemplateId) {
        template = await dbConn.instance.CampaignEmailTemplate.findByPk(
          emailTemplateId,
          { raw: true }
        );
      }
      if (template) {
        const campaignId = await mailChimpService.createCampaign({
          client, //Represent merchant mailchimp account credentials
          campaignName,
          emailSubject,
          mailChimpSegmentId,
          senderEmail,
          senderName,
          html: template.html,
          scheduleTime: req.body.scheduleTime ? req.body.scheduleTime : null,
        });

        if (campaignId) {
          const merchantIs = await dbConn.instance.MerchantUsers.findOne({
            where: {
              userId: req.user.id,
            },
          });

          let campaignSentDetail;
          if (client?.config.apiKey && client?.config?.server) {
            campaignSentDetail =
              await mailChimpService.getCampaignsInLast30Days(
                client,
                campaignId
              );
          }

          await dbConn.instance.Campaign.create(
            {
              merchantUserId: req.user.id,
              merchantId: merchantIs.merchantId,
              name: campaignName,
              communicationChannel: channel,
              emailTemplateId: emailTemplateId,
              segmentId: segmentId,
              mailChimpCampaignId: campaignId,
              emailSubject,
              senderEmail,
              senderName,
              isScheduled: req.body.scheduleTime ? true : false,
              campaignScheduleTime: req.body.scheduleTime
                ? req.body.scheduleTime
                : Sequelize.literal("CURRENT_TIMESTAMP"),
              sentCount: campaignSentDetail?.emails_sent || 0,
            },
            { transaction }
          );
          await transaction.commit();
          logger.log("info", "CREATE_CAMPAIGN", {
            payload: {
              request: null,
              user: req.user.email,
              response:
                res.body.status_code == 200 ? { status_code: 200 } : res.body,
              ipAddress: req.ip,
            },
          });
          res.body.status_code = 200;
          res.body.response = "Campaign Created";
          res.status(res.body.status_code).send(res.body);
        }
      } else {
        res.body.status_code = 404;
        res.body.response = "Template not found";
        return res.status(res.body.status_code).send(res.body);
      }
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "CREATE_CAMPAIGN", {
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

  //Merchant get all campaigns
  this.getAllCampaigns = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let allCampaigns = await dbConn.instance.Campaign.findAll({
        attributes: [
          "id",
          "name",
          "mailChimpCampaignId",
          "senderName",
          "createdAt",
        ],
        transaction,
        include: [
          {
            model: dbConn.instance.CampaignEmailTemplate,
            as: "emailTemplateInfo",
          },
          {
            model: dbConn.instance.Segment,
            as: "segmentInfo",
          },
        ],
        where: {
          merchantUserId: req.user.id,
        },
      });

      await transaction.commit();
      logger.log("info", "GET_ALL_CAMPAIGNS", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.body.status_code = 200;
      res.body.response = allCampaigns;
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "GET_ALL_CAMPAIGNS", {
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

  //Merchant create the email template
  this.createEmailTemplate = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let { name, description, html } = req.body;
      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });
      const alreadyExist = await dbConn.instance.CampaignEmailTemplate.findOne({
        where: {
          name: name,
        },
      });
      if (alreadyExist) {
        res.body.status_code = 409;
        res.body.response = "Template with this name already exists";
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.CampaignEmailTemplate.create(
        {
          merchantUserId: req.user.id,
          merchantId: merchantIs.merchantId,
          name,
          description,
          html,
        },
        { transaction }
      );
      await transaction.commit();
      res.body.status_code = 200;
      res.body.response = "Template Created";
      logger.log("info", "EMAIL_TEMPLATE", {
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
      logger.log("error", "EMAIL_TEMPLATE", {
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

  //Merchant editing the email templates
  this.editEmailTemplate = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    const { id } = req.params;
    try {
      let { name, description, html } = req.body;
      const alreadyExist = await dbConn.instance.CampaignEmailTemplate.findOne({
        where: {
          id: id,
        },
      });
      if (!alreadyExist) {
        res.body.status_code = 4094;
        res.body.response = "Template don't exists";
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.CampaignEmailTemplate.update(
        {
          name,
          description,
          html,
        },
        {
          where: { id: id },
        },
        { transaction }
      );
      await transaction.commit();
      res.body.status_code = 200;
      res.body.response = "Template edited";
      logger.log("info", "EDIT_EMAIL_TEMPLATE", {
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
      logger.log("error", "EDIT_EMAIL_TEMPLATE", {
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

  //Merchant getting all the email template created
  this.getAllEmailTemplates = async function (req, res) {
    try {
      let transaction = await dbConn.instance.sequelize.transaction();
      let allEmailTemplates =
        await dbConn.instance.CampaignEmailTemplate.findAll({
          where: {
            merchantUserId: req.user.id,
          },
          transaction,
        });

      res.body.status_code = 200;
      res.body.response = allEmailTemplates;
      logger.log("info", "GET_ALL_EMAIL_TEMPLATE", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "GET_ALL_EMAIL_TEMPLATE", {
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

  //Merchant getting all the email template created
  this.getEmailTemplate = async function (req, res) {
    try {
      const { id } = req.params;
      let transaction = await dbConn.instance.sequelize.transaction();
      let singleTemplate = await dbConn.instance.CampaignEmailTemplate.findOne({
        where: {
          id: id,
        },
        transaction,
      });
      if (!singleTemplate) {
        res.body.status_code = 404;
        res.body.response = "Template not found";
        logger.log("info", "GET_EMAIL_TEMPLATE", {
          payload: {
            request: null,
            user: req.user.email,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
      }
      res.body.status_code = 200;
      res.body.response = singleTemplate;
      logger.log("info", "GET_EMAIL_TEMPLATE", {
        payload: {
          request: null,
          user: req.user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "GET_EMAIL_TEMPLATE", {
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

  //Merchant creating the journey either scheduled/now
  this.createCampaignJourney = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let { name, description, segmentId, journeySteps } = req.body;

      const merchantIs = await dbConn.instance.MerchantUsers.findOne({
        where: {
          userId: req.user.id,
        },
      });

      const alreadyExist = await dbConn.instance.Journey.findOne({
        where: {
          name,
        },
      });
      if (alreadyExist) {
        res.body.status_code = 409;
        res.body.response = "Journey with this name already exists";
        return res.status(res.body.status_code).send(res.body);
      }
      await dbConn.instance.Journey.create(
        {
          merchantUserId: req.user.id,
          merchantId: merchantIs.merchantId,
          name,
          description,
          segmentId,
          journeySteps,
        },
        { transaction, raw: true }
      );
      await transaction.commit();
      res.body.status_code = 200;
      res.body.response = "Journey Created";
      logger.log("info", "CREATE_JOURNEY", {
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
      logger.log("error", "CREATE_JOURNEY", {
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

  //Merchant getting all the journeys
  this.getCampaignJourney = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      const allJourneys = await dbConn.instance.Journey.findAll({
        attributes: [
          "id",
          "name",
          "description",
          "successfulExecution",
          "failedExecution",
          "createdAt",
        ],
        where: {
          merchantUserId: req.user.id,
        },
        transaction,
      });
      await transaction.commit();
      res.body.status_code = 200;
      res.body.response = allJourneys;
      logger.log("info", "GET_ALL_JOURNEY", {
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
      logger.log("error", "GET_ALL_JOURNEY", {
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

  //Executing the journeys using sendgrid either scheduled or now
  this.executeCampaignJourney = async function (req, res) {
    let transaction = await dbConn.instance.sequelize.transaction();
    const { id } = req.params;
    const { scheduleTime } = req.body;
    try {
      let journey = await dbConn.instance.Journey.findByPk(id, { raw: true });
      let segmentUsersEmail;
      if (journey) {
        segmentUsersEmail = await dbConn.instance.Segment.findByPk(
          journey.segmentId,
          {
            include: [
              {
                model: dbConn.instance.User,
                as: "users",
                attributes: ["id", "email", "first_name"],
                through: { attributes: [] },
              },
            ],
            transaction,
          }
        );
        segmentUsersEmail = segmentUsersEmail.users.map((user) => user?.email);
        await executeJourney({
          journey,
          scheduleTime,
          segmentUsersEmail,
          transaction,
        });
        await transaction.commit();
        res.body.status_code = 200;
        res.body.response = "Journey executed";
        logger.log("info", "EXECUTE_JOURNEY", {
          payload: {
            request: null,
            user: req.user.email,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
        res.status(res.body.status_code).send(res.body);
      }
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "EXECUTE_JOURNEY", {
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

  //Checking the account plan of the mailchimp either paid/free, if paid than allow scheduling of campaigns in mailchimp
  this.getAccountInfo = async function (req, res) {
    try {
      const accountDetail = await mailChimpService.accountPlanInfo(req.user.id);
      res.body.status_code = 200;
      res.body.response = accountDetail;
      return res.status(res.body.status_code).send(res.body);
    } catch (err) {
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  //To get the credentials of stripo
  // this.getStripoCredentials = async function (req, res) {
  //   try {
  //     const stripoPluginId = process.env.STRIPO_PLUGIN_ID;
  //     const stripoApiKey = process.env.STRIPO_API_KEY;
  //     let stripoCredentials = {
  //       stripoPluginId,
  //       stripoApiKey,
  //     };
  //     res.body.status_code = 200;
  //     res.body.response = stripoCredentials;
  //     logger.log("info", "GET_STRIPO_CREDENTIALS", {
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
  //     await transaction.rollback();
  //     logger.log("error", "GET_STRIPO_CREDENTIALS", {
  //       payload: {
  //         request: null,
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
}

module.exports = new CampaignService();
