import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, post } from '@/api/request'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref('')
  const user = ref(null)
  const loading = ref(false)
  
  // 计算属性
  const isLogin = computed(() => !!token.value)
  const isEmployer = computed(() => user.value?.role === 'employer')
  const isSeeker = computed(() => user.value?.role === 'seeker')
  const isAdmin = computed(() => user.value?.role === 'admin')
  
  // 方法
  /**
   * 初始化方法：从本地存储加载用户信息
   */
  function init() {
    try {
      const storedToken = uni.getStorageSync('token')
      const storedUser = uni.getStorageSync('user')
      
      if (storedToken) {
        token.value = storedToken
      }
      
      if (storedUser) {
        try {
          user.value = typeof storedUser === 'string' ? JSON.parse(storedUser) : storedUser
        } catch (e) {
          console.error('解析用户信息失败', e)
          user.value = null
        }
      }
    } catch (e) {
      console.error('初始化用户信息失败', e)
    }
  }
  
  /**
   * 登录方法
   * @param {Object} params 登录凭证
   * @returns {Promise} 登录结果Promise
   */
  async function login(params) {
    loading.value = true
    try {
      const res = await post('/api/auth/login', params)
      
      if (res.data && res.data.token) {
        token.value = res.data.token
        user.value = res.data.user
        
        // 存储到本地
        uni.setStorageSync('token', res.data.token)
        uni.setStorageSync('user', JSON.stringify(res.data.user))
        
        return res.data
      } else {
        throw new Error(res.message || '登录失败')
      }
    } catch (error) {
      console.error('登录失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 微信登录
   * @param {String} code 微信登录code
   * @returns {Promise} 登录结果Promise
   */
  async function wxLogin(code) {
    loading.value = true
    try {
      const res = await post('/api/auth/wxlogin', { code })
      
      if (res.data && res.data.token) {
        token.value = res.data.token
        user.value = res.data.user
        
        // 存储到本地
        uni.setStorageSync('token', res.data.token)
        uni.setStorageSync('user', JSON.stringify(res.data.user))
        
        return res.data
      } else {
        throw new Error(res.message || '微信登录失败')
      }
    } catch (error) {
      console.error('微信登录失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 注册方法
   * @param {Object} params 注册凭证
   * @returns {Promise} 注册结果Promise
   */
  async function register(params) {
    loading.value = true
    try {
      const res = await post('/api/auth/register', params)
      
      if (res.data && res.data.token) {
        token.value = res.data.token
        user.value = res.data.user
        
        // 存储到本地
        uni.setStorageSync('token', res.data.token)
        uni.setStorageSync('user', JSON.stringify(res.data.user))
        
        return res.data
      } else {
        throw new Error(res.message || '注册失败')
      }
    } catch (error) {
      console.error('注册失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 获取用户信息
   * @returns {Promise} 用户信息Promise
   */
  async function getUserInfo() {
    if (!token.value) return null
    
    loading.value = true
    try {
      const res = await get('/api/users/me')
      
      if (res.data) {
        user.value = res.data
        
        // 更新本地存储
        uni.setStorageSync('user', JSON.stringify(res.data))
        
        return res.data
      } else {
        throw new Error(res.message || '获取用户信息失败')
      }
    } catch (error) {
      console.error('获取用户信息失败', error)
      // 如果获取信息失败，可能是token无效，清除登录状态
      if (error.statusCode === 401) {
        logout()
      }
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 更新用户信息
   * @param {Object} data 用户信息
   * @returns {Promise} 更新结果Promise
   */
  async function updateUserInfo(data) {
    if (!token.value) return null
    
    loading.value = true
    try {
      const res = await post('/api/users/update', data)
      
      if (res.data) {
        user.value = res.data
        
        // 更新本地存储
        uni.setStorageSync('user', JSON.stringify(res.data))
        
        return res.data
      } else {
        throw new Error(res.message || '更新用户信息失败')
      }
    } catch (error) {
      console.error('更新用户信息失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 修改密码
   * @param {Object} data 密码数据
   * @returns {Promise} 修改结果Promise
   */
  async function changePassword(data) {
    if (!token.value) return null
    
    loading.value = true
    try {
      const res = await post('/api/users/change-password', data)
      return res.data
    } catch (error) {
      console.error('修改密码失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 重置密码（忘记密码）
   * @param {Object} data 重置密码数据
   * @returns {Promise} 重置结果Promise
   */
  async function resetPassword(data) {
    loading.value = true
    try {
      const res = await post('/api/auth/reset-password', data)
      return res.data
    } catch (error) {
      console.error('重置密码失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 发送验证码
   * @param {String} phone 手机号
   * @returns {Promise} 发送结果Promise
   */
  async function sendVerificationCode(phone) {
    loading.value = true
    try {
      const res = await post('/api/auth/send-code', { phone })
      return res.data
    } catch (error) {
      console.error('发送验证码失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 上传头像
   * @param {String} filePath 头像文件路径
   * @returns {Promise} 上传结果Promise
   */
  async function uploadAvatar(filePath) {
    if (!token.value) return null
    
    loading.value = true
    try {
      // 上传文件
      const uploadRes = await new Promise((resolve, reject) => {
        uni.uploadFile({
          url: '/api/users/avatar',
          filePath,
          name: 'avatar',
          header: {
            'Authorization': `Bearer ${token.value}`
          },
          success: (res) => {
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(res.data)
                resolve(data)
              } catch (e) {
                reject(new Error('解析上传响应失败'))
              }
            } else {
              reject(new Error('上传头像失败'))
            }
          },
          fail: (err) => {
            reject(err)
          }
        })
      })
      
      if (uploadRes.data && uploadRes.data.avatar) {
        // 更新用户头像
        user.value = {
          ...user.value,
          avatar: uploadRes.data.avatar
        }
        
        // 更新本地存储
        uni.setStorageSync('user', JSON.stringify(user.value))
        
        return uploadRes.data
      } else {
        throw new Error(uploadRes.message || '上传头像失败')
      }
    } catch (error) {
      console.error('上传头像失败', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 退出登录
   */
  function logout() {
    token.value = ''
    user.value = null
    
    // 清除本地存储
    uni.removeStorageSync('token')
    uni.removeStorageSync('user')
  }
  
  return {
    token,
    user,
    loading,
    isLogin,
    isEmployer,
    isSeeker,
    isAdmin,
    init,
    login,
    wxLogin,
    register,
    getUserInfo,
    updateUserInfo,
    changePassword,
    resetPassword,
    sendVerificationCode,
    uploadAvatar,
    logout
  }
}) 