import { defineStore } from 'pinia'
import { memoryFragments, memoryUnlockManager } from '@/data/memory-fragments'

export interface MemoryFragment {
  id: string
  title: string
  content: string
  category: string
  rarity: 'common' | 'rare' | 'legendary'
  is_unlocked: boolean
  unlocked_at?: Date | null
  unlock_condition?: string
  unlockConditions?: UnlockCondition
  emotionalValue: number
  tags: string[]
  isUnlocked?: boolean
  unlockedAt?: Date | null
}

export interface UnlockCondition {
  type: 'conversation_count' | 'emotion' | 'keyword' | 'time_based' | 'personality_switch' | 'time_gap' | 'complex'
  value: any
  threshold?: number
  description?: string
  conditions?: UnlockCondition[]
}

export const useMemoryStore = defineStore('memory', {
  state: () => ({
    fragments: [...memoryFragments] as MemoryFragment[],
    isLoading: false,
    unlockHistory: [] as Array<{
      memoryId: string
      unlockedAt: Date
      trigger: string
      fragment?: MemoryFragment
    }>
  }),

  getters: {
    unlockedFragments: (state) => state.fragments.filter(f => f.is_unlocked),
    lockedFragments: (state) => state.fragments.filter(f => !f.is_unlocked),
    unlockedCount: (state) => state.fragments.filter(f => f.is_unlocked).length,
    totalCount: (state) => state.fragments.length,
    progressPercentage: (state) => {
      if (state.fragments.length === 0) return 0
      return Math.round((state.fragments.filter(f => f.is_unlocked).length / state.fragments.length) * 100)
    },
    fragmentsByCategory: (state) => {
      const grouped: { [key: string]: MemoryFragment[] } = {}
      state.fragments.forEach(fragment => {
        if (!grouped[fragment.category]) {
          grouped[fragment.category] = []
        }
        grouped[fragment.category].push(fragment)
      })
      return grouped
    },
    fragmentsByRarity: (state) => {
      const grouped: { [key: string]: MemoryFragment[] } = {}
      state.fragments.forEach(fragment => {
        if (!grouped[fragment.rarity]) {
          grouped[fragment.rarity] = []
        }
        grouped[fragment.rarity].push(fragment)
      })
      return grouped
    },
    recentlyUnlocked: (state) => {
      return state.fragments
        .filter(f => f.is_unlocked && f.unlocked_at)
        .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
        .slice(0, 5)
    },
    categoryProgress: (state) => {
      const categories = ['childhood', 'friendship', 'growth', 'dreams', 'secrets']
      const progress: { [key: string]: { total: number; unlocked: number; percentage: number } } = {}
      
      categories.forEach(category => {
        const categoryFragments = state.fragments.filter(f => f.category === category)
        const unlockedInCategory = categoryFragments.filter(f => f.is_unlocked).length
        progress[category] = {
          total: categoryFragments.length,
          unlocked: unlockedInCategory,
          percentage: categoryFragments.length > 0 ? Math.round((unlockedInCategory / categoryFragments.length) * 100) : 0
        }
      })
      
      return progress
    },
    rarityStats: (state) => {
      const rarities = ['common', 'rare', 'epic', 'legendary']
      const stats: { [key: string]: { total: number; unlocked: number; percentage: number } } = {}
      
      rarities.forEach(rarity => {
        const rarityFragments = state.fragments.filter(f => f.rarity === rarity)
        const unlockedInRarity = rarityFragments.filter(f => f.is_unlocked).length
        stats[rarity] = {
          total: rarityFragments.length,
          unlocked: unlockedInRarity,
          percentage: rarityFragments.length > 0 ? Math.round((unlockedInRarity / rarityFragments.length) * 100) : 0
        }
      })
      
      return stats
    }
  },

  actions: {
    async loadMemoryFragments() {
      this.isLoading = true
      try {
        // 从本地存储加载记忆状态
        const savedData = localStorage.getItem('memory_fragments')
        if (savedData) {
          const parsed = JSON.parse(savedData)
          // 合并保存的解锁状态
          this.fragments.forEach(fragment => {
            const saved = parsed.find((p: MemoryFragment) => p.id === fragment.id)
            if (saved) {
              fragment.is_unlocked = saved.is_unlocked
              fragment.unlocked_at = saved.unlocked_at
            }
          })
        }
        
        // 加载解锁历史
        const savedHistory = localStorage.getItem('memory_unlock_history')
        if (savedHistory) {
          this.unlockHistory = JSON.parse(savedHistory)
        }
        
        // 更新内存管理器的状态
        memoryUnlockManager.importMemoryData(JSON.stringify({
          fragments: this.fragments,
          unlockHistory: this.unlockHistory
        }))
      } catch (error) {
        console.error('Failed to load memory fragments:', error)
      } finally {
        this.isLoading = false
      }
    },

    async refreshMemoryFragments() {
      await this.loadMemoryFragments()
    },

    getFragmentById(id: string): MemoryFragment | undefined {
      return this.fragments.find(f => f.id === id)
    },

    getFragmentsByCondition(condition: (fragment: MemoryFragment) => boolean): MemoryFragment[] {
      return this.fragments.filter(condition)
    },

    async checkUnlockConditions(userMessage: string, emotion?: any, conversationCount: number = 0) {
      // 使用记忆解锁管理器检查解锁条件
      const newlyUnlocked = memoryUnlockManager.checkUnlockConditions(
        userMessage,
        emotion,
        conversationCount,
        0, // personalitySwitchCount
        new Date()
      )
      
      if (newlyUnlocked.length > 0) {
        // 更新本地状态
        newlyUnlocked.forEach(unlockedFragment => {
          const localFragment = this.fragments.find(f => f.id === unlockedFragment.id)
          if (localFragment) {
            localFragment.is_unlocked = true
            localFragment.unlocked_at = unlockedFragment.unlockedAt
          }
        })
        
        // 更新解锁历史
        const newHistory = memoryUnlockManager.getUnlockHistory()
        this.unlockHistory = newHistory.map(h => ({
          memoryId: h.fragmentId,
          unlockedAt: h.unlockedAt,
          trigger: h.trigger
        }))
        
        // 保存到本地存储
        this.saveMemoryState()
      }
      
      return newlyUnlocked
    },

    shouldUnlockFragment(fragment: MemoryFragment, userMessage: string, emotion?: any): boolean {
      // 使用记忆解锁管理器的逻辑
      return memoryUnlockManager.checkUnlockConditions(userMessage, emotion, 0).some(f => f.id === fragment.id)
    },

    async unlockFragment(id: string) {
      // 手动解锁逻辑
      const fragment = this.getFragmentById(id)
      if (fragment && !fragment.is_unlocked) {
        fragment.is_unlocked = true
        fragment.unlocked_at = new Date()
        this.saveMemoryState()
        return true
      }
      return false
    },

    searchFragments(query: string): MemoryFragment[] {
      const lowercaseQuery = query.toLowerCase()
      return this.fragments.filter(fragment => 
        fragment.title.toLowerCase().includes(lowercaseQuery) ||
        fragment.content.toLowerCase().includes(lowercaseQuery) ||
        fragment.category.toLowerCase().includes(lowercaseQuery)
      )
    },

    getUnlockHint(id: string): string {
      const fragment = this.getFragmentById(id)
      if (!fragment || fragment.is_unlocked) return ''
      
      const condition = fragment.unlock_condition
      
      switch (condition.type) {
        case 'keyword':
          return `尝试提到：${condition.keywords?.join('、') || '相关话题'}`
        
        case 'emotion':
          const emotionNames: { [key: string]: string } = {
            sadness: '悲伤',
            happiness: '快乐',
            anger: '愤怒',
            fear: '恐惧',
            surprise: '惊讶',
            disgust: '厌恶',
            disappointment: '失望',
            regret: '后悔'
          }
          return `当你感到${emotionNames[condition.emotion || ''] || condition.emotion}时可能会解锁`
        
        case 'conversation_count':
          return `继续聊天，达到${condition.conversation_count}轮对话后解锁`
        
        case 'time':
          const timeNames: { [key: string]: string } = {
            night: '深夜',
            morning: '早晨',
            afternoon: '下午',
            evening: '傍晚'
          }
          return `在${timeNames[condition.time_condition || ''] || condition.time_condition}时聊天可能会解锁`
        
        case 'special':
          return '在特殊的对话情境下可能会解锁'
        
        default:
          return '继续聊天可能会解锁这个记忆'
      }
    },

    // 获取记忆统计信息
    getMemoryStats() {
      return {
        totalFragments: this.fragments.length,
        unlockedCount: this.unlockedCount,
        unlockedByRarity: this.rarityStats,
        recentUnlocks: this.recentlyUnlocked,
        unlockProgress: this.progressPercentage / 100
      }
    },

    // 获取解锁历史
    getUnlockHistory() {
      return this.unlockHistory
    },

    // 按类别获取记忆
    getMemoriesByCategory(category: string) {
      return this.fragments.filter(f => f.category === category)
    },

    // 按稀有度获取记忆
    getMemoriesByRarity(rarity: string) {
      return this.fragments.filter(f => f.rarity === rarity)
    },

    // 获取最近解锁的记忆
    getRecentlyUnlockedMemories(limit: number = 5) {
      return this.recentlyUnlocked.slice(0, limit)
    },

    // 保存记忆状态到本地存储
    saveMemoryState() {
      try {
        localStorage.setItem('memory_fragments', JSON.stringify(this.fragments))
        localStorage.setItem('memory_unlock_history', JSON.stringify(this.unlockHistory))
      } catch (error) {
        console.error('Failed to save memory state:', error)
      }
    },

    // 重置所有记忆（用于测试）
    resetAllMemories() {
      memoryUnlockManager.resetAllMemories()
      this.fragments.forEach(fragment => {
        fragment.is_unlocked = false
        fragment.unlocked_at = undefined
      })
      // 保持第一个记忆解锁
      if (this.fragments.length > 0) {
        this.fragments[this.fragments.length - 1].is_unlocked = true
        this.fragments[this.fragments.length - 1].unlocked_at = new Date()
      }
      this.unlockHistory = []
      this.saveMemoryState()
    },

    // 导出记忆数据
    exportMemoryData(): string {
      return JSON.stringify({
        fragments: this.fragments,
        unlockHistory: this.unlockHistory,
        exportedAt: new Date().toISOString()
      }, null, 2)
    },

    // 导入记忆数据
    importMemoryData(data: string): boolean {
      try {
        const parsed = JSON.parse(data)
        if (parsed.fragments && Array.isArray(parsed.fragments)) {
          this.fragments = parsed.fragments
          this.unlockHistory = parsed.unlockHistory || []
          this.saveMemoryState()
          return true
        }
        return false
      } catch (error) {
        console.error('Failed to import memory data:', error)
        return false
      }
    },

    clearData() {
      this.fragments = [...memoryFragments]
      this.unlockHistory = []
      localStorage.removeItem('memory_fragments')
      localStorage.removeItem('memory_unlock_history')
    }
  }
})