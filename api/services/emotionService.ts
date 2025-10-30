import { database, type EmotionAnalysis } from '../database/database'

export interface EmotionResult {
  type: string
  intensity: number
  confidence: number
  keywords: string[]
  context: string
  personality?: 'demon' | 'angel'
  personalityColor?: string
  moralValues?: {
    corruption: number
    purity: number
  }
}

export interface EmotionAnalysisRequest {
  sessionId: string
  text: string
  emotion: string
  confidence: number
  context: string
  personality?: 'demon' | 'angel'
  moralValues?: {
    corruption: number
    purity: number
  }
}

export interface EmotionStats {
  totalAnalyses: number
  emotionDistribution: { [key: string]: number }
  averageIntensity: number
  personalityDistribution: { demon: number; angel: number }
  moralTrends: {
    corruption: number[]
    purity: number[]
  }
  recentTrends: Array<{
    date: string
    emotions: { [key: string]: number }
    personality: 'demon' | 'angel'
  }>
}

class EmotionService {
  private db = database.getDatabase()

  // 恶魔与天使人格关键词字典
  private personalityKeywords = {
    demon: [
      // 欲望相关
      '想要', '得到', '拥有', '占有', '贪婪', '欲望', '渴望',
      // 愤怒相关
      '愤怒', '生气', '讨厌', '恨', '报复', '复仇', '惩罚',
      // 叛逆相关
      '反抗', '叛逆', '违背', '打破', '摧毁', '破坏', '颠覆',
      // 真相相关
      '真相', '现实', '虚伪', '谎言', '欺骗', '假象', '揭露',
      // 黑暗相关
      '黑暗', '阴暗', '邪恶', '罪恶', '堕落', '腐败', '诱惑',
      // 消极相关
      '放弃', '算了', '无所谓', '随便', '绝望', '痛苦', '折磨'
    ],
    angel: [
      // 治愈相关
      '治愈', '安慰', '温暖', '关怀', '呵护', '保护', '拯救',
      // 希望相关
      '希望', '光明', '未来', '梦想', '理想', '憧憬', '期待',
      // 善良相关
      '善良', '仁慈', '慈悲', '宽容', '包容', '理解', '原谅',
      // 成长相关
      '成长', '进步', '学习', '改变', '提升', '完善', '发展',
      // 道德相关
      '正义', '公正', '道德', '品德', '美德', '高尚', '纯洁',
      // 积极相关
      '坚持', '努力', '奋斗', '勇敢', '坚强', '乐观', '积极'
    ]
  }

  // 情绪关键词字典
  private emotionKeywords = {
    negative: {
      anger: ['生气', '愤怒', '气死', '烦躁', '讨厌', '恨', '怒', '火大', '抓狂'],
      sadness: ['难过', '伤心', '沮丧', '失落', '痛苦', '悲伤', '哭', '眼泪', '心痛'],
      fear: ['害怕', '恐惧', '担心', '紧张', '焦虑', '不安', '惊慌', '胆怯', '畏惧'],
      disgust: ['恶心', '厌恶', '反感', '讨厌', '恶心', '呕吐', '恶心', '排斥']
    },
    positive: {
      joy: ['开心', '高兴', '快乐', '兴奋', '愉快', '欢喜', '喜悦', '幸福', '满足'],
      love: ['爱', '喜欢', '爱心', '温暖', '甜蜜', '浪漫', '心动', '迷恋', '深爱'],
      surprise: ['惊喜', '意外', '震惊', '惊讶', '不敢相信', '哇', '天哪', '真的吗'],
      pride: ['骄傲', '自豪', '得意', '成就', '满意', '优秀', '棒', '厉害', '成功']
    },
    neutral: {
      curiosity: ['好奇', '想知道', '疑问', '为什么', '怎么', '什么', '哪里', '谁'],
      confusion: ['困惑', '不懂', '迷茫', '不明白', '搞不清', '糊涂', '疑惑', '不解'],
      boredom: ['无聊', '没意思', '枯燥', '乏味', '没劲', '单调', '厌倦', '疲倦']
    }
  }

