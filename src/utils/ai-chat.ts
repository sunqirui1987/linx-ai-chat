// AI对话生成系统
import { emotionAnalyzer } from './emotion'
import { personalityManager } from './personality'
import { promptTemplateManager, type PromptContext } from './prompt-templates'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  personality?: string
  emotion?: any
  memoryTriggered?: string[]
}

export interface ChatResponse {
  content: string
  personality: string
  emotion?: any
  memoryUnlocked?: any[]
  audioUrl?: string
  suggestions?: string[]
}

export interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

export class AIChatManager {
  private config: AIConfig
  private conversationHistory: ChatMessage[] = []
  private memoryFragments: any[] = []

  constructor(config: AIConfig) {
    this.config = config
  }

  // 生成AI回应
  async generateResponse(
    userMessage: string,
    currentPersonality?: string,
    memoryFragments: any[] = []
  ): Promise<ChatResponse> {
    try {
      // 1. 分析用户情绪
      const emotion = emotionAnalyzer.analyzeEmotion(userMessage)
      
      // 2. 智能人格切换
      const personalityResult = await personalityManager.smartSwitch(
        userMessage,
        emotion,
        this.conversationHistory
      )
      
      const targetPersonality = personalityResult.personality || currentPersonality || 'default'
      
      // 3. 检查记忆解锁
      const newUnlockedMemories = this.checkMemoryUnlock(userMessage, emotion, memoryFragments)
      
      // 4. 构建提示词上下文
      const promptContext: PromptContext = {
        personality: targetPersonality,
        emotion,
        userMessage,
        conversationHistory: this.conversationHistory,
        memoryFragments: [...memoryFragments, ...newUnlockedMemories],
        currentTime: new Date(),
        userProfile: undefined
      }
      
      // 5. 生成提示词
      const systemPrompt = promptTemplateManager.generatePrompt(promptContext)
      
      // 6. 调用AI API生成回应
      const aiResponse = await this.callAIAPI(systemPrompt, userMessage)
      
      // 7. 生成快速回复建议
      const suggestions = this.generateSuggestions(aiResponse, targetPersonality)
      
      // 8. 更新对话历史
      this.addToHistory({
        id: Date.now().toString(),
        content: userMessage,
        role: 'user',
        timestamp: new Date(),
        emotion
      })
      
      this.addToHistory({
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date(),
        personality: targetPersonality,
        memoryTriggered: newUnlockedMemories.map(m => m.id)
      })
      
      return {
        content: aiResponse,
        personality: targetPersonality,
        emotion,
        memoryUnlocked: newUnlockedMemories,
        suggestions
      }
    } catch (error) {
      console.error('Failed to generate AI response:', error)
      return this.getFallbackResponse(userMessage, currentPersonality)
    }
  }

