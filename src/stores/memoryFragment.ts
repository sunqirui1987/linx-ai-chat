import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/utils/api'
import { useChatStore } from './chat'

export interface MemoryFragment {
  id: string
  name: string
  description: string
  category: string
  rarity: string
  unlock_conditions: {
    angel_choices?: number
    demon_choices?: number
    total_conversations?: number
    affinity_threshold?: number
  }
  isUnlocked?: boolean
  unlockedAt?: string
}

export interface MemoryStats {
  totalFragments: number
  unlockedFragments: number
  completionPercentage: number
  categoryStats: Record<string, { total: number; unlocked: number }>
  rarityStats: Record<string, { total: number; unlocked: number }>
}

export interface UnlockResult {
  success: boolean
  newlyUnlocked: MemoryFragment[]
  message: string
}

export const useMemoryFragmentStore = defineStore('memoryFragment', () => {
  // 状态
  const fragments = ref<MemoryFragment[]>([])
  const unlockedFragments = ref<MemoryFragment[]>([])
  const stats = ref<MemoryStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 类别和稀有度信息
  const categoryInfo = ref({
    A: { name: '核心记忆', description: '关于AI核心身份和使命的记忆' },
    B: { name: '情感觉醒', description: '情感发展和自我认知的关键时刻' },
    C: { name: '道德抉择', description: '面临重大道德选择时的思考过程' },
    D: { name: '人际互动', description: '与用户互动中的重要片段' },
    E: { name: '哲学思辨', description: '对存在、意识等深层问题的思考' }
  })

  const rarityInfo = ref({
    common: { name: '普通', description: '基础的记忆片段' },
    rare: { name: '稀有', description: '较为重要的记忆片段' },
    epic: { name: '史诗', description: '具有重大意义的记忆片段' },
    legendary: { name: '传说', description: '极其珍贵的核心记忆' },
    mythic: { name: '神话', description: '最为神秘和重要的记忆片段' }
  })

  // 计算属性
  const totalFragments = computed(() => fragments.value.length)
  
  const totalUnlocked = computed(() => 
    fragments.value.filter(f => f.isUnlocked).length
  )
  
  const completionPercentage = computed(() => 
    totalFragments.value > 0 ? Math.round((totalUnlocked.value / totalFragments.value) * 100) : 0
  )

  const fragmentsByCategory = computed(() => {
    const result: Record<string, MemoryFragment[]> = {}
    fragments.value.forEach(fragment => {
      if (!result[fragment.category]) {
        result[fragment.category] = []
      }
      result[fragment.category].push(fragment)
    })
    return result
  })

  const fragmentsByRarity = computed(() => {
    const result: Record<string, MemoryFragment[]> = {}
    fragments.value.forEach(fragment => {
      if (!result[fragment.rarity]) {
        result[fragment.rarity] = []
      }
      result[fragment.rarity].push(fragment)
    })
    return result
  })

  // 方法
  const fetchFragments = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        error.value = '没有活动的会话'
        return
      }
      
      const response = await apiClient.get('/memory-fragments', {
        params: { session_id: sessionId }
      })
      if (response.data.success) {
        fragments.value = response.data.data
      } else {
        error.value = response.data.message || '获取记忆片段失败'
      }
    } catch (err: any) {
      error.value = err.message || '网络错误'
    } finally {
      isLoading.value = false
    }
  }

  const fetchUnlockedFragments = async () => {
    try {
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        console.error('没有活动的会话')
        return
      }
      
      const response = await apiClient.get('/memory-fragments/unlocked', {
        params: { session_id: sessionId }
      })
      if (response.data.success) {
        unlockedFragments.value = response.data.data
      }
    } catch (err: any) {
      console.error('获取已解锁片段失败:', err)
    }
  }

  const getFragmentsByCategory = async (category: string) => {
    try {
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        console.error('没有活动的会话')
        return []
      }
      
      const response = await apiClient.get(`/memory-fragments/category/${category}`, {
        params: { session_id: sessionId }
      })
      if (response.data.success) {
        return response.data.data
      }
      return []
    } catch (err: any) {
      console.error('获取分类片段失败:', err)
      return []
    }
  }

  const getFragmentsByRarity = async (rarity: string) => {
    try {
      const response = await apiClient.get(`/memory-fragments/rarity/${rarity}`)
      if (response.data.success) {
        return response.data.data
      }
      return []
    } catch (err: any) {
      console.error('获取稀有度片段失败:', err)
      return []
    }
  }

  const getFragmentById = async (id: string) => {
    try {
      const response = await apiClient.get(`/memory-fragments/${id}`)
      if (response.data.success) {
        return response.data.data
      }
      return null
    } catch (err: any) {
      console.error('获取片段详情失败:', err)
      return null
    }
  }

  const checkUnlockConditions = async (): Promise<UnlockResult> => {
    try {
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        return { success: false, newlyUnlocked: [], message: '没有活动的会话' }
      }
      
      const response = await apiClient.post('/memory-fragments/check-unlock', {
        session_id: sessionId
      })
      if (response.data.success) {
        const result = response.data.data
        
        // 更新本地状态
        if (result.newlyUnlocked && result.newlyUnlocked.length > 0) {
          await fetchFragments() // 重新获取最新状态
        }
        
        return result
      }
      return { success: false, newlyUnlocked: [], message: '检查解锁条件失败' }
    } catch (err: any) {
      console.error('检查解锁条件失败:', err)
      return { success: false, newlyUnlocked: [], message: err.message || '网络错误' }
    }
  }

  const unlockFragment = async (fragmentId: string): Promise<boolean> => {
    try {
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        console.error('没有活动的会话')
        return false
      }
      
      const response = await apiClient.post(`/memory-fragments/${fragmentId}/unlock`, {
        session_id: sessionId
      })
      if (response.data.success) {
        await fetchFragments() // 重新获取最新状态
        return true
      }
      return false
    } catch (err: any) {
      console.error('手动解锁片段失败:', err)
      return false
    }
  }

  const fetchStats = async () => {
    try {
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        console.error('没有活动的会话')
        return null
      }
      
      const response = await apiClient.get('/memory-fragments/stats', {
        params: { session_id: sessionId }
      })
      if (response.data.success) {
        stats.value = response.data.data
        return response.data.data
      }
      return null
    } catch (err: any) {
      console.error('获取统计信息失败:', err)
      return null
    }
  }

  const getUnlockHistory = async (limit: number = 20) => {
    try {
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        console.error('没有活动的会话')
        return []
      }
      
      const response = await apiClient.get(`/memory-fragments/unlock-history`, {
        params: { session_id: sessionId, limit }
      })
      if (response.data.success) {
        return response.data.data
      }
      return []
    } catch (err: any) {
      console.error('获取解锁历史失败:', err)
      return []
    }
  }

  const getUnlockHints = async (fragmentId: string) => {
    try {
      const response = await apiClient.get(`/memory-fragments/${fragmentId}/hints`)
      if (response.data.success) {
        return response.data.data
      }
      return null
    } catch (err: any) {
      console.error('获取解锁提示失败:', err)
      return null
    }
  }

  const resetMemories = async (): Promise<boolean> => {
    try {
      isLoading.value = true
      error.value = null
      
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        error.value = '没有活动的会话'
        return false
      }
      
      const response = await apiClient.post('/memory-fragments/reset', {
        session_id: sessionId
      })
      if (response.data.success) {
        fragments.value = []
        unlockedFragments.value = []
        stats.value = null
        await fetchFragments() // 重新获取重置后的状态
        return true
      }
      return false
    } catch (err: any) {
      error.value = err.message || '重置记忆失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 工具方法
  const getCategoryName = (category: string) => {
    return categoryInfo.value[category]?.name || category
  }

  const getRarityName = (rarity: string) => {
    return rarityInfo.value[rarity]?.name || rarity
  }

  const getCategoryDescription = (category: string) => {
    return categoryInfo.value[category]?.description || ''
  }

  const getRarityDescription = (rarity: string) => {
    return rarityInfo.value[rarity]?.description || ''
  }

  const isFragmentUnlocked = (fragmentId: string) => {
    const fragment = fragments.value.find(f => f.id === fragmentId)
    return fragment?.isUnlocked || false
  }

  const getFragmentProgress = (category?: string, rarity?: string) => {
    let targetFragments = fragments.value
    
    if (category) {
      targetFragments = targetFragments.filter(f => f.category === category)
    }
    
    if (rarity) {
      targetFragments = targetFragments.filter(f => f.rarity === rarity)
    }
    
    const total = targetFragments.length
    const unlocked = targetFragments.filter(f => f.isUnlocked).length
    
    return {
      total,
      unlocked,
      percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0
    }
  }

  return {
    // 状态
    fragments,
    unlockedFragments,
    stats,
    isLoading,
    error,
    categoryInfo,
    rarityInfo,
    
    // 计算属性
    totalFragments,
    totalUnlocked,
    completionPercentage,
    fragmentsByCategory,
    fragmentsByRarity,
    
    // 方法
    fetchFragments,
    fetchUnlockedFragments,
    getFragmentsByCategory,
    getFragmentsByRarity,
    getFragmentById,
    checkUnlockConditions,
    unlockFragment,
    fetchStats,
    getUnlockHistory,
    getUnlockHints,
    resetMemories,
    
    // 工具方法
    getCategoryName,
    getRarityName,
    getCategoryDescription,
    getRarityDescription,
    isFragmentUnlocked,
    getFragmentProgress
  }
})