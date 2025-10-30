import { apiClient } from './api'

export interface EmotionAnalysisResult {
  emotion: string
  intensity: number
  keywords: string[]
  context: string
  confidence: number
  reasoning: string
  recommendedPersonality?: string
}

export interface PersonalityRecommendation {
  personalityId: string
  confidence: number
  reasoning: string
  score: number
}

export class AIEmotionAnalyzer {
  private static instance: AIEmotionAnalyzer
  
  static getInstance(): AIEmotionAnalyzer {
    if (!AIEmotionAnalyzer.instance) {
      AIEmotionAnalyzer.instance = new AIEmotionAnalyzer()
    }
    return AIEmotionAnalyzer.instance
  }

  /**
   * 使用后端API分析用户消息的情感和意图
   */
  async analyzeEmotion(message: string, context?: string): Promise<EmotionAnalysisResult> {
    try {
      const response = await apiClient.post('/emotion/analyze', {
        text: message,
        context: context
      })

      if (response.data.success && response.data.data) {
        const emotionData = response.data.data
        return {
          emotion: emotionData.type || emotionData.emotion || 'neutral',
          intensity: emotionData.intensity || 0.5,
          keywords: emotionData.keywords || [],
          context: emotionData.context || context || '',
          confidence: emotionData.confidence || 0.5,
          reasoning: emotionData.reasoning || '基于关键词分析'
        }
      } else {
        throw new Error('API返回格式错误')
      }
    } catch (error) {
      console.error('情感分析API调用失败:', error)
      // 降级到简单分析
      return this.fallbackEmotionAnalysis(message)
    }
  }

  /**
   * 使用后端API推荐最适合的人格
   */
  async recommendPersonality(
    message: string, 
    emotionResult: EmotionAnalysisResult,
    availablePersonalities: any[],
    currentPersonality: string
  ): Promise<PersonalityRecommendation[]> {
    try {
      const response = await apiClient.post('/personality/recommend', {
        emotion: emotionResult,
        content: message,
        currentPersonality: currentPersonality
      })

      if (response.data.success && response.data.data) {
        const recommendations = response.data.data
        return recommendations.map((rec: any) => ({
          personalityId: rec.personality || rec.personalityId,
          confidence: rec.confidence || rec.score || 0.5,
          reasoning: rec.reasons ? rec.reasons.join('；') : rec.reason || '基于情感分析推荐',
          score: rec.score || rec.confidence || 0.5
        }))
      } else {
        return []
      }
    } catch (error) {
      console.error('人格推荐API调用失败:', error)
      return []
    }
  }





  private fallbackEmotionAnalysis(message: string): EmotionAnalysisResult {
    const lowerMessage = message.toLowerCase()
    
    // 简单的关键词匹配作为降级方案
    const emotionKeywords = {
      positive: ['开心', '高兴', '快乐', '喜欢', '爱', '好棒', '厉害', '赞', '棒', '好'],
      negative: ['难过', '伤心', '痛苦', '失望', '沮丧', '烦恼', '累', '压力', '不开心', '陪', '孤独', '寂寞'],
      technical: ['代码', '编程', '技术', '算法', '开发', '程序', '系统', '数据', 'API', '框架'],
      dependency: ['陪', '聊', '说话', '无聊', '需要', '帮助']
    }
    
    let emotion = 'neutral'
    let keywords: string[] = []
    
    for (const [emotionType, words] of Object.entries(emotionKeywords)) {
      const foundWords = words.filter(word => lowerMessage.includes(word))
      if (foundWords.length > 0) {
        emotion = emotionType
        keywords = foundWords
        break
      }
    }
    
    return {
      emotion,
      intensity: 0.6,
      keywords,
      context: '降级分析',
      confidence: 0.4,
      reasoning: '使用关键词匹配的降级分析'
    }
  }
}

export const aiEmotionAnalyzer = AIEmotionAnalyzer.getInstance()