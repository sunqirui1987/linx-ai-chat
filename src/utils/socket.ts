import { io, Socket } from 'socket.io-client'
import { useChatStore } from '@/stores/chat'
import { useMemoryStore } from '@/stores/memory'
import { useSettingsStore } from '@/stores/settings'
import { personalityManager } from './personality'

export interface SocketMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  sessionId: string
  personality?: string
  emotion?: any
  audioUrl?: string
  memoryTriggered?: string[]
}

export interface SocketResponse {
  content: string
  personality: string
  emotion: any
  audioUrl?: string
  suggestions?: string[]
}

export class SocketManager {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private currentSessionId: string | null = null
  private messageQueue: any[] = []

  constructor() {
    // 不在构造函数中自动连接，等待用户登录后手动连接
  }

  // 连接到Socket.io服务器
  connect() {
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    this.setupEventHandlers()
  }

  // 设置事件处理器
  private setupEventHandlers() {
    if (!this.socket) return

    // 连接事件
    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id)
      this.isConnected = true
      this.reconnectAttempts = 0

      // 发送用户连接信息
      this.socket?.emit('user:connect', {
        personality: personalityManager.getCurrentPersonality().id,
        timestamp: new Date()
      })

      // 处理排队的消息
      this.processMessageQueue()
    })

    // 连接确认
    this.socket.on('user:connected', (data: {
      socketId: string
      personality: string
      timestamp: string
    }) => {
      console.log('User connected confirmed:', data)
    })

    // 断开连接
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      this.isConnected = false

      // 自动重连
      if (reason === 'io server disconnect') {
        // 服务器主动断开，不重连
        return
      }

      this.attemptReconnect()
    })

    // 重连事件
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts')
      this.isConnected = true
      this.reconnectAttempts = 0
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error)
    })

    // 消息事件
    this.socket.on('message:user', (message: SocketMessage) => {
      const chatStore = useChatStore()
      chatStore.messages.push({
        ...message,
        timestamp: new Date(message.timestamp)
      })
    })

    this.socket.on('message:ai', (message: SocketMessage) => {
      const chatStore = useChatStore()
      chatStore.messages.push({
        ...message,
        timestamp: new Date(message.timestamp)
      })
      chatStore.isTyping = false
    })

    // AI状态事件
    this.socket.on('ai:typing:start', () => {
      const chatStore = useChatStore()
      chatStore.isTyping = true
    })

    this.socket.on('ai:typing:stop', () => {
      const chatStore = useChatStore()
      chatStore.isTyping = false
    })

    // 流式消息事件
    this.socket.on('ai:stream:start', (data: { streamId: string }) => {
      const chatStore = useChatStore()
      chatStore.isTyping = true
      
      // 添加临时消息用于显示流式内容
      const tempMessage = {
        id: data.streamId,
        content: '',
        role: 'assistant' as const,
        timestamp: new Date(),
        isTyping: true
      }
      chatStore.messages.push(tempMessage)
    })

    this.socket.on('ai:stream:chunk', (data: { streamId: string, chunk: string }) => {
      const chatStore = useChatStore()
      const messageIndex = chatStore.messages.findIndex(m => m.id === data.streamId)
      if (messageIndex > -1) {
        chatStore.messages[messageIndex].content += data.chunk
      }
    })

    this.socket.on('ai:stream:complete', (data: { streamId: string, response: SocketResponse }) => {
      const chatStore = useChatStore()
      const messageIndex = chatStore.messages.findIndex(m => m.id === data.streamId)
      if (messageIndex > -1) {
        chatStore.messages[messageIndex] = {
          ...chatStore.messages[messageIndex],
          content: data.response.content,
          personality: data.response.personality,
          emotion: data.response.emotion,
          audioUrl: data.response.audioUrl,
          isTyping: false
        }
      }
      chatStore.isTyping = false

      // 处理建议
      if (data.response.suggestions) {
        // 可以触发建议更新事件
        this.emit('suggestions:received', data.response.suggestions)
      }
    })

    this.socket.on('ai:stream:error', (error: { message: string, details?: string }) => {
      console.error('Stream error:', error)
      const chatStore = useChatStore()
      chatStore.isTyping = false
      
      // 移除临时消息或显示错误
      this.emit('error', error)
    })

    // 人格切换事件
    this.socket.on('personality:changed', (data: {
      from: string
      to: string
      reason: string
      timestamp: string
    }) => {
      console.log('Personality changed:', data)
      const chatStore = useChatStore()
      chatStore.currentPersonality = data.to
      chatStore.lastPersonalitySwitch = new Date(data.timestamp)
      
      // 更新人格管理器
      personalityManager.switchPersonality(data.to, data.reason || '服务器切换')
      
      // 触发通知
      this.emit('personality:changed', data)
    })

    // 记忆解锁事件
    this.socket.on('memory:unlocked', (data: {
      memories: any[]
      timestamp: string
    }) => {
      console.log('Memory unlocked:', data)
      const memoryStore = useMemoryStore()
      
      data.memories.forEach(memory => {
        memoryStore.unlockFragment(memory.id)
      })
      
      // 触发通知
      this.emit('memory:unlocked', data.memories)
    })

    // 记忆相关事件
    this.socket.on('memory:list', (data: { memories: any[], timestamp: string }) => {
      const memoryStore = useMemoryStore()
      memoryStore.fragments = data.memories
    })

    this.socket.on('memory:stats:response', (data: { stats: any, timestamp: string }) => {
      this.emit('memory:stats', data.stats)
    })

    // 建议更新
    this.socket.on('suggestions:update', (data: { suggestions: string[], timestamp: string }) => {
      this.emit('suggestions:received', data.suggestions)
    })

    // 语音事件
    this.socket.on('audio:playing', (data: { messageId: string, timestamp: string }) => {
      this.emit('audio:playing', data.messageId)
    })

    this.socket.on('audio:stopped', (data: { timestamp: string }) => {
      this.emit('audio:stopped')
    })

    // 会话事件
    this.socket.on('session:created', (data: { session: any, timestamp: string }) => {
      const chatStore = useChatStore()
      chatStore.sessions.unshift(data.session)
      this.currentSessionId = data.session.id
    })

    this.socket.on('session:list:response', (data: { sessions: any[], timestamp: string }) => {
      const chatStore = useChatStore()
      chatStore.sessions = data.sessions
    })

    // 错误处理
    this.socket.on('error', (error: { message: string, details?: string }) => {
      console.error('Socket error:', error)
      this.emit('error', error)
    })
  }

  // 尝试重连
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('reconnect:failed')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      if (!this.isConnected) {
        this.socket?.connect()
      }
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  // 处理消息队列
  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      this.socket?.emit(message.event, message.data)
    }
  }

  // 发送消息
  sendMessage(content: string, sessionId: string, options: {
    enableTTS?: boolean
    personality?: string
    stream?: boolean
  } = {}) {
    if (!this.isConnected || !this.socket) {
      // 添加到队列
      this.messageQueue.push({
        event: options.stream ? 'message:send:stream' : 'message:send',
        data: {
          content,
          sessionId,
          personality: options.personality,
          enableTTS: options.enableTTS || false
        }
      })
      return
    }

    const event = options.stream ? 'message:send:stream' : 'message:send'
    this.socket.emit(event, {
      content,
      sessionId,
      personality: options.personality,
      enableTTS: options.enableTTS || false
    })
  }

  // 切换人格
  switchPersonality(personality: string, reason?: string) {
    if (!this.isConnected || !this.socket) return

    this.socket.emit('personality:switch', {
      personality,
      reason
    })
  }

  // 用户输入状态
  startTyping() {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('user:typing:start')
  }

  stopTyping() {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('user:typing:stop')
  }

  // 获取记忆
  getMemories(filters: { category?: string, rarity?: string } = {}) {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('memory:get', filters)
  }

  // 获取记忆统计
  getMemoryStats() {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('memory:stats')
  }

  // 语音控制
  playAudio(messageId: string) {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('audio:play', { messageId })
  }

  stopAudio() {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('audio:stop')
  }

  // 会话管理
  createSession(personality?: string) {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('session:create', { personality })
  }

  getSessions() {
    if (!this.isConnected || !this.socket) return
    this.socket.emit('session:list')
  }

  // 事件发射器
  private eventHandlers: Map<string, Function[]> = new Map()

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)?.push(handler)
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  // 获取连接状态
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // 重新连接
  reconnect() {
    this.disconnect()
    this.connect()
  }

  // 获取Socket ID
  getSocketId(): string | null {
    return this.socket?.id || null
  }
}

// 导出单例实例
export const socketManager = new SocketManager()

// Vue组合式函数
export function useSocket() {
  const settingsStore = useSettingsStore()

  // 发送消息
  const sendMessage = (content: string, sessionId: string, enableTTS?: boolean) => {
    const useStream = settingsStore.settings.chat.typewriterEffect
    socketManager.sendMessage(content, sessionId, {
      enableTTS: enableTTS ?? settingsStore.settings.voice.autoPlay,
      stream: useStream
    })
  }

  // 切换人格
  const switchPersonality = (personality: string, reason?: string) => {
    socketManager.switchPersonality(personality, reason)
  }

  // 输入状态
  const startTyping = () => socketManager.startTyping()
  const stopTyping = () => socketManager.stopTyping()

  // 连接状态
  const isConnected = () => socketManager.isSocketConnected()

  return {
    sendMessage,
    switchPersonality,
    startTyping,
    stopTyping,
    isConnected,
    socketManager
  }
}