/* CSV 解析与菜谱构建（纯函数，无 DOM / 无存储依赖）
 * 移植自小程序 utils/csv.js，含模糊用量修复（盐 适量）。 */
(function (global) {
  'use strict'

  var CONST = global.CONST
  var util = global.util

  var CSV_TEMPLATE = [
    '菜名,分类,口味标签,预估耗时_分钟,封面图链接,食材,步骤,备注',
    '西红柿炒蛋,素菜,家常、快手,10,,西红柿 2个；鸡蛋 3个；葱 10g；白糖 5g；盐 适量；食用油 15ml,1. 西红柿去蒂切块，鸡蛋打散加少许盐；2. 热锅倒油，先炒蛋盛出；3. 下西红柿炒出汁，回锅鸡蛋翻炒均匀,鸡蛋先炒后盛出更嫩',
    '红烧排骨,荤菜,家常、下饭,45,,排骨 500g；葱 1根；姜 3片；蒜 3瓣；生抽 2勺；老抽 1勺；冰糖 10g；料酒 2勺,1. 排骨冷水下锅焯水去血沫；2. 热锅下冰糖炒糖色；3. 下排骨翻炒上色，加生抽老抽料酒；4. 加开水没过排骨，小火炖 30 分钟；5. 大火收汁撒葱花,炒糖色要小火，糊了会发苦',
    '紫菜蛋花汤,汤羹,快手,8,,紫菜 5g；鸡蛋 1个；葱 5g；盐 适量；香油 少许,1. 紫菜撕小块放碗底；2. 水烧开后淋入蛋液；3. 冲入碗中，加盐与香油，撒葱花,蛋液沿筷子淋入才有蛋花'
  ].join('\n')

  function stripBom(text) { return String(text || '').replace(/^\uFEFF/, '') }

  function parseCsv(text) {
    var content = stripBom(String(text || ''))
    var rows = []
    var field = ''
    var row = []
    var inQuotes = false
    var i = 0
    while (i < content.length) {
      var ch = content.charAt(i)
      if (inQuotes) {
        if (ch === '"') {
          if (content.charAt(i + 1) === '"') { field += '"'; i += 2; continue }
          inQuotes = false; i += 1; continue
        }
        field += ch; i += 1; continue
      }
      if (ch === '"') { inQuotes = true; i += 1; continue }
      if (ch === ',') { row.push(field); field = ''; i += 1; continue }
      if (ch === '\r') {
        row.push(field); field = ''; rows.push(row); row = []
        i += 1
        if (content.charAt(i) === '\n') i += 1
        continue
      }
      if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = []; i += 1; continue }
      field += ch; i += 1
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
    var cleanRows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== '' }) })
    if (cleanRows.length === 0) return { headers: [], rows: [] }
    var headers = cleanRows[0].map(function (h) { return String(h || '').trim() })
    return { headers: headers, rows: cleanRows.slice(1) }
  }

  function toRecords(text) {
    var table = parseCsv(text)
    if (table.headers.length === 0) return []
    var records = []
    for (var i = 0; i < table.rows.length; i++) {
      var cells = table.rows[i]
      var data = {}
      for (var j = 0; j < table.headers.length; j++) {
        data[table.headers[j]] = cells[j] === undefined ? '' : String(cells[j]).trim()
      }
      records.push({ rowIndex: i + 2, data: data })
    }
    return records
  }

  function splitIngredients(cell) {
    var text = String(cell || '').trim()
    if (!text) return []
    var pieces = text.split(/[；;]/)
    var result = []
    for (var i = 0; i < pieces.length; i++) {
      var piece = String(pieces[i] || '').trim()
      if (!piece) continue
      piece = piece.replace(/^\d+\s*[.、)]\s*/, '')
      if (!piece) continue
      var matched = piece.match(/^(.+?)[\s]+(\d+(?:\.\d+)?)\s*(\S+)?$/)
      if (matched) {
        var name = String(matched[1] || '').trim()
        var amount = util.toNumber(matched[2])
        var unit = String(matched[3] === undefined ? '' : matched[3]).trim()
        if (!name) continue
        result.push({ name: name, amount: amount, unit: unit || '适量' })
        continue
      }
      var vagueMatch = piece.match(/^(.+?)[\s]+(适量|少许)$/)
      if (vagueMatch) {
        var vname = String(vagueMatch[1] || '').trim()
        if (!vname) continue
        result.push({ name: vname, amount: null, unit: vagueMatch[2] })
        continue
      }
      result.push({ name: piece, amount: null, unit: '适量' })
    }
    return result
  }

  function splitSteps(cell) {
    var text = String(cell || '').trim()
    if (!text) return []
    var pieces = []
    if (text.indexOf('\n') >= 0) pieces = text.split(/\r?\n/)
    else if (text.indexOf('|') >= 0) pieces = text.split('|')
    else if (/\d+\s*[.、)]/.test(text)) pieces = text.split(/(?=\d+\s*[.、)])/)
    else pieces = [text]
    var result = []
    for (var i = 0; i < pieces.length; i++) {
      var step = String(pieces[i] || '').trim()
      if (!step) continue
      step = step.replace(/^\d+\s*[.、)]\s*/, '')
      step = step.replace(/^[；;、，,\s]+/, '')
      step = step.replace(/[；;、，,\s]+$/, '')
      if (step) result.push(step)
    }
    return result
  }

  function splitTags(cell) {
    var text = String(cell || '').trim()
    if (!text) return []
    return text.split(/[、,，]/).map(function (t) { return String(t || '').trim() }).filter(function (t) { return !!t })
  }

  function buildDishFromRow(data) {
    var raw = data || {}
    var warns = []
    var name = String(raw['菜名'] || '').trim()
    var category = String(raw['分类'] || '').trim()
    if (category) {
      var valid = CONST.CATEGORY_LIST.some(function (c) { return c.value === category })
      if (!valid) { category = CONST.CATEGORY_DEFAULT; warns.push('分类未收录，已归为「其他」') }
    } else { category = CONST.CATEGORY_DEFAULT }

    var minutesRaw = util.toNumber(String(raw['预估耗时_分钟'] || '').trim())
    var minutes = 15
    if (minutesRaw === null) {
      if (String(raw['预估耗时_分钟'] || '').trim() !== '') warns.push('耗时不是数字，已按 15 分钟处理')
    } else { minutes = Math.min(600, Math.max(1, Math.round(minutesRaw))) }

    var ingredients = splitIngredients(raw['食材'])
    var hasVague = ingredients.some(function (ing) { return util.toNumber(ing.amount) === null })
    if (hasVague) warns.push('部分食材未识别到用量，已按「适量」处理')

    var stepTexts = splitSteps(raw['步骤'])
    var steps = stepTexts.map(function (text) { return { text: text, image: '' } })

    return {
      name: name, category: category, cover: String(raw['封面图链接'] || '').trim(),
      tags: splitTags(raw['口味标签']), minutes: minutes,
      ingredients: ingredients, steps: steps, note: String(raw['备注'] || '').trim(),
      _warns: warns
    }
  }

  function validateRow(row, existNames) {
    var record = row || {}
    var data = record.data || {}
    var name = util.normalizeText(data['菜名'])
    var displayName = String(data['菜名'] || '').trim()
    if (!name) {
      return { ok: false, level: 'error', reason: '菜名为空', dish: null, rowIndex: record.rowIndex || 0, name: displayName }
    }
    var dish = buildDishFromRow(data)
    if (Array.isArray(existNames) && existNames.indexOf(name) >= 0) {
      return { ok: false, level: 'exists', reason: '菜名已存在，默认跳过（可勾选覆盖）', dish: dish, rowIndex: record.rowIndex || 0, name: displayName }
    }
    if (!dish.ingredients || dish.ingredients.length === 0) {
      return { ok: false, level: 'error', reason: '未识别到食材', dish: null, rowIndex: record.rowIndex || 0, name: displayName }
    }
    if (!dish.steps || dish.steps.length === 0) {
      return { ok: false, level: 'error', reason: '未识别到步骤', dish: null, rowIndex: record.rowIndex || 0, name: displayName }
    }
    return { ok: true, level: (dish._warns && dish._warns.length > 0) ? 'warn' : 'ok', reason: (dish._warns || []).join('；'), dish: dish, rowIndex: record.rowIndex || 0, name: displayName }
  }

  global.csvLib = {
    CSV_TEMPLATE: CSV_TEMPLATE,
    parseCsv: parseCsv,
    toRecords: toRecords,
    splitIngredients: splitIngredients,
    splitSteps: splitSteps,
    splitTags: splitTags,
    buildDishFromRow: buildDishFromRow,
    validateRow: validateRow,
    stripBom: stripBom
  }
})(window)
