const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Resume = sequelize.define('Resume', {
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
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '我的简历'
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_parsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  parse_status: {
    type: DataTypes.ENUM('pending', 'processing', 'success', 'failed'),
    defaultValue: 'pending'
  },
  parsed_data: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('parsed_data');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('parsed_data', JSON.stringify(value));
    }
  },
  extracted_skills: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('extracted_skills');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('extracted_skills', JSON.stringify(value));
    }
  },
  extracted_experience: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('extracted_experience');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('extracted_experience', JSON.stringify(value));
    }
  },
  extracted_education: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('extracted_education');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('extracted_education', JSON.stringify(value));
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'archived', 'deleted'),
    defaultValue: 'active'
  }
}, {
  indexes: [
    {
      name: 'idx_resume_user',
      fields: ['user_id']
    },
    {
      name: 'idx_resume_status',
      fields: ['status']
    }
  ]
});

// 关联关系
User.hasMany(Resume, { foreignKey: 'user_id', as: 'resumes' });
Resume.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Resume; 