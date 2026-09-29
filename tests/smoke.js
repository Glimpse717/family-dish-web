/* 网页版逻辑冒烟测试：在 node 下用 stub 跑通 util/constants/merge/csv/store */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

// 构造浏览器环境 stub
const storeBox = new Map()
const sandbox = {}
sandbox.window = sandbox
sandbox.localStorage = {
  getItem: (k) => (storeBox.has(k) ? storeBox.get(k) : null),
  setItem: (k, v) => storeBox.set(k, String(v)),
  removeItem: (k) => storeBox.delete(k)
}
sandbox.navigator = {}
sandbox.console = console
sandbox.Date = Date
sandbox.Math = Math
sandbox.JSON = JSON
sandbox.Map = Map
sandbox.Object = Object
sandbox.Array = Array
sandbox.String = String
sandbox.Number = Number
sandbox.isFinite = isFinite
sandbox.parseInt = parseInt
sandbox.parseFloat = parseFloat
sandbox.setTimeout = setTimeout
sandbox.clearTimeout = clearTimeout
sandbox.requestAnimationFrame = () => {}
sandbox.document = { getElementById: () => null, addEventListener: () => {}, createElement: () => ({ style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false} }, appendChild(){}, remove(){} }), querySelectorAll: () => [], body: { appendChild(){} } }

vm.createContext(sandbox)

const base = path.join(__dirname, '..', 'js')
;['util.js', 'constants.js', 'merge.js', 'csv.js', 'store.js'].forEach(function (f) {
  const code = fs.readFileSync(path.join(base, f), 'utf8')
  vm.runInContext(code, sandbox, { filename: f })
})

const store = sandbox.store
const mergeLib = sandbox.mergeLib
const csvLib = sandbox.csvLib
const util = sandbox.util

store.load()
let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name) }
  else { fail++; console.log('  ✗ ' + name) }
}

console.log('— 种子数据 —')
const dishes = store.getDishes()
const members = store.getMembers()
const orders = store.getOrders({})
check('菜品数 ≥ 12', dishes.length >= 12)
check('成员数 = 3', members.length === 3)
check('订单数 = 2', orders.length === 2)
check('订单 mealDate = 今天', orders.every((o) => o.mealDate === util.formatDate(Date.now())))

console.log('— B4 单位换算（ml↔L / g↔kg）—')
function mergeTwo(name1, amt1, unit1, cnt1, name2, amt2, unit2, cnt2) {
  const d1 = { _id: 'x1', name: 'X1', ingredients: [{ name: name1, amount: amt1, unit: unit1 }] }
  const d2 = { _id: 'x2', name: 'X2', ingredients: [{ name: name2, amount: amt2, unit: unit2 }] }
  const map = { x1: d1, x2: d2 }
  const rows = [
    { dishId: 'x1', dishName: 'X1', totalCount: cnt1 },
    { dishId: 'x2', dishName: 'X2', totalCount: cnt2 }
  ]
  return mergeLib.mergeIngredients(rows, map)
}
let r = mergeTwo('水', 250, 'ml', 1, '水', 1, 'L', 2)
check('250ml + 1L×2 = 2250ml', r.main[0] && r.main[0].displayText === '2250ml')
r = mergeTwo('米', 500, 'g', 1, '米', 0.5, 'kg', 1)
check('500g + 0.5kg = 1000g', r.main[0] && r.main[0].displayText === '1000g')
r = mergeTwo('盐', null, '适量', 1, '盐', 2, 'g', 2)
check('盐 适量 + 盐 2g×2 → 4g；适量', r.seasoning[0] && r.seasoning[0].displayText === '4g；适量')

console.log('— CSV 模糊用量（盐 适量 真实 bug 修复）—')
const ings = csvLib.splitIngredients('盐 适量；西红柿 2个；葱 10g')
check('盐 适量 解析为 name=盐 amount=null', ings[0].name === '盐' && ings[0].amount === null)
check('西红柿 2个 解析正确', ings[1].name === '西红柿' && ings[1].amount === 2 && ings[1].unit === '个')

console.log('— 做饭页聚合（今日午餐）—')
const lunch = store.getOrders({ mealDate: util.formatDate(Date.now()), mealType: '午餐' })
let totalCnt = 0
lunch.forEach((o) => o.items.forEach((it) => totalCnt += it.count))
const dmap = {}
store.getDishes().forEach((d) => (dmap[d._id] = d))
const agg = {}
lunch.forEach((o) => o.items.forEach((it) => { agg[it.dishId] = (agg[it.dishId] || 0) + it.count }))
const rows = Object.keys(agg).map((k) => ({ dishId: k, dishName: dmap[k] ? dmap[k].name : '?', totalCount: agg[k] }))
const merged = mergeLib.mergeIngredients(rows, dmap)
check('聚合出食材清单（含主食材）', merged.main.length > 0)
console.log('    主食材样例: ' + merged.main.slice(0, 4).map((m) => m.name + ' ' + m.displayText).join('，'))

console.log('— 下单 / 新增菜谱 —')
const before = store.getOrders({}).length
store.addOrder({ memberId: 'm_xiaoming', memberName: '小明', mealDate: util.formatDate(Date.now()), mealType: '晚餐', remark: '', items: [{ dishId: 'd_s10', dishNameSnapshot: '手撕包菜', count: 1, status: 'todo', updatedAt: Date.now() }] })
check('新增订单后订单 +1', store.getOrders({}).length === before + 1)
const dBefore = store.getDishes().length
store.addDish({ name: '测试菜', category: '素菜', cover: '', tags: ['测试'], minutes: 5, ingredients: [{ name: '蛋', amount: 1, unit: '个' }], steps: [{ text: '炒', image: '' }], note: '' })
check('新增菜谱后 +1', store.getDishes().length === dBefore + 1)

console.log('\n结果：PASS ' + pass + ' / FAIL ' + fail)
process.exit(fail ? 1 : 0)
