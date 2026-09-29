/* 家庭点菜助手 · 网页版前端逻辑
 * 渲染四个 tab（点菜 / 做饭 / 菜谱 / 我的）+ 购物车 + 下单抽屉 + 菜谱导入。 */
(function () {
  'use strict'

  var store = window.store
  var CONST = window.CONST
  var util = window.util
  var mergeLib = window.mergeLib
  var csvLib = window.csvLib

  store.load()

  var today = util.formatDate(Date.now())
  var members = store.getMembers()

  var state = {
    tab: 'order',
    selectedMemberId: members.length ? members[0]._id : '',
    search: '',
    category: '全部',
    cart: {},            // dishId -> count
    cookDate: today,
    cookMeal: '全部',
    shopChecked: {},     // 合并食材勾选：ingredientKey -> true
    orderSheetMember: members.length ? members[0]._id : '',
    orderSheetDate: today,
    orderSheetMeal: '午餐',
    orderSheetRemark: ''
  }

  var SHOP_CHECK_KEY = 'familyDishShopChecked_v1'
  function loadShopChecked() {
    try { var raw = JSON.parse(localStorage.getItem(SHOP_CHECK_KEY) || '{}'); return raw && typeof raw === 'object' ? raw : {} }
    catch (e) { return {} }
  }
  function saveShopChecked() {
    try { localStorage.setItem(SHOP_CHECK_KEY, JSON.stringify(state.shopChecked)) } catch (e) {}
  }
  state.shopChecked = loadShopChecked()

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id) }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function catOf(v) { return CONST.getCategory(v) }
  function toast(msg) {
    var t = $('toast')
    t.textContent = msg
    t.hidden = false
    clearTimeout(toast._t)
    toast._t = setTimeout(function () { t.hidden = true }, 1600)
  }
  function openSheet(html) {
    $('sheet').innerHTML = html
    $('sheetMask').hidden = false
  }
  function closeSheet() { $('sheetMask').hidden = true }

  /* 自定义确认弹窗：替代原生 confirm（预览面板/webview 不支持原生弹窗） */
  function confirmDialog(msg, onYes) {
    var mask = $('confirmMask')
    $('confirmMsg').textContent = msg
    mask.hidden = false
    var ok = $('confirmOk'), cancel = $('confirmCancel')
    function cleanup() { mask.hidden = true; ok.onclick = null; cancel.onclick = null }
    ok.onclick = function () { cleanup(); onYes() }
    cancel.onclick = cleanup
    mask.onclick = function (e) { if (e.target === mask) cleanup() }
  }
  function cartCount() { return Object.keys(state.cart).length }
  function cartPortions() { var s = 0; for (var k in state.cart) s += state.cart[k]; return s }
  function colorOf(colorIndex) { return CONST.COLOR_PALETTE[(colorIndex || 0) % CONST.COLOR_PALETTE.length] }

  var AVATAR_EMOJIS = ['🙋', '💑', '👩', '👨', '🧑', '👧', '👦', '👶', '🐱', '🐶', '🌟', '🍎', '☕', '🍔', '🍜', '🌸']
  function isImg(v) { return typeof v === 'string' && /^(data:|https?:)/.test(v) }
  function avatarInner(m) {
    var a = m.avatar || '🙂'
    if (isImg(a)) return '<img class="avatar-img" src="' + esc(a) + '" alt="">'
    return esc(a)
  }
  function avatarSpan(m, cls) {
    return '<span class="' + cls + '" style="background:' + colorOf(m.colorIndex) + '">' + avatarInner(m) + '</span>'
  }

  /* ---------------- 顶部 / tab / 购物车条 ---------------- */
  function renderChrome() {
    var titles = { order: '点菜', cook: '做饭', recipe: '菜谱', profile: '我的' }
    $('appTitle').textContent = titles[state.tab]
    var brand = $('brandName')
    if (brand) brand.textContent = store.getSpace().name || '家庭点菜助手'
    var tabs = document.querySelectorAll('.tab')
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === state.tab)
    }
  }

  function renderCartBar() {
    var bar = $('cartBar')
    if (!bar) return
    if (cartCount() === 0 || state.tab !== 'order') { bar.classList.add('hidden'); return }
    bar.classList.remove('hidden')
    bar.innerHTML =
      '<div class="cart-info">已选 <b>' + cartCount() + '</b> 道菜 · 共 <b>' + cartPortions() + '</b> 份</div>' +
      '<button class="cart-go" data-action="open-cart">去下单</button>'
  }

  /* ---------------- 点菜页 ---------------- */
  function renderOrder() {
    var dishes = store.getDishes()
    var kw = state.search.trim()
    var list = dishes.filter(function (d) {
      if (state.category !== '全部' && d.category !== state.category) return false
      if (kw && d.name.indexOf(kw) < 0) return false
      return true
    })

    var cats = ['全部'].concat(CONST.CATEGORY_LIST.map(function (c) { return c.value }))
    var catHtml = cats.map(function (c) {
      return '<button class="cat-tab' + (state.category === c ? ' active' : '') + '" data-action="set-cat" data-val="' + esc(c) + '">' + esc(c) + '</button>'
    }).join('')

    var memberChips = members.map(function (m) {
      return '<button class="chip' + (state.selectedMemberId === m._id ? ' active' : '') + '" data-action="select-member" data-id="' + m._id + '">' +
        avatarSpan(m, 'chip-avatar') + esc(m.nickname) + (m.role ? ' <span class="muted">' + esc(m.role) + '</span>' : '') + '</button>'
    }).join('')

    var grid = list.length ? list.map(dishCardHtml).join('') : emptyHtml('no-search')

    $('screen').innerHTML =
      '<div class="member-chips">' + memberChips + '</div>' +
      '<div class="search"><span>🔍</span><input id="searchInput" placeholder="搜菜名，如 排骨" value="' + esc(state.search) + '"></div>' +
      '<div class="cat-tabs">' + catHtml + '</div>' +
      '<div class="dish-grid">' + grid + '</div>'
  }

  function dishCoverHtml(d) {
    var c = catOf(d.category)
    var badge = '<span class="dish-badge">' + esc(d.category) + '</span>'
    if (isImg(d.cover)) {
      return '<div class="dish-cover" style="background:#eee">' + badge + '<img class="cover-img" src="' + esc(d.cover) + '" alt=""></div>'
    }
    return '<div class="dish-cover" style="background:' + c.color + '">' + c.emoji + badge + '</div>'
  }

  function dishCardHtml(d) {
    var c = catOf(d.category)
    var cnt = state.cart[d._id] || 0
    var tags = (d.tags || []).slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + '</span>' }).join('')
    var actions = cnt > 0
      ? '<span class="stepper">' +
          '<button data-action="card-dec" data-id="' + d._id + '">−</button>' +
          '<span class="num">' + cnt + '</span>' +
          '<button data-action="card-inc" data-id="' + d._id + '">+</button>' +
        '</span>'
      : '<button class="add-btn" data-action="add-to-cart" data-id="' + d._id + '">+</button>'
    return '' +
      '<div class="dish-card">' +
        dishCoverHtml(d) +
        '<div class="dish-body">' +
          '<div class="dish-name">' + esc(d.name) + '</div>' +
          '<div class="dish-meta">⏱ ' + d.minutes + ' 分钟 · ' + (d.ingredients ? d.ingredients.length : 0) + ' 种食材</div>' +
          '<div class="dish-tags">' + tags + '</div>' +
          '<div class="dish-foot">' +
            '<span class="dish-time">' + (d.tags && d.tags[0] ? esc(d.tags[0]) : '家常') + '</span>' +
            '<div class="card-actions">' + actions + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
  }

  /* ---------------- 下单抽屉 ---------------- */
  function openCartSheet() {
    if (cartCount() === 0) { toast(CONST.MSG.CART_EMPTY); return }
    var dishes = store.getDishes()
    var map = {}
    dishes.forEach(function (d) { map[d._id] = d })
    var rows = Object.keys(state.cart).map(function (id) {
      var d = map[id]
      var name = d ? d.name : (store.getDishById(id) ? store.getDishById(id).name : '已删除')
      return '' +
        '<div class="order-row">' +
          '<div><div class="or-name">' + esc(name) + '</div><div class="or-sub">单价 1 份</div></div>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<span class="stepper">' +
              '<button data-action="cart-dec" data-id="' + id + '"' + (state.cart[id] <= 1 ? ' class="disabled"' : '') + '>−</button>' +
              '<span class="num">' + state.cart[id] + '</span>' +
              '<button data-action="cart-inc" data-id="' + id + '">+</button>' +
            '</span>' +
          '</div>' +
        '</div>'
    }).join('')

    var memberChips = members.map(function (m) {
      return '<button class="chip' + (state.orderSheetMember === m._id ? ' active' : '') + '" data-action="sheet-member" data-id="' + m._id + '">' +
        '<span class="dot" style="background:' + colorOf(m.colorIndex) + '"></span>' + esc(m.nickname) + '</button>'
    }).join('')

    var mealBtns = CONST.MEAL_TYPES.map(function (m) {
      return '<button class="chip' + (state.orderSheetMeal === m.value ? ' active' : '') + '" data-action="sheet-meal" data-val="' + m.value + '">' + m.value + '</button>'
    }).join('')

    openSheet(
      '<div class="sheet-head"><h3>确认下单</h3><button class="sheet-close" data-action="close-sheet">×</button></div>' +
      '<div class="field"><label>点菜人</label><div class="member-chips">' + memberChips + '</div></div>' +
      '<div class="field"><label>日期</label><input type="date" id="sheetDate" value="' + state.orderSheetDate + '"></div>' +
      '<div class="field"><label>餐次</label><div class="member-chips">' + mealBtns + '</div></div>' +
      '<div class="field"><label>备注</label><textarea id="sheetRemark" placeholder="例如：米饭多蒸一点">' + esc(state.orderSheetRemark) + '</textarea></div>' +
      '<div class="section-title">菜品清单 <span class="sub">共 ' + cartPortions() + ' 份</span></div>' +
      rows +
      '<div style="height:12px"></div>' +
      '<button class="btn btn-primary" data-action="confirm-order">确认下单</button>' +
      '<button class="btn btn-ghost mt" data-action="close-sheet">再逛逛</button>'
    )
  }

  function confirmOrder() {
    var dateEl = $('sheetDate'); var remarkEl = $('sheetRemark')
    if (dateEl) state.orderSheetDate = dateEl.value || today
    if (remarkEl) state.orderSheetRemark = remarkEl.value || ''
    var member = store.getMemberById(state.orderSheetMember)
    if (!member) { toast(CONST.MSG.NEED_MEMBER); return }
    if (cartCount() === 0) { toast(CONST.MSG.CART_EMPTY); return }

    var dishes = store.getDishes(); var map = {}
    dishes.forEach(function (d) { map[d._id] = d })
    var items = []
    Object.keys(state.cart).forEach(function (id) {
      var d = map[id] || store.getDishById(id)
      items.push({ dishId: id, dishNameSnapshot: d ? d.name : '已删除', count: state.cart[id], status: 'todo', updatedAt: Date.now() })
    })
    store.addOrder({
      memberId: member._id, memberName: member.nickname,
      mealDate: state.orderSheetDate, mealType: state.orderSheetMeal,
      remark: state.orderSheetRemark, items: items
    })
    state.cart = {}
    state.orderSheetRemark = ''
    closeSheet()
    toast(CONST.MSG.ORDER_OK)
    renderChrome(); renderOrder(); renderCartBar()
  }

  /* ---------------- 做饭页 ---------------- */
  function renderCook() {
    var orders = store.getOrders({ mealDate: state.cookDate, mealType: state.cookMeal })
    if (!orders.length) {
      $('screen').innerHTML = cookFilterHtml() + emptyHtml('no-order')
      return
    }

    // 聚合：按 dishId 汇总份数（B15）
    var aggMap = {}
    var totalItems = 0, doneItems = 0
    orders.forEach(function (o) {
      (o.items || []).forEach(function (it) {
        if (!aggMap[it.dishId]) aggMap[it.dishId] = { dishId: it.dishId, dishName: it.dishNameSnapshot, totalCount: 0 }
        aggMap[it.dishId].totalCount += it.count
        totalItems += it.count
        if (it.status === 'done') doneItems += it.count
      })
    })
    var rows = Object.keys(aggMap).map(function (k) { return aggMap[k] })
    var dishMap = {}
    store.getDishes().forEach(function (d) { dishMap[d._id] = d })
    var merged = mergeLib.mergeIngredients(rows, dishMap)

    var pct = totalItems ? Math.round(doneItems / totalItems * 100) : 0
    var progressHtml =
      '<div class="progress-wrap">' +
        '<div class="progress-top"><span>今日备菜进度</span><span>' + doneItems + ' / ' + totalItems + ' 份完成</span></div>' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '</div>'

    var shopHtml = shopGroupHtml('🛒 采购清单 · 主食材', merged.main) + shopGroupHtml('🧂 调味料', merged.seasoning)

    // 每道菜步骤卡
    var orderedDishCards = orders.map(function (o) {
      return (o.items || []).map(function (it) {
        var d = dishMap[it.dishId] || store.getDishById(it.dishId)
        return cookDishHtml(o, it, d)
      }).join('')
    }).join('')

    $('screen').innerHTML = cookFilterHtml() + progressHtml + shopHtml + orderedDishCards
  }

  function cookFilterHtml() {
    var mealBtns = ['全部'].concat(CONST.MEAL_TYPES.map(function (m) { return m.value })).map(function (v) {
      return '<button class="cat-tab' + (state.cookMeal === v ? ' active' : '') + '" data-action="cook-meal" data-val="' + esc(v) + '">' + esc(v === '全部' ? '全部餐次' : v) + '</button>'
    }).join('')
    return '<div class="field"><label>日期</label><input type="date" id="cookDateInput" value="' + state.cookDate + '"></div>' +
      '<div class="cat-tabs">' + mealBtns + '</div>'
  }

  function shopGroupHtml(title, items) {
    if (!items.length) return ''
    var scope = state.cookDate + '|' + state.cookMeal + '|'
    var rowsHtml = items.map(function (it) {
      var skey = scope + it.key
      var checked = !!state.shopChecked[skey]
      var amountText = it.isSeasoning ? '' : (it.displayText || '适量')
      var srcText = mergeLib.buildSourceText(it.sources, 3)
      return '' +
        '<div class="shop-item' + (checked ? ' done' : '') + '">' +
          '<div class="shop-check' + (checked ? ' on' : '') + '" data-action="shop-check" data-val="' + esc(skey) + '">' + (checked ? '✓' : '') + '</div>' +
          '<div class="si-main">' +
            '<div class="si-name">' + esc(it.name) + '</div>' +
            (amountText ? '<div class="si-amount">' + esc(amountText) + '</div>' : '') +
            (srcText ? '<div class="si-src">' + esc(srcText) + '</div>' : '') +
          '</div>' +
        '</div>'
    }).join('')
    return '<div class="shop-group"><h4>' + title + ' <span class="sub muted">(' + items.length + ')</span></h4>' + rowsHtml + '</div>'
  }

  function cookDishHtml(order, item, dish) {
    var member = store.getMemberById(order.memberId)
    var done = item.status === 'done'
    var ingText = dish && dish.ingredients ? dish.ingredients.map(function (g) {
      return g.name + ' ' + (util.toNumber(g.amount) === null ? (g.unit || '适量') : (g.amount + (g.unit && g.unit !== '适量' ? g.unit : '')))
    }).join('、') : '（菜谱已删除）'
    var steps = dish && dish.steps ? dish.steps.map(function (s, i) {
      return '<li><span class="step-no">' + (i + 1) + '</span><span>' + esc(s.text) + '</span></li>'
    }).join('') : ''
    var note = dish && dish.note ? '<div class="cook-note">💡 ' + esc(dish.note) + '</div>' : ''
    return '' +
      '<div class="cook-dish">' +
        '<div class="cook-dish-head">' +
          '<div class="cook-dish-title">' + esc(item.dishNameSnapshot) +
            ' <span class="muted" style="font-size:12px;font-weight:400">×' + item.count + ' · ' + esc(member ? member.nickname : order.memberName) + ' 点</span>' +
          '</div>' +
          '<button class="tool-btn" data-action="dish-toggle" data-order="' + order._id + '" data-dish="' + item.dishId + '" style="border-color:' + (done ? 'var(--ok)' : 'var(--line)') + ';color:' + (done ? 'var(--ok)' : 'var(--text)') + '">' + (done ? '✓ 已做完' : '标记完成') + '</button>' +
        '</div>' +
        '<div class="cook-ing">食材：' + esc(ingText) + '</div>' +
        (steps ? '<ul class="step-list">' + steps + '</ul>' : '') +
        note +
      '</div>'
  }

  function recipeEmojiHtml(d, extraStyle) {
    var c = catOf(d.category)
    var style = extraStyle || ''
    if (isImg(d.cover)) return '<div class="recipe-emoji" style="padding:0;overflow:hidden;' + style + '"><img class="cover-img" src="' + esc(d.cover) + '" alt=""></div>'
    return '<div class="recipe-emoji" style="background:' + c.color + ';' + style + '">' + c.emoji + '</div>'
  }

  /* ---------------- 菜谱页 ---------------- */
  function renderRecipe() {
    var dishes = store.getDishes()
    var listHtml = dishes.length ? dishes.map(function (d) {
      var c = catOf(d.category)
      var tags = (d.tags || []).slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + '</span>' }).join('')
      return '' +
        '<div class="card recipe-card" data-action="open-recipe" data-id="' + d._id + '">' +
          '<button class="recipe-del" data-action="delete-recipe" data-id="' + d._id + '" title="删除">🗑</button>' +
          recipeEmojiHtml(d) +
          '<div class="recipe-info">' +
            '<div class="r-name">' + esc(d.name) + '</div>' +
            '<div class="r-meta">' + esc(d.category) + ' · ' + d.minutes + ' 分钟 · ' + (d.ingredients ? d.ingredients.length : 0) + ' 种食材</div>' +
            '<div class="r-tags">' + tags + '</div>' +
          '</div>' +
          '<span class="recipe-arrow">›</span>' +
        '</div>'
    }).join('') : emptyHtml('no-dish')

    $('screen').innerHTML =
      '<div class="tool-row">' +
        '<button class="tool-btn" data-action="open-import">📥 批量导入</button>' +
        '<button class="tool-btn" data-action="open-add-recipe">＋ 新增菜谱</button>' +
      '</div>' +
      listHtml
  }

  function openRecipeDetail(id) {
    var d = store.getDishById(id)
    if (!d) { toast(CONST.MSG.DISH_NOT_FOUND); return }
    var c = catOf(d.category)
    var ing = d.ingredients.map(function (g) {
      return g.name + ' ' + (util.toNumber(g.amount) === null ? (g.unit || '适量') : (g.amount + (g.unit && g.unit !== '适量' ? g.unit : '')))
    }).join('、')
    var steps = d.steps.map(function (s, i) {
      return '<li><span class="step-no">' + (i + 1) + '</span><span>' + esc(s.text) + '</span></li>'
    }).join('')
    var tags = (d.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>' }).join('')
    var note = d.note ? '<div class="cook-note">💡 ' + esc(d.note) + '</div>' : ''
    openSheet(
      '<div class="sheet-head"><h3>' + esc(d.name) + '</h3><button class="sheet-close" data-action="close-sheet">×</button></div>' +
      recipeEmojiHtml(d, 'width:60px;height:60px;font-size:34px;margin-bottom:10px') +
      '<div class="dish-tags" style="margin-bottom:10px">' + tags + '</div>' +
      '<div class="field"><label>分类 / 耗时</label><div class="muted">' + esc(d.category) + ' · ' + d.minutes + ' 分钟</div></div>' +
      '<div class="field"><label>食材</label><div class="cook-ing" style="font-size:13px">' + esc(ing) + '</div></div>' +
      '<div class="field"><label>做法</label><ul class="step-list">' + steps + '</ul></div>' +
      note +
      '<button class="btn btn-danger mt" data-action="delete-recipe" data-id="' + d._id + '">删除这道菜</button>'
    )
  }

  function openAddRecipe() {
    var catOpts = CONST.CATEGORY_LIST.map(function (c) { return '<option value="' + c.value + '">' + c.value + '</option>' }).join('')
    window.__coverDataUrl = ''
    openSheet(
      '<div class="sheet-head"><h3>新增菜谱</h3><button class="sheet-close" data-action="close-sheet">×</button></div>' +
      '<div class="field"><label>菜名 <span class="req">*</span></label><input id="rName" placeholder="如 西红柿炒蛋"></div>' +
      '<div class="row2">' +
        '<div class="field"><label>分类</label><select id="rCat">' + catOpts + '</select></div>' +
        '<div class="field"><label>耗时(分钟)</label><input id="rMin" type="number" value="15"></div>' +
      '</div>' +
      '<div class="field"><label>口味标签 <span class="opt">选填</span></label><input id="rTags" placeholder="家常、快手"></div>' +
      '<div class="field"><label>封面图 <span class="opt">选填，上传一张照片</span></label>' +
        '<input type="file" id="rCover" accept="image/*">' +
        '<div class="cover-preview" id="coverPreview"></div>' +
      '</div>' +
      '<div class="field"><label>食材 <span class="req">*</span> <span class="field-hint">每行一个，只写菜名也行（如「西红柿」），用量单位可选；会自动汇总进备菜采购清单</span></label><textarea id="rIng" placeholder="西红柿 2个&#10;鸡蛋 3个&#10;盐 适量&#10;或直接写一行：土豆"></textarea></div>' +
      '<div class="field"><label>步骤 <span class="opt">选填，每行一步</span></label><textarea id="rSteps" placeholder="西红柿切块&#10;鸡蛋打散"></textarea></div>' +
      '<div class="field"><label>备注</label><input id="rNote" placeholder="选填"></div>' +
      '<button class="btn btn-primary" data-action="save-recipe">保存菜谱</button>' +
      '<button class="btn btn-ghost mt" data-action="close-sheet">取消</button>'
    )
  }

  function saveRecipe() {
    var name = $('rName').value.trim()
    if (!name) { toast(CONST.MSG.NAME_EMPTY); return }
    var ingLines = $('rIng').value.split('\n').map(function (l) { return l.trim() }).filter(Boolean)
    var ingredients = []
    ingLines.forEach(function (line) { ingredients = ingredients.concat(csvLib.splitIngredients(line)) })
    if (!ingredients.length) { toast(CONST.MSG.NEED_INGREDIENT); return }
    var stepLines = $('rSteps').value.split('\n').map(function (l) { return l.trim() }).filter(Boolean)
    var tags = $('rTags').value.split(/[、,，]/).map(function (t) { return t.trim() }).filter(Boolean)
    var dish = {
      name: name,
      category: $('rCat').value,
      cover: window.__coverDataUrl || '',
      tags: tags,
      minutes: Math.max(1, parseInt($('rMin').value, 10) || 15),
      ingredients: ingredients,
      steps: stepLines.map(function (t) { return { text: t, image: '' } }),
      note: $('rNote').value.trim()
    }
    store.addDish(dish)
    window.__coverDataUrl = ''
    closeSheet(); toast(CONST.MSG.SAVED); renderRecipe()
  }

  function openImport() {
    openSheet(
      '<div class="sheet-head"><h3>批量导入菜谱</h3><button class="sheet-close" data-action="close-sheet">×</button></div>' +
      '<div class="hint">支持 CSV：表头为 菜名,分类,口味标签,预估耗时_分钟,封面图链接,食材,步骤,备注。也可直接粘贴文本。</div>' +
      '<div class="tool-row"><button class="tool-btn" data-action="copy-template">复制模板</button><button class="tool-btn" data-action="download-template">下载模板</button></div>' +
      '<div class="field"><label>选择 CSV 文件</label><input type="file" id="csvFile" accept=".csv,text/csv"></div>' +
      '<div class="field"><label>或粘贴 CSV 文本</label><textarea id="csvText" placeholder="把表格内容粘贴到这里"></textarea></div>' +
      '<button class="btn btn-primary" data-action="parse-csv">解析并预览</button>' +
      '<div id="importPreview" style="margin-top:12px"></div>'
    )
  }

  function parseAndPreview() {
    var fileEl = $('csvFile')
    function run(text) {
      var records = csvLib.toRecords(text)
      var dishes = store.getDishes()
      var existNames = dishes.map(function (d) { return util.normalizeText(d.name) })
      var html = records.map(function (r) {
        var res = csvLib.validateRow(r, existNames)
        var tagClass = res.level === 'ok' ? 'imp-ok' : (res.level === 'warn' ? 'imp-warn' : (res.level === 'error' ? 'imp-error' : 'imp-skip'))
        var tagText = res.level === 'ok' ? '可导入' : (res.level === 'warn' ? '警告' : (res.level === 'error' ? '失败' : '已存在'))
        return '<div class="import-row"><span class="imp-tag ' + tagClass + '">' + tagText + '</span>' +
          '<span class="imp-name">' + esc(res.name) + '</span>' +
          '<span class="imp-reason">' + esc(res.reason || '第 ' + res.rowIndex + ' 行') + '</span></div>'
      }).join('')
      $('importPreview').innerHTML =
        (records.length ? '<div class="import-preview">' + html + '</div>' : '<div class="hint">没有解析到数据</div>') +
        (records.length ? '<button class="btn btn-primary mt" data-action="do-import" id="importBtn">导入可入库的菜谱</button>' : '')
      $('importBtn') && ($('importBtn')._records = records)
      if (records.length) window.__csvRecords = records
    }
    if (fileEl && fileEl.files && fileEl.files[0]) {
      var reader = new FileReader()
      reader.onload = function (e) { run(e.target.result) }
      reader.readAsText(fileEl.files[0], 'UTF-8')
    } else {
      var txt = $('csvText').value
      if (!txt.trim()) { toast(CONST.MSG.IMPORT_NONE); return }
      run(txt)
    }
  }

  function doImport() {
    var records = window.__csvRecords || []
    var dishes = store.getDishes()
    var existNames = dishes.map(function (d) { return util.normalizeText(d.name) })
    var imported = 0
    records.forEach(function (r) {
      var res = csvLib.validateRow(r, existNames)
      if (res.ok && res.dish) {
        store.addDish(res.dish)
        imported += 1
        existNames.push(util.normalizeText(res.dish.name))
      }
    })
    closeSheet()
    toast(imported ? ('已导入 ' + imported + ' 道菜') : CONST.MSG.IMPORT_NONE)
    renderRecipe()
  }

  /* ---------------- 我的页（可自定义主页） ---------------- */
  function renderProfile() {
    var sp = store.getSpace()
    var coverStyle = isImg(sp.bg)
      ? 'background-image:url(\'' + esc(sp.bg) + '\');background-size:cover;background-position:center'
      : 'background:linear-gradient(135deg, #FFB088, #FF7A45)'
    var spAvatar = isImg(sp.avatar)
      ? '<img class="home-avatar-img" src="' + esc(sp.avatar) + '" alt="">'
      : (sp.avatar || '🍽️')

    var ms = store.getMembers()
    var memberHtml = ms.map(function (m) {
      return '<div class="member-card">' +
        avatarSpan(m, 'avatar') +
        '<div class="m-name">' + esc(m.nickname) + (m.role ? '<span class="m-role">' + esc(m.role) + '</span>' : '') + '</div>' +
        '<div class="m-actions">' +
          '<button class="tool-btn" data-action="edit-member" data-id="' + m._id + '">编辑</button>' +
          (ms.length > 1 ? '<button class="tool-btn" data-action="remove-member" data-id="' + m._id + '">移除</button>' : '') +
        '</div>' +
      '</div>'
    }).join('')
    var dishCount = store.getDishes().length
    var orderCount = store.getOrders({}).length

    $('screen').innerHTML =
      '<div class="home-banner" style="' + coverStyle + '">' +
        '<button class="home-edit-cover" data-action="edit-space">🖼 更换背景</button>' +
        '<div class="home-avatar">' + spAvatar + '</div>' +
        '<div class="home-name">' + esc(sp.name || '家庭点菜助手') +
          '<button class="home-pen" data-action="edit-space" title="编辑资料">✎</button></div>' +
        '<div class="home-intro">' + (sp.intro ? esc(sp.intro) : '<span class="muted">点击右上角填写自我介绍…</span>') + '</div>' +
      '</div>' +

      '<div class="card"><div class="section-title">家庭成员</div>' +
        '<div class="member-grid">' + memberHtml + '</div>' +
        '<button class="btn btn-ghost mt" data-action="add-member">＋ 添加成员</button></div>' +

      '<div class="profile-grid">' +
        '<div class="card"><div class="section-title">数据</div>' +
          '<div class="muted" style="font-size:13px">菜谱 ' + dishCount + ' 道 · 订单 ' + orderCount + ' 单</div>' +
          '<button class="btn btn-ghost mt" data-action="reset-data">恢复示例数据</button></div>' +
        '<div class="card"><div class="section-title">关于</div>' +
          '<div class="muted" style="font-size:13px">点菜模式像外卖一样加购下单；做饭模式自动合并食材、生成备料清单与步骤。数据保存在本机浏览器（localStorage）。</div></div>' +
      '</div>'
  }

  /* 编辑主页资料：名称 / 自我介绍 / 背景 / 头像 */
  function openSpaceForm() {
    var sp = store.getSpace()
    window.__spaceBg = sp.bg || ''
    window.__spaceAvatar = sp.avatar || '🍽️'
    openSheet(
      '<div class="sheet-head"><h3>编辑主页资料</h3><button class="sheet-close" data-action="close-sheet">×</button></div>' +
      '<div class="field"><label>主页名称（标题）</label><input id="spName" placeholder="如 我们的小厨房" value="' + esc(sp.name || '') + '"></div>' +
      '<div class="field"><label>自我介绍</label><textarea id="spIntro" placeholder="写点什么介绍这个空间吧～">' + esc(sp.intro || '') + '</textarea></div>' +
      '<div class="field"><label>背景图（可选）</label>' +
        '<div class="cover-banner-pick" id="spBgPick" style="' + (isImg(sp.bg) ? 'background-image:url(\'' + esc(sp.bg) + '\');background-size:cover;background-position:center' : 'background:linear-gradient(135deg,#FFB088,#FF7A45)') + '">' +
          '<label class="avatar-upload" title="上传背景">📷 上传背景<input type="file" id="spaceBg" accept="image/*" style="display:none"></label>' +
          '<button type="button" class="link" data-action="clear-space-bg">清除背景</button>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>头像</label>' +
        '<div class="avatar-picker">' +
          AVATAR_EMOJIS.map(function (e) { return '<button type="button" class="avatar-opt' + (window.__spaceAvatar === e ? ' active' : '') + '" data-action="pick-space-avatar" data-emoji="' + e + '">' + e + '</button>' }).join('') +
          '<label class="avatar-upload" title="上传图片">＋<input type="file" id="spaceAvatar" accept="image/*" style="display:none"></label>' +
        '</div>' +
        '<div id="spaceAvatarPreview"></div>' +
      '</div>' +
      '<button class="btn btn-primary" data-action="save-space">保存</button>' +
      '<button class="btn btn-ghost mt" data-action="close-sheet">取消</button>'
    )
  }

  function saveSpace() {
    var name = ($('spName').value || '').trim()
    var intro = ($('spIntro').value || '').trim()
    store.saveSpace({ name: name || '我们的小厨房', intro: intro, bg: window.__spaceBg || '', avatar: window.__spaceAvatar || '🍽️' })
    closeSheet(); renderChrome(); renderProfile(); toast('主页已更新')
  }

  /* ---------------- 成员表单（新增 / 编辑） ---------------- */
  function openMemberForm(id) {
    var editing = id ? store.getMemberById(id) : null
    window.__memberAvatar = editing ? (editing.avatar || AVATAR_EMOJIS[0]) : AVATAR_EMOJIS[0]
    var avatars = AVATAR_EMOJIS.map(function (e) {
      var active = (window.__memberAvatar === e) ? ' active' : ''
      return '<button type="button" class="avatar-opt' + active + '" data-action="pick-avatar" data-emoji="' + e + '">' + e + '</button>'
    }).join('')
    openSheet(
      '<div class="sheet-head"><h3>' + (editing ? '编辑成员' : '添加成员') + '</h3><button class="sheet-close" data-action="close-sheet">×</button></div>' +
      '<div class="field"><label>昵称 *</label><input id="mName" placeholder="如 我 / 对象 / 室友" value="' + (editing ? esc(editing.nickname) : '') + '"></div>' +
      '<div class="field"><label>角色 / 关系</label><input id="mRole" placeholder="如 本人 / 伴侣 / 室友" value="' + (editing ? esc(editing.role) : '') + '"></div>' +
      '<div class="field"><label>头像</label>' +
        '<div class="avatar-picker">' + avatars +
          '<label class="avatar-upload" title="上传图片">＋<input type="file" id="mAvatarUpload" accept="image/*" style="display:none"></label>' +
        '</div>' +
        '<div id="memberAvatarPreview"></div>' +
      '</div>' +
      '<button class="btn btn-primary" data-action="save-member" data-id="' + (editing ? editing._id : '') + '">' + (editing ? '保存修改' : '添加') + '</button>' +
      (editing
        ? '<button class="btn btn-danger mt" data-action="remove-member" data-id="' + editing._id + '">删除该成员</button>'
        : '<button class="btn btn-ghost mt" data-action="close-sheet">取消</button>')
    )
  }

  function saveMember(id) {
    var name = $('mName').value.trim()
    if (!name) { toast(CONST.MSG.NICKNAME_EMPTY); return }
    var role = $('mRole').value.trim()
    var avatar = window.__memberAvatar || '🙂'
    if (id) { store.updateMember(id, { nickname: name, role: role, avatar: avatar }); toast(CONST.MSG.SAVED) }
    else { store.addMember(name, role, avatar); toast(CONST.MSG.SAVED) }
    members = store.getMembers()
    if (!store.getMemberById(state.selectedMemberId)) {
      state.selectedMemberId = members.length ? members[0]._id : ''
      state.orderSheetMember = state.selectedMemberId
    }
    closeSheet(); renderProfile()
  }

  /* ---------------- 空状态 ---------------- */
  function emptyHtml(type) {
    var e = CONST.EMPTY_TEXT[type] || { emoji: '🍽', text: '暂无数据', subText: '', btnText: '' }
    var btn = e.btnText ? '<button class="e-btn" data-action="empty-action" data-type="' + type + '">' + esc(e.btnText) + '</button>' : ''
    return '<div class="empty"><div class="e-emoji">' + e.emoji + '</div><div class="e-text">' + esc(e.text) +
      '</div><div class="e-sub">' + esc(e.subText) + '</div>' + btn + '</div>'
  }

  /* ---------------- 渲染调度 ---------------- */
  function render() {
    renderChrome()
    if (state.tab === 'order') renderOrder()
    else if (state.tab === 'cook') renderCook()
    else if (state.tab === 'recipe') renderRecipe()
    else if (state.tab === 'profile') renderProfile()
    renderCartBar()
  }

  /* ---------------- 事件 ---------------- */
  function onTap(e) {
    var el = e.target.closest('[data-action]')
    if (!el) return
    var a = el.getAttribute('data-action')
    var id = el.getAttribute('data-id')
    var val = el.getAttribute('data-val')

    switch (a) {
      case 'switch-tab': state.tab = el.getAttribute('data-tab') || val; render(); break
      case 'select-member': state.selectedMemberId = id; state.orderSheetMember = id; renderOrder(); renderCartBar(); break
      case 'set-cat': state.category = val; renderOrder(); break
      case 'add-to-cart': addToCart(id, el); break
      case 'card-inc': addToCart(id, el); break
      case 'card-dec': decFromCart(id); break
      case 'open-cart': openCartSheet(); break
      case 'close-sheet': closeSheet(); break
      case 'cart-inc': state.cart[id] = (state.cart[id] || 0) + 1; reopenOrRenderCart(); break
      case 'cart-dec':
        if (state.cart[id] > 1) state.cart[id] -= 1; else delete state.cart[id]
        if (cartCount() === 0) { closeSheet(); } else { openCartSheet(); }
        renderOrder(); renderCartBar(); break
      case 'sheet-member': state.orderSheetMember = id; openCartSheet(); break
      case 'sheet-meal': state.orderSheetMeal = val; openCartSheet(); break
      case 'confirm-order': confirmOrder(); break
      case 'cook-meal': state.cookMeal = val; renderCook(); break
      case 'shop-check': state.shopChecked[val] = !state.shopChecked[val]; saveShopChecked(); renderCook(); break
      case 'dish-toggle':
        var oid = el.getAttribute('data-order'); var did = el.getAttribute('data-dish')
        var cur = null
        var od = store.getOrders({}).find(function (o) { return o._id === oid })
        if (od) { var it = (od.items || []).find(function (x) { return x.dishId === did }); if (it) cur = it.status }
        store.updateOrderItemStatus(oid, did, cur === 'done' ? 'todo' : 'done')
        renderCook(); break
      case 'open-recipe': openRecipeDetail(id); break
      case 'delete-recipe':
        confirmDialog('确定删除这道菜？', function () { store.removeDish(id); closeSheet(); toast(CONST.MSG.DELETED); renderRecipe() })
        break
      case 'open-add-recipe': openAddRecipe(); break
      case 'save-recipe': saveRecipe(); break
      case 'open-import': openImport(); break
      case 'copy-template':
        if (navigator.clipboard) navigator.clipboard.writeText(csvLib.CSV_TEMPLATE).then(function () { toast('模板已复制') }, function () { toast('复制失败，请手动选择') })
        else toast('当前环境不支持复制')
        break
      case 'download-template': downloadTemplate(); break
      case 'parse-csv': parseAndPreview(); break
      case 'do-import': doImport(); break
      case 'add-member': openMemberForm(null); break
      case 'edit-member': openMemberForm(id); break
      case 'save-member': saveMember(id); break
      case 'pick-avatar':
        window.__memberAvatar = el.getAttribute('data-emoji')
        var opts = document.querySelectorAll('.avatar-opt')
        for (var k = 0; k < opts.length; k++) opts[k].classList.toggle('active', opts[k].getAttribute('data-emoji') === window.__memberAvatar)
        break
      case 'remove-member':
        confirmDialog('移除该成员？其订单也会一并删除。', function () {
          store.removeMember(id)
          members = store.getMembers()
          if (!store.getMemberById(state.selectedMemberId)) {
            state.selectedMemberId = members.length ? members[0]._id : ''
            state.orderSheetMember = state.selectedMemberId
          }
          closeSheet(); renderProfile()
        })
        break
      case 'reset-data':
        confirmDialog('恢复示例数据会覆盖当前全部菜谱与订单，确定？', function () {
          store.reset(); members = store.getMembers()
          state.selectedMemberId = members.length ? members[0]._id : ''
          state.orderSheetMember = state.selectedMemberId
          render(); toast(CONST.MSG.RESET_OK)
        })
        break
      case 'edit-space': openSpaceForm(); break
      case 'save-space': saveSpace(); break
      case 'pick-space-avatar':
        window.__spaceAvatar = el.getAttribute('data-emoji')
        var spa = document.querySelectorAll('.avatar-opt')
        for (var sa = 0; sa < spa.length; sa++) spa[sa].classList.toggle('active', spa[sa].getAttribute('data-emoji') === window.__spaceAvatar)
        var spPrev = $('spaceAvatarPreview')
        if (spPrev) spPrev.innerHTML = ''
        break
      case 'clear-space-bg':
        window.__spaceBg = ''
        var bgPick = $('spBgPick')
        if (bgPick) bgPick.style.cssText = 'background:linear-gradient(135deg,#FFB088,#FF7A45)'
        break
      case 'empty-action':
        if (val === 'no-order') { state.tab = 'order'; render() }
        else if (val === 'no-dish') { openAddRecipe() }
        break
    }
  }

  function reopenOrRenderCart() {
    // 抽屉打开时调整份数后刷新抽屉；否则只刷新列表与购物车条
    if (!$('sheetMask').hidden) openCartSheet()
    renderOrder(); renderCartBar()
  }

  function addToCart(id, btnEl) {
    state.cart[id] = (state.cart[id] || 0) + 1
    flyToCart(btnEl)
    renderOrder(); renderCartBar()
  }

  function decFromCart(id) {
    if (!state.cart[id]) return
    if (state.cart[id] > 1) state.cart[id] -= 1
    else delete state.cart[id]
    renderOrder(); renderCartBar()
  }

  function flyToCart(btnEl) {
    try {
      var bar = $('cartBar')
      if (!bar || bar.classList.contains('hidden')) return
      var b = btnEl.getBoundingClientRect()
      var t = bar.getBoundingClientRect()
      var circle = document.createElement('div')
      circle.className = 'fly'
      circle.textContent = '+1'
      circle.style.cssText = 'left:' + (b.left + b.width / 2 - 12) + 'px;top:' + (b.top + b.height / 2 - 12) + 'px;width:24px;height:24px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;'
      document.body.appendChild(circle)
      requestAnimationFrame(function () {
        circle.style.left = (t.left + 30) + 'px'
        circle.style.top = (t.top + t.height / 2 - 12) + 'px'
        circle.style.opacity = '0'
      })
      setTimeout(function () { circle.remove() }, 520)
    } catch (e) { /* 动画失败不影响主流程 */ }
  }

  function downloadTemplate() {
    var blob = new Blob([csvLib.CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '菜谱导入模板.csv'
    a.click()
    setTimeout(function () { URL.revokeObjectURL(a.href) }, 1000)
  }

  /* 搜索输入（事件委托） */
  function onInput(e) {
    if (e.target && e.target.id === 'searchInput') { state.search = e.target.value; renderOrder() }
    if (e.target && e.target.id === 'cookDateInput') { state.cookDate = e.target.value || today; renderCook() }
    if (e.target && e.target.id === 'sheetDate') { state.orderSheetDate = e.target.value || today }
    if (e.target && e.target.id === 'sheetRemark') { state.orderSheetRemark = e.target.value }
  }

  function onFileChange(e) {
    var t = e.target
    if (!t) return
    var file = t.files && t.files[0]
    if (t.id === 'rCover') {
      if (!file) return
      var r = new FileReader()
      r.onload = function (ev) {
        window.__coverDataUrl = ev.target.result
        var prev = $('coverPreview')
        if (prev) prev.innerHTML = '<img src="' + ev.target.result + '" alt="">'
      }
      r.readAsDataURL(file)
    } else if (t.id === 'mAvatarUpload') {
      if (!file) return
      var r2 = new FileReader()
      r2.onload = function (ev) {
        window.__memberAvatar = ev.target.result
        var prev = $('memberAvatarPreview')
        if (prev) prev.innerHTML = '<img class="cover-img" style="width:60px;height:60px;border-radius:50%" src="' + ev.target.result + '">'
        var all = document.querySelectorAll('.avatar-opt')
        for (var i = 0; i < all.length; i++) all[i].classList.remove('active')
      }
      r2.readAsDataURL(file)
    } else if (t.id === 'spaceBg') {
      if (!file) return
      var r3 = new FileReader()
      r3.onload = function (ev) {
        window.__spaceBg = ev.target.result
        var pick = $('spBgPick')
        if (pick) pick.style.cssText = 'background-image:url(\'' + ev.target.result + '\');background-size:cover;background-position:center'
      }
      r3.readAsDataURL(file)
    } else if (t.id === 'spaceAvatar') {
      if (!file) return
      var r4 = new FileReader()
      r4.onload = function (ev) {
        window.__spaceAvatar = ev.target.result
        var prev = $('spaceAvatarPreview')
        if (prev) prev.innerHTML = '<img class="cover-img" style="width:60px;height:60px;border-radius:50%" src="' + ev.target.result + '">'
        var all2 = document.querySelectorAll('.avatar-opt')
        for (var j = 0; j < all2.length; j++) all2[j].classList.remove('active')
      }
      r4.readAsDataURL(file)
    }
  }

  document.addEventListener('click', onTap)
  document.addEventListener('input', onInput)
  document.addEventListener('change', onFileChange)
  $('sheetMask').addEventListener('click', function (e) { if (e.target === this) closeSheet() })

  // 底部购物车条挂载点（页面切换时需要重新插入）
  var bar = document.createElement('div')
  bar.id = 'cartBar'
  bar.className = 'cart-bar hidden'
  $('app').appendChild(bar)

  render()
})()
