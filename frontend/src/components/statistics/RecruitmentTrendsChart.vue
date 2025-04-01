<template>
  <view class="chart-container">
    <view v-if="loading" class="loading-container">
      <u-loading-icon mode="circle" size="32" color="$primary-color"></u-loading-icon>
    </view>
    <view v-else-if="error" class="error-container">
      <text class="error-text">{{error}}</text>
    </view>
    <view v-else-if="!chartData || !chartData.categories || chartData.categories.length === 0" class="empty-container">
      <u-empty text="暂无招聘趋势数据" mode="data"></u-empty>
    </view>
    <view v-else class="chart-wrapper">
      <chart-base
        type="line"
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
  // 趋势类型: 'jobs'|'applications'
  trendType: {
    type: String,
    default: 'jobs', // 默认为职位发布趋势
    validator: (value) => ['jobs', 'applications'].includes(value)
  },
  // 周期类型: 'month'|'week'
  period: {
    type: String,
    default: 'month',
    validator: (value) => ['month', 'week'].includes(value)
  },
  // 显示月数
  months: {
    type: Number,
    default: 6
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

// 图表标题
const chartTitle = computed(() => {
  return props.trendType === 'jobs' ? '职位发布趋势' : '职位申请趋势'
})

// 图表数据计算属性
const chartData = computed(() => {
  // 如果外部传入数据，则使用外部数据
  if (props.data) {
    return formatChartData(props.data)
  }
  
  // 否则使用store中的数据
  if (!statistics.recruitmentTrends) {
    return null
  }
  
  // 根据趋势类型获取数据
  return props.trendType === 'jobs' 
    ? statistics.chartData.trendJobs 
    : statistics.chartData.trendApplications
})

// 图表配置
const chartOptions = computed(() => {
  return {
    title: {
      text: chartTitle.value,
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    legend: {
      show: true
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}个'
    },
    xAxis: {
      title: props.period === 'month' ? '月份' : '周',
      titleFontSize: 12,
      titleFontColor: '#666666',
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      name: '数量',
      nameGap: 15,
      axisLabel: {
        formatter: '{value}'
      }
    },
    extra: {
      line: {
        type: 'curve',
        width: 2,
        activeType: 'hollow',
        linearType: 'custom',
        lineColor: props.trendType === 'jobs' ? '#1890FF' : '#4ECB73'
      },
      tooltip: {
        showBox: true,
        showArrow: true,
        borderWidth: 0,
        borderRadius: 5,
        borderColor: '#1890FF',
        borderOpacity: 0.3,
        bgColor: '#ffffff',
        bgOpacity: 0.9,
        gridType: 'dash',
        dashLength: 4,
        gridColor: '#cccccc',
        fontColor: '#333333',
        fontSize: 12
      }
    }
  }
})

// 监听props变化
watch([() => props.trendType, () => props.period, () => props.months], () => {
  if (props.autoLoad) {
    loadRecruitmentTrends()
  }
})

// 组件挂载时自动加载数据
onMounted(() => {
  if (props.autoLoad && !props.data) {
    loadRecruitmentTrends()
  }
})

// 加载招聘趋势数据
async function loadRecruitmentTrends() {
  try {
    loading.value = true
    error.value = null
    
    await statistics.fetchRecruitmentTrends(props.period, props.months)
    
  } catch (err) {
    console.error('获取招聘趋势数据失败:', err)
    error.value = '获取招聘趋势数据失败'
  } finally {
    loading.value = false
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