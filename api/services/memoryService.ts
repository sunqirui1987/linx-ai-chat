import { database, type MemoryFragment, type UnlockHistory } from '../database/database'

export interface MemoryUnlockCondition {
  type: 'conversation_count' | 'emotion' | 'keyword' | 'time' | 'personality_switch' | 'complex'
  value: any
  threshold?: number
}

export interface MemoryUnlockResult {
  newUnlocks: MemoryFragment[]
  availableMemories: MemoryFragment[]
  totalUnlocked: number
}

export interface MemoryStats {
  totalFragments: number
  unlockedCount: number
  unlockedByRarity: { [key: string]: number }
  recentUnlocks: MemoryFragment[]
  unlockProgress: number
}

class MemoryService {
  private db = database.getDatabase()

  // 检查记忆解锁
  async checkMemoryUnlock(
    content: string,
    emotion: any,
    sessionId: string
  ): Promise<MemoryUnlockResult> {
    try {
      // 获取所有未解锁的记忆片段
      const getLockedFragments = this.db.prepare(`
        SELECT mf.* FROM memory_fragments mf
        LEFT JOIN unlock_history uh ON mf.id = uh.fragment_id AND uh.session_id = ?
        WHERE uh.id IS NULL
      `)

      const lockedFragments = getLockedFragments.all(sessionId) as MemoryFragment[]
      const newUnlocks: MemoryFragment[] = []

      // 获取会话统计信息
      const sessionStats = await this.getSessionStats(sessionId)

      for (const fragment of lockedFragments) {
        let unlockConditions: MemoryUnlockCondition[] = []
        
        try {
          const parsed = JSON.parse(fragment.unlock_conditions || '[]')
          unlockConditions = Array.isArray(parsed) ? parsed : []
        } catch (error) {
          console.error(`Invalid unlock_conditions for fragment ${fragment.id}:`, error)
          continue
        }
        
        if (unlockConditions.length > 0 && await this.checkUnlockConditions(unlockConditions, {
          content,
          emotion,
          sessionId,
          sessionStats
        })) {
          // 解锁记忆片段
          await this.unlockMemoryFragment(fragment.id, sessionId, 'auto', '条件满足')
          newUnlocks.push(fragment)
          
          console.log(`Memory fragment unlocked: ${fragment.title} (${fragment.id})`)
        }
      }

      // 获取所有已解锁的记忆片段
      const availableMemories = await this.getUnlockedMemories(sessionId)

      return {
        newUnlocks,
        availableMemories,
        totalUnlocked: availableMemories.length
      }
    } catch (error) {
      console.error('Error checking memory unlock:', error)
      return {
        newUnlocks: [],
        availableMemories: [],
        totalUnlocked: 0
      }
    }
  }

  // 检查解锁条件
  private async checkUnlockConditions(
    conditions: MemoryUnlockCondition[],
    context: {
      content: string
      emotion: any
      sessionId: string
      sessionStats: any
    }
  ): Promise<boolean> {
    for (const condition of conditions) {
      if (!(await this.checkSingleCondition(condition, context))) {
        return false // 所有条件都必须满足
      }
    }
    return true
  }

  // 检查单个条件
  private async checkSingleCondition(
    condition: MemoryUnlockCondition,
    context: {
      content: string
      emotion: any
      sessionId: string
      sessionStats: any
    }
  ): Promise<boolean> {
    switch (condition.type) {
      case 'conversation_count':
        return context.sessionStats.messageCount >= condition.value

      case 'emotion':
        if (!context.emotion) return false
        if (condition.value.type && context.emotion.type !== condition.value.type) return false
        if (condition.threshold && context.emotion.intensity < condition.threshold) return false
        return true

      case 'keyword':
        const keywords = Array.isArray(condition.value) ? condition.value : [condition.value]
        return keywords.some(keyword => 
          context.content.toLowerCase().includes(keyword.toLowerCase())
        )

      case 'time':
        return this.checkTimeCondition(condition.value)

      case 'personality_switch':
        const switchCount = await this.getPersonalitySwitchCount(context.sessionId)
        return switchCount >= condition.value

      case 'complex':
        return await this.checkComplexCondition(condition.value, context)

      default:
        return false
    }
  }

  // 检查时间条件
  private checkTimeCondition(timeCondition: any): boolean {
    const now = new Date()
    
    if (timeCondition.type === 'hour_range') {
      const hour = now.getHours()
      return hour >= timeCondition.start && hour <= timeCondition.end
    }
    
    if (timeCondition.type === 'day_of_week') {
      const dayOfWeek = now.getDay()
      return timeCondition.days.includes(dayOfWeek)
    }
    
    if (timeCondition.type === 'date_after') {
      const targetDate = new Date(timeCondition.date)
      return now >= targetDate
    }
    
    return false
  }

