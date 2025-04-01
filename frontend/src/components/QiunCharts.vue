<template>
  <view>
    <qiun-data-charts
      :type="type"
      :chartData="chartData"
      :opts="opts"
      :canvas2d="canvas2d"
      :background="background"
      :animation="animation"
      :width="width"
      :height="height"
      :beforeInit="beforeInit"
      @getRef="getRef"
      @error="error"
      @complete="complete"
    />
  </view>
</template>

<script>
// 引入 uCharts.js
import uCharts from '@qiun/ucharts';

export default {
  name: 'QiunCharts',
  props: {
    // 图表类型
    type: {
      type: String,
      default: 'column'
    },
    // 图表数据
    chartData: {
      type: Object,
      default: () => ({})
    },
    // 图表配置项
    opts: {
      type: Object,
      default: () => ({})
    },
    // 是否使用canvas2d
    canvas2d: {
      type: Boolean,
      default: true
    },
    // 背景颜色
    background: {
      type: String,
      default: 'rgba(0,0,0,0)'
    },
    // 是否启用动画
    animation: {
      type: Boolean,
      default: true
    },
    // 图表宽度
    width: {
      type: Number,
      default: 0
    },
    // 图表高度
    height: {
      type: Number,
      default: 0
    },
    // 在图表初始化之前触发，可返回修改后的参数
    beforeInit: {
      type: Function,
      default: null
    }
  },
  data() {
    return {
      chartRef: null
    };
  },
  watch: {
    chartData: {
      handler(newVal) {
        if (newVal && this.chartRef) {
          this.chartRef.updateData(newVal);
        }
      },
      deep: true
    }
  },
  methods: {
    // 获取图表实例
    getRef(ref) {
      this.chartRef = ref;
      this.$emit('getRef', ref);
    },
    // 图表渲染成功
    complete(res) {
      this.$emit('complete', res);
    },
    // 图表渲染错误
    error(err) {
      console.error('图表渲染错误:', err);
      this.$emit('error', err);
    },
    // 对外暴露更新图表数据方法
    updateData(newData) {
      if (this.chartRef) {
        this.chartRef.updateData(newData);
      }
    }
  }
};
</script>

<style>
/* 图表样式 */
</style> 