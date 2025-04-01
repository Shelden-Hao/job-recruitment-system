const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

// 聊天会话模型
const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    allowNull: true,
    references: {
      model: 'Jobs',
      key: 'id'
    }
  },
  last_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  last_message_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  employer_unread_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  seeker_unread_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// 聊天消息模型
const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ChatRoom,
      key: 'id'
    }
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'system'),
    defaultValue: 'text'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// 关联关系
User.hasMany(ChatRoom, { foreignKey: 'employer_id', as: 'employerChatRooms' });
User.hasMany(ChatRoom, { foreignKey: 'seeker_id', as: 'seekerChatRooms' });
ChatRoom.belongsTo(User, { foreignKey: 'employer_id', as: 'employer' });
ChatRoom.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });

ChatRoom.hasMany(ChatMessage, { foreignKey: 'room_id', as: 'messages' });
ChatMessage.belongsTo(ChatRoom, { foreignKey: 'room_id' });

User.hasMany(ChatMessage, { foreignKey: 'sender_id', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

module.exports = {
  ChatRoom,
  ChatMessage
}; 