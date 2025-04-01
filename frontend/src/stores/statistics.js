import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import * as StatisticsApi from '@/api/statistics'

export const useStatisticsStore = defineStore('statistics', () => {
  // 状态
  const loading = ref(false)
  const error = ref(null)
  
  const systemStats = ref(null)
  const salaryDistribution = ref(null)
  const popularJobs = ref(null)
  const recruitmentTrends = ref(null)
  const seekerLocation = ref(null)
  const userStats = ref(null)
  const jobStats = ref(null)
  
  const chartData = reactive({
    salaryChart: null,
    trendJobs: null,
    trendApplications: null,
    locationPie: null
  })
  
  // 方法
  /**
   * 设置加载状态
   * @param {Boolean} status 加载状态
   */
  function setLoading(status) {
    loading.value = status
  }
  
  /**
   * 设置错误信息
   * @param {String|null} message 错误信息
   */
  function setError(message) {
    error.value = message
  }
  
  /**
   * 获取系统统计数据
   * @returns {Promise} 操作结果Promise
   */
  async function fetchSystemStats() {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await StatisticsApi.getSystemStats()
      systemStats.value = data.system_stats
      
      return { success: true }
    } catch (err) {
      console.error('获取系统统计数据失败:', err)
      setError('获取系统统计数据失败')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 获取用户统计数据
   * @param {Number|String} userId 用户ID
   * @returns {Promise} 操作结果Promise
   */
  async function fetchUserStats(userId) {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await StatisticsApi.getUserStats(userId)
      userStats.value = data.user_stats
      
      return { success: true }
    } catch (err) {
      console.error('获取用户统计数据失败:', err)
      setError('获取用户统计数据失败')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 获取职位统计数据
   * @param {Number|String} jobId 职位ID
   * @returns {Promise} 操作结果Promise
   */
  async function fetchJobStats(jobId) {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await StatisticsApi.getJobStats(jobId)
      jobStats.value = data.job_stats
      
      return { success: true }
    } catch (err) {
      console.error('获取职位统计数据失败:', err)
      setError('获取职位统计数据失败')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 获取热门职位统计
   * @param {Number} limit 数量限制
   * @returns {Promise} 操作结果Promise
   */
  async function fetchPopularJobs(limit = 10) {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await StatisticsApi.getPopularJobStats(limit)
      popularJobs.value = data.popular_jobs
      
      return { success: true }
    } catch (err) {
      console.error('获取热门职位统计失败:', err)
      setError('获取热门职位统计失败')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 获取薪资分布统计
   * @returns {Promise} 操作结果Promise
   */
  async function fetchSalaryDistribution() {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await StatisticsApi.getSalaryDistribution()
      salaryDistribution.value = data.salary_distribution
      
      // 生成图表数据
      chartData.salaryChart = {
        categories: salaryDistribution.value.map(item => item.range),
        series: [
          {
            name: '职位数量',
            data: salaryDistribution.value.map(item => item.count)
          }
        ]
      }
      
      return { success: true }
    } catch (err) {
      console.error('获取薪资分布统计失败:', err)
      setError('获取薪资分布统计失败')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 获取求职者地域分布
   * @returns {Promise} 操作结果Promise
   */
  async function fetchSeekerLocation() {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await StatisticsApi.getSeekerLocation()
      seekerLocation.value = data.location_distribution
      
      // 生成图表数据
      chartData.locationPie = {
        series: [{
          data: seekerLocation.value.map(item => ({
            name: item.current_location,
            value: item.count
          }))
        }]
      }
      
      return { success: true }
    } catch (err) {
      console.error('获取求职者地域分布失败:', err)
      setError('获取求职者地域分布失败')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 获取招聘趋势统计
   * @param {String} period 周期类型
   * @param {Number} months 月数
   * @returns {Promise} 操作结果Promise
   */
  async function fetchRecruitmentTrends(period = 'month', months = 6) {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await StatisticsApi.getRecruitmentTrends(period, months)
      recruitmentTrends.value = data
      
      // 生成职位发布趋势图表数据
      chartData.trendJobs = {
        categories: data.job_trends.map(item => item.date),
        series: [
          {
            name: '职位发布数',
            data: data.job_trends.map(item => item.count)
          }
        ]
      }
      
      // 生成申请趋势图表数据
      chartData.trendApplications = {
        categories: data.application_trends.map(item => item.date),
        series: [
          {
            name: '职位申请数',
            data: data.application_trends.map(item => item.count)
          }
        ]
      }
      
      return { success: true }
    } catch (err) {
      console.error('获取招聘趋势统计失败:', err)
      setError('获取招聘趋势统计失败')
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * 清空统计数据
   */
  function clearStats() {
    systemStats.value = null
    salaryDistribution.value = null
    popularJobs.value = null
    recruitmentTrends.value = null
    seekerLocation.value = null
    userStats.value = null
    jobStats.value = null
    
    chartData.salaryChart = null
    chartData.trendJobs = null
    chartData.trendApplications = null
    chartData.locationPie = null
  }
  
  return {
    // 状态
    loading,
    error,
    systemStats,
    salaryDistribution,
    popularJobs,
    recruitmentTrends,
    seekerLocation,
    userStats,
    jobStats,
    chartData,
    
    // 方法
    setLoading,
    setError,
    fetchSystemStats,
    fetchUserStats,
    fetchJobStats,
    fetchPopularJobs,
    fetchSalaryDistribution,
    fetchSeekerLocation,
    fetchRecruitmentTrends,
    clearStats
  }
}) 