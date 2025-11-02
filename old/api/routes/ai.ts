/**
 * AI服务API路由
 * 处理AI响应生成、配置管理、模型信息等
 * 使用新的架构模式：统一响应格式、错误处理、输入验证
 */
import * as express from 'express'
import { aiService } from '../services/aiService'
import { ResponseUtil, createError } from '../utils/response'
import { validateBody, validateQuery } from '../utils/validation'
import { asyncHandler } from '../middleware'

const router = express.Router()

/**
 * 生成AI回应
 * POST /api/ai/generate
 */
router.post('/generate',
  validateBody([
    { field: 'content', required: true, type: 'string', minLength: 1 },
    { field: 'personality', required: false, type: 'string' },
    { field: 'emotion', required: false, type: 'object' },
    { field: 'history', required: false, type: 'array' },
    { field: 'memoryFragments', required: false, type: 'array' }
  ]),
  asyncHandler(async (req, res) => {
    const {
      content,
      personality = 'angel',
      emotion = { type: 'neutral', intensity: 0.5 },
      history = [],
      memoryFragments = []
    } = req.body

    const response = await aiService.generateResponse({
      content: content.trim(),
      personality,
      emotion,
      history,
      memoryFragments
    })

    ResponseUtil.success(res, {
      content: response.content,
      suggestions: response.suggestions
    })
  })
)

/**
 * 获取建议回复
 * POST /api/ai/suggestions
 */
router.post('/suggestions',
  validateBody([
    { field: 'content', required: true, type: 'string', minLength: 1 },
    { field: 'personality', required: false, type: 'string' },
    { field: 'count', required: false, type: 'number', min: 1, max: 10 }
  ]),
  asyncHandler(async (req, res) => {
    const { content, personality = 'angel', count = 3 } = req.body

    const suggestions = await aiService.generateSuggestions(content.trim(), personality)

    ResponseUtil.success(res, { suggestions })
  })
)

/**
 * 获取AI配置
 * GET /api/ai/config
 */
router.get('/config',
  asyncHandler(async (req, res) => {
    const config = aiService.getConfig()
     ResponseUtil.success(res, config)
  })
)

/**
 * 更新AI配置
 * PUT /api/ai/config
 */
router.put('/config',
  validateBody([
    { field: 'model', required: false, type: 'string' },
    { field: 'temperature', required: false, type: 'number', min: 0, max: 2 },
    { field: 'maxTokens', required: false, type: 'number', min: 1, max: 4000 },
    { field: 'topP', required: false, type: 'number', min: 0, max: 1 }
  ]),
  asyncHandler(async (req, res) => {
    aiService.updateConfig(req.body)
     const config = aiService.getConfig()
     ResponseUtil.success(res, config)
  })
)

/**
 * 测试AI连接
 * POST /api/ai/test
 */
router.post('/test',
  validateBody([
    { field: 'message', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { message = 'Hello, this is a test message.' } = req.body
    
    const result = await aiService.testConnection()
     ResponseUtil.success(res, { 
       status: result ? 'connected' : 'disconnected',
       message: message,
       timestamp: new Date().toISOString()
     })
   })
 )

 /**
  * 获取模型信息
  * GET /api/ai/model/info
  */
 router.get('/model/info',
   asyncHandler(async (req, res) => {
     const modelInfo = await aiService.getModelInfo()
     ResponseUtil.success(res, modelInfo)
   })
 )

 /**
  * 估算token数量
  * POST /api/ai/tokens/estimate
  */
 router.post('/tokens/estimate',
   validateBody([
     { field: 'text', required: true, type: 'string', minLength: 1 }
   ]),
   asyncHandler(async (req, res) => {
     const { text } = req.body
     
     const tokenCount = aiService.estimateTokens(text)
     ResponseUtil.success(res, { 
       text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
       tokenCount,
       characterCount: text.length
     })
   })
 )

 /**
  * 截断文本到指定token数量
  * POST /api/ai/tokens/truncate
  */
 router.post('/tokens/truncate',
   validateBody([
     { field: 'text', required: true, type: 'string', minLength: 1 },
     { field: 'maxTokens', required: true, type: 'number', min: 1 }
   ]),
   asyncHandler(async (req, res) => {
     const { text, maxTokens } = req.body
     
     const truncatedText = aiService.truncateToTokenLimit(text, maxTokens)
     ResponseUtil.success(res, {
       originalText: text,
       truncatedText,
       originalTokens: aiService.estimateTokens(text),
       truncatedTokens: aiService.estimateTokens(truncatedText),
       maxTokens
     })
   })
 )

 /**
  * 批量生成AI回应
  * POST /api/ai/generate/batch
  */
 router.post('/generate/batch',
   validateBody([
     { field: 'requests', required: true, type: 'array', minLength: 1, maxLength: 10 },
     { field: 'personality', required: false, type: 'string' }
   ]),
   asyncHandler(async (req, res) => {
     const { requests, personality = 'angel' } = req.body

     // 验证每个请求都有content字段
     for (const request of requests) {
       if (!request.content || typeof request.content !== 'string' || !request.content.trim()) {
         throw createError.badRequest('每个请求都必须包含有效的content字段')
       }
     }

     const responses = []
     for (const request of requests) {
       try {
         const response = await aiService.generateResponse({
           content: request.content.trim(),
           personality,
           emotion: request.emotion || { type: 'neutral', intensity: 0.5 },
           history: request.history || [],
           memoryFragments: request.memoryFragments || []
         })
         responses.push({
           input: request,
           success: true,
           output: response.content,
           error: null
         })
       } catch (error) {
         responses.push({
           input: request,
           success: false,
           output: null,
           error: error instanceof Error ? error.message : 'Unknown error'
         })
       }
     }

     ResponseUtil.success(res, { responses })
   })
 )

 /**
  * 降级处理（当主AI服务不可用时）
  * POST /api/ai/fallback
  */
 router.post('/fallback',
   validateBody([
     { field: 'personality', required: false, type: 'string' }
   ]),
   asyncHandler(async (req, res) => {
     const { personality = 'angel' } = req.body

     // 使用内置的fallback响应
     const fallbackMessages = {
       angel: '我在这里陪伴你，有什么想聊的吗？',
       demon: '哼，有什么事就直说吧...'
     }

     const content = fallbackMessages[personality as keyof typeof fallbackMessages] || fallbackMessages.angel

     ResponseUtil.success(res, {
       content,
       personality,
       isFallback: true
     })
   })
 )

 /**
  * 健康检查
  * GET /api/ai/health
  */
 router.get('/health',
   asyncHandler(async (req, res) => {
     const isHealthy = await aiService.testConnection()
     ResponseUtil.success(res, {
       status: isHealthy ? 'healthy' : 'unhealthy',
       aiWorking: isHealthy,
       timestamp: new Date().toISOString(),
       details: { connected: isHealthy }
     })
   })
 )

 /**
  * 清除缓存
  * POST /api/ai/cache/clear
  */
 router.post('/cache/clear',
   asyncHandler(async (req, res) => {
     // 这里可以实现AI缓存清理逻辑
     // 暂时返回成功响应
     ResponseUtil.success(res, { message: 'AI缓存已清除' })
   })
 )

export default router