const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');

const JobView = sequelize.define('JobView', {
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  device_type: {
    type: DataTypes.ENUM('desktop', 'mobile', 'tablet', 'unknown'),
    defaultValue: 'unknown'
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referrer: {
    type: DataTypes.STRING,
    allowNull: true
  },
  view_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '浏览时长（秒）'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  indexes: [
    {
      name: 'idx_jobview_job',
      fields: ['job_id']
    },
    {
      name: 'idx_jobview_user',
      fields: ['user_id']
    },
    {
      name: 'idx_jobview_created',
      fields: ['createdAt']
    }
  ]
});

// 关联关系
Job.hasMany(JobView, { foreignKey: 'job_id', as: 'views' });
JobView.belongsTo(Job, { foreignKey: 'job_id' });

User.hasMany(JobView, { foreignKey: 'user_id', as: 'jobViews' });
JobView.belongsTo(User, { foreignKey: 'user_id' });

module.exports = JobView; 