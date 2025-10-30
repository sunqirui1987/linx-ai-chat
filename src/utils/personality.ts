// 人格系统管理器
export interface PersonalityConfig {
  id: string
  name: string
  description: string
  avatar: string
  color: string
  traits: string[]
  voiceParams: VoiceParams
  promptTemplate: string
  behaviorRules: BehaviorRule[]
  triggerConditions: TriggerCondition[]
}

export interface VoiceParams {
  speaker: string
  speed: number
  volume: number
  pitch: number
  emotion: string
}

export interface BehaviorRule {
  condition: string
  action: string
  priority: number
}

export interface TriggerCondition {
  type: 'emotion' | 'keyword' | 'context' | 'time'
  value: string | string[]
  threshold?: number
}

export interface PersonalitySwitchResult {
  success: boolean
  fromPersonality: string
  toPersonality: string
  reason: string
  timestamp: number
}

import { aiEmotionAnalyzer, type EmotionAnalysisResult } from './ai-emotion-analyzer'

export class PersonalityManager {
  private personalities: Map<string, PersonalityConfig> = new Map()
  private currentPersonality: string = 'angel'
  private switchHistory: PersonalitySwitchResult[] = []
  private switchCooldown: number = 30000 // 30秒冷却时间

  constructor() {
    this.initializePersonalities()
  }

  // 初始化恶魔和天使双角色配置
  private initializePersonalities() {
    const personalities: PersonalityConfig[] = [
      {
        id: 'demon',
        name: '恶魔形态',
        description: '诱惑、狡黠、充满魅力的恶魔，善于挑战和引导用户探索内心的欲望',
        avatar: '😈',
        color: '#dc2626',
        traits: ['诱惑', '狡黠', '魅力', '挑战', '神秘'],
        voiceParams: {
          speaker: 'zh_male_jingqiangkuaishou_moon',
          speed: 0.9,
          volume: 1.1,
          pitch: -0.3,
          emotion: 'seductive'
        },
        promptTemplate: 'demon_personality',
        behaviorRules: [
          { condition: 'hesitation', action: 'encourage_boldness', priority: 3 },
          { condition: 'curiosity', action: 'deepen_mystery', priority: 2 },
          { condition: 'normal_chat', action: 'be_seductive', priority: 1 }
        ],
        triggerConditions: [
          { type: 'emotion', value: ['anger', 'frustration'], threshold: 0.4 },
          { type: 'keyword', value: ['挑战', '冒险', '刺激', '欲望', '禁忌'], threshold: 0.3 },
          { type: 'time', value: 'night', threshold: 0.6 }
        ]
      },
      {
        id: 'angel',
        name: '天使形态',
        description: '纯洁、温暖、充满爱心的天使，给予用户安慰、指引和正能量',
        avatar: '😇',
        color: '#059669',
        traits: ['纯洁', '温暖', '爱心', '智慧', '治愈'],
        voiceParams: {
          speaker: 'zh_female_shuangkuaishou_moon',
          speed: 0.8,
          volume: 0.9,
          pitch: 0.3,
          emotion: 'gentle'
        },
        promptTemplate: 'angel_personality',
        behaviorRules: [
          { condition: 'sadness', action: 'comfort_gently', priority: 4 },
          { condition: 'lost', action: 'provide_guidance', priority: 3 },
          { condition: 'anger', action: 'calm_with_love', priority: 2 },
          { condition: 'normal_chat', action: 'spread_positivity', priority: 1 }
        ],
        triggerConditions: [
          { type: 'emotion', value: ['sadness', 'fear', 'joy'], threshold: 0.3 },
          { type: 'keyword', value: ['帮助', '安慰', '治愈', '温暖', '爱', '善良'], threshold: 0.3 },
          { type: 'time', value: 'morning', threshold: 0.6 }
        ]
      }
    ]

    personalities.forEach(personality => {
      this.personalities.set(personality.id, personality)
    })
  }

  // 获取当前人格
  getCurrentPersonality(): PersonalityConfig | null {
    return this.personalities.get(this.currentPersonality) || null
  }

  // 获取所有人格
  getAllPersonalities(): PersonalityConfig[] {
    return Array.from(this.personalities.values())
  }

