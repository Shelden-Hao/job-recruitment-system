const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversation_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '对话ID，格式为 user1_id-user2_id，其中ID按升序排列'
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  content_type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'system'),
    defaultValue: 'text'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('metadata');
      return rawValue ? JSON.parse(rawValue) : {};
    },
    set(value) {
      this.setDataValue('metadata', JSON.stringify(value));
    }
  }
}, {
  indexes: [
    {
      name: 'idx_message_conversation',
      fields: ['conversation_id']
    },
    {
      name: 'idx_message_sender',
      fields: ['sender_id']
    },
    {
      name: 'idx_message_receiver',
      fields: ['receiver_id']
    },
    {
      name: 'idx_message_is_read',
      fields: ['is_read']
    }
  ]
});

// 关联关系
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// 生成会话ID的静态方法
Message.generateConversationId = (user1Id, user2Id) => {
  const ids = [user1Id, user2Id].sort((a, b) => a - b);
  return `${ids[0]}-${ids[1]}`;
};

module.exports = Message; 