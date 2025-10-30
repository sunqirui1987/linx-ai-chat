/**
 * 火山引擎TTS语音合成服务
 * 支持不同人格模式的语音参数
 */

export interface TTSConfig {
  appId: string
  accessToken: string
  baseUrl: string
}

export interface VoiceParams {
  voice: string
  emotion: string
  speed: number
  pitch: number
}

export interface TTSRequest {
  text: string
  voiceParams: VoiceParams
}

export interface TTSResponse {
  audioUrl: string
  duration: number
  success: boolean
  error?: string
}

/**
 * 火山引擎TTS服务
 */
export class VolcanoTTSService {
  private config: TTSConfig
  
  constructor(config: TTSConfig) {
    this.config = config
  }
  
  /**
   * 生成语音
   */
  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    try {
      // 清理文本，移除特殊字符
      const cleanText = this.cleanText(request.text)
      
      if (!cleanText || cleanText.length === 0) {
        throw new Error('文本内容为空')
      }
      
      // 构建请求参数
      const requestBody = {
        app: {
          appid: this.config.appId,
          token: this.config.accessToken,
          cluster: 'volcano_tts'
        },
        user: {
          uid: 'rz07_user'
        },
        audio: {
          voice_type: request.voiceParams.voice,
          encoding: 'mp3',
          speed_ratio: request.voiceParams.speed,
          volume_ratio: 1.0,
          pitch_ratio: request.voiceParams.pitch,
          emotion: request.voiceParams.emotion
        },
        request: {
          reqid: this.generateRequestId(),
          text: cleanText,
          text_type: 'plain',
          operation: 'query'
        }
      }
      
      // 调用火山引擎TTS API
      const response = await fetch(`${this.config.baseUrl}/api/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error(`TTS API请求失败: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.code !== 0) {
        throw new Error(`TTS生成失败: ${data.message}`)
      }
      
      return {
        audioUrl: data.data.audio,
        duration: data.data.duration || 0,
        success: true
      }
    } catch (error) {
      console.error('TTS语音生成失败:', error)
      
      return {
        audioUrl: '',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }
  
  /**
   * 批量生成语音
   */
  async generateBatchSpeech(requests: TTSRequest[]): Promise<TTSResponse[]> {
    const results: TTSResponse[] = []
    
    // 并发处理，但限制并发数量
    const batchSize = 3
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      const batchPromises = batch.map(request => this.generateSpeech(request))
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }
    
    return results
  }
  
  /**
   * 清理文本内容
   */
  private cleanText(text: string): string {
    return text
      // 移除markdown格式
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      // 移除特殊符号
      .replace(/[#*_~`]/g, '')
      // 移除多余的空格和换行
      .replace(/\s+/g, ' ')
      .trim()
      // 限制长度（TTS通常有字符限制）
      .substring(0, 500)
  }
  
  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `rz07_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * 验证语音参数
   */
  static validateVoiceParams(params: VoiceParams): boolean {
    // 检查语音类型
    const validVoices = [
      'BV120_streaming', 'BV700_streaming', 'BV123_streaming',
      'BV001_streaming', 'BV002_streaming', 'BV003_streaming'
    ]
    
    if (!validVoices.includes(params.voice)) {
      return false
    }
    
    // 检查参数范围
    if (params.speed < 0.5 || params.speed > 2.0) {
      return false
    }
    
    if (params.pitch < 0.5 || params.pitch > 2.0) {
      return false
    }
    
    return true
  }
}

/**
 * TTS服务工厂
 */
export class TTSServiceFactory {
  private static instance: VolcanoTTSService | null = null
  
  static getInstance(): VolcanoTTSService {
    if (!this.instance) {
      const config: TTSConfig = {
        appId: process.env.VOLCANO_TTS_APP_ID || '',
        accessToken: process.env.VOLCANO_TTS_ACCESS_TOKEN || '',
        baseUrl: process.env.VOLCANO_TTS_BASE_URL || 'https://openspeech.bytedance.com'
      }
      
      this.instance = new VolcanoTTSService(config)
    }
    
    return this.instance
  }
  
  static createWithConfig(config: TTSConfig): VolcanoTTSService {
    return new VolcanoTTSService(config)
  }
}

/**
 * 预定义的语音配置
 */
export const VOICE_PRESETS = {
  // 默认痞帅模式
  default: {
    voice: 'BV120_streaming',
    emotion: '平和',
    speed: 1.1,
    pitch: 1.1
  },
  // 傲娇模式
  tsundere: {
    voice: 'BV700_streaming',
    emotion: '傲娇',
    speed: 0.9,
    pitch: 1.2
  },
  // 科技高冷模式
  tech_cool: {
    voice: 'BV120_streaming',
    emotion: '平和',
    speed: 0.8,
    pitch: 0.9
  },
  // 治愈暖心模式
  healing: {
    voice: 'BV123_streaming',
    emotion: '开心',
    speed: 0.9,
    pitch: 1.0
  },
  // 防御模式
  defensive: {
    voice: 'BV120_streaming',
    emotion: '生气',
    speed: 1.2,
    pitch: 1.1
  }
} as const

/**
 * TTS工具函数
 */
export class TTSUtils {
  /**
   * 根据人格模式获取语音参数
   */
  static getVoiceParamsByPersonality(personalityId: string): VoiceParams {
    return VOICE_PRESETS[personalityId as keyof typeof VOICE_PRESETS] || VOICE_PRESETS.default
  }
  
  /**
   * 估算语音时长（基于文本长度）
   */
  static estimateDuration(text: string, speed: number = 1.0): number {
    // 中文平均语速约为每分钟200-250字
    const charsPerSecond = (225 / 60) * speed
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
    return Math.ceil(cleanText.length / charsPerSecond)
  }
  
  /**
   * 检查文本是否适合TTS
   */
  static isTextSuitableForTTS(text: string): boolean {
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
    return cleanText.length > 0 && cleanText.length <= 500
  }
}