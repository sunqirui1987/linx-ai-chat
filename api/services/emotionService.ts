import { database, type EmotionAnalysis } from '../database/database'

export interface EmotionResult {
  type: string
  intensity: number
  confidence: number
  keywords: string[]
  context: string
}

export interface EmotionAnalysisRequest {
  sessionId: string
  messageId: string
  emotion: EmotionResult
}

export interface EmotionStats {
  totalAnalyses: number
  emotionDistribution: { [key: string]: number }
  averageIntensity: number
  recentTrends: Array<{
    date: string
    emotions: { [key: string]: number }
  }>
}

class EmotionService {
  private db = database.getDatabase()

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
  analyzeEmotion(text: string): EmotionResult {
    const normalizedText = this.normalizeText(text)
    const emotions: { [key: string]: { intensity: number; keywords: string[] } } = {}

    // 分析各种情绪
    for (const [category, emotionTypes] of Object.entries(this.emotionKeywords)) {
      for (const [emotionType, keywords] of Object.entries(emotionTypes)) {
        const matchedKeywords: string[] = []
        let intensity = 0

        for (const keyword of keywords) {
          if (normalizedText.includes(keyword)) {
            matchedKeywords.push(keyword)
            intensity += 0.2 // 每个关键词增加0.2强度
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

    // 计算置信度
    const confidence = this.calculateConfidence(normalizedText, allKeywords, maxIntensity)

    // 生成上下文描述
    const context = this.generateContext(dominantEmotion, maxIntensity, allKeywords)

    return {
      type: dominantEmotion,
      intensity: maxIntensity,
      confidence,
      keywords: allKeywords,
      context
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

  // 保存情绪分析结果
  async saveEmotionAnalysis(request: EmotionAnalysisRequest): Promise<void> {
    try {
      const analysis: EmotionAnalysis = {
        id: `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        session_id: request.sessionId,
        message_id: request.messageId,
        emotion_type: request.emotion.type,
        intensity: request.emotion.intensity,
        confidence: request.emotion.confidence,
        keywords: JSON.stringify(request.emotion.keywords),
        context: request.emotion.context,
        created_at: new Date().toISOString()
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

      const recentTrends: Array<{ date: string; emotions: { [key: string]: number } }> = []
      const trendsByDate: { [key: string]: { [key: string]: number } } = {}

      trendsResults.forEach(result => {
        if (!trendsByDate[result.date]) {
          trendsByDate[result.date] = {}
        }
        trendsByDate[result.date][result.emotion_type] = result.count
      })

      Object.entries(trendsByDate).forEach(([date, emotions]) => {
        recentTrends.push({ date, emotions })
      })

      return {
        totalAnalyses: totalResult.count,
        emotionDistribution,
        averageIntensity: intensityResult.avg_intensity || 0,
        recentTrends
      }
    } catch (error) {
      console.error('Error getting emotion stats:', error)
      return {
        totalAnalyses: 0,
        emotionDistribution: {},
        averageIntensity: 0,
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