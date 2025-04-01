const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');

// 用户活动统计
const UserStatistics = sequelize.define('UserStatistics', {
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
  profile_views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  job_applications: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  job_posts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  interviews_attended: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  interviews_conducted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  offers_received: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  offers_sent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  profile_completion: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  last_active: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// 职位统计
const JobStatistics = sequelize.define('JobStatistics', {
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
    },
    unique: true
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  applications: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  interviews_scheduled: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  offers_made: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  average_matching_score: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  click_through_rate: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
});

// 系统统计
const SystemStatistics = sequelize.define('SystemStatistics', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  },
  total_users: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  new_users: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  active_users: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_jobs: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  new_jobs: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_applications: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  new_applications: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_interviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  new_interviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  average_job_duration: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
});

// 关联关系
User.hasOne(UserStatistics, { foreignKey: 'user_id', as: 'statistics' });
UserStatistics.belongsTo(User, { foreignKey: 'user_id' });

Job.hasOne(JobStatistics, { foreignKey: 'job_id', as: 'statistics' });
JobStatistics.belongsTo(Job, { foreignKey: 'job_id' });

module.exports = {
  UserStatistics,
  JobStatistics,
  SystemStatistics
}; 