  // 分析文本情绪
  analyzeEmotion(text: string, contextMessages: string[] = []): EmotionResult {
    const normalizedText = this.normalizeText(text)
    
    // 如果有上下文消息，也进行分析以增强情绪检测
    let contextText = ''
    if (contextMessages.length > 0) {
      contextText = this.normalizeText(contextMessages.join(' '))
    }
    
    const combinedText = contextText ? `${contextText} ${normalizedText}` : normalizedText
    const emotions: { [key: string]: { intensity: number; keywords: string[] } } = {}

    // 分析各种情绪
    for (const [category, emotionTypes] of Object.entries(this.emotionKeywords)) {
      for (const [emotionType, keywords] of Object.entries(emotionTypes)) {
        const matchedKeywords: string[] = []
        let intensity = 0

        for (const keyword of keywords) {
          // 在当前文本中查找关键词（权重更高）
          if (normalizedText.includes(keyword)) {
            matchedKeywords.push(keyword)
            intensity += 0.3 // 当前文本中的关键词权重更高
          }
          // 在上下文中查找关键词（权重较低）
          else if (contextText && contextText.includes(keyword)) {
            matchedKeywords.push(`[上下文]${keyword}`)
            intensity += 0.1 // 上下文中的关键词权重较低
          }
        }

        if (matchedKeywords.length > 0) {
          emotions[emotionType] = {
            intensity: Math.min(intensity, 1.0),
            keywords: matchedKeywords
          }
        }
      }
    }

    // 找出最强的情绪
    let dominantEmotion = 'neutral'
    let maxIntensity = 0
    let allKeywords: string[] = []

    for (const [emotionType, data] of Object.entries(emotions)) {
      if (data.intensity > maxIntensity) {
        maxIntensity = data.intensity
        dominantEmotion = emotionType
      }
      allKeywords.push(...data.keywords)
    }

    // 如果没有检测到明显情绪，设置为中性
    if (maxIntensity === 0) {
      maxIntensity = 0.3
      dominantEmotion = 'neutral'
    }

    // 计算置信度（考虑上下文）
    const confidence = this.calculateConfidence(combinedText, allKeywords, maxIntensity)

    // 分析人格模式
    const personalityResult = this.analyzePersonality(combinedText, dominantEmotion)

    // 生成上下文描述（包含上下文信息）
    const context = this.generateContextWithHistory(dominantEmotion, maxIntensity, allKeywords, contextMessages.length > 0)

    return {
      type: dominantEmotion,
      intensity: maxIntensity,
      confidence,
      keywords: allKeywords,
      context,
      personality: personalityResult.personality,
      personalityColor: personalityResult.color,
      moralValues: personalityResult.moralValues
    }
  }

  // 分析人格模式（恶魔或天使）
  private analyzePersonality(text: string, emotion: string): {
    personality: 'demon' | 'angel'
    color: string
    moralValues: { corruption: number; purity: number }
  } {
    let demonScore = 0
    let angelScore = 0

    // 检查恶魔关键词
    for (const keyword of this.personalityKeywords.demon) {
      if (text.includes(keyword)) {
        demonScore += 1
      }
    }

    // 检查天使关键词
    for (const keyword of this.personalityKeywords.angel) {
      if (text.includes(keyword)) {
        angelScore += 1
      }
    }

    // 根据情绪类型调整分数
    if (['anger', 'disgust'].includes(emotion)) {
      demonScore += 2
    } else if (['sadness', 'fear'].includes(emotion)) {
      angelScore += 2
    } else if (['joy', 'love'].includes(emotion)) {
      angelScore += 1
    }

    // 计算道德值
    const totalScore = demonScore + angelScore
    const corruption = totalScore > 0 ? demonScore / totalScore : 0.5
    const purity = totalScore > 0 ? angelScore / totalScore : 0.5

    // 选择人格
    const personality: 'demon' | 'angel' = demonScore > angelScore ? 'demon' : 'angel'
    
    // 设置颜色
    const color = personality === 'demon' ? '#ff4444' : '#44aaff'

    return {
      personality,
      color,
      moralValues: { corruption, purity }
    }
  }

