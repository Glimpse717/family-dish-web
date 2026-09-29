/* 数据层：localStorage 持久化 + 示例种子数据（同步接口，无 Promise 包装）
 * 移植自小程序 mock-data.js + store.js 的业务校验。 */
(function (global) {
  'use strict'

  var util = global.util
  var CONST = global.CONST
  var STORAGE_KEY = 'familyDishDB_v2'

  var db = { dish: [], member: [], order: [], space: seedSpace() }
  var loaded = false

  function step(order, text, image) { return { order: order, text: text, image: image || '' } }

  function seedSpace() {
    return {
      name: '我们的小厨房',
      intro: '在这里一起决定今天吃什么 🍳 想吃什么就点什么～',
      bg: '',
      avatar: '🍽️'
    }
  }

  function seedDishes() {
    var now = Date.now()
    var raw = [
      { _id: 'd_s01', name: '西红柿炒蛋', category: '素菜', cover: '', tags: ['家常', '快手', '下饭'], minutes: 10,
        ingredients: [
          { name: '西红柿', amount: 2, unit: '个' }, { name: '鸡蛋', amount: 3, unit: '个' },
          { name: '葱', amount: 10, unit: 'g' }, { name: '白糖', amount: 5, unit: 'g' },
          { name: '盐', amount: null, unit: '适量' }, { name: '食用油', amount: 15, unit: 'ml' }
        ],
        steps: [ step(1,'西红柿去蒂切滚刀块，鸡蛋打散加一小撮盐搅匀'), step(2,'热锅倒入食用油，油热后倒入蛋液，凝固后盛出备用'), step(3,'底锅下西红柿中火翻炒出汁，加白糖提鲜'), step(4,'倒回鸡蛋翻炒均匀，加盐调味，撒葱花出锅') ],
        note: '鸡蛋先炒后盛出、最后回锅，口感更嫩不出水' },
      { _id: 'd_s02', name: '红烧排骨', category: '荤菜', cover: '', tags: ['家常', '硬菜', '下饭'], minutes: 45,
        ingredients: [
          { name: '排骨', amount: 500, unit: 'g' }, { name: '葱', amount: 1, unit: '根' },
          { name: '姜', amount: 3, unit: '片' }, { name: '蒜', amount: 3, unit: '瓣' },
          { name: '生抽', amount: 2, unit: '勺' }, { name: '老抽', amount: 1, unit: '勺' },
          { name: '冰糖', amount: 10, unit: 'g' }, { name: '料酒', amount: 2, unit: '勺' },
          { name: '八角', amount: 1, unit: '个' }
        ],
        steps: [ step(1,'排骨冷水下锅，加料酒与姜片焯水 3 分钟，撇净血沫后捞出冲洗'), step(2,'锅内放少许油下冰糖，小火炒至琥珀色'), step(3,'倒入排骨翻炒上色，加生抽、老抽、料酒炒匀'), step(4,'加开水没过排骨，放八角与葱段，小火炖 30 分钟'), step(5,'大火收汁至浓稠，尝味补盐，撒葱花出锅') ],
        note: '炒糖色一定要小火，糖糊了会发苦' },
      { _id: 'd_s03', name: '青椒土豆丝', category: '素菜', cover: '', tags: ['快手', '爽脆'], minutes: 15,
        ingredients: [
          { name: '土豆', amount: 2, unit: '个' }, { name: '青椒', amount: 1, unit: '个' },
          { name: '蒜', amount: 3, unit: '瓣' }, { name: '干辣椒', amount: 2, unit: '个' },
          { name: '白醋', amount: 1, unit: '勺' }, { name: '盐', amount: null, unit: '适量' },
          { name: '食用油', amount: 20, unit: 'ml' }
        ],
        steps: [ step(1,'土豆去皮切细丝，清水冲洗两遍去淀粉，泡水备用'), step(2,'青椒去籽切丝，蒜切末，干辣椒剪段'), step(3,'热锅倒油，下蒜末与干辣椒爆香'), step(4,'沥干土豆丝大火快炒 1 分钟，加青椒、盐，出锅前沿锅边淋白醋') ],
        note: '土豆丝冲掉淀粉才脆；白醋最后放，酸味更清爽' },
      { _id: 'd_s04', name: '紫菜蛋花汤', category: '汤羹', cover: '', tags: ['快手', '清淡'], minutes: 8,
        ingredients: [
          { name: '紫菜', amount: 5, unit: 'g' }, { name: '鸡蛋', amount: 1, unit: '个' },
          { name: '葱', amount: 5, unit: 'g' }, { name: '盐', amount: null, unit: '适量' },
          { name: '香油', amount: null, unit: '少许' }
        ],
        steps: [ step(1,'紫菜撕成小块放入大碗底，葱切葱花'), step(2,'锅中水烧开，鸡蛋打散沿筷子缓缓淋入，形成蛋花'), step(3,'冲入碗中，加盐调味，滴几滴香油，撒葱花即可') ],
        note: '蛋液沿筷子细流淋入，蛋花又薄又漂亮' },
      { _id: 'd_s05', name: '蒜蓉西兰花', category: '素菜', cover: '', tags: ['清淡', '快手'], minutes: 12,
        ingredients: [
          { name: '西兰花', amount: 1, unit: '棵' }, { name: '蒜', amount: 5, unit: '瓣' },
          { name: '蚝油', amount: 1, unit: '勺' }, { name: '盐', amount: null, unit: '适量' },
          { name: '食用油', amount: 15, unit: 'ml' }
        ],
        steps: [ step(1,'西兰花掰小朵，淡盐水浸泡 5 分钟后冲洗'), step(2,'水开加几滴油，西兰花焯水 1 分钟捞出过凉'), step(3,'热锅倒油，下蒜末小火炒香'), step(4,'倒入西兰花大火翻炒，加蚝油与盐炒匀出锅') ],
        note: '焯水加油能让西兰花保持翠绿' },
      { _id: 'd_s06', name: '可乐鸡翅', category: '荤菜', cover: '', tags: ['孩子爱', '家常'], minutes: 30,
        ingredients: [
          { name: '鸡翅中', amount: 10, unit: '个' }, { name: '可乐', amount: 330, unit: 'ml' },
          { name: '姜', amount: 3, unit: '片' }, { name: '葱', amount: 1, unit: '根' },
          { name: '生抽', amount: 2, unit: '勺' }, { name: '料酒', amount: 1, unit: '勺' },
          { name: '盐', amount: null, unit: '适量' }
        ],
        steps: [ step(1,'鸡翅两面各划两刀，加料酒与姜片腌 10 分钟'), step(2,'平底锅少油，鸡翅煎至两面金黄'), step(3,'倒入可乐没过鸡翅，加生抽与葱段，大火烧开'), step(4,'转中小火焖 15 分钟，大火收汁至浓亮，尝味补盐') ],
        note: '可乐本身甜，一般不需要额外加糖' },
      { _id: 'd_s07', name: '蛋炒饭', category: '主食', cover: '', tags: ['快手', '剩饭救星'], minutes: 15,
        ingredients: [
          { name: '米饭', amount: 400, unit: 'g' }, { name: '鸡蛋', amount: 2, unit: '个' },
          { name: '葱', amount: 15, unit: 'g' }, { name: '胡萝卜', amount: 50, unit: 'g' },
          { name: '盐', amount: null, unit: '适量' }, { name: '生抽', amount: 1, unit: '勺' },
          { name: '食用油', amount: 20, unit: 'ml' }
        ],
        steps: [ step(1,'隔夜冷饭用手抓散，胡萝卜切小丁，葱切葱花'), step(2,'热锅倒油，倒入蛋液炒散盛出'), step(3,'底锅下胡萝卜丁炒软，倒入米饭大火翻炒至粒粒分明'), step(4,'倒回鸡蛋，加盐与生抽炒匀，最后撒葱花出锅') ],
        note: '一定要用冷饭，热饭容易炒成一坨' },
      { _id: 'd_s08', name: '冬瓜排骨汤', category: '汤羹', cover: '', tags: ['清淡', '滋补'], minutes: 60,
        ingredients: [
          { name: '排骨', amount: 400, unit: 'g' }, { name: '冬瓜', amount: 300, unit: 'g' },
          { name: '姜', amount: 3, unit: '片' }, { name: '葱', amount: 1, unit: '根' },
          { name: '盐', amount: null, unit: '适量' }, { name: '料酒', amount: 1, unit: '勺' }
        ],
        steps: [ step(1,'排骨冷水下锅加料酒焯水，捞出冲洗干净'), step(2,'砂锅加足量清水，放排骨与姜片，大火烧开转小火炖 40 分钟'), step(3,'冬瓜去皮切厚片，下锅再炖 10 分钟'), step(4,'出锅前加盐调味，撒葱花') ],
        note: '盐一定最后放，早放肉容易柴' },
      { _id: 'd_s09', name: '清蒸鲈鱼', category: '荤菜', cover: '', tags: ['清淡', '硬菜'], minutes: 20,
        ingredients: [
          { name: '鲈鱼', amount: 1, unit: '条' }, { name: '葱', amount: 2, unit: '根' },
          { name: '姜', amount: 5, unit: '片' }, { name: '蒸鱼豉油', amount: 3, unit: '勺' },
          { name: '料酒', amount: 1, unit: '勺' }, { name: '食用油', amount: 20, unit: 'ml' },
          { name: '辣椒', amount: 1, unit: '个' }
        ],
        steps: [ step(1,'鲈鱼处理干净，两面划三刀，抹料酒与少许盐腌 8 分钟'), step(2,'盘底垫姜片与葱段，鱼身铺姜片，水开后大火蒸 8 分钟'), step(3,'倒掉盘中腥水，拣去姜葱，重新铺新鲜葱丝与辣椒丝'), step(4,'淋蒸鱼豉油，另起锅烧热油浇在葱丝上激香') ],
        note: '蒸鱼时间按每 500g 约 8 分钟估算，别蒸过头' },
      { _id: 'd_s10', name: '手撕包菜', category: '素菜', cover: '', tags: ['快手', '下饭'], minutes: 10,
        ingredients: [
          { name: '包菜', amount: 300, unit: 'g' }, { name: '蒜', amount: 4, unit: '瓣' },
          { name: '干辣椒', amount: 3, unit: '个' }, { name: '生抽', amount: 1, unit: '勺' },
          { name: '盐', amount: null, unit: '适量' }, { name: '食用油', amount: 20, unit: 'ml' }
        ],
        steps: [ step(1,'包菜用手撕成大片，洗净沥干水分'), step(2,'热锅倒油，下蒜片与干辣椒爆香'), step(3,'倒入包菜大火快炒 2 分钟，加生抽与盐炒匀出锅') ],
        note: '手撕比刀切更入味；一定要大火快炒才脆' },
      { _id: 'd_s11', name: '葱油拌面', category: '主食', cover: '', tags: ['快手', '香'], minutes: 20,
        ingredients: [
          { name: '面条', amount: 200, unit: 'g' }, { name: '葱', amount: 50, unit: 'g' },
          { name: '生抽', amount: 3, unit: '勺' }, { name: '老抽', amount: 1, unit: '勺' },
          { name: '白糖', amount: 5, unit: 'g' }, { name: '食用油', amount: 60, unit: 'ml' }
        ],
        steps: [ step(1,'葱洗净彻底晾干，切成长段，葱白葱绿分开'), step(2,'冷油下葱白，小火慢炸 8 分钟至金黄，再下葱绿炸香后捞出'), step(3,'葱油中加生抽、老抽、白糖，小火煮开成酱汁'), step(4,'面条煮熟过凉水，拌入葱油酱汁与葱酥') ],
        note: '葱一定要晾干再下锅，带水会炸锅' },
      { _id: 'd_s12', name: '银耳莲子羹', category: '甜品', cover: '', tags: ['滋补', '甜'], minutes: 40,
        ingredients: [
          { name: '银耳', amount: 20, unit: 'g' }, { name: '莲子', amount: 30, unit: 'g' },
          { name: '红枣', amount: 6, unit: '个' }, { name: '冰糖', amount: 30, unit: 'g' },
          { name: '枸杞', amount: 5, unit: 'g' }
        ],
        steps: [ step(1,'银耳提前泡发 30 分钟，剪去黄蒂撕成小朵'), step(2,'莲子泡 20 分钟，红枣去核，枸杞洗净'), step(3,'砂锅加水放银耳与莲子，大火烧开转小火炖 25 分钟'), step(4,'加红枣与冰糖再炖 10 分钟，关火前放枸杞') ],
        note: '银耳撕得越碎越容易出胶' }
    ]
    return raw.map(function (dish, index) {
      var ts = now - (raw.length - index) * 1000
      return Object.assign({}, dish, { createdAt: ts, updatedAt: ts })
    })
  }

  function seedMembers() {
    var now = Date.now()
    return [
      { _id: 'm_me', nickname: '我', role: '本人', avatar: '🙋', colorIndex: 0, createdAt: now - 3000 },
      { _id: 'm_partner', nickname: '对象', role: '伴侣', avatar: '💑', colorIndex: 5, createdAt: now - 2000 }
    ]
  }

  function seedOrders() {
    var now = Date.now()
    var today = util.formatDate(now)
    function item(dishId, snapshot, count, status) {
      return { dishId: dishId, dishNameSnapshot: snapshot, count: count, status: status || 'todo', updatedAt: now }
    }
    return [
      { _id: 'o_sample_1', memberId: 'm_me', memberName: '我', mealDate: today, mealType: '午餐', remark: '米饭多蒸一点', status: 'active',
        items: [ item('d_s01','西红柿炒蛋',1,'done'), item('d_s02','红烧排骨',1,'todo'), item('d_s04','紫菜蛋花汤',1,'todo'), item('d_s07','蛋炒饭',2,'todo') ],
        createdAt: now - 60000, updatedAt: now - 60000 },
      { _id: 'o_sample_2', memberId: 'm_partner', memberName: '对象', mealDate: today, mealType: '晚餐', remark: '', status: 'active',
        items: [ item('d_s06','可乐鸡翅',1,'todo'), item('d_s03','青椒土豆丝',1,'todo'), item('d_s07','蛋炒饭',1,'todo') ],
        createdAt: now - 30000, updatedAt: now - 30000 }
    ]
  }

  function load() {
    if (loaded) return
    var rawStr = null
    try { rawStr = localStorage.getItem(STORAGE_KEY) } catch (e) { rawStr = null }
    var valid = false
    var parsed = null
    if (rawStr) {
      try { parsed = JSON.parse(rawStr) } catch (e) { parsed = null }
      valid = parsed && typeof parsed === 'object' && Array.isArray(parsed.dish) && Array.isArray(parsed.member) && Array.isArray(parsed.order)
    }
    if (valid) {
      db = parsed
      if (!db.space) db.space = seedSpace()
    } else {
      db = { dish: seedDishes(), member: seedMembers(), order: seedOrders(), space: seedSpace() }
      save()
    }
    loaded = true
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)) } catch (e) { /* 忽略配额错误 */ }
  }

  function reset() {
    db = { dish: seedDishes(), member: seedMembers(), order: seedOrders(), space: seedSpace() }
    save(); loaded = true
  }

  /* ---------------- 主页空间 ---------------- */
  function getSpace() { return Object.assign({}, db.space) }
  function saveSpace(patch) {
    db.space = Object.assign({}, db.space, patch)
    save(); return db.space
  }

  /* ---------------- 成员 ---------------- */
  function getMembers() {
    return db.member.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0) })
  }
  function getMemberById(id) {
    for (var i = 0; i < db.member.length; i++) if (db.member[i]._id === id) return db.member[i]
    return null
  }
  function addMember(nickname, role, avatar) {
    var now = Date.now()
    var member = {
      _id: util.uid('m'),
      nickname: nickname,
      role: role || '',
      avatar: avatar || '🙂',
      colorIndex: db.member.length % CONST.COLOR_PALETTE.length,
      createdAt: now
    }
    db.member.push(member); save(); return member
  }
  function updateMember(id, patch) {
    for (var i = 0; i < db.member.length; i++) {
      if (db.member[i]._id === id) {
        var next = Object.assign({}, db.member[i], patch)
        next._id = db.member[i]._id; next.createdAt = db.member[i].createdAt
        db.member[i] = next; save(); return next
      }
    }
    return null
  }
  function removeMember(id) {
    var before = db.member.length
    db.member = db.member.filter(function (m) { return m._id !== id })
    // 同步删除该成员订单
    db.order = db.order.filter(function (o) { return o.memberId !== id })
    save(); return db.member.length < before
  }

  /* ---------------- 菜品 ---------------- */
  function getDishes() {
    return db.dish.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0) })
  }
  function getDishById(id) {
    for (var i = 0; i < db.dish.length; i++) if (db.dish[i]._id === id) return db.dish[i]
    return null
  }
  function dishExists(name) {
    var n = util.normalizeText(name)
    return db.dish.some(function (d) { return util.normalizeText(d.name) === n })
  }
  function addDish(input) {
    var now = Date.now()
    var dish = Object.assign({}, input, { _id: util.uid('d'), createdAt: now, updatedAt: now })
    db.dish.push(dish); save(); return dish
  }
  function updateDish(id, patch) {
    for (var i = 0; i < db.dish.length; i++) {
      if (db.dish[i]._id === id) {
        var next = Object.assign({}, db.dish[i], patch)
        next._id = db.dish[i]._id; next.createdAt = db.dish[i].createdAt
        db.dish[i] = next; save(); return next
      }
    }
    return null
  }
  function removeDish(id) {
    var before = db.dish.length
    db.dish = db.dish.filter(function (d) { return d._id !== id })
    save(); return db.dish.length < before
  }

  /* ---------------- 订单 ---------------- */
  function getOrders(filter) {
    var opt = filter || {}
    var mealDate = opt.mealDate || ''
    var mealType = opt.mealType || ''
    var memberId = opt.memberId || ''
    var list = db.order.filter(function (order) {
      if (mealDate && order.mealDate !== mealDate) return false
      if (mealType && mealType !== '全部' && order.mealType !== mealType) return false
      if (memberId && order.memberId !== memberId) return false
      if (order.status === 'canceled') return false
      return true
    })
    return list.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0) })
  }
  function addOrder(order) {
    var now = Date.now()
    var o = Object.assign({}, order, { _id: util.uid('o'), status: 'active', createdAt: now, updatedAt: now })
    db.order.push(o); save(); return o
  }
  function updateOrderItemStatus(orderId, dishId, status) {
    for (var i = 0; i < db.order.length; i++) {
      if (db.order[i]._id === orderId) {
        var items = db.order[i].items
        for (var j = 0; j < items.length; j++) {
          if (items[j].dishId === dishId) items[j].status = status
        }
        db.order[i].updatedAt = Date.now(); save(); return true
      }
    }
    return false
  }
  function removeOrder(id) {
    var before = db.order.length
    db.order = db.order.filter(function (o) { return o._id !== id })
    save(); return db.order.length < before
  }

  global.store = {
    load: load, save: save, reset: reset,
    getSpace: getSpace, saveSpace: saveSpace,
    getMembers: getMembers, getMemberById: getMemberById, addMember: addMember, updateMember: updateMember, removeMember: removeMember,
    getDishes: getDishes, getDishById: getDishById, dishExists: dishExists, addDish: addDish, updateDish: updateDish, removeDish: removeDish,
    getOrders: getOrders, addOrder: addOrder, updateOrderItemStatus: updateOrderItemStatus, removeOrder: removeOrder
  }
})(window)
