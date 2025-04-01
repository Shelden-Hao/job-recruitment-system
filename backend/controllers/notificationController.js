const { Notification, User, Job, Application } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * 创建新通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.createNotification = catchAsync(async (req, res) => {
  const { recipient_id, type, title, message, entity_type, entity_id } = req.body;
  
  // 验证接收者存在
  const recipient = await User.findByPk(recipient_id);
  if (!recipient) {
    throw new AppError('接收者不存在', 404);
  }
  
  // 创建通知
  const notification = await Notification.create({
    sender_id: req.user.id,
    recipient_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    is_read: false,
    delivery_status: 'sent'
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      notification
    }
  });
});

/**
 * 获取用户的通知列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.getUserNotifications = catchAsync(async (req, res) => {
  const userId = req.params.userId || req.user.id;
  
  // 验证权限 - 只能查看自己的通知或管理员可查看任何人的通知
  if (userId !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('您无权查看此用户的通知', 403);
  }
  
  // 分页参数
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const offset = (page - 1) * limit;
  
  // 筛选参数
  const whereClause = {
    recipient_id: userId
  };
  
  // 按类型筛选
  if (req.query.type) {
    whereClause.type = req.query.type;
  }
  
  // 按已读/未读筛选
  if (req.query.is_read !== undefined) {
    whereClause.is_read = req.query.is_read === 'true';
  }
  
  // 查询通知
  const { count, rows: notifications } = await Notification.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'email', 'avatar']
      }
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
  
  // 计算额外数据
  const unreadCount = await Notification.count({
    where: {
      recipient_id: userId,
      is_read: false
    }
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      total: count,
      unread_count: unreadCount,
      total_pages: Math.ceil(count / limit),
      current_page: page,
      notifications
    }
  });
});

/**
 * 获取单个通知详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.getNotification = catchAsync(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'email', 'avatar']
      },
      {
        model: User,
        as: 'recipient',
        attributes: ['id', 'username', 'email', 'avatar']
      }
    ]
  });
  
  if (!notification) {
    throw new AppError('通知不存在', 404);
  }
  
  // 验证权限 - 只能查看自己的通知或管理员可查看任何通知
  if (notification.recipient_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('您无权查看此通知', 403);
  }
  
  // 标记为已读（如果未读）
  if (!notification.is_read) {
    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();
  }
  
  // 获取关联的实体（如Job或Application）
  let entityData = null;
  if (notification.entity_type && notification.entity_id) {
    if (notification.entity_type === 'job') {
      entityData = await Job.findByPk(notification.entity_id, {
        attributes: ['id', 'title', 'company_name', 'location']
      });
    } else if (notification.entity_type === 'application') {
      entityData = await Application.findByPk(notification.entity_id, {
        attributes: ['id', 'status', 'job_id'],
        include: [
          {
            model: Job,
            as: 'job',
            attributes: ['id', 'title', 'company_name']
          }
        ]
      });
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      notification,
      entity: entityData
    }
  });
});

/**
 * 标记通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  
  if (!notification) {
    throw new AppError('通知不存在', 404);
  }
  
  // 验证权限 - 只能标记自己的通知
  if (notification.recipient_id !== req.user.id) {
    throw new AppError('您无权标记此通知', 403);
  }
  
  // 已经标记为已读则不需要更新
  if (notification.is_read) {
    return res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  }
  
  // 更新为已读
  notification.is_read = true;
  notification.read_at = new Date();
  await notification.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      notification
    }
  });
});

/**
 * 标记所有通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
  // 更新所有未读通知
  const result = await Notification.update(
    {
      is_read: true,
      read_at: new Date()
    },
    {
      where: {
        recipient_id: req.user.id,
        is_read: false
      }
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      count: result[0] // 更新的记录数
    }
  });
});

/**
 * 删除通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.deleteNotification = catchAsync(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  
  if (!notification) {
    throw new AppError('通知不存在', 404);
  }
  
  // 验证权限 - 只能删除自己的通知或管理员可删除任何通知
  if (notification.recipient_id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('您无权删除此通知', 403);
  }
  
  await notification.destroy();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * 批量删除通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.batchDeleteNotifications = catchAsync(async (req, res) => {
  const { notification_ids } = req.body;
  
  if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
    throw new AppError('请提供有效的通知ID数组', 400);
  }
  
  // 验证所有通知是否都属于当前用户
  const notifications = await Notification.findAll({
    where: {
      id: {
        [Op.in]: notification_ids
      }
    }
  });
  
  // 检查是否有权限删除这些通知
  for (const notification of notifications) {
    if (notification.recipient_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError(`您无权删除ID为${notification.id}的通知`, 403);
    }
  }
  
  // 批量删除
  await Notification.destroy({
    where: {
      id: {
        [Op.in]: notification_ids
      },
      [Op.or]: [
        { recipient_id: req.user.id },
        ...(req.user.role === 'admin' ? [{}] : []) // 如果是管理员，添加空条件以允许删除任何通知
      ]
    }
  });
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * 发送系统通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
exports.sendSystemNotification = catchAsync(async (req, res) => {
  // 验证权限 - 只有管理员可以发送系统通知
  if (req.user.role !== 'admin') {
    throw new AppError('只有管理员可以发送系统通知', 403);
  }
  
  const { title, message, recipient_ids, recipient_role, type } = req.body;
  
  if (!title || !message) {
    throw new AppError('标题和消息内容不能为空', 400);
  }
  
  let recipientUsers = [];
  
  // 确定收件人列表
  if (recipient_ids && Array.isArray(recipient_ids) && recipient_ids.length > 0) {
    // 发送给特定用户
    recipientUsers = await User.findAll({
      where: {
        id: {
          [Op.in]: recipient_ids
        }
      },
      attributes: ['id']
    });
  } else if (recipient_role) {
    // 发送给特定角色的所有用户
    recipientUsers = await User.findAll({
      where: {
        role: recipient_role
      },
      attributes: ['id']
    });
  } else {
    // 发送给所有用户
    recipientUsers = await User.findAll({
      attributes: ['id']
    });
  }
  
  if (recipientUsers.length === 0) {
    throw new AppError('没有符合条件的接收者', 400);
  }
  
  // 批量创建通知
  const notifications = await Notification.bulkCreate(
    recipientUsers.map(user => ({
      sender_id: req.user.id,
      recipient_id: user.id,
      type: type || 'system',
      title,
      message,
      is_read: false,
      delivery_status: 'sent'
    }))
  );
  
  res.status(201).json({
    status: 'success',
    data: {
      count: notifications.length,
      first_notification: notifications[0]
    }
  });
}); 