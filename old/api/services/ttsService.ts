import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

export interface TTSConfig {
  apiKey: string
  appId: string
  baseUrl: string
  defaultVoice: string
  audioFormat: string
  sampleRate: number
  cacheEnabled: boolean
  cacheDir: string
  maxCacheSize: number
}

export interface VoiceParams {
  voiceId: string
  speed: number
  pitch: number
  volume: number
  emotion: string
}

export interface TTSRequest {
  text: string
  voiceParams: VoiceParams
  format?: string
  sampleRate?: number
}

export interface TTSResponse {
  audioUrl: string
  audioData?: Buffer
  duration?: number
  cached: boolean
}

class TTSService {
  private config: TTSConfig = {
    apiKey: process.env.VOLCENGINE_ACCESS_KEY || 'X1RJiq2yzJbXTTjn60VpWvM9oaeNbwbw',
    appId: process.env.VOLCENGINE_APP_ID || '8216125693',
    baseUrl: 'https://openspeech.bytedance.com/api/v1/tts',
    defaultVoice: 'BV700_streaming',
    audioFormat: 'mp3',
    sampleRate: 24000,
    cacheEnabled: true,
    cacheDir: path.join(process.cwd(), 'cache', 'tts'),
    maxCacheSize: 100 * 1024 * 1024 // 100MB
  }

  // 人格语音参数映射
  private personalityVoices: { [key: string]: VoiceParams } = {
    default: {
      voiceId: 'BV700_streaming',
      speed: 1.0,
      pitch: 1.0,
      volume: 1.0,
      emotion: 'happy'
    },
    tsundere: {
      voiceId: 'BV406_streaming',
      speed: 1.1,
      pitch: 1.2,
      volume: 1.0,
      emotion: 'arrogant'
    },
    tech: {
      voiceId: 'BV700_streaming',
      speed: 0.9,
      pitch: 0.9,
      volume: 1.0,
      emotion: 'calm'
    },
    warm: {
      voiceId: 'BV406_streaming',
      speed: 0.9,
      pitch: 1.1,
      volume: 0.9,
      emotion: 'gentle'
    },
    defensive: {
      voiceId: 'BV700_streaming',
      speed: 0.8,
      pitch: 0.8,
      volume: 0.8,
      emotion: 'serious'
    }
  }

  constructor() {
    this.initializeCacheDir()
  }

