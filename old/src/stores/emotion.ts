import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/api'

export interface EmotionAnalysis {
  type: string
  confidence: number
  intensity: number
  context: {
    keywords: string[]
    sentiment: 'positive' | 'negative' | 'neutral'
    emotionalTriggers: string[]
  }
  timestamp?: string
}

export interface EmotionHistory {
  id: string
  session_id: string
  text: string
  emotion: string
  confidence: number
  context: any
  created_at: string
}

export interface EmotionStats {
  totalAnalyses: number
  emotionDistribution: Record<string, number>
  averageConfidence: number
  dominantEmotion: string
  emotionTrends: Array<{
    date: string
    emotions: Record<string, number>
  }>
}

export interface EmotionTrend {
  timeRange: string
  emotionChanges: Array<{
    emotion: string
    frequency: number
    averageIntensity: number
  }>
  significantChanges: Array<{
    from: string
    to: string
    timestamp: string
    trigger?: string
  }>
}

export interface EmotionChangeDetection {
  hasChange: boolean
  previousEmotion?: string
  currentEmotion: string
  changeIntensity: number
  trigger?: string
  confidence: number
}

export interface EmotionConfig {
  analysisThreshold: number
  emotionCategories: Record<string, string[]>
  intensityLevels: Record<string, [number, number]>
  triggerKeywords: Record<string, string[]>
}

