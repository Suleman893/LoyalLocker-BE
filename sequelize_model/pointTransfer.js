module.exports = (sequelize, Sequelize) => {
  const PointTransfer = sequelize.define(
    "PointTransfer",
    {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      consumerId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      adminId: {
        type: Sequelize.BIGINT,
      },
      //Refers to the Merchant Table PK
      merchantId: {
        type: Sequelize.INTEGER,
      },
      //Refers to the User Table PK
      merchantUserId: {
        type: Sequelize.BIGINT,
      },
      transferType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      points: {
        allowNull: false,
        type: Sequelize.DOUBLE,
      },
      //Must be ACTIVE/INACTIVE
      pointStatus: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      pointsExpiry: {
        type: Sequelize.DATE,
      },
      loyaltyNumber: {
        allowNull: false,
        type: Sequelize.DOUBLE,
      },
      transferHash: {
        type: Sequelize.STRING,
      },
      transferDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "point_transfer",
    }
  );

  return PointTransfer;
};
