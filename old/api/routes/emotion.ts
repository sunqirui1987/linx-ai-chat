import * as express from 'express'
import { emotionService } from '../services/emotionService'
import { chatService } from '../services/chatService'

const router = express.Router()

// 分析文本情绪
router.post('/analyze', async (req, res) => {
  try {
    const { text, sessionId } = req.body

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Text is required for emotion analysis'
      })
    }

    let contextMessages: string[] = []
    
    // 如果提供了sessionId，获取最近2-3条消息作为上下文
    if (sessionId) {
      try {
        const recentMessages = await chatService.getSessionMessages(sessionId, 3)
        // 只取用户和助手的消息内容，排除当前正在分析的消息
        contextMessages = recentMessages
          .filter(msg => msg.content.trim() !== text.trim())
          .slice(-2) // 取最近2条作为上下文
          .map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      } catch (error) {
        console.warn('Failed to get context messages:', error)
        // 如果获取上下文失败，继续进行分析但不使用上下文
      }
    }

    const emotion = emotionService.analyzeEmotion(text.trim(), contextMessages)

    // 如果提供了sessionId，保存分析结果
    if (sessionId) {
      await emotionService.saveEmotionAnalysis({
        sessionId,
        text: text.trim(),
        emotion: emotion.type,
        confidence: emotion.confidence,
        context: emotion.context
      })
    }

    res.json({
      success: true,
      data: emotion
    })
  } catch (error) {
    console.error('Error analyzing emotion:', error)
    res.status(500).json({
      error: 'Failed to analyze emotion'
    })
  }
})

// 批量分析情绪
router.post('/analyze/batch', async (req, res) => {
  try {
    const { texts, sessionId } = req.body

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({
        error: 'Texts array is required'
      })
    }

    const results = []

    for (const text of texts) {
      if (text && text.trim()) {
        const emotion = emotionService.analyzeEmotion(text.trim())
        results.push({
          text: text.trim(),
          emotion
        })

        // 如果提供了sessionId，保存分析结果
        if (sessionId) {
          await emotionService.saveEmotionAnalysis({
            sessionId,
            text: text.trim(),
            emotion: emotion.type,
            confidence: emotion.confidence,
            context: emotion.context
          })
        }
      }
    }

    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Error batch analyzing emotions:', error)
    res.status(500).json({
      error: 'Failed to batch analyze emotions'
    })
  }
})

// 获取会话情绪历史
router.get('/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { limit = 100 } = req.query

    const history = await emotionService.getSessionEmotionHistory(
      sessionId,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('Error getting emotion history:', error)
    res.status(500).json({
      error: 'Failed to get emotion history'
    })
  }
})

// 获取情绪统计
router.get('/sessions/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params

    const stats = await emotionService.getEmotionStats(sessionId)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting emotion stats:', error)
    res.status(500).json({
      error: 'Failed to get emotion stats'
    })
  }
})

// 获取情绪趋势
router.get('/sessions/:sessionId/trends', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { timeRange = '24' } = req.query

    // 将timeRange转换为小时数
    const hours = parseInt(timeRange as string) || 24

    const trends = await emotionService.getEmotionTrends(
      sessionId,
      hours
    )

    res.json({
      success: true,
      data: trends
    })
  } catch (error) {
    console.error('Error getting emotion trends:', error)
    res.status(500).json({
      error: 'Failed to get emotion trends'
    })
  }
})

// 检测情绪变化
router.post('/detect-change', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required'
      })
    }

    const change = await emotionService.detectEmotionChange(sessionId)

    res.json({
      success: true,
      data: change
    })
  } catch (error) {
    console.error('Error detecting emotion change:', error)
    res.status(500).json({
      error: 'Failed to detect emotion change'
    })
  }
})

// 获取全局情绪统计
router.get('/stats/global', async (req, res) => {
  try {
    const { days = '7' } = req.query

    const daysNum = parseInt(days as string) || 7
    const stats = await emotionService.getEmotionStats(undefined, daysNum)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting global emotion stats:', error)
    res.status(500).json({
      error: 'Failed to get global emotion stats'
    })
  }
})

// 导出情绪数据
router.get('/sessions/:sessionId/export', async (req, res) => {
  try {
    const { sessionId } = req.params

    const exportData = await emotionService.exportEmotionData(sessionId)

    if (!exportData || exportData.analyses.length === 0) {
      return res.status(404).json({
        error: 'No emotion data found for this session'
      })
    }

    // 设置下载头
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="emotion_${sessionId}_${Date.now()}.json"`)

    res.json({
      sessionId,
      exportDate: new Date().toISOString(),
      data: exportData
    })
  } catch (error) {
    console.error('Error exporting emotion data:', error)
    res.status(500).json({
      error: 'Failed to export emotion data'
    })
  }
})

// 清理旧的情绪分析记录
router.post('/cleanup', async (req, res) => {
  try {
    const { daysOld = 90 } = req.body

    const cleanedCount = await emotionService.cleanupOldAnalyses(daysOld)

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old emotion analyses`,
      data: { cleanedCount }
    })
  } catch (error) {
    console.error('Error cleaning up emotion analyses:', error)
    res.status(500).json({
      error: 'Failed to cleanup emotion analyses'
    })
  }
})

// 获取情绪关键词统计
router.get('/keywords/stats', async (req, res) => {
  try {
    const { sessionId, emotion } = req.query

    // 这里可以实现关键词统计逻辑
    // 暂时返回基础的关键词信息
    const keywordStats = {
      positive: ['开心', '高兴', '快乐', '满意', '棒', '好'],
      negative: ['难过', '生气', '失望', '烦躁', '糟糕', '不好'],
      neutral: ['还行', '一般', '普通', '正常', '可以', '行']
    }

    res.json({
      success: true,
      data: keywordStats
    })
  } catch (error) {
    console.error('Error getting keyword stats:', error)
    res.status(500).json({
      error: 'Failed to get keyword stats'
    })
  }
})

// 更新情绪分析配置
router.put('/config', async (req, res) => {
  try {
    const { keywords, weights, thresholds } = req.body

    // 这里可以实现配置更新逻辑
    // 暂时返回成功响应
    res.json({
      success: true,
      message: 'Emotion analysis configuration updated',
      data: {
        keywords,
        weights,
        thresholds,
        updatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error updating emotion config:', error)
    res.status(500).json({
      error: 'Failed to update emotion config'
    })
  }
})

// 获取情绪分析配置
router.get('/config', async (req, res) => {
  try {
    // 返回当前的情绪分析配置
    const config = {
      keywords: {
        positive: ['开心', '高兴', '快乐', '满意', '棒', '好', '喜欢', '爱', '赞'],
        negative: ['难过', '生气', '失望', '烦躁', '糟糕', '不好', '讨厌', '恨', '差'],
        neutral: ['还行', '一般', '普通', '正常', '可以', '行', '知道', '明白', '了解']
      },
      weights: {
        positive: 1.0,
        negative: 1.0,
        neutral: 0.5
      },
      thresholds: {
        high: 0.7,
        medium: 0.4,
        low: 0.2
      }
    }

    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error getting emotion config:', error)
    res.status(500).json({
      error: 'Failed to get emotion config'
    })
  }
})

export default router