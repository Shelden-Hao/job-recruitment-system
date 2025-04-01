import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

// 接口基础URL
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// 全局加载状态
export const loading = ref(false)

/**
 * 请求拦截器
 * @param {Object} config 请求配置
 * @returns {Object} 处理后的请求配置
 */
const requestInterceptor = (config) => {
  const userStore = useUserStore()
  
  // 添加token
  if (userStore.token) {
    config.header = {
      ...config.header,
      'Authorization': `Bearer ${userStore.token}`
    }
  }
  
  // 处理URL
  if (!config.url.startsWith('http')) {
    config.url = `${baseURL}${config.url}`
  }
  
  return config
}

/**
 * 响应拦截器
 * @param {Object} response 响应对象
 * @returns {Object|Promise} 处理后的响应结果或错误
 */
const responseInterceptor = (response) => {
  const userStore = useUserStore()
  
  // 处理HTTP状态码
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data
  } else if (response.statusCode === 401) {
    // 未授权，清除token并跳转到登录
    userStore.logout()
    uni.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none'
    })
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/login/index'
      })
    }, 1500)
    return Promise.reject(new Error('登录已过期'))
  } else {
    // 其他错误
    const errorMsg = response.data?.message || '请求失败'
    uni.showToast({
      title: errorMsg,
      icon: 'none'
    })
    return Promise.reject(new Error(errorMsg))
  }
}

/**
 * 统一请求方法
 * @param {Object} options 请求配置
 * @returns {Promise} 请求Promise
 */
export const request = (options = {}) => {
  loading.value = true
  
  // 应用请求拦截器
  const config = requestInterceptor({
    url: '',
    method: 'GET',
    data: {},
    header: {
      'Content-Type': 'application/json'
    },
    ...options
  })
  
  return new Promise((resolve, reject) => {
    uni.request({
      ...config,
      success: (res) => {
        try {
          const result = responseInterceptor(res)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
        reject(err)
      },
      complete: () => {
        loading.value = false
      }
    })
  })
}

/**
 * GET请求
 * @param {String} url 请求URL
 * @param {Object} data 请求参数
 * @param {Object} options 其他选项
 * @returns {Promise} 请求Promise
 */
export const get = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  })
}

/**
 * POST请求
 * @param {String} url 请求URL
 * @param {Object} data 请求参数
 * @param {Object} options 其他选项
 * @returns {Promise} 请求Promise
 */
export const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

/**
 * PUT请求
 * @param {String} url 请求URL
 * @param {Object} data 请求参数
 * @param {Object} options 其他选项
 * @returns {Promise} 请求Promise
 */
export const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

/**
 * DELETE请求
 * @param {String} url 请求URL
 * @param {Object} data 请求参数
 * @param {Object} options 其他选项
 * @returns {Promise} 请求Promise
 */
export const del = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

export default {
  request,
  get,
  post,
  put,
  del,
  loading
} 