const passport = require("passport");
const dbConn = require("../services/databaseConnection");
const axios = require("axios");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function AppUtils() {
  this.ROLES = Object.freeze({
    ROLE_ADMIN: 1,
    ROLE_MERCHANT: 2,
    ROLE_USER: 3,
  });

  this.STATUS = Object.freeze({
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
  });

  this.sendMail = async function (user, subject, message) {
    try {
      const email = {
        to: user?.email,
        from: "tunde@loyallocker.com",
        subject,
        text: "Loyal locker",
        html: message,
      };
      await sgMail.send(email);
    } catch (err) {
      throw new Error("Failed to send email");
    }
  };

  this.validateCaptcha = async function (token, remoteAddr) {
    if (process.env.NODE_ENV != "prod") {
      return true;
    }
    let retval = false;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}&remoteip=${remoteAddr}`;
    if (token != null) {
      let response = await axios({
        method: "get",
        url: url,
      });
      if (response.data.success !== undefined && response.data.success) {
        retval = true;
      }
    }
    return retval;
  };

  this.getUserObject = function (user, includeMobile) {
    user.role = Object.keys(this.ROLES).find(
      (key) => this.ROLES[key] === user.role
    );
    let obj = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profilePic: user.profilePic,
      referralCode: user.referralCode,
      mobile: user.mobile,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
    };
    if (user.hasOwnProperty("roleType")) {
      obj.roleType = user.roleType;
    }
    if (includeMobile == true) {
      obj.mobile = user.mobile;
    }

    return obj;
  };

  this.generateApiKey = function (length, chars) {
    var result = "";
    for (var i = length; i > 0; --i) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  this.checkCookie = function (req, res, next, data) {
    if (!req.user) {
      return res.status(401).send("User not found");
    }
    next();
  };

  // this.checkCookie = function (req, res, next, data) {
  //   if (req.headers.authorization == undefined) {
  //     if (req.user == null) {
  //       return res.status(401).send("unauthorized");
  //     } else {
  //       if (data != null) {
  //         if (typeof data == "number") {
  //           if (
  //             Object.keys(this.ROLES).find((key) => this.ROLES[key] === data) !=
  //             req.user.role
  //           ) {
  //             return res.status(401).send("unauthorized");
  //           }
  //         } else if (Array.isArray(data)) {
  //           let found = false;
  //           for (const str of data) {
  //             if (
  //               Object.keys(this.ROLES).find(
  //                 (key) => this.ROLES[key] === str
  //               ) === req.user.role
  //             ) {
  //               found = true;
  //               break;
  //             }
  //           }
  //           if (!found) {
  //             return res.status(401).send("unauthorized");
  //           }
  //         } else {
  //           return res.status(401).send("unauthorized");
  //         }
  //       }
  //       dbConn.instance.User.findOne({
  //         attributes: ["id", "status"],
  //         where: { id: req.user.id },
  //       }).then(async (user) => {
  //         if (user.status == this.STATUS.ACTIVE) {
  //           // if (data == this.ROLES.ROLE_MERCHANT) {
  //           //   dbConn.instance.Merchant.findOne({
  //           //     attributes: ["id", "status"],
  //           //     include: [
  //           //       {
  //           //         model: dbConn.instance.MerchantUsers,
  //           //         as: "merchantUsers",
  //           //         where: { userId: user.id },
  //           //       },
  //           //     ],
  //           //   }).then(async (merchant) => {
  //           //     if (merchant.status == this.STATUS.ACTIVE) {
  //           //       next();
  //           //     } else {
  //           //       return res.status(401).send("unauthorized");
  //           //     }
  //           //   });
  //           // } else {
  //           next();
  //           // }
  //         } else {
  //           return res.status(401).send("unauthorized");
  //         }
  //       });
  //     }
  //   } else {
  //     passport.authenticate(
  //       "headerapikey",
  //       { session: false },
  //       function (err, user, info) {
  //         if (err) {
  //           return next(err);
  //         }
  //         if (!user) {
  //           return res.status(401).send("Unauthorised").end();
  //         }
  //         req.user = user;
  //         next();
  //       }
  //     )(req, res, next);
  //   }
  // };
}

module.exports = new AppUtils();
