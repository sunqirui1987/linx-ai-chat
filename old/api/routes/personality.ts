import * as express from 'express'
import { personalityService } from '../services/personalityService'

const router = express.Router()

// 获取所有人格配置
router.get('/', async (req, res) => {
  try {
    const personalities = personalityService.getAllPersonalities()

    res.json({
      success: true,
      data: personalities
    })
  } catch (error) {
    console.error('Error getting personalities:', error)
    res.status(500).json({
      error: 'Failed to get personalities'
    })
  }
})

// 获取特定人格配置
router.get('/:personalityId', async (req, res) => {
  try {
    const { personalityId } = req.params

    const personality = personalityService.getPersonality(personalityId)

    if (!personality) {
      return res.status(404).json({
        error: 'Personality not found'
      })
    }

    res.json({
      success: true,
      data: personality
    })
  } catch (error) {
    console.error('Error getting personality:', error)
    res.status(500).json({
      error: 'Failed to get personality'
    })
  }
})

// 推荐人格
router.post('/recommend', async (req, res) => {
  try {
    const { emotion, content, sessionId, currentPersonality } = req.body

    if (!emotion || !content) {
      return res.status(400).json({
        error: 'Emotion and content are required'
      })
    }

    const recommendation = await personalityService.recommendPersonality(
      emotion,
      content,
      sessionId || 'default'
    )

    res.json({
      success: true,
      data: recommendation
    })
  } catch (error) {
    console.error('Error recommending personality:', error)
    res.status(500).json({
      error: 'Failed to recommend personality'
    })
  }
})

// 执行人格切换
router.post('/switch', async (req, res) => {
  try {
    const { sessionId, fromPersonality, toPersonality, reason, emotion } = req.body

    if (!sessionId || !toPersonality) {
      return res.status(400).json({
        error: 'Session ID and target personality are required'
      })
    }

    const switchResult = await personalityService.switchPersonality({
      sessionId,
      fromPersonality,
      toPersonality,
      reason,
      triggerType: 'manual',
      emotion
    })

    res.json({
      success: true,
      data: switchResult
    })
  } catch (error) {
    console.error('Error switching personality:', error)
    res.status(500).json({
      error: 'Failed to switch personality'
    })
  }
})

// 获取人格切换历史
router.get('/sessions/:sessionId/switches', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { limit = 50 } = req.query

    const switches = await personalityService.getPersonalitySwitchHistory(
      sessionId,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: switches
    })
  } catch (error) {
    console.error('Error getting switch history:', error)
    res.status(500).json({
      error: 'Failed to get switch history'
    })
  }
})

// 获取人格切换统计
router.get('/sessions/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params

    const stats = await personalityService.getPersonalityStats(sessionId)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting personality stats:', error)
    res.status(500).json({
      error: 'Failed to get personality stats'
    })
  }
})

// 更新人格配置
router.put('/:personalityId', async (req, res) => {
  try {
    const { personalityId } = req.params
    const config = req.body

    if (!config) {
      return res.status(400).json({
        error: 'Personality configuration is required'
      })
    }

    const success = personalityService.updatePersonality(personalityId, config)

    if (!success) {
      return res.status(404).json({
        error: 'Personality not found'
      })
    }

    res.json({
      success: true,
      message: 'Personality updated successfully'
    })
  } catch (error) {
    console.error('Error updating personality:', error)
    res.status(500).json({
      error: 'Failed to update personality'
    })
  }
})

// 添加新人格
router.post('/', async (req, res) => {
  try {
    const config = req.body

    if (!config || !config.id || !config.name) {
      return res.status(400).json({
        error: 'Personality ID and name are required'
      })
    }

    const success = personalityService.addPersonality(config)

    if (!success) {
      return res.status(409).json({
        error: 'Personality already exists'
      })
    }

    res.json({
      success: true,
      message: 'Personality added successfully'
    })
  } catch (error) {
    console.error('Error adding personality:', error)
    res.status(500).json({
      error: 'Failed to add personality'
    })
  }
})

// 删除人格
router.delete('/:personalityId', async (req, res) => {
  try {
    const { personalityId } = req.params

    // 不允许删除默认人格
    if (personalityId === 'default') {
      return res.status(400).json({
        error: 'Cannot delete default personality'
      })
    }

    const success = personalityService.removePersonality(personalityId)

    if (!success) {
      return res.status(404).json({
        error: 'Personality not found'
      })
    }

    res.json({
      success: true,
      message: 'Personality deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting personality:', error)
    res.status(500).json({
      error: 'Failed to delete personality'
    })
  }
})

// 导出人格配置
router.get('/export/all', async (req, res) => {
  try {
    const exportData = personalityService.exportPersonalities()

    // 设置下载头
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="personalities_${Date.now()}.json"`)

    res.json(exportData)
  } catch (error) {
    console.error('Error exporting personalities:', error)
    res.status(500).json({
      error: 'Failed to export personalities'
    })
  }
})

// 导入人格配置
router.post('/import', async (req, res) => {
  try {
    const { personalities, overwrite = false } = req.body

    if (!personalities || !Array.isArray(personalities)) {
      return res.status(400).json({
        error: 'Valid personalities array is required'
      })
    }

    const result = personalityService.importPersonalities(personalities, overwrite)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error importing personalities:', error)
    res.status(500).json({
      error: 'Failed to import personalities'
    })
  }
})

// 测试人格触发条件
router.post('/:personalityId/test-trigger', async (req, res) => {
  try {
    const { personalityId } = req.params
    const { emotion, content, sessionContext } = req.body

    if (!emotion || !content) {
      return res.status(400).json({
        error: 'Emotion and content are required'
      })
    }

    const personality = personalityService.getPersonality(personalityId)

    if (!personality) {
      return res.status(404).json({
        error: 'Personality not found'
      })
    }

    const score = personalityService.calculatePersonalityScore(
      personality,
      emotion,
      content,
      sessionContext
    )

    res.json({
      success: true,
      data: {
        personalityId,
        score,
        triggered: score > 0.6
      }
    })
  } catch (error) {
    console.error('Error testing trigger:', error)
    res.status(500).json({
      error: 'Failed to test trigger'
    })
  }
})

export default router