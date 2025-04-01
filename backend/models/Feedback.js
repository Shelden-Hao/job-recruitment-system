const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');
const Interview = require('./Interview');

const Feedback = sequelize.define('Feedback', {
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
  target_type: {
    type: DataTypes.ENUM('job', 'company', 'seeker', 'interview', 'application', 'platform'),
    allowNull: false
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '目标ID，根据类型不同对应不同表的ID'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pros: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cons: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'spam'),
    defaultValue: 'pending'
  },
  review_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reviewer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('tags');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value));
    }
  },
  helpful_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unhelpful_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  indexes: [
    {
      name: 'idx_feedback_user',
      fields: ['user_id']
    },
    {
      name: 'idx_feedback_target',
      fields: ['target_type', 'target_id']
    },
    {
      name: 'idx_feedback_rating',
      fields: ['rating']
    },
    {
      name: 'idx_feedback_status',
      fields: ['status']
    }
  ]
});

// 关联关系
User.hasMany(Feedback, { foreignKey: 'user_id', as: 'feedback' });
Feedback.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

Feedback.belongsTo(User, { foreignKey: 'reviewer_id', as: 'reviewer' });

// 动态关联 - 在使用时通过target_type判断关联到哪个模型
// 这里不直接建立关联，在查询时动态处理

module.exports = Feedback; 