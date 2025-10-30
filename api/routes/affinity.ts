import * as express from 'express'
import { affinityService } from '../services/affinityService'
import { authenticateToken } from '../middleware/auth'
import type { AffinityChoiceRequest } from '../types/models.js'

const router: express.Router = express.Router()

// 获取用户好感度数据
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' })
    }

    const sessionId = req.query.session_id as string
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const affinity = await affinityService.getUserAffinity(userId)
    res.json({ success: true, data: affinity })
  } catch (error) {
    console.error('获取好感度数据失败:', error)
    res.status(500).json({ success: false, message: '获取好感度数据失败' })
  }
})

// 记录用户选择
router.post('/choice', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' })
    }

    const { choice_type, choice_content, session_id } = req.body
    
    if (!choice_type || !choice_content || !session_id) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数: choice_type, choice_content, session_id' 
      })
    }

    if (!['demon', 'angel', 'neutral'].includes(choice_type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'choice_type 必须是 demon, angel 或 neutral' 
      })
    }

    const choiceRequest: AffinityChoiceRequest = {
      choice_type,
      choice_content,
      session_id
    }

    const updatedAffinity = await affinityService.recordChoice(userId, choiceRequest)
    res.json({ success: true, data: updatedAffinity })
  } catch (error) {
    console.error('记录选择失败:', error)
    res.status(500).json({ success: false, message: '记录选择失败' })
  }
})

// 获取选择历史
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' })
    }

    const sessionId = req.query.session_id as string
    if (!sessionId) {
      return res.status(400).json({ success: false, message: '缺少session_id参数' })
    }

    const limit = parseInt(req.query.limit as string) || 20
    const history = await affinityService.getChoiceHistory(userId, limit)
    res.json({ success: true, data: history })
  } catch (error) {
    console.error('获取选择历史失败:', error)
    res.status(500).json({ success: false, message: '获取选择历史失败' })
  }
})

// 获取好感度统计
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' })
    }

    const stats = await affinityService.getAffinityStats(userId)
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error('获取好感度统计失败:', error)
    res.status(500).json({ success: false, message: '获取好感度统计失败' })
  }
})

// 重置好感度
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: '用户未认证' })
    }

    const resetAffinity = await affinityService.resetUserAffinity(userId)
    res.json({ success: true, data: resetAffinity, message: '好感度已重置' })
  } catch (error) {
    console.error('重置好感度失败:', error)
    res.status(500).json({ success: false, message: '重置好感度失败' })
  }
})

export default router