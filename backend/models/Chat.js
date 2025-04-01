const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// 聊天会话模型
const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  seekerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Jobs',
      key: 'id'
    }
  },
  lastMessageId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  lastMessageContent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastMessageTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  employerUnreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  seekerUnreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'archived'),
    defaultValue: 'active'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chats',
  timestamps: true
});

module.exports = Chat; 