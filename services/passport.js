const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const HeaderAPIKeyStrategy =
  require("passport-headerapikey").HeaderAPIKeyStrategy;
const dbConn = require("./databaseConnection");
var url = require("url");
const constants = require("../constants.js");
const appUtils = require("../util/appUtil");
const logger = require("../util/logger");
const bcrypt = require("bcrypt");
const { Sequelize } = require("sequelize");

passport.use(
  new LocalStrategy(
    {
      passReqToCallback: true,
    },
    async function (req, username, password, cb) {
      const lowercasedEmail = username.toLowerCase();
      // let captchaResponse = await appUtils.validateCaptcha(
      //   req.body["g-recaptcha-response"],
      //   req.connection.remoteAddress
      // );
      // if (!captchaResponse) {
      //   let err = { error: "CaptchaException: Invalid captcha" };
      //   logger.log("error", "LOGIN", {
      //     payload: { request: username, response: err, ipAddress: req.ip },
      //   });
      //   return cb(null, err);
      // }
      let roleType = getUserType(req);
      dbConn.instance.User.findOne({
        attributes: [
          "id",
          "loyaltyNumber",
          "email",
          "password",
          "gender",
          "mobile",
          "country",
          "dateOfBirth",
          "firstName",
          "lastName",
          "profilePic",
          "status",
          "referralCode",
        ],
        // where: { email: username },
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')), // Converts the stored email to lowercase
          lowercasedEmail // Compares it with the lowercased input email
        ),
        include: [
          {
            model: dbConn.instance.UserRoles,
            as: "userRoles",
            where: {
              role: roleType,
            },
          },
        ],
      })
        .then(async (user) => {
          if (user == null) {
            logger.log("error", "LOGIN", {
              payload: {
                request: username,
                role: roleType,
                response: "User not found",
                ipAddress: req.ip,
              },
            });
            return cb(null, false);
          }
          if (user.status == appUtils.STATUS.ACTIVE) {
            const passwordVerification = await bcrypt.compare(
              password,
              user.password
            );
            if (user == null || passwordVerification == false) {
              logger.log("error", "LOGIN", {
                payload: {
                  request: username,
                  role: roleType,
                  response: "Invalid password",
                  ipAddress: req.ip,
                },
              });
              return cb(null, false);
            } else {
              user.role = roleType;
              if (roleType == appUtils.ROLES.ROLE_MERCHANT) {
                // dbConn.instance.Merchant.findOne({
                //   attributes: ["id", "status"],
                //   include: [
                //     {
                //       model: dbConn.instance.MerchantUsers,
                //       as: "merchantUsers",
                //       where: { userId: user.id },
                //     },
                //   ],
                // }).then(async (merchant) => {
                //   console.log("The merchant", merchant);
                //   if (merchant.status == appUtils.STATUS.ACTIVE) {
                //     if (
                //       merchant.merchantUsers[0].storeId != null &&
                //       merchant.merchantUsers[0].storeId.length > 0
                //     ) {
                //       user.roleType = "REGULAR";
                //     }
                //     let userObject = appUtils.getUserObject(user);
                //     logger.log("info", "LOGIN", {
                //       payload: {
                //         request: user.email,
                //         role: roleType,
                //         response: { status_code: 200 },
                //         ipAddress: req.ip,
                //       },
                //     });
                //     return cb(null, userObject);
                //   } else {
                //     let err = {
                //       error: "UserException: Company is set as inactive",
                //     };
                //     logger.log("error", "LOGIN", {
                //       payload: {
                //         request: username,
                //         role: roleType,
                //         response: err,
                //         ipAddress: req.ip,
                //       },
                //     });
                //     return cb(null, err);
                //   }
                // });
                let userObject = appUtils.getUserObject(user);
                logger.log("info", "LOGIN", {
                  payload: {
                    request: user.email,
                    role: roleType,
                    response: { status_code: 200 },
                    ipAddress: req.ip,
                  },
                });
                return cb(null, userObject);
              } else {
                let userObject = appUtils.getUserObject(user);
                logger.log("info", "LOGIN", {
                  payload: {
                    request: user.email,
                    role: roleType,
                    response: { status_code: 200 },
                    ipAddress: req.ip,
                  },
                });
                return cb(null, userObject);
              }
            }
          } else {
            let err = { error: "Account is set as inactive" };
            logger.log("error", "LOGIN", {
              payload: {
                request: username,
                role: roleType,
                response: err,
                ipAddress: req.ip,
              },
            });
            return cb(null, err);
          }
        })
        .catch((err) => {
          console.log("The err", err.message);
        });
    }
  )
);

