<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

// 生命周期函数
onLaunch(() => {
  console.log('App Launch')
  // 检查登录状态
  checkLogin()
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})

// 检查登录状态
function checkLogin() {
  const userStore = useUserStore()
  
  // 如果没有token或用户信息，跳转到登录页
  if (!userStore.token || !userStore.userInfo) {
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/login/index'
      })
    }, 1000)
  }
}
</script>

<style lang="scss">
/* 全局样式 */
page {
  background-color: $bg-color;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  font-size: $font-size-base;
  color: $text-main-color;
  line-height: $line-height-base;
}

/* 通用卡片样式 */
.card {
  background-color: $bg-white-color;
  border-radius: $border-radius-base;
  box-shadow: $box-shadow-base;
  margin-bottom: $spacing-base;
  overflow: hidden;
}

.card-header {
  padding: $spacing-base;
  border-bottom: 1rpx solid $border-lighter-color;
}

.card-title {
  font-size: $font-size-medium;
  font-weight: bold;
}

.card-content {
  padding: $spacing-base;
}

/* 通用间距 */
.container {
  padding: $spacing-base;
}

/* 通用状态样式 */
.loading-container, .error-container, .empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400rpx;
}

.error-text {
  color: $error-color;
}

/* 通用文本截断 */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 通用文本居中 */
.text-center {
  text-align: center;
}

/* 通用边距类 */
.mt-10 { margin-top: $spacing-small; }
.mt-20 { margin-top: $spacing-base; }
.mt-30 { margin-top: $spacing-large; }
.mb-10 { margin-bottom: $spacing-small; }
.mb-20 { margin-bottom: $spacing-base; }
.mb-30 { margin-bottom: $spacing-large; }
.ml-10 { margin-left: $spacing-small; }
.mr-10 { margin-right: $spacing-small; }
.p-20 { padding: $spacing-base; }

/* 通用弹性布局 */
.flex-row {
  display: flex;
  flex-direction: row;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.flex-wrap {
  flex-wrap: wrap;
}

.flex-center {
  justify-content: center;
  align-items: center;
}

.flex-between {
  justify-content: space-between;
}

.flex-around {
  justify-content: space-around;
}

.flex-1 {
  flex: 1;
}
</style> 