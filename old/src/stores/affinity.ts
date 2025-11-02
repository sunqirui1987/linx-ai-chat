import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/utils/api'
import { useChatStore } from './chat'

export interface AffinityData {
  user_id: number
  angel_affinity: number
  demon_affinity: number
  morality_value: number
  angel_choices: number
  demon_choices: number
  neutral_choices: number
  balance_status: string
  created_at: string
  updated_at: string
}

export interface AffinityChoice {
  id: number
  user_id: number
  session_id: string
  choice_type: 'angel' | 'demon' | 'neutral'
  choice_content: string
  affinity_change: number
  created_at: string
}

export interface AffinityChoiceRequest {
  choice_type: 'angel' | 'demon' | 'neutral'
  choice_content: string
  session_id: string
}

export const useAffinityStore = defineStore('affinity', () => {
  // 状态
  const affinityData = ref<AffinityData | null>(null)
  const choiceHistory = ref<AffinityChoice[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const angelAffinityPercentage = computed(() => {
    if (!affinityData.value) return 0
    return Math.max(0, Math.min(100, ((affinityData.value.angel_affinity + 100) / 200) * 100))
  })

  const demonAffinityPercentage = computed(() => {
    if (!affinityData.value) return 0
    return Math.max(0, Math.min(100, ((affinityData.value.demon_affinity + 100) / 200) * 100))
  })

  const moralityPercentage = computed(() => {
    if (!affinityData.value) return 50
    return Math.max(0, Math.min(100, ((affinityData.value.morality_value + 100) / 200) * 100))
  })

  const totalChoices = computed(() => {
    if (!affinityData.value) return 0
    return affinityData.value.angel_choices + affinityData.value.demon_choices + affinityData.value.neutral_choices
  })

  const dominantPersonality = computed(() => {
    if (!affinityData.value) return 'neutral'
    const { angel_affinity, demon_affinity } = affinityData.value
    if (Math.abs(angel_affinity - demon_affinity) < 10) return 'balanced'
    return angel_affinity > demon_affinity ? 'angel' : 'demon'
  })

  // 方法
  const fetchAffinityData = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // 获取当前session_id
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        throw new Error('当前没有活跃的聊天会话，请先开始对话')
      }
      
      const response = await apiClient.get(`/affinity?session_id=${sessionId}`)
      if (response.data.success) {
        affinityData.value = response.data.data
      } else {
        throw new Error(response.data.message || '获取好感度数据失败')
      }
    } catch (err: any) {
      error.value = err.message || '获取好感度数据失败'
      console.error('获取好感度数据失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  const recordChoice = async (choiceRequest: AffinityChoiceRequest) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/affinity/choice', choiceRequest)
      if (response.data.success) {
        affinityData.value = response.data.data
        // 重新加载选择历史
        await fetchChoiceHistory()
        return response.data.data
      } else {
        throw new Error(response.data.message || '记录选择失败')
      }
    } catch (err: any) {
      error.value = err.message || '记录选择失败'
      console.error('记录选择失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchChoiceHistory = async (limit: number = 20) => {
    try {
      // 获取当前session_id
      const chatStore = useChatStore()
      const sessionId = chatStore.currentSessionId
      
      if (!sessionId) {
        console.warn('当前没有活跃的聊天会话，跳过加载选择历史')
        return
      }
      
      const response = await apiClient.get(`/affinity/history?session_id=${sessionId}&limit=${limit}`)
      if (response.data.success) {
        choiceHistory.value = response.data.data
      } else {
        throw new Error(response.data.message || '获取选择历史失败')
      }
    } catch (err: any) {
      console.error('获取选择历史失败:', err)
    }
  }

  const fetchAffinityStats = async () => {
    try {
      const response = await apiClient.get('/affinity/stats')
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取好感度统计失败')
      }
    } catch (err: any) {
      console.error('获取好感度统计失败:', err)
      throw err
    }
  }

  const resetAffinity = async () => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/affinity/reset')
      if (response.data.success) {
        affinityData.value = response.data.data
        choiceHistory.value = []
        return response.data.data
      } else {
        throw new Error(response.data.message || '重置好感度失败')
      }
    } catch (err: any) {
      error.value = err.message || '重置好感度失败'
      console.error('重置好感度失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 工具方法
  const getAffinityLevel = (value: number): string => {
    if (value >= 80) return '深爱'
    if (value >= 60) return '喜欢'
    if (value >= 40) return '好感'
    if (value >= 20) return '普通'
    if (value >= 0) return '冷淡'
    if (value >= -20) return '不喜'
    if (value >= -40) return '厌恶'
    if (value >= -60) return '憎恨'
    return '仇视'
  }

  const getMoralityLabel = (value: number): string => {
    if (value >= 60) return '圣洁'
    if (value >= 40) return '善良'
    if (value >= 20) return '正义'
    if (value >= -20) return '中性'
    if (value >= -40) return '邪恶'
    if (value >= -60) return '堕落'
    return '黑暗'
  }

  const getBalanceDescription = (status: string): string => {
    const descriptions: Record<string, string> = {
      '平衡': '两种人格保持良好平衡',
      '天使倾向': '更倾向于天使人格',
      '恶魔倾向': '更倾向于恶魔人格',
      '极度失衡': '人格严重失衡，需要调整'
    }
    return descriptions[status] || '状态未知'
  }

  const getChoiceTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'angel': '天使',
      'demon': '恶魔',
      'neutral': '中性'
    }
    return labels[type] || '未知'
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString()
  }

  return {
    // 状态
    affinityData,
    choiceHistory,
    isLoading,
    error,
    
    // 计算属性
    angelAffinityPercentage,
    demonAffinityPercentage,
    moralityPercentage,
    totalChoices,
    dominantPersonality,
    
    // 方法
    fetchAffinityData,
    recordChoice,
    fetchChoiceHistory,
    fetchAffinityStats,
    resetAffinity,
    
    // 工具方法
    getAffinityLevel,
    getMoralityLabel,
    getBalanceDescription,
    getChoiceTypeLabel,
    formatRelativeTime
  }
})