/**
 * 聊天相关路由
 * 使用新的架构模式：统一响应格式、错误处理、输入验证
 */
import * as express from 'express'
import { chatService } from '../services/chatService'
import { emotionService } from '../services/emotionService'
import { personalityService } from '../services/personalityService'
import { ResponseUtil, createError } from '../utils/response'
import { validateBody, validateQuery, validateParams } from '../utils/validation'
import { asyncHandler } from '../middleware'

const router = express.Router()

// 创建新会话
router.post('/sessions',
  validateBody([
    { field: 'personality', required: false, type: 'string' },
    { field: 'title', required: false, type: 'string', maxLength: 100 }
  ]),
  asyncHandler(async (req, res) => {
    const { personality, title } = req.body

    const session = await chatService.createSession({
      personality: personality || 'default',
      title: title || '新对话'
    })

    ResponseUtil.success(res, session, 201)
  })
)

// 获取会话列表
router.get('/sessions',
  validateQuery([
    { field: 'page', required: false, type: 'number', min: 1 },
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 }
  ]),
  asyncHandler(async (req, res) => {
    const sessions = await chatService.getSessions()

    ResponseUtil.success(res, sessions)
  })
)

// 获取会话详情
router.get('/sessions/:sessionId',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params

    const session = await chatService.getSession(sessionId)

    if (!session) {
      throw createError.sessionNotFound(sessionId)
    }

    ResponseUtil.success(res, session)
  })
)

// 获取会话消息
router.get('/sessions/:sessionId/messages',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  validateQuery([
    { field: 'limit', required: false, type: 'number', min: 1, max: 1000 }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const { limit = 100 } = req.query

    const messages = await chatService.getSessionMessages(
      sessionId,
      parseInt(limit as string)
    )

    ResponseUtil.success(res, messages)
  })
)

// 发送消息并生成回应
router.post('/sessions/:sessionId/messages',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  validateBody([
    { field: 'content', required: true, type: 'string', minLength: 1 },
    { field: 'personality', required: false, type: 'string' },
    { field: 'enableTTS', required: false, type: 'boolean' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const { content, personality = 'default', enableTTS = false } = req.body

    console.log(`[ChatRoute] 收到消息请求 - sessionId: ${sessionId}, personality: ${personality}`)
    console.log(`[ChatRoute] 消息内容: "${content}"`)

    if (!content || !content.trim()) {
      throw createError.messageEmpty()
    }

    // 分析用户情绪
    console.log(`[ChatRoute] 开始分析用户情绪...`)
    const emotion = emotionService.analyzeEmotion(content)
    console.log(`[ChatRoute] 情绪分析结果:`, emotion)

    // 检查是否需要切换人格
    console.log(`[ChatRoute] 检查是否需要切换人格...`)
    const personalityCheck = await personalityService.checkPersonalitySwitch(
      content.trim(),
      emotion,
      personality
    )
    console.log(`[ChatRoute] 人格切换检查结果:`, personalityCheck)

    // 如果需要切换人格，使用新的人格
    const finalPersonality = personalityCheck.shouldSwitch ? personalityCheck.newPersonality : personality
    console.log(`[ChatRoute] 最终使用的人格: ${finalPersonality}`)

    // 生成AI回应
    console.log(`[ChatRoute] 开始生成AI回应...`)
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

    ResponseUtil.success(res, {
      message: userMessage,
      aiResponse: aiMessage,
      audioUrl: response.audioUrl,
      memoryUnlocked: response.memoryUnlocked,
      personalityChanged: personalityCheck.shouldSwitch,
      currentPersonality: finalPersonality,
      personalityChangeReason: personalityCheck.shouldSwitch ? personalityCheck.reason : undefined,
      suggestions: response.suggestions
    })
  })
)

// 更新会话标题
router.put('/sessions/:sessionId/title',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  validateBody([
    { field: 'title', required: true, type: 'string', minLength: 1, maxLength: 100 }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const { title } = req.body

    await chatService.updateSessionTitle(sessionId, title.trim())

    ResponseUtil.success(res, null, 200)
  })
)

// 删除会话
router.delete('/sessions/:sessionId',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params

    const success = await chatService.deleteSession(sessionId)

    if (!success) {
      throw createError.sessionNotFound(sessionId)
    }

    ResponseUtil.success(res, null, 200)
  })
)

// 获取会话统计
router.get('/sessions/:sessionId/stats',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params

    const stats = await chatService.getSessionStats(sessionId)

    if (!stats) {
      throw createError.sessionNotFound(sessionId)
    }

    ResponseUtil.success(res, stats)
  })
)

// 导出会话数据
router.get('/sessions/:sessionId/export',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params

    const exportData = await chatService.exportSessionData(sessionId)

    if (!exportData) {
      throw createError.sessionNotFound(sessionId)
    }

    // 设置下载头
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="session_${sessionId}_${Date.now()}.json"`)

    res.json(exportData)
  })
)

// 清理旧会话
router.post('/cleanup',
  validateBody([
    { field: 'daysOld', required: false, type: 'number', min: 1, max: 365 }
  ]),
  asyncHandler(async (req, res) => {
    const { daysOld = 30 } = req.body

    const cleanedCount = await chatService.cleanupOldSessions(daysOld)

    ResponseUtil.success(res, {
      cleanedCount,
      message: `Cleaned up ${cleanedCount} old sessions`
    })
  })
)

export default router