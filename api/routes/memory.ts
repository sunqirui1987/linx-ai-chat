import express from 'express'
import { memoryService } from '../services/memoryService'

const router = express.Router()

// 获取所有记忆片段
router.get('/fragments', async (req, res) => {
  try {
    const { sessionId, category, rarity, unlocked } = req.query

    const fragments = await memoryService.getMemoryFragments({
      sessionId: sessionId as string,
      category: category as string,
      rarity: rarity as 'common' | 'rare' | 'legendary',
      unlocked: unlocked === 'true'
    })

    res.json({
      success: true,
      data: fragments
    })
  } catch (error) {
    console.error('Error getting memory fragments:', error)
    res.status(500).json({
      error: 'Failed to get memory fragments'
    })
  }
})

// 获取特定记忆片段
router.get('/fragments/:fragmentId', async (req, res) => {
  try {
    const { fragmentId } = req.params
    const { sessionId } = req.query

    const fragment = await memoryService.getMemoryFragment(
      fragmentId,
      sessionId as string
    )

    if (!fragment) {
      return res.status(404).json({
        error: 'Memory fragment not found'
      })
    }

    res.json({
      success: true,
      data: fragment
    })
  } catch (error) {
    console.error('Error getting memory fragment:', error)
    res.status(500).json({
      error: 'Failed to get memory fragment'
    })
  }
})

// 检查记忆解锁条件
router.post('/check-unlock', async (req, res) => {
  try {
    const { sessionId, emotion, content, personalitySwitches } = req.body

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required'
      })
    }

    const unlockResults = await memoryService.checkMemoryUnlockConditions({
      sessionId,
      emotion,
      content,
      personalitySwitches
    })

    res.json({
      success: true,
      data: unlockResults
    })
  } catch (error) {
    console.error('Error checking unlock conditions:', error)
    res.status(500).json({
      error: 'Failed to check unlock conditions'
    })
  }
})

// 解锁记忆片段
router.post('/unlock', async (req, res) => {
  try {
    const { sessionId, fragmentId, trigger } = req.body

    if (!sessionId || !fragmentId) {
      return res.status(400).json({
        error: 'Session ID and fragment ID are required'
      })
    }

    const unlockResult = await memoryService.unlockMemoryFragment({
      sessionId,
      fragmentId,
      trigger
    })

    if (!unlockResult.success) {
      return res.status(400).json({
        error: unlockResult.message || 'Failed to unlock memory fragment'
      })
    }

    res.json({
      success: true,
      data: unlockResult
    })
  } catch (error) {
    console.error('Error unlocking memory:', error)
    res.status(500).json({
      error: 'Failed to unlock memory'
    })
  }
})

// 获取已解锁的记忆
router.get('/sessions/:sessionId/unlocked', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { limit = 50 } = req.query

    const unlockedMemories = await memoryService.getUnlockedMemories(
      sessionId,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: unlockedMemories
    })
  } catch (error) {
    console.error('Error getting unlocked memories:', error)
    res.status(500).json({
      error: 'Failed to get unlocked memories'
    })
  }
})

// 获取记忆统计
router.get('/sessions/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params

    const stats = await memoryService.getMemoryStats(sessionId)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting memory stats:', error)
    res.status(500).json({
      error: 'Failed to get memory stats'
    })
  }
})

// 获取解锁历史
router.get('/sessions/:sessionId/unlock-history', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { limit = 100 } = req.query

    const history = await memoryService.getUnlockHistory(
      sessionId,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('Error getting unlock history:', error)
    res.status(500).json({
      error: 'Failed to get unlock history'
    })
  }
})

// 获取解锁提示
router.get('/fragments/:fragmentId/hint', async (req, res) => {
  try {
    const { fragmentId } = req.params
    const { sessionId } = req.query

    const hint = await memoryService.getUnlockHint(
      fragmentId,
      sessionId as string
    )

    if (!hint) {
      return res.status(404).json({
        error: 'Memory fragment not found'
      })
    }

    res.json({
      success: true,
      data: { hint }
    })
  } catch (error) {
    console.error('Error getting unlock hint:', error)
    res.status(500).json({
      error: 'Failed to get unlock hint'
    })
  }
})

// 重置会话记忆
router.post('/sessions/:sessionId/reset', async (req, res) => {
  try {
    const { sessionId } = req.params

    const success = await memoryService.resetSessionMemories(sessionId)

    if (!success) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    res.json({
      success: true,
      message: 'Session memories reset successfully'
    })
  } catch (error) {
    console.error('Error resetting memories:', error)
    res.status(500).json({
      error: 'Failed to reset memories'
    })
  }
})

// 导出记忆数据
router.get('/sessions/:sessionId/export', async (req, res) => {
  try {
    const { sessionId } = req.params

    const exportData = await memoryService.exportMemoryData(sessionId)

    if (!exportData) {
      return res.status(404).json({
        error: 'Session not found'
      })
    }

    // 设置下载头
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="memory_${sessionId}_${Date.now()}.json"`)

    res.json(exportData)
  } catch (error) {
    console.error('Error exporting memory data:', error)
    res.status(500).json({
      error: 'Failed to export memory data'
    })
  }
})

// 清理旧的解锁记录
router.post('/cleanup', async (req, res) => {
  try {
    const { daysOld = 90 } = req.body

    const cleanedCount = await memoryService.cleanupOldUnlockRecords(daysOld)

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old unlock records`,
      data: { cleanedCount }
    })
  } catch (error) {
    console.error('Error cleaning up unlock records:', error)
    res.status(500).json({
      error: 'Failed to cleanup unlock records'
    })
  }
})

// 获取记忆分类统计
router.get('/stats/categories', async (req, res) => {
  try {
    const { sessionId } = req.query

    const stats = await memoryService.getCategoryStats(sessionId as string)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting category stats:', error)
    res.status(500).json({
      error: 'Failed to get category stats'
    })
  }
})

// 获取稀有度统计
router.get('/stats/rarity', async (req, res) => {
  try {
    const { sessionId } = req.query

    const stats = await memoryService.getRarityStats(sessionId as string)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting rarity stats:', error)
    res.status(500).json({
      error: 'Failed to get rarity stats'
    })
  }
})

// 批量检查解锁条件
router.post('/batch-check', async (req, res) => {
  try {
    const { sessions } = req.body

    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json({
        error: 'Sessions array is required'
      })
    }

    const results = []

    for (const session of sessions) {
      try {
        const unlockResults = await memoryService.checkMemoryUnlockConditions(session)
        results.push({
          sessionId: session.sessionId,
          success: true,
          data: unlockResults
        })
      } catch (error) {
        results.push({
          sessionId: session.sessionId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Error batch checking unlock conditions:', error)
    res.status(500).json({
      error: 'Failed to batch check unlock conditions'
    })
  }
})

export default router