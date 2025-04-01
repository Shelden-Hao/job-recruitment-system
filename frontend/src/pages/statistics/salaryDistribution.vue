<template>
  <view class="container">
    <u-navbar 
      title="薪资分布" 
      :autoBack="true"
      bgColor="#ffffff"
    />
    
    <view class="content">
      <u-card
        :title="'薪资分布统计'"
        :head-style="{ borderBottom: '1px solid #f5f5f5' }"
        :foot-style="{ borderTop: '1px solid #f5f5f5' }"
      >
        <template #body>
          <view class="chart-wrapper">
            <u-loading-icon v-if="statisticsStore.loading" mode="circle" size="36" color="#1890FF" />
            <u-empty v-else-if="!hasData" mode="data" />
            <template v-else>
              <chart-base
                type="column"
                :chartData="chartData"
                :opts="chartOpts"
                :height="400"
              />
            </template>
          </view>
        </template>
        <template #foot>
          <view class="chart-footer">
            <u-text 
              v-if="!statisticsStore.loading && hasData" 
              type="info" 
              text="数据来源：系统职位薪资统计" 
              iconStyle="font-size: 28rpx" 
              size="24rpx"
            />
          </view>
        </template>
      </u-card>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import ChartBase from '@/components/ChartBase.vue'

// Store
const statisticsStore = useStatisticsStore()

// 图表配置
const chartOpts = {
  color: ['#1890FF'],
  padding: [15, 15, 0, 15],
  enableScroll: false,
  legend: {
    show: false
  },
  xAxis: {
    disableGrid: true,
    title: '薪资范围 (元/月)',
    titleFontSize: 12,
    titleFontColor: '#666666',
    rotateLabel: true
  },
  yAxis: {
    gridType: 'dash',
    dashLength: 2,
    title: '职位数量',
    titleFontSize: 12,
    titleFontColor: '#666666',
    min: 0
  },
  extra: {
    column: {
      width: 25,
      activeBgColor: '#000000',
      activeBgOpacity: 0.08
    },
    tooltip: {
      showBox: true,
      showArrow: true,
      showCategory: true,
      borderWidth: 0,
      borderRadius: 5,
      borderColor: '#1890FF',
      borderOpacity: 0.3,
      bgColor: '#ffffff',
      bgOpacity: 0.9,
      gridType: 'dash',
      dashLength: 4,
      gridColor: '#cccccc',
      boxPadding: 5,
      fontColor: '#333333',
      fontSize: 12
    }
  }
}

// 是否有数据
const hasData = computed(() => {
  return statisticsStore.salaryDistribution && statisticsStore.salaryDistribution.length > 0
})

// 图表数据
const chartData = computed(() => {
  if (!hasData.value) return {}
  return statisticsStore.chartData.salaryChart
})

// 初始化
onMounted(async () => {
  await statisticsStore.fetchSalaryDistribution()
})
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