/* 食材合并算法（最高价值模块，纯函数，无 DOM / 无存储依赖）
 * 移植自小程序 utils/merge.js，逻辑（B1–B20）完全一致。 */
(function (global) {
  'use strict'

  var CONST = global.CONST
  var util = global.util

  var VAGUE_SET = {}
  CONST.VAGUE_UNITS.forEach(function (u) { VAGUE_SET[util.normalizeText(u)] = true })

  var UNIT_PRIORITY = {}
  CONST.UNIT_OPTIONS.forEach(function (u, i) { UNIT_PRIORITY[util.normalizeText(u)] = i })

  var UNIT_DISPLAY = {}
  CONST.UNIT_OPTIONS.forEach(function (u) { UNIT_DISPLAY[util.normalizeText(u)] = u })

  function isSeasoning(name) {
    var text = util.normalizeText(name)
    if (!text) return false
    for (var i = 0; i < CONST.SEASONING_KEYWORDS.length; i++) {
      var kw = util.normalizeText(CONST.SEASONING_KEYWORDS[i])
      if (kw && text.indexOf(kw) >= 0) return true
    }
    return false
  }

  function normalizeUnit(unit) { return util.normalizeText(unit) }

  function canonicalUnitName(unit) {
    var key = util.normalizeText(unit)
    return UNIT_DISPLAY[key] || String((unit === null || unit === undefined) ? '' : unit)
  }

  function canonicalizeUnit(unit) {
    var u = normalizeUnit(unit)
    var base = CONST.UNIT_BASE[u]
    if (!base) return { unit: u, factor: 1 }
    if (u === base) return { unit: base, factor: 1 }
    var table = CONST.UNIT_CONVERT[u] || {}
    var factor = Number(table[base]) || 1
    return { unit: base, factor: factor }
  }

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100 }

  function formatAmount(n) { return util.formatAmount(n) }

  function addSource(map, dishName, count) {
    var key = String(dishName || '未知菜品')
    map.set(key, (map.get(key) || 0) + (Number(count) || 0))
  }

  function toSourceArray(map) {
    var list = []
    map.forEach(function (count, dishName) { list.push({ dishName: dishName, count: count }) })
    return list
  }

  function byUnitPriority(a, b) {
    var pa = UNIT_PRIORITY[normalizeUnit(a.unit)]
    var pb = UNIT_PRIORITY[normalizeUnit(b.unit)]
    var va = pa === undefined ? 999 : pa
    var vb = pb === undefined ? 999 : pb
    return va - vb
  }

  /** 合并主函数：rows = [{dishId, dishName, totalCount}], dishMap = {dishId: dish} */
  function mergeIngredients(rows, dishMap) {
    var groups = new Map()
    var safeRows = Array.isArray(rows) ? rows : []
    var safeMap = dishMap || {}
    var usedDishCount = 0
    var skippedDishCount = 0

    for (var i = 0; i < safeRows.length; i++) {
      var row = safeRows[i] || {}
      var totalCount = Number(row.totalCount) || 0
      if (totalCount <= 0) continue
      var dish = safeMap[row.dishId]
      if (!dish) { skippedDishCount += 1; continue }
      var ingredients = dish.ingredients
      if (!Array.isArray(ingredients) || ingredients.length === 0) continue
      usedDishCount += 1

      for (var j = 0; j < ingredients.length; j++) {
        var ing = ingredients[j] || {}
        var key = util.normalizeText(ing.name)
        if (!key) continue
        if (!groups.has(key)) {
          groups.set(key, { key: key, name: String(ing.name || '').trim() || key, slots: new Map(), vague: [], sources: new Map() })
        }
        var group = groups.get(key)
        addSource(group.sources, row.dishName || dish.name, totalCount)

        var unit = normalizeUnit(ing.unit)
        var amount = util.toNumber(ing.amount)

        if (VAGUE_SET[unit] || unit === '' || amount === null) {
          var vagueText = VAGUE_SET[unit] ? unit : '适量'
          if (group.vague.indexOf(vagueText) < 0) group.vague.push(vagueText)
          continue
        }

        var canon = canonicalizeUnit(unit, amount)
        var slotKey = 'q:' + canon.unit
        if (!group.slots.has(slotKey)) {
          group.slots.set(slotKey, { unit: canonicalUnitName(canon.unit), value: 0, sources: new Map() })
        }
        var slot = group.slots.get(slotKey)
        slot.value += amount * canon.factor * totalCount
        addSource(slot.sources, row.dishName || dish.name, totalCount)
      }
    }

    var main = []
    var seasoning = []
    var vagueCount = 0

    groups.forEach(function (group) {
      var amounts = []
      group.slots.forEach(function (slot) {
        var value = round2(slot.value)
        amounts.push({
          unit: slot.unit,
          value: value,
          text: formatAmount(value) + slot.unit,
          sources: toSourceArray(slot.sources)
        })
      })
      amounts.sort(byUnitPriority)

      var isSeasoningLine = isSeasoning(group.name)
      var line = {
        key: group.key,
        name: group.name,
        isSeasoning: isSeasoningLine,
        amounts: amounts,
        vague: group.vague.slice(),
        sources: toSourceArray(group.sources),
        checked: false,
        displayText: buildDisplayText(amounts, group.vague)
      }
      // 备菜/采购环节：调味料只需列明「需要什么」，不汇总精细用量
      if (isSeasoningLine) {
        line.amounts = []
        line.vague = []
        line.displayText = ''
      } else if (line.vague.length > 0) {
        vagueCount += 1
      }
      if (isSeasoningLine) seasoning.push(line)
      else main.push(line)
    })

    return {
      main: main,
      seasoning: seasoning,
      stats: {
        dishCount: usedDishCount,
        itemCount: main.length + seasoning.length,
        vagueCount: vagueCount,
        skippedDishCount: skippedDishCount
      }
    }
  }

  function buildDisplayText(amounts, vague) {
    var parts = []
    for (var i = 0; i < amounts.length; i++) if (amounts[i].text) parts.push(amounts[i].text)
    var vagueList = Array.isArray(vague) ? vague : []
    if (vagueList.length > 0) parts.push(vagueList.join('、'))
    return parts.join('；')
  }

  function buildSourceText(sources, max) {
    var list = Array.isArray(sources) ? sources : []
    var limit = Number(max) || 3
    if (list.length === 0) return ''
    var picked = list.slice(0, limit)
    var text = picked.map(function (item) { return item.dishName + '×' + item.count }).join('、')
    if (list.length > limit) return '来自：' + text + ' 等 ' + list.length + ' 道菜'
    return '来自：' + text
  }

  global.mergeLib = {
    mergeIngredients: mergeIngredients,
    isSeasoning: isSeasoning,
    canonicalizeUnit: canonicalizeUnit,
    canonicalUnitName: canonicalUnitName,
    normalizeUnit: normalizeUnit,
    round2: round2,
    formatAmount: formatAmount,
    buildDisplayText: buildDisplayText,
    buildSourceText: buildSourceText
  }
})(window)
