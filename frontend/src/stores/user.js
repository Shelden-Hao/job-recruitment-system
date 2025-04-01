import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { post } from '@/api/request'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(uni.getStorageSync('token') || '')
  const userInfo = ref(uni.getStorageSync('userInfo') || null)
  const isLogin = computed(() => !!token.value)
  
  // 计算属性
  const userId = computed(() => userInfo.value?.id || null)
  const userRole = computed(() => userInfo.value?.role || null)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')
  const isEmployer = computed(() => userInfo.value?.role === 'employer')
  const isSeeker = computed(() => userInfo.value?.role === 'seeker')
  
  // 方法
  /**
   * 设置用户Token
   * @param {String} newToken 用户Token
   */
  function setToken(newToken) {
    token.value = newToken
    if (newToken) {
      uni.setStorageSync('token', newToken)
    } else {
      uni.removeStorageSync('token')
    }
  }
  
  /**
   * 设置用户信息
   * @param {Object} info 用户信息
   */
  function setUserInfo(info) {
    userInfo.value = info
    if (info) {
      uni.setStorageSync('userInfo', info)
    } else {
      uni.removeStorageSync('userInfo')
    }
  }
  
  /**
   * 登录方法
   * @param {Object} credentials 登录凭证
   * @returns {Promise} 登录结果Promise
   */
  async function login(credentials) {
    try {
      const { data } = await post('/api/auth/login', credentials)
      
      if (data.token && data.user) {
        setToken(data.token)
        setUserInfo(data.user)
        return { success: true }
      } else {
        return { success: false, message: '登录失败' }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: error.message || '登录失败，请稍后重试' }
    }
  }
  
  /**
   * 退出登录
   */
  function logout() {
    setToken('')
    setUserInfo(null)
    
    // 跳转到登录页
    uni.redirectTo({
      url: '/pages/login/index'
    })
  }
  
  /**
   * 检查登录状态
   * @returns {Boolean} 是否已登录
   */
  function checkLoginStatus() {
    return !!token.value
  }
  
  /**
   * 更新用户信息
   * @param {Object} info 用户信息
   */
  function updateUserInfo(info) {
    if (!info) return
    
    const newUserInfo = {
      ...userInfo.value,
      ...info
    }
    
    setUserInfo(newUserInfo)
  }
  
  return {
    // 状态
    token,
    userInfo,
    isLogin,
    
    // 计算属性
    userId,
    userRole,
    isAdmin,
    isEmployer,
    isSeeker,
    
    // 方法
    setToken,
    setUserInfo,
    login,
    logout,
    checkLoginStatus,
    updateUserInfo
  }
}) 