  // 文本标准化
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 保留中文、英文、数字和空格
      .trim()
  }

  // 计算置信度
  private calculateConfidence(text: string, keywords: string[], intensity: number): number {
    const textLength = text.length
    const keywordDensity = keywords.length / Math.max(textLength / 10, 1)
    const baseConfidence = Math.min(keywordDensity * 0.3 + intensity * 0.7, 1.0)
    
    // 根据文本长度调整置信度
    if (textLength < 5) return baseConfidence * 0.6
    if (textLength < 15) return baseConfidence * 0.8
    return baseConfidence
  }

  // 生成情绪上下文
  private generateContext(emotionType: string, intensity: number, keywords: string[]): string {
    const intensityLevel = intensity > 0.7 ? '强烈' : intensity > 0.4 ? '中等' : '轻微'
    const emotionNames: { [key: string]: string } = {
      anger: '愤怒',
      sadness: '悲伤',
      fear: '恐惧',
      disgust: '厌恶',
      joy: '快乐',
      love: '喜爱',
      surprise: '惊讶',
      pride: '自豪',
      curiosity: '好奇',
      confusion: '困惑',
      boredom: '无聊',
      neutral: '平静'
    }

    const emotionName = emotionNames[emotionType] || '未知'
    const keywordText = keywords.length > 0 ? `，关键词：${keywords.join('、')}` : ''
    
    return `检测到${intensityLevel}的${emotionName}情绪${keywordText}`
  }

  // 生成包含历史上下文的描述
  private generateContextWithHistory(emotionType: string, intensity: number, keywords: string[], hasContext: boolean): string {
    const emotionNames: { [key: string]: string } = {
      anger: '愤怒', sadness: '悲伤', fear: '恐惧', disgust: '厌恶',
      joy: '喜悦', love: '爱意', surprise: '惊喜', pride: '自豪',
      curiosity: '好奇', confusion: '困惑', boredom: '无聊', neutral: '平静'
    }

    const emotionName = emotionNames[emotionType] || '未知'
    const intensityLevel = intensity > 0.7 ? '强烈' : intensity > 0.4 ? '中等' : '轻微'
    const keywordText = keywords.length > 0 ? `，关键词：${keywords.slice(0, 3).join('、')}` : ''
    const contextText = hasContext ? '（结合对话上下文分析）' : ''

    return `检测到${intensityLevel}的${emotionName}情绪${keywordText}${contextText}`
  }

  // 保存情绪分析结果
  async saveEmotionAnalysis(request: EmotionAnalysisRequest): Promise<void> {
    try {
      const now = new Date().toISOString()
      const analysis: EmotionAnalysis = {
        id: `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        session_id: request.sessionId,
        message_id: `msg_${Date.now()}`,
        emotion_type: request.emotion,
        intensity: request.confidence,
        confidence: request.confidence,
        keywords: JSON.stringify([]),
        context: request.context,
        timestamp: now,
        created_at: now
      }

      const insertAnalysis = this.db.prepare(`
        INSERT INTO emotion_analysis (
          id, session_id, message_id, emotion_type, intensity,
          confidence, keywords, context, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insertAnalysis.run(
        analysis.id,
        analysis.session_id,
        analysis.message_id,
        analysis.emotion_type,
        analysis.intensity,
        analysis.confidence,
        analysis.keywords,
        analysis.context,
        analysis.created_at
      )

      console.log(`Saved emotion analysis: ${analysis.emotion_type} (${analysis.intensity})`)
    } catch (error) {
      console.error('Error saving emotion analysis:', error)
    }
  }

  // 获取会话情绪历史
  async getSessionEmotionHistory(sessionId: string, limit: number = 50): Promise<EmotionAnalysis[]> {
    try {
      const getHistory = this.db.prepare(`
        SELECT * FROM emotion_analysis 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `)

      const analyses = getHistory.all(sessionId, limit) as EmotionAnalysis[]
      return analyses.map(analysis => ({
        ...analysis,
        keywords: JSON.parse(analysis.keywords || '[]')
      }))
    } catch (error) {
      console.error('Error getting emotion history:', error)
      return []
    }
  }

  // 获取情绪统计
  async getEmotionStats(sessionId?: string, days: number = 7): Promise<EmotionStats> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      let whereClause = 'WHERE created_at >= ?'
      let params: any[] = [cutoffDate.toISOString()]

      if (sessionId) {
        whereClause += ' AND session_id = ?'
        params.push(sessionId)
      }

      // 总分析数
      const totalQuery = this.db.prepare(`
        SELECT COUNT(*) as count FROM emotion_analysis ${whereClause}
      `)
      const totalResult = totalQuery.get(...params) as { count: number }

      // 情绪分布
      const distributionQuery = this.db.prepare(`
        SELECT emotion_type, COUNT(*) as count 
        FROM emotion_analysis ${whereClause}
        GROUP BY emotion_type
      `)
      const distributionResults = distributionQuery.all(...params) as Array<{ emotion_type: string; count: number }>

      const emotionDistribution: { [key: string]: number } = {}
      distributionResults.forEach(result => {
        emotionDistribution[result.emotion_type] = result.count
      })

      // 平均强度
      const intensityQuery = this.db.prepare(`
        SELECT AVG(intensity) as avg_intensity 
        FROM emotion_analysis ${whereClause}
      `)
      const intensityResult = intensityQuery.get(...params) as { avg_intensity: number }

      // 最近趋势（按天分组）
      const trendsQuery = this.db.prepare(`
        SELECT 
          DATE(created_at) as date,
          emotion_type,
          COUNT(*) as count
        FROM emotion_analysis ${whereClause}
        GROUP BY DATE(created_at), emotion_type
        ORDER BY date DESC
      `)
      const trendsResults = trendsQuery.all(...params) as Array<{
        date: string
        emotion_type: string
        count: number
      }>

      // 人格分布（暂时使用默认值，因为数据库还没有personality字段）
      const personalityDistribution = { demon: 0, angel: 0 }

      // 道德趋势（暂时使用默认值）
      const moralTrends = { corruption: [], purity: [] }

      const recentTrends: Array<{ date: string; emotions: { [key: string]: number }; personality: 'demon' | 'angel' }> = []
      const trendsByDate: { [key: string]: { [key: string]: number } } = {}

      trendsResults.forEach(result => {
        if (!trendsByDate[result.date]) {
          trendsByDate[result.date] = {}
        }
        trendsByDate[result.date][result.emotion_type] = result.count
      })

      Object.entries(trendsByDate).forEach(([date, emotions]) => {
        // 暂时默认为angel，后续可以根据情绪分布推断
        const personality: 'demon' | 'angel' = 'angel'
        recentTrends.push({ date, emotions, personality })
      })

      return {
        totalAnalyses: totalResult.count,
        emotionDistribution,
        averageIntensity: intensityResult.avg_intensity || 0,
        personalityDistribution,
        moralTrends,
        recentTrends
      }
    } catch (error) {
      console.error('Error getting emotion stats:', error)
      return {
        totalAnalyses: 0,
        emotionDistribution: {},
        averageIntensity: 0,
        personalityDistribution: { demon: 0, angel: 0 },
        moralTrends: { corruption: [], purity: [] },
        recentTrends: []
      }
    }
  }

  // 获取情绪趋势
  async getEmotionTrends(sessionId: string, hours: number = 24): Promise<Array<{
    timestamp: string
    emotion: string
    intensity: number
  }>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - hours)

      const getTrends = this.db.prepare(`
        SELECT emotion_type, intensity, created_at
        FROM emotion_analysis 
        WHERE session_id = ? AND created_at >= ?
        ORDER BY created_at ASC
      `)

      const results = getTrends.all(sessionId, cutoffDate.toISOString()) as Array<{
        emotion_type: string
        intensity: number
        created_at: string
      }>

      return results.map(result => ({
        timestamp: result.created_at,
        emotion: result.emotion_type,
        intensity: result.intensity
      }))
    } catch (error) {
      console.error('Error getting emotion trends:', error)
      return []
    }
  }

  // 检测情绪变化
  async detectEmotionChange(sessionId: string): Promise<{
    hasChanged: boolean
    previousEmotion?: string
    currentEmotion?: string
    changeIntensity?: number
  }> {
    try {
      const getRecentEmotions = this.db.prepare(`
        SELECT emotion_type, intensity 
        FROM emotion_analysis 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT 2
      `)

      const emotions = getRecentEmotions.all(sessionId) as Array<{
        emotion_type: string
        intensity: number
      }>

      if (emotions.length < 2) {
        return { hasChanged: false }
      }

      const [current, previous] = emotions
      const hasChanged = current.emotion_type !== previous.emotion_type
      const changeIntensity = Math.abs(current.intensity - previous.intensity)

      return {
        hasChanged,
        previousEmotion: previous.emotion_type,
        currentEmotion: current.emotion_type,
        changeIntensity
      }
    } catch (error) {
      console.error('Error detecting emotion change:', error)
      return { hasChanged: false }
    }
  }

  // 清理旧的情绪分析数据
  async cleanupOldAnalyses(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const deleteOld = this.db.prepare(`
        DELETE FROM emotion_analysis 
        WHERE created_at < ?
      `)

      const result = deleteOld.run(cutoffDate.toISOString())
      console.log(`Cleaned up ${result.changes} old emotion analyses`)
      return result.changes
    } catch (error) {
      console.error('Error cleaning up old analyses:', error)
      return 0
    }
  }

  // 导出情绪数据
  async exportEmotionData(sessionId?: string) {
    try {
      let query = 'SELECT * FROM emotion_analysis'
      let params: any[] = []

      if (sessionId) {
        query += ' WHERE session_id = ?'
        params.push(sessionId)
      }

      query += ' ORDER BY created_at DESC'

      const getAnalyses = this.db.prepare(query)
      const analyses = getAnalyses.all(...params) as EmotionAnalysis[]

      return {
        analyses: analyses.map(analysis => ({
          ...analysis,
          keywords: JSON.parse(analysis.keywords || '[]')
        })),
        exportedAt: new Date().toISOString(),
        totalCount: analyses.length
      }
    } catch (error) {
      console.error('Error exporting emotion data:', error)
      return null
    }
  }
}

export const emotionService = new EmotionService()
export default emotionService