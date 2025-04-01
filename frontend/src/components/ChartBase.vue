<template>
  <view :class="['chart-container', customClass]" :style="containerStyle">
    <qiun-data-charts 
      :type="type"
      :chartData="chartData"
      :opts="mergedOpts"
      :canvas2d="canvas2d"
      :background="background"
      :animation="animation"
      :canvasId="uniqueId"
      @getRef="getChartRef"
      @error="handleError"
      @complete="handleComplete"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { v4 as uuidv4 } from '@/utils/uuid'

// 接收的属性
const props = defineProps({
  // 图表类型
  type: {
    type: String,
    default: 'column',
    validator: (value) => {
      return ['line', 'column', 'area', 'ring', 'pie', 'rose', 'radar', 'gauge', 'candle', 'mix'].includes(value)
    }
  },
  // 图表数据
  chartData: {
    type: Object,
    default: () => ({})
  },
  // 图表配置选项
  opts: {
    type: Object,
    default: () => ({})
  },
  // 是否使用canvas2d
  canvas2d: {
    type: Boolean,
    default: true
  },
  // 图表背景颜色
  background: {
    type: String,
    default: 'rgba(0,0,0,0)'
  },
  // 是否启用动画
  animation: {
    type: Boolean,
    default: true
  },
  // 图表容器高度
  height: {
    type: [Number, String],
    default: 300
  },
  // 图表容器宽度，默认为100%
  width: {
    type: [Number, String],
    default: '100%'
  },
  // 自定义样式类
  customClass: {
    type: String,
    default: ''
  }
})

// 事件
const emit = defineEmits(['getRef', 'error', 'complete'])

// 唯一ID，用于canvasId
const uniqueId = `chart_${uuidv4()}`

// 图表实例引用
const chartRef = ref(null)

// 默认配置
const defaultOpts = {
  padding: [15, 15, 15, 15],
  enableScroll: false,
  legend: {
    show: true,
    position: 'bottom',
    float: 'center'
  },
  xAxis: {
    disableGrid: true,
    rotateLabel: false
  },
  yAxis: {
    gridType: 'dash',
    dashLength: 2,
    min: 0
  },
  extra: {
    column: {
      width: 30
    },
    line: {
      type: 'straight',
      width: 2
    },
    area: {
      opacity: 0.2,
      gradient: true
    },
    pie: {
      activeRadius: 10,
      offsetAngle: 0,
      labelWidth: 15,
      border: false,
      borderWidth: 3,
      borderColor: '#FFFFFF'
    }
  }
}

// 合并配置
const mergedOpts = computed(() => {
  return {
    ...defaultOpts,
    ...props.opts,
    extra: {
      ...defaultOpts.extra,
      ...(props.opts.extra || {})
    }
  }
})

// 容器样式
const containerStyle = computed(() => {
  return {
    height: typeof props.height === 'number' ? `${props.height}rpx` : props.height,
    width: typeof props.width === 'number' ? `${props.width}rpx` : props.width
  }
})

// 获取图表引用
const getChartRef = (ref) => {
  chartRef.value = ref
  emit('getRef', ref)
}

// 处理错误
const handleError = (error) => {
  console.error('图表渲染错误:', error)
  emit('error', error)
}

// 处理完成
const handleComplete = (res) => {
  emit('complete', res)
}

// 更新图表数据
const updateChart = (newData) => {
  if (chartRef.value && newData) {
    chartRef.value.updateData(newData)
  }
}

// 导出更新方法
defineExpose({
  chartRef,
  updateChart
})

// 组件挂载时
onMounted(() => {
  console.log('Chart mounted:', uniqueId)
})

// 组件卸载前
onBeforeUnmount(() => {
  chartRef.value = null
})
</script>

<style lang="scss" scoped>
.chart-container {
  position: relative;
  box-sizing: border-box;
  margin: 0 auto;
  width: 100%;
}
</style> 