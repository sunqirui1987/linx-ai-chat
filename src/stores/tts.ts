import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/api'

export interface TTSResult {
  audioUrl: string
  duration: number
  cached: boolean
}

export interface Voice {
  id: string
  name: string
  language: string
  gender: 'male' | 'female' | 'neutral'
  description?: string
  isDefault?: boolean
}

export interface PersonalityVoice {
  personalityId: string
  voiceId: string
  settings: {
    speed: number
    pitch: number
    volume: number
  }
}

export interface TTSConfig {
  defaultVoice: string
  defaultSpeed: number
  defaultPitch: number
  defaultVolume: number
  cacheEnabled: boolean
  maxCacheSize: number
  audioFormat: string
  sampleRate: number
}

export interface CacheStats {
  totalFiles: number
  totalSize: number
  hitRate: number
  oldestFile: string
  newestFile: string
}

export interface AudioInfo {
  filename: string
  duration: number
  size: number
  format: string
  sampleRate: number
  createdAt: string
}

export const useTTSStore = defineStore('tts', () => {
  // 状态
  const voices = ref<Voice[]>([])
  const personalityVoices = ref<PersonalityVoice[]>([])
  const config = ref<TTSConfig | null>(null)
  const cacheStats = ref<CacheStats | null>(null)
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const isGenerating = ref(false)
  const isPlaying = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const availableVoices = computed(() => {
    return voices.value.filter(voice => voice.id !== 'disabled')
  })

  const defaultVoice = computed(() => {
    return voices.value.find(voice => voice.isDefault) || voices.value[0]
  })

  const isAudioSupported = computed(() => {
    return typeof Audio !== 'undefined'
  })

  // 方法
  const generateSpeech = async (text: string, personality: string = 'default', options?: {
    voice?: string
    speed?: number
    pitch?: number
  }) => {
    try {
      isGenerating.value = true
      error.value = null

      const response = await apiClient.post('/tts/generate', {
        text,
        personality,
        ...options
      })

      if (response.data.success) {
        return response.data.data as TTSResult
      } else {
        throw new Error(response.data.message || '语音生成失败')
      }
    } catch (err: any) {
      error.value = err.message || '语音生成失败'
      console.error('语音生成失败:', err)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  const batchGenerateSpeech = async (texts: string[], personality: string = 'default') => {
    try {
      isGenerating.value = true
      error.value = null

      const response = await apiClient.post('/tts/generate/batch', {
        texts,
        personality
      })

      if (response.data.success) {
        return response.data.data as TTSResult[]
      } else {
        throw new Error(response.data.message || '批量语音生成失败')
      }
    } catch (err: any) {
      error.value = err.message || '批量语音生成失败'
      console.error('批量语音生成失败:', err)
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  const fetchVoices = async () => {
    try {
      const response = await apiClient.get('/tts/voices')

      if (response.data.success) {
        voices.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取语音列表失败')
      }
    } catch (err: any) {
      console.error('获取语音列表失败:', err)
      throw err
    }
  }

  const getPersonalityVoice = async (personalityId: string) => {
    try {
      const response = await apiClient.get(`/tts/personalities/${personalityId}/voice`)

      if (response.data.success) {
        return response.data.data as PersonalityVoice
      } else {
        throw new Error(response.data.message || '获取人格语音配置失败')
      }
    } catch (err: any) {
      console.error('获取人格语音配置失败:', err)
      throw err
    }
  }

  const updatePersonalityVoice = async (personalityId: string, voiceConfig: Partial<PersonalityVoice>) => {
    try {
      const response = await apiClient.put(`/tts/personalities/${personalityId}/voice`, voiceConfig)

      if (response.data.success) {
        // 更新本地缓存
        const index = personalityVoices.value.findIndex(pv => pv.personalityId === personalityId)
        if (index !== -1) {
          personalityVoices.value[index] = { ...personalityVoices.value[index], ...voiceConfig }
        } else {
          personalityVoices.value.push(response.data.data)
        }
        return response.data.data
      } else {
        throw new Error(response.data.message || '更新人格语音配置失败')
      }
    } catch (err: any) {
      console.error('更新人格语音配置失败:', err)
      throw err
    }
  }

  const testVoice = async (text: string, voiceId: string, settings?: {
    speed?: number
    pitch?: number
    volume?: number
  }) => {
    try {
      const response = await apiClient.post('/tts/test', {
        text,
        voiceId,
        settings
      })

      if (response.data.success) {
        return response.data.data as TTSResult
      } else {
        throw new Error(response.data.message || '语音测试失败')
      }
    } catch (err: any) {
      console.error('语音测试失败:', err)
      throw err
    }
  }

  const fetchCacheStats = async () => {
    try {
      const response = await apiClient.get('/tts/cache/stats')

      if (response.data.success) {
        cacheStats.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取缓存统计失败')
      }
    } catch (err: any) {
      console.error('获取缓存统计失败:', err)
      throw err
    }
  }

  const clearCache = async () => {
    try {
      const response = await apiClient.post('/tts/cache/clear')

      if (response.data.success) {
        await fetchCacheStats() // 重新获取统计信息
        return response.data.data
      } else {
        throw new Error(response.data.message || '清理缓存失败')
      }
    } catch (err: any) {
      console.error('清理缓存失败:', err)
      throw err
    }
  }

  const fetchConfig = async () => {
    try {
      const response = await apiClient.get('/tts/config')

      if (response.data.success) {
        config.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取TTS配置失败')
      }
    } catch (err: any) {
      console.error('获取TTS配置失败:', err)
      throw err
    }
  }

  const updateConfig = async (newConfig: Partial<TTSConfig>) => {
    try {
      const response = await apiClient.put('/tts/config', newConfig)

      if (response.data.success) {
        config.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '更新TTS配置失败')
      }
    } catch (err: any) {
      console.error('更新TTS配置失败:', err)
      throw err
    }
  }

  const warmupCache = async (texts: string[], personality: string = 'default') => {
    try {
      const response = await apiClient.post('/tts/cache/warmup', {
        texts,
        personality
      })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '缓存预热失败')
      }
    } catch (err: any) {
      console.error('缓存预热失败:', err)
      throw err
    }
  }

  const getAudioInfo = async (filename: string) => {
    try {
      const response = await apiClient.get(`/tts/audio/${filename}/info`)

      if (response.data.success) {
        return response.data.data as AudioInfo
      } else {
        throw new Error(response.data.message || '获取音频信息失败')
      }
    } catch (err: any) {
      console.error('获取音频信息失败:', err)
      throw err
    }
  }

  const deleteAudio = async (filename: string) => {
    try {
      const response = await apiClient.delete(`/tts/audio/${filename}`)

      if (response.data.success) {
        return true
      } else {
        throw new Error(response.data.message || '删除音频文件失败')
      }
    } catch (err: any) {
      console.error('删除音频文件失败:', err)
      throw err
    }
  }

  const checkHealth = async () => {
    try {
      const response = await apiClient.get('/tts/health')

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || 'TTS服务健康检查失败')
      }
    } catch (err: any) {
      console.error('TTS服务健康检查失败:', err)
      throw err
    }
  }

  // 音频播放控制
  const playAudio = async (audioUrl: string) => {
    try {
      if (!isAudioSupported.value) {
        throw new Error('当前环境不支持音频播放')
      }

      // 停止当前播放的音频
      if (currentAudio.value) {
        currentAudio.value.pause()
        currentAudio.value = null
      }

      const audio = new Audio(audioUrl)
      currentAudio.value = audio
      isPlaying.value = true

      audio.onended = () => {
        isPlaying.value = false
        currentAudio.value = null
      }

      audio.onerror = () => {
        isPlaying.value = false
        currentAudio.value = null
        error.value = '音频播放失败'
      }

      await audio.play()
    } catch (err: any) {
      isPlaying.value = false
      currentAudio.value = null
      error.value = err.message || '音频播放失败'
      console.error('音频播放失败:', err)
      throw err
    }
  }

  const stopAudio = () => {
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
      isPlaying.value = false
    }
  }

  const pauseAudio = () => {
    if (currentAudio.value && !currentAudio.value.paused) {
      currentAudio.value.pause()
      isPlaying.value = false
    }
  }

  const resumeAudio = () => {
    if (currentAudio.value && currentAudio.value.paused) {
      currentAudio.value.play()
      isPlaying.value = true
    }
  }

  // 工具方法
  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatFileSize = (size: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let fileSize = size

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024
      unitIndex++
    }

    return `${fileSize.toFixed(1)} ${units[unitIndex]}`
  }

  return {
    // 状态
    voices,
    personalityVoices,
    config,
    cacheStats,
    currentAudio,
    isGenerating,
    isPlaying,
    error,

    // 计算属性
    availableVoices,
    defaultVoice,
    isAudioSupported,

    // 方法
    generateSpeech,
    batchGenerateSpeech,
    fetchVoices,
    getPersonalityVoice,
    updatePersonalityVoice,
    testVoice,
    fetchCacheStats,
    clearCache,
    fetchConfig,
    updateConfig,
    warmupCache,
    getAudioInfo,
    deleteAudio,
    checkHealth,

    // 音频控制
    playAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,

    // 工具方法
    formatDuration,
    formatFileSize
  }
})