  // 获取指定人格
  getPersonality(id: string): PersonalityConfig | null {
    return this.personalities.get(id) || null
  }

  // 切换人格
  switchPersonality(targetId: string, reason: string = '手动切换'): PersonalitySwitchResult {
    const fromPersonality = this.currentPersonality
    const targetPersonality = this.personalities.get(targetId)

    if (!targetPersonality) {
      return {
        success: false,
        fromPersonality,
        toPersonality: targetId,
        reason: '目标人格不存在',
        timestamp: Date.now()
      }
    }

    // 检查冷却时间
    if (this.isInCooldown()) {
      return {
        success: false,
        fromPersonality,
        toPersonality: targetId,
        reason: '人格切换冷却中，请稍后再试',
        timestamp: Date.now()
      }
    }

    // 如果已经是目标人格
    if (fromPersonality === targetId) {
      return {
        success: false,
        fromPersonality,
        toPersonality: targetId,
        reason: '已经是目标人格',
        timestamp: Date.now()
      }
    }

    // 执行切换
    this.currentPersonality = targetId
    
    const result: PersonalitySwitchResult = {
      success: true,
      fromPersonality,
      toPersonality: targetId,
      reason,
      timestamp: Date.now()
    }

    // 记录切换历史
    this.switchHistory.push(result)
    
    // 保持历史记录在合理范围内
    if (this.switchHistory.length > 50) {
      this.switchHistory = this.switchHistory.slice(-30)
    }

    return result
  }

  // 智能人格切换（基于情绪分析）
  smartSwitch(emotionResult: any, context?: any): PersonalitySwitchResult | null {
    const currentConfig = this.getCurrentPersonality()
    if (!currentConfig) return null

    // 检查冷却时间
    if (this.isInCooldown()) {
      return null
    }

    // 寻找最匹配的人格
    let bestMatch: { personality: PersonalityConfig; score: number } | null = null

    for (const personality of Array.from(this.personalities.values())) {
      if (personality.id === this.currentPersonality) continue

      const score = this.calculatePersonalityScore(personality, emotionResult, context)
      if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { personality, score }
      }
    }

    if (!bestMatch) return null

