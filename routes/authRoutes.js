const passport = require("passport");
const { check, validationResult } = require("express-validator");
const constants = require("../constants.js");
const authService = require("../services/authService");
const validator = require("../util/validator");
const appUtils = require("../util/appUtil");
const logger = require("../util/logger");
const { upload } = require("../util/multer.js");

module.exports = (app) => {
  //Specific to consumer registration
  app.post(
    `${constants.baseAPIPath}/auth/register`,
    upload.single("photoUrl"),
    [
      check(
        "firstName",
        "must be at least 2 chars and max 30 chars long"
      ).isLength({ min: 2, max: 30 }),
      check("lastName", "must be max 30 chars long")
        .optional()
        .isLength({ min: 2, max: 30 }),
      check("email", "must be a valid email and max 60 chars long")
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
      check(
        "password",
        "must be at least 8 chars and max 25 chars long"
      ).isLength({ min: 8, max: 25 }),
      check("gender", "must be either M/F/U")
        .isLength({ min: 1 })
        .isIn(["M", "F", "U"]),
      check("mobile", "Mobile number is required").notEmpty(),
      check("country", "must be at set to US").custom(validator.isValidCountry),
      check("dateOfBirth", "must be a valid date format yyyy-mm-dd").custom(
        validator.isValidDate
      ),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await authService.registerUser(req, res, appUtils.ROLES.ROLE_USER);
    }
  );

  //To make user active and allow to login, referral rule apply here.
  app.get(
    `${constants.baseAPIPath}/auth/register-email-validate/:registrationToken/:referredByReferralCode?`,
    [
      check("registrationToken", "must be valid token with min 35 char")
        .trim()
        .isLength({ min: 35 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await authService.registerValidateEmail(
        req,
        res,
        appUtils.ROLES.ROLE_USER
      );
    }
  );

  //Specific to consumer login
  app.post(
    `${constants.baseAPIPath}/auth/login`,
    [
      check(
        "username",
        "must be a valid email and min 5 chars and max 60 chars long"
      )
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
      check(
        "password",
        "must be at least 8 chars and max 25 chars long"
      ).isLength({ min: 8, max: 25 }),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      next();
    },
    passport.authenticate("local"),
    (req, res) => {
      res.status(200).send(req.user);
    }
  );

  //Specific to merchant login
  app.post(
    `${constants.baseAPIPath}/auth/merchant/login`,
    [
      check(
        "username",
        "must be a valid email and min 5 chars and max 60 chars long"
      )
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
      check(
        "password",
        "must be at least 8 chars and max 25 chars long"
      ).isLength({ min: 8, max: 25 }),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      next();
    },
    passport.authenticate("local"),
    (req, res) => {
      res.status(200).send(req.user);
    }
  );

  //Specific to admin login
  app.post(
    `${constants.baseAPIPath}/auth/admin/login`,
    [
      check(
        "username",
        "must be a valid email and min 5 chars and max 60 chars long"
      )
        .isEmail()
        .trim()
        .isLength({ min: 5, max: 60 }),
      check(
        "password",
        "must be at least 8 chars and max 25 chars long"
      ).isLength({ min: 8, max: 25 }),
    ],
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      next();
    },
    passport.authenticate("local"),
    (req, res) => {
      res.status(200).send(req.user);
    }
  );

  //Logout from frontend and revoke the cookie
  app.get(`${constants.baseAPIPath}/auth/logout`, (req, res) => {
    if (req.user != null) {
      logger.log("info", "LOGOUT", {
        payload: {
          request: { email: req.user.email },
          response: { status_code: 200 },
          ipAddress: req.ip,
        },
      });
      req.logout();
      res.clearCookie("sessionId");
    }
    res.send(true);
  });

  //For reset password STEP-1
  app.get(
    `${constants.baseAPIPath}/auth/forgot-password/:email`,
    async (req, res) => {
      if (req.params.email == null || req.params.email.trim().length == 0) {
        res.body.status_code = 422;
        res.body.response = {
          errors: [
            {
              value: "email must not be empty",
              msg: "email must not be empty",
              param: "email",
              location: "path",
            },
          ],
        };
        return res.status(422).send(res.body);
      }
      await authService.forgotPassword(req, res);
    }
  );

  //For reset password STEP-2 (validating the forgot password token)
  app.get(
    `${constants.baseAPIPath}/auth/validate-forgot-password-token/:forgotPasswordToken`,
    async (req, res) => {
      if (
        req.params.forgotPasswordToken == null ||
        req.params.forgotPasswordToken.trim().length == 0
      ) {
        res.body.status_code = 422;
        res.body.response = {
          errors: [
            {
              value: "token must not be empty",
              msg: "token must not be empty",
              param: "forgotPasswordToken",
              location: "path",
            },
          ],
        };
        return res.status(422).send(res.body);
      }
      await authService.validateForgotPasswordToken(req, res);
    }
  );

  //For reset password STEP-3 (validating the forgot password token and resetting the password)
  app.post(
    `${constants.baseAPIPath}/auth/reset-password/:forgotPasswordToken`,
    [
      check("newPassword", "must be at least 8 chars and max 25 chars long")
        .trim()
        .isLength({ min: 8, max: 25 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }

      await authService.resetPassword(req, res);
    }
  );

  //Change password of logged in user
  app.put(
    `${constants.baseAPIPath}/auth/change-password`,
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, [
        appUtils.ROLES.ROLE_MERCHANT,
        appUtils.ROLES.ROLE_ADMIN,
        appUtils.ROLES.ROLE_USER,
      ]);
    },
    [
      check("currentPassword", "must be at least 8 chars and max 25 chars long")
        .trim()
        .isLength({ min: 8, max: 25 }),
      check("newPassword", "must be at least 8 chars and max 25 chars long")
        .trim()
        .isLength({ min: 8, max: 25 }),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await authService.changePassword(req, res);
    }
  );

  //Update the profile of logged in user
  app.put(
    `${constants.baseAPIPath}/auth/profile`,
    upload.single("photoUrl"),
    function (req, res, next) {
      appUtils.checkCookie(req, res, next, [
        appUtils.ROLES.ROLE_MERCHANT,
        appUtils.ROLES.ROLE_ADMIN,
        appUtils.ROLES.ROLE_USER,
      ]);
    },
    [
      check(
        "firstName",
        "must be at least 2 chars and max 30 chars long"
      ).isLength({ min: 2, max: 30 }),
      check("mobile"),
      check("gender", "must be either M/F/U")
        .isLength({ min: 1 })
        .isIn(["M", "F", "U"]),
      check("country", "must be at set to US").custom(validator.isValidCountry),
      check("dateOfBirth", "must be a valid date format or send null").custom(
        validator.isValidDate
      ),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      await authService.updateProfile(req, res);
    }
  );

  // app.get(
  //   `${constants.baseAPIPath}/auth/google`,
  //   passport.authenticate("google", {
  //     scope: ["profile", "email"],
  //   })
  // );

  // app.get(
  //   `${constants.baseAPIPath}/auth/google/callback`,
  //   passport.authenticate("google"),
  //   (req, res) => {
  //     if (req.user.error != null) {
  //       res.clearCookie("sessionId");
  //       res.status(401).send(req.user.error);
  //     } else {
  //       res.redirect(`${constants.baseAPIPath}/sociallogin`);
  //     }
  //   }
  // );

  // app.get(
  //   `${constants.baseAPIPath}/auth/google/callback`,
  //   passport.authenticate("google", {
  //     successRedirect: "/api/v2/sociallogin",
  //     failureRedirect: "",
  //   })
  // );

  // app.get(
  //   `${constants.baseAPIPath}/auth/facebook`,
  //   passport.authenticate("facebook")
  // );

  // app.get(
  //   `${constants.baseAPIPath}/auth/facebook/callback`,
  //   passport.authenticate("facebook"),
  //   (req, res) => {
  //     if (req.user.error != null) {
  //       res.clearCookie("sessionId");
  //       res.status(401).send(req.user.error);
  //     } else {
  //       res.redirect(`${constants.baseAPIPath}/sociallogin`);
  //     }
  //   }
  // );

  // app.get(
  //   `${constants.baseAPIPath}/social-login`,
  //   function (req, res, next) {
  //     appUtils.checkCookie(req, res, next);
  //   },
  //   async (req, res) => {
  //     // var responseHTML =
  //     //   '<html><head><title>Main</title></head><body></body><script>res = %value%; window.opener.postMessage(res, "*");window.close();</script></html>';
  //     // responseHTML = responseHTML.replace(
  //     //   "%value%",
  //     //   JSON.stringify({
  //     //     user: req.user,
  //     //   })
  //     // );
  //     // res.status(200).send(responseHTML);
  //     res.status(200).send(req.user);
  //   }
  // );

  // app.post(
  //   `${constants.baseAPIPath}/auth/invite-email-validate/:registrationToken`,
  //   [
  //     check("email", "must be a valid email and max 50 chars long")
  //       .isEmail()
  //       .isLength({ max: 50 }),
  //     check(
  //       "password",
  //       "must be at least 6 chars and max 20 chars long"
  //     ).isLength({ min: 6, max: 20 }),
  //     check("gender", "must be either M/F/U")
  //       .isLength({ min: 1 })
  //       .isIn(["M", "F", "U"]),
  //     check("mobile", "must be 10 chars long").custom(validator.isValidMobile),
  //     check("country", "must be at set to US").custom(validator.isValidCountry),
  //     check("dateOfBirth", "must be a valid date format or send null").custom(
  //       validator.isValidDate
  //     ),
  //     check(
  //       "firstName",
  //       "must be at least 3 chars and max 30 chars long"
  //     ).isLength({ min: 3, max: 30 }),
  //     check("lastName", "must be max 30 chars long")
  //       .optional()
  //       .isLength({ max: 30 }),
  //     check("registrationToken", "must be valid token")
  //       .trim()
  //       .isLength({ min: 35 }),
  //     check("verifyEmailToken", "must be max 30 chars long")
  //       .optional()
  //       .isLength({ max: 6 }),
  //     check("verifyMobileToken", "must be max 30 chars long")
  //       .optional()
  //       .isLength({ max: 6 }),
  //   ],
  //   async (req, res) => {
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       return res.status(422).json({ errors: errors.array() });
  //     }
  //     await authService.inviteValidateEmail(req, res, appUtils.ROLES.ROLE_USER);
  //   }
  // );

  // app.post(
  //   `${constants.baseAPIPath}/auth/merchant/email-validate/:registrationToken`,
  //   [
  //     check(
  //       "password",
  //       "must be at least 6 chars and max 20 chars long"
  //     ).isLength({ min: 6, max: 20 }),
  //     check("gender", "must be either M/F/U")
  //       .isLength({ min: 1 })
  //       .isIn(["M", "F", "U"]),
  //     check("mobile", "must be 10 chars long").custom(validator.isValidMobile),
  //     check("country", "must be at set to US").custom(validator.isValidCountry),
  //     check("dateOfBirth", "must be a valid date format or send null").custom(
  //       validator.isValidDate
  //     ),
  //     check(
  //       "firstName",
  //       "must be at least 3 chars and max 30 chars long"
  //     ).isLength({ min: 3, max: 30 }),
  //     check("lastName", "must be max 30 chars long")
  //       .optional()
  //       .isLength({ max: 30 }),
  //     check("registrationToken", "must be valid token")
  //       .trim()
  //       .isLength({ min: 35 }),
  //     check("verifyMobileToken", "must be max 30 chars long")
  //       .optional()
  //       .isLength({ max: 6 }),
  //   ],
  //   async (req, res) => {
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       return res.status(422).json({ errors: errors.array() });
  //     }
  //     await authService.merchantValidateEmail(req, res);
  //   }
  // );

  // app.get(
  //   `${constants.baseAPIPath}/auth/token-validate/:registrationToken`,
  //   [
  //     check("registrationToken", "must be valid token")
  //       .trim()
  //       .isLength({ min: 35 }),
  //   ],
  //   async (req, res) => {
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       return res.status(422).json({ errors: errors.array() });
  //     }
  //     await authService.validateUserToken(req, res, appUtils.ROLES.ROLE_USER);
  //   }
  // );

  // app.get(
  //   `${constants.baseAPIPath}/auth/merchant/token-validate/:registrationToken`,
  //   [
  //     check("registrationToken", "must be valid token")
  //       .trim()
  //       .isLength({ min: 35 }),
  //   ],
  //   async (req, res) => {
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       return res.status(422).json({ errors: errors.array() });
  //     }

  //     await authService.validateUserToken(
  //       req,
  //       res,
  //       appUtils.ROLES.ROLE_MERCHANT
  //     );
  //   }
  // );

  // app.get(
  //   `${constants.baseAPIPath}/profile`,
  //   function (req, res, next) {
  //     appUtils.checkCookie(req, res, next, [
  //       appUtils.ROLES.ROLE_MERCHANT,
  //       appUtils.ROLES.ROLE_ADMIN,
  //       appUtils.ROLES.ROLE_USER,
  //     ]);
  //   },
  //   async (req, res) => {
  //     await authService.getProfile(req, res);
  //   }
  // );
};
