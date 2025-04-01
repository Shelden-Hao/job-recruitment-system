/**
 * 生成UUID v4 (随机)
 * @returns {String} UUID字符串
 */
export function v4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 生成简短UUID (无连字符)
 * @param {Number} length 长度 (默认8位)
 * @returns {String} 简短ID字符串
 */
export function shortId(length = 8) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/**
 * 生成指定范围内的随机整数
 * @param {Number} min 最小值
 * @param {Number} max 最大值
 * @returns {Number} 随机整数
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default {
  v4,
  shortId,
  randomInt
} 