/**
 * 日期格式化工具
 */

/**
 * 格式化日期
 * @param {Date|String|Number} date 日期对象或日期字符串或时间戳
 * @param {String} format 格式化模板
 * @returns {String} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  
  // 统一转换为Date对象
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  // 如果日期无效，返回空字符串
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace(/YYYY/g, year)
    .replace(/YY/g, year.toString().slice(-2))
    .replace(/MM/g, month)
    .replace(/M/g, date.getMonth() + 1)
    .replace(/DD/g, day)
    .replace(/D/g, date.getDate())
    .replace(/HH/g, hours)
    .replace(/H/g, date.getHours())
    .replace(/mm/g, minutes)
    .replace(/m/g, date.getMinutes())
    .replace(/ss/g, seconds)
    .replace(/s/g, date.getSeconds());
}

/**
 * 获取相对时间
 * @param {Date|String|Number} date 日期对象或日期字符串或时间戳
 * @returns {String} 相对时间描述
 */
export function getRelativeTime(date) {
  if (!date) return '';
  
  // 统一转换为Date对象
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  // 如果日期无效，返回空字符串
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const now = new Date();
  const diff = now - date;
  
  // 计算时间差
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  
  if (years > 0) {
    return `${years}年前`;
  } else if (months > 0) {
    return `${months}个月前`;
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

/**
 * 获取日期范围数组
 * @param {Date|String|Number} startDate 开始日期
 * @param {Date|String|Number} endDate 结束日期
 * @param {String} format 日期格式化模板
 * @returns {Array} 日期范围数组
 */
export function getDateRange(startDate, endDate, format = 'YYYY-MM-DD') {
  if (!startDate || !endDate) return [];
  
  // 统一转换为Date对象
  if (!(startDate instanceof Date)) {
    startDate = new Date(startDate);
  }
  if (!(endDate instanceof Date)) {
    endDate = new Date(endDate);
  }
  
  // 如果日期无效，返回空数组
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return [];
  }
  
  const dateRange = [];
  const temptDate = new Date(startDate);
  
  while (temptDate <= endDate) {
    dateRange.push(formatDate(new Date(temptDate), format));
    temptDate.setDate(temptDate.getDate() + 1);
  }
  
  return dateRange;
}

/**
 * 获取当前月的第一天和最后一天
 * @param {Date} date 日期对象
 * @param {String} format 日期格式化模板
 * @returns {Object} 包含第一天和最后一天的对象
 */
export function getMonthRange(date = new Date(), format = 'YYYY-MM-DD') {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return {
    firstDay: formatDate(firstDay, format),
    lastDay: formatDate(lastDay, format)
  };
}

export default {
  formatDate,
  getRelativeTime,
  getDateRange,
  getMonthRange
}; 