// 火山引擎TTS语音合成系统
export interface TTSConfig {
  appId: string
  accessToken: string
  baseUrl: string
  defaultVoice: string
  defaultSpeed: number
  defaultVolume: number
  defaultPitch: number
}

export interface VoiceParams {
  voice: string
  speed: number
  volume: number
  pitch: number
  emotion?: string
  style?: string
}

export interface TTSRequest {
  text: string
  voice: string
  speed: number
  volume: number
  pitch: number
  format: 'mp3' | 'wav' | 'pcm'
  sample_rate: number
}

export interface TTSResponse {
  audioUrl: string
  duration: number
  size: number
  format: string
}

export class TTSManager {
  private config: TTSConfig
  private audioCache: Map<string, string> = new Map()
  private isPlaying: boolean = false
  private currentAudio: HTMLAudioElement | null = null

  // 人格对应的语音参数
  private personalityVoices: { [key: string]: VoiceParams } = {
    default: {
      voice: 'zh_female_qingxin',
      speed: 1.0,
      volume: 0.8,
      pitch: 0,
      emotion: 'neutral',
      style: 'casual'
    },
    tsundere: {
      voice: 'zh_female_keai',
      speed: 1.1,
      volume: 0.9,
      pitch: 2,
      emotion: 'happy',
      style: 'cute'
    },
    tech: {
      voice: 'zh_female_zhiyu',
      speed: 0.9,
      volume: 0.7,
      pitch: -1,
      emotion: 'neutral',
      style: 'professional'
    },
    warm: {
      voice: 'zh_female_wenrou',
      speed: 0.8,
      volume: 0.9,
      pitch: 1,
      emotion: 'gentle',
      style: 'warm'
    },
    defensive: {
      voice: 'zh_female_yanli',
      speed: 1.0,
      volume: 0.8,
      pitch: 0,
      emotion: 'serious',
      style: 'formal'
    }
  }

  constructor(config: TTSConfig) {
    this.config = config
  }

