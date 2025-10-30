import { Server as SocketIOServer } from 'socket.io'
import { chatService } from '../services/chatService'
import { memoryService } from '../services/memoryService'
import { personalityService } from '../services/personalityService'
import { emotionService } from '../services/emotionService'

export interface SocketUser {
  id: string
  socketId: string
  userId?: string
  currentPersonality: string
  isTyping: boolean
  lastActivity: Date
}

export class SocketManager {
  private io: SocketIOServer
  private connectedUsers: Map<string, SocketUser> = new Map()

  constructor(io: SocketIOServer) {
    this.io = io
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`)

      // 用户连接
      socket.on('user:connect', (data: { userId?: string, personality?: string }) => {
        const user: SocketUser = {
          id: socket.id,
          socketId: socket.id,
          userId: data.userId,
          currentPersonality: data.personality || 'default',
          isTyping: false,
          lastActivity: new Date()
        }
        
        this.connectedUsers.set(socket.id, user)
        
        // 发送连接确认
        socket.emit('user:connected', {
          socketId: socket.id,
          personality: user.currentPersonality,
          timestamp: new Date()
        })

        console.log(`User registered: ${socket.id}, personality: ${user.currentPersonality}`)
      })

      // 发送消息
      socket.on('message:send', async (data: {
        content: string
        sessionId: string
        personality?: string
        enableTTS?: boolean
      }) => {
        try {
          const user = this.connectedUsers.get(socket.id)
          if (!user) {
            socket.emit('error', { message: 'User not found' })
            return
          }

          // 更新用户活动时间
          user.lastActivity = new Date()

          // 发送用户消息确认
          const userMessage = {
            id: `msg_${Date.now()}_user`,
            content: data.content,
            role: 'user' as const,
            timestamp: new Date(),
            sessionId: data.sessionId
          }

          socket.emit('message:user', userMessage)

          // 开始AI回复
          socket.emit('ai:typing:start')

          // 分析情绪
          const emotion = await emotionService.analyzeEmotion(data.content)

          // 检查人格切换
          const personalityResult = await personalityService.checkPersonalitySwitch(
            data.content,
            emotion,
            user.currentPersonality
          )

          if (personalityResult.shouldSwitch) {
            user.currentPersonality = personalityResult.newPersonality
            socket.emit('personality:changed', {
              from: personalityResult.oldPersonality,
              to: personalityResult.newPersonality,
              reason: personalityResult.reason,
              timestamp: new Date()
            })
          }

          // 检查记忆解锁
          const memoryResult = await memoryService.checkMemoryUnlock(
            data.content,
            emotion,
            data.sessionId
          )

          if (memoryResult.newUnlocks.length > 0) {
            socket.emit('memory:unlocked', {
              memories: memoryResult.newUnlocks,
              timestamp: new Date()
            })
          }

          // 生成AI回复
          const aiResponse = await chatService.generateResponse({
            content: data.content,
            sessionId: data.sessionId,
            personality: user.currentPersonality,
            emotion: emotion,
            enableTTS: data.enableTTS || false
          })

          // 发送AI消息
          const aiMessage = {
            id: `msg_${Date.now()}_ai`,
            content: aiResponse.content,
            role: 'assistant' as const,
            timestamp: new Date(),
            sessionId: data.sessionId,
            personality: user.currentPersonality,
            emotion: emotion,
            audioUrl: aiResponse.audioUrl,
            memoryTriggered: memoryResult.newUnlocks.map(m => m.id)
          }

          socket.emit('ai:typing:stop')
          socket.emit('message:ai', aiMessage)

          // 发送快速回复建议
          if (aiResponse.suggestions && aiResponse.suggestions.length > 0) {
            socket.emit('suggestions:update', {
              suggestions: aiResponse.suggestions,
              timestamp: new Date()
            })
          }

        } catch (error) {
          console.error('Error processing message:', error)
          socket.emit('ai:typing:stop')
          socket.emit('error', {
            message: 'Failed to process message',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      // 流式消息发送
      socket.on('message:send:stream', async (data: {
        content: string
        sessionId: string
        personality?: string
        enableTTS?: boolean
      }) => {
        try {
          const user = this.connectedUsers.get(socket.id)
          if (!user) {
            socket.emit('error', { message: 'User not found' })
            return
          }

          user.lastActivity = new Date()

          // 发送用户消息
          const userMessage = {
            id: `msg_${Date.now()}_user`,
            content: data.content,
            role: 'user' as const,
            timestamp: new Date(),
            sessionId: data.sessionId
          }

          socket.emit('message:user', userMessage)

          // 开始流式回复
          const streamId = `stream_${Date.now()}`
          socket.emit('ai:stream:start', { streamId })

          // 分析情绪和处理记忆
          const emotion = await emotionService.analyzeEmotion(data.content)
          const personalityResult = await personalityService.checkPersonalitySwitch(
            data.content,
            emotion,
            user.currentPersonality
          )

          if (personalityResult.shouldSwitch) {
            user.currentPersonality = personalityResult.newPersonality
            socket.emit('personality:changed', {
              from: personalityResult.oldPersonality,
              to: personalityResult.newPersonality,
              reason: personalityResult.reason,
              timestamp: new Date()
            })
          }

          // 生成流式回复
          await chatService.generateStreamResponse({
            content: data.content,
            sessionId: data.sessionId,
            personality: user.currentPersonality,
            emotion: emotion,
            enableTTS: data.enableTTS || false,
            onChunk: (chunk: string) => {
              socket.emit('ai:stream:chunk', {
                streamId,
                chunk,
                timestamp: new Date()
              })
            },
            onComplete: (response) => {
              socket.emit('ai:stream:complete', {
                streamId,
                response,
                timestamp: new Date()
              })
            }
          })

        } catch (error) {
          console.error('Error processing stream message:', error)
          socket.emit('ai:stream:error', {
            message: 'Failed to process stream message',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      // 用户正在输入
      socket.on('user:typing:start', () => {
        const user = this.connectedUsers.get(socket.id)
        if (user) {
          user.isTyping = true
          user.lastActivity = new Date()
          // 可以广播给其他用户（如果是多用户聊天）
        }
      })

      socket.on('user:typing:stop', () => {
        const user = this.connectedUsers.get(socket.id)
        if (user) {
          user.isTyping = false
          user.lastActivity = new Date()
        }
      })

      // 人格切换
      socket.on('personality:switch', async (data: { personality: string, reason?: string }) => {
        const user = this.connectedUsers.get(socket.id)
        if (user) {
          const oldPersonality = user.currentPersonality
          user.currentPersonality = data.personality
          user.lastActivity = new Date()

          socket.emit('personality:changed', {
            from: oldPersonality,
            to: data.personality,
            reason: data.reason || 'Manual switch',
            timestamp: new Date()
          })

          console.log(`Personality switched: ${socket.id} from ${oldPersonality} to ${data.personality}`)
        }
      })

      // 获取记忆片段
      socket.on('memory:get', async (data: { category?: string, rarity?: string }) => {
        try {
          const memories = await memoryService.getMemories(data)
          socket.emit('memory:list', {
            memories,
            timestamp: new Date()
          })
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to get memories',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      // 获取记忆统计
      socket.on('memory:stats', async () => {
        try {
          const stats = await memoryService.getMemoryStats()
          socket.emit('memory:stats:response', {
            stats,
            timestamp: new Date()
          })
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to get memory stats',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      // 语音播放控制
      socket.on('audio:play', (data: { messageId: string }) => {
        socket.emit('audio:playing', {
          messageId: data.messageId,
          timestamp: new Date()
        })
      })

      socket.on('audio:stop', () => {
        socket.emit('audio:stopped', {
          timestamp: new Date()
        })
      })

      // 会话管理
      socket.on('session:create', async (data: { personality?: string }) => {
        try {
          const session = await chatService.createSession({
            personality: data.personality || 'default',
            socketId: socket.id
          })

          socket.emit('session:created', {
            session,
            timestamp: new Date()
          })
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to create session',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      socket.on('session:list', async () => {
        try {
          const sessions = await chatService.getSessions(socket.id)
          socket.emit('session:list:response', {
            sessions,
            timestamp: new Date()
          })
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to get sessions',
            details: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      // 断开连接
      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, reason: ${reason}`)
        this.connectedUsers.delete(socket.id)
      })

      // 错误处理
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error)
      })
    })

    // 定期清理非活跃连接
    setInterval(() => {
      this.cleanupInactiveUsers()
    }, 5 * 60 * 1000) // 每5分钟清理一次
  }

  // 清理非活跃用户
  private cleanupInactiveUsers() {
    const now = new Date()
    const inactiveThreshold = 30 * 60 * 1000 // 30分钟

    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (now.getTime() - user.lastActivity.getTime() > inactiveThreshold) {
        console.log(`Cleaning up inactive user: ${socketId}`)
        this.connectedUsers.delete(socketId)
      }
    }
  }

  // 广播消息给所有连接的用户
  public broadcast(event: string, data: any) {
    this.io.emit(event, data)
  }

  // 发送消息给特定用户
  public sendToUser(socketId: string, event: string, data: any) {
    this.io.to(socketId).emit(event, data)
  }

  // 获取连接的用户数量
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  // 获取所有连接的用户
  public getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values())
  }

  // 关闭Socket.io服务器
  public close() {
    this.io.close()
  }
}

// 初始化方法
export const initializeSocketManager = (io: SocketIOServer) => {
  const manager = new SocketManager(io)
  return manager
}

export default SocketManager