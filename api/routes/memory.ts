import { Router } from 'express'
import { memoryService } from '../services/memoryService'
import { validateParams, validateQuery, validateBody } from '../utils/validation'
import { asyncHandler } from '../middleware'
import { ResponseUtil, createError } from '../utils/response'

const router = Router()

/**
 * 获取所有记忆片段
 * GET /api/memory/fragments
 */
router.get('/fragments',
  validateQuery([
    { field: 'sessionId', required: false, type: 'string' },
    { field: 'category', required: false, type: 'string' },
    { field: 'rarity', required: false, type: 'string', enum: ['common', 'rare', 'legendary'] },
    { field: 'unlocked', required: false, type: 'string', enum: ['true', 'false'] }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId, category, rarity, unlocked } = req.query
    const fragments = await memoryService.getMemoryFragments({
      sessionId: sessionId as string,
      category: category as string,
      rarity: rarity as 'common' | 'rare' | 'legendary',
      unlocked: unlocked === 'true'
    })
    return ResponseUtil.success(res, fragments)
  })
)

/**
 * 获取特定记忆片段
 * GET /api/memory/fragments/:fragmentId
 */
router.get('/fragments/:fragmentId',
  validateParams([
    { field: 'fragmentId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { fragmentId } = req.params
    const fragment = await memoryService.getMemoryFragment(fragmentId)
    
    if (!fragment) {
      return ResponseUtil.error(res, createError.notFound('记忆片段不存在'))
    }
    
    return ResponseUtil.success(res, fragment)
  })
)

/**
 * 检查解锁条件
 * POST /api/memory/check-unlock
 */
router.post('/check-unlock', 
  validateBody([
    { field: 'sessionId', required: true, type: 'string' },
    { field: 'content', required: false, type: 'string' },
    { field: 'emotion', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId, content, emotion } = req.body
    const result = await memoryService.checkMemoryUnlockConditions({
      sessionId,
      content,
      emotion
    })
    return ResponseUtil.success(res, result)
  })
)

/**
 * 解锁记忆片段
 * POST /api/memory/unlock/:fragmentId
 */
router.post('/unlock/:fragmentId',
  validateParams([
    { field: 'fragmentId', required: true, type: 'string' }
  ]),
  validateBody([
    { field: 'sessionId', required: true, type: 'string' },
    { field: 'reason', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { fragmentId } = req.params
    const { sessionId, reason = 'manual unlock' } = req.body
    
    const result = await memoryService.unlockMemoryFragment(fragmentId, sessionId, 'manual', reason)
    
    return ResponseUtil.success(res, {
      success: result,
      fragmentId
    })
  })
)

/**
 * 获取已解锁的记忆片段
 * GET /api/memory/unlocked/:sessionId
 */
router.get('/unlocked/:sessionId',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const fragments = await memoryService.getUnlockedMemories(sessionId)
    return ResponseUtil.success(res, fragments)
  })
)

/**
 * 获取会话统计信息
 * GET /api/memory/stats/:sessionId
 */
router.get('/stats/:sessionId',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const stats = await memoryService.getMemoryStats(sessionId)
    return ResponseUtil.success(res, stats)
  })
)

/**
 * 获取解锁历史
 * GET /api/memory/unlock-history/:sessionId
 */
router.get('/unlock-history/:sessionId',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  validateQuery([
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const { limit = 20 } = req.query
    
    const history = await memoryService.getUnlockHistory(sessionId, Number(limit))
    return ResponseUtil.success(res, history)
  })
)

/**
 * 获取解锁提示
 * GET /api/memory/hint/:fragmentId
 */
router.get('/hint/:fragmentId',
  validateParams([
    { field: 'fragmentId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { fragmentId } = req.params
    const hint = await memoryService.getUnlockHint(fragmentId)
    return ResponseUtil.success(res, { hint })
  })
)

/**
 * 重置会话记忆
 * DELETE /api/memory/reset/:sessionId
 */
router.delete('/reset/:sessionId',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const result = await memoryService.resetSessionMemories(sessionId)
    return ResponseUtil.success(res, { success: result })
  })
)

/**
 * 导出记忆数据
 * GET /api/memory/export/:sessionId
 */
router.get('/export/:sessionId',
  validateParams([
    { field: 'sessionId', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const data = await memoryService.exportMemoryData(sessionId)
    return ResponseUtil.success(res, data)
  })
)

/**
 * 清理旧数据
 * DELETE /api/memory/cleanup
 */
router.delete('/cleanup',
  validateQuery([
    { field: 'days', required: false, type: 'number', min: 1, max: 365 }
  ]),
  asyncHandler(async (req, res) => {
    const { days = 90 } = req.query
    const deletedCount = await memoryService.cleanupOldUnlocks(Number(days))
    return ResponseUtil.success(res, { deletedCount })
  })
)

/**
 * 获取分类统计
 * GET /api/memory/stats/categories
 */
router.get('/stats/categories',
  validateQuery([
    { field: 'sessionId', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.query
    const categories = ['childhood', 'family', 'school', 'friendship', 'love', 'career', 'travel', 'hobbies']
    const stats = await Promise.all(
      categories.map(async (category) => ({
        category,
        fragments: await memoryService.getMemoriesByCategory(category, sessionId as string)
      }))
    )
    return ResponseUtil.success(res, stats)
  })
)

/**
 * 获取稀有度统计
 * GET /api/memory/stats/rarity
 */
router.get('/stats/rarity',
  validateQuery([
    { field: 'sessionId', required: false, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.query
    const rarities = ['common', 'rare', 'legendary'] as const
    const stats = await Promise.all(
      rarities.map(async (rarity) => ({
        rarity,
        fragments: await memoryService.getMemoriesByRarity(rarity, sessionId as string)
      }))
    )
    return ResponseUtil.success(res, stats)
  })
)

export default router