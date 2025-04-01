import { ref } from 'vue'
import { useUserStore } from '@/stores/user'

// 基础URL
const BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000' 
  : 'https://api.recruitment.example.com';

// 全局加载状态
export const loading = ref(false)

/**
 * 封装请求函数
 * @param {Object} options - 请求配置
 * @returns {Promise} Promise对象
 */
function request(options) {
  const userStore = useUserStore()
  
  // 构建URL
  const url = /^(http|https):\/\//.test(options.url) 
    ? options.url 
    : BASE_URL + options.url;
  
  // 构建请求头
  const header = {
    'Content-Type': 'application/json',
    ...options.header
  };
  
  // 添加token到请求头
  if (userStore.token) {
    header['Authorization'] = `Bearer ${userStore.token}`;
  }
  
  return new Promise((resolve, reject) => {
    // 显示加载提示
    if (options.loading !== false) {
      uni.showLoading({
        title: options.loadingText || '加载中...',
        mask: true
      });
    }
    
    uni.request({
      url,
      data: options.data,
      method: options.method || 'GET',
      header,
      timeout: options.timeout || 30000,
      dataType: options.dataType || 'json',
      responseType: options.responseType || 'text',
      success: (res) => {
        // 请求成功，但状态码不为200
        if (res.statusCode !== 200) {
          // token过期或无效
          if (res.statusCode === 401) {
            userStore.logout()
            uni.showToast({
              title: '登录已过期，请重新登录',
              icon: 'none',
              duration: 2000
            })
            
            // 延迟跳转到登录页
            setTimeout(() => {
              uni.navigateTo({
                url: '/pages/login/index'
              })
            }, 1500)
            
            reject(new Error('登录已过期'))
            return
          }
          
          // 其他错误
          uni.showToast({
            title: res.data.message || '请求失败',
            icon: 'none',
            duration: 2000
          })
          
          reject(res.data)
          return
        }
        
        // 如果返回结果有错误信息
        if (res.data.code && res.data.code !== 0 && res.data.code !== 200) {
          uni.showToast({
            title: res.data.message || '请求失败',
            icon: 'none',
            duration: 2000
          })
          
          reject(res.data)
          return
        }
        
        // 请求成功
        resolve(res.data)
      },
      fail: (err) => {
        uni.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        })
        
        reject(err)
      },
      complete: () => {
        // 隐藏加载提示
        if (options.loading !== false) {
          uni.hideLoading()
        }
      }
    })
  })
}

/**
 * GET请求
 * @param {String} url - 请求地址
 * @param {Object} params - 请求参数
 * @param {Object} options - 其他配置选项
 * @returns {Promise} Promise对象
 */
export function get(url, params = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data: params,
    ...options
  })
}

/**
 * POST请求
 * @param {String} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他配置选项
 * @returns {Promise} Promise对象
 */
export function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

/**
 * PUT请求
 * @param {String} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他配置选项
 * @returns {Promise} Promise对象
 */
export function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

/**
 * DELETE请求
 * @param {String} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他配置选项
 * @returns {Promise} Promise对象
 */
export function del(url, data = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  })
}

/**
 * 上传文件
 * @param {String} url - 上传地址
 * @param {Object} options - 上传配置
 * @returns {Promise} Promise对象
 */
export function upload(url, options = {}) {
  const userStore = useUserStore()
  
  // 构建URL
  const requestUrl = /^(http|https):\/\//.test(url) 
    ? url 
    : BASE_URL + url;
  
  // 构建请求头
  const header = {
    ...options.header
  }
  
  // 添加token到请求头
  if (userStore.token) {
    header['Authorization'] = `Bearer ${userStore.token}`
  }
  
  return new Promise((resolve, reject) => {
    // 显示加载提示
    if (options.loading !== false) {
      uni.showLoading({
        title: options.loadingText || '上传中...',
        mask: true
      })
    }
    
    uni.uploadFile({
      url: requestUrl,
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData || {},
      header,
      success: (res) => {
        if (res.statusCode !== 200) {
          uni.showToast({
            title: '上传失败',
            icon: 'none',
            duration: 2000
          })
          
          reject(res)
          return
        }
        
        // 转换返回数据
        let data = res.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch (e) {
            console.error('解析上传响应失败', e)
          }
        }
        
        resolve(data)
      },
      fail: (err) => {
        uni.showToast({
          title: '上传失败',
          icon: 'none',
          duration: 2000
        })
        
        reject(err)
      },
      complete: () => {
        // 隐藏加载提示
        if (options.loading !== false) {
          uni.hideLoading()
        }
      }
    })
  })
}

export default {
  request,
  get,
  post,
  put,
  delete: del,
  upload,
  loading
} 