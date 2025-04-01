<template>
  <view class="container">
    <view v-if="!hasPermission" class="no-permission">
      <text class="no-permission-text">您没有权限查看此用户的统计数据</text>
    </view>
    <block v-else>
      <view v-if="loading" class="loading-container">
        <uni-load-more status="loading" />
      </view>
      <view v-else-if="error" class="error-container">
        <text class="error-text">{{error}}</text>
      </view>
      <block v-else-if="stats">
        <view class="header-section">
          <text class="header-title">个人统计数据</text>
          <text v-if="isAdmin && userId !== currentUserId" class="user-id">用户ID: {{userId}}</text>
        </view>
        
        <view class="stats-section" v-if="userRole === 'seeker'">
          <view class="card">
            <view class="card-header">
              <text class="card-title">求职概况</text>
            </view>
            <view class="card-content">
              <view class="stat-item">
                <view class="stat-value">{{stats.applications_count || 0}}</view>
                <view class="stat-label">申请总数</view>
              </view>
              <view class="stat-item">
                <view class="stat-value">{{stats.interviews_count || 0}}</view>
                <view class="stat-label">面试邀请</view>
              </view>
              <view class="stat-item">
                <view class="stat-value">{{stats.offers_count || 0}}</view>
                <view class="stat-label">收到Offer</view>
              </view>
            </view>
          </view>
          
          <view class="card">
            <view class="card-header">
              <text class="card-title">活跃指数</text>
            </view>
            <view class="card-content">
              <view class="stat-row">
                <view class="stat-label">简历查看次数</view>
                <view class="stat-value">{{stats.resume_views || 0}}</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">简历下载次数</view>
                <view class="stat-value">{{stats.resume_downloads || 0}}</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">简历完整度</view>
                <view class="stat-value">{{stats.profile_completeness || 0}}%</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">平均简历响应时间</view>
                <view class="stat-value">{{stats.avg_response_time || '无数据'}} 小时</view>
              </view>
            </view>
          </view>
          
          <view class="card">
            <view class="card-header">
              <text class="card-title">申请结果统计</text>
            </view>
            <view class="card-content">
              <view class="stat-row">
                <view class="stat-label">简历筛选通过率</view>
                <view class="stat-value">{{calculateRate(stats.screened_applications, stats.applications_count)}}%</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">面试通过率</view>
                <view class="stat-value">{{calculateRate(stats.offers_count, stats.interviews_count)}}%</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">总体成功率</view>
                <view class="stat-value">{{calculateRate(stats.offers_count, stats.applications_count)}}%</view>
              </view>
            </view>
          </view>
        </view>
        
        <view class="stats-section" v-else-if="userRole === 'employer'">
          <view class="card">
            <view class="card-header">
              <text class="card-title">招聘概况</text>
            </view>
            <view class="card-content">
              <view class="stat-item">
                <view class="stat-value">{{stats.jobs_count || 0}}</view>
                <view class="stat-label">发布职位</view>
              </view>
              <view class="stat-item">
                <view class="stat-value">{{stats.active_jobs_count || 0}}</view>
                <view class="stat-label">活跃职位</view>
              </view>
              <view class="stat-item">
                <view class="stat-value">{{stats.filled_jobs_count || 0}}</view>
                <view class="stat-label">已招满职位</view>
              </view>
            </view>
          </view>
          
          <view class="card">
            <view class="card-header">
              <text class="card-title">申请数据</text>
            </view>
            <view class="card-content">
              <view class="stat-row">
                <view class="stat-label">收到申请总数</view>
                <view class="stat-value">{{stats.received_applications || 0}}</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">面试邀请数</view>
                <view class="stat-value">{{stats.interview_invitations || 0}}</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">发出Offer数</view>
                <view class="stat-value">{{stats.sent_offers || 0}}</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">平均每职位申请数</view>
                <view class="stat-value">{{calculateAvg(stats.received_applications, stats.jobs_count)}}</view>
              </view>
            </view>
          </view>
          
          <view class="card">
            <view class="card-header">
              <text class="card-title">效率分析</text>
            </view>
            <view class="card-content">
              <view class="stat-row">
                <view class="stat-label">平均招聘周期</view>
                <view class="stat-value">{{stats.avg_hiring_cycle || '无数据'}} 天</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">简历筛选率</view>
                <view class="stat-value">{{calculateRate(stats.interview_invitations, stats.received_applications)}}%</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">Offer转化率</view>
                <view class="stat-value">{{calculateRate(stats.sent_offers, stats.interview_invitations)}}%</view>
              </view>
              <view class="stat-row">
                <view class="stat-label">平均简历响应时间</view>
                <view class="stat-value">{{stats.avg_response_time || '无数据'}} 小时</view>
              </view>
            </view>
          </view>
        </view>
        
        <view class="updated-time">
          <text>数据更新时间: {{formattedUpdateTime}}</text>
        </view>
      </block>
      <view v-else class="empty-container">
        <text>暂无数据</text>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useStatisticsStore } from '@/stores/statistics'

