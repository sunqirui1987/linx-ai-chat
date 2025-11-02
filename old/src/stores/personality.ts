import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/api'

export interface PersonalityType {
  id: string
  name: string
  description: string
  traits: string[]
  triggerConditions: {
    emotionThreshold?: number
    affinityRange?: [number, number]
    conversationCount?: number
    keywords?: string[]
  }
  responseStyle: {
    tone: string
    vocabulary: string[]
    emotionalRange: [number, number]
  }
  isActive: boolean
  switchCount?: number
  lastActivated?: string
}

export interface PersonalitySwitch {
  id: string
  session_id: string
  from_personality: string
  to_personality: string
  trigger_reason: string
  trigger_data: any
  created_at: string
}

export interface PersonalityStats {
  totalSwitches: number
  mostUsedPersonality: string
  averageSwitchInterval: number
  personalityUsage: Record<string, number>
  switchTriggers: Record<string, number>
}

export interface PersonalityRecommendation {
  personalityId: string
  confidence: number
  reason: string
  triggerData: any
}

export const usePersonalityStore = defineStore('personality', () => {
  // 状态
  const personalities = ref<PersonalityType[]>([])
  const currentPersonality = ref<string>('angel')
  const switchHistory = ref<PersonalitySwitch[]>([])
  const stats = ref<PersonalityStats | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const activePersonality = computed(() => {
    return personalities.value.find(p => p.id === currentPersonality.value)
  })

  const availablePersonalities = computed(() => {
    return personalities.value.filter(p => p.isActive)
  })

  const recentSwitches = computed(() => {
    return switchHistory.value.slice(0, 10)
  })

  // 方法
  const fetchPersonalities = async () => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.get('/personality')
      if (response.data.success) {
        personalities.value = response.data.data
      } else {
        throw new Error(response.data.message || '获取人格配置失败')
      }
    } catch (err: any) {
      error.value = err.message || '获取人格配置失败'
      console.error('获取人格配置失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  const getPersonality = async (personalityId: string) => {
    try {
      const response = await apiClient.get(`/personality/${personalityId}`)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取人格详情失败')
      }
    } catch (err: any) {
      console.error('获取人格详情失败:', err)
      throw err
    }
  }

  const recommendPersonality = async (sessionId: string, context: any) => {
    try {
      const response = await apiClient.post('/personality/recommend', {
        sessionId,
        context
      })
      if (response.data.success) {
        return response.data.data as PersonalityRecommendation
      } else {
        throw new Error(response.data.message || '获取人格推荐失败')
      }
    } catch (err: any) {
      console.error('获取人格推荐失败:', err)
      throw err
    }
  }

  const switchPersonality = async (sessionId: string, toPersonality: string, reason: string, triggerData?: any) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/personality/switch', {
        sessionId,
        toPersonality,
        reason,
        triggerData
      })

      if (response.data.success) {
        currentPersonality.value = toPersonality
        await fetchSwitchHistory(sessionId)
        return response.data.data
      } else {
        throw new Error(response.data.message || '切换人格失败')
      }
    } catch (err: any) {
      error.value = err.message || '切换人格失败'
      console.error('切换人格失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchSwitchHistory = async (sessionId: string, limit: number = 20) => {
    try {
      const response = await apiClient.get(`/personality/sessions/${sessionId}/switches`, {
        params: { limit }
      })
      if (response.data.success) {
        switchHistory.value = response.data.data
      } else {
        throw new Error(response.data.message || '获取切换历史失败')
      }
    } catch (err: any) {
      console.error('获取切换历史失败:', err)
    }
  }

  const fetchPersonalityStats = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/personality/sessions/${sessionId}/stats`)
      if (response.data.success) {
        stats.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取人格统计失败')
      }
    } catch (err: any) {
      console.error('获取人格统计失败:', err)
      throw err
    }
  }

  const createPersonality = async (personalityData: Omit<PersonalityType, 'id' | 'switchCount' | 'lastActivated'>) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/personality', personalityData)
      if (response.data.success) {
        await fetchPersonalities() // 重新加载人格列表
        return response.data.data
      } else {
        throw new Error(response.data.message || '创建人格失败')
      }
    } catch (err: any) {
      error.value = err.message || '创建人格失败'
      console.error('创建人格失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updatePersonality = async (personalityId: string, personalityData: Partial<PersonalityType>) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.put(`/personality/${personalityId}`, personalityData)
      if (response.data.success) {
        await fetchPersonalities() // 重新加载人格列表
        return response.data.data
      } else {
        throw new Error(response.data.message || '更新人格失败')
      }
    } catch (err: any) {
      error.value = err.message || '更新人格失败'
      console.error('更新人格失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deletePersonality = async (personalityId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.delete(`/personality/${personalityId}`)
      if (response.data.success) {
        await fetchPersonalities() // 重新加载人格列表
        return true
      } else {
        throw new Error(response.data.message || '删除人格失败')
      }
    } catch (err: any) {
      error.value = err.message || '删除人格失败'
      console.error('删除人格失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const exportPersonalities = async () => {
    try {
      const response = await apiClient.get('/personality/export/all')
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '导出人格配置失败')
      }
    } catch (err: any) {
      console.error('导出人格配置失败:', err)
      throw err
    }
  }

  const importPersonalities = async (personalitiesData: PersonalityType[]) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/personality/import', {
        personalities: personalitiesData
      })
      if (response.data.success) {
        await fetchPersonalities() // 重新加载人格列表
        return response.data.data
      } else {
        throw new Error(response.data.message || '导入人格配置失败')
      }
    } catch (err: any) {
      error.value = err.message || '导入人格配置失败'
      console.error('导入人格配置失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const testPersonalityTrigger = async (personalityId: string, testData: any) => {
    try {
      const response = await apiClient.post(`/personality/${personalityId}/test-trigger`, testData)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '测试人格触发条件失败')
      }
    } catch (err: any) {
      console.error('测试人格触发条件失败:', err)
      throw err
    }
  }

  return {
    // 状态
    personalities,
    currentPersonality,
    switchHistory,
    stats,
    isLoading,
    error,

    // 计算属性
    activePersonality,
    availablePersonalities,
    recentSwitches,

    // 方法
    fetchPersonalities,
    getPersonality,
    recommendPersonality,
    switchPersonality,
    fetchSwitchHistory,
    fetchPersonalityStats,
    createPersonality,
    updatePersonality,
    deletePersonality,
    exportPersonalities,
    importPersonalities,
    testPersonalityTrigger
  }
})