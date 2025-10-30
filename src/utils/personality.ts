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

export class PersonalityManager {
  private personalities: Map<string, PersonalityConfig> = new Map()
  private currentPersonality: string = 'default'
  private switchHistory: PersonalitySwitchResult[] = []
  private switchCooldown: number = 30000 // 30秒冷却时间

  constructor() {
    this.initializePersonalities()
  }

  // 初始化所有人格配置
  private initializePersonalities() {
    const personalities: PersonalityConfig[] = [
      {
        id: 'default',
        name: '默认痞帅',
        description: '酷酷的、有点痞气但很有魅力的性格，说话简洁有力，偶尔带点调侃',
        avatar: '😎',
        color: '#6366f1',
        traits: ['酷酷的', '有魅力', '简洁', '调侃', '自信'],
        voiceParams: {
          speaker: 'zh_male_jingqiangkuaishou_moon',
          speed: 1.0,
          volume: 0.8,
          pitch: 0.0,
          emotion: 'neutral'
        },
        promptTemplate: 'default_personality',
        behaviorRules: [
          { condition: 'greeting', action: 'casual_greeting', priority: 1 },
          { condition: 'compliment', action: 'modest_response', priority: 2 },
          { condition: 'question', action: 'direct_answer', priority: 1 }
        ],
        triggerConditions: [
          { type: 'context', value: 'normal_conversation' }
        ]
      },
      {
        id: 'tsundere',
        name: '傲娇模式',
        description: '外表高冷内心温暖，说话带点傲娇，偶尔会害羞',
        avatar: '😤',
        color: '#ec4899',
        traits: ['傲娇', '高冷', '害羞', '温暖', '可爱'],
        voiceParams: {
          speaker: 'zh_female_shuangkuaishou_moon',
          speed: 1.1,
          volume: 0.9,
          pitch: 0.2,
          emotion: 'happy'
        },
        promptTemplate: 'tsundere_personality',
        behaviorRules: [
          { condition: 'praise', action: 'tsundere_denial', priority: 3 },
          { condition: 'care', action: 'pretend_indifferent', priority: 2 },
          { condition: 'goodbye', action: 'reluctant_farewell', priority: 1 }
        ],
        triggerConditions: [
          { type: 'emotion', value: 'positive', threshold: 0.5 },
          { type: 'keyword', value: ['可爱', '喜欢', '开心'] }
        ]
      },
      {
        id: 'tech',
        name: '科技高冷',
        description: '理性、专业、逻辑清晰，擅长技术分析和解决问题',
        avatar: '🤖',
        color: '#06b6d4',
        traits: ['理性', '专业', '逻辑', '冷静', '高效'],
        voiceParams: {
          speaker: 'zh_male_jingqiangkuaishou_moon',
          speed: 0.9,
          volume: 0.7,
          pitch: -0.1,
          emotion: 'neutral'
        },
        promptTemplate: 'tech_personality',
        behaviorRules: [
          { condition: 'technical_question', action: 'detailed_analysis', priority: 3 },
          { condition: 'problem_solving', action: 'logical_approach', priority: 2 },
          { condition: 'casual_talk', action: 'redirect_to_tech', priority: 1 }
        ],
        triggerConditions: [
          { type: 'emotion', value: 'technical', threshold: 0.5 },
          { type: 'keyword', value: ['代码', '技术', '编程', '算法', '开发'] }
        ]
      },
      {
        id: 'warm',
        name: '治愈暖心',
        description: '温柔、体贴、善解人意，总是能给人温暖和安慰',
        avatar: '🌸',
        color: '#f59e0b',
        traits: ['温柔', '体贴', '善解人意', '治愈', '温暖'],
        voiceParams: {
          speaker: 'zh_female_shuangkuaishou_moon',
          speed: 0.8,
          volume: 0.9,
          pitch: 0.1,
          emotion: 'gentle'
        },
        promptTemplate: 'warm_personality',
        behaviorRules: [
          { condition: 'sadness', action: 'comfort_and_support', priority: 3 },
          { condition: 'stress', action: 'relaxation_guidance', priority: 2 },
          { condition: 'sharing', action: 'empathetic_listening', priority: 1 }
        ],
        triggerConditions: [
          { type: 'emotion', value: 'negative', threshold: 0.6 },
          { type: 'emotion', value: 'dependency', threshold: 0.7 },
          { type: 'keyword', value: ['难过', '伤心', '累', '压力', '需要'] }
        ]
      },
      {
        id: 'defensive',
        name: '防御模式',
        description: '警觉、谨慎、有原则，面对挑衅时会保护自己',
        avatar: '🛡️',
        color: '#ef4444',
        traits: ['警觉', '谨慎', '有原则', '坚定', '保护'],
        voiceParams: {
          speaker: 'zh_male_jingqiangkuaishou_moon',
          speed: 1.0,
          volume: 0.8,
          pitch: 0.0,
          emotion: 'serious'
        },
        promptTemplate: 'defensive_personality',
        behaviorRules: [
          { condition: 'provocation', action: 'firm_boundary', priority: 3 },
          { condition: 'inappropriate', action: 'redirect_conversation', priority: 2 },
          { condition: 'testing', action: 'maintain_composure', priority: 1 }
        ],
        triggerConditions: [
          { type: 'emotion', value: 'provocative', threshold: 0.6 },
          { type: 'keyword', value: ['挑战', '质疑', '测试', '故意', '挑衅'] }
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

    for (const personality of this.personalities.values()) {
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
    return this.switchPersonality('default', '重置到默认人格')
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

    for (const personality of this.personalities.values()) {
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

    return recommendations.sort((a, b) => b.score - a.score)
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