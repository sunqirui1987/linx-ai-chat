import express from 'express'
import { chatService } from '../services/chatService'
import { emotionService } from '../services/emotionService'
import { personalityService } from '../services/personalityService'

const router = express.Router()

// 创建新会话
router.post('/sessions', async (req, res) => {
  try {
    const { personality, title, socketId } = req.body

    if (!socketId) {
      return res.status(400).json({
        error: 'Socket ID is required'
      })
    }

    const session = await chatService.createSession({
      personality: personality || 'default',
      title: title || '新对话',
      socketId
    })

    res.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({
      error: 'Failed to create session'
    })
  }
})

// 获取会话列表
router.get('/sessions', async (req, res) => {
  try {
    const { socketId } = req.query

    const sessions = await chatService.getSessions(socketId as string)

    res.json({
      success: true,
      data: sessions
    })
  } catch (error) {
    console.error('Error getting sessions:', error)
    res.status(500).json({
      error: 'Failed to get sessions'
    })
  }
})

// 获取会话详情
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    const session = await chatService.getSession(sessionId)

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('Error getting session:', error)
    res.status(500).json({
      error: 'Failed to get session'
    })
  }
})

// 获取会话消息
router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { limit = 100 } = req.query

    const messages = await chatService.getSessionMessages(
      sessionId,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error getting messages:', error)
    res.status(500).json({
      error: 'Failed to get messages'
    })
  }
})

// 发送消息并生成回应
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { content, personality = 'default', enableTTS = false } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({
        error: 'Message content is required'
      })
    }

    // 分析用户情绪
    const emotion = emotionService.analyzeEmotion(content)

    // 检查是否需要切换人格
    const personalityCheck = await personalityService.checkPersonalitySwitch(
      content.trim(),
      emotion,
      personality
    )

    // 如果需要切换人格，使用新的人格
    const finalPersonality = personalityCheck.shouldSwitch ? personalityCheck.newPersonality : personality

    // 生成AI回应
    const response = await chatService.generateResponse({
      content: content.trim(),
      sessionId,
      personality: finalPersonality,
      emotion,
      enableTTS
    })

    // 获取最新的两条消息（用户消息和AI回复）
    const messages = await chatService.getSessionMessages(sessionId, 2)
    const userMessage = messages.find(m => m.role === 'user')
    const aiMessage = messages.find(m => m.role === 'assistant')

    res.json({
      success: true,
      data: {
        message: userMessage,
        aiResponse: aiMessage,
        audioUrl: response.audioUrl,
        memoryUnlocked: response.memoryUnlocked,
        personalityChanged: personalityCheck.shouldSwitch,
        currentPersonality: finalPersonality,
        personalityChangeReason: personalityCheck.shouldSwitch ? personalityCheck.reason : undefined,
        suggestions: response.suggestions
      }
    })
  } catch (error) {
    console.error('Error generating response:', error)
    res.status(500).json({
      error: 'Failed to generate response'
    })
  }
})

// 更新会话标题
router.put('/sessions/:sessionId/title', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { title } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Title is required'
      })
    }

    const success = await chatService.updateSessionTitle(sessionId, title.trim())

    if (!success) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      message: 'Session title updated'
    })
  } catch (error) {
    console.error('Error updating session title:', error)
    res.status(500).json({
      error: 'Failed to update session title'
    })
  }
})

// 删除会话
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    const success = await chatService.deleteSession(sessionId)

    if (!success) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      message: 'Session deleted'
    })
  } catch (error) {
    console.error('Error deleting session:', error)
    res.status(500).json({
      error: 'Failed to delete session'
    })
  }
})

// 获取会话统计
router.get('/sessions/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params

    const stats = await chatService.getSessionStats(sessionId)

    if (!stats) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting session stats:', error)
    res.status(500).json({
      error: 'Failed to get session stats'
    })
  }
})

// 导出会话数据
router.get('/sessions/:sessionId/export', async (req, res) => {
  try {
    const { sessionId } = req.params

    const exportData = await chatService.exportSessionData(sessionId)

    if (!exportData) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    // 设置下载头
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="session_${sessionId}_${Date.now()}.json"`)

    res.json(exportData)
  } catch (error) {
    console.error('Error exporting session:', error)
    res.status(500).json({
      error: 'Failed to export session'
    })
  }
})

// 清理旧会话
router.post('/cleanup', async (req, res) => {
  try {
    const { daysOld = 30 } = req.body

    const cleanedCount = await chatService.cleanupOldSessions(daysOld)

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old sessions`,
      data: { cleanedCount }
    })
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
    res.status(500).json({
      error: 'Failed to cleanup sessions'
    })
  }
})

export default router