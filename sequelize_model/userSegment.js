// models/UserSegment.js

"use strict";

module.exports = (sequelize, DataTypes) => {
  const UserSegment = sequelize.define(
    "UserSegments",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "users", // Refers to users table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      segmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "segment", // Refers to segment table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      underscored: true,
      tableName: "user_segments",
    }
  );

  return UserSegment;
};
