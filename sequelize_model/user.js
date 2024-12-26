const dbConn = require("../services/databaseConnection");
const { v4: uuid } = require("uuid");

module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      loyaltyNumber: Sequelize.STRING,
      email: Sequelize.STRING,
      password: Sequelize.STRING,
      gender: Sequelize.ENUM("M", "F", "U"),
      mobile: Sequelize.STRING,
      country: Sequelize.STRING,
      dateOfBirth: Sequelize.DATEONLY,
      firstName: Sequelize.STRING,
      lastName: Sequelize.STRING,
      status: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      fbSocialId: Sequelize.STRING,
      googleSocialId: Sequelize.STRING,
      profilePic: Sequelize.JSONB,
      registrationToken: Sequelize.STRING,
      resetPasswordToken: Sequelize.STRING,
      verifyEmailToken: Sequelize.STRING,
      verifyMobileToken: Sequelize.STRING,
      apiKey: Sequelize.STRING,
      ipAddress: Sequelize.JSONB,
      role: {
        type: new Sequelize.VIRTUAL(),
      },
      setRegisterToken: {
        type: new Sequelize.VIRTUAL(),
      },
      referralCode: {
        type: Sequelize.STRING,
        // allowNull: false,
      },
      //Referred By which be confirmed when on invite friend consumer in user schema else when merchant invite to any user than invited by is used
      //referredBy refers to CONSUMER/MEMBER USER ID
      referredBy: Sequelize.STRING,
      //invitedBy refers to MERCHANT USER ID
      invitedBy: Sequelize.BIGINT,
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "users",
      hooks: {
        beforeCreate: async function (user) {
          if (user.setRegisterToken) {
            user.registrationToken = uuid();
          }
          user.loyaltyNumber = user.loyaltyCardGen();
          user.referralCode = "LL" + uuid();
        },
        afterCreate: async function (user, options) {
          dbConn.instance.UserRoles.create(
            { userId: user.id, role: user.role },
            { transaction: options.transaction }
          ).then(async (userRole) => {});
        },
      },
    }
  );

  User.prototype.loyaltyCardGen = function () {
    var pos;
    var str = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    var sum = 0;
    var final_digit = 0;
    var t = 0;
    var len_offset = 0;
    var len = 0;

    str[0] = 3;
    t = Math.floor(Math.random() * 4) % 4;
    str[1] = 4 + t;
    pos = 2;
    len = 15;

    while (pos < len - 1) {
      str[pos++] = Math.floor(Math.random() * 10) % 10;
    }

    len_offset = (len + 1) % 2;
    for (pos = 0; pos < len - 1; pos++) {
      if ((pos + len_offset) % 2) {
        t = str[pos] * 2;
        if (t > 9) {
          t -= 9;
        }
        sum += t;
      } else {
        sum += str[pos];
      }
    }

    final_digit = (10 - (sum % 10)) % 10;
    str[len - 1] = final_digit;

    t = str.join("");
    t = t.substr(0, len);
    return t;
  };

  return User;
};