  // 初始化缓存目录
  private initializeCacheDir() {
    if (this.config.cacheEnabled && !fs.existsSync(this.config.cacheDir)) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true })
    }
  }

  // 生成语音
  async generateSpeech(text: string, personality: string = 'default'): Promise<TTSResponse> {
    try {
      const voiceParams = this.personalityVoices[personality] || this.personalityVoices.default
      
      // 预处理文本
      const processedText = this.preprocessText(text)
      
      // 检查缓存
      const cacheKey = this.generateCacheKey(processedText, voiceParams)
      const cachedResult = await this.getCachedAudio(cacheKey)
      
      if (cachedResult) {
        console.log(`TTS cache hit for personality: ${personality}`)
        return cachedResult
      }

      // 调用TTS API
      const audioData = await this.callTTSAPI({
        text: processedText,
        voiceParams,
        format: this.config.audioFormat,
        sampleRate: this.config.sampleRate
      })

      // 保存到缓存
      const audioUrl = await this.saveToCache(cacheKey, audioData)

      console.log(`TTS generated for personality: ${personality}, text length: ${text.length}`)

      return {
        audioUrl,
        audioData,
        cached: false
      }
    } catch (error) {
      console.error('TTS generation failed:', error)
      throw new Error(`TTS generation failed: ${error.message}`)
    }
  }

  // 调用火山引擎TTS API
  private async callTTSAPI(request: TTSRequest): Promise<Buffer> {
    try {
      // 检查是否使用模拟模式
      if (process.env.MOCK_TTS_AUDIO === 'true') {
        console.log('Using mock TTS data (MOCK_TTS_AUDIO=true)')
        return this.generateMockAudio(request.text)
      }

      // 构建请求参数，按照火山引擎TTS文档格式（匹配Python实现）
      const params = {
        app: {
          appid: this.config.appId,
          token: '',
          cluster: 'volcano_tts'
        },
        user: {
          uid: this.config.appId,
        },
        audio: {
          voice:"other",
          voice_type: request.voiceParams.voiceId,
          encoding:  "wav",
          "speed":       10,
          "volume":      10,
          "pitch":       10,
          speed_ratio: request.voiceParams.speed,
        },
        request: {
          reqid: crypto.randomUUID(),
          text: request.text,
          "text_plain":    "plain",
          "operation":     "query",
          "with_frontend": 1,
          "frontend_type": "unitTson",
        }
      }
      console.log('TTS API request:', params)
      console.log('TTS API baseUrl:', this.config.baseUrl)
      console.log('TTS API baseUrl:', this.config.baseUrl)

      // 发送请求，使用标准headers（匹配Python实现）
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.code !== 3000) {
        throw new Error(`TTS API error: ${result.message || 'Unknown error'}`)
      }

      // 解码音频数据
      if (result.data) {
        return Buffer.from(result.data, 'base64')
      } else {
        throw new Error('No audio data in TTS response')
      }
    } catch (error) {
      console.error('TTS API call failed:', error)
      
      // 在开发环境下返回模拟音频数据
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock TTS data for development')
        return this.generateMockAudio(request.text)
      }
      
      throw error
    }
  }



  // 预处理文本
  private preprocessText(text: string): string {
    return text
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\.,!?;:()（）。，！？；：]/g, '') // 移除特殊字符
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim()
      .substring(0, 500) // 限制长度
  }

  // 生成缓存键
  private generateCacheKey(text: string, voiceParams: VoiceParams): string {
    const content = JSON.stringify({ text, voiceParams })
    return crypto.createHash('md5').update(content).digest('hex')
  }

  // 获取缓存音频
  private async getCachedAudio(cacheKey: string): Promise<TTSResponse | null> {
    if (!this.config.cacheEnabled) return null

    try {
      const cacheFile = path.join(this.config.cacheDir, `${cacheKey}.${this.config.audioFormat}`)
      
      if (fs.existsSync(cacheFile)) {
        const audioData = fs.readFileSync(cacheFile)
        const audioUrl = `/api/tts/audio/${cacheKey}.${this.config.audioFormat}`
        
        return {
          audioUrl,
          audioData,
          cached: true
        }
      }
    } catch (error) {
      console.error('Error reading cached audio:', error)
    }

    return null
  }

  // 保存到缓存
  private async saveToCache(cacheKey: string, audioData: Buffer): Promise<string> {
    if (!this.config.cacheEnabled) {
      // 如果不启用缓存，返回临时URL
      return `/api/tts/temp/${cacheKey}.${this.config.audioFormat}`
    }

    try {
      const cacheFile = path.join(this.config.cacheDir, `${cacheKey}.${this.config.audioFormat}`)
      fs.writeFileSync(cacheFile, audioData)
      
      // 检查缓存大小并清理
      await this.cleanupCache()
      
      return `/api/tts/audio/${cacheKey}.${this.config.audioFormat}`
    } catch (error) {
      console.error('Error saving to cache:', error)
      return `/api/tts/temp/${cacheKey}.${this.config.audioFormat}`
    }
  }

  // 清理缓存
  private async cleanupCache() {
    if (!this.config.cacheEnabled) return

    try {
      const files = fs.readdirSync(this.config.cacheDir)
      let totalSize = 0
      const fileStats: Array<{ file: string; size: number; mtime: Date }> = []

      for (const file of files) {
        const filePath = path.join(this.config.cacheDir, file)
        const stats = fs.statSync(filePath)
        totalSize += stats.size
        fileStats.push({
          file: filePath,
          size: stats.size,
          mtime: stats.mtime
        })
      }

      if (totalSize > this.config.maxCacheSize) {
        // 按修改时间排序，删除最旧的文件
        fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
        
        let deletedSize = 0
        for (const fileStat of fileStats) {
          if (totalSize - deletedSize <= this.config.maxCacheSize * 0.8) break
          
          fs.unlinkSync(fileStat.file)
          deletedSize += fileStat.size
        }
        
        console.log(`Cleaned up ${deletedSize} bytes from TTS cache`)
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error)
    }
  }

  // 生成模拟音频（开发用）
  private generateMockAudio(text: string): Buffer {
    // 生成简单的模拟音频数据
    const duration = Math.min(text.length * 100, 10000) // 基于文本长度
    const mockData = Buffer.alloc(duration, 0)
    
    // 填充一些模拟数据
    for (let i = 0; i < duration; i++) {
      mockData[i] = Math.floor(Math.random() * 256)
    }
    
    return mockData
  }

  // 获取人格语音参数
  getPersonalityVoiceParams(personality: string): VoiceParams {
    return this.personalityVoices[personality] || this.personalityVoices.default
  }

  // 更新人格语音参数
  updatePersonalityVoice(personality: string, voiceParams: VoiceParams): boolean {
    try {
      this.personalityVoices[personality] = voiceParams
      return true
    } catch (error) {
      console.error('Error updating personality voice:', error)
      return false
    }
  }

  // 获取可用语音列表
  async getAvailableVoices(): Promise<Array<{ id: string; name: string; language: string; gender: string }>> {
    // 返回预定义的语音列表
    return [
      {
        id: 'zh_male_jingqiangkuaishou_moon_bigtts',
        name: '男声-京腔快手',
        language: 'zh-CN',
        gender: 'male'
      },
      {
        id: 'zh_female_shuangkuaishou_moon_bigtts',
        name: '女声-爽快手',
        language: 'zh-CN',
        gender: 'female'
      },
      {
        id: 'zh_male_jingqiang_moon_bigtts',
        name: '男声-京腔',
        language: 'zh-CN',
        gender: 'male'
      },
      {
        id: 'zh_female_shuang_moon_bigtts',
        name: '女声-爽朗',
        language: 'zh-CN',
        gender: 'female'
      }
    ]
  }

  // 测试TTS功能
  async testTTS(text: string = '这是一个测试语音'): Promise<boolean> {
    try {
      await this.generateSpeech(text, 'default')
      return true
    } catch (error) {
      console.error('TTS test failed:', error)
      return false
    }
  }

  // 批量生成语音
  async batchGenerateSpeech(
    texts: string[],
    personality: string = 'default'
  ): Promise<TTSResponse[]> {
    const results: TTSResponse[] = []
    
    for (const text of texts) {
      try {
        const result = await this.generateSpeech(text, personality)
        results.push(result)
      } catch (error) {
        console.error(`Batch TTS failed for text: ${text}`, error)
        // 继续处理其他文本
      }
    }
    
    return results
  }

  // 获取缓存统计
  getCacheStats(): { size: number; fileCount: number; enabled: boolean } {
    if (!this.config.cacheEnabled) {
      return { size: 0, fileCount: 0, enabled: false }
    }

    try {
      const files = fs.readdirSync(this.config.cacheDir)
      let totalSize = 0
      
      for (const file of files) {
        const filePath = path.join(this.config.cacheDir, file)
        const stats = fs.statSync(filePath)
        totalSize += stats.size
      }
      
      return {
        size: totalSize,
        fileCount: files.length,
        enabled: true
      }
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return { size: 0, fileCount: 0, enabled: true }
    }
  }

  // 清空缓存
  async clearCache(): Promise<boolean> {
    if (!this.config.cacheEnabled) return true

    try {
      const files = fs.readdirSync(this.config.cacheDir)
      
      for (const file of files) {
        const filePath = path.join(this.config.cacheDir, file)
        fs.unlinkSync(filePath)
      }
      
      console.log(`Cleared ${files.length} files from TTS cache`)
      return true
    } catch (error) {
      console.error('Error clearing cache:', error)
      return false
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.cacheDir) {
      this.initializeCacheDir()
    }
  }

  // 获取配置
  getConfig(): TTSConfig {
    return { ...this.config }
  }

  // 销毁服务
  async destroy(): Promise<void> {
    // 清理资源
    console.log('TTS service destroyed')
  }
}

export const ttsService = new TTSService()
export default ttsService