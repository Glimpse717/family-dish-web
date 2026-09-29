/* 无头集成测试：用 jsdom 真实加载页面 + 全部 JS，模拟点击验证交互 */
const fs = require('fs')
const path = require('path')
const { JSDOM } = require('jsdom')

const root = path.join(__dirname, '..')
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')

// 把外链 <script src> 替换为内联内容，避免 jsdom 跨文件加载问题
const jsFiles = ['js/util.js', 'js/constants.js', 'js/merge.js', 'js/csv.js', 'js/store.js', 'js/app.js']
let inlined = html
jsFiles.forEach(function (f) {
  const code = fs.readFileSync(path.join(root, f), 'utf8')
  inlined = inlined.replace('<script src="' + f + '"></script>', '<script>\n' + code + '\n</script>')
})

const dom = new JSDOM(inlined, {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  pretendToBeVisual: true
})
const { window } = dom
const doc = window.document

function $(s) { return doc.querySelector(s) }
function $all(s) { return Array.prototype.slice.call(doc.querySelectorAll(s)) }

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name) }
  else { fail++; console.log('  ✗ ' + name) }
}

setTimeout(function () {
  console.log('=== 初始渲染 ===')
  check('点菜页渲染出菜品卡 (>=5)', $all('.dish-card').length >= 5)
  check('顶部标题为"点菜"', $('#appTitle').textContent === '点菜')
  check('身份 chip 带头像', !!$('.chip-avatar'))
  check('身份 chip 显示角色(本人/伴侣)', /本人|伴侣/.test($('#screen').textContent))
  check('购物车条初始隐藏', $('#cartBar').classList.contains('hidden'))

  console.log('=== 点菜加购 ===')
  const addBtn = $('.add-btn')
  check('存在加购(+)按钮', !!addBtn)
  addBtn.click()
  check('点击后购物车条显示', !$('#cartBar').classList.contains('hidden'))
  check('加购后菜品卡出现步进器', !!$('.card-actions .stepper'))
  check('步进器数量为 1', ($('.card-actions .stepper .num') || {}).textContent === '1')

  console.log('=== 点菜减菜（卡片上直接减）===')
  const decBtn = $('.card-actions .stepper button[data-action="card-dec"]')
  check('存在卡片减号', !!decBtn)
  if (decBtn) decBtn.click()
  check('减到 0 后购物车条隐藏', $('#cartBar').classList.contains('hidden'))
  check('减到 0 后回到单一加号', !!$('.add-btn') && !$('.card-actions .stepper'))

  console.log('=== 重新加购 + 去下单 ===')
  $('.add-btn').click()
  const goBtn = $('.cart-go')
  check('存在去下单按钮', !!goBtn)
  if (goBtn) goBtn.click()
  check('抽屉遮罩显示', !$('#sheetMask').hidden)
  check('抽屉含确认下单按钮', /确认下单/.test($('#sheet').textContent))

  console.log('=== 切换 tab：做饭 ===')
  const cookTab = $all('.tab').find(function (t) { return t.getAttribute('data-tab') === 'cook' })
  if (cookTab) cookTab.click()
  check('切换后标题为"做饭"', $('#appTitle').textContent === '做饭')
  check('做饭页 screen 有内容', $('#screen').innerHTML.length > 0)

  console.log('=== 切换 tab：菜谱 ===')
  const recipeTab = $all('.tab').find(function (t) { return t.getAttribute('data-tab') === 'recipe' })
  if (recipeTab) recipeTab.click()
  check('切换后标题为"菜谱"', $('#appTitle').textContent === '菜谱')
  check('菜谱页含新增/导入按钮', /新增菜谱/.test($('#screen').textContent) && /批量导入/.test($('#screen').textContent))

  console.log('=== 切换 tab：我的 + 成员新增表单 ===')
  const profileTab = $all('.tab').find(function (t) { return t.getAttribute('data-tab') === 'profile' })
  if (profileTab) profileTab.click()
  check('切换后标题为"我的"', $('#appTitle').textContent === '我的')
  check('我的页含家庭成员', /家庭成员/.test($('#screen').textContent))

  const beforeCount = window.store.getMembers().length
  const addMemberBtn = $all('.btn, .tool-btn').find(function (b) { return /添加成员/.test(b.textContent) })
  check('存在"添加成员"按钮', !!addMemberBtn)
  if (addMemberBtn) addMemberBtn.click()
  check('成员表单弹出(含昵称输入)', !!$('#mName'))
  const nameInput = $('#mName')
  if (nameInput) {
    nameInput.value = '测试室友'
    const saveBtn = $all('[data-action="save-member"]')[0]
    check('存在保存成员按钮', !!saveBtn)
    if (saveBtn) saveBtn.click()
  }
  check('新增后成员数 +1', window.store.getMembers().length === beforeCount + 1)
  check('新增后抽屉关闭', $('#sheetMask').hidden)

  console.log('=== 做饭页：采购清单画勾 ===')
  const cookTab2 = $all('.tab').find(function (t) { return t.getAttribute('data-tab') === 'cook' })
  if (cookTab2) cookTab2.click()
  const shopChecks = $all('.shop-check')
  check('采购清单存在勾选项', shopChecks.length >= 1)
  if (shopChecks.length >= 1) {
    const before = shopChecks[0].classList.contains('on')
    shopChecks[0].click()
    const after = $('.shop-check')
    check('点击后勾选状态翻转', $('.shop-check').classList.contains('on') !== before)
    check('勾选后渲染出已勾样式', $all('.shop-check.on').length >= 1)
    // 持久化
    check('勾选写入 localStorage', !!window.localStorage.getItem('familyDishShopChecked_v1'))
  }

  console.log('=== 做饭页：调味料不显示精细用量 ===')
  const seasoningGroup = $all('.shop-group').find(function (g) { return /调味料/.test(g.textContent) })
  check('存在调味料分组', !!seasoningGroup)
  if (seasoningGroup) {
    const seasonItem = seasoningGroup.querySelector('.shop-item')
    check('调味料项无用量(si-amount)', !!seasonItem && !seasonItem.querySelector('.si-amount'))
    check('调味料项有名称', !!seasonItem && !!seasonItem.querySelector('.si-name'))
  }
  const mainGroup = $all('.shop-group').find(function (g) { return /主食材/.test(g.textContent) })
  if (mainGroup) {
    const mainItem = mainGroup.querySelector('.shop-item')
    check('主食材项显示用量', !!mainItem && !!mainItem.querySelector('.si-amount'))
  }

  console.log('=== 菜谱：免步骤/标签/图片也可保存 ===')
  const recipeTab2 = $all('.tab').find(function (t) { return t.getAttribute('data-tab') === 'recipe' })
  if (recipeTab2) recipeTab2.click()
  const beforeDishes = window.store.getDishes().length
  const addRecipeBtn = $all('.btn, .tool-btn').find(function (b) { return /新增菜谱/.test(b.textContent) })
  check('存在新增菜谱按钮', !!addRecipeBtn)
  if (addRecipeBtn) addRecipeBtn.click()
  check('表单含菜名必填*', /菜名/.test($('#sheet').textContent) && !!$('#rName'))
  const rName = $('#rName'), rIng = $('#rIng')
  if (rName && rIng) {
    rName.value = '免步骤测试菜'
    rIng.value = '土豆\n胡萝卜 200g'  // 步骤留空
    const saveBtn = $all('[data-action="save-recipe"]')[0]
    check('存在保存菜谱按钮', !!saveBtn)
    if (saveBtn) saveBtn.click()
  }
  check('免步骤也能新增成功(菜谱数+1)', window.store.getDishes().length === beforeDishes + 1)
  check('免步骤保存后抽屉关闭', $('#sheetMask').hidden)

  console.log('=== 菜谱：只写菜名+食材(无用量)也能流转 ===')
  const lastDish = window.store.getDishes().filter(function (d) { return d.name === '免步骤测试菜' })[0]
  check('该菜食材被解析(土豆)', !!lastDish && lastDish.ingredients.some(function (g) { return g.name === '土豆' }))

  console.log('=== 菜谱：删除（自定义确认弹窗，修复原生 confirm 失效）===')
  const recipeTab3 = $all('.tab').find(function (t) { return t.getAttribute('data-tab') === 'recipe' })
  if (recipeTab3) recipeTab3.click()
  const delBefore = window.store.getDishes().length
  // 用刚新增的菜做删除测试（卡片上的删除按钮）
  const targetCard = $all('.recipe-card').find(function (c) { return /免步骤测试菜/.test(c.textContent) })
  check('找到目标菜卡片', !!targetCard)
  const delBtn = targetCard && targetCard.querySelector('.recipe-del')
  check('卡片有删除按钮', !!delBtn)
  if (delBtn) delBtn.click()
  check('点击后弹出自定义确认弹窗', !$('#confirmMask').hidden)
  check('确认弹窗含提示文案', /确定删除/.test($('#confirmMsg').textContent))
  const okBtn = $('#confirmOk')
  check('存在确定按钮', !!okBtn)
  if (okBtn) okBtn.click()
  check('确认后菜谱数 -1', window.store.getDishes().length === delBefore - 1)
  check('确认后弹窗关闭', $('#confirmMask').hidden)
  check('被删菜已不存在', !window.store.getDishes().some(function (d) { return d.name === '免步骤测试菜' }))

  console.log('=== 我的页：自定义主页（改名称/简介）===')
  const profileTab4 = $all('.tab').find(function (t) { return t.getAttribute('data-tab') === 'profile' })
  if (profileTab4) profileTab4.click()
  check('主页 banner 渲染默认名称', /我们的小厨房/.test($('#screen').textContent))
  const editSpaceBtn = $all('[data-action="edit-space"]')[0]
  check('存在编辑主页按钮', !!editSpaceBtn)
  if (editSpaceBtn) editSpaceBtn.click()
  check('编辑资料弹窗含名称输入', !!$('#spName'))
  const spName = $('#spName'), spIntro = $('#spIntro')
  const newName = '我俩的小食堂'
  const newIntro = '今天也要好好吃饭呀'
  if (spName && spIntro) {
    spName.value = newName
    spIntro.value = newIntro
    const saveBtn = $all('[data-action="save-space"]')[0]
    check('存在保存主页按钮', !!saveBtn)
    if (saveBtn) saveBtn.click()
  }
  check('保存后 space.name 更新', window.store.getSpace().name === newName)
  check('保存后主页显示新名称', $('#screen').textContent.indexOf(newName) >= 0)
  check('保存后主页显示新简介', $('#screen').textContent.indexOf(newIntro) >= 0)
  check('保存后侧边栏品牌名同步', $('#brandName').textContent === newName)
  check('保存后弹窗关闭', $('#sheetMask').hidden)

  console.log('')
  console.log('PASS: ' + pass + '  FAIL: ' + fail)
  process.exit(fail ? 1 : 0)
}, 300)