// 响应式数据
const loading = ref(true)
const error = ref(null)
const hasPermission = ref(false)
const userId = ref(null)
const currentUserId = ref(null)
const userRole = ref('')
const stats = ref(null)
const updateTime = ref(null)

// 获取状态管理
const userStore = useUserStore()
const statisticsStore = useStatisticsStore()

// 计算属性
const isAdmin = computed(() => {
  const userInfo = userStore.userInfo
  return userInfo && userInfo.role === 'admin'
})

const formattedUpdateTime = computed(() => {
  if (!updateTime.value) return '未知'
  return new Date(updateTime.value).toLocaleString()
})

// 页面加载
onLoad((options) => {
  if (options.id) {
    userId.value = options.id
    checkUserPermission()
  } else {
    error.value = '未找到用户ID'
  }
})

// 检查用户权限
async function checkUserPermission() {
  try {
    const userInfo = userStore.userInfo
    if (userInfo) {
      currentUserId.value = userInfo.id
      userRole.value = userInfo.role
      
      // 检查权限：只能查看自己的或是管理员
      if (userId.value === currentUserId.value || userInfo.role === 'admin') {
        hasPermission.value = true
        fetchUserStats()
      }
    }
  } catch (err) {
    console.error('获取用户权限失败:', err)
  }
}

// 获取用户统计数据
async function fetchUserStats() {
  try {
    loading.value = true
    
    const data = await statisticsStore.fetchUserStats(userId.value)
    if (data) {
      stats.value = data
      updateTime.value = new Date()
    } else {
      error.value = '获取数据失败'
    }
  } catch (err) {
    console.error('获取用户统计数据失败:', err)
    error.value = '获取用户统计数据失败'
  } finally {
    loading.value = false
  }
}

// 计算比率
function calculateRate(numerator, denominator) {
  if (!numerator || !denominator) return '0.0'
  return ((numerator / denominator) * 100).toFixed(1)
}

// 计算平均值
function calculateAvg(total, count) {
  if (!total || !count) return '0.0'
  return (total / count).toFixed(1)
}
</script>

<style lang="scss" scoped>
.container {
  padding: $spacing-base;
}

.no-permission, .loading-container, .error-container, .empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
}

.no-permission-text, .error-text {
  font-size: $font-size-medium;
  color: $error-color;
}

.header-section {
  margin-bottom: $spacing-large;
  text-align: center;
  
  .header-title {
    font-size: $font-size-large;
    font-weight: bold;
    margin-bottom: $spacing-xs;
    display: block;
  }
  
  .user-id {
    font-size: $font-size-small;
    color: $text-light-color;
  }
}

.stats-section {
  margin-bottom: $spacing-large;
}

.card {
  background-color: $bg-white-color;
  border-radius: $border-radius-base;
  box-shadow: $box-shadow-base;
  margin-bottom: $spacing-base;
  overflow: hidden;
  
  &-header {
    padding: $spacing-base;
    border-bottom: 1rpx solid $border-lighter-color;
  }
  
  &-title {
    font-size: $font-size-medium;
    font-weight: bold;
  }
  
  &-content {
    padding: $spacing-base;
    display: flex;
  }
}

.stat-item {
  text-align: center;
  flex: 1;
  padding: $spacing-xs;
  
  .stat-value {
    font-size: $font-size-large;
    font-weight: bold;
    color: $primary-color;
    margin-bottom: $spacing-xs;
  }
  
  .stat-label {
    font-size: $font-size-small;
    color: $text-secondary-color;
  }
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-small 0;
  border-bottom: 1rpx solid $border-lighter-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  .stat-label {
    font-size: $font-size-base;
    color: $text-secondary-color;
  }
  
  .stat-value {
    font-size: $font-size-base;
    font-weight: bold;
    color: $primary-color;
  }
}

.updated-time {
  text-align: center;
  margin-top: $spacing-large;
  margin-bottom: $spacing-large;
  
  text {
    font-size: $font-size-small;
    color: $text-light-color;
  }
}
</style> 