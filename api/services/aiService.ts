import { personalityService } from './personalityService'
import { PromptTemplateManager, type EmotionContext } from './prompt-templates'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  personality?: string
  timestamp: string
}

export interface AIGenerateRequest {
  content: string
  personality: string
  emotion: any
  history: ChatMessage[]
  memoryFragments?: any[]
}

export interface AIStreamRequest extends AIGenerateRequest {
  onChunk: (chunk: string) => void
}

export interface AIResponse {
  content: string
  suggestions?: string[]
}

export interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
}

class AIService {
  private config: AIConfig = {
    apiKey: process.env.QNAI_API_KEY || 'sk-39460fc22bad8b0c0900f65a94f959d70919a2c2a03d4dab5f27d0bf94a15c98',
    baseUrl: process.env.QNAI_BASE_URL || 'https://api.qnaigc.com/v1',
    model: process.env.QNAI_MODEL || 'deepseek/deepseek-v3.1-terminus',
    maxTokens: 2000,
    temperature: 0.8,
    topP: 0.9,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1
  }

  // 生成AI回应
  async generateResponse(request: AIGenerateRequest): Promise<AIResponse> {
    try {
      // 构建情绪上下文以获取智能选择的人格
      const emotionContext: EmotionContext = {
        userEmotion: request.emotion?.type || 'neutral',
        conversationCount: request.history?.length || 0,
        timeOfDay: this.getTimeOfDay(),
        lastPersonality: this.getLastPersonality(request.history),
        keywords: this.extractKeywords(request.content),
        moralValues: {
          corruption: 0,
          purity: 0
        }
      }

      // 使用智能人格选择
      const selectedPersonality = PromptTemplateManager.selectPersonalityMode(request.content, emotionContext)
      
      // 构建提示词
      const prompt = await this.buildPrompt(request)
      
      // 调用AI API
      const response = await this.callAIAPI(prompt, false)
      
      // 生成建议回复，使用智能选择的人格
      const suggestions = await this.generateSuggestions(response.content, selectedPersonality.id)
      
      return {
        content: response.content,
        suggestions
      }
    } catch (error) {
      console.error('AI generation failed:', error)
      
      // 返回备用回应
      return this.getFallbackResponse(request.personality, request.emotion)
    }
  }

  // 流式生成AI回应
  async generateStreamResponse(request: AIStreamRequest): Promise<void> {
    try {
      // 构建提示词
      const prompt = await this.buildPrompt(request)
      
      // 流式调用AI API
      await this.callAIAPIStream(prompt, request.onChunk)
    } catch (error) {
      console.error('AI stream generation failed:', error)
      
      // 返回备用回应
      const fallback = this.getFallbackResponse(request.personality, request.emotion)
      request.onChunk(fallback.content)
    }
  }

  // 构建提示词
  private async buildPrompt(request: AIGenerateRequest): Promise<string> {
    // 构建情绪上下文
    const emotionContext: EmotionContext = {
      userEmotion: request.emotion?.type || 'neutral',
      conversationCount: request.history?.length || 0,
      timeOfDay: this.getTimeOfDay(),
      lastPersonality: this.getLastPersonality(request.history),
      keywords: this.extractKeywords(request.content),
      moralValues: {
        corruption: 0, // 可以从用户历史数据中计算
        purity: 0
      }
    }

    // 检查是否需要解锁记忆片段
    const memoryTriggers = PromptTemplateManager.checkMemoryUnlock(
      request.content,
      emotionContext.conversationCount
    )

    // 获取记忆片段内容
    const memoryFragmentContents = request.memoryFragments?.map(fragment => 
      `${fragment.title}: ${fragment.content}`
    ) || []

    // 使用PromptTemplateManager构建智能提示词
    const fullPrompt = PromptTemplateManager.buildPrompt(
      request.content,
      emotionContext,
      memoryFragmentContents
    )

    // 记录构建的提示词
    console.log('=== AI Service 提示词构建 ===')
    console.log('情绪上下文:', emotionContext)
    console.log('对话历史长度:', request.history?.length || 0)
    console.log('记忆片段数量:', request.memoryFragments?.length || 0)
    console.log('记忆触发器:', memoryTriggers)
    console.log('用户情绪:', request.emotion ? `${request.emotion.type}(${request.emotion.intensity})` : '无')
    console.log('完整提示词长度:', fullPrompt.length)
    console.log('完整提示词内容:')
    console.log('---')
    console.log(fullPrompt)
    console.log('---')

    return fullPrompt
  }

