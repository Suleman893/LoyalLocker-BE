module.exports = (sequelize, Sequelize) => {
  const UserRoles = sequelize.define('UserRoles', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      userId: Sequelize.BIGINT,
      role: Sequelize.INTEGER
    },
    {
      underscored: true,
      schema: process.env.DB_SCHEMA,
      tableName: 'user_roles'
    }
  );

  return UserRoles;
};