/* 通用工具函数（全局 window.util，供 constants / merge / csv / store 引用）
 * 移植自小程序 utils/util.js，去掉 wx.* 依赖。 */
(function (global) {
  'use strict'

  /** 文本归一：trim + 全角转半角 + 小写（名称 / 单位统一比较基准） */
  function normalizeText(s) {
    if (s === null || s === undefined) return ''
    var out = String(s).trim()
    // 全角空格
    out = out.replace(/　/g, ' ')
    // 全角字符（！到～）映射到半角
    out = out.replace(/[！-～]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    })
    return out.toLowerCase()
  }

  /** 转数字：空 / 非数字 → null（B8 / B19） */
  function toNumber(v) {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') return isFinite(v) ? v : null
    var str = String(v).trim()
    if (str === '') return null
    var n = Number(str)
    return isFinite(n) ? n : null
  }

  /** 数值展示：去掉多余的尾随 0（12.50 → 12.5，12.00 → 12） */
  function formatAmount(n) {
    var num = Number(n)
    if (!isFinite(num)) return '0'
    return String(Math.round(num * 100) / 100)
  }

  /** 时间戳 → YYYY-MM-DD */
  function formatDate(ts) {
    var d = new Date(ts)
    var y = d.getFullYear()
    var m = String(d.getMonth() + 1).padStart(2, '0')
    var day = String(d.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + day
  }

  /** 简单唯一 ID */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  }

  global.util = {
    normalizeText: normalizeText,
    toNumber: toNumber,
    formatAmount: formatAmount,
    formatDate: formatDate,
    uid: uid
  }
})(window)
