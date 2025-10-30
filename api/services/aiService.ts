import { personalityService } from './personalityService'

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
      // 构建提示词
      const prompt = await this.buildPrompt(request)
      
      // 调用AI API
      const response = await this.callAIAPI(prompt, false)
      
      // 生成建议回复
      const suggestions = await this.generateSuggestions(response.content, request.personality)
      
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
    // 获取人格配置
    const personality = personalityService.getPersonality(request.personality)
    if (!personality) {
      throw new Error(`Unknown personality: ${request.personality}`)
    }

    // 构建系统提示词
    let systemPrompt = personality.promptTemplate

    // 添加情绪上下文
    if (request.emotion) {
      systemPrompt += `\n\n当前用户情绪：${request.emotion.type}（强度：${request.emotion.intensity}）`
      systemPrompt += `\n情绪描述：${request.emotion.context || ''}`
    }

    // 添加记忆片段
    if (request.memoryFragments && request.memoryFragments.length > 0) {
      systemPrompt += '\n\n已解锁的记忆片段：'
      request.memoryFragments.forEach((fragment, index) => {
        systemPrompt += `\n${index + 1}. ${fragment.title}: ${fragment.content}`
      })
      systemPrompt += '\n请在适当的时候自然地引用这些记忆片段。'
    }

    // 构建对话历史
    let conversationHistory = ''
    if (request.history && request.history.length > 0) {
      conversationHistory = '\n\n对话历史：\n'
      const recentHistory = request.history.slice(-10) // 只取最近10条
      
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI'
        conversationHistory += `${role}：${msg.content}\n`
      })
    }

    // 构建完整提示词
    const fullPrompt = `${systemPrompt}${conversationHistory}\n\n用户：${request.content}\nAI：`

    // 记录构建的提示词
    console.log('=== AI Service 提示词构建 ===')
    console.log('人格类型:', request.personality)
    console.log('系统提示词:', systemPrompt)
    console.log('对话历史长度:', request.history?.length || 0)
    console.log('记忆片段数量:', request.memoryFragments?.length || 0)
    console.log('用户情绪:', request.emotion ? `${request.emotion.type}(${request.emotion.intensity})` : '无')
    console.log('完整提示词长度:', fullPrompt.length)
    console.log('完整提示词内容:')
    console.log('---')
    console.log(fullPrompt)
    console.log('---')

    return fullPrompt
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
      default: [
        '哈哈，这个问题有点意思，让我想想怎么回答你~',
        '嗯...你这么一说，我还真得好好琢磨琢磨',
        '有意思，不过我现在脑子有点转不过来，稍等一下'
      ],
      tsundere: [
        '哼！你问的问题太难了，我才不想回答呢...',
        '真是的，为什么要问这种问题啊，让人很困扰呢',
        '才、才不是我不知道，只是不想告诉你而已！'
      ],
      tech: [
        '系统正在处理您的请求，请稍候...',
        '当前查询超出了我的处理能力范围，建议重新表述问题',
        '数据分析中，暂时无法提供准确回复'
      ],
      warm: [
        '不好意思呢，我现在有点累了，能稍后再聊这个话题吗？',
        '你的问题很有趣，但我需要一点时间来好好思考',
        '谢谢你的耐心，我正在努力理解你的意思'
      ],
      defensive: [
        '抱歉，当前无法处理此类请求',
        '为了确保准确性，建议您重新描述问题',
        '系统暂时无法提供相关信息'
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