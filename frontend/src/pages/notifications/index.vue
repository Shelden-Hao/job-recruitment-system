<template>
  <div class="notification-page">
    <el-card class="notification-card">
      <template #header>
        <div class="card-header">
          <h2 class="notification-title">通知中心</h2>
          <div class="notification-actions">
            <el-button 
              type="primary" 
              :disabled="!hasUnread" 
              @click="markAllAsRead"
            >
              全部标为已读
            </el-button>
            <el-button
              type="danger"
              :disabled="selectedNotifications.length === 0"
              @click="batchDelete"
            >
              批量删除
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="notification-content">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <el-tab-pane label="全部通知" name="all"></el-tab-pane>
          <el-tab-pane label="未读通知" name="unread"></el-tab-pane>
          <el-tab-pane label="系统通知" name="system"></el-tab-pane>
          <el-tab-pane label="应用通知" name="application"></el-tab-pane>
          <el-tab-pane label="职位通知" name="job"></el-tab-pane>
        </el-tabs>
        
        <el-table
          v-loading="loading"
          :data="notifications"
          style="width: 100%"
          @selection-change="handleSelectionChange"
          :row-class-name="getRowClass"
        >
          <el-table-column type="selection" width="55" />
          
          <el-table-column width="60">
            <template #default="{ row }">
              <div class="notification-icon">
                <i-ep-bell v-if="row.type === 'system'" class="icon system" />
                <i-ep-briefcase v-else-if="row.type === 'job'" class="icon job" />
                <i-ep-document v-else-if="row.type === 'application'" class="icon application" />
                <i-ep-chat-dot-round v-else-if="row.type === 'message'" class="icon message" />
                <i-ep-user v-else-if="row.type === 'resume'" class="icon resume" />
                <i-ep-calendar v-else-if="row.type === 'interview'" class="icon interview" />
                <i-ep-info-filled v-else class="icon" />
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <div class="notification-title-cell">
                <span :class="{ 'unread': !row.is_read }">{{ row.title }}</span>
                <el-tag size="small" v-if="!row.is_read" type="danger">新</el-tag>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="message" label="内容" min-width="300">
            <template #default="{ row }">
              <div class="notification-message">{{ row.message }}</div>
            </template>
          </el-table-column>
          
          <el-table-column prop="created_at" label="时间" width="180">
            <template #default="{ row }">
              <span>{{ formatDateTime(row.created_at) }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <div class="notification-actions-cell">
                <el-button 
                  v-if="!row.is_read" 
                  type="primary" 
                  size="small" 
                  text
                  @click.stop="markAsRead(row)"
                >
                  标为已读
                </el-button>
                <el-button 
                  type="primary" 
                  size="small"
                  @click.stop="viewDetail(row)"
                >
                  查看详情
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  text
                  @click.stop="deleteNotification(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            v-if="totalPages > 1"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 通知详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="通知详情"
      width="500px"
    >
      <div v-if="selectedNotification" class="notification-detail">
        <div class="notification-detail-header">
          <h3 class="notification-detail-title">{{ selectedNotification.title }}</h3>
          <div class="notification-detail-meta">
            <span class="notification-detail-time">{{ formatDateTime(selectedNotification.created_at) }}</span>
            <el-tag size="small" :type="getTypeTagType(selectedNotification.type)">
              {{ getTypeText(selectedNotification.type) }}
            </el-tag>
          </div>
        </div>
        
        <div class="notification-detail-content">
          <p>{{ selectedNotification.message }}</p>
        </div>
        
        <div v-if="entityData" class="notification-detail-entity">
          <h4>相关信息</h4>
          <div v-if="selectedNotification.entity_type === 'job'" class="entity-info">
            <p><strong>职位:</strong> {{ entityData.title }}</p>
            <p><strong>公司:</strong> {{ entityData.company_name }}</p>
            <p><strong>地点:</strong> {{ entityData.location }}</p>
            <div class="entity-actions">
              <el-button type="primary" @click="goToEntity(selectedNotification)">查看职位</el-button>
            </div>
          </div>
          
          <div v-else-if="selectedNotification.entity_type === 'application'" class="entity-info">
            <p><strong>申请状态:</strong> {{ getApplicationStatusText(entityData.status) }}</p>
            <p><strong>职位:</strong> {{ entityData.job?.title }}</p>
            <p><strong>公司:</strong> {{ entityData.job?.company_name }}</p>
            <div class="entity-actions">
              <el-button type="primary" @click="goToEntity(selectedNotification)">查看申请详情</el-button>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button 
            type="danger" 
            @click="deleteAndCloseDialog"
          >
            删除此通知
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime } from '@/utils/dateUtils'

