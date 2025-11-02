import * as express from 'express'
import { authenticateToken } from '../middleware/auth'
import { memoryService } from '../services/memoryService'

const router: express.Router = express.Router()

// 获取所有记忆片段（包含解锁状态）
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.query.session_id as string
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const fragments = await memoryService.getMemoryFragments({ sessionId })
    res.json({ success: true, data: fragments })
  } catch (error) {
    console.error('获取记忆片段失败:', error)
    res.status(500).json({ success: false, message: '获取记忆片段失败' })
  }
})

// 获取已解锁的记忆片段
router.get('/unlocked', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.query.session_id as string
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const unlockedFragments = await memoryService.getUnlockedMemories(sessionId)
    res.json({ success: true, data: unlockedFragments })
  } catch (error) {
    console.error('获取已解锁记忆片段失败:', error)
    res.status(500).json({ success: false, message: '获取已解锁记忆片段失败' })
  }
})

// 按类别获取记忆片段
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params
    const sessionId = req.query.session_id as string
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const fragments = await memoryService.getMemoriesByCategory(category, sessionId)
    res.json({ success: true, data: fragments })
  } catch (error) {
    console.error('按类别获取记忆片段失败:', error)
    res.status(500).json({ success: false, message: '按类别获取记忆片段失败' })
  }
})

// 按稀有度获取记忆片段
router.get('/rarity/:rarity', authenticateToken, async (req, res) => {
  try {
    const { rarity } = req.params
    const sessionId = req.query.session_id as string
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    if (!['common', 'rare', 'legendary'].includes(rarity)) {
      return res.status(400).json({ 
        success: false, 
        message: 'rarity 必须是 common, rare 或 legendary' 
      })
    }

    const fragments = await memoryService.getMemoriesByRarity(rarity, sessionId)
    res.json({ success: true, data: fragments })
  } catch (error) {
    console.error('按稀有度获取记忆片段失败:', error)
    res.status(500).json({ success: false, message: '按稀有度获取记忆片段失败' })
  }
})

// 获取单个记忆片段详情
router.get('/:fragmentId', authenticateToken, async (req, res) => {
  try {
    const { fragmentId } = req.params
    const fragment = await memoryService.getMemoryFragment(fragmentId)
    
    if (!fragment) {
      return res.status(404).json({ success: false, message: '记忆片段不存在' })
    }

    res.json({ success: true, data: fragment })
  } catch (error) {
    console.error('获取记忆片段详情失败:', error)
    res.status(500).json({ success: false, message: '获取记忆片段详情失败' })
  }
})

// 检查记忆解锁条件
router.post('/check-unlock', authenticateToken, async (req, res) => {
  try {
    const { session_id, emotion, content, personality_switches } = req.body
    
    if (!session_id) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const result = await memoryService.checkMemoryUnlockConditions({
      sessionId: session_id,
      emotion,
      content,
      personalitySwitches: personality_switches
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('检查记忆解锁条件失败:', error)
    res.status(500).json({ success: false, message: '检查记忆解锁条件失败' })
  }
})

// 手动解锁记忆片段（管理员功能）
router.post('/:fragmentId/unlock', authenticateToken, async (req, res) => {
  try {
    const { fragmentId } = req.params
    const { session_id, reason } = req.body
    
    if (!session_id) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const success = await memoryService.unlockMemoryFragment(
      fragmentId,
      session_id,
      'manual',
      reason || '手动解锁'
    )

    if (success) {
      res.json({ success: true, message: '记忆片段解锁成功' })
    } else {
      res.status(400).json({ success: false, message: '记忆片段解锁失败' })
    }
  } catch (error) {
    console.error('手动解锁记忆片段失败:', error)
    res.status(500).json({ success: false, message: '手动解锁记忆片段失败' })
  }
})

// 获取记忆统计信息
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.query.session_id as string
    const stats = await memoryService.getMemoryStats(sessionId)
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('获取记忆统计信息失败:', error)
    res.status(500).json({ success: false, message: '获取记忆统计信息失败' })
  }
})

// 获取解锁历史
router.get('/history/unlocks', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.query.session_id as string
    const limit = parseInt(req.query.limit as string) || 20
    
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const history = await memoryService.getUnlockHistory(sessionId, limit)
    res.json({ success: true, data: history })
  } catch (error) {
    console.error('获取解锁历史失败:', error)
    res.status(500).json({ success: false, message: '获取解锁历史失败' })
  }
})

// 获取解锁提示
router.get('/:fragmentId/hint', authenticateToken, async (req, res) => {
  try {
    const { fragmentId } = req.params
    const hint = await memoryService.getUnlockHint(fragmentId)
    res.json({ success: true, data: { hint } })
  } catch (error) {
    console.error('获取解锁提示失败:', error)
    res.status(500).json({ success: false, message: '获取解锁提示失败' })
  }
})

// 重置会话记忆（管理员功能）
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.body
    
    if (!session_id) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const success = await memoryService.resetSessionMemories(session_id)
    
    if (success) {
      res.json({ success: true, message: '会话记忆重置成功' })
    } else {
      res.status(400).json({ success: false, message: '会话记忆重置失败' })
    }
  } catch (error) {
    console.error('重置会话记忆失败:', error)
    res.status(500).json({ success: false, message: '重置会话记忆失败' })
  }
})

export default router