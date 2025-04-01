const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');

const JobApplication = sequelize.define('JobApplication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Job,
      key: 'id'
    }
  },
  seeker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  resume_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cover_letter: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  application_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('applied', 'reviewing', 'interview', 'offer', 'rejected', 'withdrawn'),
    defaultValue: 'applied'
  },
  matching_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  employer_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  viewed_by_employer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  viewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// 关联关系
Job.hasMany(JobApplication, { foreignKey: 'job_id', as: 'applications' });
JobApplication.belongsTo(Job, { foreignKey: 'job_id' });

User.hasMany(JobApplication, { foreignKey: 'seeker_id', as: 'applications' });
JobApplication.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

module.exports = JobApplication; 