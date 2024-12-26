const Sequelize = require("sequelize");
const dotenv = require("dotenv");
// Load environment variables from .env file
dotenv.config();

function Connection() {
  this.dbConnection = function () {
    const baseConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: process.env.DB_DIALECT,
      logging: false,
      pool: {
        max: 50,
        min: 5,
        acquire: 20000,
        idle: 3600000,
      },
    };

    // Add dialectOptions only if NODE_ENV is not 'dev'
    // if (process.env.NODE_ENV === "prod" ) {
    baseConfig.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    };
    // }

    return new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      baseConfig
    );
  };

  this.setConnection = function () {
    if (this.instance === null) {
      let models = {};
      // Mysql DB connection
      const sequelize = this.dbConnection();
      let modules = require("../sequelize_model/index");

      // Initialize models
      modules.forEach((module) => {
        const model = module(sequelize, Sequelize);
        models[model.name] = model;
      });

      models.sequelize = sequelize;
      models.Sequelize = Sequelize;
      this.instance = models;
      this.instance.sequelize
        .authenticate()
        .then(() => {
          console.log(
            "Connection has been established with host",
            process.env.DB_HOST
          );
        })
        .catch((err) => {
          console.error("Unable to connect to the database:", err);
          throw err;
        });

      //Auth Related Module related
      models.User.hasMany(models.UserRoles, {
        as: "userRoles",
        foreignKey: "userId",
        targetKey: "id",
      });

      models.UserRoles.belongsTo(models.User);

      models.MerchantUsers.hasMany(models.UserRoles, {
        as: "userRoles",
        sourceKey: "userId",
        foreignKey: "userId",
      });

      models.User.hasMany(models.MerchantUsers, {
        as: "merchantUsers",
        foreignKey: "userId",
        targetKey: "id",
      });

      models.MerchantUsers.belongsTo(models.User);

      models.Merchant.hasMany(models.MerchantUsers, {
        as: "merchantUsers",
        foreignKey: "merchantId",
        targetKey: "id",
      });

      models.MerchantUsers.belongsTo(models.Merchant);

      models.Merchant.hasMany(models.MerchantStores, {
        as: "merchantStores",
        foreignKey: "merchantId",
        targetKey: "id",
      });

      models.MerchantStores.belongsTo(models.Merchant);

      models.Merchant.hasOne(models.User, {
        as: "user",
        sourceKey: "primaryUser",
        foreignKey: "id",
      });

      //Rules and Events Module related
      models.EarningRules.belongsToMany(models.MerchantStores, {
        through: "store_rules", // This is the join or junction table name
        as: "storeInfo",
      });

      models.EarningRules.belongsToMany(models.MerchantProducts, {
        through: "product_rules", // This is the join or junction table name
        as: "productsInfo",
      });

      models.EarningRules.belongsTo(models.MerchantProducts, {
        foreignKey: "product_id",
        as: "productInfo",
      });

      models.EarningRules.belongsTo(models.Events, {
        as: "eventInfo",
        foreignKey: "eventId",
        targetKey: "id",
      });

      //User model reference to get user model related information
      models.EarningRules.belongsTo(models.User, {
        foreignKey: "merchant_user_id",
        as: "merchantUserInfo",
      });

      //Merchant model reference to get merchant model related information
      models.EarningRules.belongsTo(models.Merchant, {
        foreignKey: "merchant_id",
        as: "merchantInfo",
      });

      //Campaign Module related
      models.Segment.hasMany(models.Campaign, {
        as: "segmentInfo",
        foreignKey: "segmentId",
        targetKey: "id",
      });

      models.Campaign.belongsTo(models.Segment, {
        as: "segmentInfo",
        foreignKey: "segmentId",
        targetKey: "id",
      });

      models.CampaignEmailTemplate.hasMany(models.Campaign, {
        as: "emailTemplateInfo",
        foreignKey: "emailTemplateId",
        targetKey: "id",
      });

      models.Campaign.belongsTo(models.CampaignEmailTemplate, {
        as: "emailTemplateInfo",
        foreignKey: "emailTemplateId",
        targetKey: "id",
      });

      models.Segment.belongsToMany(models.User, {
        through: "user_segments", // This is the join or junction table name
        foreignKey: "segmentId",
        as: "users", // This will be used as the association name
      });

      models.User.belongsToMany(models.Segment, {
        through: "user_segments",
        foreignKey: "userId",
        as: "segments",
      });

      models.Journey.hasMany(models.JourneySchedule, {
        as: "journeySchedules",
        foreignKey: "journeyId",
        targetKey: "id",
      });

      models.JourneySchedule.belongsTo(models.Journey, {
        as: "journeySchedules",
        foreignKey: "journeyId",
        targetKey: "id",
      });

      //Point Transfer Module related
      models.PointTransfer.belongsTo(models.User, {
        as: "consumerInfo",
        foreignKey: "consumerId",
        targetKey: "id",
      });

      models.PointTransfer.belongsTo(models.User, {
        as: "merchantInfo",
        foreignKey: "merchantUserId",
        targetKey: "id",
      });

      models.PointTransfer.belongsTo(models.User, {
        as: "adminInfo",
        foreignKey: "adminId",
        targetKey: "id",
      });

      //For the Consumer Dashboard
      models.PointTransfer.belongsTo(models.Merchant, {
        as: "merchantBrandInfo",
        foreignKey: "merchantId",
        targetKey: "id",
      });

      //Offer and Rewards related
      models.Offers.belongsToMany(models.MerchantStores, {
        through: "store_offers", // This is the join or junction table name
        as: "storeInfo",
      });

      models.Offers.belongsToMany(models.User, {
        through: "consumer_offers",
      });

      models.User.belongsToMany(models.Offers, {
        through: "consumer_offers", // This is the join table name
      });

      models.Offers.belongsTo(models.MerchantProducts, {
        foreignKey: "product_id",
        as: "productInfo",
      });

      //User model reference to get user model related information
      models.Offers.belongsTo(models.User, {
        foreignKey: "merchant_user_id",
        as: "merchantUserInfo",
      });

      //Merchant model reference to get merchant model related information
      models.Offers.belongsTo(models.Merchant, {
        foreignKey: "merchant_id",
        as: "merchantInfo",
      });

      models.Rewards.belongsTo(models.MerchantProducts, {
        foreignKey: "product_id",
        as: "productInfo",
      });

      //User model reference to get user model related information
      models.Rewards.belongsTo(models.User, {
        foreignKey: "merchant_user_id",
        as: "merchantUserInfo",
      });

      //Merchant model reference to get merchant model related information
      models.Rewards.belongsTo(models.Merchant, {
        foreignKey: "merchant_id",
        as: "merchantInfo",
      });

      //------------------Redeem----------
      models.Rewards.hasMany(models.Coupon, {
        foreignKey: "reward_id",
        as: "couponInfo",
      });

      models.Offers.hasMany(models.Coupon, {
        foreignKey: "offer_id",
        as: "couponInfo",
      });

      models.EarningRules.hasMany(models.Coupon, {
        foreignKey: "rule_id",
        as: "couponInfo",
      });

      models.Coupon.belongsTo(models.Rewards, {
        foreignKey: "reward_id",
        as: "rewardInfo",
      });

      models.Coupon.belongsTo(models.Offers, {
        foreignKey: "offer_id",
        as: "offerInfo",
      });

      models.Coupon.belongsTo(models.EarningRules, {
        foreignKey: "rule_id",
        as: "ruleInfo",
      });

      models.User.hasMany(models.Coupon, { foreignKey: "user_id" });

      models.Coupon.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "userInfo",
      });

      //In transaction table need the rewards and offers record
      models.Transaction.belongsTo(models.Rewards, {
        as: "rewardInfo",
        foreignKey: "rewardId",
      });
      models.Transaction.belongsTo(models.Offers, {
        as: "offerInfo",
        foreignKey: "offerId",
      });

      models.Transaction.belongsTo(models.User, {
        as: "userInfo",
        foreignKey: "userId",
      });

      models.Transaction.belongsTo(models.User, {
        as: "merchantUserInfo",
        foreignKey: "merchantUserId",
      });

      models.Transaction.belongsTo(models.Merchant, {
        as: "merchantInfo",
        foreignKey: "merchantId",
      });

      return this.instance;
    } else {
      return this.instance;
    }
  };
}

Connection.prototype.instance = null;
module.exports = new Connection();
