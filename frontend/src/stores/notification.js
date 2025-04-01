import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useNotificationStore = defineStore('notification', () => {
  // 状态
  const notifications = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref(null)

  /**
   * 获取当前用户的通知列表
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 通知数据
   */
  const getNotifications = async (params = {}) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await api.get('/notifications/me', { params })
      
      if (response.data && response.data.status === 'success') {
        const data = response.data.data
        notifications.value = data.notifications
        unreadCount.value = data.unread_count
        
        return data
      }
      
      throw new Error('获取通知数据失败')
    } catch (err) {
      error.value = err.message || '获取通知列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取通知详情
   * @param {Number} id - 通知ID
   * @returns {Promise<Object>} 通知详情
   */
  const getNotificationDetail = async (id) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await api.get(`/notifications/${id}`)
      
      if (response.data && response.data.status === 'success') {
        // 更新本地通知列表中的已读状态
        const updatedNotification = response.data.data.notification
        
        if (updatedNotification && updatedNotification.is_read) {
          const index = notifications.value.findIndex(n => n.id === id)
          if (index !== -1 && !notifications.value[index].is_read) {
            notifications.value[index].is_read = true
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
        }
        
        return response.data.data
      }
      
      throw new Error('获取通知详情失败')
    } catch (err) {
      error.value = err.message || '获取通知详情失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 标记通知为已读
   * @param {Number} id - 通知ID
   * @returns {Promise<Object>}
   */
  const markAsRead = async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`)
      
      if (response.data && response.data.status === 'success') {
        // 更新本地通知列表中的已读状态
        const updatedNotification = response.data.data.notification
        const index = notifications.value.findIndex(n => n.id === id)
        
        if (index !== -1 && !notifications.value[index].is_read) {
          notifications.value[index].is_read = true
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        
        return updatedNotification
      }
      
      throw new Error('标记通知为已读失败')
    } catch (err) {
      error.value = err.message || '标记通知为已读失败'
      throw err
    }
  }

  /**
   * 标记所有通知为已读
   * @returns {Promise<Object>}
   */
  const markAllAsRead = async () => {
    try {
      const response = await api.patch('/notifications/markAllAsRead')
      
      if (response.data && response.data.status === 'success') {
        // 更新所有通知的已读状态
        notifications.value.forEach(notification => {
          notification.is_read = true
        })
        
        unreadCount.value = 0
        
        return response.data.data
      }
      
      throw new Error('标记所有通知为已读失败')
    } catch (err) {
      error.value = err.message || '标记所有通知为已读失败'
      throw err
    }
  }

  /**
   * 删除通知
   * @param {Number} id - 通知ID
   * @returns {Promise<void>}
   */
  const deleteNotification = async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`)
      
      if (response.status === 204 || (response.data && response.data.status === 'success')) {
        // 从本地通知列表中移除
        const index = notifications.value.findIndex(n => n.id === id)
        
        if (index !== -1) {
          // 如果删除的是未读通知，更新未读计数
          if (!notifications.value[index].is_read) {
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
          
          notifications.value.splice(index, 1)
        }
        
        return true
      }
      
      throw new Error('删除通知失败')
    } catch (err) {
      error.value = err.message || '删除通知失败'
      throw err
    }
  }

  /**
   * 批量删除通知
   * @param {Array<Number>} ids - 通知ID数组
   * @returns {Promise<void>}
   */
  const batchDeleteNotifications = async (ids) => {
    try {
      const response = await api.delete('/notifications/batch', {
        data: { notification_ids: ids }
      })
      
      if (response.status === 204 || (response.data && response.data.status === 'success')) {
        // 从本地通知列表中移除
        let unreadDeleted = 0
        
        ids.forEach(id => {
          const index = notifications.value.findIndex(n => n.id === id)
          
          if (index !== -1) {
            // 计算删除的未读通知数量
            if (!notifications.value[index].is_read) {
              unreadDeleted++
            }
            
            // 从数组中移除
            notifications.value.splice(index, 1)
          }
        })
        
        // 更新未读计数
        unreadCount.value = Math.max(0, unreadCount.value - unreadDeleted)
        
        return true
      }
      
      throw new Error('批量删除通知失败')
    } catch (err) {
      error.value = err.message || '批量删除通知失败'
      throw err
    }
  }

  /**
   * 获取未读通知数量
   * @returns {Promise<Number>}
   */
  const getUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/me', {
        params: { page: 1, limit: 1, is_read: false }
      })
      
      if (response.data && response.data.status === 'success') {
        unreadCount.value = response.data.data.unread_count
        return unreadCount.value
      }
      
      throw new Error('获取未读通知数量失败')
    } catch (err) {
      error.value = err.message || '获取未读通知数量失败'
      console.error('获取未读通知数量失败:', err)
      return 0
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    getNotifications,
    getNotificationDetail,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    batchDeleteNotifications,
    getUnreadCount
  }
}) 