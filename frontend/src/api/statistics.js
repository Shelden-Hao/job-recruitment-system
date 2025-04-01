import { get } from './request'

/**
 * 获取系统统计数据
 * @returns {Promise} 请求Promise
 */
export const getSystemStats = () => {
  return get('/api/statistics/system')
}

/**
 * 获取用户统计数据
 * @param {Number|String} userId 用户ID，不传则获取当前用户
 * @returns {Promise} 请求Promise
 */
export const getUserStats = (userId) => {
  const url = userId ? `/api/statistics/user/${userId}` : '/api/statistics/user'
  return get(url)
}

/**
 * 获取职位统计数据
 * @param {Number|String} jobId 职位ID
 * @returns {Promise} 请求Promise
 */
export const getJobStats = (jobId) => {
  return get(`/api/statistics/job/${jobId}`)
}

/**
 * 获取热门职位统计
 * @param {Number} limit 限制数量
 * @returns {Promise} 请求Promise
 */
export const getPopularJobStats = (limit = 10) => {
  return get('/api/statistics/popular-jobs', { limit })
}

/**
 * 获取薪资分布统计
 * @returns {Promise} 请求Promise
 */
export const getSalaryDistribution = () => {
  return get('/api/statistics/salary-distribution')
}

/**
 * 获取求职者地域分布
 * @returns {Promise} 请求Promise
 */
export const getSeekerLocation = () => {
  return get('/api/statistics/seeker-location')
}

/**
 * 获取招聘趋势统计
 * @param {String} period 周期类型: 'month'|'week'
 * @param {Number} months 月数
 * @returns {Promise} 请求Promise
 */
export const getRecruitmentTrends = (period = 'month', months = 6) => {
  return get('/api/statistics/recruitment-trends', { period, months })
}

export default {
  getSystemStats,
  getUserStats,
  getJobStats,
  getPopularJobStats,
  getSalaryDistribution,
  getSeekerLocation,
  getRecruitmentTrends
} 