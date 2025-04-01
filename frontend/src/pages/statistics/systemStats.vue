<template>
  <view class="container">
    <view v-if="!isAdmin" class="no-permission">
      <text class="no-permission-text">您没有权限查看系统统计数据</text>
    </view>
    <block v-else>
      <view class="summary-section">
        <view class="card summary-row">
          <view class="summary-item">
            <text class="summary-value">{{stats.total_users || 0}}</text>
            <text class="summary-label">总用户数</text>
            <text class="summary-new">今日新增: {{stats.new_users || 0}}</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{stats.total_jobs || 0}}</text>
            <text class="summary-label">总职位数</text>
            <text class="summary-new">今日新增: {{stats.new_jobs || 0}}</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{stats.total_applications || 0}}</text>
            <text class="summary-label">总申请数</text>
            <text class="summary-new">今日新增: {{stats.new_applications || 0}}</text>
          </view>
        </view>
      </view>
      
      <view class="card">
        <view class="card-header">
          <text class="card-title">活跃用户统计</text>
        </view>
        <view class="card-content">
          <view class="stat-row">
            <view class="stat-label">活跃用户数(近7天)</view>
            <view class="stat-value">{{stats.active_users || 0}}</view>
          </view>
          <view class="stat-row">
            <view class="stat-label">活跃用户比例</view>
            <view class="stat-value">{{activeUserRate}}%</view>
          </view>
        </view>
      </view>
      
      <view class="card">
        <view class="card-header">
          <text class="card-title">系统效率</text>
        </view>
        <view class="card-content">
          <view class="stat-row">
            <view class="stat-label">平均招聘周期</view>
            <view class="stat-value">{{stats.average_job_duration || 0}} 天</view>
          </view>
          <view class="stat-row">
            <view class="stat-label">面试总数</view>
            <view class="stat-value">{{stats.total_interviews || 0}}</view>
          </view>
          <view class="stat-row">
            <view class="stat-label">今日新增面试</view>
            <view class="stat-value">{{stats.new_interviews || 0}}</view>
          </view>
        </view>
      </view>
      
      <view class="card">
        <view class="card-header">
          <text class="card-title">实时数据</text>
        </view>
        <view class="card-content">
          <view class="stat-row">
            <view class="stat-label">当前活跃职位</view>
            <view class="stat-value">{{realtimeStats.active_jobs || 0}}</view>
          </view>
          <view class="stat-row">
            <view class="stat-label">当前活跃用户</view>
            <view class="stat-value">{{realtimeStats.active_users || 0}}</view>
          </view>
        </view>
      </view>
      
      <view class="updated-time">
        <text>数据更新时间: {{formattedUpdateTime}}</text>
      </view>
    </block>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      error: null,
      isAdmin: false,
      stats: {},
      realtimeStats: {},
      updateTime: null
    }
  },
  computed: {
    activeUserRate() {
      if (!this.stats.total_users || !this.stats.active_users) return '0.0';
      const rate = (this.stats.active_users / this.stats.total_users * 100).toFixed(1);
      return rate;
    },
    formattedUpdateTime() {
      if (!this.updateTime) return '未知';
      return new Date(this.updateTime).toLocaleString();
    }
  },
  onLoad() {
    this.checkUserRole();
  },
  methods: {
    async checkUserRole() {
      // 获取用户信息并检查角色
      try {
        const userInfo = uni.getStorageSync('userInfo');
        if (userInfo && userInfo.role === 'admin') {
          this.isAdmin = true;
          this.fetchSystemStats();
        }
      } catch (err) {
        console.error('获取用户角色失败:', err);
      }
    },
    
    async fetchSystemStats() {
      try {
        this.loading = true;
        const token = uni.getStorageSync('token');
        
        // 发起请求获取系统统计数据
        const { data } = await uni.request({
          url: '/api/statistics/system',
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (data.status === 'success') {
          const { system_stats } = data.data;
          this.stats = system_stats || {};
          this.realtimeStats = system_stats.real_time || {};
          this.updateTime = new Date();
        } else {
          this.error = '获取数据失败';
          uni.showToast({
            title: '获取统计数据失败',
            icon: 'none'
          });
        }
      } catch (err) {
        console.error('获取系统统计数据失败:', err);
        this.error = '获取系统统计数据失败';
        uni.showToast({
          title: '获取统计数据失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style>
.container {
  padding: 20rpx;
}
.no-permission {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
}
.no-permission-text {
  font-size: 32rpx;
  color: #ff5722;
}
.summary-section {
  margin-bottom: 20rpx;
}
.card {
  background-color: #ffffff;
  border-radius: 10rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 20rpx;
  overflow: hidden;
}
.summary-row {
  display: flex;
  padding: 20rpx 0;
}
.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rpx;
  border-right: 1rpx solid #f0f0f0;
}
.summary-item:last-child {
  border-right: none;
}
.summary-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #1890FF;
  margin-bottom: 10rpx;
}
.summary-label {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 10rpx;
}
.summary-new {
  font-size: 22rpx;
  color: #999999;
}
.card-header {
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.card-title {
  font-size: 32rpx;
  font-weight: bold;
}
.card-content {
  padding: 20rpx;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.stat-row:last-child {
  border-bottom: none;
}
.stat-label {
  font-size: 28rpx;
  color: #333333;
}
.stat-value {
  font-size: 28rpx;
  color: #1890FF;
  font-weight: bold;
}
.updated-time {
  text-align: center;
  margin-top: 30rpx;
  margin-bottom: 30rpx;
}
.updated-time text {
  font-size: 24rpx;
  color: #999999;
}
</style> 