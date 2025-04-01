import App from './App.vue'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import uviewPlus from 'uview-plus'

// 创建uni-app应用
export function createApp() {
  const app = createSSRApp(App)
  
  // 使用Pinia
  const pinia = createPinia()
  app.use(pinia)
  
  // 使用uView Plus UI库
  app.use(uviewPlus)
  
  // 全局过滤器
  app.config.globalProperties.$filters = {
    // 格式化日期
    formatDate(value, format = 'YYYY-MM-DD') {
      if (!value) return ''
      const date = new Date(value)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      if (format === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`
      } else if (format === 'MM-DD') {
        return `${month}-${day}`
      } else if (format === 'YYYY年MM月DD日') {
        return `${year}年${month}月${day}日`
      }
      
      return value
    },
    
    // 格式化货币
    formatCurrency(value) {
      if (!value && value !== 0) return ''
      return '¥' + parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    },
    
    // 格式化薪资范围
    formatSalary(min, max) {
      if (!min && !max) return '薪资面议'
      if (min && !max) return `${min}K以上`
      if (!min && max) return `${max}K以下`
      return `${min}K-${max}K`
    },
    
    // 文本截断
    truncate(text, length = 20) {
      if (!text) return ''
      if (text.length <= length) return text
      return text.substring(0, length) + '...'
    }
  }
  
  // 全局错误处理
  app.config.errorHandler = (err, vm, info) => {
    console.error('全局错误：', err, info)
    uni.showToast({
      title: '应用发生错误',
      icon: 'none'
    })
  }
  
  return {
    app
  }
}

// 全局样式 - uview-plus样式
import 'uview-plus/index.scss'