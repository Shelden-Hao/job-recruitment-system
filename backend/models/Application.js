const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const privacyMiddleware = require('./middleware/privacyMiddleware');

const Application = sequelize.define('Application', {
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
  cover_letter: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resume_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('submitted', 'reviewed', 'interview', 'rejected', 'offered', 'accepted', 'withdrawn'),
    defaultValue: 'submitted'
  },
  employer_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  match_score: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  interview_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  interview_location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  interview_type: {
    type: DataTypes.ENUM('in-person', 'phone', 'video', 'other'),
    allowNull: true
  },
  interview_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  interview_feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  seeker_feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  seeker_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  employer_rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  viewed_by_employer: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  viewed_by_seeker: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  indexes: [
    {
      name: 'idx_application_job',
      fields: ['job_id']
    },
    {
      name: 'idx_application_seeker',
      fields: ['seeker_id']
    },
    {
      name: 'idx_application_status',
      fields: ['status']
    },
    {
      unique: true,
      name: 'unique_job_seeker',
      fields: ['job_id', 'seeker_id']
    }
  ]
});

// 关联关系
Job.hasMany(Application, { foreignKey: 'job_id', as: 'applications' });
Application.belongsTo(Job, { foreignKey: 'job_id' });

User.hasMany(Application, { foreignKey: 'seeker_id', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

module.exports = Application; 