module.exports = (sequelize, Sequelize) => {
  const Journey = sequelize.define(
    "Journey",
    {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      segmentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      journeySteps: {
        type: Sequelize.JSONB,
      },
      successfulExecution: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      failedExecution: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "journey",
    }
  );

  Journey.prototype.successfulExecutionCount = async function () {
    this.successfulExecution += 1;
    await this.save();
  };
  Journey.prototype.failedExecutionCount = async function () {
    this.failedExecution += 1;
    await this.save();
  };

  return Journey;
};
