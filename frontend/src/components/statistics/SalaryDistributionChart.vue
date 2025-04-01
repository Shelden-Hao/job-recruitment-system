<template>
  <view class="chart-container">
    <view v-if="loading" class="loading-container">
      <u-loading-icon mode="circle" size="32" color="$primary-color"></u-loading-icon>
    </view>
    <view v-else-if="error" class="error-container">
      <text class="error-text">{{error}}</text>
    </view>
    <view v-else-if="!chartData || chartData.categories.length === 0" class="empty-container">
      <u-empty text="暂无薪资分布数据" mode="data"></u-empty>
    </view>
    <view v-else class="chart-wrapper">
      <chart-base
        type="column"
        :chartData="chartData"
        :opts="chartOptions"
        @getChartRef="getChartRef"
      />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import ChartBase from '@/components/ChartBase.vue'

// 定义组件属性
const props = defineProps({
  // 数据源，可以通过属性传入或者自动请求
  data: {
    type: Object,
    default: null
  },
  // 是否自动加载数据
  autoLoad: {
    type: Boolean,
    default: true
  },
  // 图表高度
  height: {
    type: String,
    default: '400rpx'
  }
})

// 本地状态
const loading = ref(false)
const error = ref(null)
const chartRef = ref(null)
const statistics = useStatisticsStore()

// 图表数据计算属性
const chartData = computed(() => {
  // 如果外部传入数据，则使用外部数据
  if (props.data) {
    return formatChartData(props.data)
  }
  
  // 否则使用store中的数据
  const salaryData = statistics.salaryDistribution
  if (!salaryData || !salaryData.salary_ranges) {
    return null
  }
  
  return formatChartData(salaryData)
})

// 图表配置
const chartOptions = computed(() => {
  return {
    title: {
      text: '薪资分布',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    legend: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}人'
    },
    xAxis: {
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      name: '人数',
      nameGap: 15,
      axisLabel: {
        formatter: '{value}'
      }
    },
    extra: {
      column: {
        width: 20,
        barBorderRadius: [5, 5, 0, 0]
      }
    }
  }
})

// 监听props.data变化
watch(() => props.data, () => {
  if (props.data) {
    updateChart()
  }
})

// 组件挂载时自动加载数据
onMounted(() => {
  if (props.autoLoad && !props.data) {
    loadSalaryDistribution()
  }
})

// 加载薪资分布数据
async function loadSalaryDistribution() {
  try {
    loading.value = true
    error.value = null
    
    await statistics.fetchSalaryDistribution()
    
  } catch (err) {
    console.error('获取薪资分布数据失败:', err)
    error.value = '获取薪资分布数据失败'
  } finally {
    loading.value = false
  }
}

// 格式化图表数据
function formatChartData(data) {
  if (!data || !data.salary_ranges) {
    return null
  }
  
  const categories = []
  const salaryData = []
  
  data.salary_ranges.forEach(range => {
    categories.push(range.range)
    salaryData.push(range.count)
  })
  
  return {
    categories: categories,
    series: [
      {
        name: '薪资分布',
        data: salaryData,
        color: '#1890FF'
      }
    ]
  }
}

// 更新图表
function updateChart() {
  if (chartRef.value) {
    chartRef.value.refresh()
  }
}

// 获取图表引用
function getChartRef(chart) {
  chartRef.value = chart
}
</script>

<style lang="scss" scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: v-bind('props.height');
  background-color: $bg-white-color;
  border-radius: $border-radius-base;
  box-shadow: $box-shadow-base;
  overflow: hidden;
}

.chart-wrapper {
  width: 100%;
  height: 100%;
}

.loading-container, .error-container, .empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.error-text {
  color: $error-color;
  font-size: $font-size-base;
}
</style> 