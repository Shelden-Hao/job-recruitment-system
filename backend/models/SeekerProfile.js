const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const SeekerProfile = sequelize.define('SeekerProfile', {
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
  full_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  current_location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  education_level: {
    type: DataTypes.ENUM('high_school', 'associate', 'bachelor', 'master', 'phd', 'other'),
    allowNull: true
  },
  school: {
    type: DataTypes.STRING,
    allowNull: true
  },
  major: {
    type: DataTypes.STRING,
    allowNull: true
  },
  graduation_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1900,
      max: 2100
    }
  },
  work_experience_years: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  skills: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('skills');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('skills', JSON.stringify(value));
    }
  },
  resume_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expected_salary_min: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  expected_salary_max: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  job_preferences: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('job_preferences');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('job_preferences', JSON.stringify(value));
    }
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// 关联关系
User.hasOne(SeekerProfile, { foreignKey: 'user_id', as: 'seekerProfile' });
SeekerProfile.belongsTo(User, { foreignKey: 'user_id' });

module.exports = SeekerProfile; 