export const useEmotionStore = defineStore('emotion', () => {
  // 状态
  const currentEmotion = ref<EmotionAnalysis | null>(null)
  const emotionHistory = ref<EmotionHistory[]>([])
  const stats = ref<EmotionStats | null>(null)
  const trends = ref<EmotionTrend | null>(null)
  const config = ref<EmotionConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const recentEmotions = computed(() => {
    return emotionHistory.value.slice(0, 10)
  })

  const dominantEmotion = computed(() => {
    if (!stats.value) return null
    return stats.value.dominantEmotion
  })

  const emotionIntensity = computed(() => {
    if (!currentEmotion.value) return 0
    return currentEmotion.value.intensity
  })

  const emotionConfidence = computed(() => {
    if (!currentEmotion.value) return 0
    return currentEmotion.value.confidence
  })

  // 方法
  const analyzeEmotion = async (text: string, sessionId?: string) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/emotion/analyze', {
        text,
        sessionId
      })

      if (response.data.success) {
        currentEmotion.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '情感分析失败')
      }
    } catch (err: any) {
      error.value = err.message || '情感分析失败'
      console.error('情感分析失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const analyzeBatchEmotions = async (texts: string[], sessionId?: string) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/emotion/analyze/batch', {
        texts,
        sessionId
      })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '批量情感分析失败')
      }
    } catch (err: any) {
      error.value = err.message || '批量情感分析失败'
      console.error('批量情感分析失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchEmotionHistory = async (sessionId: string, limit: number = 50) => {
    try {
      const response = await apiClient.get(`/emotion/sessions/${sessionId}/history`, {
        params: { limit }
      })

      if (response.data.success) {
        emotionHistory.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取情感历史失败')
      }
    } catch (err: any) {
      console.error('获取情感历史失败:', err)
      throw err
    }
  }

  const fetchEmotionStats = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/emotion/sessions/${sessionId}/stats`)

      if (response.data.success) {
        stats.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取情感统计失败')
      }
    } catch (err: any) {
      console.error('获取情感统计失败:', err)
      throw err
    }
  }

  const fetchEmotionTrends = async (sessionId: string, timeRange: string = '7d') => {
    try {
      const response = await apiClient.get(`/emotion/sessions/${sessionId}/trends`, {
        params: { timeRange }
      })

      if (response.data.success) {
        trends.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取情感趋势失败')
      }
    } catch (err: any) {
      console.error('获取情感趋势失败:', err)
      throw err
    }
  }

  const detectEmotionChange = async (sessionId: string, currentText: string) => {
    try {
      const response = await apiClient.post('/emotion/detect-change', {
        sessionId,
        currentText
      })

      if (response.data.success) {
        return response.data.data as EmotionChangeDetection
      } else {
        throw new Error(response.data.message || '检测情感变化失败')
      }
    } catch (err: any) {
      console.error('检测情感变化失败:', err)
      throw err
    }
  }

  const fetchGlobalEmotionStats = async () => {
    try {
      const response = await apiClient.get('/emotion/stats/global')

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取全局情感统计失败')
      }
    } catch (err: any) {
      console.error('获取全局情感统计失败:', err)
      throw err
    }
  }

  const exportEmotionData = async (sessionId: string, format: string = 'json') => {
    try {
      const response = await apiClient.get(`/emotion/sessions/${sessionId}/export`, {
        params: { format }
      })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '导出情感数据失败')
      }
    } catch (err: any) {
      console.error('导出情感数据失败:', err)
      throw err
    }
  }

  const cleanupEmotionData = async (sessionId?: string, olderThan?: string) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.post('/emotion/cleanup', {
        sessionId,
        olderThan
      })

      if (response.data.success) {
        // 如果清理了当前会话的数据，重新加载历史
        if (sessionId) {
          await fetchEmotionHistory(sessionId)
        }
        return response.data.data
      } else {
        throw new Error(response.data.message || '清理情感数据失败')
      }
    } catch (err: any) {
      error.value = err.message || '清理情感数据失败'
      console.error('清理情感数据失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchKeywordStats = async () => {
    try {
      const response = await apiClient.get('/emotion/keywords/stats')

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取关键词统计失败')
      }
    } catch (err: any) {
      console.error('获取关键词统计失败:', err)
      throw err
    }
  }

  const updateEmotionConfig = async (newConfig: Partial<EmotionConfig>) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await apiClient.put('/emotion/config', newConfig)

      if (response.data.success) {
        config.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '更新情感配置失败')
      }
    } catch (err: any) {
      error.value = err.message || '更新情感配置失败'
      console.error('更新情感配置失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchEmotionConfig = async () => {
    try {
      const response = await apiClient.get('/emotion/config')

      if (response.data.success) {
        config.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取情感配置失败')
      }
    } catch (err: any) {
      console.error('获取情感配置失败:', err)
      throw err
    }
  }

  // 工具方法
  const getEmotionLabel = (emotion: string): string => {
    const emotionLabels: Record<string, string> = {
      'joy': '喜悦',
      'sadness': '悲伤',
      'anger': '愤怒',
      'fear': '恐惧',
      'surprise': '惊讶',
      'disgust': '厌恶',
      'neutral': '中性',
      'love': '爱意',
      'excitement': '兴奋',
      'anxiety': '焦虑',
      'confusion': '困惑',
      'curiosity': '好奇'
    }
    return emotionLabels[emotion] || emotion
  }

  const getEmotionColor = (emotion: string): string => {
    const emotionColors: Record<string, string> = {
      'joy': '#FFD700',
      'sadness': '#4169E1',
      'anger': '#DC143C',
      'fear': '#800080',
      'surprise': '#FF69B4',
      'disgust': '#228B22',
      'neutral': '#808080',
      'love': '#FF1493',
      'excitement': '#FF4500',
      'anxiety': '#8B4513',
      'confusion': '#9370DB',
      'curiosity': '#00CED1'
    }
    return emotionColors[emotion] || '#808080'
  }

  const getIntensityLevel = (intensity: number): string => {
    if (intensity >= 0.8) return '强烈'
    if (intensity >= 0.6) return '中等'
    if (intensity >= 0.4) return '轻微'
    return '微弱'
  }

  return {
    // 状态
    currentEmotion,
    emotionHistory,
    stats,
    trends,
    config,
    isLoading,
    error,

    // 计算属性
    recentEmotions,
    dominantEmotion,
    emotionIntensity,
    emotionConfidence,

    // 方法
    analyzeEmotion,
    analyzeBatchEmotions,
    fetchEmotionHistory,
    fetchEmotionStats,
    fetchEmotionTrends,
    detectEmotionChange,
    fetchGlobalEmotionStats,
    exportEmotionData,
    cleanupEmotionData,
    fetchKeywordStats,
    updateEmotionConfig,
    fetchEmotionConfig,

    // 工具方法
    getEmotionLabel,
    getEmotionColor,
    getIntensityLevel
  }
})