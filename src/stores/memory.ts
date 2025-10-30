import { defineStore } from 'pinia'
import { apiClient } from '@/utils/api'

export interface MemoryFragment {
  id: number | string  // 支持后端的number id和前端的string id
  fragment_id?: string  // 后端使用的唯一标识符
  user_id?: number
  title: string
  content: string
  category: 'A' | 'B' | 'C' | 'D' | 'E'  // 与后端保持一致
  description?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'  // 添加epic级别
  is_unlocked: boolean
  unlocked_at?: string | Date | null
  unlock_condition?: string
  unlock_conditions?: {
    conversation_count?: number
    demon_affinity?: number
    angel_affinity?: number
    corruption_value?: number
    purity_value?: number
    choice_count?: number
    demon_choices?: number
    angel_choices?: number
    specific_choices?: string[]
    time_played?: number
  }
  fragment_order?: number
  created_at?: string
  // 前端特有字段
  unlockConditions?: UnlockCondition
  emotionalValue?: number
  tags?: string[]
  isUnlocked?: boolean  // 兼容性字段
  unlockedAt?: Date | null  // 兼容性字段
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
    fragments: [] as MemoryFragment[],
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
      const categories = ['A', 'B', 'C', 'D', 'E']
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
    async loadMemoryFragments(sessionId?: string) {
      this.isLoading = true
      try {
        const params: any = {}
        if (sessionId) {
          params.sessionId = sessionId
        }
        
        const response = await apiClient.get('/memory/fragments', { params })
        
        if (response.data.success) {
          this.fragments = response.data.data.map((fragment: any) => ({
            id: fragment.id,
            fragment_id: fragment.fragment_id,
            user_id: fragment.user_id,
            title: fragment.title,
            content: fragment.content,
            category: fragment.category,
            description: fragment.description,
            rarity: fragment.rarity,
            is_unlocked: fragment.is_unlocked,
            unlocked_at: fragment.unlocked_at,
            unlock_condition: fragment.unlock_condition,
            unlock_conditions: fragment.unlock_conditions,
            fragment_order: fragment.fragment_order,
            created_at: fragment.created_at,
            // 兼容性字段
            isUnlocked: fragment.is_unlocked,
            unlockedAt: fragment.unlocked_at ? new Date(fragment.unlocked_at) : null,
            emotionalValue: fragment.emotionalValue || 0,
            tags: fragment.tags || []
          }))
        }
      } catch (error) {
        console.error('加载记忆片段失败:', error)
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

    async checkUnlockConditions(sessionId: string, content?: string, emotion?: any) {
      try {
        const response = await apiClient.post('/memory/check-unlock', {
          sessionId,
          content,
          emotion
        })

        if (response.data.success && response.data.data.unlockedFragments) {
          const unlockedFragments = response.data.data.unlockedFragments
          
          // 更新本地状态
          unlockedFragments.forEach((fragmentData: any) => {
            const fragment = this.fragments.find(f => f.id === fragmentData.fragment_id)
            if (fragment) {
              fragment.is_unlocked = true
              fragment.unlocked_at = new Date(fragmentData.unlocked_at)
              
              // 添加到解锁历史
              this.unlockHistory.push({
                memoryId: fragmentData.fragment_id,
                unlockedAt: new Date(fragmentData.unlocked_at),
                trigger: fragmentData.unlock_trigger || '对话触发',
                fragment: fragment
              })
            }
          })

          return unlockedFragments.map((f: any) => f.fragment_id)
        }

        return []
      } catch (error) {
        console.error('检查解锁条件失败:', error)
        return []
      }
    },

    shouldUnlockFragment(fragment: MemoryFragment, userMessage: string, emotion?: any): boolean {
      // 简单的本地检查逻辑
      if (fragment.is_unlocked) return false
      
      const condition = fragment.unlockConditions
      if (!condition) return false
      
      switch (condition.type) {
        case 'keyword':
          return condition.value.some((keyword: string) => 
            userMessage.toLowerCase().includes(keyword.toLowerCase())
          )
        case 'emotion':
          return emotion && emotion.dominant === condition.value
        default:
          return false
      }
    },

    async unlockFragment(fragmentId: string, sessionId: string, reason?: string) {
      try {
        const response = await apiClient.post(`/memory/unlock/${fragmentId}`, {
          sessionId,
          reason
        })

        if (response.data.success) {
          const fragment = this.fragments.find(f => f.id === fragmentId)
          if (fragment) {
            fragment.is_unlocked = true
            fragment.unlocked_at = new Date()
            
            // 添加到解锁历史
            this.unlockHistory.push({
              memoryId: fragmentId,
              unlockedAt: new Date(),
              trigger: reason || '手动解锁',
              fragment: fragment
            })
          }
          return fragment
        }
        return null
      } catch (error) {
        console.error('解锁记忆片段失败:', error)
        return null
      }
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
      this.fragments = []
      this.unlockHistory = []
      localStorage.removeItem('memory_fragments')
      localStorage.removeItem('memory_unlock_history')
    }
  }
})