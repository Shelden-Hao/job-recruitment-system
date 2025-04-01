import { createSSRApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import uviewPlus from 'uview-plus'
import dayjs from 'dayjs'

// 创建应用实例
export function createApp() {
  const app = createSSRApp(App)
  
  // 注册pinia状态管理
  const pinia = createPinia()
  app.use(pinia)
  
  // 注册uview-plus UI框架
  app.use(uviewPlus)
  
  // 注册dayjs
  app.config.globalProperties.$dayjs = dayjs
  
  // 全局过滤器
  app.config.globalProperties.$filters = {
    dateFormat(value, format = 'YYYY-MM-DD') {
      if (!value) return ''
      return dayjs(value).format(format)
    },
    
    // 数字格式化
    numberFormat(value, digits = 2) {
      if (value === null || value === undefined) return '0'
      return parseFloat(value).toFixed(digits)
    }
  }
  
  return {
    app
  }
}

// 全局样式 - uview-plus样式
import 'uview-plus/index.scss'