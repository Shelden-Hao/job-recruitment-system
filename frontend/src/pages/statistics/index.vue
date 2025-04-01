<template>
  <view class="container">
    <view class="header">
      <text class="title">数据统计</text>
    </view>
    
    <view class="grid">
      <view class="grid-item" @click="navigateTo('/pages/statistics/systemStats')">
        <view class="grid-icon admin-icon">
          <text class="iconfont icon-system"></text>
        </view>
        <text class="grid-text">系统统计</text>
        <text class="grid-desc">仅管理员可用</text>
      </view>
      
      <view class="grid-item" @click="navigateTo('/pages/statistics/popularJobs')">
        <view class="grid-icon">
          <text class="iconfont icon-hot"></text>
        </view>
        <text class="grid-text">热门职位</text>
        <text class="grid-desc">实时热度排名</text>
      </view>
      
      <view class="grid-item" @click="navigateTo('/pages/statistics/salaryDistribution')">
        <view class="grid-icon">
          <text class="iconfont icon-salary"></text>
        </view>
        <text class="grid-text">薪资分布</text>
        <text class="grid-desc">行业薪资概况</text>
      </view>
      
      <view class="grid-item" @click="navigateTo('/pages/statistics/seekerLocation')">
        <view class="grid-icon employer-icon">
          <text class="iconfont icon-location"></text>
        </view>
        <text class="grid-text">求职者分布</text>
        <text class="grid-desc">仅企业和管理员可用</text>
      </view>
      
      <view class="grid-item" @click="navigateTo('/pages/statistics/recruitmentTrends')">
        <view class="grid-icon">
          <text class="iconfont icon-trend"></text>
        </view>
        <text class="grid-text">招聘趋势</text>
        <text class="grid-desc">市场招聘走势</text>
      </view>
      
      <view class="grid-item" @click="navigateToUserStats">
        <view class="grid-icon">
          <text class="iconfont icon-user-stat"></text>
        </view>
        <text class="grid-text">个人统计</text>
        <text class="grid-desc">您的个人数据</text>
      </view>
    </view>
    
    <view class="disclaimer">
      <text>所有统计数据基于系统实时计算</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

// 响应式数据
const userInfo = ref(null)
const userStore = useUserStore()

// 生命周期钩子
onMounted(() => {
  getUserInfo()
})

// 获取用户信息
function getUserInfo() {
  try {
    userInfo.value = userStore.userInfo
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

// 页面导航
function navigateTo(url) {
  uni.navigateTo({ url })
}

// 导航到个人统计
function navigateToUserStats() {
  if (!userInfo.value || !userInfo.value.id) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }
  
  uni.navigateTo({
    url: `/pages/statistics/userStats?id=${userInfo.value.id}`
  })
}
</script>

<style lang="scss" scoped>
.container {
  padding: $spacing-base;
}

.header {
  padding: $spacing-large 0;
  text-align: center;
  
  .title {
    font-size: $font-size-large;
    font-weight: bold;
  }
}

.grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -10rpx;
  
  &-item {
    width: 33.33%;
    padding: 10rpx;
    box-sizing: border-box;
  }
  
  &-icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background-color: $primary-color;
    color: $text-white-color;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto $spacing-base;
    
    &.admin-icon {
      background-color: $error-color;
    }
    
    &.employer-icon {
      background-color: $success-color;
    }
  }
  
  &-text {
    display: block;
    text-align: center;
    font-size: $font-size-base;
    color: $text-main-color;
    margin-bottom: $spacing-xs;
  }
  
  &-desc {
    display: block;
    text-align: center;
    font-size: $font-size-small;
    color: $text-light-color;
  }
}

.disclaimer {
  margin-top: 60rpx;
  text-align: center;
  
  text {
    font-size: $font-size-small;
    color: $text-light-color;
  }
}

/* 图标字体类 - 这里仅为示例，实际项目中需要引入相应的图标字体 */
@font-face {
  font-family: "iconfont";
  src: url('data:font/woff2;charset=utf-8;base64,d09GMgABAAAAAAO0AA...') format('woff2');
}

.iconfont {
  font-family: "iconfont" !important;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 50rpx;
}

.icon-system:before { content: "\e64f"; }
.icon-hot:before { content: "\e756"; }
.icon-salary:before { content: "\e63a"; }
.icon-location:before { content: "\e611"; }
.icon-trend:before { content: "\e63d"; }
.icon-user-stat:before { content: "\e62d"; }
</style> 