// 路由
const router = useRouter()

// 通知仓库
const notificationStore = useNotificationStore()

// 状态
const loading = ref(false)
const notifications = ref([])
const total = ref(0)
const unreadCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(1)
const activeTab = ref('all')
const selectedNotifications = ref([])
const dialogVisible = ref(false)
const selectedNotification = ref(null)
const entityData = ref(null)

// 计算属性
const hasUnread = computed(() => unreadCount.value > 0)

// 获取通知列表
const fetchNotifications = async () => {
  try {
    loading.value = true
    
    // 构建查询参数
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    // 根据选项卡添加筛选条件
    if (activeTab.value === 'unread') {
      params.is_read = false
    } else if (activeTab.value !== 'all') {
      params.type = activeTab.value
    }
    
    const data = await notificationStore.getNotifications(params)
    
    notifications.value = data.notifications
    total.value = data.total
    unreadCount.value = data.unread_count
    totalPages.value = data.total_pages
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
    ElMessage.success('已标记为已读')
  } catch (error) {
    console.error('标记通知为已读失败:', error)
    ElMessage.error('标记通知为已读失败')
  }
}

// 全部标记为已读
const markAllAsRead = async () => {
  if (!hasUnread.value) return
  
  try {
    await ElMessageBox.confirm('确定要将所有通知标记为已读吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
    
    await notificationStore.markAllAsRead()
    
    // 更新所有通知状态
    notifications.value.forEach(notification => {
      notification.is_read = true
    })
    unreadCount.value = 0
    
    ElMessage.success('已将所有通知标记为已读')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('标记全部已读失败:', error)
      ElMessage.error('标记全部已读失败')
    }
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
    
    // 从列表中移除
    const index = notifications.value.findIndex(n => n.id === notification.id)
    if (index !== -1) {
      if (!notifications.value[index].is_read) {
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
      notifications.value.splice(index, 1)
    }
    
    total.value = Math.max(0, total.value - 1)
    ElMessage.success('删除通知成功')
    
    // 关闭对话框（如果打开）
    if (dialogVisible.value && selectedNotification.value?.id === notification.id) {
      dialogVisible.value = false
    }
    
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

// 批量删除通知
const batchDelete = async () => {
  if (selectedNotifications.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedNotifications.value.length} 条通知吗？`, 
      '提示', 
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedNotifications.value.map(notification => notification.id)
    await notificationStore.batchDeleteNotifications(ids)
    
    // 计算删除的未读通知数
    const unreadDeleted = selectedNotifications.value.filter(n => !n.is_read).length
    unreadCount.value = Math.max(0, unreadCount.value - unreadDeleted)
    
    // 更新总数
    total.value = Math.max(0, total.value - selectedNotifications.value.length)
    
    // 重新加载当前页数据
    fetchNotifications()
    
    ElMessage.success('批量删除通知成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除通知失败:', error)
      ElMessage.error('批量删除通知失败')
    }
  }
}

// 表格选择变化处理
const handleSelectionChange = (selection) => {
  selectedNotifications.value = selection
}

// 查看通知详情
const viewDetail = async (notification) => {
  try {
    selectedNotification.value = notification
    entityData.value = null
    dialogVisible.value = true
    
    // 如果未读，则标记为已读
    if (!notification.is_read) {
      await markAsRead(notification)
    }
    
    // 获取详细信息
    if (notification.entity_type && notification.entity_id) {
      const detail = await notificationStore.getNotificationDetail(notification.id)
      if (detail && detail.entity) {
        entityData.value = detail.entity
      }
    }
  } catch (error) {
    console.error('获取通知详情失败:', error)
    ElMessage.error('获取通知详情失败')
  }
}

// 删除当前查看的通知并关闭对话框
const deleteAndCloseDialog = () => {
  if (selectedNotification.value) {
    deleteNotification(selectedNotification.value)
  }
}

// 跳转到实体详情
const goToEntity = (notification) => {
  if (!notification.entity_type || !notification.entity_id) return
  
  dialogVisible.value = false
  
  if (notification.entity_type === 'job') {
    router.push(`/jobs/${notification.entity_id}`)
  } else if (notification.entity_type === 'application') {
    router.push(`/applications/${notification.entity_id}`)
  } else if (notification.entity_type === 'message') {
    router.push(`/messages?contact=${notification.entity_id}`)
  } else if (notification.entity_type === 'interview') {
    router.push(`/interviews/${notification.entity_id}`)
  }
}

// 获取表格行的类名
const getRowClass = ({ row }) => {
  return row.is_read ? '' : 'unread-row'
}

// 获取通知类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    'system': 'info',
    'job': 'primary',
    'application': 'success',
    'message': 'warning',
    'resume': 'danger',
    'interview': ''
  }
  return typeMap[type] || 'info'
}

// 获取通知类型文本
const getTypeText = (type) => {
  const typeMap = {
    'system': '系统',
    'job': '职位',
    'application': '申请',
    'message': '消息',
    'resume': '简历',
    'interview': '面试'
  }
  return typeMap[type] || '其他'
}

// 获取申请状态文本
const getApplicationStatusText = (status) => {
  const statusMap = {
    'pending': '待处理',
    'reviewing': '审核中',
    'interview': '面试阶段',
    'offered': '已发offer',
    'hired': '已录用',
    'rejected': '已拒绝',
    'withdrawn': '已撤回'
  }
  return statusMap[status] || status
}

// 处理标签页点击
const handleTabClick = () => {
  currentPage.value = 1
  fetchNotifications()
}

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchNotifications()
}

// 处理每页条数变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
  fetchNotifications()
}

// 生命周期钩子
onMounted(() => {
  fetchNotifications()
})

// 监听路由查询参数变化
watch(
  () => router.currentRoute.value.query,
  (query) => {
    // 如果有类型参数，切换到对应标签
    if (query.type && ['all', 'unread', 'system', 'job', 'application', 'message', 'interview', 'resume'].includes(query.type)) {
      activeTab.value = query.type
      fetchNotifications()
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.notification-page {
  padding: 20px;
}

.notification-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-title {
  margin: 0;
  font-size: 18px;
}

.notification-actions {
  display: flex;
  gap: 10px;
}

.notification-content {
  min-height: 500px;
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--el-fill-color-light);
  
  .icon {
    font-size: 18px;
    
    &.system { color: var(--el-color-info); }
    &.job { color: var(--el-color-primary); }
    &.application { color: var(--el-color-success); }
    &.message { color: var(--el-color-warning); }
    &.resume { color: var(--el-color-danger); }
    &.interview { color: var(--el-color-purple); }
  }
}

.notification-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .unread {
    font-weight: bold;
  }
}

.notification-message {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.notification-actions-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

// 详情对话框样式
.notification-detail {
  padding: 0 10px;
}

.notification-detail-header {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 15px;
}

.notification-detail-title {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.notification-detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.notification-detail-content {
  margin-bottom: 20px;
  line-height: 1.6;
}

.notification-detail-entity {
  background-color: var(--el-fill-color-light);
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
  
  h4 {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 16px;
    color: var(--el-text-color-primary);
  }
}

.entity-info {
  p {
    margin: 8px 0;
  }
}

.entity-actions {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}

:deep(.unread-row) {
  background-color: var(--el-color-primary-light-9);
  
  td {
    transition: background-color 0.3s;
  }
  
  &:hover td {
    background-color: var(--el-color-primary-light-8) !important;
  }
}
</style> 