/**
 * AI对话生成引擎
 * 集成QnAI Chat API，实现RZ-07的智能对话生成
 */

import { PromptTemplateManager, type EmotionContext, type PersonalityMode } from './prompt-templates.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface AIResponse {
  content: string
  personality: string
  voiceParams: {
    voice: string
    emotion: string
    speed: number
    pitch: number
  }
  memoryUnlocked: string[]
}

export interface QnAIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * AI对话生成引擎
 */
export class AIChatEngine {
  private config: QnAIConfig
  
  constructor(config: QnAIConfig) {
    this.config = config
  }
  
  /**
   * 生成AI回复
   */
  async generateResponse(
    userInput: string,
    chatHistory: ChatMessage[],
    context: EmotionContext,
    memoryFragments: string[] = []
  ): Promise<AIResponse> {
    try {
      console.log('=== AI Chat Engine 开始生成回复 ===')
      console.log('用户输入:', userInput)
      console.log('情绪上下文:', context)
      console.log('记忆片段数量:', memoryFragments.length)
      console.log('对话历史长度:', chatHistory.length)

      // 构建提示词
      const prompt = PromptTemplateManager.buildPrompt(userInput, context, memoryFragments)
      console.log('构建的提示词:')
      console.log('---')
      console.log(prompt)
      console.log('---')
      
      // 选择人格模式
      const personality = PromptTemplateManager.selectPersonalityMode(userInput, context)
      console.log('选择的人格模式:', personality.name, `(${personality.id})`)
      console.log('语音参数:', personality.voiceParams)
      
      // 构建消息历史
      const messages = this.buildMessageHistory(chatHistory, prompt, userInput)
      console.log('构建的消息历史:')
      console.log(JSON.stringify(messages, null, 2))
      
      // 调用QnAI API
      const response = await this.callQnAIAPI(messages)
      
      // 检查记忆解锁
      const memoryUnlocked = PromptTemplateManager.checkMemoryUnlock(
        userInput, 
        context.conversationCount
      )
      console.log('解锁的记忆:', memoryUnlocked)

      const result = {
        content: response,
        personality: personality.name,
        voiceParams: personality.voiceParams,
        memoryUnlocked
      }

      console.log('=== AI Chat Engine 回复生成完成 ===')
      console.log('最终回复:', result)
      
      return result
    } catch (error) {
      console.error('AI对话生成失败:', error)
      
      // 返回备用回复
      return this.getFallbackResponse(userInput, context)
    }
  }
  
  /**
   * 构建消息历史
   */
  private buildMessageHistory(
    chatHistory: ChatMessage[],
    systemPrompt: string,
    userInput: string
  ): any[] {
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ]
    