  // 调用AI API
  private async callAIAPI(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || '抱歉，我现在有点累了，稍后再聊吧~'
    } catch (error) {
      console.error('AI API call failed:', error)
      throw error
    }
  }

  // 检查记忆解锁
  private checkMemoryUnlock(userMessage: string, emotion: any, memoryFragments: any[]): any[] {
    const unlockedMemories: any[] = []
    
    // 基于情绪的记忆解锁
    if (emotion.intensity > 0.7) {
      const emotionMemories = memoryFragments.filter(memory => 
        !memory.is_unlocked && 
        memory.unlock_condition?.emotion === emotion.emotion
      )
      
      if (emotionMemories.length > 0) {
        const randomMemory = emotionMemories[Math.floor(Math.random() * emotionMemories.length)]
        randomMemory.is_unlocked = true
        randomMemory.unlocked_at = new Date()
        unlockedMemories.push(randomMemory)
      }
    }
    
    // 基于关键词的记忆解锁
    const keywords = userMessage.toLowerCase()
    const keywordMemories = memoryFragments.filter(memory => 
      !memory.is_unlocked && 
      memory.unlock_condition?.keywords?.some((keyword: string) => 
        keywords.includes(keyword.toLowerCase())
      )
    )
    
    if (keywordMemories.length > 0 && Math.random() < 0.3) {
      const randomMemory = keywordMemories[Math.floor(Math.random() * keywordMemories.length)]
      randomMemory.is_unlocked = true
      randomMemory.unlocked_at = new Date()
      unlockedMemories.push(randomMemory)
    }
    
    // 基于对话次数的记忆解锁
    const conversationCount = this.conversationHistory.length / 2
    const countMemories = memoryFragments.filter(memory => 
      !memory.is_unlocked && 
      memory.unlock_condition?.conversation_count <= conversationCount
    )
    
    if (countMemories.length > 0 && Math.random() < 0.2) {
      const randomMemory = countMemories[Math.floor(Math.random() * countMemories.length)]
      randomMemory.is_unlocked = true
      randomMemory.unlocked_at = new Date()
      unlockedMemories.push(randomMemory)
    }
    
    return unlockedMemories
  }

  // 生成快速回复建议
  private generateSuggestions(aiResponse: string, personality: string): string[] {
    const suggestions: string[] = []
    
    // 基于人格的建议
    switch (personality) {
      case 'default':
        suggestions.push('继续聊聊', '换个话题', '你觉得呢？')
        break
      case 'tsundere':
        suggestions.push('才不是呢！', '哼，随便你', '你真的这么想？')
        break
      case 'tech':
        suggestions.push('详细解释一下', '有什么数据支持吗？', '还有其他方案吗？')
        break
      case 'warm':
        suggestions.push('谢谢你的关心', '我感觉好多了', '你真温柔')
        break
      case 'defensive':
        suggestions.push('我明白了', '换个话题吧', '这样说不太好')
        break
    }
    
    // 基于回应内容的建议
    if (aiResponse.includes('？') || aiResponse.includes('?')) {
      suggestions.push('是的', '不是的', '我想想')
    }
    
    if (aiResponse.includes('建议') || aiResponse.includes('推荐')) {
      suggestions.push('好主意', '我试试看', '还有别的吗？')
    }
    
    return suggestions.slice(0, 3) // 最多返回3个建议
  }

  // 获取备用回应
  private getFallbackResponse(userMessage: string, personality?: string): ChatResponse {
    const fallbackResponses: { [key: string]: string[] } = {
      default: [
        '哈，你这话说得挺有意思的',
        '嗯...让我想想怎么回你',
        '啧，你总是能说出点不一样的话'
      ],
      tsundere: [
        '哼，我才不知道该怎么回答呢',
        '你这个问题...才不是很难回答呢',
        '切，谁让你问这种问题的'
      ],
      tech: [
        '这个问题需要更多数据分析',
        '让我重新整理一下思路',
        '系统暂时无法处理此类请求'
      ],
      warm: [
        '亲爱的，我现在有点累了呢',
        '宝贝，让我休息一下再回答你好吗',
        '我需要一点时间来想想怎么回答你'
      ],
      defensive: [
        '这个问题我暂时无法回答',
        '让我们换个话题吧',
        '我觉得这样聊下去不太合适'
      ]
    }
    
    const responses = fallbackResponses[personality || 'default'] || fallbackResponses.default
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    return {
      content: randomResponse,
      personality: personality || 'default',
      suggestions: ['好的', '换个话题', '稍后再聊']
    }
  }

  // 添加到对话历史
  private addToHistory(message: ChatMessage) {
    this.conversationHistory.push(message)
    
    // 保持历史记录在合理范围内
    if (this.conversationHistory.length > 100) {
      this.conversationHistory = this.conversationHistory.slice(-50)
    }
  }

  // 清空对话历史
  clearHistory() {
    this.conversationHistory = []
  }

  // 获取对话历史
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory]
  }

  // 更新配置
  updateConfig(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config }
  }

  // 设置记忆片段
  setMemoryFragments(fragments: any[]) {
    this.memoryFragments = fragments
  }

  // 流式生成回应（用于打字机效果）
  async generateStreamResponse(
    userMessage: string,
    currentPersonality?: string,
    memoryFragments: any[] = [],
    onChunk?: (chunk: string) => void
  ): Promise<ChatResponse> {
    try {
      // 1. 分析用户情绪
      const emotion = emotionAnalyzer.analyzeEmotion(userMessage)
      
      // 2. 智能人格切换
      const personalityResult = await personalityManager.smartSwitch(
        userMessage,
        emotion,
        this.conversationHistory
      )
      
      const targetPersonality = personalityResult.personality || currentPersonality || 'default'
      
      // 3. 构建提示词上下文
      const promptContext: PromptContext = {
        personality: targetPersonality,
        emotion,
        userMessage,
        conversationHistory: this.conversationHistory,
        memoryFragments,
        currentTime: new Date()
      }
      
      // 4. 生成提示词
      const systemPrompt = promptTemplateManager.generatePrompt(promptContext)
      
      // 5. 流式调用AI API
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      let fullContent = ''
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content || ''
                if (content) {
                  fullContent += content
                  onChunk?.(content)
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }

      // 6. 检查记忆解锁
      const newUnlockedMemories = this.checkMemoryUnlock(userMessage, emotion, memoryFragments)
      
      // 7. 生成建议
      const suggestions = this.generateSuggestions(fullContent, targetPersonality)
      
      // 8. 更新历史
      this.addToHistory({
        id: Date.now().toString(),
        content: userMessage,
        role: 'user',
        timestamp: new Date(),
        emotion
      })
      
      this.addToHistory({
        id: (Date.now() + 1).toString(),
        content: fullContent,
        role: 'assistant',
        timestamp: new Date(),
        personality: targetPersonality,
        memoryTriggered: newUnlockedMemories.map(m => m.id)
      })

      return {
        content: fullContent,
        personality: targetPersonality,
        emotion,
        memoryUnlocked: newUnlockedMemories,
        suggestions
      }
    } catch (error) {
      console.error('Failed to generate stream response:', error)
      return this.getFallbackResponse(userMessage, currentPersonality)
    }
  }
}

// 默认配置
export const defaultAIConfig: AIConfig = {
  apiKey: process.env.QNAI_API_KEY || '',
  baseUrl: 'https://api.qnaigc.com/v1',
  model: 'gpt-3.5-turbo',
  temperature: 0.8,
  maxTokens: 1000
}

// 导出单例实例
export const aiChatManager = new AIChatManager(defaultAIConfig)