const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const EmployerProfile = sequelize.define('EmployerProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    unique: true
  },
  company_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company_logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company_size: {
    type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
    allowNull: true
  },
  founded_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1800,
      max: new Date().getFullYear()
    }
  },
  company_website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  company_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  headquarters_location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  business_license: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  contact_person: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_position: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  contact_phone: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// 关联关系
User.hasOne(EmployerProfile, { foreignKey: 'user_id', as: 'employerProfile' });
EmployerProfile.belongsTo(User, { foreignKey: 'user_id' });

module.exports = EmployerProfile; 