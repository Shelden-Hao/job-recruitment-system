const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const JobApplication = require('./JobApplication');

const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: JobApplication,
      key: 'id'
    }
  },
  employer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
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
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Job,
      key: 'id'
    }
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('in-person', 'phone', 'video', 'other'),
    defaultValue: 'in-person'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'),
    defaultValue: 'scheduled'
  },
  seeker_confirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  seeker_confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelled_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  result: {
    type: DataTypes.ENUM('pending', 'passed', 'failed', 'no_show'),
    defaultValue: 'pending'
  },
  next_steps: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  interviewers: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('interviewers');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('interviewers', JSON.stringify(value));
    }
  },
  reminder_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reminder_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  video_link: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  indexes: [
    {
      name: 'idx_interview_application',
      fields: ['application_id']
    },
    {
      name: 'idx_interview_job',
      fields: ['job_id']
    },
    {
      name: 'idx_interview_employer',
      fields: ['employer_id']
    },
    {
      name: 'idx_interview_seeker',
      fields: ['seeker_id']
    },
    {
      name: 'idx_interview_status',
      fields: ['status']
    },
    {
      name: 'idx_interview_scheduled_time',
      fields: ['scheduled_time']
    }
  ]
});

// 关联关系
JobApplication.hasMany(Interview, { foreignKey: 'application_id', as: 'interviews' });
Interview.belongsTo(JobApplication, { foreignKey: 'application_id' });

Job.hasMany(Interview, { foreignKey: 'job_id', as: 'interviews' });
Interview.belongsTo(Job, { foreignKey: 'job_id' });

User.hasMany(Interview, { foreignKey: 'employer_id', as: 'employerInterviews' });
Interview.belongsTo(User, { foreignKey: 'employer_id', as: 'employer' });

User.hasMany(Interview, { foreignKey: 'seeker_id', as: 'seekerInterviews' });
Interview.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

module.exports = Interview; 