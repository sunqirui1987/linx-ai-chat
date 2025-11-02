import { database, type ChatSession, type ChatMessage } from '../database/database'
import { emotionService } from './emotionService'
import { personalityService } from './personalityService'
import { memoryService } from './memoryService'
import { ttsService } from './ttsService'
import { aiService } from './aiService'
import { affinityService } from './affinityService'
import { contentAnalysisService } from './contentAnalysisService'

export interface CreateSessionRequest {
  personality?: string
  title?: string
}

export interface GenerateResponseRequest {
  content: string
  sessionId: string
  personality: string
  emotion: any
  enableTTS?: boolean
}

export interface GenerateStreamRequest extends GenerateResponseRequest {
  onChunk?: (chunk: string) => void
  onComplete?: (response: any) => void
}

export interface ChatResponse {
  content: string
  personality: string
  emotion: any
  audioUrl?: string
  suggestions?: string[]
  memoryUnlocked?: any[]
}

class ChatService {
  private db = database.getDatabase()

  // 创建新会话
  async createSession(request: CreateSessionRequest): Promise<ChatSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    const session: ChatSession = {
      id: sessionId,
      title: request.title || '新对话',
      personality: request.personality || 'default',
      last_message: '',
      last_message_time: now,
      message_count: 0,
      is_active: true,
      emotion_history: JSON.stringify([]),
      memory_unlocked: 0,
      created_at: now,
      updated_at: now
    }

