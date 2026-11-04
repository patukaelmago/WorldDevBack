const { DataTypes } = require('sequelize');
module.exports = sequelize => sequelize.define('User', {
  id: { type: DataTypes.STRING, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false },
  rol: { type: DataTypes.STRING, allowNull: false, defaultValue: 'user' },
  blocked: { type: DataTypes.BOOLEAN, defaultValue: false },
  favorites: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
  profile: { type: DataTypes.JSONB, defaultValue: {} }
});