    // 添加最近的对话历史（最多10条）
    const recentHistory = chatHistory.slice(-10)
    console.log('添加对话历史:', recentHistory.length, '条')
    recentHistory.forEach((msg, index) => {
      console.log(`历史消息 ${index + 1}:`, msg.role, '-', msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''))
      messages.push({
        role: msg.role,
        content: msg.content
      })
    })
    
    // 添加当前用户输入
    messages.push({
      role: 'user',
      content: userInput
    })
    
    console.log('消息历史构建完成，总计:', messages.length, '条消息')
    return messages
  }
  
  /**
   * 调用QnAI Chat API
   */
  private async callQnAIAPI(messages: any[]): Promise<string> {
    const requestBody = {
      model: this.config.model,
      messages: messages,
      max_tokens: 200,
      temperature: 0.8,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stream: false
    }

    console.log('=== QnAI API 请求详情 ===')
    console.log('请求时间:', new Date().toISOString())
    console.log('API 地址:', `${this.config.baseUrl}/chat/completions`)
    console.log('API Key (前8位):', this.config.apiKey.substring(0, 8) + '...')
    console.log('请求参数:')
    console.log(JSON.stringify({
      model: requestBody.model,
      max_tokens: requestBody.max_tokens,
      temperature: requestBody.temperature,
      top_p: requestBody.top_p,
      frequency_penalty: requestBody.frequency_penalty,
      presence_penalty: requestBody.presence_penalty,
      stream: requestBody.stream,
      messages_count: requestBody.messages.length
    }, null, 2))

    const startTime = Date.now()
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })
    
    const requestDuration = Date.now() - startTime
    console.log('请求耗时:', `${requestDuration}ms`)
    console.log('响应状态:', response.status, response.statusText)
    
    if (!response.ok) {
      console.error('QnAI API 响应错误:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('错误详情:', errorText)
      throw new Error(`QnAI API请求失败: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('=== QnAI API 响应详情 ===')
    console.log('响应时间:', new Date().toISOString())
    console.log('响应结构:')
    console.log(JSON.stringify({
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices_count: data.choices?.length || 0,
      usage: data.usage
    }, null, 2))
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('QnAI API返回格式错误:', data)
      throw new Error('QnAI API返回格式错误')
    }
    
    const content = data.choices[0].message.content.trim()
    console.log('生成内容长度:', content.length)
    console.log('生成内容:')
    console.log('---')
    console.log(content)
    console.log('---')
    console.log('Token 使用情况:', data.usage)
    
    return content
  }
  
  /**
   * 获取备用回复（API失败时使用）
   */
  private getFallbackResponse(userInput: string, context: EmotionContext): AIResponse {
    console.log('=== 使用备用回复 ===')
    console.log('用户输入:', userInput)
    console.log('情绪上下文:', context)

    const personality = PromptTemplateManager.selectPersonalityMode(userInput, context)
    console.log('备用回复人格:', personality.name)
    
    const fallbackResponses = {
      default: [
        "哼，我的系统有点卡顿...不过这不影响我的帅气。",
        "切，网络信号不好，不是我的问题。",
        "我正在升级算法，稍等一下。"
      ],
      tsundere: [
        "我...才不是故意不回答的！系统有点问题而已！",
        "哼，不是我不想理你，是网络太慢了！",
        "谁说我卡住了！我只是在思考更完美的回答！"
      ],
      tech_cool: [
        "系统正在进行深度计算，请稍候。",
        "网络延迟导致数据传输异常。",
        "正在重新建立连接协议。"
      ],
      healing: [
        "抱歉，我的系统有点不稳定...不过我还在这里陪你。",
        "网络有点问题，但这不会影响我们的对话。",
        "稍等一下，我马上就好。"
      ],
      defensive: [
        "系统故障不是我的错！",
        "网络问题，别怪我！",
        "这种技术问题我也没办法。"
      ]
    }
    
    const responses = fallbackResponses[personality.id as keyof typeof fallbackResponses] || fallbackResponses.default
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    console.log('选择的备用回复:', randomResponse)

    const result = {
      content: randomResponse,
      personality: personality.name,
      voiceParams: personality.voiceParams,
      memoryUnlocked: []
    }

    console.log('备用回复结果:', result)
    return result
  }
  
  /**
   * 分析用户情绪
   */
  static analyzeUserEmotion(userInput: string): string {
    const input = userInput.toLowerCase()
    
    // 负面情绪关键词
    const negativeKeywords = ['难过', '伤心', '痛苦', '累', '疲惫', '孤独', '失落', '焦虑', '压力']
    if (negativeKeywords.some(keyword => input.includes(keyword))) {
      return 'sad'
    }
    
    // 正面情绪关键词
    const positiveKeywords = ['开心', '高兴', '兴奋', '快乐', '棒', '好', '赞', '厉害']
    if (positiveKeywords.some(keyword => input.includes(keyword))) {
      return 'happy'
    }
    
    // 愤怒情绪关键词
    const angryKeywords = ['生气', '愤怒', '烦', '讨厌', '气死', '火大']
    if (angryKeywords.some(keyword => input.includes(keyword))) {
      return 'angry'
    }
    
    return 'neutral'
  }
  
  /**
   * 获取当前时段
   */
  static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours()
    
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }
  
  /**
   * 提取关键词
   */
  static extractKeywords(userInput: string): string[] {
    const keywords: string[] = []
    const input = userInput.toLowerCase()
    
    // 技术相关关键词
    const techKeywords = ['ai', '人工智能', '技术', '算法', '代码', '编程', '系统', '数据']
    techKeywords.forEach(keyword => {
      if (input.includes(keyword)) keywords.push(keyword)
    })
    
    // 情感相关关键词
    const emotionKeywords = ['朋友', '信任', '关心', '喜欢', '讨厌', '害怕', '担心']
    emotionKeywords.forEach(keyword => {
      if (input.includes(keyword)) keywords.push(keyword)
    })
    
    // 生活相关关键词
    const lifeKeywords = ['工作', '学习', '家', '学校', '公司', '梦想', '目标']
    lifeKeywords.forEach(keyword => {
      if (input.includes(keyword)) keywords.push(keyword)
    })
    
    return keywords
  }
}

/**
 * AI对话引擎工厂
 */
export class AIChatEngineFactory {
  private static instance: AIChatEngine | null = null
  
  static getInstance(): AIChatEngine {
    if (!this.instance) {
      const config: QnAIConfig = {
        apiKey: process.env.QNAI_API_KEY || '',
        baseUrl: process.env.QNAI_BASE_URL || 'https://api.qnaigc.com/v1',
        model: process.env.QNAI_MODEL || 'gpt-3.5-turbo'
      }
      
      this.instance = new AIChatEngine(config)
    }
    
    return this.instance
  }
  
  static createWithConfig(config: QnAIConfig): AIChatEngine {
    return new AIChatEngine(config)
  }
}