    // 执行智能切换
    return this.switchPersonality(
      bestMatch.personality.id,
      `智能切换：${emotionResult.context || '根据对话情境'}`
    )
  }

  // 计算人格匹配分数
  private calculatePersonalityScore(
    personality: PersonalityConfig,
    emotionResult: any,
    context?: any
  ): number {
    let score = 0

    // 检查触发条件
    for (const condition of personality.triggerConditions) {
      switch (condition.type) {
        case 'emotion':
          if (emotionResult.emotion === condition.value) {
            const threshold = condition.threshold || 0.5
            if (emotionResult.intensity >= threshold) {
              score += 0.8
            }
          }
          break

        case 'keyword':
          const keywords = Array.isArray(condition.value) ? condition.value : [condition.value]
          const foundKeywords = emotionResult.keywords?.filter((k: string) =>
            keywords.some(keyword => k.includes(keyword))
          ) || []
          if (foundKeywords.length > 0) {
            score += 0.6 * (foundKeywords.length / keywords.length)
          }
          break

        case 'context':
          if (context && context.type === condition.value) {
            score += 0.5
          }
          break

        case 'time':
          // 时间条件的处理（如果需要）
          break
      }
    }

    return Math.min(score, 1.0)
  }

  // 检查是否在冷却时间内
  private isInCooldown(): boolean {
    if (this.switchHistory.length === 0) return false

    const lastSwitch = this.switchHistory[this.switchHistory.length - 1]
    return Date.now() - lastSwitch.timestamp < this.switchCooldown
  }

  // 获取人格切换历史
  getSwitchHistory(limit: number = 10): PersonalitySwitchResult[] {
    return this.switchHistory.slice(-limit).reverse()
  }

  // 获取人格统计信息
  getPersonalityStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {}
    
    this.personalities.forEach((_, id) => {
      stats[id] = 0
    })

    this.switchHistory.forEach(record => {
      if (record.success) {
        stats[record.toPersonality] = (stats[record.toPersonality] || 0) + 1
      }
    })

    return stats
  }

  // 重置人格到默认状态
  resetToDefault(): PersonalitySwitchResult {
    return this.switchPersonality('angel', '重置到默认人格')
  }

  // 设置冷却时间
  setCooldown(milliseconds: number) {
    this.switchCooldown = milliseconds
  }

  // 获取人格推荐
  getPersonalityRecommendations(emotionResult: any, context?: any): Array<{
    personality: PersonalityConfig
    score: number
    reason: string
  }> {
    const recommendations: Array<{
      personality: PersonalityConfig
      score: number
      reason: string
    }> = []

    for (const personality of Array.from(this.personalities.values())) {
      if (personality.id === this.currentPersonality) continue

      const score = this.calculatePersonalityScore(personality, emotionResult, context)
      if (score > 0.3) {
        recommendations.push({
          personality,
          score,
          reason: this.generateRecommendationReason(personality, emotionResult)
        })
      }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 3)
  }

  /**
   * 使用AI进行智能人格推荐
   */
  async getAIPersonalityRecommendations(message: string, context?: string): Promise<Array<{
    personality: PersonalityConfig
    score: number
    reason: string
    confidence: number
  }>> {
    try {
      // 1. 使用AI分析情感
      const emotionResult = await aiEmotionAnalyzer.analyzeEmotion(message, context)
      
      // 2. 获取所有可用人格
      const availablePersonalities = Array.from(this.personalities.values())
        .filter(p => p.id !== this.currentPersonality)
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          traits: p.traits
        }))
      
      // 3. 使用AI推荐人格
      const aiRecommendations = await aiEmotionAnalyzer.recommendPersonality(
        message,
        emotionResult,
        availablePersonalities,
        this.currentPersonality
      )
      
      // 4. 转换为标准格式
      const recommendations = aiRecommendations
        .map(rec => {
          const personality = this.getPersonality(rec.personalityId)
          if (!personality) return null
          
          return {
            personality,
            score: rec.score,
            reason: rec.reasoning,
            confidence: rec.confidence
          }
        })
        .filter(rec => rec !== null) as Array<{
          personality: PersonalityConfig
          score: number
          reason: string
          confidence: number
        }>
      
      console.log('🤖 AI人格推荐结果:', {
        message,
        emotionResult,
        recommendations: recommendations.map(r => ({
          personality: r.personality.name,
          score: r.score,
          confidence: r.confidence,
          reason: r.reason
        }))
      })
      
      return recommendations
    } catch (error) {
      console.error('AI人格推荐失败，使用传统方法:', error)
      // 降级到传统推荐方法
      const fallbackEmotion = { emotion: 'neutral', intensity: 0.5, keywords: [] }
      return this.getPersonalityRecommendations(fallbackEmotion, context)
        .map(rec => ({
          ...rec,
          confidence: 0.5
        }))
    }
  }

  // 生成推荐原因
  private generateRecommendationReason(personality: PersonalityConfig, emotionResult: any): string {
    const reasons = {
      warm: '检测到需要安慰和温暖',
      tech: '适合技术讨论和问题解决',
      tsundere: '增加对话的趣味性',
      defensive: '保护自己免受不当言论',
      default: '回到平衡的对话状态'
    }

    return reasons[personality.id] || `切换到${personality.name}模式`
  }

  // 导出配置
  exportConfig(): string {
    return JSON.stringify({
      personalities: Array.from(this.personalities.entries()),
      currentPersonality: this.currentPersonality,
      switchHistory: this.switchHistory.slice(-10)
    }, null, 2)
  }

  // 导入配置
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson)
      
      if (config.personalities) {
        this.personalities.clear()
        config.personalities.forEach(([id, personality]: [string, PersonalityConfig]) => {
          this.personalities.set(id, personality)
        })
      }

      if (config.currentPersonality && this.personalities.has(config.currentPersonality)) {
        this.currentPersonality = config.currentPersonality
      }

      if (config.switchHistory) {
        this.switchHistory = config.switchHistory
      }

      return true
    } catch (error) {
      console.error('Failed to import personality config:', error)
      return false
    }
  }
}

// 导出单例实例
export const personalityManager = new PersonalityManager()