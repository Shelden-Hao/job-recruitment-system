<template>
  <div class="notification-list">
    <div class="notification-header">
      <h2 class="notification-title">{{ title || '通知' }}</h2>
      <div class="notification-actions">
        <el-button type="primary" size="small" text @click="markAllAsRead" :disabled="!hasUnread || loading">
          全部标为已读
        </el-button>
        <el-dropdown @command="handleCommand">
          <el-button type="primary" size="small" text>
            <i-ep-more-filled />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="refresh">刷新</el-dropdown-item>
              <el-dropdown-item command="clear" :disabled="notifications.length === 0">
                清空已读通知
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="全部" name="all"></el-tab-pane>
      <el-tab-pane label="未读" name="unread"></el-tab-pane>
    </el-tabs>
    
    <div class="notification-content">
      <el-empty v-if="notifications.length === 0" description="暂无通知" />
      
      <el-skeleton v-else-if="loading" :rows="3" animated />
      
      <template v-else>
        <TransitionGroup name="list" tag="div" class="notification-items">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ 'notification-unread': !notification.is_read }"
            @click="viewNotification(notification)"
          >
            <div class="notification-icon">
              <i-ep-bell v-if="notification.type === 'system'" class="icon system" />
              <i-ep-briefcase v-else-if="notification.type === 'job'" class="icon job" />
              <i-ep-document v-else-if="notification.type === 'application'" class="icon application" />
              <i-ep-chat-dot-round v-else-if="notification.type === 'message'" class="icon message" />
              <i-ep-user v-else-if="notification.type === 'resume'" class="icon resume" />
              <i-ep-calendar v-else-if="notification.type === 'interview'" class="icon interview" />
              <i-ep-info-filled v-else class="icon" />
            </div>
            
            <div class="notification-body">
              <div class="notification-title-row">
                <h3 class="notification-item-title">{{ notification.title }}</h3>
                <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
              </div>
              <p class="notification-message">{{ notification.message }}</p>
            </div>
            
            <div class="notification-actions-item">
              <el-button 
                type="primary" 
                size="small" 
                text 
                circle 
                @click.stop="markAsRead(notification)"
                v-if="!notification.is_read"
              >
                <i-ep-check />
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                text 
                circle 
                @click.stop="deleteNotification(notification)"
              >
                <i-ep-delete />
              </el-button>
            </div>
          </div>
        </TransitionGroup>
        
        <div class="notification-pagination">
          <el-pagination
            v-if="totalPages > 1"
            :current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatTimeAgo } from '@/utils/dateUtils'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: ''
  },
  limit: {
    type: Number,
    default: 10
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  autoRefresh: {
    type: Boolean,
    default: false
  },
  refreshInterval: {
    type: Number,
    default: 60000 // 1分钟
  }
})

const emit = defineEmits(['notification-click', 'notification-read', 'refresh'])

// 通知仓库
const notificationStore = useNotificationStore()

// 状态
const loading = ref(false)
const notifications = ref([])
const total = ref(0)
const unreadCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(props.limit)
const totalPages = ref(1)
const activeTab = ref('all')
let refreshTimer = null

// 计算属性
const hasUnread = computed(() => unreadCount.value > 0)

// 获取通知列表
const fetchNotifications = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      type: props.type || undefined,
      is_read: activeTab.value === 'unread' ? false : undefined
    }
    
    const response = await notificationStore.getNotifications(params)
    
    notifications.value = response.notifications
    total.value = response.total
    unreadCount.value = response.unread_count
    totalPages.value = response.total_pages
    
    emit('refresh', {
      total: total.value,
      unread: unreadCount.value
    })
  } catch (error) {
    console.error('获取通知失败:', error)
    ElMessage.error('获取通知列表失败')
  } finally {
    loading.value = false
  }
}

// 标记通知为已读
const markAsRead = async (notification) => {
  if (notification.is_read) return
  
  try {
    await notificationStore.markAsRead(notification.id)
    notification.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    emit('notification-read', notification)
  } catch (error) {
    console.error('标记通知为已读失败:', error)
    ElMessage.error('标记通知为已读失败')
  }
}

// 全部标记为已读
const markAllAsRead = async () => {
  if (!hasUnread.value || loading.value) return
  
  try {
    loading.value = true
    await notificationStore.markAllAsRead()
    notifications.value.forEach(notification => {
      notification.is_read = true
    })
    unreadCount.value = 0
    ElMessage.success('已将所有通知标记为已读')
  } catch (error) {
    console.error('标记全部已读失败:', error)
    ElMessage.error('标记全部已读失败')
  } finally {
    loading.value = false
  }
}

