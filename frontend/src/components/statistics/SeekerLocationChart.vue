<template>
  <view class="chart-container">
    <view v-if="loading" class="loading-container">
      <u-loading-icon mode="circle" size="32" color="$primary-color"></u-loading-icon>
    </view>
    <view v-else-if="error" class="error-container">
      <text class="error-text">{{error}}</text>
    </view>
    <view v-else-if="!chartData || !chartData.series || !chartData.series[0].data || chartData.series[0].data.length === 0" class="empty-container">
      <u-empty text="暂无地域分布数据" mode="data"></u-empty>
    </view>
    <view v-else class="chart-wrapper">
      <chart-base
        type="pie"
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
  if (!statistics.seekerLocation) {
    return null
  }
  
  return statistics.chartData.locationPie
})

// 图表配置
const chartOptions = computed(() => {
  return {
    title: {
      text: '求职者地域分布',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      float: 'center',
      itemGap: 10,
      fontSize: 11,
      lineHeight: 11,
      padding: 15
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)'
    },
    series: {
      label: {
        show: false
      },
      emphasis: {
        scale: true,
        scaleSize: 10
      }
    },
    extra: {
      pie: {
        activeOpacity: 0.5,
        activeRadius: 10,
        offsetAngle: 0,
        labelWidth: 15,
        border: false,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        linearType: 'custom'
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
        fontColor: '#333333',
        fontSize: 12
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
    loadSeekerLocation()
  }
})

// 加载求职者地域分布数据
async function loadSeekerLocation() {
  try {
    loading.value = true
    error.value = null
    
    await statistics.fetchSeekerLocation()
    
  } catch (err) {
    console.error('获取求职者地域分布数据失败:', err)
    error.value = '获取求职者地域分布数据失败'
  } finally {
    loading.value = false
  }
}

// 更新图表
function updateChart() {
  if (chartRef.value) {
    chartRef.value.refresh()
  }
}

// 格式化图表数据
function formatChartData(data) {
  if (!data || !data.location_distribution || !Array.isArray(data.location_distribution)) {
    return null
  }
  
  return {
    series: [{
      data: data.location_distribution.map(item => ({
        name: item.location,
        value: item.count
      }))
    }]
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