  // 检查复杂条件
  private async checkComplexCondition(
    complexCondition: any,
    context: {
      content: string
      emotion: any
      sessionId: string
      sessionStats: any
    }
  ): Promise<boolean> {
    if (complexCondition.operator === 'and') {
      for (const subCondition of complexCondition.conditions) {
        if (!(await this.checkSingleCondition(subCondition, context))) {
          return false
        }
      }
      return true
    }
    
    if (complexCondition.operator === 'or') {
      for (const subCondition of complexCondition.conditions) {
        if (await this.checkSingleCondition(subCondition, context)) {
          return true
        }
      }
      return false
    }
    
    return false
  }

  // 获取会话统计信息
  private async getSessionStats(sessionId: string): Promise<any> {
    try {
      const messageCountQuery = this.db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages WHERE session_id = ?
      `)
      const messageCount = messageCountQuery.get(sessionId) as { count: number }

      const sessionQuery = this.db.prepare(`
        SELECT * FROM chat_sessions WHERE id = ?
      `)
      const session = sessionQuery.get(sessionId)

      return {
        messageCount: messageCount.count,
        session
      }
    } catch (error) {
      console.error('Error getting session stats:', error)
      return { messageCount: 0, session: null }
    }
  }

  // 获取人格切换次数
  private async getPersonalitySwitchCount(sessionId: string): Promise<number> {
    try {
      const switchCountQuery = this.db.prepare(`
        SELECT COUNT(*) as count FROM personality_switches WHERE session_id = ?
      `)
      const result = switchCountQuery.get(sessionId) as { count: number }
      return result.count
    } catch (error) {
      console.error('Error getting personality switch count:', error)
      return 0
    }
  }

  // 检查记忆解锁条件
  async checkMemoryUnlockConditions(params: {
    sessionId: string
    emotion?: string
    content?: string
    personalitySwitches?: number
  }): Promise<{
    unlockableFragments: MemoryFragment[]
    suggestions: string[]
  }> {
    try {
      const { sessionId, emotion, content, personalitySwitches } = params
      
      // 获取所有未解锁的记忆片段
      const unlockedFragments = await this.getMemoryFragments({
        sessionId,
        unlocked: false
      })
      
      const unlockableFragments: MemoryFragment[] = []
      const suggestions: string[] = []
      
      // 获取会话统计信息
      const stats = await this.getMemoryStats(sessionId)
      
      for (const fragment of unlockedFragments) {
        const conditions = fragment.unlock_conditions
        let canUnlock = true
        let missingConditions: string[] = []
        
        // 检查对话次数条件
        if (conditions.conversation_count && stats.totalConversations < conditions.conversation_count) {
          canUnlock = false
          missingConditions.push(`需要进行${conditions.conversation_count}次对话（当前：${stats.totalConversations}次）`)
        }
        
        // 检查情绪条件
        if (conditions.emotion && emotion !== conditions.emotion) {
          canUnlock = false
          missingConditions.push(`需要表达${conditions.emotion}情绪`)
        }
        
        // 检查关键词条件
        if (conditions.keywords && content) {
          const hasKeyword = conditions.keywords.some((keyword: string) => 
            content.toLowerCase().includes(keyword.toLowerCase())
          )
          if (!hasKeyword) {
            canUnlock = false
            missingConditions.push(`需要提及关键词：${conditions.keywords.join('、')}`)
          }
        }
        
        // 检查人格切换条件
        if (conditions.personality_switches && personalitySwitches !== undefined && 
            personalitySwitches < conditions.personality_switches) {
          canUnlock = false
          missingConditions.push(`需要切换${conditions.personality_switches}次人格（当前：${personalitySwitches}次）`)
        }
        
        // 检查时间条件
        if (conditions.time_of_day) {
          const currentHour = new Date().getHours()
          const timeRanges = {
            morning: [6, 12],
            afternoon: [12, 18],
            evening: [18, 22],
            night: [22, 6]
          }
          
          const [start, end] = timeRanges[conditions.time_of_day as keyof typeof timeRanges] || [0, 24]
          const isInTimeRange = end > start ? 
            (currentHour >= start && currentHour < end) :
            (currentHour >= start || currentHour < end)
            
          if (!isInTimeRange) {
            canUnlock = false
            missingConditions.push(`需要在${conditions.time_of_day}时段`)
          }
        }
        
        if (canUnlock) {
          unlockableFragments.push(fragment)
        } else if (missingConditions.length > 0) {
          suggestions.push(`${fragment.title}：${missingConditions.join('，')}`)
        }
      }
      
      return {
        unlockableFragments,
        suggestions
      }
    } catch (error) {
      console.error('Error checking memory unlock conditions:', error)
      return {
        unlockableFragments: [],
        suggestions: []
      }
    }
  }

  // 解锁记忆片段
  async unlockMemoryFragment(
    fragmentId: string,
    sessionId: string,
    unlockType: 'auto' | 'manual',
    reason: string
  ): Promise<boolean> {
    try {
      const unlockRecord: UnlockHistory = {
        id: `unlock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fragment_id: fragmentId,
        session_id: sessionId,
        unlock_type: unlockType,
        reason,
        unlocked_at: new Date().toISOString()
      }

      const insertUnlock = this.db.prepare(`
        INSERT INTO unlock_history (
          id, fragment_id, session_id, unlock_type, reason, unlocked_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)

      insertUnlock.run(
        unlockRecord.id,
        unlockRecord.fragment_id,
        unlockRecord.session_id,
        unlockRecord.unlock_type,
        unlockRecord.reason,
        unlockRecord.unlocked_at
      )

      // 更新会话的记忆解锁数量
      const updateSession = this.db.prepare(`
        UPDATE chat_sessions 
        SET memory_unlocked = memory_unlocked + 1 
        WHERE id = ?
      `)
      updateSession.run(sessionId)

      return true
    } catch (error) {
      console.error('Error unlocking memory fragment:', error)
      return false
    }
  }

  // 获取已解锁的记忆片段
  async getUnlockedMemories(sessionId: string): Promise<MemoryFragment[]> {
    try {
      const getUnlocked = this.db.prepare(`
        SELECT mf.* FROM memory_fragments mf
        INNER JOIN unlock_history uh ON mf.id = uh.fragment_id
        WHERE uh.session_id = ?
        ORDER BY uh.unlocked_at DESC
      `)

      const fragments = getUnlocked.all(sessionId) as MemoryFragment[]
      return fragments.map(fragment => ({
        ...fragment,
        unlock_conditions: JSON.parse(fragment.unlock_conditions)
      }))
    } catch (error) {
      console.error('Error getting unlocked memories:', error)
      return []
    }
  }

  // 获取所有记忆片段
  async getAllMemoryFragments(): Promise<MemoryFragment[]> {
    try {
      const getAll = this.db.prepare('SELECT * FROM memory_fragments ORDER BY rarity, id')
      const fragments = getAll.all() as MemoryFragment[]
      
      return fragments.map(fragment => ({
        ...fragment,
        unlock_conditions: JSON.parse(fragment.unlock_conditions)
      }))
    } catch (error) {
      console.error('Error getting all memory fragments:', error)
      return []
    }
  }

  // 获取记忆片段（带过滤条件）
  async getMemoryFragments(options: {
    sessionId?: string
    category?: string
    rarity?: 'common' | 'rare' | 'legendary'
    unlocked?: boolean
  } = {}): Promise<MemoryFragment[]> {
    try {
      let query = 'SELECT mf.* FROM memory_fragments mf'
      const params: any[] = []
      const conditions: string[] = []

      // 如果需要过滤已解锁/未解锁的记忆
      if (options.sessionId && options.unlocked !== undefined) {
        if (options.unlocked) {
          query += ' INNER JOIN unlock_history uh ON mf.id = uh.fragment_id'
          conditions.push('uh.session_id = ?')
          params.push(options.sessionId)
        } else {
          query += ' LEFT JOIN unlock_history uh ON mf.id = uh.fragment_id AND uh.session_id = ?'
          params.push(options.sessionId)
          conditions.push('uh.id IS NULL')
        }
      }

      // 按类别过滤
      if (options.category) {
        conditions.push('mf.category = ?')
        params.push(options.category)
      }

      // 按稀有度过滤
      if (options.rarity) {
        conditions.push('mf.rarity = ?')
        params.push(options.rarity)
      }

      // 添加WHERE条件
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }

      query += ' ORDER BY mf.rarity, mf.id'

      const getFragments = this.db.prepare(query)
      const fragments = getFragments.all(...params) as MemoryFragment[]
      
      return fragments.map(fragment => ({
        ...fragment,
        unlock_conditions: JSON.parse(fragment.unlock_conditions)
      }))
    } catch (error) {
      console.error('Error getting memory fragments:', error)
      return []
    }
  }

  // 获取记忆片段详情
  async getMemoryFragment(fragmentId: string): Promise<MemoryFragment | null> {
    try {
      const getFragment = this.db.prepare('SELECT * FROM memory_fragments WHERE id = ?')
      const fragment = getFragment.get(fragmentId) as MemoryFragment | undefined

      if (!fragment) return null

      return {
        ...fragment,
        unlock_conditions: JSON.parse(fragment.unlock_conditions)
      }
    } catch (error) {
      console.error('Error getting memory fragment:', error)
      return null
    }
  }

  // 获取记忆统计
  async getMemoryStats(sessionId?: string): Promise<MemoryStats> {
    try {
      // 总记忆片段数
      const totalQuery = this.db.prepare('SELECT COUNT(*) as count FROM memory_fragments')
      const total = totalQuery.get() as { count: number }

      let unlockedCount = 0
      let unlockedByRarity: { [key: string]: number } = {}
      let recentUnlocks: MemoryFragment[] = []

      if (sessionId) {
        // 已解锁数量
        const unlockedQuery = this.db.prepare(`
          SELECT COUNT(*) as count FROM unlock_history WHERE session_id = ?
        `)
        const unlocked = unlockedQuery.get(sessionId) as { count: number }
        unlockedCount = unlocked.count

        // 按稀有度分组的解锁数量
        const rarityQuery = this.db.prepare(`
          SELECT mf.rarity, COUNT(*) as count
          FROM memory_fragments mf
          INNER JOIN unlock_history uh ON mf.id = uh.fragment_id
          WHERE uh.session_id = ?
          GROUP BY mf.rarity
        `)
        const rarityResults = rarityQuery.all(sessionId) as Array<{ rarity: string; count: number }>
        
        rarityResults.forEach(result => {
          unlockedByRarity[result.rarity] = result.count
        })

        // 最近解锁的记忆
        const recentQuery = this.db.prepare(`
          SELECT mf.* FROM memory_fragments mf
          INNER JOIN unlock_history uh ON mf.id = uh.fragment_id
          WHERE uh.session_id = ?
          ORDER BY uh.unlocked_at DESC
          LIMIT 5
        `)
        recentUnlocks = recentQuery.all(sessionId) as MemoryFragment[]
      }

      const unlockProgress = total.count > 0 ? unlockedCount / total.count : 0

      return {
        totalFragments: total.count,
        unlockedCount,
        unlockedByRarity,
        recentUnlocks,
        unlockProgress
      }
    } catch (error) {
      console.error('Error getting memory stats:', error)
      return {
        totalFragments: 0,
        unlockedCount: 0,
        unlockedByRarity: {},
        recentUnlocks: [],
        unlockProgress: 0
      }
    }
  }

  // 获取解锁历史
  async getUnlockHistory(sessionId: string, limit: number = 50): Promise<Array<UnlockHistory & { fragment: MemoryFragment }>> {
    try {
      const getHistory = this.db.prepare(`
        SELECT uh.*, mf.title, mf.content, mf.rarity, mf.category
        FROM unlock_history uh
        INNER JOIN memory_fragments mf ON uh.fragment_id = mf.id
        WHERE uh.session_id = ?
        ORDER BY uh.unlocked_at DESC
        LIMIT ?
      `)

      const history = getHistory.all(sessionId, limit) as Array<UnlockHistory & {
        title: string
        content: string
        rarity: string
        category: string
      }>

      return history.map(record => ({
        id: record.id,
        fragment_id: record.fragment_id,
        session_id: record.session_id,
        unlock_type: record.unlock_type,
        reason: record.reason,
        unlocked_at: record.unlocked_at,
        fragment: {
          id: record.fragment_id,
          title: record.title,
          content: record.content,
          rarity: record.rarity,
          category: record.category,
          unlock_conditions: '[]' // 简化，不需要完整条件
        } as MemoryFragment
      }))
    } catch (error) {
      console.error('Error getting unlock history:', error)
      return []
    }
  }

  // 按类别获取记忆片段
  async getMemoriesByCategory(category: string, sessionId?: string): Promise<MemoryFragment[]> {
    try {
      let query = 'SELECT mf.* FROM memory_fragments mf'
      let params: any[] = [category]

      if (sessionId) {
        query += ` INNER JOIN unlock_history uh ON mf.id = uh.fragment_id
                   WHERE mf.category = ? AND uh.session_id = ?`
        params.push(sessionId)
      } else {
        query += ' WHERE mf.category = ?'
      }

      query += ' ORDER BY mf.rarity, mf.id'

      const getByCategory = this.db.prepare(query)
      const fragments = getByCategory.all(...params) as MemoryFragment[]

      return fragments.map(fragment => ({
        ...fragment,
        unlock_conditions: JSON.parse(fragment.unlock_conditions)
      }))
    } catch (error) {
      console.error('Error getting memories by category:', error)
      return []
    }
  }

  // 按稀有度获取记忆片段
  async getMemoriesByRarity(rarity: string, sessionId?: string): Promise<MemoryFragment[]> {
    try {
      let query = 'SELECT mf.* FROM memory_fragments mf'
      let params: any[] = [rarity]

      if (sessionId) {
        query += ` INNER JOIN unlock_history uh ON mf.id = uh.fragment_id
                   WHERE mf.rarity = ? AND uh.session_id = ?`
        params.push(sessionId)
      } else {
        query += ' WHERE mf.rarity = ?'
      }

      query += ' ORDER BY mf.id'

      const getByRarity = this.db.prepare(query)
      const fragments = getByRarity.all(...params) as MemoryFragment[]

      return fragments.map(fragment => ({
        ...fragment,
        unlock_conditions: JSON.parse(fragment.unlock_conditions)
      }))
    } catch (error) {
      console.error('Error getting memories by rarity:', error)
      return []
    }
  }

  // 获取解锁提示
  async getUnlockHint(fragmentId: string): Promise<string> {
    try {
      const fragment = await this.getMemoryFragment(fragmentId)
      if (!fragment) return '记忆片段不存在'

      const conditions = fragment.unlock_conditions as MemoryUnlockCondition[]
      const hints: string[] = []

      for (const condition of conditions) {
        switch (condition.type) {
          case 'conversation_count':
            hints.push(`需要进行至少 ${condition.value} 轮对话`)
            break
          case 'emotion':
            if (condition.value.type) {
              hints.push(`需要表达 ${condition.value.type} 情绪`)
            }
            if (condition.threshold) {
              hints.push(`情绪强度需要达到 ${condition.threshold}`)
            }
            break
          case 'keyword':
            const keywords = Array.isArray(condition.value) ? condition.value : [condition.value]
            hints.push(`需要提到关键词：${keywords.join('、')}`)
            break
          case 'time':
            if (condition.value.type === 'hour_range') {
              hints.push(`需要在 ${condition.value.start}:00 - ${condition.value.end}:00 时间段`)
            }
            break
          case 'personality_switch':
            hints.push(`需要进行至少 ${condition.value} 次人格切换`)
            break
          case 'complex':
            hints.push('需要满足复杂的组合条件')
            break
        }
      }

      return hints.length > 0 ? hints.join('；') : '解锁条件未知'
    } catch (error) {
      console.error('Error getting unlock hint:', error)
      return '获取提示失败'
    }
  }

  // 重置会话记忆
  async resetSessionMemories(sessionId: string): Promise<boolean> {
    try {
      const deleteUnlocks = this.db.prepare('DELETE FROM unlock_history WHERE session_id = ?')
      const result = deleteUnlocks.run(sessionId)

      // 重置会话的记忆解锁计数
      const updateSession = this.db.prepare(`
        UPDATE chat_sessions SET memory_unlocked = 0 WHERE id = ?
      `)
      updateSession.run(sessionId)

      console.log(`Reset ${result.changes} memory unlocks for session ${sessionId}`)
      return true
    } catch (error) {
      console.error('Error resetting session memories:', error)
      return false
    }
  }

  // 导出记忆数据
  async exportMemoryData(sessionId?: string) {
    try {
      const fragments = await this.getAllMemoryFragments()
      let unlockHistory: any[] = []

      if (sessionId) {
        unlockHistory = await this.getUnlockHistory(sessionId, 1000)
      } else {
        const getAllUnlocks = this.db.prepare(`
          SELECT uh.*, mf.title, mf.rarity, mf.category
          FROM unlock_history uh
          INNER JOIN memory_fragments mf ON uh.fragment_id = mf.id
          ORDER BY uh.unlocked_at DESC
        `)
        unlockHistory = getAllUnlocks.all()
      }

      const stats = await this.getMemoryStats(sessionId)

      return {
        fragments,
        unlockHistory,
        stats,
        exportedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error exporting memory data:', error)
      return null
    }
  }

  // 清理旧的解锁记录
  async cleanupOldUnlocks(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const deleteOld = this.db.prepare(`
        DELETE FROM unlock_history 
        WHERE unlocked_at < ?
      `)

      const result = deleteOld.run(cutoffDate.toISOString())
      console.log(`Cleaned up ${result.changes} old unlock records`)
      return result.changes
    } catch (error) {
      console.error('Error cleaning up old unlocks:', error)
      return 0
    }
  }
}

export const memoryService = new MemoryService()
export default memoryService