  // 获取当前时间段
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  // 获取上一次对话的人格类型
  private getLastPersonality(history: ChatMessage[]): 'demon' | 'angel' {
    if (!history || history.length === 0) return 'angel'
    
    const lastAssistantMessage = history
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant')
    
    return (lastAssistantMessage?.personality as 'demon' | 'angel') || 'angel'
  }

  // 提取关键词
  private extractKeywords(content: string): string[] {
    // 简单的关键词提取，可以后续优化
    const keywords = content
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '') // 保留中英文和空格
      .split(/\s+/)
      .filter(word => word.length > 1)
      .slice(0, 10) // 最多10个关键词
    
    return keywords
  }

  // 调用AI API
  private async callAIAPI(prompt: string, stream: boolean = false): Promise<AIResponse> {
    try {
      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个智能AI助手，请根据给定的人格特征和上下文进行回复。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        presence_penalty: this.config.presencePenalty,
        frequency_penalty: this.config.frequencyPenalty,
        stream
      }

      // 记录请求详情
      console.log('=== AI API 请求详情 ===')
      console.log('请求时间:', new Date().toISOString())
      console.log('API 地址:', `${this.config.baseUrl}/chat/completions`)
      console.log('模型:', this.config.model)
      console.log('请求参数:')
      console.log(JSON.stringify({
        model: requestBody.model,
        max_tokens: requestBody.max_tokens,
        temperature: requestBody.temperature,
        top_p: requestBody.top_p,
        presence_penalty: requestBody.presence_penalty,
        frequency_penalty: requestBody.frequency_penalty,
        stream: requestBody.stream,
        messages_count: requestBody.messages.length
      }, null, 2))
      console.log('系统消息:', requestBody.messages[0].content)
      console.log('用户消息长度:', requestBody.messages[1].content.length)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

      let response: Response
      try {
        const startTime = Date.now()
        response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })
        
        const requestDuration = Date.now() - startTime
        clearTimeout(timeoutId)
        
        console.log('请求耗时:', `${requestDuration}ms`)
        console.log('响应状态:', response.status, response.statusText)
        
        if (!response.ok) {
          console.error('API 响应错误:', response.status, response.statusText)
          throw new Error(`AI API error: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') {
          console.error('请求超时 (30秒)')
          throw new Error('AI API request timeout (30s)')
        }
        console.error('请求失败:', error)
        throw error
      }

      const result = await response.json()
      
      // 记录响应详情
      console.log('=== AI API 响应详情 ===')
      console.log('响应时间:', new Date().toISOString())
      console.log('响应结构:')
      console.log(JSON.stringify({
        id: result.id,
        object: result.object,
        created: result.created,
        model: result.model,
        choices_count: result.choices?.length || 0,
        usage: result.usage
      }, null, 2))
      
      if (result.error) {
        console.error('API 返回错误:', result.error)
        throw new Error(`AI API error: ${result.error.message}`)
      }

      const content = result.choices?.[0]?.message?.content || ''
      
      console.log('生成内容长度:', content.length)
      console.log('生成内容:')
      console.log('---')
      console.log(content)
      console.log('---')
      console.log('Token 使用情况:', result.usage)
      
      return {
        content: content.trim()
      }
    } catch (error) {
      console.error('AI API call failed:', error)
      throw error
    }
  }

  // 流式调用AI API
  private async callAIAPIStream(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个智能AI助手，请根据给定的人格特征和上下文进行回复。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: this.config.topP,
        presence_penalty: this.config.presencePenalty,
        frequency_penalty: this.config.frequencyPenalty,
        stream: true
      }

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              return
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              
              if (content) {
                onChunk(content)
              }
            } catch (parseError) {
              // 忽略解析错误，继续处理下一行
            }
          }
        }
      }
    } catch (error) {
      console.error('AI stream API call failed:', error)
      throw error
    }
  }

  // 生成建议回复
  async generateSuggestions(content: string, personality: string): Promise<string[]> {
    const personalitySuggestions: { [key: string]: string[] } = {
      default: ['继续聊聊', '有意思', '还有吗？', '说得对'],
      demon: ['呵呵，有趣', '说下去', '还有什么秘密？', '真相如何？'],
      angel: ['我理解你', '没关系的', '你很棒', '一切都会好的'],
      tsundere: ['哼，知道了', '才不是呢', '随便啦', '你说什么就是什么'],
      tech: ['详细说明', '数据支持', '逻辑分析', '技术细节'],
      warm: ['谢谢你', '真的吗', '好温暖', '我懂你的感受'],
      defensive: ['明白了', '需要澄清', '保持谨慎', '确认信息']
    }

    const baseSuggestions = personalitySuggestions[personality] || personalitySuggestions.default
    
    // 根据内容生成动态建议
    const dynamicSuggestions: string[] = []
    
    if (content.includes('?') || content.includes('？')) {
      dynamicSuggestions.push('让我想想')
    }
    
    if (content.includes('建议') || content.includes('推荐')) {
      dynamicSuggestions.push('还有其他的吗')
    }
    
    if (content.includes('谢谢') || content.includes('感谢')) {
      dynamicSuggestions.push('不客气')
    }

    // 合并并随机选择
    const allSuggestions = [...baseSuggestions, ...dynamicSuggestions]
    const shuffled = allSuggestions.sort(() => 0.5 - Math.random())
    
    return shuffled.slice(0, 3)
  }

  // 生成备用回应
  private getFallbackResponse(personality: string, emotion: any): AIResponse {
    const fallbackResponses: { [key: string]: string[] } = {

      demon: [
        '呵呵，这个问题让我有点困惑呢...',
        '有趣，不过我需要时间来思考真相',
        '桀桀，你这是在考验我吗？'
      ],
      angel: [
        '亲爱的，我现在有点累了，能稍后再聊吗？',
        '孩子，这个问题需要我好好思考一下',
        '不好意思，让我整理一下思绪再回答你'
      ]
    }

    const responses = fallbackResponses[personality] || fallbackResponses.default
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    return {
      content: randomResponse,
      suggestions: ['好的', '没关系', '稍后再聊']
    }
  }



  // 更新配置
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // 获取配置
  getConfig(): AIConfig {
    return { ...this.config }
  }

  // 测试AI连接
  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.callAIAPI('测试连接', false)
      return testResponse.content.length > 0
    } catch (error) {
      console.error('AI connection test failed:', error)
      return false
    }
  }

  // 获取模型信息
  async getModelInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get model info:', error)
      return null
    }
  }

  // 计算token数量（估算）
  estimateTokens(text: string): number {
    // 简单的token估算：中文字符约1.5个token，英文单词约1个token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    const otherChars = text.length - chineseChars - englishWords
    
    return Math.ceil(chineseChars * 1.5 + englishWords + otherChars * 0.5)
  }

  // 截断文本以适应token限制
  truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text)
    
    if (estimatedTokens <= maxTokens) {
      return text
    }
    
    // 按比例截断
    const ratio = maxTokens / estimatedTokens
    const targetLength = Math.floor(text.length * ratio)
    
    return text.substring(0, targetLength) + '...'
  }
}

export const aiService = new AIService()
export default aiService