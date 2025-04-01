const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// 保护所有通知路由 - 需要用户登录
router.use(authMiddleware.protect);

// 创建通知 - 仅限管理员
router.post(
  '/', 
  authMiddleware.restrictTo('admin'),
  notificationController.createNotification
);

// 获取当前用户的通知列表
router.get('/me', notificationController.getUserNotifications);

// 获取特定用户的通知列表 - 仅限管理员
router.get(
  '/user/:userId', 
  authMiddleware.restrictTo('admin'),
  notificationController.getUserNotifications
);

// 标记所有通知为已读
router.patch('/markAllAsRead', notificationController.markAllAsRead);

// 批量删除通知
router.delete('/batch', notificationController.batchDeleteNotifications);

// 发送系统通知 - 仅限管理员
router.post(
  '/system', 
  authMiddleware.restrictTo('admin'),
  notificationController.sendSystemNotification
);

// 获取特定通知详情
router.get('/:id', notificationController.getNotification);

// 标记通知为已读
router.patch('/:id/read', notificationController.markAsRead);

// 删除通知
router.delete('/:id', notificationController.deleteNotification);

module.exports = router; 