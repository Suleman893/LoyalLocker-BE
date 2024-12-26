module.exports = (sequelize, Sequelize) => {
  const Coupon = sequelize.define(
    "Coupon",
    {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      couponCode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      offerId: {
        type: Sequelize.BIGINT,
        references: {
          model: "offers",
          key: "id",
        },
      },
      rewardId: {
        type: Sequelize.BIGINT,
        references: {
          model: "rewards",
          key: "id",
        },
      },
      userId: {
        type: Sequelize.BIGINT,
        references: {
          model: "user",
          key: "id",
        },
      },
      ruleId: {
        type: Sequelize.BIGINT,
        references: {
          model: "earning_rules",
          key: "id",
        },
      },
      issued: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      issuedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      availed: {
        type: Sequelize.BOOLEAN,
        default: false,
      },
      availedAt: {
        type: Sequelize.DATE,
      },
      //Refers to the user model id of merchant
      merchantUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      //Refers to the merchant model id
      merchantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "coupons",
    }
  );

  return Coupon;
};
