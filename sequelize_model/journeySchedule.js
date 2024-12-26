module.exports = (sequelize, Sequelize) => {
  const JourneySchedule = sequelize.define(
    "JourneySchedule",
    {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      journeyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      journeyScheduleTime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      isScheduled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("PENDING", "EXECUTED", "FAILED"),
        allowNull: true,
      },
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "journey_schedule",
    }
  );
  return JourneySchedule;
};