// 删除通知
const deleteNotification = async (notification) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await notificationStore.deleteNotification(notification.id)
    notifications.value = notifications.value.filter(item => item.id !== notification.id)
    
    if (!notification.is_read) {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    
    ElMessage.success('删除通知成功')
    
    // 如果当前页已经没有数据且不是第一页，则跳转到上一页
    if (notifications.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
      fetchNotifications()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除通知失败:', error)
      ElMessage.error('删除通知失败')
    }
  }
}

// 清空已读通知
const clearReadNotifications = async () => {
  const readNotifications = notifications.value.filter(notification => notification.is_read)
  if (readNotifications.length === 0) {
    ElMessage.info('没有已读通知')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要清空所有已读通知吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const readIds = readNotifications.map(notification => notification.id)
    await notificationStore.batchDeleteNotifications(readIds)
    notifications.value = notifications.value.filter(notification => !notification.is_read)
    
    ElMessage.success('清空已读通知成功')
    
    // 如果当前页已经没有数据且不是第一页，则跳转到上一页
    if (notifications.value.length === 0 && currentPage.value > 1) {
      currentPage.value--
      fetchNotifications()
    } else if (notifications.value.length === 0) {
      // 如果是第一页且没有数据，重新加载通知
      fetchNotifications()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空已读通知失败:', error)
      ElMessage.error('清空已读通知失败')
    }
  }
}

// 查看通知详情
const viewNotification = async (notification) => {
  // 标记为已读
  if (!notification.is_read) {
    await markAsRead(notification)
  }
  
  // 发出通知点击事件
  emit('notification-click', notification)
}

// 处理下拉菜单命令
const handleCommand = (command) => {
  if (command === 'refresh') {
    fetchNotifications()
  } else if (command === 'clear') {
    clearReadNotifications()
  }
}

// 处理分页变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchNotifications()
}

// 处理标签页点击
const handleTabClick = () => {
  currentPage.value = 1
  fetchNotifications()
}

// 格式化时间
const formatTime = (time) => {
  return formatTimeAgo(time)
}

// 设置自动刷新
const setupAutoRefresh = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      fetchNotifications()
    }, props.refreshInterval)
  }
}

// 清除自动刷新
const clearAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 生命周期钩子
onMounted(() => {
  fetchNotifications()
  setupAutoRefresh()
})

// 组件销毁时清除定时器
watch(
  () => props.autoRefresh,
  (newValue) => {
    if (newValue) {
      setupAutoRefresh()
    } else {
      clearAutoRefresh()
    }
  }
)

watch(
  () => props.refreshInterval,
  () => {
    if (props.autoRefresh) {
      clearAutoRefresh()
      setupAutoRefresh()
    }
  }
)

// 组件销毁时的清理工作
onUnmounted(() => {
  clearAutoRefresh()
})
</script>

<style lang="scss" scoped>
.notification-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  
  .notification-title {
    font-size: 18px;
    margin: 0;
  }
  
  .notification-actions {
    display: flex;
    gap: 8px;
  }
}

.notification-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.notification-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  padding: 12px;
  border-radius: 8px;
  background-color: var(--el-bg-color);
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    background-color: var(--el-fill-color-light);
    
    .notification-actions-item {
      opacity: 1;
    }
  }
  
  &.notification-unread {
    background-color: var(--el-color-primary-light-9);
    
    &:hover {
      background-color: var(--el-color-primary-light-8);
    }
    
    .notification-item-title {
      font-weight: bold;
    }
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      width: 4px;
      height: 40%;
      background-color: var(--el-color-primary);
      border-radius: 0 2px 2px 0;
    }
  }
}

.notification-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  
  .icon {
    font-size: 20px;
    color: var(--el-text-color-secondary);
    
    &.system {
      color: var(--el-color-info);
    }
    
    &.job {
      color: var(--el-color-primary);
    }
    
    &.application {
      color: var(--el-color-success);
    }
    
    &.message {
      color: var(--el-color-warning);
    }
    
    &.resume {
      color: var(--el-color-danger);
    }
    
    &.interview {
      color: var(--el-color-purple);
    }
  }
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.notification-item-title {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  margin-left: 8px;
}

.notification-message {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-actions-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.notification-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

// 列表动画
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style> 