  // 文本转语音
  async textToSpeech(
    text: string, 
    personality: string = 'default',
    customParams?: Partial<VoiceParams>
  ): Promise<TTSResponse> {
    try {
      // 获取人格对应的语音参数
      const voiceParams = {
        ...this.personalityVoices[personality] || this.personalityVoices.default,
        ...customParams
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(text, voiceParams)
      
      // 检查缓存
      if (this.audioCache.has(cacheKey)) {
        const audioUrl = this.audioCache.get(cacheKey)!
        return {
          audioUrl,
          duration: 0, // 缓存的音频需要单独获取时长
          size: 0,
          format: 'mp3'
        }
      }

      // 构建请求参数
      const ttsRequest: TTSRequest = {
        text: this.preprocessText(text),
        voice: voiceParams.voice,
        speed: voiceParams.speed,
        volume: voiceParams.volume,
        pitch: voiceParams.pitch,
        format: 'mp3',
        sample_rate: 16000
      }

      // 调用火山引擎TTS API
      const response = await this.callTTSAPI(ttsRequest)
      
      // 缓存结果
      this.audioCache.set(cacheKey, response.audioUrl)
      
      return response
    } catch (error) {
      console.error('TTS generation failed:', error)
      throw new Error('语音合成失败')
    }
  }

  // 调用火山引擎TTS API
  private async callTTSAPI(request: TTSRequest): Promise<TTSResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
          'X-App-Id': this.config.appId
        },
        body: JSON.stringify({
          app: {
            appid: this.config.appId,
            token: this.config.accessToken
          },
          user: {
            uid: 'user_' + Date.now()
          },
          audio: {
            voice_type: request.voice,
            encoding: request.format,
            speed_ratio: request.speed,
            volume_ratio: request.volume,
            pitch_ratio: request.pitch,
            sample_rate: request.sample_rate
          },
          request: {
            reqid: 'req_' + Date.now(),
            text: request.text,
            text_type: 'plain',
            operation: 'query'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`TTS API request failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.code !== 0) {
        throw new Error(`TTS API error: ${data.message}`)
      }

      // 处理返回的音频数据
      const audioData = data.data
      const audioBlob = this.base64ToBlob(audioData, 'audio/mp3')
      const audioUrl = URL.createObjectURL(audioBlob)

      return {
        audioUrl,
        duration: data.duration || 0,
        size: audioBlob.size,
        format: request.format
      }
    } catch (error) {
      console.error('TTS API call failed:', error)
      throw error
    }
  }

  // 播放语音
  async playAudio(audioUrl: string, onEnd?: () => void): Promise<void> {
    try {
      // 停止当前播放
      this.stopAudio()

      // 创建新的音频对象
      this.currentAudio = new Audio(audioUrl)
      this.isPlaying = true

      // 设置事件监听
      this.currentAudio.addEventListener('ended', () => {
        this.isPlaying = false
        this.currentAudio = null
        onEnd?.()
      })

      this.currentAudio.addEventListener('error', (error) => {
        console.error('Audio playback error:', error)
        this.isPlaying = false
        this.currentAudio = null
      })

      // 播放音频
      await this.currentAudio.play()
    } catch (error) {
      console.error('Failed to play audio:', error)
      this.isPlaying = false
      this.currentAudio = null
      throw new Error('音频播放失败')
    }
  }

  // 停止播放
  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    this.isPlaying = false
  }

  // 暂停播放
  pauseAudio(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause()
      this.isPlaying = false
    }
  }

  // 恢复播放
  resumeAudio(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play()
      this.isPlaying = true
    }
  }

  // 设置音量
  setVolume(volume: number): void {
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, volume))
    }
  }

  // 获取播放状态
  getPlaybackState(): {
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
  } {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentAudio?.currentTime || 0,
      duration: this.currentAudio?.duration || 0,
      volume: this.currentAudio?.volume || 0
    }
  }

  // 文本预处理
  private preprocessText(text: string): string {
    // 移除HTML标签
    let processedText = text.replace(/<[^>]*>/g, '')
    
    // 处理特殊字符
    processedText = processedText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    
    // 限制文本长度（火山引擎TTS有长度限制）
    if (processedText.length > 500) {
      processedText = processedText.substring(0, 500) + '...'
    }
    
    // 处理表情符号和特殊符号
    processedText = processedText.replace(/[😀-🙏]/g, '') // 移除emoji
    
    return processedText.trim()
  }

  // 生成缓存键
  private generateCacheKey(text: string, params: VoiceParams): string {
    const key = `${text}_${params.voice}_${params.speed}_${params.volume}_${params.pitch}`
    return btoa(encodeURIComponent(key)).replace(/[+/=]/g, '')
  }

  // Base64转Blob
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  // 获取支持的语音列表
  async getVoiceList(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/voices`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'X-App-Id': this.config.appId
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get voice list: ${response.status}`)
      }

      const data = await response.json()
      return data.voices || []
    } catch (error) {
      console.error('Failed to get voice list:', error)
      return []
    }
  }

  // 更新人格语音参数
  updatePersonalityVoice(personality: string, params: Partial<VoiceParams>): void {
    if (this.personalityVoices[personality]) {
      this.personalityVoices[personality] = {
        ...this.personalityVoices[personality],
        ...params
      }
    }
  }

  // 获取人格语音参数
  getPersonalityVoice(personality: string): VoiceParams {
    return this.personalityVoices[personality] || this.personalityVoices.default
  }

  // 清空缓存
  clearCache(): void {
    // 释放所有缓存的音频URL
    for (const url of this.audioCache.values()) {
      URL.revokeObjectURL(url)
    }
    this.audioCache.clear()
  }

  // 获取缓存大小
  getCacheSize(): number {
    return this.audioCache.size
  }

  // 更新配置
  updateConfig(config: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // 测试TTS服务
  async testTTS(): Promise<boolean> {
    try {
      const testText = '你好，这是语音测试。'
      await this.textToSpeech(testText, 'default')
      return true
    } catch (error) {
      console.error('TTS test failed:', error)
      return false
    }
  }

  // 批量生成语音
  async batchTextToSpeech(
    texts: string[],
    personality: string = 'default',
    onProgress?: (progress: number) => void
  ): Promise<TTSResponse[]> {
    const results: TTSResponse[] = []
    
    for (let i = 0; i < texts.length; i++) {
      try {
        const result = await this.textToSpeech(texts[i], personality)
        results.push(result)
        onProgress?.((i + 1) / texts.length)
      } catch (error) {
        console.error(`Failed to generate TTS for text ${i}:`, error)
        // 继续处理下一个文本
      }
    }
    
    return results
  }

  // 销毁实例
  destroy(): void {
    this.stopAudio()
    this.clearCache()
  }
}

// 默认配置
export const defaultTTSConfig: TTSConfig = {
  appId: process.env.VOLCENGINE_APP_ID || '',
  accessToken: process.env.VOLCENGINE_ACCESS_TOKEN || '',
  baseUrl: 'https://openspeech.bytedance.com',
  defaultVoice: 'zh_female_qingxin',
  defaultSpeed: 1.0,
  defaultVolume: 0.8,
  defaultPitch: 0
}

// 导出单例实例
export const ttsManager = new TTSManager(defaultTTSConfig)