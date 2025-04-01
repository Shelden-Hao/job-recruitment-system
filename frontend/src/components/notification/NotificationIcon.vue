<template>
  <div class="notification-icon-container">
    <el-badge :value="unreadCount > 0 ? unreadCount : ''" :max="99">
      <el-popover
        :width="380"
        trigger="click"
        popper-class="notification-popover"
        :visible="visible"
        @hide="onPopoverHide"
      >
        <template #reference>
          <div @click="handleIconClick" class="notification-icon-wrapper">
            <i-ep-bell class="notification-icon" />
          </div>
        </template>
        
        <template #default>
          <div class="notification-popover-content">
            <NotificationList
              title="通知中心"
              :limit="5"
              :autoRefresh="true"
              :refreshInterval="30000"
              @notification-click="handleNotificationClick"
              @refresh="handleRefresh"
            />
            
            <div class="notification-popover-footer">
              <router-link to="/notifications" class="view-all-link" @click="closePopover">
                查看全部通知
              </router-link>
            </div>
          </div>
        </template>
      </el-popover>
    </el-badge>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import NotificationList from './NotificationList.vue'

// 路由
const router = useRouter()

// 通知仓库
const notificationStore = useNotificationStore()

// 状态
const visible = ref(false)
const unreadCount = ref(0)

// 获取未读通知数
const fetchUnreadCount = async () => {
  try {
    const count = await notificationStore.getUnreadCount()
    unreadCount.value = count
  } catch (error) {
    console.error('获取未读通知数失败:', error)
  }
}

// 点击图标处理
const handleIconClick = () => {
  visible.value = !visible.value
}

// 处理通知点击
const handleNotificationClick = (notification) => {
  closePopover()

  // 根据通知类型导航到不同的页面
  if (notification.entity_type && notification.entity_id) {
    // 处理不同类型的实体导航
    if (notification.entity_type === 'job') {
      router.push(`/jobs/${notification.entity_id}`)
    } else if (notification.entity_type === 'application') {
      router.push(`/applications/${notification.entity_id}`)
    } else if (notification.entity_type === 'message') {
      router.push(`/messages?contact=${notification.entity_id}`)
    } else if (notification.entity_type === 'interview') {
      router.push(`/interviews/${notification.entity_id}`)
    } else {
      // 默认导航到通知详情页
      router.push(`/notifications/${notification.id}`)
    }
  } else {
    // 如果没有关联实体，导航到通知列表页
    router.push('/notifications')
  }
}

// 关闭弹出框
const closePopover = () => {
  visible.value = false
}

// 弹出框隐藏处理
const onPopoverHide = () => {
  // 可以在此处执行一些清理操作
}

// 处理通知列表刷新
const handleRefresh = ({ unread }) => {
  unreadCount.value = unread
}

// 处理点击之外的区域关闭弹出框
const handleClickOutside = (event) => {
  const popoverEl = document.querySelector('.notification-popover')
  const iconEl = document.querySelector('.notification-icon-wrapper')
  
  if (
    popoverEl && 
    !popoverEl.contains(event.target) && 
    iconEl && 
    !iconEl.contains(event.target)
  ) {
    closePopover()
  }
}

// 生命周期钩子
onMounted(() => {
  fetchUnreadCount()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.notification-icon-container {
  position: relative;
  display: inline-block;
}

.notification-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: var(--el-fill-color-light);
  }
}

.notification-icon {
  font-size: 22px;
  color: var(--el-text-color-regular);
}

:deep(.notification-popover) {
  padding: 0;
  overflow: hidden;
  
  .el-popover__title {
    margin: 0;
    padding: 15px;
    border-bottom: 1px solid var(--el-border-color-light);
    font-weight: bold;
  }
}

.notification-popover-content {
  height: 400px;
  display: flex;
  flex-direction: column;
}

.notification-popover-footer {
  padding: 10px;
  text-align: center;
  border-top: 1px solid var(--el-border-color-light);
  
  .view-all-link {
    color: var(--el-color-primary);
    text-decoration: none;
    font-size: 14px;
    
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>

<style lang="scss">
// 全局样式
.notification-popover {
  .el-badge__content {
    z-index: 1;
  }
}
</style> 