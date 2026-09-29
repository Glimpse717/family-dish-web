/* 全局枚举与常量（全局 window.CONST） */
(function (global) {
  'use strict'

  var CATEGORY_LIST = [
    { value: '荤菜', color: '#FFECE3', emoji: '🍖' },
    { value: '素菜', color: '#E6F6E6', emoji: '🥬' },
    { value: '汤羹', color: '#E7F0FF', emoji: '🍲' },
    { value: '主食', color: '#FFF3D6', emoji: '🍚' },
    { value: '凉菜', color: '#F0E9FF', emoji: '🥗' },
    { value: '甜品', color: '#FFE8F0', emoji: '🍮' },
    { value: '其他', color: '#EFEFEF', emoji: '🍽' }
  ]

  var CATEGORY_ALL = '全部'
  var CATEGORY_DEFAULT = '其他'

  var MEAL_TYPES = [
    { value: '午餐', short: '午' },
    { value: '晚餐', short: '晚' }
  ]
  var MEAL_ALL = '全部'

  var STATUS = { TODO: 'todo', DONE: 'done' }
  var ORDER_STATUS = { ACTIVE: 'active', CANCELED: 'canceled' }

  var UNIT_GROUPS = [
    { label: '重量', units: ['g', 'kg'] },
    { label: '容量', units: ['ml', 'L'] },
    { label: '计数', units: ['个', '根', '瓣', '片', '只', '块', '把', '棵', '张', '条'] },
    { label: '勺量', units: ['勺', '小勺', '大勺', '茶匙', '汤匙'] },
    { label: '少量', units: ['少许', '适量'] }
  ]

  var UNIT_OPTIONS = [
    'g', 'kg', 'ml', 'L',
    '个', '根', '瓣', '片', '只', '块', '把', '棵', '张', '条',
    '勺', '小勺', '大勺', '茶匙', '汤匙',
    '少许', '适量'
  ]

  var UNIT_BASE = { g: 'g', kg: 'g', ml: 'ml', l: 'ml' }
  var UNIT_CONVERT = { kg: { g: 1000 }, l: { ml: 1000 } }
  var VAGUE_UNITS = ['少许', '适量']

  var SEASONING_KEYWORDS = [
    '盐', '糖', '油', '醋', '酱油', '生抽', '老抽', '料酒', '蚝油',
    '淀粉', '生粉', '胡椒', '花椒', '八角', '桂皮', '香叶', '孜然',
    '豆瓣', '鸡精', '味精', '香油', '芝麻油', '番茄酱', '沙拉',
    '咖喱', '蜂蜜', '碱', '泡打粉'
  ]

  var COLOR_PALETTE = [
    '#FF7A45', '#FFA53D', '#3D8BFF', '#22B8A6',
    '#8B5CF6', '#FF6B9D', '#52A943', '#5C6BC4'
  ]

  var MSG = {
    ORDER_OK: '已下单，做饭的人看到啦',
    ORDER_FAIL: '下单失败，请重试',
    NEED_MEMBER: '先选一下你是谁',
    CART_EMPTY: '购物车还是空的',
    SAVED: '已保存',
    DELETED: '已删除',
    IMPORT_OK: '已导入 N 道菜',
    IMPORT_NONE: '没有可导入的数据',
    RESET_OK: '已恢复示例数据',
    ALL_DONE: '全部做完啦，开饭！',
    NAME_EMPTY: '菜名不能为空',
    NEED_INGREDIENT: '至少填写 1 个食材',
    NEED_STEP: '至少填写 1 个步骤',
    DISH_NOT_FOUND: '菜谱不存在或已被删除',
    NICKNAME_EMPTY: '请填写昵称',
    COUNT_LIMIT: '单道菜最多 20 份'
  }

  var CSV_HEADERS = ['菜名', '分类', '口味标签', '预估耗时_分钟', '封面图链接', '食材', '步骤', '备注']

  var EMPTY_TYPES = ['no-order', 'no-dish', 'no-search', 'no-import', 'no-member']
  var EMPTY_TEXT = {
    'no-order': { emoji: '🍚', text: '今天还没有人点菜', subText: '去「点菜」页点一道吧', btnText: '去点菜' },
    'no-dish': { emoji: '📖', text: '还没有菜谱', subText: '新增或批量导入都能加菜', btnText: '新增菜谱' },
    'no-search': { emoji: '🔍', text: '没找到相关菜品', subText: '换个关键词试试', btnText: '' },
    'no-import': { emoji: '📄', text: '还没有选择文件', subText: '先复制模板，再选择 CSV 文件', btnText: '复制模板' },
    'no-member': { emoji: '👨‍👩‍👧', text: '还没有家庭成员', subText: '添加后就能开始点菜了', btnText: '添加成员' }
  }

  function getCategory(value) {
    for (var i = 0; i < CATEGORY_LIST.length; i++) {
      if (CATEGORY_LIST[i].value === value) return CATEGORY_LIST[i]
    }
    return { value: CATEGORY_DEFAULT, color: '#EFEFEF', emoji: '🍽' }
  }

  function mealShort(value) {
    for (var i = 0; i < MEAL_TYPES.length; i++) {
      if (MEAL_TYPES[i].value === value) return MEAL_TYPES[i].short
    }
    return value || ''
  }

  function isMealType(value) {
    return MEAL_TYPES.some(function (item) { return item.value === value })
  }

  global.CONST = {
    CATEGORY_LIST: CATEGORY_LIST,
    CATEGORY_ALL: CATEGORY_ALL,
    CATEGORY_DEFAULT: CATEGORY_DEFAULT,
    MEAL_TYPES: MEAL_TYPES,
    MEAL_ALL: MEAL_ALL,
    STATUS: STATUS,
    ORDER_STATUS: ORDER_STATUS,
    UNIT_GROUPS: UNIT_GROUPS,
    UNIT_OPTIONS: UNIT_OPTIONS,
    UNIT_BASE: UNIT_BASE,
    UNIT_CONVERT: UNIT_CONVERT,
    VAGUE_UNITS: VAGUE_UNITS,
    SEASONING_KEYWORDS: SEASONING_KEYWORDS,
    COLOR_PALETTE: COLOR_PALETTE,
    MSG: MSG,
    CSV_HEADERS: CSV_HEADERS,
    EMPTY_TYPES: EMPTY_TYPES,
    EMPTY_TEXT: EMPTY_TEXT,
    DISH_MISSING_TEXT: '菜谱已删除',
    getCategory: getCategory,
    mealShort: mealShort,
    isMealType: isMealType
  }
})(window)
