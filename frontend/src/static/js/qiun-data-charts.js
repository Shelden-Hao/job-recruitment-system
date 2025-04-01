/**
 * qiun-data-charts 图表封装
 * @version 2.4.0
 * @description 用于uCharts组件库与uni-app使用
 */

// 导入UCharts库
import uCharts from '@qiun/ucharts';

// 全局UCharts对象
let uChartsInstance = {};

/**
 * 根据配置初始化图表
 */
function initCharts(config) {
  const { canvasId, type, data, opts, colors, context, tooltip } = config;
  
  // 若存在实例先销毁
  if (uChartsInstance[canvasId]) {
    uChartsInstance[canvasId].dispose();
  }
  
  // 创建新实例
  uChartsInstance[canvasId] = new uCharts({
    type,
    context,
    canvas2d: true,
    canvasId,
    animation: true,
    background: '#FFFFFF',
    pixelRatio: 1,
    categories: data.categories || [],
    series: data.series || [],
    tooltip,
    ...opts,
    colors
  });
  
  return uChartsInstance[canvasId];
}

/**
 * 更新图表数据
 */
function updateCharts(canvasId, data) {
  if (!uChartsInstance[canvasId]) {
    console.warn(`${canvasId} 实例不存在!`);
    return;
  }
  
  uChartsInstance[canvasId].updateData({
    categories: data.categories || [],
    series: data.series || []
  });
}

/**
 * 触摸事件
 */
function touchCharts(canvasId, e) {
  if (!uChartsInstance[canvasId]) {
    console.warn(`${canvasId} 实例不存在!`);
    return;
  }
  
  uChartsInstance[canvasId].touchLegend(e);
  uChartsInstance[canvasId].showToolTip(e);
}

/**
 * 销毁图表实例
 */
function disposeCharts(canvasId) {
  if (!uChartsInstance[canvasId]) {
    console.warn(`${canvasId} 实例不存在!`);
    return;
  }
  
  uChartsInstance[canvasId].dispose();
  delete uChartsInstance[canvasId];
}

/**
 * 重置图表实例
 */
function resetCharts(canvasId) {
  if (!uChartsInstance[canvasId]) {
    console.warn(`${canvasId} 实例不存在!`);
    return;
  }
  
  uChartsInstance[canvasId].reset();
}

export default {
  initCharts,
  updateCharts,
  touchCharts,
  disposeCharts,
  resetCharts
}; 