module.exports = (sequelize, Sequelize) => {
  const Events = sequelize.define(
    "Events",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      adminId: Sequelize.BIGINT,
      name: Sequelize.STRING,
      status: {
        type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
      },
      description: Sequelize.TEXT,
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: "events",
    }
  );

  return Events;
};