// passport.use(
//   new HeaderAPIKeyStrategy(
//     { header: "Authorization", prefix: "Api-Key " },
//     false,
//     function (apikey, cb) {
//       dbConn.instance.User.findOne({
//         attributes: [
//           "id",
//           "loyaltyNumber",
//           "email",
//           "firstName",
//           "lastName",
//           "status",
//         ],
//         where: { apiKey: apikey },
//         include: [
//           {
//             model: dbConn.instance.UserRoles,
//             as: "userRoles",
//             where: {
//               role: appUtils.ROLES.ROLE_MERCHANT,
//             },
//           },
//         ],
//       }).then(async (user) => {
//         if (user == null || user.status == appUtils.STATUS.INACTIVE) {
//           logger.log("error", "API_LOGIN", {
//             payload: { request: user.email, response: "User Inactive" },
//           });
//           return cb(null, false);
//         } else {
//           user.role = appUtils.ROLES.ROLE_MERCHANT;
//           dbConn.instance.Merchant.findOne({
//             attributes: ["id", "status"],
//             include: [
//               {
//                 model: dbConn.instance.MerchantUsers,
//                 as: "merchantUsers",
//                 where: { userId: user.id },
//               },
//             ],
//           }).then(async (merchant) => {
//             if (merchant.status == appUtils.STATUS.ACTIVE) {
//               let userObject = appUtils.getUserObject(user);
//               logger.log("info", "API_LOGIN", {
//                 payload: {
//                   request: user.email,
//                   response: { status_code: 200 },
//                 },
//               });
//               return cb(null, userObject);
//             } else {
//               logger.log("error", "API_LOGIN", {
//                 payload: { request: user.email, response: "Merchant Inactive" },
//               });
//               return cb(null, false);
//             }
//           });
//         }
//       });
//     }
//   )
// );

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: `${constants.baseAPIPath}/auth/google/callback`,
//     },
//     (accessToken, refreshToken, profile, cb) => {
//       setSocialProfile(profile, cb, "google");
//     }
//   )
// );

// passport.use(
//   new FacebookStrategy(
//     {
//       clientID: process.env.FACEBOOK_CLIENT_ID,
//       clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
//       callbackURL: `${constants.baseAPIPath}/auth/facebook`,
//       profileFields: [
//         "id",
//         "displayName",
//         "photos",
//         "email",
//         "first_name",
//         "last_name",
//       ],
//       scope: ["email"],
//     },
//     function (accessToken, refreshToken, profile, cb) {
//       setSocialProfile(profile, cb, "fb");
//     }
//   )
// );

function getUserType(req) {
  let pathName = url.parse(req.url).pathname;
  if (pathName.includes("/auth/admin/login")) {
    return appUtils.ROLES.ROLE_ADMIN;
  } else if (pathName.includes("/auth/merchant/login")) {
    return appUtils.ROLES.ROLE_MERCHANT;
  } else {
    return appUtils.ROLES.ROLE_USER;
  }
}

function setSocialProfile(profile, cb, source) {
  let roleType = appUtils.ROLES.ROLE_USER;
  if (profile.emails.length > 0 && profile.emails[0].value.length > 0) {
    dbConn.instance.User.findOne({
      attributes: [
        "id",
        "loyaltyNumber",
        "email",
        "password",
        "firstName",
        "lastName",
        "profilePic",
        "status",
      ],
      where: { email: profile.emails[0].value },
      include: [
        {
          model: dbConn.instance.UserRoles,
          as: "userRoles",
          where: {
            role: roleType,
          },
        },
      ],
    }).then(async (user) => {
      if (user == null) {
        let userObj = {
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          status: appUtils.STATUS.ACTIVE,
          role: roleType,
        };
        if (source == "google") {
          userObj.googleSocialId = profile.id;
        } else {
          userObj.fbSocialId = profile.id;
        }
        if (profile.photos.length > 0 && profile.photos[0].value.length > 0) {
          userObj.photoUrl = profile.photos[0].value;
        }
        dbConn.instance.User.create(userObj).then(async (user) => {
          user.role = roleType;
          let userObject = appUtils.getUserObject(user);
          logger.log("info", source.toUpperCase() + "_LOGIN", {
            payload: { request: profile, response: { status_code: 200 } },
          });
          return cb(null, userObject);
        });
      } else {
        if (user.status == appUtils.STATUS.ACTIVE) {
          let userObject = appUtils.getUserObject(user);
          logger.log("info", source.toUpperCase() + "_LOGIN", {
            payload: { request: profile, response: { status_code: 200 } },
          });
          return cb(null, userObject);
        } else {
          let err = { error: "UserException: Account is set as inactive" };
          logger.log("error", source.toUpperCase() + "_LOGIN", {
            payload: { request: profile, response: err },
          });
          return cb(null, err);
        }
      }
    });
  } else {
    let err = {
      error:
        "SocialException: Either email permission is not provided or email could not be found",
    };
    logger.log("error", source.toUpperCase() + "_LOGIN", {
      payload: { request: profile, response: err },
    });
    return cb(null, err);
  }
}

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (user, cb) {
  cb(null, user);
});
