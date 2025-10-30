import { defineStore } from 'pinia'
import { apiClient } from '@/utils/api'
import { socketManager } from '@/utils/socket'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  personality?: string
  emotion?: any
  isTyping?: boolean
  audioUrl?: string
  memoryTriggered?: string[]
  session_id?: string
  sender?: string
  created_at?: string
}

export interface ChatSession {
  id: string
  title: string
  personality: string
  lastMessage?: string
  lastMessageTime?: Date
  messageCount: number
  isActive: boolean
  emotionHistory?: any[]
  memoryUnlocked?: number
  lastPersonality?: string
  updated_at?: string
}

export interface SendMessageResponse {
  message: ChatMessage
  aiResponse: ChatMessage
  suggestions?: string[]
  memoryUnlocked?: any[]
  personalityChanged?: boolean
  currentPersonality?: string
  personalityChangeReason?: string
  audioUrl?: string
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    sessions: [] as ChatSession[],
    currentSessionId: null as string | null,
    messages: [] as ChatMessage[],
    currentPersonality: 'angel' as string,
    isLoading: false,
    isTyping: false,
    conversationCount: 0,
    lastPersonalitySwitch: null as Date | null,
    isGeneratingAudio: false
  }),

  getters: {
    currentSession: (state) => {
      return state.sessions.find(s => s.id === state.currentSessionId) || null
    },
    
    currentMessages: (state) => {
      return state.messages.filter(m => !m.isTyping)
    },
    
    lastMessage: (state) => {
      const msgs = state.messages.filter(m => !m.isTyping)
      return msgs.length > 0 ? msgs[msgs.length - 1] : null
    },

    conversationHistory: (state) => {
      return state.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        personality: m.personality,
        emotion: m.emotion
      }))
    }
  },

  actions: {
    // 保存聊天数据到本地存储
    saveChatDataToLocal() {
      try {
        const chatData = {
          sessions: this.sessions,
          messages: this.messages,
          currentSessionId: this.currentSessionId,
          currentPersonality: this.currentPersonality,
          conversationCount: this.conversationCount,
          lastPersonalitySwitch: this.lastPersonalitySwitch,
          lastSaved: new Date().toISOString()
        }
        localStorage.setItem('chat_data', JSON.stringify(chatData))
        console.log('聊天数据已保存到本地存储')
      } catch (error) {
        console.error('保存聊天数据到本地存储失败:', error)
      }
    },

    // 从本地存储加载聊天数据
    loadChatDataFromLocal() {
      try {
        const savedData = localStorage.getItem('chat_data')
        if (savedData) {
          const chatData = JSON.parse(savedData)
          
          // 恢复数据，但转换时间戳
          this.sessions = chatData.sessions || []
          this.messages = (chatData.messages || []).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
          this.currentSessionId = chatData.currentSessionId
          this.currentPersonality = chatData.currentPersonality || 'angel'
          this.conversationCount = chatData.conversationCount || 0
          this.lastPersonalitySwitch = chatData.lastPersonalitySwitch ? new Date(chatData.lastPersonalitySwitch) : null
          
          console.log('从本地存储加载聊天数据成功')
          return true
        }
      } catch (error) {
        console.error('从本地存储加载聊天数据失败:', error)
      }
      return false
    },

    // 清除本地存储的聊天数据
    clearLocalChatData() {
      try {
        localStorage.removeItem('chat_data')
        console.log('本地聊天数据已清除')
      } catch (error) {
        console.error('清除本地聊天数据失败:', error)
      }
    },

    // 等待Socket连接建立
    async waitForSocketConnection(maxWaitTime = 10000) {
      const startTime = Date.now()
      
      while (!socketManager.isSocketConnected()) {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error('Socket连接超时，请检查网络连接')
        }
        
        // 如果Socket还没有连接，尝试连接
        if (!socketManager.isSocketConnected()) {
          socketManager.connect()
        }
        
        // 等待100ms后再检查
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    },

    async loadSessions() {
      try {
        this.isLoading = true
        
        // 检查Socket连接状态
        if (!socketManager.isSocketConnected()) {
          console.warn('Socket 连接未建立，无法加载会话')
          return
        }
        
        const socketId = socketManager.getSocketId()
        if (!socketId) {
          console.warn('Socket ID 获取失败，无法加载会话')
          return
        }
        
        const response = await apiClient.get('/chat/sessions', {
          params: { socketId }
        })
        
        if (response.data.success) {
          const serverSessions = response.data.data.sessions || []
          
          // 检查当前选中的会话是否还存在于服务器返回的会话列表中
          const currentSessionExists = serverSessions.some((s: ChatSession) => s.id === this.currentSessionId)
          
          // 更新会话列表
          this.sessions = serverSessions
          
          // 清理不存在的会话的消息
          const validSessionIds = new Set(serverSessions.map((s: ChatSession) => s.id))
          this.messages = this.messages.filter(m => !m.session_id || validSessionIds.has(m.session_id))
          
          // 如果当前选中的会话不存在，重新选择
          if (!currentSessionExists) {
            this.currentSessionId = null
            this.currentPersonality = 'angel'
          }
          
          // 如果有会话但没有选中的会话，选中第一个
          if (this.sessions.length > 0 && !this.currentSessionId) {
            await this.selectSession(this.sessions[0].id)
          }
          
          // 保存到本地存储
          this.saveChatDataToLocal()
        }
      } catch (error) {
        console.error('加载会话失败:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async selectSession(sessionId: string) {
      try {
        this.currentSessionId = sessionId
        await this.loadMessages(sessionId)
        
        // 更新当前人格（基于最后一条AI消息）
        const lastAiMessage = this.currentMessages
          .filter(m => m.role === 'assistant')
          .pop()
        
        if (lastAiMessage?.personality) {
          this.currentPersonality = lastAiMessage.personality
        }
      } catch (error) {
        console.error('选择会话失败:', error)
        throw error
      }
    },

    async loadMessages(sessionId: string) {
      try {
        const response = await apiClient.get(`/chat/sessions/${sessionId}/messages`)
        
        if (response.data.success) {
          const sessionMessages = response.data.data.messages || []
          
          // 更新messages数组，移除旧的会话消息并添加新的
          this.messages = this.messages.filter(m => m.session_id !== sessionId)
          this.messages.push(...sessionMessages)
          
          // 按时间排序
          this.messages.sort((a, b) => 
            new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
          )
        }
      } catch (error) {
        console.error('加载消息失败:', error)
        throw error
      }
    },

    async createNewSession() {
      try {
        this.isLoading = true
        
        // 等待Socket连接建立
        await this.waitForSocketConnection()
        
        const socketId = socketManager.getSocketId()
        if (!socketId) {
          throw new Error('Socket ID 获取失败，请稍后重试')
        }
        
        const response = await apiClient.post('/chat/sessions', {
          title: `新对话 ${new Date().toLocaleString()}`,
          socketId
        })
        
        if (response.data.success) {
          const newSession = response.data.data
          this.sessions.unshift(newSession)
          await this.selectSession(newSession.id)
          
          // 重置人格为默认
          this.currentPersonality = 'angel'
          
          return newSession
        } else {
          throw new Error(response.data.message || '创建会话失败')
        }
      } catch (error) {
        console.error('创建会话失败:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async deleteSession(sessionId: string) {
      try {
        const response = await apiClient.delete(`/chat/sessions/${sessionId}`)
        
        if (response.data.success) {
          // 从本地状态中移除会话
          this.sessions = this.sessions.filter(s => s.id !== sessionId)
          this.messages = this.messages.filter(m => m.session_id !== sessionId)
          
          // 如果删除的是当前会话，选择另一个会话
          if (this.currentSessionId === sessionId) {
            if (this.sessions.length > 0) {
              await this.selectSession(this.sessions[0].id)
            } else {
              this.currentSessionId = null
              this.currentPersonality = 'angel'
            }
          }
          
          // 保存到本地存储
          this.saveChatDataToLocal()
        } else {
          throw new Error(response.data.message || '删除会话失败')
        }
      } catch (error: any) {
        console.error('删除会话失败:', error)
        
        // 如果是404错误，说明会话在后端已经不存在，从前端状态中移除
        if (error.response?.status === 404) {
          console.log(`会话 ${sessionId} 在后端不存在，从本地状态中移除`)
          this.sessions = this.sessions.filter(s => s.id !== sessionId)
          this.messages = this.messages.filter(m => m.session_id !== sessionId)
          
          // 如果删除的是当前会话，选择另一个会话
          if (this.currentSessionId === sessionId) {
            if (this.sessions.length > 0) {
              await this.selectSession(this.sessions[0].id)
            } else {
              this.currentSessionId = null
              this.currentPersonality = 'angel'
            }
          }
          
          // 保存到本地存储
          this.saveChatDataToLocal()
          
          // 不抛出错误，因为会话已经被成功移除
          return
        }
        
        throw error
      }
    },

    async sendMessage(content: string, enableTTS = false): Promise<SendMessageResponse> {
      if (!this.currentSessionId) {
        throw new Error('没有选中的会话')
      }

      try {
        this.isLoading = true
        this.isTyping = true

        const response = await apiClient.post(`/chat/sessions/${this.currentSessionId}/messages`, {
          content,
          enableTTS,
          personality: this.currentPersonality
        })

        if (response.data.success) {
          const data = response.data.data
          
          // 添加用户消息和AI回复到本地状态
          this.messages.push(data.message)
          this.messages.push(data.aiResponse)
          
          // 更新当前人格
          if (data.personalityChanged && data.currentPersonality) {
            this.currentPersonality = data.currentPersonality
            this.lastPersonalitySwitch = new Date()
          } else if (data.aiResponse.personality) {
            this.currentPersonality = data.aiResponse.personality
          }
          
          // 更新会话的最后消息信息
          const session = this.sessions.find(s => s.id === this.currentSessionId)
          if (session) {
            session.lastMessage = data.aiResponse.content.substring(0, 50) + '...'
            session.lastMessageTime = new Date(data.aiResponse.created_at)
            session.lastPersonality = data.aiResponse.personality
            session.updated_at = data.aiResponse.created_at
          }
          
          // 保存到本地存储
          this.saveChatDataToLocal()
          
          return {
            message: data.message,
            aiResponse: data.aiResponse,
            audioUrl: data.audioUrl,
            memoryUnlocked: data.memoryUnlocked,
            personalityChanged: data.personalityChanged,
            currentPersonality: data.currentPersonality,
            personalityChangeReason: data.personalityChangeReason
          }
        } else {
          throw new Error(response.data.message || '发送消息失败')
        }
      } catch (error: any) {
        console.error('发送消息失败:', error)
        throw new Error(error.response?.data?.message || '发送消息失败')
      } finally {
        this.isLoading = false
        this.isTyping = false
      }
    },

    async updateSessionTitle(sessionId: string, title: string) {
      try {
        const response = await apiClient.put(`/chat/sessions/${sessionId}`, { title })
        
        if (response.data.success) {
          const session = this.sessions.find(s => s.id === sessionId)
          if (session) {
            session.title = title
          }
        } else {
          throw new Error(response.data.message || '更新会话标题失败')
        }
      } catch (error) {
        console.error('更新会话标题失败:', error)
        throw error
      }
    },

    async clearCurrentSession() {
      if (!this.currentSessionId) return

      try {
        const response = await apiClient.delete(`/chat/sessions/${this.currentSessionId}/messages`)
        
        if (response.data.success) {
          // 清除本地消息
          this.messages = this.messages.filter(m => m.session_id !== this.currentSessionId)
          
          // 重置人格
          this.currentPersonality = 'angel'
          
          // 更新会话信息
          const session = this.sessions.find(s => s.id === this.currentSessionId)
          if (session) {
            session.lastMessage = undefined
            session.lastMessageTime = undefined
            session.lastPersonality = undefined
          }
        } else {
          throw new Error(response.data.message || '清空会话失败')
        }
      } catch (error) {
        console.error('清空会话失败:', error)
        throw error
      }
    },

    clearData() {
      this.sessions = []
      this.messages = []
      this.currentSessionId = null
      this.currentPersonality = 'angel'
    }
  }
})