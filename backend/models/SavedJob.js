const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');

const SavedJob = sequelize.define('SavedJob', {
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
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Job,
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reminder_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  is_reminded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminder_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  indexes: [
    {
      name: 'idx_savedjob_user',
      fields: ['user_id']
    },
    {
      name: 'idx_savedjob_job',
      fields: ['job_id']
    },
    {
      unique: true,
      name: 'unique_user_job',
      fields: ['user_id', 'job_id']
    }
  ]
});

// 关联关系
User.hasMany(SavedJob, { foreignKey: 'user_id', as: 'savedJobs' });
SavedJob.belongsTo(User, { foreignKey: 'user_id' });

Job.hasMany(SavedJob, { foreignKey: 'job_id', as: 'saves' });
SavedJob.belongsTo(Job, { foreignKey: 'job_id' });

module.exports = SavedJob; 