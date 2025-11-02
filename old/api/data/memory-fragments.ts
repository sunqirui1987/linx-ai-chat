import type { MemoryFragmentData } from '../types/models.js'

/**
 * 记忆片段数据 - 根据游戏策划案设计
 * 总共20个片段，分为5类（A-E类，每类4个）
 */
export const memoryFragments: MemoryFragmentData[] = [
  // A类 - 善恶起源 (4个片段)
  {
    id: 1,
    fragment_id: 'A1',
    category: 'A',
    title: '第一次道德选择',
    content: '那一刻，你面临了人生第一个真正的选择...',
    description: '每个人都会遇到第一次真正考验内心的时刻，那是善恶意识觉醒的开始。',
    unlock_conditions: {
      conversation_count: 5,
      choice_count: 1
    },
    rarity: 'common',
    order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    fragment_id: 'A2',
    category: 'A',
    title: '内心声音的觉醒',
    content: '两个声音开始在你心中争论不休...',
    description: '当内心的天使与恶魔开始对话，这标志着自我意识的深度觉醒。',
    unlock_conditions: {
      conversation_count: 10,
      demon_affinity: 20,
      angel_affinity: 20
    },
    rarity: 'common',
    order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    fragment_id: 'A3',
    category: 'A',
    title: '善恶的第一次交锋',
    content: '光明与黑暗在你灵魂深处展开了战斗...',
    description: '善恶力量的首次正面冲突，决定了你未来道路的基调。',
    unlock_conditions: {
      conversation_count: 15,
      choice_count: 5
    },
    rarity: 'rare',
    order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    fragment_id: 'A4',
    category: 'A',
    title: '平衡的重要性',
    content: '你开始明白，善恶并非绝对对立...',
    description: '真正的智慧在于理解善恶的相对性和平衡的重要性。',
    unlock_conditions: {
      conversation_count: 20,
      demon_affinity: 30,
      angel_affinity: 30
    },
    rarity: 'rare',
    order: 4,
    created_at: new Date().toISOString()
  },

  // B类 - 诱惑与抗争 (4个片段)
  {
    id: 5,
    fragment_id: 'B1',
    category: 'B',
    title: '第一次诱惑',
    content: '那个禁忌的想法如此诱人...',
    description: '面对第一次真正的诱惑，内心的挣扎开始显现。',
    unlock_conditions: {
      demon_affinity: 40,
      corruption_value: 30
    },
    rarity: 'common',
    order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 6,
    fragment_id: 'B2',
    category: 'B',
    title: '道德的挣扎',
    content: '你知道什么是对的，但欲望如此强烈...',
    description: '理智与欲望的激烈冲突，考验着内心的坚定。',
    unlock_conditions: {
      demon_affinity: 50,
      angel_affinity: 30,
      choice_count: 10
    },
    rarity: 'rare',
    order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 7,
    fragment_id: 'B3',
    category: 'B',
    title: '堕落的边缘',
    content: '一步之遥，你几乎跨越了那条线...',
    description: '站在道德的悬崖边，一个选择就能决定堕落或救赎。',
    unlock_conditions: {
      corruption_value: 70,
      demon_choices: 8
    },
    rarity: 'epic',
    order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 8,
    fragment_id: 'B4',
    category: 'B',
    title: '抵抗的力量',
    content: '内心的光明拯救了即将堕落的你...',
    description: '在最黑暗的时刻，内心的光明展现出强大的抵抗力量。',
    unlock_conditions: {
      corruption_value: 60,
      angel_affinity: 50,
      specific_choices: ['resist_temptation']
    },
    rarity: 'epic',
    order: 4,
    created_at: new Date().toISOString()
  },

  // C类 - 救赎与成长 (4个片段)
  {
    id: 9,
    fragment_id: 'C1',
    category: 'C',
    title: '忏悔的力量',
    content: '承认错误需要巨大的勇气...',
    description: '真正的勇气不是无所畏惧，而是敢于面对自己的错误。',
    unlock_conditions: {
      angel_affinity: 40,
      purity_value: 30
    },
    rarity: 'common',
    order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 10,
    fragment_id: 'C2',
    category: 'C',
    title: '宽恕的温暖',
    content: '原谅自己比原谅他人更难...',
    description: '学会宽恕自己，是内心治愈的第一步。',
    unlock_conditions: {
      angel_affinity: 60,
      purity_value: 50,
      angel_choices: 8
    },
    rarity: 'rare',
    order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 11,
    fragment_id: 'C3',
    category: 'C',
    title: '重新开始',
    content: '每一天都是重新选择的机会...',
    description: '真正的救赎在于相信自己有重新开始的能力。',
    unlock_conditions: {
      conversation_count: 50,
      purity_value: 60,
      time_played: 120
    },
    rarity: 'epic',
    order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 12,
    fragment_id: 'C4',
    category: 'C',
    title: '内心的平静',
    content: '你找到了善恶之间的平衡点...',
    description: '真正的平静来自于接受内心的复杂性和矛盾性。',
    unlock_conditions: {
      demon_affinity: 50,
      angel_affinity: 50,
      corruption_value: 40,
      purity_value: 40
    },
    rarity: 'epic',
    order: 4,
    created_at: new Date().toISOString()
  },

  // D类 - 智慧与理解 (4个片段)
  {
    id: 13,
    fragment_id: 'D1',
    category: 'D',
    title: '善恶的真相',
    content: '你开始理解善恶的真正含义...',
    description: '善恶不是绝对的标准，而是相对的选择和理解。',
    unlock_conditions: {
      conversation_count: 30,
      choice_count: 20
    },
    rarity: 'rare',
    order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 14,
    fragment_id: 'D2',
    category: 'D',
    title: '人性的复杂',
    content: '人性从来不是非黑即白的...',
    description: '理解人性的复杂性，是获得真正智慧的开始。',
    unlock_conditions: {
      demon_affinity: 40,
      angel_affinity: 40,
      conversation_count: 40
    },
    rarity: 'rare',
    order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 15,
    fragment_id: 'D3',
    category: 'D',
    title: '选择的重量',
    content: '每个选择都塑造着你的灵魂...',
    description: '意识到每个选择的重要性，是成熟的标志。',
    unlock_conditions: {
      choice_count: 30,
      time_played: 180
    },
    rarity: 'epic',
    order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 16,
    fragment_id: 'D4',
    category: 'D',
    title: '内心的声音',
    content: '学会倾听内心最真实的声音...',
    description: '真正的智慧在于能够分辨内心各种声音的真实意图。',
    unlock_conditions: {
      conversation_count: 60,
      demon_affinity: 60,
      angel_affinity: 60
    },
    rarity: 'legendary',
    order: 4,
    created_at: new Date().toISOString()
  },

  // E类 - 超越与升华 (4个片段)
  {
    id: 17,
    fragment_id: 'E1',
    category: 'E',
    title: '超越善恶',
    content: '真正的智慧在于超越善恶的对立...',
    description: '当你不再被善恶的对立所束缚，真正的自由才开始。',
    unlock_conditions: {
      conversation_count: 80,
      demon_affinity: 70,
      angel_affinity: 70,
      choice_count: 40
    },
    rarity: 'legendary',
    order: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 18,
    fragment_id: 'E2',
    category: 'E',
    title: '内心的和谐',
    content: '恶魔与天使终于学会了共存...',
    description: '真正的和谐不是消除冲突，而是学会与冲突共存。',
    unlock_conditions: {
      demon_affinity: 80,
      angel_affinity: 80,
      corruption_value: 50,
      purity_value: 50,
      time_played: 300
    },
    rarity: 'legendary',
    order: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 19,
    fragment_id: 'E3',
    category: 'E',
    title: '完整的自我',
    content: '接受自己的光明与黑暗...',
    description: '完整的自我包含了所有的可能性，光明与黑暗并存。',
    unlock_conditions: {
      conversation_count: 100,
      choice_count: 50,
      time_played: 360
    },
    rarity: 'legendary',
    order: 3,
    created_at: new Date().toISOString()
  },
  {
    id: 20,
    fragment_id: 'E4',
    category: 'E',
    title: '永恒的选择',
    content: '每一刻都是重新定义自己的机会...',
    description: '生命的意义在于不断的选择和重新定义自己的过程。',
    unlock_conditions: {
      conversation_count: 120,
      demon_affinity: 90,
      angel_affinity: 90,
      choice_count: 60,
      time_played: 480
    },
    rarity: 'legendary',
    order: 4,
    created_at: new Date().toISOString()
  }
]

/**
 * 分类信息
 */
export const categoryInfo = {
  A: { name: '善恶起源', description: '探索善恶意识的觉醒过程' },
  B: { name: '诱惑与抗争', description: '面对诱惑时的内心挣扎' },
  C: { name: '救赎与成长', description: '通过忏悔和宽恕获得成长' },
  D: { name: '智慧与理解', description: '对人性和道德的深度理解' },
  E: { name: '超越与升华', description: '超越善恶对立的终极智慧' }
}

/**
 * 稀有度信息
 */
export const rarityInfo = {
  common: { name: '普通', color: '#9CA3AF', weight: 1 },
  rare: { name: '稀有', color: '#3B82F6', weight: 2 },
  epic: { name: '史诗', color: '#8B5CF6', weight: 3 },
  legendary: { name: '传说', color: '#F59E0B', weight: 4 }
}