    const insertSession = this.db.prepare(`
      INSERT INTO chat_sessions (
        id, title, personality, last_message, last_message_time,
        message_count, is_active, emotion_history, memory_unlocked,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertSession.run(
      session.id,
      session.title,
      session.personality,
      session.last_message,
      session.last_message_time,
      session.message_count,
      session.is_active ? 1 : 0,
      session.emotion_history,
      session.memory_unlocked,
      session.created_at,
      session.updated_at
    )

    console.log(`Created new session: ${sessionId}`)
    return session
  }

  // 获取会话列表
  async getSessions(): Promise<ChatSession[]> {
    const getSessions = this.db.prepare(`
      SELECT * FROM chat_sessions 
      WHERE is_active = 1 
      ORDER BY updated_at DESC 
      LIMIT 50
    `)

    const sessions = getSessions.all() as ChatSession[]
    return sessions.map(session => ({
      ...session,
      is_active: Boolean(session.is_active),
      emotion_history: JSON.parse(session.emotion_history || '[]')
    }))
  }

  // 获取会话详情
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const getSession = this.db.prepare('SELECT * FROM chat_sessions WHERE id = ?')
    const session = getSession.get(sessionId) as ChatSession | undefined

    if (!session) return null

    return {
      ...session,
      is_active: Boolean(session.is_active),
      emotion_history: JSON.parse(session.emotion_history || '[]')
    }
  }

  // 获取会话消息
  async getSessionMessages(sessionId: string, limit: number = 100): Promise<ChatMessage[]> {
    const getMessages = this.db.prepare(`
      SELECT * FROM chat_messages 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `)

    const messages = getMessages.all(sessionId, limit) as ChatMessage[]
    return messages.reverse().map(message => ({
      ...message,
      emotion: message.emotion ? JSON.parse(message.emotion) : null,
      memory_triggered: JSON.parse(message.memory_triggered || '[]')
    }))
  }

  // 保存消息
  async saveMessage(message: Omit<ChatMessage, 'created_at'>): Promise<ChatMessage> {
    const now = new Date().toISOString()
    const fullMessage: ChatMessage = {
      ...message,
      created_at: now
    }

    const insertMessage = this.db.prepare(`
      INSERT INTO chat_messages (
        id, session_id, content, role, personality, emotion,
        audio_url, memory_triggered, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertMessage.run(
      fullMessage.id,
      fullMessage.session_id,
      fullMessage.content,
      fullMessage.role,
      fullMessage.personality || null,
      fullMessage.emotion ? JSON.stringify(fullMessage.emotion) : null,
      fullMessage.audio_url || null,
      fullMessage.memory_triggered || '[]',
      fullMessage.timestamp,
      fullMessage.created_at
    )

    // 更新会话信息
    await this.updateSessionAfterMessage(fullMessage.session_id, fullMessage)

    return fullMessage
  }

  // 更新会话信息
  private async updateSessionAfterMessage(sessionId: string, message: ChatMessage) {
    const updateSession = this.db.prepare(`
      UPDATE chat_sessions 
      SET last_message = ?, 
          last_message_time = ?, 
          message_count = message_count + 1,
          updated_at = ?
      WHERE id = ?
    `)

    const now = new Date().toISOString()
    updateSession.run(message.content, message.timestamp, now, sessionId)
  }

  // 生成AI回应
  async generateResponse(request: GenerateResponseRequest): Promise<ChatResponse> {
    try {
      // 保存用户消息
      const userMessageId = `msg_${Date.now()}_user`
      const userMessage: Omit<ChatMessage, 'created_at'> = {
        id: userMessageId,
        session_id: request.sessionId,
        content: request.content,
        role: 'user',
        timestamp: new Date().toISOString(),
        emotion: JSON.stringify(request.emotion),
        memory_triggered: '[]'
      }

      await this.saveMessage(userMessage)

      // 获取会话历史
      const history = await this.getSessionMessages(request.sessionId, 20)

      // 🔥 使用统一的内容分析服务进行全面分析
      console.log(`[ChatService] 开始统一内容分析...`)
      const analysisResult = await contentAnalysisService.analyzeContent({
        content: request.content,
        sessionId: request.sessionId,
        currentPersonality: request.personality,
        conversationHistory: history,
        userId: 1 // TODO: 从认证信息中获取真实的用户ID
      })

      console.log(`[ChatService] 分析结果:`, JSON.stringify(analysisResult, null, 2))

      // 根据分析结果确定最终人格
      const finalPersonality = analysisResult.personalityAnalysis.shouldSwitch 
        ? analysisResult.personalityAnalysis.newPersonality || request.personality
        : request.personality

      // 执行记忆解锁
      const unlockedMemories = []
      for (const memoryId of analysisResult.memoryAnalysis.unlockCandidates) {
        const unlocked = await memoryService.unlockMemoryFragment(
          memoryId,
          request.sessionId,
          'auto',
          `LLM分析触发: ${analysisResult.memoryAnalysis.triggeredKeywords.join(', ')}`
        )
        if (unlocked) {
          const memory = await memoryService.getMemoryFragment(memoryId)
          if (memory) unlockedMemories.push(memory)
        }
      }

      // 获取可用的记忆片段
      const availableMemories = await memoryService.getUnlockedMemories(request.sessionId)

      // 生成AI回应
      const aiResponse = await aiService.generateResponse({
        content: request.content,
        personality: finalPersonality,
        emotion: analysisResult.emotion,
        history: history,
        memoryFragments: availableMemories
      })

      // 生成语音（如果需要）
      let audioUrl: string | undefined
      if (request.enableTTS) {
        try {
          const ttsResponse = await ttsService.generateSpeech(
            aiResponse.content,
            finalPersonality
          )
          audioUrl = ttsResponse.audioUrl
        } catch (error) {
          console.error('TTS generation failed:', error)
        }
      }

      // 保存AI消息
      const aiMessageId = `msg_${Date.now()}_ai`
      const aiMessage: Omit<ChatMessage, 'created_at'> = {
        id: aiMessageId,
        session_id: request.sessionId,
        content: aiResponse.content,
        role: 'assistant',
        personality: finalPersonality,
        emotion: JSON.stringify(analysisResult.emotion),
        audio_url: audioUrl,
        memory_triggered: JSON.stringify(unlockedMemories.map(m => m.id)),
        timestamp: new Date().toISOString()
      }

      await this.saveMessage(aiMessage)

      // 记录情绪分析
      await emotionService.saveEmotionAnalysis({
        sessionId: request.sessionId,
        text: request.content,
        emotion: analysisResult.emotion.type,
        confidence: analysisResult.emotion.intensity,
        context: analysisResult.emotion.description
      })

      // 记录好感度（使用统一分析的结果）
      try {
        const userId = 1 // TODO: 从认证信息中获取真实的用户ID
        
        await affinityService.recordChoice(userId, {
          choice_type: analysisResult.affinityAnalysis.choiceType,
          choice_content: request.content,
          session_id: request.sessionId
        })
        
        console.log(`[ChatService] 记录好感度选择: ${analysisResult.affinityAnalysis.choiceType} (${analysisResult.affinityAnalysis.reasoning})`)
      } catch (error) {
        console.error('Failed to record affinity choice:', error)
        // 不影响主要流程，继续执行
      }

      return {
        content: aiResponse.content,
        personality: finalPersonality,
        emotion: analysisResult.emotion,
        audioUrl,
        suggestions: aiResponse.suggestions,
        memoryUnlocked: unlockedMemories
      }

    } catch (error) {
      console.error('Error generating response:', error)
      
      // 返回备用回应
      const fallbackResponse = this.getFallbackResponse(request.personality)
      
      // 保存备用消息
      const aiMessageId = `msg_${Date.now()}_ai_fallback`
      const aiMessage: Omit<ChatMessage, 'created_at'> = {
        id: aiMessageId,
        session_id: request.sessionId,
        content: fallbackResponse.content,
        role: 'assistant',
        personality: request.personality,
        timestamp: new Date().toISOString(),
        memory_triggered: '[]'
      }

      await this.saveMessage(aiMessage)

      return fallbackResponse
    }
  }

  // 获取备用回应
  private getFallbackResponse(personality: string): ChatResponse {
    const fallbackResponses = {
      default: '抱歉，我现在有点累了，稍后再聊吧~',
      tsundere: '哼！我才不是因为累了才不想回答你的问题呢！',
      tech: '系统暂时出现异常，正在进行自我修复...',
      warm: '不好意思呢，我现在需要休息一下，等会儿再陪你聊天好吗？',
      defensive: '警告：当前处于保护模式，暂时无法正常响应。'
    }

    return {
      content: fallbackResponses[personality as keyof typeof fallbackResponses] || fallbackResponses.default,
      personality,
      emotion: { type: 'neutral', intensity: 0.5 },
      suggestions: ['好的', '稍后再聊', '没关系']
    }
  }

  // 删除会话
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const deleteSession = this.db.prepare('DELETE FROM chat_sessions WHERE id = ?')
      const result = deleteSession.run(sessionId)
      return result.changes > 0
    } catch (error) {
      console.error('Error deleting session:', error)
      return false
    }
  }

  // 更新会话标题
  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    try {
      const updateTitle = this.db.prepare(`
        UPDATE chat_sessions 
        SET title = ?, updated_at = ? 
        WHERE id = ?
      `)
      const result = updateTitle.run(title, new Date().toISOString(), sessionId)
      return result.changes > 0
    } catch (error) {
      console.error('Error updating session title:', error)
      return false
    }
  }

  // 获取会话统计
  async getSessionStats(sessionId: string) {
    const session = await this.getSession(sessionId)
    if (!session) return null

    const messageStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as ai_messages,
        MIN(timestamp) as first_message,
        MAX(timestamp) as last_message
      FROM chat_messages 
      WHERE session_id = ?
    `).get(sessionId) as any

    const personalitySwitches = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM personality_switches 
      WHERE session_id = ?
    `).get(sessionId) as { count: number }

    const emotionStats = this.db.prepare(`
      SELECT 
        emotion_type,
        AVG(intensity) as avg_intensity,
        COUNT(*) as count
      FROM emotion_analysis 
      WHERE session_id = ? 
      GROUP BY emotion_type
    `).all(sessionId) as any[]

    return {
      session,
      messages: messageStats,
      personalitySwitches: personalitySwitches.count,
      emotions: emotionStats,
      memoryUnlocked: session.memory_unlocked
    }
  }

  // 导出会话数据
  async exportSessionData(sessionId: string) {
    const session = await this.getSession(sessionId)
    if (!session) return null

    const messages = await this.getSessionMessages(sessionId, 1000)
    const stats = await this.getSessionStats(sessionId)

    return {
      session,
      messages,
      stats,
      exportedAt: new Date().toISOString()
    }
  }

  // 清理旧会话
  async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const deleteOldSessions = this.db.prepare(`
      DELETE FROM chat_sessions 
      WHERE updated_at < ? AND is_active = 0
    `)

    const result = deleteOldSessions.run(cutoffDate.toISOString())
    console.log(`Cleaned up ${result.changes} old sessions`)
    return result.changes
  }
}

export const chatService = new ChatService()
export default chatService