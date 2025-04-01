<template>
  <view class="app-container">
    <view class="status-bar-height" :style="{ height: statusBarHeight + 'px' }"></view>
    <!-- 应用主体内容 -->
  </view>
</template>

<script setup>
import { ref, onLaunch, onShow, onHide } from 'vue';
import { useUserStore } from '@/stores/user';

// 获取状态栏高度
const statusBarHeight = ref(0);

// 获取用户存储
const userStore = useUserStore();

// 应用启动时
onLaunch(() => {
  console.log('App Launch');
  
  // 初始化用户信息
  userStore.init();
  
  // 获取系统信息
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 0;
  
  // 检查更新
  checkUpdate();
});

// 应用显示时
onShow(() => {
  console.log('App Show');
});

// 应用隐藏时
onHide(() => {
  console.log('App Hide');
});

// 检查更新
function checkUpdate() {
  // #ifdef MP-WEIXIN
  if (uni.canIUse('getUpdateManager')) {
    const updateManager = uni.getUpdateManager();
    
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        console.log('有新版本可用');
      }
    });
    
    updateManager.onUpdateReady(() => {
      uni.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate();
          }
        }
      });
    });
    
    updateManager.onUpdateFailed(() => {
      uni.showToast({
        title: '更新失败',
        icon: 'none'
      });
    });
  }
  // #endif
}
</script>

<style lang="scss">
/* 引入基础样式 */
@import "@/styles/variables.scss";

/* 全局样式 */
page {
  font-size: 14px;
  color: $text-color-primary;
  background-color: $bg-color;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  -webkit-font-smoothing: antialiased;
  height: 100%;
  width: 100%;
}

.app-container {
  width: 100%;
  height: 100%;
}

/* 状态栏高度占位，避免内容被状态栏遮挡 */
.status-bar-height {
  width: 100%;
}

/* 清除默认样式 */
view, text, input, button, textarea, image {
  box-sizing: border-box;
}

/* 清除按钮默认样式 */
button {
  padding: 0;
  margin: 0;
  background-color: transparent;
  line-height: inherit;
  border-radius: 0;
  &::after {
    border: none;
  }
}

/* 表单组件公共样式 */
input, textarea {
  width: 100%;
  padding: 0 $padding-md;
  color: $text-color-primary;
  &::placeholder {
    color: $text-color-placeholder;
  }
  &:focus {
    outline: none;
  }
}

/* 隐藏滚动条 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
  background-color: transparent;
}

/* 边框样式 */
.hairline-top {
  position: relative;
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background-color: $border-color;
    transform: scaleY(0.5);
  }
}

.hairline-bottom {
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background-color: $border-color;
    transform: scaleY(0.5);
  }
}

/* flex布局助手 */
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

.flex-row {
  display: flex;
  flex-direction: row;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-around {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.flex-1 {
  flex: 1;
}

/* 边距助手 */
.padding {
  padding: $padding-base;
}

.padding-sm {
  padding: $padding-sm;
}

.padding-md {
  padding: $padding-md;
}

.padding-lg {
  padding: $padding-lg;
}

.margin {
  margin: $padding-base;
}

.margin-sm {
  margin: $padding-sm;
}

.margin-md {
  margin: $padding-md;
}

.margin-lg {
  margin: $padding-lg;
}

/* 字体大小 */
.font-xs {
  font-size: $font-size-xs;
}

.font-sm {
  font-size: $font-size-sm;
}

.font-md {
  font-size: $font-size-md;
}

.font-lg {
  font-size: $font-size-lg;
}

.font-xl {
  font-size: $font-size-xl;
}

/* 文本样式 */
.text-primary {
  color: $text-color-primary;
}

.text-regular {
  color: $text-color-regular;
}

.text-secondary {
  color: $text-color-secondary;
}

.text-placeholder {
  color: $text-color-placeholder;
}

.text-danger {
  color: $color-danger;
}

.text-success {
  color: $color-success;
}

.text-warning {
  color: $color-warning;
}

.text-info {
  color: $color-info;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.text-bold {
  font-weight: bold;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 颜色样式 */
.bg-primary {
  background-color: $color-primary;
}

.bg-success {
  background-color: $color-success;
}

.bg-danger {
  background-color: $color-danger;
}

.bg-warning {
  background-color: $color-warning;
}

.bg-info {
  background-color: $color-info;
}

.bg-white {
  background-color: #fff;
}

.bg-light {
  background-color: $bg-color-light;
}

/* 卡片样式 */
.card {
  background-color: #fff;
  border-radius: $border-radius-lg;
  padding: $padding-md;
  margin-bottom: $padding-md;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

/* 按钮样式 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 $padding-lg;
  font-size: $font-size-md;
  border-radius: $border-radius-md;
  text-align: center;
  box-sizing: border-box;
}

.btn-primary {
  color: #fff;
  background-color: $color-primary;
}

.btn-success {
  color: #fff;
  background-color: $color-success;
}

.btn-danger {
  color: #fff;
  background-color: $color-danger;
}

.btn-warning {
  color: #fff;
  background-color: $color-warning;
}

.btn-info {
  color: #fff;
  background-color: $color-info;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid $border-color;
}

.btn-outline-primary {
  color: $color-primary;
  border-color: $color-primary;
}

.btn-outline-success {
  color: $color-success;
  border-color: $color-success;
}

.btn-outline-danger {
  color: $color-danger;
  border-color: $color-danger;
}

.btn-outline-warning {
  color: $color-warning;
  border-color: $color-warning;
}

.btn-outline-info {
  color: $color-info;
  border-color: $color-info;
}

.btn-sm {
  height: 36px;
  font-size: $font-size-sm;
}

.btn-lg {
  height: 52px;
  font-size: $font-size-lg;
}

.btn-block {
  display: block;
  width: 100%;
}

.btn-disabled,
.btn[disabled] {
  opacity: 0.6;
  pointer-events: none;
}

/* 分割线样式 */
.divider {
  width: 100%;
  height: 1px;
  background-color: $border-color;
  margin: $padding-md 0;
}

/* 页面容器样式 */
.page-container {
  padding: $padding-md;
  min-height: 100vh;
  background-color: $bg-color;
}
</style> 