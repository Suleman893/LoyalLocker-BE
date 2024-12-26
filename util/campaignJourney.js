const cron = require("node-cron");
const dbConn = require("../services/databaseConnection");
const Sequelize = require("sequelize");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function convertTimeStampToCron(timestamp) {
  const date = new Date(timestamp);
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // Month is zero-based
  const dayOfWeek = date.getDay(); // 0 represents Sunday
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
}

async function sendEmail(templateId, segmentUsersEmails) {
  try {
    const template = await dbConn.instance.CampaignEmailTemplate.findByPk(
      templateId,
      { raw: true }
    );
    const email = {
      to: segmentUsersEmails,
      from: process.env.SENDGRID_USER_EMAIL,
      subject: "Loyal locker",
      text: "Loyal locker",
      html: template?.html,
    };
    await sgMail.send(email);
  } catch (error) {
    console.log(error?.response.body.errors);
    throw new Error("Failed to send email");
  }
}

async function sendSms(templateId, segmentUsersEmail) {
  try {
    // console.log("Sending sms");
  } catch (error) {
    throw new Error("Error sending sms");
  }
}

const processJourneyStep = async (step, segmentUsersEmail) => {
  const { emailTemplateId, actionType, delay } = step;
  if (delay >= 0) {
    setTimeout(async () => {
      if (actionType === "email") {
        await sendEmail(emailTemplateId, segmentUsersEmail);
      } else {
        await sendSms();
      }
    }, delay);
  } else {
    if (actionType === "email") {
      await sendEmail(emailTemplateId, segmentUsersEmail);
    } else {
      await sendSms();
    }
  }
};

const scheduleJourneySteps = async (journey, segmentUsersEmail) => {
  const stepsCombined = [];
  for (let i = 0; i < journey.journeySteps.length - 1; i++) {
    if (
      journey.journeySteps[i].actionId === journey.journeySteps[i + 1].actionId
    ) {
      const emailTemplateId = journey.journeySteps[i].emailTemplateId;
      const actionType = journey.journeySteps[i].actionType;
      const delay = journey.journeySteps[i + 1].time;
      stepsCombined.push({ emailTemplateId, actionType, delay });
    }
  }
  for (const step of stepsCombined) {
    await processJourneyStep(step, segmentUsersEmail);
  }
};

module.exports = async function executeJourney({
  journey,
  scheduleTime,
  segmentUsersEmail,
  transaction,
}) {
  const journeyInstance = await dbConn.instance.Journey.findByPk(journey.id);
  try {
    await dbConn.instance.JourneySchedule.create(
      {
        journeyId: journey.id,
        journeyScheduleTime:
          scheduleTime ?? Sequelize.literal("CURRENT_TIMESTAMP"),
        isScheduled: scheduleTime ? true : false,
      },
      {
        transaction,
      }
    );
    if (scheduleTime) {
      const scheduleTimeCronExpression = convertTimeStampToCron(scheduleTime);
      cron.schedule(scheduleTimeCronExpression, async () => {
        await scheduleJourneySteps(journey, segmentUsersEmail);
      });
    } else {
      await scheduleJourneySteps(journey, segmentUsersEmail);
    }
    await journeyInstance.successfulExecutionCount();
  } catch (error) {
    await journeyInstance.failedExecutionCount();
    throw new Error("Journey execution failed");
  }
};
