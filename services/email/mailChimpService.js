const axios = require("axios");
const crypto = require("crypto");
const client = require("@mailchimp/mailchimp_marketing");
const handleMailchimpError = require("../../util/mailChimpErrorHandler");
const dbConn = require("../databaseConnection");

function MailChimpService() {
  const baseUrl = process.env.MAIL_CHIMP_BASE_URL;
  const listId = process.env.MAIL_CHIMP_LIST_ID;
  const apiKey = process.env.MAIL_CHIMP_API_KEY;
  const serverPrefix = process.env.MAIL_CHIMP_SERVER_PREFIX;

  // client.setConfig({
  //   apiKey: apiKey,
  //   server: serverPrefix,
  // });

  client.setConfig({
    apiKey: null,
    server: null,
  });

  function getSubscriberHash(email) {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
  }

  //Logged in merchant connect to mailchimp
  this.connectToMailChimp = async function (loggedInMerchant) {
    const merchantIs = await dbConn.instance.Merchant.findOne({
      where: {
        primaryUser: loggedInMerchant,
      },
    });
    // const baseUrl = process.env.MAIL_CHIMP_BASE_URL;
    // const listId = process.env.MAIL_CHIMP_LIST_ID;
    // const apiKey = merchantIs.mailchimpApiKey;
    // const serverPrefix = merchantIs.mailchimpServerPrefix;
    client.setConfig({
      apiKey: merchantIs.mailchimpApiKey,
      server: merchantIs.mailchimpServerPrefix,
    });
    return client;
  };

  //Create Static Tags in mailchimp
  this.createStaticSegment = async function (
    client,
    segmentName,
    segmentEmails
  ) {
    try {
      const existingEmails = [];
      const newEmails = [];
      for (const email of segmentEmails) {
        const subscriberHash = getSubscriberHash(email);
        try {
          //Using 1st list in mailchimp account
          const mailchimpListId = await client.lists.getAllLists();
          const listId = mailchimpListId.lists[0].id;
          const memberInfo = await client.lists.getListMember(
            listId,
            subscriberHash
          );
          // If unsubscribed, update the status to subscribed else if unsubscribed or pending then cannot add to segment.
          if (memberInfo.status === "unsubscribed") {
            await client.lists.updateListMember(listId, subscriberHash, {
              status: "subscribed",
            });
          }
          existingEmails.push(email);
        } catch (memberError) {
          if (memberError.status === 404) {
            // Member does not exist, add it to the list
            newEmails.push(email);
          } else {
            handleMailchimpError(memberError);
          }
        }
      }
      //if not in list then add to list
      for (const newEmail of newEmails) {
        try {
          await client.lists.addListMember(listId, {
            email_address: newEmail,
            status: "subscribed",
          });
        } catch (err) {
          handleMailchimpError(err);
        }
      }
      const response = await client.lists.createSegment(listId, {
        name: segmentName,
        static_segment: segmentEmails,
      });
      return response.id;
    } catch (err) {
      handleMailchimpError(err);
    }
  };

  //Create the campaign with the specified segment users
  this.createCampaign = async function ({
    client,
    campaignName,
    emailSubject,
    mailChimpSegmentId,
    senderEmail,
    senderName,
    html,
    scheduleTime,
  }) {
    try {
      const mailchimpListId = await client.lists.getAllLists();
      const listId = mailchimpListId.lists[0].id;
      const response = await client.campaigns.create({
        type: "regular",
        recipients: {
          list_id: listId,
          segment_opts: {
            saved_segment_id: parseInt(mailChimpSegmentId),
          },
        },
        settings: {
          subject_line: emailSubject,
          title: campaignName,
          from_name: senderName,
          reply_to: senderEmail,
        },
      });
      const contentAdded = await this.addContentToCampaign(
        client,
        response.id,
        html,
        scheduleTime
      );
      if (contentAdded) {
        return response.id;
      }
    } catch (err) {
      handleMailchimpError(err);
    }
  };

  //Add the content to the campaign etc html
  this.addContentToCampaign = async function (
    client,
    campaignID,
    html,
    scheduleTime
  ) {
    try {
      const contentUpdated = await client.campaigns.setContent(campaignID, {
        html,
      });
      if (contentUpdated) {
        if (scheduleTime) {
          return await this.scheduleCampaign(client, campaignID, scheduleTime);
        } else {
          return await this.sendCampaign(client, campaignID);
        }
      } else {
        // Content not updated
        return false;
      }
    } catch (err) {
      handleMailchimpError(err);
    }
  };

  //Send campaign instantly
  this.sendCampaign = async function (client, campaignId) {
    try {
      await client.campaigns.send(campaignId);
      return true;
    } catch (err) {
      handleMailchimpError(err);
    }
  };

  //Schedule campaign
  this.scheduleCampaign = async function (client, campaignID, scheduleTime) {
    try {
      await client.campaigns.schedule(campaignID, {
        schedule_time: scheduleTime,
      });
      return true;
    } catch (err) {
      handleMailchimpError(err);
    }
  };

  this.checkMemberExistence = async function (email) {
    try {
      const subscriberHash = crypto
        .createHash("md5")
        .update(email.toLowerCase())
        .digest("hex");
      const res = await axios.get(
        `${baseUrl}/lists/${listId}/members/${subscriberHash}`,
        {
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            Authorization: `apiKey ${apiKey}`,
          },
        }
      );
      if (res.data.email_address === email && res.data.status === "subscribed")
        return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      } else {
        //Throw statement works despite of if/else
        // throw new Error(
        //   `Error checking member existence: ${error.response.status}`
        // );
      }
    }
  };

  this.addMemberToList = async function (user) {
    const memberData = {
      email_address: user?.email,
      status: "subscribed",
      merge_fields: {
        FNAME: user?.firstName,
        LNAME: user?.lastName,
      },
    };
    try {
      return await client.lists.addListMember(listId, memberData);
    } catch (error) {
      if (error.status === 400) {
        return true;
      } else handleMailchimpError(error);
    }
  };

  //Get Campaign Info
  this.getCampaignsInLast30Days = async function (client, campaignId) {
    try {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      const lastMonth = date.toISOString();
      // Fetch campaigns created in the last 30 days
      const response = await client.campaigns.list({
        since_create_time: lastMonth,
      });
      const campaigns = response.campaigns;
      // Find the specific campaign
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        const campaignDetail = await client.campaigns.get(campaignId);
        return campaignDetail;
      } else {
        console.log(
          "No campaign found in the last 30 days with the specified ID."
        );
      }
    } catch (error) {
      handleMailchimpError(err);
    }
  };

  //Get Account Pricing Plan Info
  this.accountPlanInfo = async function () {
    try {
      const accountInfo = await client.root.getRoot();
      return accountInfo?.pricing_plan_type;
    } catch (err) {
      handleMailchimpError(err);
    }
  };

  //---------------------------------------Dashboard related---------------------------------------

  //Using this to get the bounce rate for merchant dashboard
  this.getCampaignBounceRate = async function (campaignId) {
    try {
      const report = await client.reports.getCampaignReport(
        campaignId.toString()
      );
      return report?.bounces?.hard_bounces;
    } catch (err) {
      handleMailchimpError(err);
    }
  };
}

module.exports = new MailChimpService();
