module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '发送者ID，系统通知可为null'
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '接收者ID'
    },
    type: {
      type: DataTypes.ENUM('system', 'job', 'application', 'message', 'interview', 'resume'),
      defaultValue: 'system',
      allowNull: false,
      comment: '通知类型'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '通知标题'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '通知内容'
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '是否已读'
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '阅读时间'
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '关联实体类型（job, application等）'
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '关联实体ID'
    },
    delivery_status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending',
      comment: '发送状态'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '额外元数据'
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_notification_recipient',
        fields: ['recipient_id']
      },
      {
        name: 'idx_notification_is_read',
        fields: ['is_read']
      },
      {
        name: 'idx_notification_created_at',
        fields: ['created_at']
      },
      {
        name: 'idx_notification_entity',
        fields: ['entity_type', 'entity_id']
      }
    ]
  });

  Notification.associate = (models) => {
    // 发送者关联
    Notification.belongsTo(models.User, {
      foreignKey: 'sender_id',
      as: 'sender'
    });

    // 接收者关联
    Notification.belongsTo(models.User, {
      foreignKey: 'recipient_id',
      as: 'recipient'
    });
  };

  return Notification;
}; 