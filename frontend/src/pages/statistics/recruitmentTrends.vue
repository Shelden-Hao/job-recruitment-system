<template>
  <view class="container">
    <u-navbar 
      title="招聘趋势" 
      :autoBack="true"
      bgColor="#ffffff"
    />
    
    <view class="content">
      <u-sticky bgColor="#f8f8f8">
        <view class="filter-bar">
          <view class="filter-item">
            <u-radio-group v-model="period" placement="row">
              <u-radio label="月" name="month"></u-radio>
              <u-radio label="周" name="week"></u-radio>
            </u-radio-group>
          </view>
          <view class="filter-item">
            <u-number-box v-model="months" :min="1" :max="12" @change="handleMonthsChange"></u-number-box>
            <text class="filter-label">{{period === 'month' ? '个月' : '周'}}</text>
          </view>
        </view>
      </u-sticky>
      
      <view class="charts-container">
        <!-- 职位发布趋势图表 -->
        <u-card
          :title="'职位发布趋势'"
          :head-style="{ borderBottom: '1px solid #f5f5f5' }"
          :foot-style="{ borderTop: '1px solid #f5f5f5' }"
          :margin="['20rpx', 0]"
        >
          <template #body>
            <view class="chart-wrapper">
              <recruitment-trends-chart
                trendType="jobs"
                :period="period"
                :months="months"
                height="400rpx"
              />
            </view>
          </template>
          <template #foot>
            <view class="chart-footer">
              <u-text 
                v-if="!statisticsStore.loading" 
                type="info" 
                :text="`显示最近${months}${period === 'month' ? '个月' : '周'}的数据`" 
                iconStyle="font-size: 28rpx" 
                size="24rpx"
              />
            </view>
          </template>
        </u-card>
        
        <!-- 职位申请趋势图表 -->
        <u-card
          :title="'职位申请趋势'"
          :head-style="{ borderBottom: '1px solid #f5f5f5' }"
          :foot-style="{ borderTop: '1px solid #f5f5f5' }"
          :margin="['20rpx', 0]"
        >
          <template #body>
            <view class="chart-wrapper">
              <recruitment-trends-chart
                trendType="applications"
                :period="period"
                :months="months"
                height="400rpx"
              />
            </view>
          </template>
          <template #foot>
            <view class="chart-footer">
              <u-text 
                v-if="!statisticsStore.loading" 
                type="info" 
                text="数据来源：系统招聘申请统计" 
                iconStyle="font-size: 28rpx" 
                size="24rpx"
              />
            </view>
          </template>
        </u-card>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import RecruitmentTrendsChart from '@/components/statistics/RecruitmentTrendsChart.vue'

// 状态管理
const statisticsStore = useStatisticsStore()

// 过滤条件
const period = ref('month')  // 'month' 或 'week'
const months = ref(6)        // 显示几个月的数据

// 处理月份变化
function handleMonthsChange(value) {
  months.value = value
}

// 监听过滤条件变化，自动更新图表
watch([period, months], () => {
  // 图表组件内部会自动处理数据加载
}, { deep: true })
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  background-color: $bg-color;
  min-height: 100vh;
}

.content {
  padding-bottom: $spacing-large;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-base;
  background-color: $bg-color;
  margin-bottom: $spacing-small;
}

.filter-item {
  display: flex;
  align-items: center;
}

.filter-label {
  margin-left: $spacing-small;
  font-size: $font-size-base;
  color: $text-normal-color;
}

.charts-container {
  padding: 0 $spacing-base;
}

.chart-wrapper {
  width: 100%;
  height: 450rpx;
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
</style> 