<template>
  <view class="container">
    <u-navbar 
      title="求职者地域分布" 
      :autoBack="true"
      bgColor="#ffffff"
    />
    
    <view class="content">
      <u-card
        :title="'求职者地域分布'"
        :head-style="{ borderBottom: '1px solid #f5f5f5' }"
        :foot-style="{ borderTop: '1px solid #f5f5f5' }"
      >
        <template #body>
          <view class="chart-wrapper">
            <seeker-location-chart height="500rpx" />
          </view>
        </template>
        <template #foot>
          <view class="chart-footer">
            <u-text 
              v-if="!statisticsStore.loading && hasData" 
              type="info" 
              text="数据来源：系统求职者信息统计" 
              iconStyle="font-size: 28rpx" 
              size="24rpx"
            />
          </view>
        </template>
      </u-card>
      
      <view class="tip-message" v-if="!hasPermission">
        <u-notice-bar
          :text="'注意：该统计仅对企业用户和管理员可见'"
          mode="warning"
          icon="warning-fill"
          :fontSize="26"
        ></u-notice-bar>
      </view>
      
      <view class="data-list" v-if="hasData">
        <u-cell-group>
          <u-cell
            v-for="(item, index) in locationData"
            :key="index"
            :title="item.location"
            :value="`${item.count}人`"
            :label="`占比${calculatePercentage(item.count)}%`"
          >
            <template #icon>
              <view :style="{
                width: '36rpx',
                height: '36rpx',
                borderRadius: '50%',
                backgroundColor: getRandomColor(index),
                marginRight: '10rpx'
              }"></view>
            </template>
          </u-cell>
        </u-cell-group>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useStatisticsStore } from '@/stores/statistics'
import SeekerLocationChart from '@/components/statistics/SeekerLocationChart.vue'

// 状态管理
const userStore = useUserStore()
const statisticsStore = useStatisticsStore()

// 随机颜色数组 - 用于图表和列表项显示
const colorPalette = [
  '#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E8684A',
  '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99', '#FF99C3'
]

// 计算属性
const hasPermission = computed(() => {
  return userStore.isAdmin || userStore.isEmployer
})

const hasData = computed(() => {
  return statisticsStore.seekerLocation && statisticsStore.seekerLocation.length > 0
})

const locationData = computed(() => {
  if (!hasData.value) return []
  return statisticsStore.seekerLocation
})

const totalCount = computed(() => {
  if (!hasData.value) return 0
  return statisticsStore.seekerLocation.reduce((sum, item) => sum + item.count, 0)
})

// 生命周期
onMounted(async () => {
  if (hasPermission.value) {
    await statisticsStore.fetchSeekerLocation()
  }
})

// 方法
function calculatePercentage(count) {
  if (totalCount.value === 0) return '0.0'
  return ((count / totalCount.value) * 100).toFixed(1)
}

function getRandomColor(index) {
  return colorPalette[index % colorPalette.length]
}
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  background-color: $bg-color;
  min-height: 100vh;
}

.content {
  padding: $spacing-base;
}

.chart-wrapper {
  width: 100%;
  height: 500rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-small 0;
}

.tip-message {
  margin: $spacing-base 0;
}

.data-list {
  margin-top: $spacing-large;
}
</style> 