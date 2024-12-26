const dbConn = require("./databaseConnection");
const constants = require("../constants.js");
const { uuid } = require("uuidv4");
const appUtils = require("../util/appUtil");
const Sequelize = require("sequelize");
const logger = require("../util/logger");
const bcrypt = require("bcrypt");
const sendPoints = require("../util/blockChain.js");
const { bucketUploader } = require("../util/fileUpload.js");

function AuthService() {
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

  this.getUserRole = async function (id) {
    let roleIs = null;
    const userRole = await dbConn.instance.UserRoles.findOne({
      where: { id: id },
      attributes: ["role"],
    });
    if (userRole) {
      switch (userRole.role) {
        case 1:
          roleIs = "ROLE_ADMIN";
          break;
        case 2:
          roleIs = "ROLE_MERCHANT";
          break;
        case 3:
          roleIs = "ROLE_USER";
          break;
        default:
          roleIs = "UNKNOWN_ROLE";
      }
    }
    return roleIs;
  };

  this.registerUser = async function (req, res, role) {
    const parsedBody = JSON.parse(JSON.stringify(req.body));
    let user = parsedBody;
    let responseObj = {};
    if (user.mobile != null && user.mobile.length == 0) {
      user.mobile = null;
    }
    if (user.email != null && user.email.length == 0) {
      user.email = null;
    }
    user.status = appUtils.STATUS.INACTIVE;
    user.role = role;
    user.setRegisterToken = true;
    let transaction;
    transaction = await dbConn.instance.sequelize.transaction();
    try {
      let userObj = await dbConn.instance.User.findOne(
        {
          attributes: ["id"],
          where: {
            [Sequelize.Op.or]: [
              {
                [Sequelize.Op.and]: [
                  {
                    email: {
                      [Sequelize.Op.eq]: user.email,
                    },
                  },
                  {
                    email: {
                      [Sequelize.Op.ne]: "",
                    },
                  },
                ],
              },
              {
                [Sequelize.Op.and]: [
                  {
                    mobile: {
                      [Sequelize.Op.eq]: user.mobile,
                    },
                  },
                  {
                    mobile: {
                      [Sequelize.Op.ne]: "",
                    },
                  },
                ],
              },
            ],
          },
        },
        { transaction }
      );

      if (userObj == null) {
        let file;
        let bucketResp;
        if (req.file) {
          file = req.file;
          bucketResp = await bucketUploader("file", file, "user");
          user.profilePic = bucketResp;
        }

        // if (user.referredByReferralCode) {
        //   const referredByMerchant = await dbConn.instance.User.findOne({
        //     referralCode: user.referredByReferralCode,
        //   });
        //   user.referredBy = referredByMerchant.id;
        // }

        user.password = await bcrypt.hash(user.password, 10);
        user = await dbConn.instance.User.create(user, { transaction });
        responseObj.user = user;
        responseObj.status_code = 200;
        responseObj.response = "Registration confirmation email triggered";
        let backendURL;
        if (parsedBody?.referredByReferralCode) {
          backendURL =
            process.env.NODE_ENV === "dev"
              ? `${process.env.BACKEND_DEV_URL}${constants.baseAPIPath}/auth/register-email-validate/${user?.registrationToken}/${req.body?.referredByReferralCode}`
              : `${process.env.BACKEND_LIVE_URL}${constants.baseAPIPath}/auth/register-email-validate/${user?.registrationToken}/${req.body?.referredByReferralCode}`;
        } else {
          backendURL =
            process.env.NODE_ENV === "dev"
              ? `${process.env.BACKEND_DEV_URL}${constants.baseAPIPath}/auth/register-email-validate/${user?.registrationToken}`
              : `${process.env.BACKEND_LIVE_URL}${constants.baseAPIPath}/auth/register-email-validate/${user?.registrationToken}`;
        }
        const message = `
          <b>Thank you for registering! Please click the following link to verify your account and earn points</b>
          <p><a href="${backendURL}" style="text-decoration: none; background-color: #4CAF50; color: white; padding: 10px 15px; border-radius: 5px; display: inline-block;">Activate Account</a></p>
          <br/>
          <p>If you did not register on loyal locker platform, please disregard this email.</p>
        `;
        await appUtils.sendMail(user, "Registration verification", message);
      } else {
        responseObj.status_code = 403;
        responseObj.response = "Email/Mobile already registered";
      }
      await transaction.commit();
      res.status(responseObj.status_code).send(responseObj);
    } catch (err) {
      await transaction.rollback();
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  this.registerValidateEmail = async function (req, res, role) {
    let { registrationToken, referredByReferralCode } = req.params;
    try {
      let user = await dbConn.instance.User.findOne({
        where: { registrationToken: registrationToken },
      });
      if (user == null) {
        res.body.status_code = 401;
        res.body.response = "Invalid Token";
      } else {
        user.status = appUtils.STATUS.ACTIVE;
        if (referredByReferralCode) {
          const referredByUser = await dbConn.instance.User.findOne({
            where: {
              referralCode: referredByReferralCode,
            },
          });
          user.invitedBy = referredByUser.id;
          //To find the role to check who referred if consumer or role 3 than admin will transfer points
          let { role } = await dbConn.instance.UserRoles.findOne({
            where: {
              userId: referredByUser.id,
            },
            raw: true,
          });
          if (role === 3) {
            //Role 3 belongs to consumer so check if member refer another member so now admin will transfer points
            let platformReferralPoints = 30;
            let { id: adminId } = await dbConn.instance.UserRoles.findOne({
              where: {
                role: 1,
              },
              raw: true,
            });
            const transferHash = await sendPoints({
              points: platformReferralPoints,
              consumerId: parseInt(user.id),
              transferType: "EARNED",
              description: "Referred by friend",
              // expiresAt: ruleExist.endAt - new Date(),
            });
            if (transferHash) {
              let transferRecord = {
                description: "Referred by friend",
                consumerId: parseInt(user.id),
                transferType: "EARNED",
                pointStatus: "ACTIVE",
                pointsExpiry: null,
                points: platformReferralPoints,
                loyaltyNumber: platformReferralPoints,
                transferHash: transferHash,
                adminId: adminId,
              };
              await dbConn.instance.PointTransfer.create(transferRecord);
              await dbConn.instance.ReferFriend.update(
                {
                  pointsEarned: platformReferralPoints,
                },
                {
                  where: {
                    email: user.email,
                  },
                }
              );
              await dbConn.instance.TotalConsumerBalance.create({
                consumerId: user.id,
                totalBalance: platformReferralPoints,
              });
            }
          } else if (role === 2) {
            //Means merchant referred
            let query = {
              merchantUserId: parseInt(referredByUser.id),
              status: "ALWAYS_ACTIVE",
            };
            const ruleExist = await dbConn.instance.EarningRules.findOne({
              where: query,
              include: [
                {
                  model: dbConn.instance.Events,
                  as: "eventInfo",
                  where: {
                    name: "Referral",
                    status: "ACTIVE",
                  },
                },
              ],
            });
            if (
              ruleExist &&
              ruleExist?.points &&
              ruleExist?.status === "ALWAYS_ACTIVE"
            ) {
              const transferHash = await sendPoints({
                points: ruleExist.points,
                consumerId: parseInt(user.id),
                transferType: "EARNED",
                description: `Earned from rule ${ruleExist?.name}`,
              });
              if (transferHash) {
                let merchantObj = await getMerchantObject(referredByUser.id);
                let transferRecord = {
                  description:
                    ruleExist?.description ||
                    "Points transfer based on referral rule",
                  consumerId: parseInt(user.id),
                  transferType: "EARNED",
                  pointStatus: ruleExist.status,
                  pointsExpiry: null,
                  points: ruleExist.points,
                  loyaltyNumber: ruleExist.points,
                  transferHash: transferHash,
                  merchantUserId: referredByUser.id,
                  merchantId: merchantObj.id,
                };
                await dbConn.instance.PointTransfer.create(transferRecord);
                await dbConn.instance.TotalConsumerBalance.create({
                  consumerId: user.id,
                  totalBalance: ruleExist.points,
                });
              }
            }
          }
        }
        user.registrationToken = null;
        await user.save();
        // await mailChimpService.addMemberToList(user);
        const frontEndURL =
          process.env.NODE_ENV === "dev"
            ? process.env.FRONTEND_DEV_URL
            : process.env.FRONTEND_LIVE_URL;

        res.status(res.body.status_code).send(`
      <html>
      <head>
        <title>Account Activated </title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            text-align: center;
          }
          .container {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
          }
          h1 {
            color: #333333;
          }
          p {
            color: #555555;
            margin-bottom: 20px;
          }
          a {
            text-decoration: none;
            color: #ffffff;
            background-color: #4CAF50;
            padding: 10px 15px;
            border-radius: 5px;
            display: inline-block;
          }
          a:hover {
            background-color: #45a049;
          }
          .note {
            font-weight: bold;
            color: #777777;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Account Activated</h1>
          <p>Your account has been activated. Please proceed to <a href=${frontEndURL}>login</a>.</p>
        </div>
      </body>
      </html>
      `);

        logger.log("info", "REGISTER_EMAIL_VALIDATE", {
          payload: {
            request: registrationToken,
            response:
              res.body.status_code == 200 ? { status_code: 200 } : res.body,
            ipAddress: req.ip,
          },
        });
      }
    } catch (err) {
      logger.log("error", "REGISTER_EMAIL_VALIDATE", {
        payload: {
          request: null,
          response: err,
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

  this.forgotPassword = async function (req, res) {
    let useremail = req.params.email;
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let user = await dbConn.instance.User.findOne(
        {
          attributes: ["id", "firstName", "email", "status"],
          where: { email: useremail },
        },
        { transaction }
      );

      if (user != null && user.status == appUtils.STATUS.ACTIVE) {
        user.resetPasswordToken = uuid();
        const backendURL =
          process.env.NODE_ENV === "dev"
            ? `${process.env.BACKEND_DEV_URL}${constants.baseAPIPath}/auth/validate-forgot-password-token/${user?.resetPasswordToken}`
            : `${process.env.BACKEND_LIVE_URL}${constants.baseAPIPath}/auth/validate-forgot-password-token/${user?.resetPasswordToken}`;

        await user.save({ transaction });
        const message = `
         <b>Click the following link to proceed to reset your password:</b>
         <p><a href=${backendURL} style="text-decoration: none; background-color: #4CAF50; color: white; padding: 10px 15px; border-radius: 5px; display: inline-block;">Reset Password</a></p>
         <br/>
         <p>If you did not request a password reset, please disregard this email.</p>`;
        await appUtils.sendMail(user, "Reset your password", message);
        res.body.response = "Email triggered";
      } else {
        res.body.status_code = 403;
        res.body.response = "Email not registered or inactive";
      }
      await transaction.commit();
      logger.log("info", "FORGOT_PASSWORD", {
        payload: {
          request: null,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "FORGOT_PASSWORD", {
        payload: {
          request: null,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  this.validateForgotPasswordToken = async function (req, res) {
    const frontEndURL =
      process.env.NODE_ENV === "dev"
        ? process.env.FRONTEND_DEV_URL
        : process.env.FRONTEND_LIVE_URL;

    let forgotPasswordToken = req.params.forgotPasswordToken;
    let user = await dbConn.instance.User.findOne({
      attributes: ["id"],
      where: { resetPasswordToken: forgotPasswordToken },
    });
    if (user == null) {
      res.body.status_code = 401;
      res.body.response = "Invalid Token";
    } else {
      res.body.response = true;
      res.redirect(`${frontEndURL}/new_password/${forgotPasswordToken}`);
    }
    logger.log("info", "VALIDATE_FORGOT_PASSWORD_TOKEN", {
      payload: {
        request: { token: forgotPasswordToken },
        response: res.body.status_code == 200 ? { status_code: 200 } : res.body,
        ipAddress: req.ip,
      },
    });
  };

  this.resetPassword = async function (req, res) {
    let forgotPasswordToken = req.params.forgotPasswordToken;
    let transaction = await dbConn.instance.sequelize.transaction();

    try {
      let user = await dbConn.instance.User.findOne(
        {
          attributes: ["id", "password"],
          where: { resetPasswordToken: forgotPasswordToken },
        },
        { transaction }
      );
      if (user == null) {
        res.body.status_code = 401;
        res.body.response = "Invalid token";
      } else {
        user.password = await bcrypt.hash(req.body.newPassword, 10);
        user.resetPasswordToken = null;
        await user.save({ transaction });
        res.body.response = "Password reset successfully";
      }
      await transaction.commit();
      logger.log("info", "RESET_PASSWORD", {
        payload: {
          request: null,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "RESET_PASSWORD", {
        payload: {
          request: null,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  this.changePassword = async function (req, res) {
    let user = req.user;
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      const { currentPassword, newPassword } = req.body;
      user = await dbConn.instance.User.findOne(
        {
          attributes: ["id", "email", "password"],
          where: { email: user.email },
        },
        { transaction }
      );
      const comparedPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (user === null || comparedPassword === false) {
        res.body.status_code = 403;
        res.body.response = "Invalid current password";
      } else {
        let newHashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = newHashedPassword;
        await user.save({ transaction });
        res.body.status_code = 200;
        res.body.response = "Password changed";
      }
      await transaction.commit();
      logger.log("info", "CHANGE_PASSWORD", {
        payload: {
          request: user.email,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      res.status(res.body.status_code).send(res.body);
    } catch (err) {
      await transaction.rollback();
      logger.log("error", "CHANGE_PASSWORD", {
        payload: {
          request: user.email,
          response: err.message,
          ipAddress: req.ip,
        },
      });
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };

  this.updateProfile = async function (req, res) {
    const user = JSON.parse(JSON.stringify(req.body));
    let file;
    let bucketResp;
    if (req.file) {
      file = req.file;
      // file = JSON.parse(JSON.stringify(req.file));
      bucketResp = await bucketUploader("file", file, "user");
    }
    let transaction = await dbConn.instance.sequelize.transaction();
    try {
      let updatedFields = {
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        gender: user.gender,
        country: user.country,
        dateOfBirth: user.dateOfBirth,
      };
      if (bucketResp.key) {
        updatedFields.profilePic = bucketResp;
      }
      await dbConn.instance.User.update(updatedFields, {
        where: { id: req.user.id },
        transaction: transaction,
      });
      const updatedUser = await dbConn.instance.User.findOne({
        attributes: [
          "id",
          "firstName",
          "lastName",
          "email",
          "mobile",
          "gender",
          "country",
          "dateOfBirth",
          "gender",
          "profilePic",
        ],
        where: { id: req.user.id },
        transaction: transaction,
      });
      const roleIs = await this.getUserRole(updatedUser.id);
      updatedUser.role = roleIs;
      res.body.response = updatedUser;
      res.body.status_code = 200;
      await transaction.commit();
      logger.log("info", "UPDATE_PROFILE", {
        payload: {
          request: null,
          response:
            res.body.status_code == 200 ? { status_code: 200 } : res.body,
          ipAddress: req.ip,
        },
      });
      return res.status(200).send(res.body);
    } catch (err) {
      await transaction.rollback();
      return res
        .status(500)
        .send({ status_code: 500, message: "Internal Server Error" });
    }
  };
}

module.exports = new AuthService();
