import request from './request'

/**
 * 获取当前用户的通知列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>}
 */
export function getUserNotifications(params) {
  return request({
    url: '/notifications/me',
    method: 'get',
    params
  })
}

/**
 * 获取通知详情
 * @param {Number} id - 通知ID
 * @returns {Promise<Object>}
 */
export function getNotificationDetail(id) {
  return request({
    url: `/notifications/${id}`,
    method: 'get'
  })
}

/**
 * 标记通知为已读
 * @param {Number} id - 通知ID
 * @returns {Promise<Object>}
 */
export function markAsRead(id) {
  return request({
    url: `/notifications/${id}/read`,
    method: 'patch'
  })
}

/**
 * 标记所有通知为已读
 * @returns {Promise<Object>}
 */
export function markAllAsRead() {
  return request({
    url: '/notifications/markAllAsRead',
    method: 'patch'
  })
}

/**
 * 删除通知
 * @param {Number} id - 通知ID
 * @returns {Promise<Object>}
 */
export function deleteNotification(id) {
  return request({
    url: `/notifications/${id}`,
    method: 'delete'
  })
}

/**
 * 批量删除通知
 * @param {Array<Number>} ids - 通知ID数组
 * @returns {Promise<Object>}
 */
export function batchDeleteNotifications(ids) {
  return request({
    url: '/notifications/batch',
    method: 'delete',
    data: {
      notification_ids: ids
    }
  })
}

/**
 * 创建系统通知（仅管理员）
 * @param {Object} data - 通知数据
 * @returns {Promise<Object>}
 */
export function createSystemNotification(data) {
  return request({
    url: '/notifications/system',
    method: 'post',
    data
  })
}

export default {
  getUserNotifications,
  getNotificationDetail,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  batchDeleteNotifications,
  createSystemNotification
} 