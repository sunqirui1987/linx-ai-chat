import express from 'express'
import { aiService } from '../services/aiService'

const router = express.Router()

// 生成AI回应
router.post('/generate', async (req, res) => {
  try {
    const {
      content,
      personality = 'angel',
      emotion = { type: 'neutral', intensity: 0.5 },
      history = [],
      memoryFragments = []
    } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({
        error: 'Content is required for AI generation'
      })
    }

    const response = await aiService.generateResponse({
      content: content.trim(),
      personality,
      emotion,
      history,
      memoryFragments
    })

    res.json({
      success: true,
      data: {
        content: response.content,
        suggestions: response.suggestions
      }
    })
  } catch (error) {
    console.error('Error generating AI response:', error)
    res.status(500).json({
      error: 'Failed to generate AI response'
    })
  }
})

// 流式生成AI回应
router.post('/generate/stream', async (req, res) => {
  try {
    const { 
      content, 
      personality = 'angel', 
      emotion = { type: 'neutral', intensity: 0.5 }, 
      history = [],
      memoryFragments = []
    } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({
        error: 'Content is required for AI generation'
      })
    }

    // 设置SSE头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })

    await aiService.generateStreamResponse({
      content: content.trim(),
      personality,
      emotion,
      history,
      memoryFragments,
      onChunk: (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    })

    // 结束流
    res.write('data: [DONE]\n\n')
    res.end()

  } catch (error) {
    console.error('Error generating AI stream:', error)
    res.status(500).json({
      error: 'Failed to generate AI stream'
    })
  }
})

// 生成建议回复
router.post('/suggestions', async (req, res) => {
  try {
    const { personality = 'angel', content = '' } = req.body

    const suggestions = await aiService.generateSuggestions(content, personality)

    res.json({
      success: true,
      data: suggestions
    })
  } catch (error) {
    console.error('Error generating suggestions:', error)
    res.status(500).json({
      error: 'Failed to generate suggestions'
    })
  }
})

// 获取AI配置
router.get('/config', async (req, res) => {
  try {
    const config = aiService.getConfig()

    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error getting AI config:', error)
    res.status(500).json({
      error: 'Failed to get AI config'
    })
  }
})

// 更新AI配置
router.put('/config', async (req, res) => {
  try {
    const config = req.body

    if (!config) {
      return res.status(400).json({
        error: 'Configuration is required'
      })
    }

    aiService.updateConfig(config)

    res.json({
      success: true,
      message: 'AI configuration updated'
    })
  } catch (error) {
    console.error('Error updating AI config:', error)
    res.status(500).json({
      error: 'Failed to update AI config'
    })
  }
})

// 测试AI连接
router.post('/test', async (req, res) => {
  try {
    const { message = '你好，这是一个测试消息' } = req.body

    const result = await aiService.testConnection(message)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error testing AI connection:', error)
    res.status(500).json({
      error: 'Failed to test AI connection'
    })
  }
})

// 获取模型信息
router.get('/model/info', async (req, res) => {
  try {
    const modelInfo = await aiService.getModelInfo()

    res.json({
      success: true,
      data: modelInfo
    })
  } catch (error) {
    console.error('Error getting model info:', error)
    res.status(500).json({
      error: 'Failed to get model info'
    })
  }
})

// 估算token数量
router.post('/tokens/estimate', async (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({
        error: 'Text is required for token estimation'
      })
    }

    const tokenCount = aiService.estimateTokens(text)

    res.json({
      success: true,
      data: {
        text,
        tokenCount,
        characterCount: text.length
      }
    })
  } catch (error) {
    console.error('Error estimating tokens:', error)
    res.status(500).json({
      error: 'Failed to estimate tokens'
    })
  }
})

// 截断文本到指定token限制
router.post('/tokens/truncate', async (req, res) => {
  try {
    const { text, maxTokens = 4000 } = req.body

    if (!text) {
      return res.status(400).json({
        error: 'Text is required for truncation'
      })
    }

    const truncatedText = aiService.truncateToTokenLimit(text, maxTokens)

    res.json({
      success: true,
      data: {
        originalText: text,
        truncatedText,
        originalTokens: aiService.estimateTokens(text),
        truncatedTokens: aiService.estimateTokens(truncatedText),
        maxTokens
      }
    })
  } catch (error) {
    console.error('Error truncating text:', error)
    res.status(500).json({
      error: 'Failed to truncate text'
    })
  }
})

// 批量生成回应
router.post('/generate/batch', async (req, res) => {
  try {
    const { messages, personality = 'default' } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      })
    }

    const results = []

    for (const message of messages) {
      try {
        const response = await aiService.generateResponse({
          content: message.content || message,
          personality,
          emotion: message.emotion || { type: 'neutral', intensity: 0.5 },
          history: message.history || [],
          memoryFragments: message.memoryFragments || []
        })

        results.push({
          input: message,
          success: true,
          output: response.content,
          error: null
        })
      } catch (error) {
        results.push({
          input: message,
          success: false,
          output: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Error batch generating responses:', error)
    res.status(500).json({
      error: 'Failed to batch generate responses'
    })
  }
})

// 获取fallback回应
router.post('/fallback', async (req, res) => {
  try {
    const { personality = 'angel', emotion = { type: 'neutral', intensity: 0.5 } } = req.body

    // 使用简单的fallback响应
    const fallbackMessages = {
      angel: '我在这里陪伴你，有什么想聊的吗？',
      demon: '哼，有什么事就直说吧...'
    }

    const content = fallbackMessages[personality as keyof typeof fallbackMessages] || fallbackMessages.angel

    res.json({
      success: true,
      data: {
        content,
        personality,
        isFallback: true
      }
    })
  } catch (error) {
    console.error('Error getting fallback response:', error)
    res.status(500).json({
      error: 'Failed to get fallback response'
    })
  }
})

// 健康检查
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await aiService.testConnection()

    res.json({
      success: true,
      data: {
        status: healthCheck ? 'healthy' : 'unhealthy',
        aiWorking: healthCheck,
        timestamp: new Date().toISOString(),
        details: { connected: healthCheck }
      }
    })
  } catch (error) {
    console.error('AI health check failed:', error)
    res.status(500).json({
      error: 'AI service unhealthy'
    })
  }
})

// 清理AI缓存（如果有的话）
router.post('/cache/clear', async (req, res) => {
  try {
    // 这里可以实现AI缓存清理逻辑
    // 暂时返回成功响应
    res.json({
      success: true,
      message: 'AI cache cleared'
    })
  } catch (error) {
    console.error('Error clearing AI cache:', error)
    res.status(500).json({
      error: 'Failed to clear AI cache'
    })
  }
})

export default router